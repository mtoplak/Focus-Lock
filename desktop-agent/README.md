# Focus Lock – Desktop Agent

Background service that blocks **desktop applications** and **URLs** during
Focus Lock focus sessions. Your PWA (the React app in `../frontend/`) stays
in the browser as the UI; this agent runs locally, exposes a small HTTP server
on `127.0.0.1:7777`, and the PWA pushes the current block list + focus state
to it.

## What it does

| Capability                  | How                                                                                              | Needs admin? |
|-----------------------------|--------------------------------------------------------------------------------------------------|--------------|
| Block desktop apps          | Enumerates running processes every 2 s, calls `TerminateProcess` on matches                      | No           |
| Block URLs                  | Rewrites `C:\Windows\System32\drivers\etc\hosts` while focus is active                            | Yes          |
| Reset browser networking    | Kills browser TCP connections + flushes DNS so the hosts block takes effect on existing tabs     | Yes (with URL blocking) |
| List installed apps         | Scans Start Menu shortcuts + currently running processes, dedupes by exe name                    | No           |
| Show app icons in picker    | Extracts the exe's icon via `systemicons`, served from `/icon/:exe` (cached 1 day in the browser) | No           |
| Crash-safe hosts cleanup    | Strips its hosts block on startup and on `Ctrl+C`                                                 | Yes          |

## Prerequisites

1. **Rust toolchain** — install via https://rustup.rs/
   - Windows: download and run `rustup-init.exe`. Accept the defaults.
   - Restart your shell. Verify: `cargo --version`.
2. **Administrator** if you want URL blocking. App blocking alone works without
   admin. The agent reports a `needs-admin` status to the PWA when it can't
   write the hosts file, and a yellow banner appears in the Blocks tab.

## Run in development

```powershell
# App blocking only (no admin):
cd desktop-agent
cargo run

# App + URL blocking (admin):
#   Press Win → type "powershell" → right-click → "Run as administrator"
cd desktop-agent
cargo run
```

First build takes 1–3 min. Subsequent runs are seconds. Stop with `Ctrl+C` —
the hosts block is cleaned up on the way out.

Expected log lines on a healthy run:

```
INFO focuslock_agent: focuslock-agent starting on port 7777
INFO focuslock_agent: startup cleanup: hosts file ok
INFO focuslock_agent::server: listening on http://127.0.0.1:7777
```

Open the PWA. On the **Blocks** page the agent banner should flip to
"Desktop agent connected".

## How a focus session looks from the agent

When the PWA reports `focusActive: true` with non-empty URLs/apps, the agent:

1. Rewrites the hosts file, adding `127.0.0.1 <domain>` and `127.0.0.1 www.<domain>` between marked delimiters.
2. Runs `ipconfig /flushdns` to clear the OS DNS resolver cache.
3. Force-closes existing TCP connections owned by Chrome / Brave / Edge / Firefox / Opera / Vivaldi / Arc / Thorium (loopback connections like Vite HMR are skipped).
4. *(Optional, off by default — see `FOCUSLOCK_AGGRESSIVE_RESET` below)* Kills each browser's network-service child process so the browser's internal DNS cache is wiped on respawn.
5. Starts the 2 s process-scan loop that terminates any blocked apps.

When `focusActive: false` or the URL list becomes empty, it removes the hosts
block and flushes DNS again. Sample log lines:

```
INFO focuslock_agent::blocker: applied 3 domain(s)
INFO focuslock_agent::connections: reset: closed 14 browser TCP conn(s), restarted 0 network service(s)
…
INFO focuslock_agent::blocker: removed block section
```

## HTTP API

The PWA polls `/status` every 4 s for the connected/disconnected indicator,
and pushes `/sync` whenever the block list or focus state changes. CORS is
permissive; the listener is bound to `127.0.0.1` only.

