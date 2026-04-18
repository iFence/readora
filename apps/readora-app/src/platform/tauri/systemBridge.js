import { invoke } from '@tauri-apps/api/core';

export function openExternalUrl(url) {
  return invoke('open_external_url', { url });
}

export function exitApplication() {
  return invoke('exit_app');
}
