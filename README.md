<div align="center">

# reviewport

### Review your AI agent's frontend changes in the live UI — then send the fixes back.

Your agent just changed 40 things across your UI. **reviewport** walks you through every one — right where it renders — so you approve or flag each in seconds, then exports the fix-list straight back to the agent.

[![npm](https://img.shields.io/npm/v/reviewport.svg)](https://www.npmjs.com/package/reviewport)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](./package.json)

[Live demo](https://kai012n.github.io/reviewport/) · [Manifest schema](./docs/MANIFEST_SCHEMA.md) · [Agent protocol](./docs/AGENT_PROTOCOL.md) · [繁體中文](./README.zh-TW.md)

</div>

### ▶ [Try the live demo →](https://kai012n.github.io/reviewport/)

The overlay you see in the demo is the real product. _(A short screencast of the full loop — agent finishes → one command → walk each change → flag one → paste the fix-list back — will land here.)_

---

## The problem

A git diff shows you **code**. It doesn't show you **where that change landed in the rendered page**, or whether it actually looks right. When an AI agent makes dozens of edits across a frontend, verifying them means mentally mapping every diff hunk to a spot on the screen — or just trusting "Done." (It often isn't.)

Existing tools all point **forward** — *human clicks an element → agent changes it*. reviewport owns the **reverse**, the part nobody built: **the agent declares what it changed, and you verify each change in the live UI.**

## How it works

```
agent edits code  →  emits a change manifest  →  reviewport overlays your live site
                                                        ↓
        you walk each change: jump to it, see it highlighted, ✓ or ✗
                                                        ↓
                 export the ✗ list  →  paste back to the agent  →  repeat
```

A small **change manifest** (`review-manifest.json`) describes each edit: the route it's on, what changed, and how to find it on the page. reviewport injects a review overlay into your dev server, navigates to each change, highlights exactly where it landed, and lets you mark it. The export is both human-readable **and** machine-readable, so the agent can re-act on it deterministically.

## Quickstart (zero install)

You already run a dev server. Point reviewport at it:

```bash
# 1. create a starter manifest (or have your agent emit one — see below)
npx reviewport init

# 2. run reviewport in front of your dev server
npx reviewport proxy --target http://localhost:5173 --open
```

Open the proxied URL and the review overlay appears. **No app to download, no project changes, no extension, no account.**

No dev server (a plain folder of HTML/CSS/JS)? Serve it directly:

```bash
npx reviewport serve ./public --open
```

## Try it in 30 seconds (bundled demo)

Want to see the full loop before wiring it into your own project? The repo ships a tiny sample site + manifest:

```bash
git clone https://github.com/kai012N/reviewport.git
cd reviewport
npm run demo            # serves examples/static-site with the overlay, opens your browser
```

Then, in the overlay that appears on the right:

1. **Walk the changes** — use `Next →` / `← Prev` (or the arrow keys). reviewport jumps to each change's route and **highlights exactly where it landed** — a copy edit, a price, a line inside a code block, a restyled button.
2. **Judge each one** — click **✓ Looks right** or **✗ Needs fix** (or press `y` / `n`). Your progress is saved in the browser.
3. **Send fixes back** — click **Export fix-list**. You get a payload like:

   ```
   reviewport: these changes still need fixing (1):

   #c-5 [/about.html] Rewrite the mission sentence — expected: …

   <!-- reviewport:rejected {"ids":["c-5"]} -->
   ```

   Paste that back into your agent. The human-readable lines tell *you* what's left; the trailing comment lets the *agent* parse the rejected ids deterministically and re-fix them.

That's the whole product: **see each change where it renders → approve or flag → round-trip the rejects.**

## Let your agent emit the manifest

The point is that **the agent that made the changes also describes them.** Install the integration with one command — no copying files into your dotfiles:

```bash
npx reviewport install claude     # writes the skill to .claude/skills/ (add --hook for the Stop hook)
npx reviewport install codex      # writes the skill to .agents/skills/
npx reviewport install cursor     # or: cline · aider
#   add --global to install for all your projects (~/.claude, ~/.agents)
#   add --print for a dry run
```

| Agent | Command | Writes to |
|---|---|---|
| Claude Code | `npx reviewport install claude` | `.claude/skills/reviewport-emit-manifest/SKILL.md` (+ `--hook` → a `Stop` hook in `.claude/settings.json`) |
| Codex | `npx reviewport install codex` | `.agents/skills/reviewport-emit-manifest/SKILL.md` |
| Cursor | `npx reviewport install cursor` | `.cursor/rules/reviewport.mdc` |
| Cline | `npx reviewport install cline` | `.clinerules` |
| Aider | `npx reviewport install aider` | `reviewport-conventions.md` |

Add `--global` to install into your home config (`~/.claude`, `~/.agents`) for every project; `--print` for a dry run.

After installing, the agent writes `review-manifest.json` automatically when it edits your frontend. Under the hood each target is just files in the right place:

- **Claude Code** → a skill in `.claude/skills/` (+ an optional `Stop` hook that launches the overlay).
- **Codex** → a skill in `.agents/skills/`.
- **Cline / Cursor / Aider / any agent** → a small rules file, or just point your agent at [docs/AGENT_PROTOCOL.md](./docs/AGENT_PROTOCOL.md). The contract is simple: *before handing back, write one manifest entry per user-visible change to `./review-manifest.json`.*

The source for every integration lives in [integrations/](./integrations/) if you'd rather copy it by hand.

The manifest is an **open, versioned schema** — see [docs/MANIFEST_SCHEMA.md](./docs/MANIFEST_SCHEMA.md). reviewport is the reference viewer; anyone can produce or consume the format.

## The manifest, in one glance

```json
{
  "schemaVersion": 1,
  "task": "Polish the marketing site",
  "changes": [
    {
      "id": "c-1",
      "route": "/",
      "title": "Sharpen the hero headline",
      "category": "copy",
      "before": "Build your frontend with confidence",
      "after": "Ship your frontend with confidence",
      "anchor": { "mode": "text", "value": "Ship your frontend with confidence" }
    }
  ]
}
```

Three ways to point at a change (`anchor.mode`):

| mode | finds | use for |
|---|---|---|
| `text` | visible text on the page (TreeWalker) | copy, labels, content |
| `code-marker` | a line inside a rendered code block | docs, snippets, examples |
| `look-here` | a CSS selector + a human hint | CSS / layout / visual changes with no text |

## Commands

```
reviewport proxy --target <url> [--port 6173] [--manifest <path>] [--route-base <p>] [--open]
reviewport serve <dir>          [--port 6173] [--manifest <path>] [--open]
reviewport install <agent>      [--global] [--hook] [--dir <path>] [--force] [--print]
reviewport validate [manifest]
reviewport init [manifest]
```

The manifest is hot-reloaded — when your agent rewrites it, the overlay updates.

## Why reviewport

- **Verification, not annotation.** The only tool organized around reviewing what the agent *already did*.
- **Truly zero-install & zero-dependency.** A tiny Node proxy — no Chrome extension, no bundler plugin, no Storybook, no SaaS. Works in front of *any* dev server.
- **Agent-agnostic by design.** An open manifest schema + a reference Claude Code integration. Not locked to one vendor.
- **In the rendered UI.** Sees where the change landed, not just the diff.
- **Closes the loop.** One-click export back to the agent — human-in-the-loop, completed.

reviewport is **complementary** to visual-regression tools (Percy, Chromatic): they pixel-diff snapshots; reviewport verifies *these specific agent changes, where they landed, with a human in the loop.*

## Status

Pre-1.0 (`0.x`). The CLI and overlay are working today; the manifest schema and agent protocol are stabilizing toward `1.0`, at which point they become a stable, versioned commitment. Expect small breaking changes before then — pin a version. Feedback on the **manifest format** is especially welcome ([open an issue](https://github.com/kai012N/reviewport/issues)).

See the [roadmap](./docs/DEVLOG.md) and [architecture](./docs/ARCHITECTURE.md).

## Contributing

PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) (we use DCO sign-off and Changesets) and the [Code of Conduct](./CODE_OF_CONDUCT.md). Good first issues are labeled in the tracker.

## License

[Apache-2.0](./LICENSE) © 2026 kai012N. The patent grant is deliberate: reviewport is meant to be safe to adopt as shared, cross-agent infrastructure.
