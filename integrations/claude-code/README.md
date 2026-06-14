# reviewport × Claude Code

Make Claude Code emit a [reviewport](https://github.com/kai012N/reviewport) change
manifest after it edits your frontend, so you can verify each change in the live UI and
paste fixes back.

This integration has two parts:

1. **Skill** — `reviewport-emit-manifest` teaches Claude *when* and *how* to write
   `review-manifest.json` (the schema, anchor priority, and the rejected-list
   round-trip). This is the part that does the work.
2. **Stop hook** *(optional)* — after a turn that produced a manifest, prints a one-line
   reminder with the exact command to open the review overlay.

## Install

### Option A — as a plugin (skill + hook together)

If you use a Claude Code plugin marketplace, point it at this folder
(`integrations/claude-code/`), or copy the folder into your plugins directory. It
contains `.claude-plugin/plugin.json`, the skill, and the hook.

### Option B — skill only (simplest)

Copy the skill into your project (or `~/.claude/skills/` for all projects):

```bash
mkdir -p .claude/skills
cp -r /path/to/reviewport/integrations/claude-code/skills/reviewport-emit-manifest .claude/skills/
```

Claude auto-loads skills from `.claude/skills/`. That's enough to get manifests.

### Option C — add the Stop hook manually

If you didn't install the plugin but want the reminder, paste
[`hooks/settings.snippet.json`](./hooks/settings.snippet.json) into your
`.claude/settings.json` (project) or `~/.claude/settings.json` (global), fixing the
absolute path to `hooks/reviewport-stop.sh`.

## Use it

1. Ask Claude to make some frontend changes as usual.
2. When it's done, it writes `./review-manifest.json` (the skill triggers on
   user-visible frontend edits). With the hook, you'll also see the command to run.
3. Review:
   ```bash
   npx reviewport proxy --target http://localhost:5173   # your dev server
   # or, for a static folder:
   npx reviewport serve ./public
   ```
4. Walk each change, flag what's wrong, click **Export fix-list**, and paste it back
   into Claude. The skill recognizes the `<!-- reviewport:rejected … -->` line, re-fixes
   those ids, and rewrites the manifest.

## Notes

- The skill is the durable part; it carries the full
  [agent protocol](../../docs/AGENT_PROTOCOL.md). If Claude Code's plugin/hook format
  shifts, the skill still works on its own (Option B).
- Want this for **Cline / Cursor / Aider**? See the sibling folders in
  [`integrations/`](../).
