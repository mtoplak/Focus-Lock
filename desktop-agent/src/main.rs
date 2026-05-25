mod blocker;
mod discovery;
mod icons;
mod server;
mod state;

use state::AppState;
use tracing::info;
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

    let state = AppState::new();

    let blocker_state = state.clone();
    tokio::spawn(async move { blocker::run(blocker_state).await });

    server::run(state, port).await?;
    Ok(())
}
