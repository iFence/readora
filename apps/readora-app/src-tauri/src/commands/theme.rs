use std::{fs, path::{Path, PathBuf}, sync::Arc};

use tauri::{AppHandle, Manager, State};

use crate::state::ThemeManager;

fn copy_theme_files(source_dir: &Path, target_dir: &Path) -> Result<bool, String> {
    if !source_dir.exists() || !source_dir.is_dir() {
        return Ok(false);
    }

    let mut copied = false;
    for entry in fs::read_dir(source_dir)
        .map_err(|e| format!("Failed to read theme source directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read source entry: {}", e))?;
        let path = entry.path();

        if !path.is_file() || !path.extension().is_some_and(|ext| ext == "css") {
            continue;
        }

        let Some(file_name) = path.file_name() else {
            continue;
        };

        let target_path = target_dir.join(file_name);
        let should_copy = if !target_path.exists() {
            true
        } else {
            fs::read_to_string(&path).ok() != fs::read_to_string(&target_path).ok()
        };

        if should_copy {
            fs::copy(&path, &target_path)
                .map_err(|e| format!("Failed to seed theme file {:?}: {}", target_path, e))?;
        }

        copied = true;
    }

    Ok(copied)
}

fn seed_theme_dir(app: &AppHandle, target_dir: &Path) -> Result<(), String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_theme_dir = resource_dir.join("themes");
        if copy_theme_files(&bundled_theme_dir, target_dir)? {
            return Ok(());
        }
    }

    let dev_theme_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("themes");
    copy_theme_files(&dev_theme_dir, target_dir)?;
    Ok(())
}

fn ensure_theme_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let theme_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?
        .join("themes");

    if !theme_dir.exists() {
        fs::create_dir_all(&theme_dir)
            .map_err(|e| format!("Failed to create theme directory: {}", e))?;
    }

    seed_theme_dir(app, &theme_dir)?;

    Ok(theme_dir)
}

#[tauri::command]
pub fn get_theme_dir(app: AppHandle) -> Result<String, String> {
    Ok(ensure_theme_dir(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn get_theme_list(app: AppHandle) -> Result<Vec<String>, String> {
    let theme_dir = ensure_theme_dir(&app)?;
    let mut theme_names = Vec::new();

    if theme_dir.is_dir() {
        for entry in fs::read_dir(&theme_dir)
            .map_err(|e| format!("Failed to read theme directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();
            if path.is_file() && path.extension().is_some_and(|ext| ext == "css") {
                if let Some(file_name) = path.file_stem() {
                    theme_names.push(file_name.to_string_lossy().into_owned());
                }
            }
        }
    }

    Ok(theme_names)
}

#[tauri::command]
pub async fn load_theme_css(
    app: AppHandle,
    theme_name: String,
    theme_manager: State<'_, Arc<ThemeManager>>,
) -> Result<String, String> {
    load_theme(&app, theme_name, theme_manager.inner().clone()).await
}

pub async fn load_theme(
    app: &AppHandle,
    theme_name: String,
    theme_manager: Arc<ThemeManager>,
) -> Result<String, String> {
    let theme_path = ensure_theme_dir(app)?.join(format!("{}.css", theme_name));

    if !theme_path.exists() {
        return Err(format!("Theme file not found: {:?}", theme_path));
    }

    let css_content =
        fs::read_to_string(&theme_path).map_err(|e| format!("Failed to read theme file: {}", e))?;

    theme_manager.set_current_theme(theme_name);
    log::debug!("themes:{:?}", css_content);
    Ok(css_content)
}
