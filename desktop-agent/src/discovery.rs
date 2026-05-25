use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use sysinfo::System;
use tracing::debug;
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct AppEntry {
    /// Bare executable name, lowercased, with `.exe` (e.g. `spotify.exe`).
    pub exe: String,
    /// Human label (Start Menu shortcut name if available, else derived from exe).
    #[serde(rename = "displayName")]
    pub display_name: String,
    /// Whether at least one process with this exe is currently running.
    pub running: bool,
    /// How many instances are alive (0 if not running).
    pub instances: u32,
    /// Whether we have an icon path on disk for this exe.
    #[serde(rename = "hasIcon")]
    pub has_icon: bool,
}

/// Process names that belong to Windows and must never appear in the picker.
const SYSTEM_BLOCKLIST: &[&str] = &[
    "system",
    "idle",
    "registry",
    "memory compression",
    "secure system",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "lsaiso.exe",
    "winlogon.exe",
    "fontdrvhost.exe",
    "dwm.exe",
    "sihost.exe",
    "svchost.exe",
    "taskhostw.exe",
    "taskhost.exe",
    "runtimebroker.exe",
    "applicationframehost.exe",
    "searchhost.exe",
    "searchapp.exe",
    "searchindexer.exe",
    "searchprotocolhost.exe",
    "searchfilterhost.exe",
    "ctfmon.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
    "lockapp.exe",
    "textinputhost.exe",
    "conhost.exe",
    "audiodg.exe",
    "dllhost.exe",
    "rundll32.exe",
    "explorer.exe",
    "backgroundtaskhost.exe",
    "mousocoreworker.exe",
    "msmpeng.exe",
    "nissrv.exe",
    "securityhealthsystray.exe",
    "securityhealthservice.exe",
    "smartscreen.exe",
    "phoneexperiencehost.exe",
    "useroobebroker.exe",
    "widgets.exe",
    "widgetservice.exe",
    "crossdeviceservice.exe",
];

const SHORTCUT_NAME_BLOCKLIST: &[&str] = &[
    "uninstall",
    "uninstaller",
    "readme",
    "release notes",
    "help",
    "documentation",
    "license",
    "support",
];

fn is_system_path(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_ascii_lowercase();
    lower.starts_with("c:\\windows\\") || lower.starts_with("c:/windows/")
}

fn display_name_from_exe(exe: &str) -> String {
    let stem = exe.strip_suffix(".exe").unwrap_or(exe);
    stem.split(|c: char| c == '-' || c == '_' || c == ' ')
        .filter(|s| !s.is_empty())
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn start_menu_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(appdata) = std::env::var_os("APPDATA") {
        let mut p = PathBuf::from(appdata);
        p.push("Microsoft");
        p.push("Windows");
        p.push("Start Menu");
        p.push("Programs");
        paths.push(p);
    }
    if let Some(programdata) = std::env::var_os("PROGRAMDATA") {
        let mut p = PathBuf::from(programdata);
        p.push("Microsoft");
        p.push("Windows");
        p.push("Start Menu");
        p.push("Programs");
        paths.push(p);
    }
    paths
}

/// Parse a single .lnk file. Returns `(display_name, target_exe_path)` if the
/// shortcut points at a regular .exe (not a URL, .chm, etc.).
fn parse_shortcut(lnk_path: &Path) -> Option<(String, PathBuf)> {
    // The `lnk` crate has internal `unwrap()` calls that panic on certain
    // malformed shortcuts (some Windows-shipped ones do this). Isolate each
    // parse so one bad file doesn't kill the whole scan.
    let link = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        lnk::ShellLink::open(lnk_path)
    }))
    .ok()
    .and_then(|r| r.ok())?;

    let info = link.link_info().as_ref()?;
    let base = info.local_base_path().as_ref()?.clone();
    let target = PathBuf::from(base);

    let ext_ok = target
        .extension()
        .map(|e| e.eq_ignore_ascii_case("exe"))
        .unwrap_or(false);
    if !ext_ok {
        return None;
    }

    let display = lnk_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    if display.is_empty() {
        return None;
    }

    let lower_display = display.to_ascii_lowercase();
    if SHORTCUT_NAME_BLOCKLIST.iter().any(|b| lower_display.contains(b)) {
        return None;
    }

    Some((display, target))
}

