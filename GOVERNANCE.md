# Governance

reviewport is currently a **solo-maintainer** project with an explicit path to
shared maintenance. This document says who can do what, so the rules are the same
whether you're the maintainer or a first-time contributor.

## Roles

- **Maintainer(s)** — listed in [MAINTAINERS.md](./MAINTAINERS.md). Can review and
  merge PRs, cut releases, and administer the repo. Today: `@kai012N`.
- **Contributors** — anyone who opens an issue or PR. You do not need write access
  to contribute; fork-and-PR is the path for everyone outside the maintainer team.

## Branching & merge permissions

- `main` is the single, always-releasable branch (**trunk-based**). No `develop`,
  no long-lived release branches.
- **Nobody pushes directly to `main`** — not even maintainers. All changes land via
  pull request. This is enforced by a branch ruleset.
- Work happens on short-lived branches (`feat/…`, `fix/…`, `docs/…`) and merges via
  **squash** to keep history linear.
- **Outside contributors** work from a fork and open a PR. They can propose anything;
  they cannot merge. Merge is a maintainer action.

### Branch ruleset on `main`

- Require a pull request before merging
- Require at least **1 approving review**
- Require review from **Code Owners** (see `.github/CODEOWNERS`)
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass and branches to be up to date
- Require linear history
- Block force-pushes and deletions
- Require conversation resolution before merging

> While the project has a single maintainer, the "1 approving review" rule means a
> maintainer's own PRs need a self-review/approval step; the moment a second
> maintainer joins, genuine peer review is in force with no policy change.

### Solo-maintainer emergency bypass

If the sole maintainer must merge an urgent fix without a second reviewer, they may
use an admin bypass **only** for: security hotfixes, build-breaking reverts, or
release-blocking CI fixes. Any bypass must be noted in the PR description. This
exception exists so the policy above is never silently violated.

## Decision making

- Routine changes: lazy consensus on the PR/issue.
- Changes to the **manifest schema** or **agent protocol** (the public contract):
  require an issue with a short rationale and a maintainer sign-off before
  implementation, because other tools build against them.
- Disagreements are resolved by the maintainer(s); as the team grows we'll move to
  a lightweight RFC process.

## Becoming a maintainer

Sustained, high-quality contributions (code review, triage, good PRs) over time. A
current maintainer nominates; existing maintainers agree. New maintainers are added
to [MAINTAINERS.md](./MAINTAINERS.md) and `CODEOWNERS`.

## Releases

See [CONTRIBUTING.md](./CONTRIBUTING.md#changesets). Releases are cut from `main`
via Changesets and published to npm with provenance.
