import { platform } from '@tauri-apps/plugin-os';

export function getCurrentPlatform() {
  return platform();
}

