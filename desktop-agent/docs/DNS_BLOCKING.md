# DNS URL blocking & stats (desktop agent)

Step-by-step rollout for blocking URLs via a **local DNS resolver** and counting lookup attempts (no browser extension).

| Step | Status | Scope |
|------|--------|--------|
| **1** | Done | UDP DNS server on `127.0.0.1:53`, block + count queries, `urlBlockCounts` on `/status` |
| **2** | Done | Windows: redirect system DNS during focus; restore on stop / crash / Ctrl+C |
| **3** | Done | PWA: merge counts into `fl.urlBlockCounts`, Stats → “Most blocked sites” |
| **4** | Planned | IPv6-only edge cases, DoH detection hints, Linux/macOS system DNS |

## How it works

1. During focus with enabled URLs, the agent starts a DNS server on **`127.0.0.1:53`** (admin required).
2. Windows adapters are pointed at **`127.0.0.1`** for the duration of focus.
3. Each lookup to a blocked domain (including `www.` and subdomains) returns **0.0.0.0** and increments **`urlBlockCounts`**.
4. Other queries are forwarded to **`FOCUSLOCK_DNS_UPSTREAM`** (default `8.8.8.8:53`).
5. When focus ends, DNS stops and system DNS is restored from `%LOCALAPPDATA%\focuslock\dns_backup.json`.

**Hosts file blocking is not used** in the default mode (hosts would answer before our resolver and stats would stay at zero).

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `FOCUSLOCK_DNS_PORT` | `53` | Local resolver port |
| `FOCUSLOCK_DNS_UPSTREAM` | `8.8.8.8:53` | Upstream for allowed domains |
| `FOCUSLOCK_URL_BLOCK_MODE` | `dns` | Set to `hosts` to use legacy hosts-only blocking (no URL stats) |

## Testing manually

1. Run agent **as administrator**: `cargo run` in `desktop-agent`.
2. PWA: enable URLs on Blocks, start a **focus** session.
3. In another terminal: `nslookup youtube.com 127.0.0.1` (if a blocked domain).
4. `GET http://127.0.0.1:7777/status` → `urlBlockCounts` should increment.
5. Stats tab → **Most blocked sites**.

## Limitations

- **Admin** required (port 53 + adapter DNS changes).
- Browsers with **Secure DNS / DoH** may bypass system DNS — counts may be incomplete.
- Counts are **per DNS lookup** (retries / multiple tabs can inflate numbers).
- Agent restart resets in-memory counters; PWA persists totals in localStorage with delta sync (same as app kills).

## Rollback

Set `FOCUSLOCK_URL_BLOCK_MODE=hosts` to restore hosts-file-only blocking without URL attempt stats.
