# Focus Lock — Desktop Agent

Background service that blocks desktop applications during Focus Lock focus sessions.

Your PWA (the React app in `../frontend/`) stays in the browser as the UI. This
agent runs on your local machine, exposes a small HTTP server on
`127.0.0.1:7777`, and the PWA pushes the current block list + focus state to it.
When focus is active, the agent enumerates running processes every 2 seconds and
terminates any that match the configured list.

## Prerequisites

1. **Rust toolchain** — install via https://rustup.rs/
   - Windows: download and run `rustup-init.exe`. Accept the defaults.
   - After install, open a fresh terminal and verify: `cargo --version`
2. Nothing else. No admin rights needed. WebView2 is already on Windows 11.

## Run in development

```powershell
cd desktop-agent
cargo run
```

First build takes 1–3 min (compiling dependencies). After that, incremental
builds are seconds. Stop with `Ctrl+C`.

You should see:

```
focuslock-agent starting on port 7777
listening on http://127.0.0.1:7777
```

Open the PWA. On the **Blocks** page the agent status banner should flip from
"Desktop agent not running" to "Desktop agent connected".

## How it talks to the PWA

The PWA polls `GET http://127.0.0.1:7777/status` every 4 seconds for liveness,
and pushes the current block list with `POST /sync` whenever the list or focus
state changes.

| Endpoint  | Method | Body                                          | Returns                          |
|-----------|--------|-----------------------------------------------|----------------------------------|
| `/`       | GET    | —                                             | `{ agent, version }`             |
| `/status` | GET    | —                                             | `{ agent, version, lastKill? }`  |
| `/sync`   | POST   | `{ apps: string[], focusActive: boolean }`    | 204 No Content                   |

Process names are matched case-insensitively and the `.exe` suffix is optional
in user input (`Spotify`, `spotify`, and `Spotify.exe` all match `spotify.exe`).

## Build a release binary

```powershell
cd desktop-agent
cargo build --release
```

The binary lands at `target/release/focuslock-agent.exe` (~3–4 MB after strip).
You can copy it anywhere and run it.

## Autostart on login (Windows)

For v1, the simplest way is the Startup folder. Press `Win+R`, type
`shell:startup`, and drop a shortcut to `focuslock-agent.exe` in there.

For a "real" installer later, this code is structured so it drops into a Tauri
`src-tauri/` directory with no changes — Tauri's autostart plugin + tray-icon
plugin can wrap this binary cleanly.

## Security notes

- The HTTP server binds to `127.0.0.1` only — it is not reachable from other
  machines on your network.
- CORS is currently `Any` so the PWA can reach it from any origin. The downside
  is that any **other** website you visit could also send requests to the
  agent. For a personal focus app the worst they can do is push a bogus block
  list. If you want to lock this down, replace `allow_origin(Any)` in
  `src/server.rs` with the specific origin of your PWA.

## Project layout

```
desktop-agent/
├── Cargo.toml
└── src/
    ├── main.rs      tokio runtime, wires server + blocker
    ├── server.rs    axum HTTP server (status + sync endpoints)
    ├── blocker.rs   2s process-scan loop, kills matches
    └── state.rs     shared AppState (block list + focus flag)
```
