---
"reviewport": patch
---

Fix the review panel showing "Couldn't locate this on the page" on a change that was actually found, when it follows a change whose anchor couldn't be located. The panel now always reflects the current change's real anchor result, so a found change never inherits the previous change's not-found message — and a successful **Re-locate** clears a stale one. Found via browser dogfooding (the panel claimed not-found while the element was correctly highlighted).
