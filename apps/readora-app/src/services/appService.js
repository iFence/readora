import { getAppVersion } from '@/platform/tauri/appBridge.js';

export function fetchAppVersion() {
  return getAppVersion();
}
