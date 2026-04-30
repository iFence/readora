# Readora Plugin Architecture

Readora plugins are installed from a manifest. The first implementation is intentionally conservative: a plugin can declare metadata, configuration fields, and capabilities, while runtime execution is handled by Readora-owned adapters.

This keeps plugin installation cross-platform and avoids loading untrusted JavaScript directly into the reader process.

## Manifest

```json
{
  "id": "vendor.plugin-name",
  "name": "Plugin Name",
  "version": "0.1.0",
  "type": "llm-provider",
  "author": "Vendor",
  "description": "Adds a book summary provider.",
  "capabilities": ["book.summary"],
  "entry": {
    "kind": "external"
  },
  "configSchema": {
    "endpoint": {
      "label": "API Endpoint",
      "type": "url",
      "required": true
    },
    "apiKey": {
      "label": "API Key",
      "type": "password",
      "required": true
    },
    "model": {
      "label": "Model",
      "type": "text",
      "required": true
    }
  }
}
```

## Current Capabilities

- `book.summary`: provides large language model configuration for book summary flows.

## Built-In LLM Plugin

The built-in `readora.llm.openai-compatible` plugin uses an OpenAI-compatible chat completions endpoint. Configure:

- `endpoint`: for example `https://api.openai.com/v1/chat/completions`
- `apiKey`: the provider API key
- `model`: the model name
- `temperature`: optional numeric sampling temperature

The adapter calls providers through the existing Tauri HTTP bridge, so it works through the same cross-platform native boundary used by the rest of the app.

In the reader, the summary action extracts readable text from EPUB spine sections on demand and sends a bounded excerpt to the enabled `book.summary` provider. The current limit is 60,000 characters to avoid unbounded full-book traversal and oversized model requests.

## Runtime Boundary

Installed manifests are stored in the app settings store. Third-party manifests do not execute code yet. New executable plugin types should be added by:

1. Defining a capability in `apps/readora-app/src/services/pluginRegistry.js`.
2. Adding an adapter service that owns validation, network access, and error handling.
3. Calling enabled plugins through capability lookup in `pluginService`.

Avoid calling Tauri APIs directly from Vue components. Plugin execution should stay behind services or adapters.
