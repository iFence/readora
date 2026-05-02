# AGENTS.md

## Project Context

- Readora is a cross-platform EPUB reader.
- Main stack: Rust, Tauri, pnpm workspace, Vue 3, JavaScript.
- Treat cross-platform behavior as the default requirement for both frontend and backend work.
- Prefer maintainable, bounded changes over broad rewrites.

## Core Rules

- Default to platform-neutral solutions first.
- Prefer existing solutions over custom implementations: check Tauri official plugins first, then active and well-maintained third-party dependencies, and only build in-house when existing options are not a good fit.
- Do not introduce Windows-only, macOS-only, or Linux-only assumptions into shared code unless there is no practical alternative.
- For frontend work, if the user does not explicitly request a new visual direction, keep the visual style consistent with the existing product. New pages, panels, cards, spacing, typography, and interaction states should feel like part of the same application rather than a separate design language.
- If platform-specific behavior is required, isolate it behind a narrow adapter or native boundary.
- Keep refactors behavior-compatible unless the task explicitly includes a product change.
- Read the surrounding code before editing and preserve existing conventions unless they conflict with cross-platform safety or maintainability.

## Architecture Boundaries

- Frontend UI, routing, state orchestration, and feature logic belong in `apps/readora-app/src`.
- Native runtime integration, Tauri commands, tray/window/bootstrap logic, and OS-facing code belong in `apps/readora-app/src-tauri`.
- Shared or vendor-like reader engine code lives in `packages/foliate-js` and should be treated as a constrained dependency boundary.
- Prefer services, repositories, and adapters over calling Tauri APIs directly from Vue view components.
- Keep native concerns out of presentational components when an app/service layer can own them.

## Cross-Platform Guidance

- Do not hardcode OS-specific paths, separators, shell syntax, or filesystem conventions in shared logic.
- Prefer Tauri plugins, standard Rust libraries, and standard web APIs over ad hoc platform branching.
- For shortcuts, window lifecycle, dialogs, file opening, and startup file handling, assume behavior must work across supported desktop targets.
- Use capability detection or target-gated native modules when backend behavior genuinely differs by OS.
- Keep platform conditionals localized; do not spread them across pages, composables, and utilities.
- When converting local files for the webview, use the existing Tauri-safe path and URL bridge patterns rather than building file URLs manually.

## Change Workflow

- Inspect the relevant feature, service, and native boundary before editing.
- Before implementing new functionality, search for a suitable Tauri official plugin or an active, well-supported third-party package instead of building a custom solution by default.
- Prefer narrow, composable changes with clear ownership.
- Confirm the source of truth before adapting or displaying third-party data. Do not treat library-internal progress or position fields as product-facing page numbers, chapter state, or reading progress unless the library docs or source confirm the semantics.
- Keep new abstractions real: do not leave dead wrappers, duplicate code paths, or half-finished service layers.
- If a change touches both frontend and backend, keep the interface between them explicit and minimal.
- Do not modify `packages/foliate-js`; integrate through its existing interfaces and capabilities, and if required functionality is missing, prefer pulling newer upstream code and adopting its new features before considering any fork-like approach.
- If the same bug survives two attempted fixes, stop patching locally and inspect the upstream library docs, source, and issue tracker before continuing.
- When changing architectural boundaries, update nearby docs or comments if the intent would otherwise be unclear.

## Source of Truth and Third-Party Semantics

- Treat `foliateAdapter` and similar adapter layers as transport and capability bridges, not as the place where product semantics are invented.
- User-facing concepts such as page number, section position, and reading progress must be explicitly modeled in app code. Do not pass raw library fields straight through to UI text unless their meaning is verified.
- When a third-party library exposes only approximate progress values, do not silently relabel them as precise page numbers. Either build an app-level indexing layer or surface them as progress/locations instead.
- Prefer proving semantics from primary sources: official docs first, then upstream source, then upstream issues/discussions.

## Reader-Specific UI and Performance Rules

