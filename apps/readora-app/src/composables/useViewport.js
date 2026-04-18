import { computed, readonly, ref } from 'vue';
import { supportsWindowChrome } from '@/platform/tauri/capabilities.js';

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440);
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 900);
const hasCoarsePointer = ref(false);
const hasHover = ref(true);

let initialized = false;

function updateViewportState() {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
  hasCoarsePointer.value = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
  hasHover.value = Boolean(window.matchMedia?.('(hover: hover)')?.matches);
}

function ensureViewportListeners() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  const handleChange = () => updateViewportState();
  const coarsePointerQuery = window.matchMedia?.('(pointer: coarse)');
  const hoverQuery = window.matchMedia?.('(hover: hover)');

  window.addEventListener('resize', handleChange, { passive: true });
  window.addEventListener('orientationchange', handleChange, { passive: true });
  coarsePointerQuery?.addEventListener?.('change', handleChange);
  hoverQuery?.addEventListener?.('change', handleChange);
  updateViewportState();
  initialized = true;
}

export function useViewport() {
  ensureViewportListeners();

  const hasDesktopRuntime = computed(() => supportsWindowChrome());
  const isPhone = computed(() => !hasDesktopRuntime.value && viewportWidth.value <= 767);
  const isTablet = computed(() => !hasDesktopRuntime.value && viewportWidth.value >= 768 && viewportWidth.value <= 1180);
  const isDesktop = computed(() => hasDesktopRuntime.value || viewportWidth.value > 1180);
  const isTouchLike = computed(() => hasCoarsePointer.value || (!hasDesktopRuntime.value && viewportWidth.value <= 1024));
  const isCompactShell = computed(() => !hasDesktopRuntime.value && viewportWidth.value <= 1024);
  const safeViewportHeight = computed(() => `${viewportHeight.value}px`);

  return {
    viewportWidth: readonly(viewportWidth),
    viewportHeight: readonly(viewportHeight),
    hasDesktopRuntime,
    isPhone,
    isTablet,
    isDesktop,
    isTouchLike,
    hasHover: readonly(hasHover),
    isCompactShell,
    safeViewportHeight,
  };
}
