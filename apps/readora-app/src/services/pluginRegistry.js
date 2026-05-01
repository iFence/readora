export const pluginCapabilities = {
  bookSummary: 'book.summary',
  readerAssistant: 'reader.assistant',
  librarySync: 'library.sync',
  readerPomodoro: 'reader.pomodoro',
};

export const pluginTypes = {
  llmProvider: 'llm-provider',
  readerAssistant: 'reader-assistant',
  syncProvider: 'sync-provider',
  readerTool: 'reader-tool',
};

export const builtInPluginIds = {
  readerAssistantAi: 'readora.reader-assistant-ai',
  webDavSync: 'readora.sync.webdav',
  readerPomodoro: 'readora.reader-pomodoro',
};

const builtInPlugins = [
  {
    id: builtInPluginIds.readerAssistantAi,
    name: 'AI 阅读助手',
    version: '0.1.0',
    type: pluginTypes.readerAssistant,
    author: 'Readora',
    description: '配置多组兼容 OpenAI / Anthropic 协议的模型，并为阅读问答配置 Skill。',
    capabilities: [pluginCapabilities.readerAssistant, pluginCapabilities.bookSummary],
    entry: {
      kind: 'builtin',
      adapter: 'reader-assistant-ai',
    },
    configSchema: {},
  },
  {
    id: builtInPluginIds.webDavSync,
    name: 'WebDav',
    version: '0.1.0',
    type: pluginTypes.syncProvider,
    author: 'Readora',
    description: '通过 WebDav 同步书籍、阅读进度、标注和书签。',
    capabilities: [pluginCapabilities.librarySync],
    entry: {
      kind: 'builtin',
      adapter: 'webdav-sync',
    },
    configSchema: {},
  },
  {
    id: builtInPluginIds.readerPomodoro,
    name: '阅读番茄钟',
    version: '0.1.0',
    type: pluginTypes.readerTool,
    author: 'Readora',
    description: '在阅读器中提供专注阅读番茄钟，可配置专注和休息时长。',
    capabilities: [pluginCapabilities.readerPomodoro],
    entry: {
      kind: 'builtin',
      adapter: 'reader-pomodoro',
    },
    configSchema: {},
  },
];

const builtInPluginMap = new Map(builtInPlugins.map(plugin => [plugin.id, plugin]));

export function listBuiltInPluginManifests() {
  return builtInPlugins.map(plugin => structuredClone(plugin));
}

export function getBuiltInPluginManifest(pluginId) {
  const manifest = builtInPluginMap.get(pluginId);
  return manifest ? structuredClone(manifest) : null;
}

export function isBuiltInPlugin(pluginId) {
  return builtInPluginMap.has(pluginId);
}
