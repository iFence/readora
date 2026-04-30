export const pluginCapabilities = {
  bookSummary: 'book.summary',
};

export const pluginTypes = {
  llmProvider: 'llm-provider',
};

const builtInPlugins = [
  {
    id: 'readora.llm.openai-compatible',
    name: 'LLM Summary',
    version: '0.1.0',
    type: pluginTypes.llmProvider,
    author: 'Readora',
    description: 'Configure an OpenAI-compatible large language model provider for book summaries.',
    capabilities: [pluginCapabilities.bookSummary],
    entry: {
      kind: 'builtin',
      adapter: 'openai-compatible-chat',
    },
    configSchema: {
      endpoint: {
        label: 'API Endpoint',
        type: 'url',
        required: true,
        defaultValue: 'https://api.openai.com/v1/chat/completions',
      },
      apiKey: {
        label: 'API Key',
        type: 'password',
        required: true,
      },
      model: {
        label: 'Model',
        type: 'text',
        required: true,
        defaultValue: 'gpt-4o-mini',
      },
      temperature: {
        label: 'Temperature',
        type: 'number',
        required: false,
        defaultValue: 0.2,
      },
    },
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
