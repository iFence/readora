import { fetch } from '@tauri-apps/plugin-http';

export function sendHttpRequest(url, options = {}) {
  return fetch(url, options);
}
