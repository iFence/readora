# Readora

Readora is a cross-platform EPUB reader built with Tauri, Rust, Vue 3, and a pnpm workspace.

The project is currently focused on desktop delivery for Windows, macOS, and Linux, while the UI and application shell are being shaped to stay compatible with future iPad, iPhone, and Android-style mobile containers.

## Highlights

- EPUB reading powered by a Foliate-based reader engine
- Bookshelf with local import and reading progress
- Reader annotations and bookmarks
- Reader typography controls
- WebDAV-based sync flow
- Tauri desktop integration for file open, shortcuts, and window lifecycle

## Tech Stack

- Rust
- Tauri 2
- Vue 3
- Vue Router
- Vue I18n
- Naive UI
- pnpm workspace

## Repository Layout

```text
apps/readora-app           Main application
apps/readora-app/src       Frontend UI and app services
apps/readora-app/src-tauri Tauri runtime and Rust backend
packages/foliate-js        Reader engine dependency boundary
```

## Development

Requirements:

- Node.js
- pnpm
- Rust toolchain
- Tauri desktop prerequisites for your OS

Install dependencies:

```bash
pnpm install
```

Run the desktop app in development:

```bash
pnpm dev
```

Build the desktop app:

```bash
pnpm build
```

Build the frontend only:

```bash
pnpm --filter readora-app build
```

## Notes

- `packages/foliate-js` is treated as a vendor-style boundary and should be adapted around rather than modified casually.
- Desktop-specific capabilities are kept behind service and platform bridge layers so the frontend can continue moving toward broader device compatibility.

## Status

Readora is under active development. The current branch includes a responsive shell refactor aimed at keeping the desktop experience intact while preparing the UI structure for narrower viewport and mobile-style layouts.
