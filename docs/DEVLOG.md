# DEVLOG

Progress log for reviewport. Newest first.

## 2026-06-14 — Phase 0 + Phase 1 scaffold

- Project born from the DS26 review prototype (`審查app.mjs` / `審查面板.html`): a
  hardcoded-manifest proxy that injected a review sidebar into a VitePress dev site.
- Ran a strategy analysis → positioning as **"the verification half of the AI-frontend
  loop"**, product form = layered hybrid led by a zero-config `npx` tool, name
  `reviewport`, license Apache-2.0. Full strategy in [STRATEGY.md](./STRATEGY.md).
- **Extracted the core** (Phase 0): the manifest is no longer hardcoded.
  - Versioned manifest schema (`schemaVersion: 1`) + zero-dep validator.
  - Generalized the overlay to consume any manifest, with three anchor modes:
    `text`, `code-marker`, `look-here`.
- **Shipped the hero** (Phase 1): zero-dependency `reviewport` CLI.
  - `proxy` (in front of a dev server, with HMR/websocket pass-through),
    `serve` (static folder), `validate`, `init`.
  - Manifest hot-reload.
- Verified end-to-end in a real browser against the bundled example site: all three
  anchor modes highlight correctly, cross-route navigation + state restore works,
  mark/persist works, and the export produces a human- + machine-readable fix-list.
- Added full OSS governance (Apache-2.0, CONTRIBUTING w/ DCO, CoC, GOVERNANCE,
  SECURITY, CODEOWNERS), CI (incl. enforced zero-dependency guard), Pages + Changesets
  release workflows, docs, and the Claude Code + agent-agnostic integrations.

## Roadmap

**Phase 2 — close the loop with AI (next).**
- Polish the Claude Code skill + hooks (auto-emit manifest after edits; `Stop` hook
  launches the overlay). Publish to the Claude Code marketplace.
- Publish the agent-agnostic protocol broadly so Cline/Cursor/Aider users can emit the
  same manifest.

**Phase 3 — expand by thin adapters (demand-driven).**
- `@reviewport/vite-plugin` for native-HMR DX once there's Vite-user pull.
- A bookmarklet for trying it on deployed/staging URLs.
- Anchoring robustness: fuzzy text match, shadow-DOM traversal.

**Pre-launch checklist.**
- [ ] Record the 15s hero GIF (agent → command → walkthrough → export → paste back).
- [ ] Publish `reviewport` 0.1.0 to npm (after `git` history + a real push).
- [ ] Enable GitHub Pages; confirm the live demo URL.
- [ ] Seed 3–5 good-first-issues.
- [ ] Stage launch copy (Show HN / r/ClaudeAI / dev.to / X).
