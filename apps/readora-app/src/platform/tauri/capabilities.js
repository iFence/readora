export function hasTauriRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__);
}

export function supportsWindowLifecycle() {
  return hasTauriRuntime();
}

export function supportsFilePicker() {
  return hasTauriRuntime();
}

export function supportsWindowChrome() {
  if (typeof document !== 'undefined' && document.querySelector('.titlebar')) {
    return true;
  }

  return hasTauriRuntime();
}

export function supportsGlobalShortcuts() {
  return hasTauriRuntime();
}
