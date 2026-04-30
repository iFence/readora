import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function getUpdateState() {
  return invoke('get_update_state');
}

export function checkForUpdates() {
  return invoke('check_for_updates');
}

export function installUpdate() {
  return invoke('install_update');
}

export function onUpdateStatus(handler) {
  return listen('update-status', handler);
}
