use std::path::Path;

use tauri::State;

use crate::state::StartupFilePath;

pub fn extract_epub_path_from_args(args: &[String]) -> Option<String> {
    args.iter().find_map(|arg| normalize_epub_path(arg))
}

pub fn normalize_epub_path(candidate: &str) -> Option<String> {
    let path = Path::new(candidate);
    let extension = path.extension()?.to_str()?;
    if !extension.eq_ignore_ascii_case("epub") || !path.is_file() {
        return None;
    }

    Some(path.to_string_lossy().into_owned())
}

pub fn capture_startup_file_path(args: &[String], state: &State<StartupFilePath>) {
    if let Some(path) = extract_epub_path_from_args(args) {
        log::info!("Captured startup EPUB path: {}", path);

        match state.0.lock() {
            Ok(mut startup_file_path) => {
                startup_file_path.replace(path);
            }
            Err(error) => {
                log::error!("Failed to store startup file path: {}", error);
            }
        }
    }
}

#[tauri::command]
pub fn get_startup_file_path(state: State<StartupFilePath>) -> Option<String> {
    match state.0.lock() {
        Ok(mut startup_file_path) => startup_file_path.take(),
        Err(error) => {
            log::error!("Failed to read startup file path: {}", error);
            None
        }
    }
}
