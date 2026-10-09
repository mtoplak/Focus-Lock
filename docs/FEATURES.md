# Focus Lock — Key Features

**Focus Lock** is a Pomodoro-style productivity app that helps you stay on task by combining a focus timer with **local distraction blocking**. It is delivered as an installable Progressive Web App (PWA), backed by a small API for authentication and push notifications, and a native Windows desktop agent that enforces site and app blocks on the user’s machine.

---

## Core functionality

These are the capabilities that define the product:

| Area | What it does |
|------|----------------|
| **Pomodoro timer** | Focus / short break / long break cycles with configurable durations, auto-start, skip, reset, and cycle reset |
| **Distraction blocking** | Blocks selected websites and desktop apps **while a focus session is running** |
| **Scheduled blocking** | Blocks the same list on recurring time windows — without starting the timer |
| **Desktop agent** | Local Windows service that applies DNS/URL blocking and kills blocked apps |
| **Stats** | Today’s focus time, session history, and counts of blocked sites/apps |
| **PWA + notifications** | Installable app, offline-friendly shell, end-of-interval notifications (local SW + Web Push) |

---

## 1. Pomodoro timer

The timer is the main interaction surface of the app.

- **Modes:** Focus, Short break, Long break  
- **Controls:** Start, pause, reset (current interval), skip, reset cycle  
- **Settings:** Session lengths, sessions until long break, auto-start breaks/focus, sound, notifications, strict mode, voice control  
- **Persistence:** State is saved in the browser (`localStorage`) so a refresh restores the session  
- **Strict mode:** While a focus session is running, mode changes and some controls can be locked  

**Reset cycle** restarts Pomodoro progress toward the long break (back to Focus 1 of N) while keeping the daily session total for stats. **Reset all stats** clears history, block counts, and the “sessions today” counter under the timer.

---

## 2. Distraction blocking

Blocking is driven by a single **block list** (sites and apps) managed in the **Blocks** tab.

Enforcement turns on when **either**:

1. A **focus** session is **running**, or  
2. An enabled **schedule** window is active  

The list is pushed to the local desktop agent (`POST http://127.0.0.1:7777/sync`) with a `focusActive` flag. The agent then:

- **URLs:** sinkholes lookups via a local DNS resolver (default) or hosts-file fallback  
- **Apps:** periodically finds matching processes and terminates them  

When focus ends (or the schedule window ends) and nothing else requires blocking, the agent stops enforcing and restores system DNS.

> **Note:** URL blocking on Windows typically requires running the agent **as Administrator** (port 53 and adapter DNS changes).

---

## 3. Scheduled blocking

Schedules are recurring **day + time** windows stored locally (`fl.schedules`).

- Same block list as Pomodoro focus — schedules only answer **when**, not **what**  
- Supports same-day and overnight windows  
- Re-evaluated periodically in the browser (~15s) so blocking turns on/off at boundaries  
- Independent of the timer (no countdown, stats, or notifications from the schedule itself)  

The schedule logic runs in the PWA; the agent only receives “blocking on/off + lists.”

---

## 4. Desktop agent (Windows)

A Rust process that runs on the user’s PC and listens on `127.0.0.1:7777`.

| Responsibility | Mechanism |
|----------------|-----------|
| Sync with PWA | HTTP API (`/sync`, `/status`, installed apps, icons) |
| Block websites | Local DNS on `127.0.0.1:53` + temporary system DNS redirect |
| Block apps | Process scan + kill |
| Stats signals | Kill counts and URL block query counts for the Stats tab |

If the agent is stopped uncleanly while DNS redirect is active, Wi‑Fi may show “No internet” until DNS is restored (agent startup cleanup, or set adapter DNS back to DHCP). See [desktop-agent/docs/DNS_BLOCKING.md](../desktop-agent/docs/DNS_BLOCKING.md).

---

## 5. Statistics

On-device stats (localStorage), optionally enriched by agent deltas:

- Focus minutes and completed sessions by day  
- Most blocked sites (DNS query counts)  
- Most blocked apps (kill counts)  
- Streaks / personal best derived from history  

**Reset all stats** clears displayed history and block counts and resets the timer’s “sessions today” counter, without wiping settings, the block list, or account sign-in.

---

## 6. PWA, offline use, and notifications

### Progressive Web App

- Installable (**standalone** display, icons, shortcuts) via Web App Manifest  
- Custom service worker (`injectManifest` / Workbox): precache shell, offline navigation to `index.html`, font caching strategies  
- Auto-update of the service worker  

### Offline / degraded connectivity

Works locally without internet for timer, blocks, schedules, and agent sync to localhost. Sign-in, token refresh, and Web Push need the backend. An offline banner indicates browser/API/internet issues.

### Notifications

| Path | When it helps |
|------|----------------|
| In-page / SW local alarm | App or SW still alive when the interval ends |
| **Web Push** (backend + VAPID) | App closed; signed-in user; notifications enabled |

Web Push requires VAPID keys on the backend and a registered push subscription. Guest mode does not use server push.

---

## 7. Authentication

- Google OAuth and email/password via the Express backend  
- Guest mode: full local timer/blocking UX without accounts or Web Push  
- JWT access + refresh tokens; profile cached for brief offline resume  

---

## Architecture (overview)

```
┌─────────────────────┐     sync      ┌──────────────────────┐
│  Focus Lock PWA     │ ────────────► │  Desktop agent       │
│  (React / Vite)     │  127.0.0.1    │  (Rust / Windows)    │
│  Timer · Blocks ·   │               │  DNS · app kill      │
│  Schedule · Stats   │               └──────────────────────┘
└─────────┬───────────┘
          │ HTTPS (auth, push)
          ▼
┌─────────────────────┐
│  Backend (Express)  │
│  Auth · Web Push    │
│  PostgreSQL         │
└─────────────────────┘
```

---

## Technology stack

| Layer | Stack |
|-------|--------|
| Frontend | Vite 6, React 19, Tailwind CSS 4, `vite-plugin-pwa`, Vitest |
| Backend | Node, Express, TypeScript, PostgreSQL |
| Desktop agent | Rust, Axum, sysinfo (Windows) |
| Delivery | Docker Compose (dev + production-like) |

---

## Related documentation

- [Root README](../README.md) — setup and Docker  
- [Frontend README](../frontend/README.md)  
- [Backend README](../backend/README.md)  
- [Desktop agent README](../desktop-agent/README.md)  
- [DNS blocking notes](../desktop-agent/docs/DNS_BLOCKING.md)  
