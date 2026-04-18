import { invoke } from '@tauri-apps/api/core';

export function listThemes() {
  return invoke('get_theme_list');
}

export function loadThemeCss(themeName) {
  return invoke('load_theme_css', { themeName });
}

