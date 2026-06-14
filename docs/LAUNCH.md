# Launch kit

Ready-to-post copy for reviewport's launch. See [STRATEGY.md](./STRATEGY.md) §8 for the
full go-to-market plan and timing. **All copy is grounded in the actual repo.**

## Pre-post checklist (do these first)

- [ ] **Publish to npm** (`npm publish --access public`, or merge to trigger the release
      workflow). Until then, the `npx reviewport …` commands in this copy won't work —
      lead with `git clone … && npm run demo`, which works today.
- [ ] **Enable GitHub Pages** (Settings → Pages → Source: GitHub Actions) and confirm
      `https://kai012n.github.io/reviewport/` resolves.
- [ ] **Record the 15-second hero GIF** (storyboard below) and embed it in the README +
      X thread. It's the single highest-leverage asset.
- [ ] Pick **one headline number per channel** (the README uses a generic "40 things";
      the article/thread use the true "90 changes" origin figure; the GIF uses the demo's
      "5"). Don't mix them within one post.
- [ ] Seed 3–5 `good first issue`s before posting.

Suggested order/timing (Tue–Thu): Show HN (09–11am ET) → r/ClaudeAI same day →
dev.to article + X thread same day → r/webdev next day → awesome-list PRs → Product Hunt
the following week. Guard the HN/Reddit comments for the first 2–3 hours.

---

## Show HN

**Title** (62 chars):

```
Show HN: Review your AI agent's frontend changes in the live UI
```

**First comment:**

A few weeks ago I had Claude Code do a big cleanup pass on a design-system docs site —
36 pages, built on VitePress. It surfaced 400+ issues and I had it fix 90-ish of them in
one go: copy edits, renamed tokens, restyled components, lines inside rendered code
samples. Then it said "Done."

That's where I hit a wall. A git diff shows you *code*. It doesn't show you *where that
change landed on the rendered page* or whether it actually looks right. Verifying 90
edits meant mentally mapping every diff hunk to a spot in the UI, clicking through 36
pages, and hoping I didn't miss one. I trusted "Done" a couple of times. It wasn't.

So I built reviewport. The idea is to flip the direction every other tool goes. The
existing ones all point forward — human clicks an element, agent changes it. reviewport
owns the reverse: the agent declares what it changed, and you verify each change where it
renders.

How it works:

1. The agent that made the changes also writes a small **change manifest**
   (`review-manifest.json`) — one entry per user-visible change: the route it's on,
   before/after, and an *anchor* describing how to find it on the page. Three anchor
   modes: `text` (visible text, located via a TreeWalker), `code-marker` (a token inside
   a rendered code block), and `look-here` (a CSS selector + a human hint, for CSS/layout
   changes with no text to grab).

2. You run reviewport in front of your existing dev server:
   `npx reviewport proxy --target http://localhost:5173`. It's a **zero-dependency Node
   reverse proxy** — only `node:` built-ins, no Chrome extension, no bundler plugin, no
   SaaS, no account. It injects a review overlay into HTML responses and passes
   everything else (including Vite/webpack HMR websockets) straight through. No dev
   server? `reviewport serve ./public` does the same for a static folder.

3. The overlay walks you through each change — jumps to its route, highlights exactly
   where it landed, and you hit ✓ or ✗. When you're done, **Export fix-list** gives you a
   payload that's both human- and machine-readable:

   ```
   reviewport: these changes still need fixing (1):

   #c-5 [/about.html] Rewrite the mission sentence — expected: …

   <!-- reviewport:rejected {"ids":["c-5"]} -->
   ```

   The lines are for you; the trailing comment lets the agent parse the rejected ids
   deterministically and re-fix them. The manifest hot-reloads, so the overlay updates
   the moment the agent rewrites it. That round-trip — flag in the UI, paste back,
   re-fix — is the whole point.

There's a turnkey Claude Code integration (a skill that emits the manifest after edits,
plus a Stop hook that launches the overlay), and the manifest is an open, versioned
schema with a ~one-paragraph protocol any agent can follow — Cline, Cursor, Aider,
whatever can write a JSON file to disk. reviewport is just the reference viewer.

It's pre-1.0 and Apache-2.0. The CLI and overlay work today; tests pass and I've walked
the full loop in a real browser. There's a 30-second bundled demo
(`git clone … && npm run demo`).

