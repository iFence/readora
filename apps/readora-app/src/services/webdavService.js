import { settingsRepository } from '@/services/settingsRepository.js';
import { WebDavClient } from '@/services/webdavClient.js';

function normalizeWebDavConfig(config = {}) {
  return {
    url: config.url || '',
    username: config.username || '',
    password: config.password || '',
  };
}

export async function loadWebDavConfig() {
  return normalizeWebDavConfig(await settingsRepository.getWebDavConfig());
}

export async function saveWebDavConfig(config) {
  const normalizedConfig = normalizeWebDavConfig(config);
  await settingsRepository.setWebDavConfig(normalizedConfig);
  return normalizedConfig;
}

export function createWebDavClient(config) {
  return new WebDavClient(normalizeWebDavConfig(config));
}

export async function createConfiguredWebDavClient() {
  return createWebDavClient(await loadWebDavConfig());
}

export async function testWebDavConnection(config) {
  const client = createWebDavClient(config);
  return client.testConnection();
}
