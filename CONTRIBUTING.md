# Contributing to reviewport

Thanks for helping out! reviewport aims to be a small, dependable, **zero-dependency** tool and an **open manifest standard**. That shapes how we work.

## Ground rules

- **Zero runtime dependencies.** This is a hard invariant, enforced in CI: if `package.json` gains a runtime `dependency`, the build fails. Dev/tooling dependencies are fine. If you think you need a runtime dep, open an issue first — there's almost always a `node:` built-in alternative.
- **The manifest schema is the API.** Changes to [`src/schema/manifest.schema.json`](./src/schema/manifest.schema.json) / [`docs/MANIFEST_SCHEMA.md`](./docs/MANIFEST_SCHEMA.md) affect everyone producing or consuming the format. Discuss them in an issue before a PR.
- **Keep the overlay self-contained.** `src/overlay.js` is serialized with `.toString()` and runs in the browser — no imports, no closures over module scope, browser globals only.

## Workflow

1. **Fork** the repo and create a short-lived branch: `feat/…`, `fix/…`, or `docs/…`.
2. Make your change. Add or update tests under `test/`.
3. Run the checks locally:
   ```bash
   node --test          # tests
   node bin/reviewport.js validate examples/static-site/review-manifest.json
   ```
4. Add a changeset describing the change (see below).
5. Open a **pull request** against `main`. Outside contributors push to their fork and open a PR — `main` is protected and only accepts reviewed PRs.

> Internal collaborators also use PRs — nobody pushes directly to `main`. See [GOVERNANCE.md](./GOVERNANCE.md).

## Developer Certificate of Origin (DCO)

We use the [DCO](https://developercertificate.org/) instead of a CLA. It's a one-line statement that you wrote the patch or have the right to submit it. Sign off every commit:

```bash
git commit -s -m "fix: handle https upstreams in proxy"
```

This appends `Signed-off-by: Your Name <you@example.com>` to the commit message. We
recommend enabling the [DCO GitHub App](https://github.com/apps/dco) on the repo so
pull requests are verified automatically.

## Changesets

We release with [Changesets](https://github.com/changesets/changesets). For any user-facing change, run:

```bash
npx changeset
```

…and pick the bump level (patch / minor / major) with a short human-readable summary. Pre-1.0, breaking changes are `minor`; once we hit 1.0, a breaking change to the manifest schema or agent protocol is a `major`.

## Commit style

Conventional-ish prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) are appreciated but not enforced — the changeset is the source of truth for the changelog.

## Reporting bugs / proposing features

Use the issue templates. For anything touching the manifest format or anchoring behavior, include a minimal manifest + a description of the page it runs against.

## Code style

Match the surrounding code. It's plain modern JS (ESM), no build step for the library itself. Comments explain *why*, not *what*.
