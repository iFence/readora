# Changelog

This file keeps the public release notes used by GitHub Releases and the in-app updater.

Conventions:
- Each release uses `## v<version>` as the heading, for example `## v0.2.0`.
- Content below the heading is Markdown and can be shown directly in release/update UI.
- End a release section with `---` or the next `## v<version>` heading.

## v0.2.1

### Updates
- Added a plugin management page for installing, enabling, configuring, and uninstalling plugins.
- Added manifest-based plugin installation with a conservative service-owned runtime boundary.
- Added the built-in OpenAI-compatible LLM summary plugin configuration.
- Added a reader toolbar summary action that extracts bounded EPUB text and renders AI-generated Markdown summaries.
- Documented the initial plugin manifest format and capability model in `docs/plugins.md`.

---
