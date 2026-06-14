---
"reviewport": patch
---

Security: injection-focused hardening (manifest + working directory treated as untrusted input).

- Fix command-injection/RCE in the Claude Code Stop hook (`reviewport-stop.sh`) — it spliced `$PWD` into a `node -e` program, so a maliciously-named directory could run arbitrary commands on every agent turn. It now reads the manifest by a fixed relative path via `JSON.parse(fs.readFileSync(...))`.
- Fix DOM-XSS sink: `navTo()` now only navigates to same-origin paths, so a manifest `route`/`routeBase` of `javascript:`/`data:`/`//evil` can't reach `location.assign`; `validate` rejects such routes too.
- Fix a one-request DoS: a NUL byte in the request path now returns `400` instead of crashing the static server.
- Harden `install`: refuse to write through a pre-existing symlink; shell-escape the home path in the global hook command.
- A malformed `anchor.selector` no longer throws and breaks the overlay.
