# Changelog

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
