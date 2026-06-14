---
name: reviewport-emit-manifest
description: Use after making user-visible frontend changes (copy, content, CSS/layout, rendered code samples) so the human can verify them in the live UI. Writes a reviewport change manifest to ./review-manifest.json, one entry per visible change, and handles the rejected-list round-trip when the human pastes one back.
---

# Emit a reviewport change manifest

When you have finished making **user-visible frontend changes** and are about to hand
control back to the human, write a change manifest to `./review-manifest.json` so they
can review each change in the live UI with [reviewport](https://github.com/kai012N/reviewport).

## When to use

Use this whenever your edits changed what a person sees in the rendered page: copy/text,
prices/content, labels, rendered code samples in docs, CSS/layout, added/removed UI.
Skip it for pure refactors, build config, tests, or comments that don't change render
output.

## What to write

Write valid JSON to `./review-manifest.json` following this shape (full spec: the
`reviewport` repo `docs/MANIFEST_SCHEMA.md`):

```json
{
  "schemaVersion": 1,
  "generatedAt": "<ISO-8601 now>",
  "agent": "<your agent name, e.g. claude-code or codex>",
  "task": "<one line: what you were asked to do>",
  "routeBase": "",
  "changes": [
    {
      "id": "c-1",
      "route": "/path/where/it/renders",
      "title": "<short human label>",
      "category": "copy|typo|structure|naming|css|layout|a11y|config|content|semantics|other",
      "severity": "info|minor|major",
      "files": ["src/..."],
      "before": "<old value, if known>",
      "after": "<new value, if known>",
      "anchor": { "mode": "text", "value": "<the NEW visible text>" }
    }
  ]
}
```

One entry per visible change. Give each a unique `id` (`c-1`, `c-2`, …).

## Choosing the anchor (priority: text > code-marker > look-here)

- **Changed visible text** → `{ "mode": "text", "value": "<new text>" }`. Add
  `"selector"` or `"occurrence"` if the text appears more than once.
- **Changed a line in a rendered code block** →
  `{ "mode": "code-marker", "marker": "<token from the new line>" }`.
- **CSS / layout / visual change with no text to grab** →
  `{ "mode": "look-here", "hint": "<what to look at>", "selector": "<element>" }`.

Set `route` to the path where the change renders (`routeBase` for a sub-path deploy;
`"."` for a single-page app where you don't want navigation). Always fill `before`/
`after` when you know them, and list `files` so the reviewer can find the source if an
anchor doesn't resolve.

## After writing it

Tell the human, briefly:

> Wrote `review-manifest.json` (N changes). Review them in the live UI with:
> `npx reviewport proxy --target <their-dev-url>` (or `serve <dir>` for a static site),
> then paste back anything you flag.

If a dev server URL is known from the session, include it.

## Handling the round-trip

If the human pastes back a reviewport export, it ends with a machine-readable line:

```
<!-- reviewport:rejected {"ids":["c-3","c-7"]} -->
```

1. Parse that comment to get the exact rejected `ids` (the lines above it are for the
   human).
2. Look those ids up in the manifest you wrote to recover context.
3. Re-fix each, then **rewrite `./review-manifest.json`** (reviewport hot-reloads it).
4. Tell the human to re-review those entries.

Always produce **valid JSON** and validate your assumptions against
`docs/MANIFEST_SCHEMA.md`. If unsure whether a change is user-visible, include it — an
extra entry is cheap; a missed change defeats the purpose.
