# Changelog

## 1.1.1 - 2026-10-07

- Standardize EN / JA language targets, localized accessible names/tooltips, and the bilingual fully-local-processing badge.
- Clear stale CSV conversion results on edits or failures and disable Copy, Send, and Swap until a valid result exists.
- Correct canonical repository/demo links while preserving the legacy storage slug and saved favorites.

## Unreleased

- Add ranked quick-open: nonempty sidebar and palette searches highlight the best unique match for immediate Enter; arrows select alternatives. Keep Favorites/categories when search is empty.
- Ignore IME composition keys before tool navigation, selection, or Escape handling, including the legacy key-code 229 path and the global palette shortcut. Prevent the native Escape default when clearing the palette query.
- Add navigation, transfer, draft/history/language, and storage regression coverage to source and generated-release checks.

- Reject malformed Hex input and non-string JSON unescape values instead of silently changing their data.
- Clear stale conversion output/actions on edits and errors, cancel pending live conversions before explicit actions, and preserve literal em-dash and leading UTF-8 BOM payloads.
- Separate decoded Data URI payloads from MIME metadata and preserve MIME/encoding for round trips.
- Preserve URL component/full mode within the tab across navigation and language changes.
- Generate the tracked root download with the release build and verify byte parity; add source/release regression tests to repository checks.


## 1.1.0 - 2026-08-20

- Rename the repository/slug to `httpapps-developer-toolbox` and migrate legacy language/favorite settings automatically.

- Added **Send to tool** so transform results can be passed directly into another utility without copy/paste.
- Added in-memory per-tool input state that lasts until the tab is closed or reloaded; tool input is still not persisted to localStorage.
- Added debounced live conversion for lightweight utilities including Base64, URL, HTML Entity, Unicode, Hex, Data URI, Escape, URL Parser, Number Base, ISO 8601, CIDR, Color, and px/rem.
- Unified result actions with Copy, Swap, and Send to tool controls where applicable.
- Upgraded `Ctrl/Cmd + K` into a keyboard command palette with Japanese/English aliases, relevance ranking, arrow-key navigation, Enter selection, and Escape handling.
- Added direct Send to tool actions for JWT Header, Payload, and Signature.

## 1.0.0 - 2026-08-20

- Created Developer Toolbox from `htmlapps-template`.
- Added 33 local-first developer utilities across Encode, Data, Text, Time, Security, Developer, and Web categories.
- Added Smart Input with local rule-based detection for JSON, JWT, URL, UNIX timestamp, readable Base64, and general text.
- Added searchable desktop navigation, smartphone tool picker, favorites, `Ctrl/Cmd + K`, and direct `#tool-id` links.
- Kept all utility input ephemeral; only language and favorite IDs persist locally.
- Kept the template's bilingual, light-only, single-HTML, no-runtime-network build contract.

### Changed
- Replaced the top-left cat mark with a developer-tools icon and synchronized the favicon.
- Improved tool-switch scrolling so the selected tool name remains visible below the sticky header.
- Added Japanese descriptions for every tool while keeping English descriptions for English mode.
- Renamed the app to Developer Toolbox.
- Removed the Recent tools section and recent-tool persistence.
- Favorites now stay in their original categories while also appearing in the Favorites section.
