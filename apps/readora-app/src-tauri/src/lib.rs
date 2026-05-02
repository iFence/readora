mod commands;
mod database;
mod desktop;
mod epub_metadata;
mod state;

use std::{env, sync::Arc};

use tauri::Manager;
#[cfg(not(debug_assertions))]
use tauri_plugin_log::{Target, TargetKind};

use crate::commands::data::{
    clear_bookshelf, delete_bookmark, export_sync_snapshot, get_annotations, get_book_by_id,
    get_bookmarks, get_last_sync_at, get_latest_books, get_recent_daily_reading_stats,
    import_sync_snapshot, record_daily_reading_time, replace_annotations, save_book_record,
    save_reading_progress, set_last_sync_at, update_book_metadata, upsert_annotation,
    upsert_bookmark, delete_annotation,
};
use crate::commands::system::{exit_app, open_external_url};
use crate::commands::startup::{capture_startup_file_path, get_startup_file_path};
use crate::commands::theme::{get_theme_dir, get_theme_list, load_theme, load_theme_css};
use crate::commands::update::{check_for_updates, get_update_state, install_update};
use crate::database::Database;
use crate::desktop::tray::setup_tray;
use crate::desktop::window::handle_single_instance;
use crate::state::{StartupFilePath, ThemeManager, UpdaterState};

#[cfg(target_os = "macos")]
use crate::desktop::window::{emit_open_file, focus_main_window};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(StartupFilePath::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(ThemeManager::shared())
        .manage(UpdaterState::shared())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            handle_single_instance(app, args);
        }))
        .invoke_handler(tauri::generate_handler![
            get_latest_books,
            get_book_by_id,
            save_book_record,
            update_book_metadata,
            save_reading_progress,
            clear_bookshelf,
            record_daily_reading_time,
            get_recent_daily_reading_stats,
            get_annotations,
            replace_annotations,
            upsert_annotation,
            delete_annotation,
            get_bookmarks,
            upsert_bookmark,
            delete_bookmark,
            export_sync_snapshot,
            import_sync_snapshot,
            get_last_sync_at,
            set_last_sync_at,
            get_theme_dir,
            get_theme_list,
            load_theme_css,
            get_startup_file_path,
            get_update_state,
            check_for_updates,
            install_update,
            open_external_url,
            exit_app
        ])
        .setup(|app| {
            let database = Database::new(&app.handle())?;
            app.manage(database);
            setup_tray(app)?;
            let theme_manager = app.state::<Arc<ThemeManager>>().inner().clone();

            let theme_name = theme_manager
                .get_current_theme_name()
                .unwrap_or("weread".to_string());
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = load_theme(&app_handle, theme_name, theme_manager).await {
                    log::error!("Failed to load initial theme: {}", e);
                }
            });

            let args: Vec<String> = env::args().collect();
            capture_startup_file_path(&args, &app.state::<StartupFilePath>());

            Ok(())
        });

    #[cfg(debug_assertions)]
    let builder = builder;

    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(
        tauri_plugin_log::Builder::new()
            .target(Target::new(TargetKind::Webview))
            .target(Target::new(TargetKind::LogDir {
                file_name: Some("logs".to_string()),
            }))
            .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
            .build(),
    );

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Opened { urls } => {
            focus_main_window(_app_handle);

            let opened_paths = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned())
                .collect::<Vec<_>>();

            if let Some(file_path) =
                crate::commands::startup::extract_epub_path_from_args(&opened_paths)
            {
                emit_open_file(_app_handle, &file_path);
            }
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            focus_main_window(_app_handle);
        }
        _ => {}
    });
}
