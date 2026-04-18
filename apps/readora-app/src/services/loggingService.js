export function initializeLogging() {
  if (import.meta.env.DEV) {
    return;
  }

  import('@/platform/tauri/logBridge.js')
    .then(({ attachWebviewConsole }) => {
      attachWebviewConsole();
    })
    .catch(() => {});
}
