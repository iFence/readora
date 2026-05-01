import { settingsRepository } from '@/services/settingsRepository.js';
import {
  builtInPluginIds,
  pluginCapabilities,
} from '@/services/pluginRegistry.js';
import {
  findEnabledPluginByCapability,
  listPlugins,
  savePluginConfig,
} from '@/services/pluginService.js';

const STORE_VERSION = 1;
export const READER_ASSISTANT_PLUGIN_ID = builtInPluginIds.readerAssistantAi;
export const llmProtocols = {
  openai: 'openai',
  anthropic: 'anthropic',
};

export const authHeaders = {
  authorization: 'authorization',
  apiKey: 'api-key',
  xApiKey: 'x-api-key',
};

export const DEFAULT_READING_SKILL_ID = 'readora.skill.default-reading-assistant';

const DEFAULT_READING_SKILL = {
  id: DEFAULT_READING_SKILL_ID,
  name: '默认读书助手',
  description: '基于当前章节回答问题，保持简洁、结构化。',
  systemPrompt: 'You are a reading assistant for an EPUB reader. Answer based only on the supplied book context. Return concise, structured Chinese unless the user asks for another language.',
  enabled: true,
};

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}.${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

function nowIsoString() {
  return new Date().toISOString();
}

function normalizeProtocol(value) {
  return value === llmProtocols.anthropic ? llmProtocols.anthropic : llmProtocols.openai;
}

function normalizeAuthHeader(value) {
  if (value === authHeaders.apiKey || value === authHeaders.xApiKey) {
    return value;
  }

  return authHeaders.authorization;
}

function normalizeTemperature(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0.2;
}

function normalizeModelProvider(provider = {}) {
  const now = nowIsoString();
  const id = String(provider.id || '').trim() || createId('readora.model');
  const protocol = normalizeProtocol(provider.protocol);
  return {
    id,
    name: String(provider.name || provider.model || '未命名模型').trim(),
    protocol,
    accessMode: String(provider.accessMode || 'custom').trim(),
    baseUrl: String(provider.baseUrl || provider.endpoint || '').trim(),
    apiKey: String(provider.apiKey || '').trim(),
    authHeader: normalizeAuthHeader(provider.authHeader),
    model: String(provider.model || '').trim(),
    temperature: normalizeTemperature(provider.temperature),
    enabled: provider.enabled !== false,
    createdAt: provider.createdAt || now,
    updatedAt: provider.updatedAt || now,
  };
}

function normalizeReadingSkill(skill = {}) {
  const now = nowIsoString();
  const id = String(skill.id || '').trim() || createId('readora.skill');
  return {
    id,
    name: String(skill.name || '未命名 Skill').trim(),
    description: String(skill.description || '').trim(),
    systemPrompt: String(skill.systemPrompt || skill.prompt || '').trim(),
    enabled: skill.enabled !== false,
    createdAt: skill.createdAt || now,
    updatedAt: skill.updatedAt || now,
  };
}

function normalizeAiSettings(store = {}) {
  const modelProviders = Array.isArray(store.modelProviders)
    ? store.modelProviders.map(normalizeModelProvider)
    : [];
  const readingSkills = Array.isArray(store.readingSkills)
    ? store.readingSkills.map(normalizeReadingSkill)
    : [];

  if (!readingSkills.length) {
    readingSkills.push(normalizeReadingSkill(DEFAULT_READING_SKILL));
  }
  if (!readingSkills.some(skill => skill.enabled)) {
    const defaultSkill = readingSkills.find(skill => skill.id === DEFAULT_READING_SKILL_ID) || readingSkills[0];
    defaultSkill.enabled = true;
  }

  const activeModelProviderId = modelProviders.some(provider => provider.id === store.activeModelProviderId && provider.enabled)
    ? store.activeModelProviderId
    : modelProviders.find(provider => provider.enabled)?.id || modelProviders[0]?.id || '';
  const activeReadingSkillId = readingSkills.some(skill => skill.id === store.activeReadingSkillId && skill.enabled)
    ? store.activeReadingSkillId
    : readingSkills.find(skill => skill.enabled)?.id || readingSkills[0]?.id || DEFAULT_READING_SKILL_ID;

  return {
    version: STORE_VERSION,
    modelProviders,
    activeModelProviderId,
    readingSkills,
    activeReadingSkillId,
  };
}

function migrateLegacyPluginsToAiSettings(pluginStore = {}) {
  const installed = Array.isArray(pluginStore.installed) ? pluginStore.installed : [];
  const legacyProviders = installed
    .filter(record => record?.manifest?.type === 'llm-provider' || record?.id === 'readora.llm.openai-compatible')
    .map(record => normalizeModelProvider({
      id: `legacy.${record.id}`,
      name: record?.manifest?.name || 'LLM Provider',
      ...(record.config || {}),
      enabled: record.enabled !== false,
      createdAt: record.installedAt,
      updatedAt: record.updatedAt,
    }));

  return normalizeAiSettings({
    modelProviders: legacyProviders,
    activeModelProviderId: legacyProviders.find(provider => provider.enabled)?.id || legacyProviders[0]?.id || '',
    readingSkills: [DEFAULT_READING_SKILL],
    activeReadingSkillId: DEFAULT_READING_SKILL_ID,
  });
}

function hasAiSettingsConfig(config) {
  return Boolean(
    config
    && typeof config === 'object'
    && (
      Array.isArray(config.modelProviders)
      || Array.isArray(config.readingSkills)
      || config.activeModelProviderId
      || config.activeReadingSkillId
    )
  );
}

async function getInstalledReaderAssistantPlugin() {
  const { installed } = await listPlugins();
  return installed.find(plugin => plugin.id === READER_ASSISTANT_PLUGIN_ID) || null;
}

async function loadAiSettings() {
  const plugin = await getInstalledReaderAssistantPlugin();
  if (plugin && hasAiSettingsConfig(plugin.config)) {
    return normalizeAiSettings(plugin.config);
  }

  const stored = await settingsRepository.getAiSettings();
  if (stored && typeof stored === 'object') {
    const normalized = normalizeAiSettings(stored);
    if (plugin) {
      await savePluginConfig(READER_ASSISTANT_PLUGIN_ID, normalized);
    }
    return normalized;
  }

  const migrated = migrateLegacyPluginsToAiSettings(await settingsRepository.getPlugins());
  if (plugin) {
    await savePluginConfig(READER_ASSISTANT_PLUGIN_ID, migrated);
  } else {
    await settingsRepository.setAiSettings(migrated);
  }
  return migrated;
}

async function saveAiSettings(settings) {
  const normalized = normalizeAiSettings(settings);
  const plugin = await getInstalledReaderAssistantPlugin();
  if (plugin) {
    await savePluginConfig(READER_ASSISTANT_PLUGIN_ID, normalized);
  } else {
    await settingsRepository.setAiSettings(normalized);
  }
  return normalized;
}

export async function getEnabledReaderAssistantPlugin() {
  return findEnabledPluginByCapability(pluginCapabilities.readerAssistant);
}

export async function isReaderAssistantPluginEnabled() {
  return Boolean(await getEnabledReaderAssistantPlugin());
}

export async function getAiSettings() {
  return loadAiSettings();
}

export async function listModelProviders() {
  return (await loadAiSettings()).modelProviders;
}

export async function getActiveModelProvider() {
  if (!await isReaderAssistantPluginEnabled()) {
    return null;
  }

  const settings = await loadAiSettings();
  return settings.modelProviders.find(provider => provider.id === settings.activeModelProviderId && provider.enabled) || null;
}

export async function saveModelProvider(provider) {
  const settings = await loadAiSettings();
  const normalized = normalizeModelProvider({
    ...provider,
    updatedAt: nowIsoString(),
  });
  const index = settings.modelProviders.findIndex(item => item.id === normalized.id);
  if (index >= 0) {
    normalized.createdAt = settings.modelProviders[index].createdAt;
    settings.modelProviders.splice(index, 1, normalized);
  } else {
    settings.modelProviders.push(normalized);
  }

  if (!settings.activeModelProviderId || settings.activeModelProviderId === normalized.id) {
    settings.activeModelProviderId = normalized.id;
  }

  return saveAiSettings(settings);
}

export async function deleteModelProvider(providerId) {
  const settings = await loadAiSettings();
  settings.modelProviders = settings.modelProviders.filter(provider => provider.id !== providerId);
  if (settings.activeModelProviderId === providerId) {
    settings.activeModelProviderId = settings.modelProviders.find(provider => provider.enabled)?.id || settings.modelProviders[0]?.id || '';
  }

  return saveAiSettings(settings);
}

export async function setActiveModelProvider(providerId) {
  const settings = await loadAiSettings();
  const provider = settings.modelProviders.find(item => item.id === providerId);
  if (!provider) {
    throw new Error('模型配置不存在。');
  }

  if (!provider.enabled) {
    throw new Error('不能启用已停用的模型配置。');
  }

  settings.activeModelProviderId = providerId;
  return saveAiSettings(settings);
}

export async function listReadingSkills() {
  return (await loadAiSettings()).readingSkills;
}

export async function getActiveReadingSkill() {
  const settings = await loadAiSettings();
  return settings.readingSkills.find(skill => skill.id === settings.activeReadingSkillId && skill.enabled)
    || settings.readingSkills.find(skill => skill.enabled)
    || normalizeReadingSkill(DEFAULT_READING_SKILL);
}

export async function getReadingSkill(skillId) {
  const settings = await loadAiSettings();
  return settings.readingSkills.find(skill => skill.id === skillId && skill.enabled)
    || getActiveReadingSkill();
}

export async function saveReadingSkill(skill) {
  const settings = await loadAiSettings();
  const normalized = normalizeReadingSkill({
    ...skill,
    updatedAt: nowIsoString(),
  });
  const index = settings.readingSkills.findIndex(item => item.id === normalized.id);
  if (index >= 0) {
    normalized.createdAt = settings.readingSkills[index].createdAt;
    settings.readingSkills.splice(index, 1, normalized);
  } else {
    settings.readingSkills.push(normalized);
  }

  if (!settings.activeReadingSkillId || settings.activeReadingSkillId === normalized.id) {
    settings.activeReadingSkillId = normalized.id;
  }

  return saveAiSettings(settings);
}

export async function deleteReadingSkill(skillId) {
  const settings = await loadAiSettings();
  settings.readingSkills = settings.readingSkills.filter(skill => skill.id !== skillId);
  if (!settings.readingSkills.length) {
    settings.readingSkills.push(normalizeReadingSkill(DEFAULT_READING_SKILL));
  }

  if (settings.activeReadingSkillId === skillId) {
    settings.activeReadingSkillId = settings.readingSkills.find(skill => skill.enabled)?.id || settings.readingSkills[0]?.id || DEFAULT_READING_SKILL_ID;
  }

  return saveAiSettings(settings);
}

export async function setActiveReadingSkill(skillId) {
  const settings = await loadAiSettings();
  const skill = settings.readingSkills.find(item => item.id === skillId);
  if (!skill) {
    throw new Error('读书 Skill 不存在。');
  }

  if (!skill.enabled) {
    throw new Error('不能启用已停用的读书 Skill。');
  }

  settings.activeReadingSkillId = skillId;
  return saveAiSettings(settings);
}
