# APP_SPEC.md

## 1. Product identity

- **Name:** Developer Toolbox
- **Repository:** `ttomohisa/httpapps-developer-toolbox`
- **Version:** 1.0.0
- **Purpose:** Put the small developer conversions people repeatedly search for on the web into one local-first single HTML app.
- **Primary users:** Web developers, application developers, operators, and anyone who frequently inspects encoded or structured text.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Problem and outcome

Base64 conversion, UNIX timestamp conversion, JWT inspection, cron checks, regex testing, JSON formatting, and similar tasks are individually too small to justify separate Browser-Kitty apps, but they are useful often enough that developers repeatedly open unrelated web sites for them.

Developer Toolbox groups these tasks into one offline-capable toolbox. In a session, a user can paste an unknown value into Smart Input, jump to a suggested utility, process it entirely in the browser, and copy the result without uploading the value.

## 3. Core user flow

1. Open the app locally or on GitHub Pages.
2. Paste a value into Smart Input or search for a tool directly.
3. Choose a suggested utility or a tool from the toolbox.
4. Convert, inspect, validate, generate, or calculate.
5. Copy the result.
6. Optionally favorite frequently used tools. Favorites also appear in a dedicated section while remaining in their original categories. Favorite IDs persist locally; tool input does not.

## 4. Included tools

### Encode
1. Base64
2. URL
3. HTML Entity
4. Unicode
5. Hex
6. Data URI

### Data
7. JSON
8. YAML
9. CSV
10. JSON Diff
11. JSONPath

### Text
12. Case Converter
13. Sort Lines
14. Deduplicate
15. Character / Byte Count
16. Escape

### Time
17. UNIX Timestamp
18. ISO 8601
19. Date Difference
20. Cron

### Security
21. JWT Decoder
22. Hash
23. HMAC
24. Random Generator

### Developer
25. Regex
26. UUID
27. URL Parser
28. HTTP Status
29. Number Base
30. CIDR

### Web
31. Color Converter
32. px / rem
33. CSS Tools

## 5. Smart Input

- Must never persist entered Smart Input text.
- Detect likely JWT, JSON, URL, 10/13-digit UNIX timestamp, and readable Base64.
- Always offer Text Inspector for non-empty text.
- Selecting a suggestion opens the target tool and transfers the current value in memory.
- Detection is rule-based and local; it does not use AI or remote APIs.

## 6. Navigation and personalization

- Desktop: sticky searchable tool browser at the left of the selected workspace.
- Smartphone: the tool browser is replaced by a modal tool picker to avoid a long list before the workspace.
- `Ctrl+K` / `Cmd+K` focuses tool search; on narrow screens it opens the picker first.
- `#base64`, `#jwt`, `#regex`, etc. are supported as direct links.
- Favorite tool IDs are stored in localStorage.
- Tool input, output, Smart Input values, JWTs, URLs, regex text, hash text, and file contents are not stored in localStorage.

## 7. Privacy and security

- No runtime CDN, API, analytics, telemetry, remote font, or other network dependency.
- Default CSP keeps `connect-src 'none'`.
- Selected files are read only after user selection and remain in the browser.
- Hashing a file reads the full selected file into browser memory.
- JWT is decoded only; signatures are not verified.
- Cron results are advisory and use common five-field syntax plus the device local timezone.
- Regex uses the browser JavaScript RegExp engine; pathological expressions may consume significant CPU time.

## 8. UX and accessibility

- Light-only interface matching the Browser-Kitty single-HTML template.
- Japanese and English in the same HTML.
- Compact upper-right language and help controls.
- Inline SVG iconography; no emoji as primary controls.
- Desktop and 320px smartphone layouts are first-class.
- Visible keyboard focus, labels, native controls, and reduced-motion support are required.
- The selected utility occupies the main workspace; do not render all 33 utilities as a long dashboard.

## 9. Non-goals for 1.0.0

- JWT signature verification or token signing.
- Server-side HTTP requests or API testing.
- Quartz/AWS/EventBridge cron dialects.
- Streaming multi-gigabyte file hashing.
- TOML, XML, SQL formatting, full YAML 1.2 coverage, or full JSONPath filter/script expressions.
- Cloud synchronization or account support.

## 10. Acceptance criteria

- All 33 tools can be opened from the tool browser and by direct hash link.
- Smart Input detects representative JSON, JWT, URL, Base64, and timestamp values.
- Japanese/English switching does not reload the page and preserves current input fields in memory where browser security permits.
- Favorites persist after reload; utility input does not.
- `dist/index.html` contains no unresolved build placeholders or external runtime URLs.
- `dist/index.self-extract.html` restores the readable HTML byte-for-byte.
- Both release variants remain single files with no runtime network requirement.


## Workspace UX 1.1

- Results with a standard output action bar expose Copy and Send to tool; reversible transforms also expose Swap.
- Send to tool opens the shared picker and seeds the selected target tool without persisting the transferred value.
- Each tool's form values are stored only in an in-memory `Map` for the lifetime of the current page. Reloading clears them.
- Lightweight conversion tools update through a short debounce while keeping their explicit action buttons.
- `Ctrl/Cmd + K` opens the picker as a command palette. Search uses English terms, Japanese aliases, descriptions, and tool IDs with relevance ranking.
- Nonempty sidebar and palette searches show each matching tool once in relevance order, independent of favorite/category grouping. The best match is highlighted automatically and Enter opens it immediately; Arrow Up/Down chooses another result.
- Empty or whitespace-only search keeps the existing Favorites and category sections without an automatic selection. Enter does nothing until an arrow key explicitly selects a row. No-result queries never open a tool.
- Escape clears the query or closes the palette. IME composing key events (`isComposing` or legacy key code 229) must not open a tool, change selection, clear the query, or close the palette.
- Reopening the palette with a retained nonempty query preserves quick-open behavior. Transfer mode searches only tools that accept a seed value and passes the existing payload in memory.

## Safe conversion round trips

- Hex decoding accepts complete hexadecimal byte pairs, contiguous or separated by whitespace, commas, colons, or hyphens. Each group may have a `0x` prefix. Reject any other character, incomplete byte, or invalid UTF-8 instead of silently dropping it.
- JSON string unescape accepts only a parsed JSON string, never an object, array, number, boolean, or null.
- Hex, Unicode, URL, Data URI, and Escape clear prior output immediately when input/options change and on conversion errors; Copy, Send, and Swap are disabled until a valid non-empty result exists. A literal em dash is payload, never an empty-state marker. Explicit conversion cancels pending live work so a subsequent Swap is not overwritten. UTF-8 decoding preserves a leading BOM as content.
- Data URI decoded output is payload only. MIME metadata is shown separately and restored to the MIME/encoding controls for re-encoding. No metadata is injected into Copy, Send, or Swap.
- URL component/full mode survives tool navigation and language changes through the existing in-memory form state. Reload still resets work.
- Default builds generate `developer-toolbox.html` as an exact byte-for-byte copy of `dist/index.html`. Custom `-OutputPath` builds do not rewrite that alias.
