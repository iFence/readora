# Readora Plugin Architecture

Readora plugins are installed from a manifest. Runtime execution is handled by Readora-owned adapters first; third-party manifests can declare metadata and capabilities, but arbitrary plugin JavaScript is not loaded into the reader process.

This keeps plugin installation cross-platform and gives future plugins a consistent boundary:

- manifest: identity, type, capabilities, entry adapter, and optional config schema
- plugin record: installed/enabled state plus plugin-owned config
- app services: capability lookup and adapter execution

## Built-In AI Reading Assistant Plugin

The AI model and reading Skill system is implemented as the built-in `readora.reader-assistant-ai` plugin.

Manifest summary:

```json
{
  "id": "readora.reader-assistant-ai",
  "name": "AI 阅读助手",
  "version": "0.1.0",
  "type": "reader-assistant",
  "author": "Readora",
  "capabilities": ["reader.assistant", "book.summary"],
  "entry": {
    "kind": "builtin",
    "adapter": "reader-assistant-ai"
  }
}
```

Its plugin config stores model providers and reading skills:

```json
{
  "version": 1,
  "activeModelProviderId": "readora.model.example",
  "activeReadingSkillId": "readora.skill.default-reading-assistant",
  "modelProviders": [
    {
      "id": "readora.model.example",
      "name": "OpenAI",
      "protocol": "openai",
      "accessMode": "custom",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "...",
      "authHeader": "authorization",
      "model": "gpt-4o-mini",
      "temperature": 0.2,
      "enabled": true
    }
  ],
  "readingSkills": [
    {
      "id": "readora.skill.default-reading-assistant",
      "name": "默认读书助手",
      "description": "基于当前章节回答问题，保持简洁、结构化。",
      "systemPrompt": "You are a reading assistant...",
      "enabled": true
    }
  ]
}
```

The service migrates earlier standalone AI settings or legacy `llm-provider` plugin records into this built-in plugin config when the plugin is installed.

## Built-In WebDav Sync Plugin

WebDAV sync is implemented as the built-in `readora.sync.webdav` plugin.

Manifest summary:

```json
{
  "id": "readora.sync.webdav",
  "name": "WebDav",
  "version": "0.1.0",
  "type": "sync-provider",
  "author": "Readora",
  "capabilities": ["library.sync"],
  "entry": {
    "kind": "builtin",
    "adapter": "webdav-sync"
  }
}
```

Its plugin config stores the server URL and credentials:

```json
{
  "url": "https://dav.example.com/dav/",
  "username": "user",
  "password": "..."
}
```

The WebDAV service migrates earlier `webdav_settings` values into this plugin config when the plugin is installed. Automatic and manual library sync require the WebDAV sync plugin to be installed, enabled, and fully configured.

## Built-In Reading Pomodoro Plugin

The reading Pomodoro timer is implemented as the built-in `readora.reader-pomodoro` plugin.

Manifest summary:

```json
{
  "id": "readora.reader-pomodoro",
  "name": "阅读番茄钟",
  "version": "0.1.0",
  "type": "reader-tool",
  "author": "Readora",
  "capabilities": ["reader.pomodoro"],
  "entry": {
    "kind": "builtin",
    "adapter": "reader-pomodoro"
  }
}
```

Its plugin config stores the reading and break lengths:

```json
{
  "focusMinutes": 25,
  "breakMinutes": 5
}
```

When the plugin is installed and enabled, the reader toolbar shows a Pomodoro timer entry. The timer state is scoped to the current reader session; plugin config controls newly reset focus and break durations.

## Model Providers

The AI reading assistant plugin supports two protocol families:

- `openai`: OpenAI-compatible chat completions APIs
- `anthropic`: Anthropic-compatible messages APIs

For OpenAI-compatible APIs, the adapter accepts either a full chat completions URL such as `https://api.openai.com/v1/chat/completions` or a base URL such as `https://api.example.com/v1`. Base URLs are normalized to `<base>/chat/completions`.

For Anthropic-compatible APIs, the adapter accepts either a full messages URL or a base URL. Base URLs are normalized to `<base>/v1/messages`.

For Mimo presets, choosing the access mode and protocol fills the expected base URL:

- Mimo Pay As You Go + OpenAI: `https://api.xiaomimimo.com/v1`
- Mimo Pay As You Go + Anthropic: `https://api.xiaomimimo.com/anthropic`
- Mimo Token Plan + OpenAI: `https://token-plan-cn.xiaomimimo.com/v1`
- Mimo Token Plan + Anthropic: `https://token-plan-cn.xiaomimimo.com/anthropic`

The reader calls only the active enabled model provider from the enabled AI reading assistant plugin. API keys remain in local app settings and are not synced.

## Reading Skills

A reading Skill is a user-configurable prompt profile owned by the AI reading assistant plugin:

- `name`: label shown in settings and the reader assistant selector
- `description`: short human description
- `systemPrompt`: instruction sent as the model system prompt
- `enabled`: whether the Skill can be selected in the reader

Skills do not choose models or change EPUB context extraction in the first version. Model selection is global within the plugin, and context extraction stays in the reader feature layer.

## Runtime Boundary

The reader assistant resolves user requests such as "summarize the current chapter" or "summarize chapter 2" to a specific EPUB spine section, then sends a bounded chapter excerpt to the active model provider with the selected Skill prompt. The current per-request limit is 30,000 characters to avoid unbounded full-book traversal and oversized model requests.

The adapter calls providers through the Tauri HTTP bridge, so network access stays behind the existing cross-platform native boundary. Vue components should use plugin services and adapter services instead of calling Tauri APIs directly.
