# Agent protocol

This is the contract any AI coding agent follows to work with reviewport. It is
deliberately tiny: **the agent writes a file.** No SDK, no API, no plugin is
required — anything that can write JSON to disk can participate.

## The contract

> When you finish making frontend changes and before you hand control back to the
> human, write a [change manifest](./MANIFEST_SCHEMA.md) to `./review-manifest.json`
> describing **one entry per user-visible change**.

That's it. The human then runs `reviewport proxy`/`serve`, reviews each change in
the live UI, and may paste back a fix-list (see *Round-trip* below).

## What counts as a "user-visible change"

Include a change when a person looking at the rendered page could see a difference:
copy/text, prices/content, labels, rendered code samples in docs, CSS/layout, added
or removed UI. Skip pure refactors, build config, tests, and comments that don't
change what renders.

## How to write good anchors

For each change, choose the most precise anchor (priority **`text` > `code-marker`
> `look-here`**):

- Changed visible text → `text` with a unique `value` (the *new* text). Add a
  `selector` or `occurrence` if it's ambiguous.
- Changed a line in a rendered code block → `code-marker` with a token from the new
  line.
- A CSS/visual change with no text to grab → `look-here` with a `hint` and, if you
  can, a `selector` for the affected element.

Always set `route` to the path where the change renders (use `routeBase` for a
sub-path deploy, or `route: "."` for single-page apps). Fill `before`/`after` when
you have them — it makes the review instant. Add `files` so the "couldn't locate"
fallback can point the reviewer at the source.

## Round-trip (handling rejections)

When the reviewer flags changes, the overlay's **Export fix-list** produces a
payload like:

```
reviewport: these changes still need fixing (2):

#c-3 [/uikit/modals] popup title wrong
   → make it bold and use the brand teal
#c-7 [/pricing] button overlaps on mobile — expected: …

<!-- reviewport:rejected {"ids":["c-3","c-7"],"notes":{"c-3":"make it bold and use the brand teal"}} -->
```

When you (the agent) receive this:

1. Parse the trailing `<!-- reviewport:rejected {…} -->` comment to get the exact
   `ids`. The lines above are for the human; the comment is for you.
2. If a `notes` map is present, **treat each note as the reviewer's specific instruction
   for how to fix that change** (it overrides your own guess). A `→ …` line in the
   human-readable part is the same note. Notes are JSON strings — `<` and `>` arrive
   `<`/`>`-escaped, which `JSON.parse` decodes for you.
3. Look those ids up in the manifest you wrote to recover full context.
4. Re-fix them (following the notes), then **rewrite `review-manifest.json`** (the
   overlay hot-reloads).
5. Tell the human to re-review just those entries.

## Minimal rules to paste into your agent

Per-agent starter files live in [`../integrations/`](../integrations/):

- **Claude Code** — a full skill + hooks (turnkey): [`../integrations/claude-code/`](../integrations/claude-code/)
- **Cline** — [`../integrations/cline/.clinerules`](../integrations/cline/.clinerules)
- **Cursor** — [`../integrations/cursor/reviewport.mdc`](../integrations/cursor/reviewport.mdc)
- **Aider** — [`../integrations/aider/CONVENTIONS.md`](../integrations/aider/CONVENTIONS.md)

If your agent isn't listed, give it this document — the contract is the same.

## Why a file, not an API

A fixed-path JSON file is the lowest common denominator: it works for every agent,
needs no network, leaves an artifact you can inspect/commit/diff, and keeps
reviewport decoupled from any single vendor's plugin API (which churns). The manifest
is the standard; the viewer and the integrations are just convenient ends of it.
