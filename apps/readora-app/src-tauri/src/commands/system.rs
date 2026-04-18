use std::process::Command;

use tauri::AppHandle;

fn validate_external_url(url: &str) -> Result<&str, String> {
    let trimmed = url.trim();
    if trimmed.starts_with("https://") || trimmed.starts_with("http://") {
        return Ok(trimmed);
    }

    Err("Only http and https URLs are supported.".to_string())
}

#[cfg(target_os = "windows")]
fn open_external(target: &str) -> Result<(), String> {
    Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", target])
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open external URL: {}", error))
}

#[cfg(target_os = "macos")]
fn open_external(target: &str) -> Result<(), String> {
    Command::new("open")
        .arg(target)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open external URL: {}", error))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_external(target: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(target)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open external URL: {}", error))
}

#[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
fn open_external(_target: &str) -> Result<(), String> {
    Err("Opening external URLs is not supported on this platform.".to_string())
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let validated_url = validate_external_url(&url)?;
    open_external(validated_url)
}
