import { settingsRepository } from '@/services/settingsRepository.js';
import { WebDavClient } from '@/services/webdavClient.js';
import {
  builtInPluginIds,
  pluginCapabilities,
} from '@/services/pluginRegistry.js';
import {
  findEnabledPluginByCapability,
  listPlugins,
  savePluginConfig,
} from '@/services/pluginService.js';

export const WEB_DAV_SYNC_PLUGIN_ID = builtInPluginIds.webDavSync;

function normalizeWebDavConfig(config = {}) {
  return {
    url: config.url || '',
    username: config.username || '',
    password: config.password || '',
  };
}

async function getInstalledWebDavPlugin() {
  const { installed } = await listPlugins();
  return installed.find(plugin => plugin.id === WEB_DAV_SYNC_PLUGIN_ID) || null;
}

export async function getEnabledWebDavPlugin() {
  return findEnabledPluginByCapability(pluginCapabilities.librarySync);
}

export async function isWebDavPluginEnabled() {
  return Boolean(await getEnabledWebDavPlugin());
}

export async function loadWebDavConfig() {
  const plugin = await getInstalledWebDavPlugin();
  if (plugin) {
    const config = normalizeWebDavConfig(plugin.config);
    if (!config.url && !config.username && !config.password) {
      const legacyConfig = normalizeWebDavConfig(await settingsRepository.getWebDavConfig());
      if (legacyConfig.url || legacyConfig.username || legacyConfig.password) {
        await savePluginConfig(WEB_DAV_SYNC_PLUGIN_ID, legacyConfig);
        return legacyConfig;
      }
    }

    return config;
  }

  return normalizeWebDavConfig(await settingsRepository.getWebDavConfig());
}

export async function saveWebDavConfig(config) {
  const normalizedConfig = normalizeWebDavConfig(config);
  const plugin = await getInstalledWebDavPlugin();
  if (plugin) {
    await savePluginConfig(WEB_DAV_SYNC_PLUGIN_ID, normalizedConfig);
  } else {
    await settingsRepository.setWebDavConfig(normalizedConfig);
  }
  return normalizedConfig;
}

export function createWebDavClient(config) {
  return new WebDavClient(normalizeWebDavConfig(config));
}

export async function createConfiguredWebDavClient() {
  if (!await isWebDavPluginEnabled()) {
    throw new Error('请先在插件设置中安装并启用 WebDav 同步插件。');
  }

  return createWebDavClient(await loadWebDavConfig());
}

export async function testWebDavConnection(config) {
  const client = createWebDavClient(config);
  return client.testConnection();
}