/// Walk Start Menu directories and resolve each .lnk to its target exe.
fn scan_start_menu() -> HashMap<String, (String, PathBuf)> {
    let mut found: HashMap<String, (String, PathBuf)> = HashMap::new();

    // The `lnk` crate calls `.unwrap()` on malformed shortcuts. We catch each
    // panic in `parse_shortcut`, but the default hook still prints the message
    // first. Swap to a no-op for the scan, then restore.
    let previous_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(|_| {}));

    for root in start_menu_paths() {
        if !root.exists() {
            continue;
        }
        for entry in WalkDir::new(&root)
            .max_depth(6)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let is_lnk = path
                .extension()
                .map(|e| e.eq_ignore_ascii_case("lnk"))
                .unwrap_or(false);
            if !is_lnk {
                continue;
            }

            if let Some((display, target)) = parse_shortcut(path) {
                if is_system_path(&target) {
                    continue;
                }
                let exe_lower = target
                    .file_name()
                    .map(|n| n.to_string_lossy().to_ascii_lowercase())
                    .unwrap_or_default();
                if exe_lower.is_empty() || SYSTEM_BLOCKLIST.contains(&exe_lower.as_str()) {
                    continue;
                }
                // Keep the first occurrence (preserves the cleanest display name).
                found.entry(exe_lower).or_insert((display, target));
            } else {
                debug!(target: "discovery", "skip {}", path.display());
            }
        }
    }

    std::panic::set_hook(previous_hook);

    found
}

/// Enumerate running processes, grouped by lowercase exe name.
fn scan_running() -> HashMap<String, (u32, Option<PathBuf>)> {
    let mut sys = System::new();
    sys.refresh_processes();

    let blocklist: HashSet<&str> = SYSTEM_BLOCKLIST.iter().copied().collect();
    let mut found: HashMap<String, (u32, Option<PathBuf>)> = HashMap::new();

    for (_pid, proc) in sys.processes() {
        let raw_name = proc.name();
        if raw_name.is_empty() {
            continue;
        }
        let lower = raw_name.to_ascii_lowercase();
        if blocklist.contains(lower.as_str()) {
            continue;
        }

        let path = proc.exe().map(|p| p.to_path_buf());
        if let Some(ref p) = path {
            if is_system_path(p) {
                continue;
            }
        }

        let key = if lower.ends_with(".exe") {
            lower
        } else {
            format!("{lower}.exe")
        };

        let entry = found.entry(key).or_insert((0, path.clone()));
        entry.0 += 1;
        if entry.1.is_none() {
            entry.1 = path;
        }
    }

    found
}

/// Returns the merged app list AND the `exe_lower → path` map for the icon cache.
pub fn list_all_apps() -> (Vec<AppEntry>, HashMap<String, PathBuf>) {
    let start_menu = scan_start_menu();
    let running = scan_running();

    let mut all_keys: HashSet<String> = HashSet::new();
    all_keys.extend(start_menu.keys().cloned());
    all_keys.extend(running.keys().cloned());

    let mut exe_paths: HashMap<String, PathBuf> = HashMap::new();
    let mut apps: Vec<AppEntry> = Vec::with_capacity(all_keys.len());

    for key in all_keys {
        let run = running.get(&key);
        let sm = start_menu.get(&key);

        let display_name = sm
            .map(|(name, _)| name.clone())
            .unwrap_or_else(|| display_name_from_exe(&key));

        // Prefer Start Menu's target path (more reliable than runtime exe path
        // which can be permission-denied on some processes).
        let path: Option<PathBuf> = sm
            .map(|(_, p)| p.clone())
            .or_else(|| run.and_then(|(_, p)| p.clone()));

        let running_flag = run.is_some();
        let instances = run.map(|(n, _)| *n).unwrap_or(0);
        let has_icon = path.is_some();

        if let Some(p) = path {
            exe_paths.insert(key.clone(), p);
        }

        apps.push(AppEntry {
            exe: key,
            display_name,
            running: running_flag,
            instances,
            has_icon,
        });
    }

    apps.sort_by(|a, b| {
        b.running
            .cmp(&a.running)
            .then_with(|| a.display_name.to_ascii_lowercase().cmp(&b.display_name.to_ascii_lowercase()))
    });

    (apps, exe_paths)
}
