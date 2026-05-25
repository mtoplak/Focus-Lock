//! Forcibly close existing TCP connections from browser processes so a freshly
//! applied hosts-file block takes effect on already-open tabs. Without this,
//! the browser keeps reusing established sockets to the blocked domain.

#![cfg(windows)]

use std::ffi::c_void;
use sysinfo::{Pid, System};
use tracing::{info, warn};
use windows::Win32::Foundation::NO_ERROR;
use windows::Win32::NetworkManagement::IpHelper::{
    GetExtendedTcpTable, SetTcpEntry, MIB_TCPROW_LH, MIB_TCPROW_LH_0, MIB_TCPROW_OWNER_PID,
    MIB_TCPTABLE_OWNER_PID, TCP_TABLE_OWNER_PID_ALL,
};

const AF_INET: u32 = 2;
const MIB_TCP_STATE_ESTAB: u32 = 5;
const MIB_TCP_STATE_DELETE_TCB: u32 = 12;

const BROWSER_PROCESSES: &[&str] = &[
    "chrome.exe",
    "brave.exe",
    "msedge.exe",
    "firefox.exe",
    "opera.exe",
    "vivaldi.exe",
    "arc.exe",
    "thorium.exe",
];

fn is_browser_process_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    BROWSER_PROCESSES.iter().any(|b| *b == lower)
}

/// Reset browser networking so freshly applied hosts-file blocks take effect
/// on already-open tabs. We do two things:
/// 1. Force-close existing TCP connections (immediate disconnect).
/// 2. Kill the browser's network service child process. Chromium respawns it
///    with empty DNS / socket caches, so the next resolution hits the OS
///    resolver (and therefore the hosts file). Without this step, the
///    browser's internal DNS cache still points at the real domain IP and
///    reconnects right back.
pub fn reset_browser_connections() {
    let mut sys = System::new();
    sys.refresh_processes();

    let tcp_killed = kill_tcp_connections(&sys);

    // Killing the network service breaks Vite's HMR WebSocket (because Vite
    // runs in your browser too), which causes a full page reload of the PWA.
    // Off by default so dev is usable. Set FOCUSLOCK_AGGRESSIVE_RESET=1 in
    // your prod runtime if you need an open YouTube tab to die immediately
    // — without it, the browser's internal DNS cache (~60 s TTL) takes over
    // and the next refresh fails.
    let aggressive = std::env::var("FOCUSLOCK_AGGRESSIVE_RESET")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let svc_killed = if aggressive { kill_network_services() } else { 0 };

    info!(
        "reset: closed {} browser TCP conn(s), restarted {} network service(s)",
        tcp_killed, svc_killed
    );
}

/// Kill the network service process of each Chromium-based browser. We use
/// PowerShell + WMI because `sysinfo::Process::cmd()` returns empty for these
/// sandboxed children even when our agent runs as admin (PEB reads are blocked
/// by integrity-level checks). WMI is administrator-trusted and reads the
/// command line through a separate mechanism that doesn't have this problem.
///
/// Markers we look for in the cmd line:
///   - `network.mojom.NetworkService`
///   - `--service-sandbox-type=network`
fn kill_network_services() -> u32 {
    let script = r#"
        $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
            ($_.Name -in @('brave.exe','chrome.exe','msedge.exe','vivaldi.exe','opera.exe','arc.exe','thorium.exe')) -and
            ($_.CommandLine -like '*network.mojom.NetworkService*' -or
             $_.CommandLine -like '*--service-sandbox-type=network*')
        }
        $count = 0
        foreach ($p in $procs) {
            try {
                Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
                $count++
            } catch {}
        }
        Write-Output $count
    "#;

    let output = match std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
    {
        Ok(o) => o,
        Err(e) => {
            warn!("powershell shellout failed: {e}");
            return 0;
        }
    };

    if !output.status.success() {
        warn!(
            "powershell exited with {:?}; stderr: {}",
            output.status.code(),
            String::from_utf8_lossy(&output.stderr).trim()
        );
        return 0;
    }

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u32>()
        .unwrap_or(0)
}

fn kill_tcp_connections(sys: &System) -> u32 {
    let mut killed: u32 = 0;
    let mut considered: u32 = 0;

    unsafe {
        // First call: discover buffer size.
        let mut buffer_size: u32 = 0;
        GetExtendedTcpTable(
            None,
            &mut buffer_size,
            false,
            AF_INET,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );
        if buffer_size == 0 {
            warn!("GetExtendedTcpTable returned zero size");
            return killed;
        }

        let mut buffer: Vec<u8> = vec![0; buffer_size as usize];
        let result = GetExtendedTcpTable(
            Some(buffer.as_mut_ptr() as *mut c_void),
            &mut buffer_size,
            false,
            AF_INET,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );
        if result != NO_ERROR.0 {
            warn!("GetExtendedTcpTable failed: {}", result);
            return killed;
        }

        let table = buffer.as_ptr() as *const MIB_TCPTABLE_OWNER_PID;
        let num_entries = (*table).dwNumEntries as usize;
        if num_entries == 0 {
            return killed;
        }

        let rows: &[MIB_TCPROW_OWNER_PID] =
            std::slice::from_raw_parts(&(*table).table[0], num_entries);

        // PID → is_browser cache to avoid repeated sysinfo lookups for the same
        // multi-connection processes (browsers often have many).
        let mut pid_cache: std::collections::HashMap<u32, bool> =
            std::collections::HashMap::new();

        for row in rows {
            if row.dwState != MIB_TCP_STATE_ESTAB {
                continue;
            }
            // Skip loopback — those are HMR sockets, IPC, the agent itself,
            // never the blocked-domain connections we want to kill.
            // dwRemoteAddr is stored in network byte order; the lowest byte
            // is the first octet of the IPv4 address.
            if (row.dwRemoteAddr & 0xFF) as u8 == 127 {
                continue;
            }
            considered += 1;
            let pid = row.dwOwningPid;
            let is_browser = *pid_cache.entry(pid).or_insert_with(|| {
                sys.process(Pid::from_u32(pid))
                    .map(|p| is_browser_process_name(p.name()))
                    .unwrap_or(false)
            });
            if !is_browser {
                continue;
            }

            // Build a closer row: same 4-tuple, state = DELETE_TCB.
            // Ports and addresses stay in network byte order (as returned).
            let close_row = MIB_TCPROW_LH {
                Anonymous: MIB_TCPROW_LH_0 {
                    dwState: MIB_TCP_STATE_DELETE_TCB,
                },
                dwLocalAddr: row.dwLocalAddr,
                dwLocalPort: row.dwLocalPort,
                dwRemoteAddr: row.dwRemoteAddr,
                dwRemotePort: row.dwRemotePort,
            };
            let r = SetTcpEntry(&close_row);
            if r == NO_ERROR.0 {
                killed += 1;
            }
        }
    }

    let _ = considered; // present for future diagnostics
    killed
}
