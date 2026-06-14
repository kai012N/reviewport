# Architecture

reviewport is intentionally small and layered: a **durable core** (the manifest
schema + the anchoring/overlay engine) wrapped in **thin, replaceable adapters**
(the injectors and agent integrations). The core is the asset; the adapters track
ecosystems that churn.

```
            ┌─────────────────────────────────────────┐
            │  agent  →  review-manifest.json (schema)  │   the open contract
            └─────────────────────────────────────────┘
                              │ loaded + validated + hot-watched
                              ▼
        ┌───────────────────────────────────────────────────┐
        │  inject.js  — manifest → <script> → HTML            │  shared by all adapters
        └───────────────────────────────────────────────────┘
            │                                   │
            ▼                                   ▼
   ┌──────────────────┐               ┌──────────────────┐
   │ proxy.js          │               │ serve.js          │     adapters (thin)
   │ (in front of a    │               │ (static folder)   │     + future: vite-plugin
   │  dev server)      │               │                   │
   └──────────────────┘               └──────────────────┘
            │                                   │
            └──────────────► browser ◄──────────┘
                              │
                    ┌────────────────────┐
                    │ overlay.js          │   the engine (browser, zero-dep,
                    │ anchoring + panel   │   self-contained, serialized in)
                    └────────────────────┘
```

## Modules (current: one zero-dependency package)

| file | layer | responsibility |
|---|---|---|
| `src/schema/manifest.schema.json` | contract | canonical JSON Schema for the manifest |
| `src/schema/validate.js` | contract | zero-dep runtime validator |
| `src/overlay.js` | engine | the review sidebar + 3 anchor resolvers + state + export. Serialized via `.toString()` and run in the browser; must stay self-contained |
| `src/inject.js` | engine | `buildOverlayScript()` / `injectHtml()` — manifest → safe `<script>` → HTML |
| `src/manifest.js` | engine | load + validate + hot-watch the manifest file |
| `src/proxy.js` | adapter | zero-dep reverse proxy with HMR/websocket pass-through |
| `src/serve.js` | adapter | zero-dep static file server |
| `src/cli.js` / `bin/reviewport.js` | adapter | the `reviewport` command |
| `src/index.js` | api | programmatic exports for building further adapters |

> It ships today as a **single package** with clean internal seams. If/when a Vite
> plugin or other adapters land, the engine can be extracted to `@reviewport/core`
> without changing its API. We split when there's a reason to, not before.

## Design rules

1. **Zero runtime dependencies** — enforced in CI. Use `node:` built-ins. This keeps
   the supply chain trivial to audit and the install instant.
2. **The schema is the API.** Everything else is replaceable; the manifest format is
   the thing other tools build against, so it changes deliberately and is versioned.
3. **The overlay is self-contained.** No imports / no module-scope closures — it must
   survive being serialized to a string and injected.
4. **Adapters are thin.** Bundler APIs and agent plugin APIs churn; keep
   adapter-specific code small so churn only touches the edges.
5. **Degrade, never crash.** A bad anchor, a broken manifest save, or a CSP block
   shows a message — it doesn't take down the page or the overlay.

## Data flow, end to end

1. Agent edits the frontend and writes `review-manifest.json` (per the
   [agent protocol](./AGENT_PROTOCOL.md)).
2. `reviewport proxy --target …` (or `serve <dir>`) starts, loads + validates the
   manifest, and watches it for changes.
3. For each HTML response, `inject.js` splices in a `<script>` that sets
   `window.__REVIEWPORT__` and boots `overlay.js`.
4. The overlay walks each change, resolves its anchor, and records ✓/✗ in
   `localStorage` (namespaced by manifest `id`).
5. **Export** emits a human- + machine-readable fix-list; the human pastes it back;
   the agent parses the rejected ids, re-fixes, and rewrites the manifest; the
   overlay hot-reloads. Loop closed.

See also: [MANIFEST_SCHEMA.md](./MANIFEST_SCHEMA.md), [ANCHORING.md](./ANCHORING.md),
[DECISIONS.md](./DECISIONS.md).
