use crate::domains::match_blocked_domain;
use crate::state::AppState;
use std::collections::HashSet;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::UdpSocket;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tracing::{debug, info, warn};

const DEFAULT_PORT: u16 = 53;
const DEFAULT_UPSTREAM: &str = "8.8.8.8:53";

pub fn dns_port() -> u16 {
    std::env::var("FOCUSLOCK_DNS_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_PORT)
}

fn upstream_addr() -> SocketAddr {
    std::env::var("FOCUSLOCK_DNS_UPSTREAM")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| DEFAULT_UPSTREAM.parse().expect("valid upstream"))
}

#[derive(Debug)]
pub enum DnsError {
    PermissionDenied,
    Io(std::io::Error),
}

impl std::fmt::Display for DnsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PermissionDenied => {
                write!(f, "permission denied (agent needs admin for DNS port)")
            }
            Self::Io(e) => write!(f, "io error: {e}"),
        }
    }
}

impl DnsError {
    pub fn is_permission_denied(&self) -> bool {
        matches!(self, Self::PermissionDenied)
    }
}

fn map_io(e: std::io::Error) -> DnsError {
    if e.kind() == std::io::ErrorKind::PermissionDenied {
        DnsError::PermissionDenied
    } else {
        DnsError::Io(e)
    }
}

fn read_qname(data: &[u8], mut offset: usize) -> Option<(String, usize)> {
    let _start = offset;
    let mut labels = Vec::new();
    let mut jumped = false;
    let mut jump_end = 0usize;

    loop {
        let len = *data.get(offset)? as usize;
        if len == 0 {
            offset += 1;
            if !jumped {
                jump_end = offset;
            }
            break;
        }
        if len & 0xC0 == 0xC0 {
            let ptr = (((len & 0x3F) as usize) << 8) | (*data.get(offset + 1)? as usize);
            if !jumped {
                jump_end = offset + 2;
            }
            offset = ptr;
            jumped = true;
            continue;
        }
        offset += 1;
        let label = std::str::from_utf8(data.get(offset..offset + len)?).ok()?;
        labels.push(label.to_string());
        offset += len;
    }

    let end = if jumped { jump_end } else { offset };
    if labels.is_empty() {
        return Some((".".into(), end));
    }
    Some((labels.join("."), end))
}

fn parse_first_question(data: &[u8]) -> Option<(String, u16)> {
    if data.len() < 12 {
        return None;
    }
    let qdcount = u16::from_be_bytes([data[4], data[5]]);
    if qdcount == 0 {
        return None;
    }
    let (name, mut offset) = read_qname(data, 12)?;
    if offset + 4 > data.len() {
        return None;
    }
    let qtype = u16::from_be_bytes([data[offset], data[offset + 1]]);
    Some((name, qtype))
}

/// Build a sinkhole response (A → 0.0.0.0 or AAAA → ::) for the first question.
fn build_blocked_response(query: &[u8], qtype: u16) -> Option<Vec<u8>> {
    if query.len() < 12 {
        return None;
    }

    let question_end = read_qname(query, 12)?.1 + 4;
    if question_end > query.len() {
        return None;
    }

    let (rdlength, rdata): (u16, [u8; 16]) = match qtype {
        1 => (4, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), // A
        28 => (16, [0; 16]),                                             // AAAA
        _ => return None,
    };

    let mut out = Vec::with_capacity(question_end + 16);
    out.extend_from_slice(&query[..2]); // ID
    out.push(0x81); // QR=1, OPCODE=0
    out.push(0x80); // AA=0, TC=0, RD preserved loosely
    out.extend_from_slice(&[0, 1]); // QDCOUNT=1
    out.extend_from_slice(&[0, 1]); // ANCOUNT=1
    out.extend_from_slice(&[0, 0]); // NSCOUNT
    out.extend_from_slice(&[0, 0]); // ARCOUNT
    out.extend_from_slice(&query[12..question_end]); // question

    // Answer: pointer to name at offset 12
    out.extend_from_slice(&[0xC0, 0x0C]);
    out.extend_from_slice(&qtype.to_be_bytes());
    out.extend_from_slice(&1u16.to_be_bytes()); // CLASS IN
    out.extend_from_slice(&60u32.to_be_bytes()); // TTL
    out.extend_from_slice(&rdlength.to_be_bytes());
    out.extend_from_slice(&rdata[..rdlength as usize]);

    Some(out)
}

