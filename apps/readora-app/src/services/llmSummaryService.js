import { sendHttpRequest } from '@/platform/tauri/httpBridge.js';
import { pluginCapabilities } from '@/services/pluginRegistry.js';
import { findEnabledPluginByCapability } from '@/services/pluginService.js';

function normalizeLlmConfig(config = {}) {
  return {
    endpoint: String(config.endpoint || '').trim(),
    apiKey: String(config.apiKey || '').trim(),
    model: String(config.model || '').trim(),
    temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.2,
  };
}

function getMessageContent(responseJson) {
  const firstChoice = responseJson?.choices?.[0];
  return firstChoice?.message?.content || firstChoice?.text || '';
}

export async function getConfiguredBookSummaryPlugin() {
  return findEnabledPluginByCapability(pluginCapabilities.bookSummary);
}

export async function summarizeBookContent({ title, author, content }) {
  const plugin = await getConfiguredBookSummaryPlugin();
  if (!plugin) {
    throw new Error('No enabled book summary plugin is configured.');
  }

  const config = normalizeLlmConfig(plugin.config);
  if (!config.endpoint || !config.apiKey || !config.model) {
    throw new Error('LLM plugin configuration is incomplete.');
  }

  const response = await sendHttpRequest(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      messages: [
        {
          role: 'system',
          content: 'You summarize book content for an EPUB reader. Return concise, structured Chinese unless the user content is not Chinese.',
        },
        {
          role: 'user',
          content: [
            `Title: ${title || 'Unknown'}`,
            `Author: ${author || 'Unknown'}`,
            '',
            'Summarize the following book content with key ideas, important arguments, and notable quotes:',
            content || '',
          ].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}.`);
  }

  const responseJson = await response.json();
  const summary = getMessageContent(responseJson).trim();
  if (!summary) {
    throw new Error('LLM response did not include summary content.');
  }

  return summary;
}
