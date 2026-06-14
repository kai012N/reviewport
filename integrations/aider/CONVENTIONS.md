# reviewport conventions for Aider

Load this with: `aider --read integrations/aider/CONVENTIONS.md` (or add it to your
`.aider.conf.yml` `read:` list).

## After user-visible frontend changes, emit a reviewport manifest

When you finish edits that change what renders (copy, content, CSS/layout, rendered code
samples) and before you stop, write `./review-manifest.json` describing them, so the
user can verify each change in the live UI with reviewport.

- One entry per visible change; skip refactors/config/tests.
- Top level: `{"schemaVersion":1,"agent":"aider","task":"<one line>","routeBase":"","changes":[…]}`
- Each change has a unique `id`, the `route` it renders on, a short `title`, a
  `category`, and an `anchor`. Include `before`/`after`/`files` when known.
- Anchor, most precise first:
  1. `{"mode":"text","value":"<NEW visible text>"}` (add `selector`/`occurrence` if ambiguous)
  2. `{"mode":"code-marker","marker":"<token from the new code line>"}`
  3. `{"mode":"look-here","hint":"<what to look at>","selector":"<element>"}`
- Emit valid JSON.

Then tell the user to run `npx reviewport proxy --target <dev-url>` (or `serve <dir>`),
review, and paste back anything flagged. If they paste back text ending in
`<!-- reviewport:rejected {"ids":[…]} -->`, parse the ids, re-fix, and rewrite the
manifest.

Spec: https://github.com/kai012N/reviewport/blob/main/docs/MANIFEST_SCHEMA.md
