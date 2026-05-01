# Changelog

This file keeps the public release notes used by GitHub Releases and the in-app updater.

Conventions:
- Each release uses `## v<version>` as the heading, for example `## v0.2.0`.
- Content below the heading is Markdown and can be shown directly in release/update UI.
- End a release section with `---` or the next `## v<version>` heading.

## v0.3.0

### Updates
- Refactored AI reading features into a built-in `AI 阅读助手` plugin instead of a standalone settings flow.
- Added multi-model configuration for the AI assistant with support for OpenAI-compatible and Anthropic-compatible APIs.
- Added configurable reading Skills and skill selection during reader assistant Q&A.
- Added a `保存为笔记` action for AI-generated summaries and answers inside the reader.
- Converted WebDAV sync into a built-in system plugin and removed the separate WebDAV settings page.
- Added a built-in `阅读番茄钟` plugin with configurable focus and break durations for reading sessions.
- Reworked the plugin management UI into an Obsidian-style detail modal with plugin metadata, actions, and per-plugin configuration.
- Improved the AI assistant plugin layout with tabbed model/skill configuration and denser plugin metadata presentation.
- Added GitHub Actions workflow support for Android builds.

---

## v0.2.1

### Updates
- Added a plugin management page for installing, enabling, configuring, and uninstalling plugins.
- Added manifest-based plugin installation with a conservative service-owned runtime boundary.
- Added the built-in OpenAI-compatible LLM summary plugin configuration.
- Added a reader toolbar summary action that extracts bounded EPUB text and renders AI-generated Markdown summaries.
- Documented the initial plugin manifest format and capability model in `docs/plugins.md`.

---