async fn forward_query(query: &[u8], upstream: SocketAddr) -> Option<Vec<u8>> {
    let socket = UdpSocket::bind("0.0.0.0:0").await.ok()?;
    socket.send_to(query, upstream).await.ok()?;
    let mut buf = vec![0u8; 4096];
    let (len, _) = tokio::time::timeout(Duration::from_secs(2), socket.recv_from(&mut buf))
        .await
        .ok()?
        .ok()?;
    buf.truncate(len);
    Some(buf)
}

async fn handle_datagram(
    state: &AppState,
    blocked: &HashSet<String>,
    data: &[u8],
    upstream: SocketAddr,
) -> Option<Vec<u8>> {
    let (qname, qtype) = parse_first_question(data)?;
    if let Some(domain) = match_blocked_domain(&qname, blocked) {
        state.record_url_query(&domain);
        debug!("blocked DNS query for {qname} ({domain})");
        return build_blocked_response(data, qtype);
    }

    forward_query(data, upstream).await
}

async fn run_loop(
    state: AppState,
    blocked_rx: watch::Receiver<HashSet<String>>,
    mut shutdown: watch::Receiver<bool>,
    bind: SocketAddr,
    upstream: SocketAddr,
) {
    let socket = match UdpSocket::bind(bind).await {
        Ok(s) => Arc::new(s),
        Err(e) => {
            warn!("DNS server failed to bind {bind}: {e}");
            return;
        }
    };

    info!("DNS resolver listening on udp://{bind} (upstream {upstream})");

    let mut buf = vec![0u8; 4096];
    loop {
        if *shutdown.borrow() {
            break;
        }

        let blocked = blocked_rx.borrow().clone();
        tokio::select! {
            _ = shutdown.changed() => {
                if *shutdown.borrow() { break; }
            }
            recv = socket.recv_from(&mut buf) => {
                let Ok((len, peer)) = recv else { continue };
                let query = &buf[..len];
                if let Some(response) = handle_datagram(&state, &blocked, query, upstream).await {
                    let _ = socket.send_to(&response, peer).await;
                }
            }
        }
    }

    info!("DNS resolver stopped");
}

pub struct DnsController {
    shutdown_tx: Option<watch::Sender<bool>>,
    blocked_tx: Option<watch::Sender<HashSet<String>>>,
    join: Option<JoinHandle<()>>,
}

impl DnsController {
    pub fn new() -> Self {
        Self {
            shutdown_tx: None,
            blocked_tx: None,
            join: None,
        }
    }

    pub fn is_running(&self) -> bool {
        self.join.is_some()
    }

    pub async fn start(&mut self, state: AppState, blocked: HashSet<String>) -> Result<(), DnsError> {
        if self.is_running() {
            self.stop().await;
        }

        let port = dns_port();
        let bind: SocketAddr = ([127, 0, 0, 1], port).into();
        let upstream = upstream_addr();

        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let (blocked_tx, blocked_rx) = watch::channel(blocked);

        let probe = UdpSocket::bind(bind).await.map_err(map_io)?;
        drop(probe);

        let state_for_task = state.clone();
        let join = tokio::spawn(async move {
            run_loop(state_for_task, blocked_rx, shutdown_rx, bind, upstream).await;
        });

        self.shutdown_tx = Some(shutdown_tx);
        self.blocked_tx = Some(blocked_tx);
        self.join = Some(join);
        Ok(())
    }

    pub fn update_blocked(&self, blocked: HashSet<String>) {
        if let Some(tx) = &self.blocked_tx {
            let _ = tx.send(blocked);
        }
    }

    pub async fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(true);
        }
        if let Some(handle) = self.join.take() {
            let _ = handle.await;
        }
        self.blocked_tx = None;
    }
}

impl Default for DnsController {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_qname() {
        // ID=0, flags=0, qd=1, header + "www.example.com\0" + type A + class IN
        let mut msg = vec![
            0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, b'w', b'w', b'w', 7, b'e', b'x', b'a', b'm',
            b'p', b'l', b'e', 3, b'c', b'o', b'm', 0, 0, 1, 0, 1,
        ];
        let (name, qtype) = parse_first_question(&msg).unwrap();
        assert_eq!(name, "www.example.com");
        assert_eq!(qtype, 1);
    }
}