What I most want feedback on is the **manifest format** itself. If this is going to be a
thing multiple agents emit and multiple tools consume, the schema is the part that has to
be right before 1.0 freezes it. Are the three anchor modes enough, or is the brittleness
of anchoring to rendered text/selectors going to bite? How should this handle SPAs and
dynamic routes beyond the `route: "."` escape hatch? Is single-file, last-writer-wins the
wrong call for multiple agents at once? Schema:
https://github.com/kai012N/reviewport/blob/main/docs/MANIFEST_SCHEMA.md

---

## r/ClaudeAI

**Title:** I built a tool that lets you review every frontend change Claude Code makes — right where it renders — then paste the fixes back in one message

When Claude Code finishes a frontend task it says "Done" — but a git diff shows you
*code*, not *where that change landed on the page* or whether it actually looks right.
After it makes 40 edits across a UI, verifying them means mentally mapping every diff hunk
to a spot on the screen. I got tired of that, so I built **reviewport**.

The idea is the reverse of every "click an element → tell the agent to change it" tool.
Here, **the agent declares what it changed, and you walk each change in the live UI** and
mark it ✓ or ✗.

How it works with Claude Code:

1. Drop in the **`reviewport-emit-manifest` skill** (and an optional **Stop hook**). After
   Claude edits your frontend, the skill writes a `review-manifest.json` — one entry per
   user-visible change, with the route and how to find it on the page. The Stop hook just
   prints the one-liner to open the overlay.
2. Run `npx reviewport proxy --target http://localhost:5173` in front of your dev server
   (or `npx reviewport serve ./public` for a static folder). An overlay appears that jumps
   to each change, highlights exactly where it landed, and lets you press `y`/`n`.
3. Click **Export fix-list**. You get something like:

   ```
   reviewport: these changes still need fixing (1):

   #c-5 [/about.html] Rewrite the mission sentence — expected: …

   <!-- reviewport:rejected {"ids":["c-5"]} -->
   ```

   Paste that back into Claude. The skill recognizes the trailing comment, parses the
   rejected ids deterministically, re-fixes just those, and rewrites the manifest
   (reviewport hot-reloads it). Loop closed.

A few things I cared about: **zero install, zero dependencies** (a tiny Node proxy — no
extension, no bundler plugin, no SaaS); an **agent-agnostic, versioned schema** (the
Claude Code skill+hook is turnkey, but there are ~25-line rules for Cline/Cursor/Aider
and a plain protocol doc for anything else); and it's **complementary** to Percy/Chromatic
— those pixel-diff snapshots, this verifies *these specific agent changes, where they
rendered, with a human in the loop.*

Apache-2.0, pre-1.0. **Feedback on the manifest format is exactly what I'm after.**
Repo: https://github.com/kai012N/reviewport · `npm run demo` in the clone shows the whole
loop on a sample site.

---

## r/webdev

**Title:** Show & tell: a zero-dependency tool to verify AI-generated frontend changes in the live UI (framework-agnostic, no extension)

Sharing a small open-source tool I built to scratch my own itch.

A diff tells you what code changed. It doesn't tell you *where that change rendered* or
whether it looks right. That gap got painful once I started using coding agents that make
dozens of frontend edits at once. **reviewport** is my attempt at the verification half of
that loop.

The flow:
- A `review-manifest.json` describes each change — the route it's on, what changed, and
  how to find it on the page (visible text, a line in a rendered code block, or a CSS
  selector + a hint).
- You run it in front of whatever dev server you already have:
  `npx reviewport proxy --target http://localhost:5173`. For a plain folder of HTML/CSS/JS:
  `npx reviewport serve ./public`.
- An overlay injects into the page, navigates to each change, highlights where it landed,
  and you mark ✓/✗. Then you export the flagged list.

Implementation notes that might interest this sub:
- **Zero runtime dependencies** — a CI guard fails the build if `package.json` ever gains
  one. It's a `node:http`/`https` reverse proxy that does HTML injection.
- **Framework-agnostic by construction** — because it's a proxy doing string injection
  rather than a bundler plugin or extension, it works the same in front of Vite, Next, a
  static site, anything. (Honest caveat: HTML injection over a proxy can be finicky with
  strict CSP or some SSR streaming setups — documented and on the roadmap.)
