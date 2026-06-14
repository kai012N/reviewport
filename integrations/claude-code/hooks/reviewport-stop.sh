#!/usr/bin/env sh
# reviewport Stop hook.
# When Claude Code finishes a turn, if a review-manifest.json with changes exists in
# the working directory, remind the human to review them in the live UI. Non-blocking.

set -e
MANIFEST="./review-manifest.json"

[ -f "$MANIFEST" ] || exit 0

# Count changes without any dependency on reviewport being installed.
N=$(node -e 'try{const m=require("'"$PWD"'/review-manifest.json");process.stdout.write(String((m.changes||[]).length))}catch(e){process.stdout.write("0")}' 2>/dev/null || echo 0)

[ "$N" -gt 0 ] 2>/dev/null || exit 0

echo "reviewport: $MANIFEST has $N change(s) to review. Open the live UI:"
echo "  npx reviewport proxy --target http://localhost:5173   # or: npx reviewport serve <dir>"
echo "Then paste back anything you flag as 'needs fix'."
exit 0