- Reader UI changes should stay inside `apps/readora-app/src/features/reader` and `apps/readora-app/src/views/EpubViewer.vue` unless the issue is clearly part of app chrome.
- Reader settings that affect layout, pagination, or reflow must document what recomputation they trigger and when.
- Do not run expensive full-book work on high-frequency UI events by default. Slider drag, resize, scroll, and similar interactions should prefer local preview plus debounce, commit-on-release, or another bounded update strategy.
- If a change introduces hidden rendering, background indexing, or whole-book traversal, keep the trigger points explicit and minimal, and document why the cost is acceptable.
- Reader style overrides must be grouped by concern. Do not mix typography, color normalization, and layout overrides into one conditional block unless they truly share the same control.
- A setting toggle should control one behavior dimension. Avoid hiding unrelated CSS or layout behavior behind a convenience flag.

## Localization and Bilingual Requirements

- User-facing product functionality must ship with both Chinese and English text support by default.
- Treat bilingual support as part of the feature definition, not as optional polish to add later.
- When adding a new feature, also add the corresponding `zh` and `en` entries to the app i18n source in the same change unless there is a documented exception.
- Do not hardcode new user-visible strings in Vue components, plugin panels, dialogs, empty states, tooltips, buttons, or notifications when the surrounding surface already uses i18n.
- For plugin-related functionality, include bilingual names, descriptions, settings labels, action text, validation messages, and empty/loading states.
- If a feature cannot practically be localized in the same change, call that out explicitly as a release blocker or document why the surface is intentionally not yet shipped.
- When refactoring an existing surface, prefer pulling newly introduced strings into i18n rather than adding more literal text beside already localized content.

## Shell / Window Chrome Safety

- Do not modify `apps/readora-app/index.html`, titlebar behavior, window controls, or sidebar trigger geometry for a reader-specific bug unless you have confirmed the problem belongs to shell chrome rather than reader content/layout.
- If shell chrome must change, explicitly consider all major surfaces: reader, home, bookshelf, and settings.
- Treat drag regions, window control hit areas, and fullscreen/edge triggers as app-wide infrastructure. Small CSS changes there can affect every page.
- Prefer fixing local spacing or overlay issues in the local page/container before changing titlebar or global shell layout.

## Regression and Cleanup Discipline

- After stabilizing a bug fix, remove trial fields, temporary state, and fallback branches that are no longer used.
- If a workaround remains because a deeper fix is too risky, leave a short comment describing the constraint and the intended long-term fix boundary.
- When a change introduces a cache or derived index, define what invalidates it. Do not leave recomputation triggers implicit.
- Avoid accumulating "just in case" compatibility fields in shared helpers unless at least one current caller needs them.

## Verification

- Frontend-targeted changes: run `pnpm --filter readora-app build`.
- Workspace-wide dependency or package changes: run `pnpm -r build` when relevant.
- Rust or Tauri changes: run `cargo check` from `apps/readora-app/src-tauri`.
- For changes touching dialogs, tray, shortcuts, startup file handling, or local file loading, explicitly consider Windows, macOS, and Linux behavior even if only one platform is available locally.
- For reader pagination, typography, or progress changes, explicitly test: double-page mode, chapter boundaries, layout toggle, and window resize behavior.
- For reader settings panels and sliders, explicitly test both visual effect and performance. Confirm that drag interactions do not trigger unnecessary rebuild work on every input event unless that behavior is intentional.
- For titlebar, sidebar trigger, or other shell chrome changes, explicitly test at least one non-reader page in addition to the reader page.

## Notes on Vendor and Native Code

- Treat `packages/foliate-js` as vendor-style code: do not edit it locally, adapt around it, and prefer consuming upstream updates or newly provided features when additional behavior is needed.
- Keep Tauri command surfaces narrow and purpose-specific.
- Do not move generic UI logic into Rust just because native code is available.
- Do not move OS-specific concerns into Vue components just because it is faster to wire there.
- If a platform-specific workaround is unavoidable, add a short code comment explaining why the shared cross-platform layer was not sufficient.
