# Agent integrations

reviewport works with any agent that can write a JSON file. The contract is in
[`docs/AGENT_PROTOCOL.md`](../docs/AGENT_PROTOCOL.md): *after making user-visible
frontend changes, write a [change manifest](../docs/MANIFEST_SCHEMA.md) to
`./review-manifest.json`.*

## Easiest: install with one command

```bash
npx reviewport install claude     # → .claude/skills/  (add --hook for the Stop hook)
npx reviewport install codex      # → .agents/skills/
npx reviewport install cursor     # → .cursor/rules/
npx reviewport install cline      # → .clinerules
npx reviewport install aider      # → reviewport-conventions.md
#   --global  installs for all projects (~/.claude, ~/.agents)
#   --print   dry run · --force overwrite
```

The files below are the source the installer copies — browse or copy them by hand if
you prefer.

| Agent | What to use |
|---|---|
| **Claude Code** | [`claude-code/`](./claude-code/) — turnkey skill + Stop hook |
| **Cline** | [`cline/.clinerules`](./cline/.clinerules) — copy into your project root |
| **Cursor** | [`cursor/reviewport.mdc`](./cursor/reviewport.mdc) — copy into `.cursor/rules/` |
| **Aider** | [`aider/CONVENTIONS.md`](./aider/CONVENTIONS.md) — load with `--read` |
| **Anything else** | Hand it [`docs/AGENT_PROTOCOL.md`](../docs/AGENT_PROTOCOL.md) |

All of these teach the same small protocol. The viewer (`npx reviewport proxy|serve`)
is the same regardless of which agent produced the manifest.
