import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

export function clearRegisteredShortcuts() {
  return unregisterAll();
}

export function registerShortcut(shortcut, handler) {
  return register(shortcut, handler);
}
