use parking_lot::Mutex;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Default)]
pub struct InnerState {
    pub blocked_apps: HashSet<String>,
    pub focus_active: bool,
    pub last_kill: Option<String>,
    /// Maps lowercased exe name → resolved absolute path on disk. Populated
    /// each time `/installed-apps` runs so `/icon/:exe` can find the file.
    pub exe_paths: HashMap<String, PathBuf>,
    /// Maps lowercased exe name → cached PNG bytes for its icon. Filled
    /// lazily by the icon endpoint so first request pays the cost.
    pub icon_cache: HashMap<String, Vec<u8>>,
}

#[derive(Clone, Default)]
pub struct AppState {
    inner: Arc<Mutex<InnerState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn snapshot(&self) -> (HashSet<String>, bool, Option<String>) {
        let g = self.inner.lock();
        (g.blocked_apps.clone(), g.focus_active, g.last_kill.clone())
    }

    pub fn update_sync(&self, apps: Vec<String>, focus_active: bool) {
        let mut g = self.inner.lock();
        g.blocked_apps = apps.into_iter().map(normalize_name).collect();
        g.focus_active = focus_active;
    }

    pub fn record_kill(&self, name: &str) {
        let mut g = self.inner.lock();
        g.last_kill = Some(name.to_string());
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

pub fn normalize_name(s: String) -> String {
    s.trim().to_ascii_lowercase()
}
