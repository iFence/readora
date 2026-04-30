import { canSyncLibraryAutomatically, syncLibrary } from '@/services/syncService.js';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_SYNC_STARTUP_DELAY_MS = 15 * 1000;
const AUTO_SYNC_VISIBLE_COOLDOWN_MS = 60 * 1000;

let autoSyncTimer = null;
let startupTimer = null;
let isInitialized = false;
let lastAutoSyncAttemptAt = 0;

async function runAutoSync(reason) {
  if (!await canSyncLibraryAutomatically()) {
    return;
  }

  lastAutoSyncAttemptAt = Date.now();
  try {
    await syncLibrary();
  } catch {
    // Auto sync failures are surfaced through persisted sync status and UI listeners.
  }
}

function scheduleInterval() {
  window.clearInterval(autoSyncTimer);
  autoSyncTimer = window.setInterval(() => {
    void runAutoSync('interval');
  }, AUTO_SYNC_INTERVAL_MS);
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return;
  }

  const elapsed = Date.now() - lastAutoSyncAttemptAt;
  if (elapsed < AUTO_SYNC_VISIBLE_COOLDOWN_MS) {
    return;
  }

  void runAutoSync('visible');
}

export function initializeAutoSyncScheduler() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  scheduleInterval();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  startupTimer = window.setTimeout(() => {
    void runAutoSync('startup');
  }, AUTO_SYNC_STARTUP_DELAY_MS);
}

