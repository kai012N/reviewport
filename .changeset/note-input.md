---
"reviewport": minor
---

Add a per-change **note input** to the review panel — type how a change should be fixed, and it's sent back with the exported fix-list (both in the human-readable list and in a machine-readable `notes` map, so the agent gets your exact instruction). Security: the note is rendered as a textarea value, never interpolated into HTML (no self-XSS), and the export escapes `<`/`>` so a free-form note can't break out of the machine-readable block or any sink that renders the paste-back.
