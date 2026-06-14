# Agent integrations

reviewport works with any agent that can write a JSON file. The contract is in
[`docs/AGENT_PROTOCOL.md`](../docs/AGENT_PROTOCOL.md): *after making user-visible
frontend changes, write a [change manifest](../docs/MANIFEST_SCHEMA.md) to
`./review-manifest.json`.*

| Agent | What to use |
|---|---|
| **Claude Code** | [`claude-code/`](./claude-code/) — turnkey skill + Stop hook |
| **Cline** | [`cline/.clinerules`](./cline/.clinerules) — copy into your project root |
| **Cursor** | [`cursor/reviewport.mdc`](./cursor/reviewport.mdc) — copy into `.cursor/rules/` |
| **Aider** | [`aider/CONVENTIONS.md`](./aider/CONVENTIONS.md) — load with `--read` |
| **Anything else** | Hand it [`docs/AGENT_PROTOCOL.md`](../docs/AGENT_PROTOCOL.md) |

All of these teach the same small protocol. The viewer (`npx reviewport proxy|serve`)
is the same regardless of which agent produced the manifest.
