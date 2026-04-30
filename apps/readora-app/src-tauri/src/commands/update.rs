use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;

use crate::state::{UpdateStatus, UpdaterState, UPDATE_STATUS_EVENT};

fn app_version(app: &AppHandle) -> String {
    app.package_info().version.to_string()
}

fn emit_status(app: &AppHandle, updater: &Arc<UpdaterState>, status: UpdateStatus) -> UpdateStatus {
    updater.set_status(status.clone());
    let _ = app.emit(UPDATE_STATUS_EVENT, &status);
    status
}

fn normalize_current_status(app: &AppHandle, updater: &Arc<UpdaterState>) -> UpdateStatus {
    let current = updater.status();
    if current.current_version.is_empty() {
        let next = UpdateStatus::idle(app_version(app));
        updater.set_status(next.clone());
        return next;
    }

    current
}

#[tauri::command]
pub fn get_update_state(
    app: AppHandle,
    updater: State<'_, Arc<UpdaterState>>,
) -> Result<UpdateStatus, String> {
    Ok(normalize_current_status(&app, updater.inner()))
}

#[tauri::command]
pub async fn check_for_updates(
    app: AppHandle,
    updater: State<'_, Arc<UpdaterState>>,
) -> Result<UpdateStatus, String> {
    let updater = updater.inner().clone();
    let current = normalize_current_status(&app, &updater);

    if matches!(current.status.as_str(), "checking" | "downloading") {
        return Ok(current);
    }

    emit_status(
        &app,
        &updater,
        UpdateStatus {
            status: "checking".to_string(),
            current_version: app_version(&app),
            latest_version: None,
            body: None,
            published_at: None,
            downloaded_bytes: None,
            content_length: None,
            error: None,
        },
    );

    match app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
    {
        Ok(Some(update)) => {
            let status = UpdateStatus {
                status: "available".to_string(),
                current_version: app_version(&app),
                latest_version: Some(update.version.clone()),
                body: update.body.clone(),
                published_at: update.date.as_ref().map(ToString::to_string),
                downloaded_bytes: None,
                content_length: None,
                error: None,
            };
            updater.set_pending_update(Some(update));
            Ok(emit_status(&app, &updater, status))
        }
        Ok(None) => {
            updater.set_pending_update(None);
            Ok(emit_status(
                &app,
                &updater,
                UpdateStatus {
                    status: "up_to_date".to_string(),
                    current_version: app_version(&app),
                    latest_version: None,
                    body: None,
                    published_at: None,
                    downloaded_bytes: None,
                    content_length: None,
                    error: None,
                },
            ))
        }
        Err(error) => {
            updater.set_pending_update(None);
            Ok(emit_status(
                &app,
                &updater,
                UpdateStatus {
                    status: "error".to_string(),
                    current_version: app_version(&app),
                    latest_version: None,
                    body: None,
                    published_at: None,
                    downloaded_bytes: None,
                    content_length: None,
                    error: Some(error.to_string()),
                },
            ))
        }
    }
}

#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    updater: State<'_, Arc<UpdaterState>>,
) -> Result<UpdateStatus, String> {
    let updater = updater.inner().clone();
    let pending = updater
        .take_pending_update()
        .ok_or_else(|| "No update is ready to install.".to_string())?;

    let latest_version = pending.version.clone();
    let published_at = pending.date.as_ref().map(ToString::to_string);
    let body = pending.body.clone();
    let mut downloaded = 0u64;

    emit_status(
        &app,
        &updater,
        UpdateStatus {
            status: "downloading".to_string(),
            current_version: app_version(&app),
            latest_version: Some(latest_version.clone()),
            body: body.clone(),
            published_at: published_at.clone(),
            downloaded_bytes: Some(0),
            content_length: None,
            error: None,
        },
    );

    let app_for_progress = app.clone();
    let updater_for_progress = updater.clone();
    let progress_latest_version = latest_version.clone();
    let progress_published_at = published_at.clone();
    let progress_body = body.clone();

    if let Err(error) = pending
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                emit_status(
                    &app_for_progress,
                    &updater_for_progress,
                    UpdateStatus {
                        status: "downloading".to_string(),
                        current_version: app_version(&app_for_progress),
                        latest_version: Some(progress_latest_version.clone()),
                        body: progress_body.clone(),
                        published_at: progress_published_at.clone(),
                        downloaded_bytes: Some(downloaded),
                        content_length: content_length.map(|value| value as u64),
                        error: None,
                    },
                );
            },
            || {},
        )
        .await
    {
        return Ok(emit_status(
            &app,
            &updater,
            UpdateStatus {
                status: "error".to_string(),
                current_version: app_version(&app),
                latest_version: Some(latest_version),
                body,
                published_at,
                downloaded_bytes: None,
                content_length: None,
                error: Some(error.to_string()),
            },
        ));
    }

    let status = emit_status(
        &app,
        &updater,
        UpdateStatus {
            status: "downloaded".to_string(),
            current_version: app_version(&app),
            latest_version: Some(latest_version),
            body,
            published_at,
            downloaded_bytes: None,
            content_length: None,
            error: None,
        },
    );

    #[cfg(windows)]
    {
        Ok(status)
    }

    #[cfg(not(windows))]
    {
        app.restart();
    }
}
