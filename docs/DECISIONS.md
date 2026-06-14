# DECISIONS

Architecture/product decisions and their rationale. Append-only; supersede with a new
entry rather than editing history.

## D1 — Positioning: verification, not annotation (2026-06-14)
Every adjacent tool (Vibe Annotations, Agentation, Domscribe, DOM-Review) does the
forward direction (human points → agent changes). reviewport owns the reverse (agent
declares → human verifies). All messaging leads with this category distinction.

## D2 — Product form: layered hybrid, led by a zero-config `npx` tool (2026-06-14)
**Decision:** ship a zero-install `npx` injecting proxy/server first; architect the
engine to be separable; add agent integrations next; defer Vite plugin and browser
extension.
**Why:** the proxy serves *any* dev server (including no-bundler static sites — the
author's own projects are exactly this), `npx` is the lowest-friction trial and a
marketing artifact in itself, and a bundler plugin/extension would narrow the audience
and add churn/CSP cost for a worse experience. The durable asset is the schema +
engine; adapters are thin.

## D3 — Name: `reviewport` (2026-06-14)
Chosen around the "visual verification (視覺化查核)" theme. `review` + `viewport`:
frontend-native vocabulary, npm name free (verified 404), GitHub essentially clean.
Beat `proofview` (formal-proof namespace collision), `verisight` (deepfake/Verisign
baggage), `seechange` (diluted everyday phrase).

## D4 — License: Apache-2.0, not MIT (2026-06-14)
**Decision:** Apache-2.0.
**Why:** reviewport is meant to be adopted as cross-vendor infrastructure (a shared
manifest format consumed by multiple agents and enterprise teams). Apache-2.0's
explicit per-contributor patent grant + retaliation clause is the assurance corporate
adopters need that nobody can later assert a patent over the review-manifest technique
— the thing that actually blocks enterprise adoption. It's the de-facto choice for
agent/protocol OSS (Kubernetes, OpenTelemetry, gRPC, most MCP tooling). Cost is small:
a `NOTICE` file + DCO sign-off. Zero-dependency means no license-compatibility
surprises. MIT's brevity didn't outweigh the missing patent grant for a tool with
standard-setting ambitions.

## D5 — Zero runtime dependencies, enforced (2026-06-14)
The tool uses only `node:` built-ins (proxy, static server, arg parsing, validation).
CI fails if `package.json` gains any runtime dependency. Keeps the supply chain
trivially auditable and install instant; it's also a differentiator vs. extension/
SaaS competitors.

## D6 — The manifest schema is the public API (2026-06-14)
`schemaVersion: 1`. The format — not any one integration — is the thing other tools
build against. It's versioned; changes need maintainer sign-off (CODEOWNERS guards
the schema + protocol docs). At package 1.0 the schema/protocol become a stable
commitment; a breaking change is then a major release.

## D7 — Open question resolutions for v0.x (2026-06-14)
- **Manifest path:** default `./review-manifest.json`, overridable with `--manifest`.
  Multi-agent concurrency for v0.x is single-file, last-writer-wins; per-`task.id`
  namespacing is deferred to a later schema revision.
- **code-marker:** matches existing rendered code text — it does **not** inject
  marker comments into the user's source. (No source pollution; the strategy's
  `// [reviewport:id]` idea is explicitly declined for v0.)
- **Launch integration:** Claude Code is the turnkey integration at launch; the
  agent-agnostic protocol doc + light rules files cover Cline/Cursor/Aider. A second
  turnkey integration is post-launch.

## D8 — Governance: trunk-based, fork-and-PR for outsiders (2026-06-14)
Single protected `main`, nobody pushes directly (incl. maintainers), squash merges,
linear history, Code Owners review required. Outside contributors fork and PR — they
can propose, not merge. Solo-maintainer emergency bypass is documented, not silent.
See [GOVERNANCE.md](../GOVERNANCE.md).
