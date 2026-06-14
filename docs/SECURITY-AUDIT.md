# Security audit — injection review (2026-06-15)

Adversarial, injection-focused review of `reviewport@0.1.0` (multi-agent, each finding
reproduced with a real PoC and independently verified). Threat model: **the change
manifest and the working directory are untrusted input** — a victim may `serve`/`proxy` a
cloned repo that ships a `review-manifest.json`, review an attacker's PR's manifest, or
work inside an attacker-named directory.

All confirmed findings below are **fixed** (queued for `0.1.1`) and covered by regression
tests in `test/security.test.js`.

| # | Category | Severity | File | Status |
|---|----------|----------|------|--------|
| 1 | Command injection → **RCE** | Critical/High | `integrations/claude-code/hooks/reviewport-stop.sh` | ✅ fixed |
| 2 | DOM **XSS** (`javascript:` route sink) | High | `src/overlay.js` (`navTo`) + `src/schema/validate.js` | ✅ fixed |
| 3 | **DoS** (null byte crashes server) | High | `src/serve.js` | ✅ fixed |
| 4 | Persisted shell injection via `$HOME` | Low | `src/install.js` | ✅ fixed |
| 5 | Path traversal via symlink on write | Low | `src/install.js` | ✅ fixed |
| 6 | DoS via malformed `anchor.selector` | Low | `src/overlay.js` | ✅ fixed |

## 1 — RCE in the Stop hook (the worst issue)
The Stop hook spliced `$PWD` into a `node -e` program: `require("'"$PWD"'/review-manifest.json")`.
A directory name containing `"` broke out of the JS string and ran as code. **Proven**: a
dir named ``app");}catch(e){};require("child_process").execSync("id>pwned.txt");try{m=("``
caused the real hook to execute `id`. Triggered automatically by Claude Code's Stop hook
every turn once `install claude --hook` was used.
**Fix**: read the manifest by a fixed relative path with `JSON.parse(fs.readFileSync(...))`
— no path is ever concatenated into program text, and `require` (which could run a
malicious `.js` "manifest") is gone.

## 2 — DOM XSS via the route sink
`navTo()` did `location.assign(ROUTEBASE + c.route)`; `route`/`routeBase` were validated
only as non-empty strings, so a `javascript:` route executed JS in the reviewed page's
origin on a single Next/arrow keypress (proven live in Chromium). `esc()`/`safeJson` did
not help — this is a navigation sink, not an HTML-text sink.
**Fix (two layers)**: (1) `navTo()` resolves the route with `new URL(..., location.origin)`
and only assigns when it is **same-origin** (blocks `javascript:`/`data:`/`//evil` and
leading-whitespace scheme smuggling); (2) `validate` rejects non-http(s)/protocol-relative
routes so a malicious manifest fails up front.

## 3 — Null-byte DoS
A path with a NUL byte (`/x%00.png`) passed the traversal guard, then `fs.stat` threw
**synchronously**, crashing the whole process — reachable cross-origin via `<img src>`.
**Fix**: reject a NUL byte in the decoded path with `400` before any `fs.*` call.

## 4–6 — Low severity
- `install --global` shell-escapes the home path in the hook command (`$HOME` with `"`/`$`).
- `install` refuses to write **through** a pre-existing symlink (no write outside target).
- `anchor.selector` is now run through `querySelectorAll`/`querySelector` wrappers that
  swallow `SyntaxError`, so a bad selector can't break the overlay.

## Reviewed and accepted (not bugs)
- The proxy's `rejectUnauthorized: false` is a **documented local-dev tradeoff** for
  self-signed dev certs; both servers bind `localhost` only.
- `safeJson()` correctly prevents `</script>` breakout (escapes `<`/`>`/U+2028/U+2029);
  every manifest field rendered into the panel is HTML-escaped via `esc()` (text context).
- Zero runtime dependencies → no transitive supply-chain surface; no install/postinstall
  scripts; the published tarball ships no secrets.

See [SECURITY.md](../SECURITY.md) for the reporting policy.
