use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

const BEGIN_MARKER: &str = "# === FOCUSLOCK BEGIN — managed by focuslock-agent ===";
const END_MARKER: &str = "# === FOCUSLOCK END ===";

#[derive(Debug)]
pub enum HostsError {
    PermissionDenied,
    Io(std::io::Error),
}

impl std::fmt::Display for HostsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PermissionDenied => write!(f, "permission denied (agent needs admin)"),
            Self::Io(e) => write!(f, "io error: {e}"),
        }
    }
}

impl HostsError {
    pub fn is_permission_denied(&self) -> bool {
        matches!(self, Self::PermissionDenied)
    }
}

fn map_io(e: std::io::Error) -> HostsError {
    if e.kind() == std::io::ErrorKind::PermissionDenied {
        HostsError::PermissionDenied
    } else {
        HostsError::Io(e)
    }
}

fn hosts_path() -> PathBuf {
    if let Some(p) = std::env::var_os("FOCUSLOCK_HOSTS_FILE") {
        return PathBuf::from(p);
    }
    PathBuf::from(r"C:\Windows\System32\drivers\etc\hosts")
}

fn strip_our_section(content: &str) -> String {
    let mut out = String::with_capacity(content.len());
    let mut in_block = false;
    for line in content.lines() {
        if line.trim() == BEGIN_MARKER {
            in_block = true;
            continue;
        }
        if line.trim() == END_MARKER {
            in_block = false;
            continue;
        }
        if !in_block {
            out.push_str(line);
            out.push('\n');
        }
    }
    out
}

fn build_block_section(domains: &HashSet<String>) -> String {
    let mut bare: Vec<String> = domains
        .iter()
        .filter_map(|d| crate::domains::normalize_host(d))
        .collect();
    bare.sort();
    bare.dedup();

    let mut s = String::new();
    s.push_str(BEGIN_MARKER);
    s.push('\n');
    for d in &bare {
        s.push_str(&format!("127.0.0.1 {d}\n"));
        s.push_str(&format!("127.0.0.1 www.{d}\n"));
    }
    s.push_str(END_MARKER);
    s.push('\n');
    s
}

pub fn apply(domains: &HashSet<String>) -> Result<(), HostsError> {
    let existing = fs::read_to_string(hosts_path()).map_err(map_io)?;
    let stripped = strip_our_section(&existing);

    let mut new_content = stripped.trim_end().to_string();
    new_content.push_str("\n\n");
    new_content.push_str(&build_block_section(domains));

    fs::write(hosts_path(), new_content).map_err(map_io)
}

pub fn remove() -> Result<(), HostsError> {
    let existing = match fs::read_to_string(hosts_path()) {
        Ok(s) => s,
        Err(e) => return Err(map_io(e)),
    };
    let stripped = strip_our_section(&existing);
    if stripped.trim_end() == existing.trim_end() {
        return Ok(());
    }
    fs::write(hosts_path(), stripped).map_err(map_io)
}

/// A canonical key for a block list, used to detect when the agent needs to
/// rewrite the hosts file (vs. a no-op sync).
pub fn canonical_key(domains: &HashSet<String>) -> String {
    crate::domains::canonical_key(domains)
}

/// Best-effort DNS cache flush. Browsers and the Windows DNS Client service
/// both keep resolved hosts in memory; without this, hosts-file edits can take
/// minutes to take effect on existing connections.
pub fn flush_dns_cache() {
    let _ = std::process::Command::new("ipconfig")
        .arg("/flushdns")
        .output();
}
