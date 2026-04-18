use std::sync::{Arc, Mutex};

#[derive(Default)]
pub struct StartupFilePath(pub Mutex<Option<String>>);

pub struct ThemeManager {
    current_theme_name: Mutex<Option<String>>,
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

