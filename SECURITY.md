# Security Policy

## Supported version

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Use the repository owner's private security reporting channel when available and include the affected version, reproduction steps, expected/actual behavior, and impact.

## Trust model

Developer Toolbox is a static browser application with no backend.

- Runtime network connections are blocked with `connect-src 'none'`.
- There are currently no bundled third-party runtime libraries.
- No analytics, telemetry, remote fonts, silent update checks, or server-side storage are used.
- Smart Input and utility input/output are not persisted by the app.
- Only language and favorite tool IDs are stored in localStorage.

A generated HTML file is executable code. For high-trust workflows, obtain it from a trusted source and verify its hash.

## Sensitive developer data

JWTs, URLs, Base64 values, regex test text, hashes, and other developer input can contain secrets. Developer Toolbox keeps these values in browser memory only, but users should still avoid exposing the screen or clipboard contents to untrusted software.

JWT decoding does not verify signatures and must not be treated as authentication validation.

## Local files

The Hash tool reads a user-selected local file only after explicit selection. The file is not uploaded. The current implementation uses `arrayBuffer()` and therefore reads the complete file into browser memory; extremely large files can cause high memory use.

## Regex and cron limitations

JavaScript regular expressions can exhibit catastrophic backtracking for some patterns. Cron parsing is a convenience implementation of common five-field syntax and is not a substitute for validating behavior against a specific production scheduler.
