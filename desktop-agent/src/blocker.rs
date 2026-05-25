use crate::hosts;
use crate::state::{AppState, UrlBlockStatus};
use std::time::Duration;
use sysinfo::System;
use tracing::{debug, info, warn};

const SCAN_INTERVAL: Duration = Duration::from_millis(2000);

pub async fn run(state: AppState) {
    let mut sys = System::new();
    let mut hosts_active = false;
    let mut last_url_key: Option<String> = None;

    loop {
        tokio::time::sleep(SCAN_INTERVAL).await;

        let snap = state.snapshot();

        // ── URL blocking via hosts file ──
        let want_urls = snap.focus_active && !snap.blocked_urls.is_empty();
        let url_key = hosts::canonical_key(&snap.blocked_urls);

        if want_urls {
            let needs_apply = !hosts_active || last_url_key.as_deref() != Some(url_key.as_str());
            if needs_apply {
                match hosts::apply(&snap.blocked_urls) {
                    Ok(()) => {
                        info!("applied {} domain(s)", snap.blocked_urls.len());
                        hosts::flush_dns_cache();
                        #[cfg(windows)]
                        crate::connections::reset_browser_connections();
                        hosts_active = true;
                        last_url_key = Some(url_key);
                        state.set_url_status(UrlBlockStatus::Active);
                    }
                    Err(e) if e.is_permission_denied() => {
                        warn!("{e}");
                        hosts_active = false;
                        last_url_key = None;
                        state.set_url_status(UrlBlockStatus::NeedsAdmin);
                    }
                    Err(e) => {
                        warn!("{e}");
                        hosts_active = false;
                        last_url_key = None;
                        state.set_url_status(UrlBlockStatus::Error {
                            message: e.to_string(),
                        });
                    }
                }
            }
        } else if hosts_active {
            match hosts::remove() {
                Ok(()) => {
                    info!("removed block section");
                    hosts::flush_dns_cache();
                    hosts_active = false;
                    last_url_key = None;
                    state.set_url_status(UrlBlockStatus::Idle);
                }
                Err(e) => {
                    warn!("remove failed: {e}");
                }
            }
        }

        // ── App blocking via process kill ──
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
