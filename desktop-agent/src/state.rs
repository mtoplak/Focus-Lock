use parking_lot::Mutex;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum UrlBlockStatus {
    /// Not currently blocking anything.
    #[default]
    Idle,
    /// Successfully blocking the configured domains.
    Active,
    /// Hosts file write failed because the agent isn't running as admin.
    NeedsAdmin,
    /// Some other IO error happened.
    Error { message: String },
}

#[derive(Default)]
pub struct InnerState {
    pub blocked_apps: HashSet<String>,
    pub blocked_urls: HashSet<String>,
    pub focus_active: bool,
    pub last_kill: Option<String>,
    /// Per-process kill totals for the current agent run (synced to the PWA).
    pub kill_counts: HashMap<String, u64>,
    pub url_block_counts: HashMap<String, u64>,
    pub exe_paths: HashMap<String, PathBuf>,
    pub icon_cache: HashMap<String, Vec<u8>>,
    pub url_status: UrlBlockStatus,
}

#[derive(Clone, Default)]
pub struct AppState {
    inner: Arc<Mutex<InnerState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn snapshot(&self) -> Snapshot {
        let g = self.inner.lock();
        Snapshot {
            blocked_apps: g.blocked_apps.clone(),
            blocked_urls: g.blocked_urls.clone(),
            focus_active: g.focus_active,
            last_kill: g.last_kill.clone(),
            kill_counts: g.kill_counts.clone(),
            url_block_counts: g.url_block_counts.clone(),
            url_status: g.url_status.clone(),
        }
    }

    pub fn update_sync(&self, apps: Vec<String>, urls: Vec<String>, focus_active: bool) {
        let mut g = self.inner.lock();
        g.blocked_apps = apps.into_iter().map(normalize_name).collect();
        g.blocked_urls = urls.into_iter().map(|s| s.trim().to_ascii_lowercase()).collect();
        g.focus_active = focus_active;
    }

    pub fn record_kill(&self, name: &str) {
        let mut g = self.inner.lock();
        g.last_kill = Some(name.to_string());
        let key = normalize_name(name.to_string());
        *g.kill_counts.entry(key).or_insert(0) += 1;
    }

    pub fn record_url_query(&self, domain: &str) {
        let mut g = self.inner.lock();
        let key = normalize_name(domain.to_string());
        *g.url_block_counts.entry(key).or_insert(0) += 1;
    }

    pub fn set_url_status(&self, status: UrlBlockStatus) {
        let mut g = self.inner.lock();
        g.url_status = status;
    }

    pub fn set_exe_paths(&self, paths: HashMap<String, PathBuf>) {
        let mut g = self.inner.lock();
        g.exe_paths = paths;
    }

    pub fn exe_path(&self, exe: &str) -> Option<PathBuf> {
        let g = self.inner.lock();
        g.exe_paths.get(&exe.to_ascii_lowercase()).cloned()
    }

    pub fn cached_icon(&self, exe: &str) -> Option<Vec<u8>> {
        let g = self.inner.lock();
        g.icon_cache.get(&exe.to_ascii_lowercase()).cloned()
    }

    pub fn store_icon(&self, exe: &str, bytes: Vec<u8>) {
        let mut g = self.inner.lock();
        g.icon_cache.insert(exe.to_ascii_lowercase(), bytes);
    }
}

pub struct Snapshot {
    pub blocked_apps: HashSet<String>,
    pub blocked_urls: HashSet<String>,
    pub focus_active: bool,
    pub last_kill: Option<String>,
    pub kill_counts: HashMap<String, u64>,
    pub url_block_counts: HashMap<String, u64>,
    pub url_status: UrlBlockStatus,
}

pub fn normalize_name(s: String) -> String {
    s.trim().to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_name_trims_and_lowercases() {
        assert_eq!(normalize_name("  Discord.EXE  ".into()), "discord.exe");
    }

    #[test]
    fn update_sync_stores_normalized_block_lists_and_focus_flag() {
        let state = AppState::new();
        state.update_sync(
            vec![" Discord.EXE ".into(), "Spotify.exe".into()],
            vec![" YouTube.COM ".into(), "reddit.com".into()],
            true,
        );

        let snap = state.snapshot();
        assert!(snap.focus_active);
        assert_eq!(
            snap.blocked_apps,
            ["discord.exe".into(), "spotify.exe".into()]
                .into_iter()
                .collect::<HashSet<_>>()
        );
        assert_eq!(
            snap.blocked_urls,
            ["youtube.com".into(), "reddit.com".into()]
                .into_iter()
                .collect::<HashSet<_>>()
        );
    }

    #[test]
    fn record_kill_increments_per_process_totals() {
        let state = AppState::new();
        state.record_kill("Discord.exe");
        state.record_kill("DISCORD.EXE");
        state.record_kill("Spotify.exe");

        let snap = state.snapshot();
        assert_eq!(snap.last_kill.as_deref(), Some("Spotify.exe"));
        assert_eq!(snap.kill_counts.get("discord.exe"), Some(&2));
        assert_eq!(snap.kill_counts.get("spotify.exe"), Some(&1));
    }

    #[test]
    fn record_url_query_increments_per_domain_totals() {
        let state = AppState::new();
        state.record_url_query("YouTube.com");
        state.record_url_query("youtube.com");
        state.record_url_query("reddit.com");

        let snap = state.snapshot();
        assert_eq!(snap.url_block_counts.get("youtube.com"), Some(&2));
        assert_eq!(snap.url_block_counts.get("reddit.com"), Some(&1));
    }

    #[test]
    fn set_url_status_updates_snapshot() {
        let state = AppState::new();
        state.set_url_status(UrlBlockStatus::Active);
        assert_eq!(state.snapshot().url_status, UrlBlockStatus::Active);

        state.set_url_status(UrlBlockStatus::NeedsAdmin);
        assert_eq!(state.snapshot().url_status, UrlBlockStatus::NeedsAdmin);

        state.set_url_status(UrlBlockStatus::Error {
            message: "dns bind failed".into(),
        });
        assert_eq!(
            state.snapshot().url_status,
            UrlBlockStatus::Error {
                message: "dns bind failed".into()
            }
        );
    }
}
