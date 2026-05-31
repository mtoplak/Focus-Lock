use crate::dns::DnsController;
use crate::domains;
use crate::hosts;
use crate::state::{AppState, UrlBlockStatus};
use std::time::Duration;
use sysinfo::System;
use tracing::{debug, info, warn};

const SCAN_INTERVAL: Duration = Duration::from_millis(2000);

fn use_dns_blocking() -> bool {
    match std::env::var("FOCUSLOCK_URL_BLOCK_MODE").ok().as_deref() {
        Some("hosts") => false,
        _ => true,
    }
}

pub async fn run(state: AppState) {
    let mut sys = System::new();
    let mut dns = DnsController::new();
    let mut dns_active = false;
    let mut last_url_key: Option<String> = None;

    // Legacy hosts fallback (when DNS mode disabled or DNS unavailable).
    let mut hosts_active = false;
    let mut last_hosts_key: Option<String> = None;

    loop {
        tokio::time::sleep(SCAN_INTERVAL).await;

        let snap = state.snapshot();
        let want_urls = snap.focus_active && !snap.blocked_urls.is_empty();
        let url_key = domains::canonical_key(&snap.blocked_urls);

        if want_urls && use_dns_blocking() {
            // Ensure hosts file is not intercepting before DNS (no URL query counts otherwise).
            if hosts_active {
                let _ = hosts::remove();
                hosts_active = false;
                last_hosts_key = None;
            }

            let needs_dns = !dns_active || last_url_key.as_deref() != Some(url_key.as_str());
            if needs_dns {
                if dns_active {
                    dns.stop().await;
                    #[cfg(windows)]
                    let _ = crate::system_dns::restore_system_dns();
                    dns_active = false;
                }

                match dns.start(state.clone(), snap.blocked_urls.clone()).await {
                    Ok(()) => {
                        #[cfg(windows)]
                        match crate::system_dns::redirect_to_local_resolver() {
                            Ok(()) => {
                                hosts::flush_dns_cache();
                                #[cfg(windows)]
                                crate::connections::reset_browser_connections();
                                dns_active = true;
                                last_url_key = Some(url_key.clone());
                                state.set_url_status(UrlBlockStatus::Active);
                                info!(
                                    "DNS URL blocking active for {} domain(s)",
                                    snap.blocked_urls.len()
                                );
                            }
                            Err(e) => {
                                warn!("system DNS redirect failed: {e}");
                                dns.stop().await;
                                state.set_url_status(UrlBlockStatus::Error {
                                    message: e.to_string(),
                                });
                            }
                        }
                        #[cfg(not(windows))]
                        {
                            dns_active = true;
                            last_url_key = Some(url_key.clone());
                            state.set_url_status(UrlBlockStatus::Active);
                        }
                    }
                    Err(e) if e.is_permission_denied() => {
                        warn!("{e}");
                        state.set_url_status(UrlBlockStatus::NeedsAdmin);
                    }
                    Err(e) => {
                        warn!("{e}");
                        state.set_url_status(UrlBlockStatus::Error {
                            message: e.to_string(),
                        });
                    }
                }
            } else if dns_active {
                dns.update_blocked(snap.blocked_urls.clone());
            }
        } else if dns_active {
            dns.stop().await;
            #[cfg(windows)]
            let _ = crate::system_dns::restore_system_dns();
            hosts::flush_dns_cache();
            dns_active = false;
            last_url_key = None;
            state.set_url_status(UrlBlockStatus::Idle);
            info!("DNS URL blocking stopped");
        }

        // Hosts fallback when DNS mode off or focus off with legacy hosts still active.
        if want_urls && !use_dns_blocking() {
            let needs_apply =
                !hosts_active || last_hosts_key.as_deref() != Some(url_key.as_str());
            if needs_apply {
                match hosts::apply(&snap.blocked_urls) {
                    Ok(()) => {
                        info!("applied {} domain(s) via hosts", snap.blocked_urls.len());
                        hosts::flush_dns_cache();
                        #[cfg(windows)]
                        crate::connections::reset_browser_connections();
                        hosts_active = true;
                        last_hosts_key = Some(url_key);
                        state.set_url_status(UrlBlockStatus::Active);
                    }
                    Err(e) if e.is_permission_denied() => {
                        warn!("{e}");
                        hosts_active = false;
                        last_hosts_key = None;
                        state.set_url_status(UrlBlockStatus::NeedsAdmin);
                    }
                    Err(e) => {
                        warn!("{e}");
                        hosts_active = false;
                        last_hosts_key = None;
                        state.set_url_status(UrlBlockStatus::Error {
                            message: e.to_string(),
                        });
                    }
                }
            }
        } else if hosts_active {
            match hosts::remove() {
                Ok(()) => {
                    info!("removed hosts block section");
                    hosts::flush_dns_cache();
                    hosts_active = false;
                    last_hosts_key = None;
                    if !dns_active {
                        state.set_url_status(UrlBlockStatus::Idle);
                    }
                }
                Err(e) => warn!("remove failed: {e}"),
            }
        }

        if !snap.focus_active || snap.blocked_apps.is_empty() {
            continue;
        }

        sys.refresh_processes();

        for (_pid, proc) in sys.processes() {
            let raw = proc.name();
            let lower = raw.to_ascii_lowercase();
            let stripped = lower.strip_suffix(".exe").unwrap_or(&lower);

            if snap.blocked_apps.contains(&lower) || snap.blocked_apps.contains(stripped) {
                if proc.kill() {
                    info!("killed {}", raw);
                    state.record_kill(raw);
                } else {
                    warn!("failed to kill {}", raw);
                }
            } else {
                debug!("skip {}", raw);
            }
        }
    }
}