| Endpoint               | Method | Body / Params                                                          | Returns                                                                  |
|------------------------|--------|------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `/`                    | GET    | —                                                                      | `{ agent, version }` — liveness                                          |
| `/status`              | GET    | —                                                                      | `{ agent, version, lastKill?, urlBlocking: { kind, message? } }`         |
| `/sync`                | POST   | `{ apps: string[], urls: string[], focusActive: boolean }`             | `204 No Content`                                                         |
| `/installed-apps`      | GET    | —                                                                      | `{ apps: [{ exe, displayName, running, instances, hasIcon }] }`          |
| `/icon/:exe`           | GET    | URL-encoded exe basename                                               | `image/png` (or 404)                                                     |

### `urlBlocking.kind` values

- `idle` — focus is off or no URLs enabled.
- `active` — hosts file currently contains the focus block.
- `needs-admin` — agent wasn't started elevated; URL blocking is unavailable.
  The PWA surfaces this as a yellow banner.
- `error` — some other IO failure; `message` carries the details.

### Input normalization

- **Apps**: matched case-insensitively, `.exe` suffix optional. `Spotify`,
  `spotify`, and `Spotify.exe` all match `spotify.exe`.
- **URLs**: protocol (`https://`), path, port, and a leading `www.` are
  stripped at the agent. Each entry is written as both `<domain>` and
  `www.<domain>` so `youtube.com` covers `www.youtube.com` automatically.

## Environment variables

| Variable                      | Default      | What it does |
|-------------------------------|--------------|--------------|
| `FOCUSLOCK_PORT`              | `7777`       | TCP port the agent listens on (`127.0.0.1` only). |
| `FOCUSLOCK_HOSTS_FILE`        | OS default   | Override the hosts file path. Useful for testing without admin (point at a tempfile). |
| `FOCUSLOCK_AGGRESSIVE_RESET`  | `0` (off)    | When `1`, also kills each browser's **network service** process when URL blocking activates. This instantly invalidates the browser's internal DNS cache so already-open tabs of blocked sites fail on the next refresh. **Trade-off:** it also kills Vite's HMR WebSocket, which causes the PWA's dev server to reload. Turn this on only when running the PWA from a production build (`npm run build && npm run preview`), not `npm run dev`. |

## Build a release binary

```powershell
cd desktop-agent
cargo build --release
```

Output: `target/release/focuslock-agent.exe` (~3–4 MB stripped). Copy it
anywhere and run it.

## Autostart on login (Windows)

The simplest path: press `Win+R`, type `shell:startup`, drop a shortcut to
`focuslock-agent.exe` into the folder that opens. For URL blocking, the
shortcut needs to be configured to run as administrator (Properties →
Shortcut → Advanced → check "Run as administrator").

A "real" installer is out of scope here; the code is structured so it can drop
into a Tauri `src-tauri/` directory unchanged if you want one later.

## Security notes

- **Bind address**: `127.0.0.1` only. Not reachable from other machines.
- **CORS**: currently `Any`, so the PWA can reach the agent from any origin.
  The downside is that any other website you visit could send requests too —
  the worst they can do is push a bogus block list (the agent won't kill
  arbitrary processes; only ones the user listed). To lock this down, replace
  `allow_origin(Any)` in `src/server.rs` with the specific origin of your PWA.
- **No authentication**. Suitable for a personal-machine focus app; not for
  shared environments.

## Project layout

```
desktop-agent/
├── Cargo.toml
└── src/
    ├── main.rs          # tokio runtime, startup cleanup, Ctrl+C cleanup
    ├── server.rs        # axum HTTP API
    ├── blocker.rs       # 2 s scan loop; drives apps + URLs + connection reset
    ├── discovery.rs     # Start Menu shortcut scan + running-process merge
    ├── icons.rs         # exe icon extraction (windows-only via systemicons)
    ├── hosts.rs         # hosts-file read/strip/apply/remove + DNS flush
    ├── connections.rs   # browser TCP-connection killer + network-service reset
    └── state.rs         # shared AppState (block list, url status, icon cache)
```
