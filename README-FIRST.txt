Developer Toolbox
=========

1. Read README.ja.md and APP_SPEC.md.
2. Edit src\index.template.html, not generated HTML under dist\.
3. Keep runtime networking disabled unless APP_SPEC.md is intentionally changed.
4. Run build-standalone.bat on Windows.
5. Open dist\index.html and dist\index.self-extract.html directly and test both variants.
6. Run scripts\check-repository.ps1 before release.

The app is based on htmlapps-template and keeps its single-HTML build contract.
