mod blocker;
mod discovery;
mod hosts;
mod icons;
mod server;
mod state;

use state::AppState;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

const DEFAULT_PORT: u16 = 7777;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("focuslock_agent=info,tower_http=warn")),
        )
        .init();

    let port: u16 = std::env::var("FOCUSLOCK_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    info!("focuslock-agent starting on port {port}");

    // Clear any leftover hosts block from a previous unclean exit. This is
    // best-effort — if we don't have admin, the file is unchanged and we
    // continue normally (URL blocking will be unavailable until restarted
    // with admin).
    match hosts::remove() {
        Ok(()) => info!("startup cleanup: hosts file ok"),
        Err(e) if e.is_permission_denied() => {
            warn!("startup cleanup skipped — agent not admin, URL blocking unavailable");
        }
        Err(e) => warn!("startup cleanup failed: {e}"),
    }

    let state = AppState::new();

    let blocker_state = state.clone();
    tokio::spawn(async move { blocker::run(blocker_state).await });

    // Graceful shutdown: ensure hosts file gets cleaned on Ctrl+C.
    tokio::spawn(async move {
        if tokio::signal::ctrl_c().await.is_ok() {
            info!("shutting down, cleaning hosts file");
            let _ = hosts::remove();
            std::process::exit(0);
        }
    });

    server::run(state, port).await?;
    Ok(())
}
