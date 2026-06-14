# Security Policy

## Supported versions

reviewport is pre-1.0. Security fixes are applied to the latest published `0.x`
release.

## Threat model (read this before you run it)

reviewport is a **local development tool**. By design it:

- runs an HTTP server on your machine (proxy or static), and
- **injects a `<script>` into the HTML it serves** to render the review overlay.

That means a few things you should understand:

1. **Treat the manifest as trusted-but-checked input.** The manifest's text fields
   (`title`, `before`, `after`, `description`, anchor hints) are rendered into the
   overlay. They are HTML-escaped before display, and the JSON is escaped before it
   is inlined into the injected `<script>` (to prevent `</script>` breakout and
   U+2028/U+2029 issues). Still: only run reviewport against manifests produced by
   your own agent/your own repo, not arbitrary manifests from untrusted sources.
2. **Don't expose the reviewport port to a network.** It is meant for `localhost`.
   The injected overlay and the proxy are not hardened for public exposure.
3. **The proxy disables upstream TLS verification** (`rejectUnauthorized: false`) so
   it can sit in front of dev servers using self-signed certs. This is appropriate
   for local dev only — never point it at a production upstream.
4. **No telemetry, no network calls.** reviewport has zero runtime dependencies and
   makes no outbound requests. Review state lives in your browser's `localStorage`.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Email **jason96350@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (a minimal manifest + page if relevant),
- any suggested fix.

You'll get an acknowledgement within a few days. Once a fix is available we'll
publish a patched release and credit you (unless you prefer otherwise).
