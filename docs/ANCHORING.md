# Anchoring: how reviewport finds a change on the page

Anchoring is the genuinely hard, framework-independent core of reviewport. This
documents how each mode resolves, the fallbacks, and the known limits — so you can
write robust anchors and know what to expect.

## Resolution by mode

### `text`
- Walks the DOM with a `TreeWalker` (`SHOW_TEXT`) over `document.body` (or within
  `selector`, if given).
- Skips `<script>`/`<style>`/`<noscript>`, anything inside the reviewport panel, and
  nodes with no client rects (hidden).
- Returns the *parent element* of the first matching text node (or the `occurrence`-th
  match), highlights it with a teal outline, and scrolls it into center view.

### `code-marker`
- Searches `.line`, `pre code`, `pre`, and `code` elements (within `selector` if
  given) for one containing `marker`.
- Prefers a line-level element (`.line`, as emitted by Shiki/Prism/VitePress); if it
  finds one, it also dim-highlights the following non-blank lines of the block.
- Falls back to the nearest containing code element if no `.line` wrapper exists.

### `look-here`
- If `selector` is present, highlights and scrolls to that element.
- Otherwise it's hint-only: the instruction is shown in the panel and the reviewer
  looks manually. (Useful for "the spacing feels right now" style changes.)

## Timing

Highlighting runs ~120 ms after a change is selected, and the current change is
re-highlighted ~700 ms after page load, to give client-rendered content time to
appear. Use **Re-locate / highlight** in the panel to retry on demand (handy for
content that loads late).

## Navigation between routes

When the next change is on a different `route`, reviewport does a full
`location.assign(routeBase + route)`. The page reloads, the overlay re-injects,
restores the saved index from `localStorage`, and re-highlights. This is simple and
robust across MPAs and most client routers. For single-page apps where you don't
want navigation, set `route: "."` to keep everything on the current page.

## When an anchor can't be found

If a `text` or `code-marker` anchor doesn't resolve (the text moved, the agent
re-edited it, content is dynamic), the panel shows a clear **"Couldn't locate this on
the page"** message — including the `files` you listed, so the reviewer can still
check the source. The overlay never crashes on a bad anchor; it degrades.

This is why precise anchors + `files` matter, and why the authoring priority is
`text` > `code-marker` > `look-here`.

## Known limits

- **HMR / re-render churn.** If the agent edits again (or HMR replaces the DOM) after
  the manifest was written, a `text` anchor for the *old* text won't match. Anchor on
  the *new* (`after`) text and regenerate the manifest after edits.
- **CSP.** A strict `Content-Security-Policy` on the upstream can block the injected
  inline `<script>`. For dev servers this is rare; if you hit it, relax CSP in dev or
  use `serve` mode on a built copy.
- **Shadow DOM / iframes.** The `TreeWalker` doesn't pierce shadow roots or iframes
  yet. Components rendered in shadow DOM won't be found by `text`/`code-marker`; use
  `look-here` with a selector that the browser can reach, or anchor on light-DOM text.
- **Exotic whitespace.** Text matching is exact substring; if the rendered text
  collapses or transforms whitespace differently than your `value`, trim it to a
  stable inner fragment.

Improving anchoring robustness (fuzzy text, shadow DOM traversal) is on the
[roadmap](./DEVLOG.md) and a great area to contribute.
