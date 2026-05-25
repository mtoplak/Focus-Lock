use crate::state::AppState;
use std::path::Path;
use tracing::warn;

const ICON_SIZE: i32 = 48;

/// Look up the path for `exe`, extract its icon (or use cache), return PNG bytes.
/// Returns `None` if the path is unknown or extraction failed.
pub fn icon_png_for(state: &AppState, exe: &str) -> Option<Vec<u8>> {
    if let Some(bytes) = state.cached_icon(exe) {
        return Some(bytes);
    }
    let path = state.exe_path(exe)?;
    let bytes = extract_icon(&path)?;
    state.store_icon(exe, bytes.clone());
    Some(bytes)
}

#[cfg(windows)]
fn extract_icon(path: &Path) -> Option<Vec<u8>> {
    let path_str = path.to_string_lossy().to_string();
    match systemicons::get_icon(&path_str, ICON_SIZE) {
        Ok(bytes) if !bytes.is_empty() => Some(bytes),
        Ok(_) => None,
        Err(e) => {
            warn!(target: "icons", "icon extract failed for {}: {:?}", path_str, e);
            None
        }
    }
}

#[cfg(not(windows))]
fn extract_icon(_path: &Path) -> Option<Vec<u8>> {
    None
}
