import { settingsRepository } from '@/services/settingsRepository.js';
import {
  getBuiltInPluginManifest,
  isBuiltInPlugin,
  listBuiltInPluginManifests,
} from '@/services/pluginRegistry.js';

const STORE_VERSION = 1;

function nowIsoString() {
  return new Date().toISOString();
}

function normalizePluginStore(store = {}) {
  return {
    version: STORE_VERSION,
    installed: Array.isArray(store.installed) ? store.installed : [],
  };
}

function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Plugin manifest must be a JSON object.');
  }

  const id = String(manifest.id || '').trim();
  const name = String(manifest.name || '').trim();
  const version = String(manifest.version || '').trim();
  const type = String(manifest.type || '').trim();
  const entry = manifest.entry && typeof manifest.entry === 'object' ? manifest.entry : null;
  const capabilities = Array.isArray(manifest.capabilities)
    ? manifest.capabilities.map(item => String(item).trim()).filter(Boolean)
    : [];

  if (!id || !/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/i.test(id)) {
    throw new Error('Plugin id must use letters, numbers, dots, or hyphens.');
  }

  if (!name || !version || !type) {
    throw new Error('Plugin manifest must include id, name, version, and type.');
  }

  if (!entry?.kind) {
    throw new Error('Plugin manifest must include entry.kind.');
  }

  return {
    id,
    name,
    version,
    type,
    author: String(manifest.author || '').trim(),
    description: String(manifest.description || '').trim(),
    capabilities,
    entry: { ...entry },
    configSchema: manifest.configSchema && typeof manifest.configSchema === 'object'
      ? { ...manifest.configSchema }
      : {},
  };
}

function createPluginRecord(manifest, existingRecord = {}) {
  const existingConfig = existingRecord.config && typeof existingRecord.config === 'object'
    ? existingRecord.config
    : {};

  return {
    id: manifest.id,
    manifest,
    enabled: Boolean(existingRecord.enabled),
    config: existingConfig,
    installedAt: existingRecord.installedAt || nowIsoString(),
    updatedAt: nowIsoString(),
  };
}

async function loadPluginStore() {
  return normalizePluginStore(await settingsRepository.getPlugins());
}

async function savePluginStore(store) {
  const normalizedStore = normalizePluginStore(store);
  await settingsRepository.setPlugins(normalizedStore);
  return normalizedStore;
}

export async function listPlugins() {
  const store = await loadPluginStore();
  const installed = store.installed.map(record => {
    if (isBuiltInPlugin(record.id)) {
      const manifest = getBuiltInPluginManifest(record.id);
      return createPluginRecord(manifest, record);
    }

    return createPluginRecord(normalizeManifest(record.manifest), record);
  });
  const installedIds = new Set(installed.map(record => record.id));
  const available = listBuiltInPluginManifests().filter(plugin => !installedIds.has(plugin.id));

  return { installed, available };
}

export async function installPluginManifest(manifestInput) {
  const manifest = normalizeManifest(manifestInput);
  const store = await loadPluginStore();
  const existingIndex = store.installed.findIndex(record => record.id === manifest.id);
  const record = createPluginRecord(
    isBuiltInPlugin(manifest.id) ? getBuiltInPluginManifest(manifest.id) : manifest,
    existingIndex >= 0 ? store.installed[existingIndex] : {},
  );

  if (existingIndex >= 0) {
    store.installed.splice(existingIndex, 1, record);
  } else {
    store.installed.push(record);
  }

  await savePluginStore(store);
  return record;
}

export async function installBuiltInPlugin(pluginId) {
  const manifest = getBuiltInPluginManifest(pluginId);
  if (!manifest) {
    throw new Error('Built-in plugin does not exist.');
  }

  return installPluginManifest(manifest);
}

export async function uninstallPlugin(pluginId) {
  const store = await loadPluginStore();
  store.installed = store.installed.filter(record => record.id !== pluginId);
  await savePluginStore(store);
  return true;
}

export async function setPluginEnabled(pluginId, enabled) {
  const store = await loadPluginStore();
  const record = store.installed.find(item => item.id === pluginId);
  if (!record) {
    throw new Error('Plugin is not installed.');
  }

  record.enabled = Boolean(enabled);
  record.updatedAt = nowIsoString();
  await savePluginStore(store);
  return record;
}

export async function savePluginConfig(pluginId, config) {
  const store = await loadPluginStore();
  const record = store.installed.find(item => item.id === pluginId);
  if (!record) {
    throw new Error('Plugin is not installed.');
  }

  record.config = config && typeof config === 'object' ? { ...config } : {};
  record.updatedAt = nowIsoString();
  await savePluginStore(store);
  return record;
}

export async function findEnabledPluginByCapability(capability) {
  const { installed } = await listPlugins();
  return installed.find(record => (
    record.enabled && record.manifest.capabilities.includes(capability)
  )) || null;
}

export function parsePluginManifestJson(source) {
  return normalizeManifest(JSON.parse(source));
}
