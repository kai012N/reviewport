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

## 2026-06-14 — launch-readiness audit + fixes

Ran a multi-agent audit (findings adversarially verified) over the built repo. Fixed every
confirmed issue:

- **[security] serve.js path traversal** — the `startsWith(root)` guard let a sibling dir
  sharing the root as a string prefix (e.g. `public` vs `public.bak`) be reached via
  encoded `..`. Reproduced live (leaked a sibling file). Fixed with a separator-aware check
  and added a regression test. Also bound `proxy`/`serve` to `localhost` (was binding to
  all interfaces).
- **[bug] manifest hot-reload died after atomic-rename saves** — `fs.watch(file)` stayed
  bound to a stale inode. Now watches the parent dir and filters by basename.
- **proxy** no longer injects into `HEAD` responses (was advertising a wrong content-length).
- **cli** validates `--port` (was crashing on `--port abc`, silently truncating `12abc`).
- **inject** guard now matches the exact `<script data-reviewport` tag (a page merely
  mentioning the attribute name was silently skipped).
- **docs** corrected two inaccurate schema claims (`defaults` can't deep-merge
  `anchor.selector`; `status` isn't read/written by the viewer), lowercased the Pages host,
  and replaced the README GIF placeholder with a live-demo CTA.
- Added the [launch kit](./LAUNCH.md) (Show HN / Reddit / Product Hunt / dev.to / X / GIF
  storyboard). Tests: 21 pass.

## 2026-06-14 — one-command agent install

Added `reviewport install <agent>` so users get the integration via npm instead of hand-
copying files into their dotfiles. Grounded in the current docs: Claude Code has no
npm→plugin bridge, so the command writes the skill to `.claude/skills/` (and, with
`--hook`, merges a `Stop` hook into `settings.json` without clobbering); Codex skills go
to `.agents/skills/`; Cline/Cursor/Aider get their rules files. `--global` targets the
home dirs, `--print` is a dry run. Shipped `integrations/` inside the npm package so the
installer's assets travel with it. Publish dry-run: clean 31.9 kB / 26 files. Tests: 27.

`reviewport` is confirmed free on npm (404). **Not published yet** — needs `npm login`
(the maintainer's account); publishing is their action.

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
