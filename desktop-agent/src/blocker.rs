use crate::state::AppState;
use std::time::Duration;
use sysinfo::System;
use tracing::{debug, info, warn};

const SCAN_INTERVAL: Duration = Duration::from_millis(2000);

pub async fn run(state: AppState) {
    let mut sys = System::new();

    loop {
        tokio::time::sleep(SCAN_INTERVAL).await;

        let (blocked, focus_active, _) = state.snapshot();
        if !focus_active || blocked.is_empty() {
            continue;
        }

        sys.refresh_processes();

        for (_pid, proc) in sys.processes() {
            let raw = proc.name();
            let lower = raw.to_ascii_lowercase();
            let stripped = lower.strip_suffix(".exe").unwrap_or(&lower);

            if blocked.contains(&lower) || blocked.contains(stripped) {
                match proc.kill() {
                    true => {
                        info!(target: "blocker", "killed {}", raw);
                        state.record_kill(raw);
                    }
                    false => {
                        warn!(target: "blocker", "failed to kill {}", raw);
                    }
                }
            } else {
                debug!(target: "blocker", "skip {}", raw);
            }
        }
    }
}
