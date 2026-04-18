import { computed, readonly, watchEffect } from 'vue';
import { useViewport } from '@/composables/useViewport.js';
import { supportsWindowChrome } from '@/platform/tauri/capabilities.js';

const { isCompactShell, safeViewportHeight } = useViewport();

const hasDesktopWindowChrome = computed(() => supportsWindowChrome() && !isCompactShell.value);
const topOffset = computed(() => (hasDesktopWindowChrome.value ? 26 : 0));
const bottomNavHeight = computed(() => (isCompactShell.value ? 72 : 0));
const compactNavMode = computed(() => (isCompactShell.value ? 'bottom' : 'sidebar'));

let initialized = false;

function syncDocumentShellState() {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.dataset.windowChrome = hasDesktopWindowChrome.value ? 'true' : 'false';
  document.documentElement.dataset.windowChrome = hasDesktopWindowChrome.value ? 'true' : 'false';
  document.body.dataset.navMode = compactNavMode.value;
  document.documentElement.dataset.navMode = compactNavMode.value;
  document.documentElement.style.setProperty('--app-top-offset', `${topOffset.value}px`);
  document.documentElement.style.setProperty('--app-bottom-nav-height', `${bottomNavHeight.value}px`);
  document.documentElement.style.setProperty('--app-safe-vh', safeViewportHeight.value);
}

export function initializeAppShell() {
  if (initialized) {
    return;
  }

  watchEffect(() => {
    syncDocumentShellState();
  });

  initialized = true;
}

export function useAppShell() {
  return {
    hasDesktopWindowChrome,
    topOffset: readonly(topOffset),
    bottomNavHeight: readonly(bottomNavHeight),
    compactNavMode: readonly(compactNavMode),
    isCompactShell,
  };
}
