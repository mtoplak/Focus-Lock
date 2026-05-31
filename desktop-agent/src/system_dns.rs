//! Redirect active network adapters to use the local DNS resolver during focus.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tracing::{info, warn};

#[derive(Debug, Serialize, Deserialize)]
struct DnsBackup {
    interfaces: Vec<InterfaceDns>,
}

#[derive(Debug, Serialize, Deserialize)]
struct InterfaceDns {
    name: String,
    #[serde(rename = "staticServers")]
    static_servers: Vec<String>,
    dhcp: bool,
}

fn backup_path() -> PathBuf {
    let base = std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    base.join("focuslock").join("dns_backup.json")
}

fn run_netsh(args: &[&str]) -> Option<String> {
    let output = Command::new("netsh").args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn connected_interfaces() -> Vec<String> {
    let text = match run_netsh(&["interface", "show", "interface"]) {
        Some(t) => t,
        None => return vec![],
    };

    let mut names = Vec::new();
    for line in text.lines().skip(3) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 4 {
            continue;
        }
        // netsh columns: Admin State | State | Type | Interface Name…
        let conn_state = cols[1];
        if conn_state.eq_ignore_ascii_case("connected") {
            // Name is the 4th column onward (may contain spaces).
            let name = cols[3..].join(" ");
            if !name.is_empty() {
                names.push(name);
            }
        }
    }
    names
}

fn read_interface_dns(name: &str) -> InterfaceDns {
    let mut entry = InterfaceDns {
        name: name.to_string(),
        static_servers: vec![],
        dhcp: true,
    };

    let args = ["interface", "ipv4", "show", "dnsservers", name];
    let Some(text) = run_netsh(&args) else {
        return entry;
    };

    for line in text.lines() {
        let lower = line.to_ascii_lowercase();
        if lower.contains("statically configured dns servers") {
            entry.dhcp = false;
            if let Some(ip) = line.split(':').nth(1) {
                let ip = ip.trim();
                if !ip.is_empty() {
                    entry.static_servers.push(ip.to_string());
                }
            }
        }
    }

    entry
}

fn save_backup(backup: &DnsBackup) -> std::io::Result<()> {
    let path = backup_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(backup)?;
    std::fs::write(path, json)
}

fn load_backup() -> Option<DnsBackup> {
    let path = backup_path();
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn clear_backup() {
    let _ = std::fs::remove_file(backup_path());
}

pub fn redirect_to_local_resolver() -> Result<(), String> {
    if load_backup().is_some() {
        // Previous session didn't clean up — restore first.
        let _ = restore_system_dns();
    }

    let interfaces = connected_interfaces();
    if interfaces.is_empty() {
        return Err("no connected network interfaces found".into());
    }

    let backup = DnsBackup {
        interfaces: interfaces
            .iter()
            .map(|name| read_interface_dns(name))
            .collect(),
    };

    let mut applied = 0usize;
    for name in &interfaces {
        let args = [
            "interface",
            "ipv4",
            "set",
            "dnsservers",
            &format!("name={name}"),
            "static",
            "127.0.0.1",
            "validate=no",
        ];
        if run_netsh(&args).is_some() {
            applied += 1;
        } else {
            warn!("failed to set DNS on interface {name}");
        }
    }

    if applied == 0 {
        return Err("could not update DNS on any interface".into());
    }

    save_backup(&backup).map_err(|e| e.to_string())?;
    info!("system DNS redirected to 127.0.0.1 on {applied} interface(s)");
    Ok(())
}

pub fn restore_system_dns() -> Result<(), String> {
    let Some(backup) = load_backup() else {
        return Ok(());
    };

    for iface in &backup.interfaces {
        if iface.dhcp || iface.static_servers.is_empty() {
            let args = [
                "interface",
                "ipv4",
                "set",
                "dnsservers",
                &format!("name={}", iface.name),
                "dhcp",
            ];
            if run_netsh(&args).is_none() {
                warn!("failed to restore DHCP DNS on {}", iface.name);
            }
        } else {
            for (i, server) in iface.static_servers.iter().enumerate() {
                let primary = if i == 0 { "primary" } else { "" };
                let args = [
                    "interface",
                    "ipv4",
                    "set",
                    "dnsservers",
                    &format!("name={}", iface.name),
                    "static",
                    server,
                    primary,
                    "validate=no",
                ];
                if run_netsh(&args).is_none() {
                    warn!("failed to restore DNS {server} on {}", iface.name);
                }
            }
        }
    }

    clear_backup();
    info!("system DNS restored");
    Ok(())
}

/// Best-effort restore on startup after an unclean exit.
pub fn startup_cleanup() {
    if load_backup().is_some() {
        info!("startup cleanup: restoring system DNS from backup");
        let _ = restore_system_dns();
    }
}
