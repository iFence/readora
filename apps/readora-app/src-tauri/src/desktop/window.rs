use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::commands::startup::extract_epub_path_from_args;

pub fn focus_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn emit_open_file<R: Runtime>(app: &AppHandle<R>, file_path: &str) {
    if let Err(error) = app.emit("open-file", file_path) {
        log::error!("Failed to emit open-file event for {}: {}", file_path, error);
    }
}

pub fn handle_single_instance<R: Runtime>(app: &AppHandle<R>, args: Vec<String>) {
    focus_main_window(app);

    if let Some(file_path) = extract_epub_path_from_args(&args) {
        emit_open_file(app, &file_path);
        log::info!("Handled single-instance open request: {}", file_path);
    }
}
