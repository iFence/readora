import { open } from '@tauri-apps/plugin-dialog';

export function openFileDialog(options) {
  return open(options);
}
