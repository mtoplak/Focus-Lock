# Voice control (frontend)

Step-by-step rollout using the Web Speech API (Chrome / Edge best; limited in Firefox).

| Step | Status | Scope |
|------|--------|--------|
| **1** | Done | Settings toggle, timer commands (start/pause/reset/skip + modes) |
| **2** | Done | Navigate: “open blocks”, “open stats”, “open settings”, “open timer” / “home” |
| **3** | Planned | Keyboard shortcut to toggle mic; optional “only during focus” |
| **4** | Partial | Command list in Settings (done); locale / language picker (planned) |

## Usage

1. Enable **Voice control** in Settings.
2. Use the **mic in the sidebar** (desktop) or **top bar** (mobile) on any screen.
3. Tap mic, say a command, tap again to cancel while listening.

## Supported commands

### Timer

| Say | Action |
|-----|--------|
| start, begin, resume, go | Start timer |
| pause, hold | Pause timer |
| reset, restart | Reset current mode |
| skip, next | Skip to next segment |
| focus | Switch to focus mode |
| short break | Switch to short break |
| long break | Switch to long break |

### Navigation (Step 2)

| Say | Action |
|-----|--------|
| open timer, go to timer, show timer, timer, home | Timer tab (`/`) |
| open blocks, go to blocks, show blocks, blocks | Blocks tab (`/blocks`) |
| open stats, go to stats, show stats, stats, statistics | Stats tab (`/stats`) |
| open settings, go to settings, show settings, settings | Settings tab (`/settings`) |

Phrases must match the heard transcript exactly (after lowercasing). Say the full phrase, e.g. **“open blocks”**, not “please open blocks”.

## Code map

| Layer | File | Role |
|-------|------|------|
| Phrases → command id | `src/lib/voice/commands.ts` | `PHRASES`, `matchVoiceCommand` |
| id → callbacks | `src/hooks/useVoiceControl.ts` | `runCommand` |
| callbacks → app | `src/pages/HomePage.tsx` | `timer.*`, `setView` → `navigate()` |

## Browser support

Requires `SpeechRecognition` (Chromium-based browsers). Safari/Firefox may not show the feature.
