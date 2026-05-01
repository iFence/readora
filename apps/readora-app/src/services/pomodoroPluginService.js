import {
  builtInPluginIds,
  pluginCapabilities,
} from '@/services/pluginRegistry.js';
import {
  findEnabledPluginByCapability,
  listPlugins,
  savePluginConfig,
} from '@/services/pluginService.js';

export const POMODORO_PLUGIN_ID = builtInPluginIds.readerPomodoro;

const DEFAULT_POMODORO_CONFIG = {
  focusMinutes: 25,
  breakMinutes: 5,
};

function normalizeMinutes(value, fallback) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(180, Math.max(1, Math.round(numberValue)));
}

export function normalizePomodoroConfig(config = {}) {
  return {
    focusMinutes: normalizeMinutes(config.focusMinutes, DEFAULT_POMODORO_CONFIG.focusMinutes),
    breakMinutes: normalizeMinutes(config.breakMinutes, DEFAULT_POMODORO_CONFIG.breakMinutes),
  };
}

async function getInstalledPomodoroPlugin() {
  const { installed } = await listPlugins();
  return installed.find(plugin => plugin.id === POMODORO_PLUGIN_ID) || null;
}

export async function getEnabledPomodoroPlugin() {
  return findEnabledPluginByCapability(pluginCapabilities.readerPomodoro);
}

export async function isPomodoroPluginEnabled() {
  return Boolean(await getEnabledPomodoroPlugin());
}

export async function loadPomodoroConfig() {
  const plugin = await getInstalledPomodoroPlugin();
  return normalizePomodoroConfig(plugin?.config);
}

export async function savePomodoroConfig(config) {
  const normalized = normalizePomodoroConfig(config);
  const plugin = await getInstalledPomodoroPlugin();
  if (!plugin) {
    throw new Error('阅读番茄钟插件尚未安装。');
  }

  await savePluginConfig(POMODORO_PLUGIN_ID, normalized);
  return normalized;
}
