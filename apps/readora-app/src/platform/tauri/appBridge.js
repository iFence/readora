import { getVersion } from '@tauri-apps/api/app';

export function getAppVersion() {
  return getVersion();
}

