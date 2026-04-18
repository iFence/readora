import { computed, ref, readonly } from 'vue';
import { settingsRepository } from '@/services/settingsRepository.js';
import { listThemes, loadThemeCss } from '@/platform/tauri/themeCommands.js';

const DEFAULT_THEME = 'weread';
const DEFAULT_ACCENT = '#486FA8';
const baseThemeCss = ref('');
const dynamicCss = ref('');
const currentTheme = ref(DEFAULT_THEME);
const currentAccentColor = ref(null);
const availableThemes = ref([]);
const resolvedAccentColor = ref(DEFAULT_ACCENT);
let initialized = false;

function normalizeHexColor(color) {
  if (!color || typeof color !== 'string') {
    return null;
  }

  const normalized = color.trim().toUpperCase();
  const shorthand = /^#([0-9A-F]{3})$/;
  const full = /^#([0-9A-F]{6})$/;

  if (shorthand.test(normalized)) {
    const [, value] = normalized.match(shorthand);
    return `#${value.split('').map(char => `${char}${char}`).join('')}`;
  }

  if (full.test(normalized)) {
    return normalized;
  }

  return null;
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }

  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function adjustChannel(channel, amount) {
  return Math.max(0, Math.min(255, Math.round(channel + amount)));
}

function shadeColor(color, amount) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }

  return `#${[rgb.r, rgb.g, rgb.b]
    .map(channel => adjustChannel(channel, amount).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function getContrastColor(color) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return '#FFFFFF';
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#1F2937' : '#FFFFFF';
}

function extractCssVar(cssText, variableName, fallback) {
  const pattern = new RegExp(`${variableName}\\s*:\\s*([^;]+);`);
  const match = cssText.match(pattern);
  return match?.[1]?.trim() || fallback;
}

function buildAccentOverrideCss(accentColor) {
  const normalized = normalizeHexColor(accentColor);
  if (!normalized) {
    return '';
  }

  const rgb = hexToRgb(normalized);
  const hover = shadeColor(normalized, -16);
  const pressed = shadeColor(normalized, -32);
  const contrast = getContrastColor(normalized);

  return `
:root {
    --accent: ${normalized};
    --accent-hover: ${hover};
    --accent-pressed: ${pressed};
    --accent-soft: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16);
    --accent-contrast: ${contrast};
}
`;
}

function refreshResolvedAccentColor() {
  resolvedAccentColor.value = normalizeHexColor(currentAccentColor.value)
    || normalizeHexColor(extractCssVar(baseThemeCss.value, '--accent', DEFAULT_ACCENT))
    || DEFAULT_ACCENT;
}

function rebuildDynamicCss() {
  dynamicCss.value = `${baseThemeCss.value}\n${buildAccentOverrideCss(currentAccentColor.value)}`;
  refreshResolvedAccentColor();
}

async function refreshThemeList() {
  availableThemes.value = await listThemes();
  return availableThemes.value;
}

async function applyTheme(themeName = DEFAULT_THEME) {
  currentTheme.value = themeName;
  baseThemeCss.value = await loadThemeCss(themeName);
  rebuildDynamicCss();
  await settingsRepository.setCurrentTheme(themeName);
  return dynamicCss.value;
}

async function applyAccentColor(color) {
  currentAccentColor.value = normalizeHexColor(color);
  rebuildDynamicCss();
  await settingsRepository.setCurrentAccentColor(currentAccentColor.value);
  return currentAccentColor.value;
}

async function resetAccentColor() {
  currentAccentColor.value = null;
  rebuildDynamicCss();
  await settingsRepository.setCurrentAccentColor(null);
  return resolvedAccentColor.value;
}

async function initializeTheme() {
  if (initialized) {
    return;
  }

  const [storedTheme, storedAccentColor] = await Promise.all([
    settingsRepository.getCurrentTheme(),
    settingsRepository.getCurrentAccentColor(),
  ]);

  if (storedTheme) {
    currentTheme.value = storedTheme;
  }

  currentAccentColor.value = normalizeHexColor(storedAccentColor);

  await refreshThemeList();
  await applyTheme(currentTheme.value);
  initialized = true;
}

export function useThemeService() {
  return {
    dynamicCss: readonly(dynamicCss),
    currentTheme,
    currentAccentColor,
    resolvedAccentColor: readonly(resolvedAccentColor),
    availableThemes: readonly(availableThemes),
    initializeTheme,
    applyTheme,
    applyAccentColor,
    resetAccentColor,
    refreshThemeList,
    hasAccentOverride: computed(() => currentAccentColor.value != null),
  };
}
