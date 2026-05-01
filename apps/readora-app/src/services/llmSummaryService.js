import { sendHttpRequest } from '@/platform/tauri/httpBridge.js';
import {
  getActiveModelProvider,
  getReadingSkill,
} from '@/services/aiSettingsService.js';

function normalizeLlmConfig(config = {}) {
  const endpoint = String(config.baseUrl || config.endpoint || '').trim();
  return {
    endpoint,
    accessMode: String(config.accessMode || '').trim(),
    protocol: String(config.protocol || 'openai').trim(),
    apiKey: String(config.apiKey || '').trim(),
    authHeader: String(config.authHeader || '').trim(),
    model: String(config.model || '').trim(),
    temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.2,
  };
}

function normalizeBaseEndpoint(endpoint, { accessMode, protocol }) {
  if (endpoint) {
    return endpoint;
  }

  if (accessMode === 'mimo-payg') {
    return protocol === 'anthropic'
      ? 'https://api.xiaomimimo.com/anthropic'
      : 'https://api.xiaomimimo.com/v1';
  }

  if (accessMode === 'mimo-token-plan') {
    return protocol === 'anthropic'
      ? 'https://token-plan-cn.xiaomimimo.com/anthropic'
      : 'https://token-plan-cn.xiaomimimo.com/v1';
  }

  return endpoint;
}

function resolveOpenAiEndpoint(endpoint) {
  if (!endpoint) {
    return '';
  }

  const url = new URL(endpoint);
  const normalizedPath = url.pathname.replace(/\/+$/, '');
  if (normalizedPath.endsWith('/chat/completions')) {
    return url.toString();
  }

  url.pathname = `${normalizedPath || ''}/chat/completions`;
  return url.toString();
}

function resolveAnthropicEndpoint(endpoint) {
  if (!endpoint) {
    return '';
  }

  const url = new URL(endpoint);
  const normalizedPath = url.pathname.replace(/\/+$/, '');
  if (normalizedPath.endsWith('/messages')) {
    return url.toString();
  }

  if (normalizedPath.endsWith('/v1')) {
    url.pathname = `${normalizedPath}/messages`;
    return url.toString();
  }

  url.pathname = `${normalizedPath || ''}/v1/messages`;
  return url.toString();
}

function resolveEndpoint(config) {
  const endpoint = normalizeBaseEndpoint(config.endpoint, config);
  return config.protocol === 'anthropic'
    ? resolveAnthropicEndpoint(endpoint)
    : resolveOpenAiEndpoint(endpoint);
}

function resolveAuthHeader(config) {
  if (config.authHeader) {
    return config.authHeader;
  }

  try {
    const host = new URL(config.endpoint).hostname;
    if (host.includes('xiaomimimo.com')) {
      return config.protocol === 'anthropic' ? 'x-api-key' : 'api-key';
    }
  } catch {
    return 'authorization';
  }

  return 'authorization';
}

function buildHeaders(config, protocol) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (protocol === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
  }

  const authHeader = resolveAuthHeader(config);
  if (authHeader === 'api-key') {
    headers['api-key'] = config.apiKey;
  } else if (authHeader === 'x-api-key') {
    headers['x-api-key'] = config.apiKey;
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return headers;
}

function getMessageContent(responseJson) {
  const firstChoice = responseJson?.choices?.[0];
  const anthropicContent = Array.isArray(responseJson?.content)
    ? responseJson.content
      .map(item => (typeof item === 'string' ? item : item?.text || ''))
      .join('')
    : '';
  return firstChoice?.message?.content || firstChoice?.text || anthropicContent || '';
}

function parseSseResponse(responseText) {
  return responseText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .filter(line => line && line !== '[DONE]')
    .map(line => JSON.parse(line))
    .map(chunk => (
      chunk?.choices?.[0]?.delta?.content
      || chunk?.choices?.[0]?.message?.content
      || chunk?.delta?.text
      || chunk?.content_block?.text
      || ''
    ))
    .join('');
}

function createAssistantPrompt({ title, author, content, prompt, contextLabel }) {
  return [
    `Title: ${title || 'Unknown'}`,
    `Author: ${author || 'Unknown'}`,
    `Context: ${contextLabel || 'Book excerpt'}`,
    `User request: ${prompt || 'Summarize this context.'}`,
    '',
    'Book context:',
    content || '',
  ].join('\n');
}

function resolveSystemPrompt(skill) {
  return String(skill?.systemPrompt || '').trim()
    || 'You are a reading assistant for an EPUB reader. Answer based only on the supplied book context. Return concise, structured Chinese unless the user asks for another language.';
}

function buildOpenAiBody(config, assistantPrompt, systemPrompt) {
  return {
    model: config.model,
    temperature: config.temperature,
    stream: false,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: assistantPrompt,
      },
    ],
  };
}

function buildAnthropicBody(config, assistantPrompt, systemPrompt) {
  return {
    model: config.model,
    max_tokens: 2048,
    temperature: config.temperature,
    stream: false,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: assistantPrompt,
          },
        ],
      },
    ],
  };
}

function buildRequestBody(config, assistantPrompt, systemPrompt) {
  return config.protocol === 'anthropic'
    ? buildAnthropicBody(config, assistantPrompt, systemPrompt)
    : buildOpenAiBody(config, assistantPrompt, systemPrompt);
}

async function readJsonResponse(response) {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(`LLM response was empty with status ${response.status}.`);
  }

  if (responseText.trimStart().startsWith('data:')) {
    return {
      choices: [
        {
          message: {
            content: parseSseResponse(responseText),
          },
        },
      ],
    };
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`LLM response was not valid JSON: ${responseText.slice(0, 240)}`);
  }
}

export async function getConfiguredBookSummaryPlugin() {
  return getActiveModelProvider();
}

export async function askBookAssistant({ title, author, content, prompt, contextLabel, skillId }) {
  const provider = await getActiveModelProvider();
  if (!provider) {
    throw new Error('请先在插件设置中安装并启用 AI 阅读助手插件，然后配置当前模型。');
  }

  const config = normalizeLlmConfig(provider);
  if (!config.apiKey || !config.model) {
    throw new Error('当前模型配置不完整，请检查 API Key 和模型名称。');
  }

  const endpoint = resolveEndpoint(config);
  if (!endpoint) {
    throw new Error('当前模型配置缺少 Base URL / API Endpoint。');
  }

  const skill = await getReadingSkill(skillId);
  const systemPrompt = resolveSystemPrompt(skill);
  const assistantPrompt = createAssistantPrompt({ title, author, content, prompt, contextLabel });
  const response = await sendHttpRequest(endpoint, {
    method: 'POST',
    headers: buildHeaders(config, config.protocol),
    body: JSON.stringify(buildRequestBody(config, assistantPrompt, systemPrompt)),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`LLM request failed with status ${response.status} at ${endpoint}${errorText ? `: ${errorText.slice(0, 240)}` : ''}.`);
  }

  const responseJson = await readJsonResponse(response);
  const summary = getMessageContent(responseJson).trim();
  if (!summary) {
    throw new Error('LLM response did not include summary content.');
  }

  return summary;
}

export const summarizeBookContent = askBookAssistant;
