use crate::discovery;
use crate::icons;
use crate::state::AppState;
use axum::{
    extract::{Path as AxPath, State},
    http::{header, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Serialize)]
struct StatusResponse {
    agent: &'static str,
    version: &'static str,
    #[serde(skip_serializing_if = "Option::is_none", rename = "lastKill")]
    last_kill: Option<String>,
}

#[derive(Deserialize)]
struct SyncRequest {
    apps: Vec<String>,
    #[serde(rename = "focusActive")]
    focus_active: bool,
}

async fn root() -> impl IntoResponse {
    Json(serde_json::json!({
        "agent": "focuslock",
        "version": VERSION,
    }))
}

async fn status(State(state): State<AppState>) -> impl IntoResponse {
    let (_, _, last_kill) = state.snapshot();
    Json(StatusResponse {
        agent: "focuslock",
        version: VERSION,
        last_kill,
    })
}

async fn sync(
    State(state): State<AppState>,
    Json(body): Json<SyncRequest>,
) -> impl IntoResponse {
    state.update_sync(body.apps, body.focus_active);
    StatusCode::NO_CONTENT
}

async fn installed_apps(State(state): State<AppState>) -> impl IntoResponse {
    let (apps, paths) = tokio::task::spawn_blocking(discovery::list_all_apps)
        .await
        .unwrap_or_default();
    state.set_exe_paths(paths);
    Json(serde_json::json!({ "apps": apps }))
}

async fn app_icon(
    State(state): State<AppState>,
    AxPath(exe): AxPath<String>,
) -> Response {
    let state_for_blocking = state.clone();
    let exe_for_blocking = exe.clone();
    let bytes = tokio::task::spawn_blocking(move || {
        icons::icon_png_for(&state_for_blocking, &exe_for_blocking)
    })
    .await
    .ok()
    .flatten();

    match bytes {
        Some(b) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "image/png"),
                (header::CACHE_CONTROL, "public, max-age=86400"),
            ],
            b,
        )
            .into_response(),
        None => (StatusCode::NOT_FOUND, "icon not found").into_response(),
    }
}

pub async fn run(state: AppState, port: u16) -> anyhow::Result<()> {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root))
        .route("/status", get(status))
        .route("/sync", post(sync))
        .route("/installed-apps", get(installed_apps))
        .route("/icon/:exe", get(app_icon))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    info!("listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
