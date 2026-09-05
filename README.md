# Developer Toolbox

[![GitHub Pages](https://github.com/ttomohisa/httpapps-developer-toolbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/httpapps-developer-toolbox/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/httpapps-developer-toolbox/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML developer toolbox for Base64, JSON, JWT, cron, regex, timestamps, hashes, text conversion, web utilities, and other small tasks that otherwise send you searching for separate websites.

## 🚀 Live demo

### [Open Developer Toolbox on GitHub Pages](https://ttomohisa.github.io/httpapps-developer-toolbox/)

GitHub Pages delivers the initial HTML. After it loads, conversion, parsing, validation, generation, hashing, and other utility processing run locally in your browser. Values entered into the tools are not uploaded by the app.

[![Developer Toolbox screenshot](assets/screenshot.png)](https://ttomohisa.github.io/httpapps-developer-toolbox/)

## Features

- 33 developer utilities in one self-contained HTML file
- **Smart Input** detects likely JSON, JWT, URL, Base64, UNIX timestamp, Data URI, and text input and suggests useful tools
- Send a result directly to another tool without copying and pasting it manually
- Keep each tool's working input in memory while the tab stays open; reload clears it
- Real-time conversion for lightweight tools such as Base64, URL, Unicode, Hex, and px/rem
- Consistent **Swap**, **Copy**, and **Send to another tool** actions where they make sense
- Search tools by English or Japanese aliases
- `Ctrl` / `⌘` + `K` command palette with keyboard navigation
- Favorite tools appear in a Favorites section while remaining in their original categories
- Deep links such as `#base64`, `#jwt`, `#cron`, and `#regex`
- Japanese and English UI in the same HTML
- Responsive desktop and mobile layouts
- Embedded SVG favicon and no remote runtime assets
- No third-party runtime libraries

## Included tools

| Category | Tools |
| --- | --- |
| **Encode** | Base64, URL, HTML Entity, Unicode, Hex, Data URI |
| **Data** | JSON, YAML, CSV, JSON Diff, JSONPath |
| **Text** | Case Converter, Sort Lines, Deduplicate, Character / Byte Count, Escape |
| **Time** | UNIX Timestamp, ISO 8601, Date Difference, Cron |
| **Security** | JWT Decoder, Hash, HMAC, Random Generator |
| **Developer** | Regex, UUID, URL Parser, HTTP Status, Number Base, CIDR |
| **Web** | Color Converter, px / rem, CSS Tools |

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/httpapps-developer-toolbox/). No installation or account is required.

### Use the downloaded HTML

1. Download [`dist/index.html`](https://github.com/ttomohisa/httpapps-developer-toolbox/blob/main/dist/index.html) from this repository.
2. Open it in a current Chromium-based browser, Firefox, or Safari.
3. Keep the file anywhere you like and open it again when you need a developer utility.

For a smaller distributable file, [`dist/index.self-extract.html`](https://github.com/ttomohisa/httpapps-developer-toolbox/blob/main/dist/index.self-extract.html) contains the same app as a gzip-compressed self-extracting HTML.

### Build it fully offline (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows 10/11.
3. The builder generates and verifies `dist/index.html` and the self-extracting variant.
4. Copy the generated HTML wherever you need it.
5. Open the file later without a web server.

Python, Node.js, and a local web server are not required. The builder uses Windows PowerShell and the built-in `tar.exe`. The current app has no third-party runtime dependencies.

## Usage

1. Paste a value into **Smart Input**, or choose a tool from the sidebar / mobile tool picker.
2. Enter or paste the value you want to process.
3. Lightweight tools update automatically; other tools provide an explicit action such as **Parse**, **Compare**, **Calculate**, or **Generate**.
4. Copy the result, swap input and output when available, or use **Send to another tool** to continue processing the result elsewhere.
5. Star frequently used tools to also show them in **Favorites**.
6. Move between tools freely. Input is kept only in memory for the current tab, so returning to a tool restores the in-progress value until the page is reloaded.

### Command palette and keyboard navigation

| Shortcut | Action |
| --- | --- |
| `Ctrl` / `⌘` + `K` | Open the tool search palette |
| `↑` / `↓` | Move through search results |
| `Enter` | Open the selected tool |
| `Esc` | Clear the current search or close the palette |

Search supports both English and Japanese aliases, for example `regex` / `正規表現`, `hash` / `ハッシュ`, and `CIDR` / `サブネット`.

## Publish with GitHub Pages

The repository includes a workflow that builds the standalone HTML, verifies it, and deploys `dist/` to GitHub Pages automatically.

1. Push the repository to GitHub as `httpapps-developer-toolbox`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run **Deploy standalone app to GitHub Pages** from the Actions tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/httpapps-developer-toolbox/`.

Each push to `main` runs the repository checks before deployment. Pull requests that change the app or build files also run the standalone build validation workflow.

## Development and build layout

```text
.
├─ src/index.template.html       # Application source template
├─ app.config.json               # App name, version, repository, build settings
├─ dependencies.json             # Pinned embedded dependencies (currently empty)
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # Standalone HTML builder
├─ scripts/
│  ├─ check-repository.ps1       # Repository-wide build and verification
│  ├─ verify-standalone.ps1      # Standalone HTML verification
│  ├─ build-self-extract.ps1     # Self-extracting HTML builder
│  └─ verify-self-extract.ps1    # Self-extract verification
├─ dist/
│  ├─ index.html                 # Readable single-HTML release
│  ├─ index.self-extract.html    # Gzip self-extracting release
│  ├─ dependency-manifest.json
│  └─ self-extract-manifest.json
└─ .github/workflows/
   ├─ build-standalone.yml       # Pull request build validation
   └─ deploy-pages.yml           # Automatic Pages deployment from main
```

Edit `src/index.template.html`, not the generated files under `dist/`. Product behavior and acceptance criteria are documented in [APP_SPEC.md](APP_SPEC.md).

### Build and verification

Run:

```bat
build-standalone.bat
```

For the full repository checks used by GitHub Actions:

```powershell
./scripts/check-repository.ps1
```

The build and verification process:

- Generates the single-HTML app from `src/index.template.html`
- Embeds configured dependency assets when `dependencies.json` contains any
- Rejects unresolved template placeholders and invalid build output
- Verifies the standalone HTML does not rely on external runtime resources
- Generates dependency and self-extract manifests
- Builds the gzip self-extracting variant
- Verifies that the self-extracting payload restores the readable HTML byte-for-byte

## Privacy and runtime network protection

Developer Toolbox is designed so the utility data stays on the device.

- Content Security Policy includes `connect-src 'none'`
- No analytics or telemetry
- No remote runtime scripts, stylesheets, APIs, or CDNs
- Smart Input and tool input/output are not persisted to `localStorage`
- In-progress tool state exists only in memory and is cleared by reloading or closing the tab
- Only language preference and favorite tool IDs are stored locally
- Files selected for hashing are processed locally in the browser

The GitHub Pages version requires one initial request to download the HTML. After the page loads, the utility processing does not require a runtime network connection. For use with the network completely disconnected, open `dist/index.html` locally.

See [SECURITY.md](SECURITY.md) and [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md) for the security model and offline verification steps.

## Limitations

- JWT Decoder decodes Header and Payload but does not verify the signature.
- Cron supports common five-field syntax and calculates upcoming runs in the device's local timezone; behavior can differ from a specific cron implementation.
- JSONPath intentionally implements a lightweight subset rather than the complete JSONPath specification.
- YAML parsing is intentionally limited to a simple subset suitable for small developer conversions.
- File hashing reads the selected file into browser memory, so very large files can increase memory usage.
- The self-extracting release requires browser support for `DecompressionStream`.
- Working input is intentionally not persisted; reloading the page clears in-progress tool values.

## Dependencies

The current release has **no third-party runtime libraries**. `dependencies.json` is empty, and the app uses browser-native APIs such as Web Crypto, `TextEncoder`, `URL`, and `Intl`.

The build system still supports exact, embedded dependencies when a future tool genuinely needs one. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) for the dependency policy.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