- The manifest is an **open, versioned schema** — reviewport is just the reference viewer.

Apache-2.0 and pre-1.0, so the schema may still shift — pin a version. Repo + docs:
https://github.com/kai012N/reviewport — mostly looking for sanity checks on the manifest
format and whether this is useful to anyone else.

---

## Product Hunt

**Tagline** (48 chars): `Review your AI's frontend changes in the live UI`

**Topic tags:** Developer Tools · Artificial Intelligence · Open Source

**First comment:**

Hey Product Hunt 👋 When an AI coding agent finishes a frontend task, it says "Done" — but
a diff only shows you *code*, not where the change landed on the page or whether it looks
right. **reviewport** is the missing other half: the agent declares what it changed, and
you walk each change *in your live UI*, mark it ✓ or ✗, and send the flagged ones straight
back.

What makes it different:
- **Verification, not annotation** — it reviews what the agent already did.
- **Truly zero-install / zero-dependency** — a tiny Node proxy
  (`npx reviewport proxy --target <your-dev-url>`). No extension, no bundler plugin, no
  account. Works in front of any dev server.
- **Agent-agnostic** — an open, versioned manifest schema, with a turnkey Claude Code
  skill + hook and ~25-line rules for Cline/Cursor/Aider.
- **Closes the loop** — one-click export round-trips back to the agent, machine-readable
  so it can re-fix deterministically.

Apache-2.0, pre-1.0. Try `npx reviewport init`, or clone and run `npm run demo`. Would
love your feedback on the manifest format. Repo: https://github.com/kai012N/reviewport

---

## Awesome-list PR blurbs

