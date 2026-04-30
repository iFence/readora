use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri_plugin_updater::Update;

pub const UPDATE_STATUS_EVENT: &str = "update-status";

#[derive(Default)]
pub struct StartupFilePath(pub Mutex<Option<String>>);

pub struct ThemeManager {
    current_theme_name: Mutex<Option<String>>,
}

pub struct UpdaterState {
    status: Mutex<UpdateStatus>,
    pending_update: Mutex<Option<Update>>,
}

impl ThemeManager {
    pub fn new() -> Self {
        Self {
            current_theme_name: Mutex::new(None),
        }
    }

    pub fn shared() -> Arc<Self> {
        Arc::new(Self::new())
    }

    pub fn set_current_theme(&self, theme_name: String) {
        *self.current_theme_name.lock().unwrap() = Some(theme_name);
    }

    pub fn get_current_theme_name(&self) -> Option<String> {
        self.current_theme_name.lock().unwrap().clone()
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub status: String,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub body: Option<String>,
    pub published_at: Option<String>,
    pub downloaded_bytes: Option<u64>,
    pub content_length: Option<u64>,
    pub error: Option<String>,
}

impl UpdateStatus {
    pub fn idle(current_version: String) -> Self {
        Self {
            status: "idle".to_string(),
            current_version,
            latest_version: None,
            body: None,
            published_at: None,
            downloaded_bytes: None,
            content_length: None,
            error: None,
        }
    }
}

impl UpdaterState {
    pub fn shared() -> Arc<Self> {
        Arc::new(Self {
            status: Mutex::new(UpdateStatus::idle(String::new())),
            pending_update: Mutex::new(None),
        })
    }

    pub fn status(&self) -> UpdateStatus {
        self.status.lock().unwrap().clone()
    }

    pub fn set_status(&self, status: UpdateStatus) {
        *self.status.lock().unwrap() = status;
    }

    pub fn set_pending_update(&self, update: Option<Update>) {
        *self.pending_update.lock().unwrap() = update;
    }

    pub fn take_pending_update(&self) -> Option<Update> {
        self.pending_update.lock().unwrap().take()
    }
}
