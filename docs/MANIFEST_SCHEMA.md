# Change manifest schema

The **change manifest** is the heart of reviewport: a JSON document an AI agent (or
a human) writes to describe a batch of frontend changes for review. reviewport is
the reference viewer; the format is open, so anything can produce or consume it.

- Machine-readable JSON Schema: [`src/schema/manifest.schema.json`](../src/schema/manifest.schema.json)
- Runtime validator (zero-dep): [`src/schema/validate.js`](../src/schema/validate.js) — `reviewport validate <file>`
- Default filename: `review-manifest.json` in the project root

## Top level

| field | type | required | description |
|---|---|---|---|
| `schemaVersion` | integer | ✅ | Format version. Currently `1`. |
| `changes` | array | ✅ | The changes to review, in walk-through order. |
| `id` | string | | Stable id for the session. Namespaces `localStorage` so two projects don't clobber each other's progress. |
| `generatedAt` | string | | ISO-8601 timestamp. |
| `agent` | string | | Who produced it, e.g. `claude-code`, `cline`, `cursor`, `aider`, `human`. |
| `task` | string | | Short description of the task the agent did. |
| `baseUrl` | string | | Hint for where the dev site is served. |
| `routeBase` | string | | Path prefix prepended to every `change.route` (e.g. `/docs`). Default `""`. |
| `defaults` | object | | Shallow-merged into every change (change wins), **one level deep**. Handy for a shared optional top-level field like `files` or `severity`. It cannot supply nested keys (e.g. `anchor.selector`) or override required fields. |

Unknown top-level keys are **ignored**, never rejected — manifests are
forward-compatible.

## A change

| field | type | required | description |
|---|---|---|---|
| `id` | string | ✅ | Unique within the manifest. Drives accept/reject state and the export round-trip. |
| `route` | string | ✅ | Path the change lives on, appended to `routeBase`. Use `"."` for "current page, don't navigate" (single-page apps, demos). |
| `title` | string | ✅ | Short human label. |
| `category` | string | ✅ | Free-form. Suggested: `copy`, `typo`, `structure`, `naming`, `css`, `layout`, `a11y`, `config`, `content`, `semantics`, `other`. Unknown values are allowed (a warning at most). |
| `anchor` | object | ✅ | How to locate the change on the page. See below. |
| `severity` | string | | `info` \| `minor` \| `major`. |
| `description` | string | | Longer explanation. |
| `files` | string[] | | Source files touched. Shown in the "couldn't locate" fallback. |
| `before` | string | | Previous value (rendered struck-through). |
| `after` | string | | New value (rendered highlighted). |
| `status` | object | | `{ "state": "pending" \| "approved" \| "rejected" }`. An optional carried hint. The reference viewer does **not** currently read or write it — review state lives in the browser's `localStorage` — so don't expect it to round-trip. |

## Anchor (how to find the change)

`anchor` is a discriminated union on `mode`. When authoring, prefer in this order:
**`text` > `code-marker` > `look-here`** — more precise anchors give a better
review experience.

### `text`
Finds visible text on the page via a `TreeWalker`.

```json
{ "mode": "text", "value": "Ship your frontend with confidence", "occurrence": 1, "selector": ".hero" }
```
- `value` (required) — a unique-ish visible substring.
- `occurrence` (optional) — 1-based, if the text appears more than once.
- `selector` (optional) — CSS scope to disambiguate.

### `code-marker`
Marks the line(s) of a rendered code block that contain a token.

```json
{ "mode": "code-marker", "marker": "process.env.ACME_KEY", "lineHint": "the new Acme({…}) line", "selector": "pre" }
```
- `marker` (required) — a substring present in the rendered code.
- `lineHint` (optional) — human hint shown in the panel.
- `selector` (optional) — CSS scope.

### `look-here`
For changes with no text anchor (CSS, layout, visual). Shows a hint; optionally
highlights a selector.

```json
{ "mode": "look-here", "hint": "the primary CTA should be teal and pill-shaped", "selector": ".cta" }
```
- `hint` (required) — what to look at.
- `selector` (optional) — element to highlight/scroll to.

## Full example

```json
{
  "schemaVersion": 1,
  "id": "acme-demo",
  "generatedAt": "2026-06-14T00:00:00Z",
  "agent": "claude-code",
  "task": "Polish the Acme marketing site",
  "routeBase": "",
  "changes": [
    {
      "id": "c-1",
      "route": "/",
      "title": "Sharpen the hero headline",
      "category": "copy",
      "severity": "minor",
      "before": "Build your frontend with confidence",
      "after": "Ship your frontend with confidence",
      "anchor": { "mode": "text", "value": "Ship your frontend with confidence" }
    },
    {
      "id": "c-3",
      "route": "/",
      "title": "Read the API key from an env var",
      "category": "structure",
      "files": ["index.html"],
      "before": "apiKey: 'sk-1234'",
      "after": "apiKey: process.env.ACME_KEY",
      "anchor": { "mode": "code-marker", "marker": "process.env.ACME_KEY" }
    }
  ]
}
```

A working copy lives at
[`examples/static-site/review-manifest.json`](../examples/static-site/review-manifest.json).

## Versioning

`schemaVersion: 1` is the current contract. Pre-1.0 of the package, the schema may
change in minor releases (we'll note it in the changelog). At package `1.0`, the
schema and the [agent protocol](./AGENT_PROTOCOL.md) become a stable, versioned
commitment; a breaking change becomes a `major` release.