**awesome-claude-code:**
> **[reviewport](https://github.com/kai012N/reviewport)** — Zero-dependency CLI that
> injects a review overlay into your live dev server so you walk every frontend change
> Claude Code made, approve or flag each where it renders, and paste the fix-list back.
> Ships a turnkey skill + Stop hook.

**awesome-claude-skills:**
> **[reviewport-emit-manifest](https://github.com/kai012N/reviewport/tree/main/integrations/claude-code)**
> — After Claude Code edits your frontend, this skill writes an open, versioned
> `review-manifest.json` so you can verify each change in the live UI and round-trip the
> flagged ones back. Zero-dependency viewer; agent-agnostic schema.

---

## dev.to / Medium article outline

**Working title:** *I let an AI make 90 changes to my site. Then I built a way to actually review them.*
**Subtitle:** A git diff shows you code. It doesn't show you whether the change actually looks right where it landed. So I built the missing half of the human-in-the-loop.
**Tags:** `#ai` `#webdev` `#opensource` `#claude` `#tooling`

1. **The "Done." that wasn't** — the real origin: an agent reworked a 36-page site, 90+
   changes (copy, pricing, CSS, code samples). It says "Done." Some changes are great,
   some subtly wrong, a few never happened. Which ones?
2. **Why the diff is the wrong surface** — a diff answers "what code changed"; review needs
   "where did it land, does it look right?" For frontend those are different questions.
3. **Everyone built the forward arrow. Nobody built the reverse.** — forward = human points,
   agent changes. The unbuilt half = agent declares, human verifies in the live UI.
4. **The idea: make the agent describe its own work** — introduce the change manifest; show
   the one-glance JSON example. The agent is the cheapest, most accurate place to describe
   the change.
5. **The loop, end to end** — agent edits → emits manifest → reviewport overlays your live
   site → walk each change (✓/✗) → export the ✗ list → paste back → repeat. Progress
   persists in localStorage.
6. **The money shot: closing the loop** — show the literal export payload incl. the
   `<!-- reviewport:rejected … -->` comment; the agent parses it and re-fixes exactly those.
7. **How I anchor a change to a pixel (the hard part)** — the three anchor modes and the
   priority; the honest "couldn't locate → show the source files" fallback.
8. **Zero-install, zero-dependency, on purpose** — the proxy, HMR passthrough, the
   CI-enforced zero-dep invariant; the two commands.
9. **Try the whole loop in 30 seconds** — `git clone … && npm run demo`; link the live demo.
10. **Where it fits (and where it doesn't)** — complementary to Percy/Chromatic; open schema,
    reference viewer; agent integrations.
11. **Status & the ask** — pre-1.0, Apache-2.0 (deliberate patent grant); the real ask is
    feedback on the manifest format.

---

## X / Twitter launch thread

**1** (attach the hero GIF)
> My AI agent just made 90 changes to my site and said "Done."
>
> A git diff shows you the *code*. It doesn't show you whether the change actually looks right where it landed.
>
> So I built reviewport: walk every change in the live UI, flag it, send the fixes back. 🧵

**2**
> Every AI-UI tool today points one way: you click an element → the agent changes it.
> Nobody built the reverse — the part you actually need after the agent runs: the agent declares what it changed, and you verify each one where it renders.

**3**
> The trick: the agent that made the changes also describes them.
> It writes a tiny review-manifest.json — one entry per visible change: the route, before → after, and how to find it on the page. Open, versioned schema. Any agent can emit it.

**4**
> Then one command, zero install:
> npx reviewport proxy --target http://localhost:5173
> It proxies your existing dev server and injects a review sidebar. No extension. No SaaS. No project changes. HMR still works. No dev server? `serve` a static folder.

**5**
> The sidebar auto-jumps to each change's route and highlights exactly where it landed — a copy edit, a price, a line inside a code block, a restyled button.
> You hit ✓ or ✗ (or y / n). Arrow keys to move. Progress survives a refresh.

**6** (the money shot)
> Here's the part nobody ships: Export fix-list.
> You get something readable for you AND machine-readable for the agent:
>
> #c-5 [/about.html] Rewrite the mission sentence — expected: …
> <!-- reviewport:rejected {"ids":["c-5"]} -->
>
> Paste it back. The agent re-fixes exactly those. Loop closed.

**7**
> Honest bits:
> • Truly zero runtime deps — enforced by a test, not a promise
> • When it can't locate a change, it says so + shows the source file (no fake green checks)
> • Complementary to Percy/Chromatic — they pixel-diff snapshots; this verifies *these* agent changes, in place

**8** (CTA)
> Try the full loop in 30s:
> git clone https://github.com/kai012N/reviewport
> npm run demo
>
> Pre-1.0 and Apache-2.0 (with a patent grant — adopt it freely). I most want feedback on the manifest format. If agents are going to emit this, let's make it the one you'd want to consume. ⭐

---

## 15-second hero GIF storyboard

One continuous take, ~15s, ~8 shots. Lower-third captions. Brand teal `#00a19b`, dark
header `#12393b`. Record against `npm run demo` (≥1280px viewport so the 340px sidebar
doesn't cover the highlighted content). Linger half a beat on the paste-back (shot 8) —
that's the differentiator.

| # | Time | On screen | Caption |
|---|------|-----------|---------|
| 1 | 0.0–2.0s | Agent terminal printing `Wrote review-manifest.json (5 changes).` | "Your agent just changed 5 things. 'Done.'" |
| 2 | 2.0–3.5s | Type + enter: `npx reviewport serve examples/static-site --open` | "One command. Zero install." |
| 3 | 3.5–5.5s | Browser opens; teal sidebar slides in, "1 / 5", first change card | "It overlays your live site." |
| 4 | 5.5–7.5s | Page scrolls; hero headline gets teal highlight; click **✓ Looks right** | "Walk each change, right where it renders." |
| 5 | 7.5–9.5s | Press `→`; navigate to /about.html; rewritten sentence highlights, looks off | "Jump to the next. ✓ or ✗ in a second." |
| 6 | 9.5–11.0s | Click **✗ Needs fix**; counter ticks "Needs fix 1" | "Flag what's wrong." |
| 7 | 11.0–13.0s | Click **Export fix-list**; toast "Copied 1 item(s)"; flash the payload | "Export the fix-list →" |
| 8 | 13.0–15.0s | Cut to terminal; paste payload; agent re-fixes c-5; hold on logo + repo URL | "…paste it back. The agent re-fixes exactly those." |

---

## Metrics to watch

GitHub stars (week-1: 100 ok / 500 strong / 1k+ breakout); HN first-hour upvotes + whether
comments discuss the manifest format; referrer split (double down on what works);
**activation** (npx runs, demo depth) over vanity stars; **round-trip adoption** (how many
agents have working integrations; whether any external tool emits our schema) — the leading
indicator for the standard play.
