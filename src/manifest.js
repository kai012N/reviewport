// Load + watch the change manifest from disk.

import fs from 'node:fs';
import path from 'node:path';
import { validateManifest } from './schema/validate.js';

export const DEFAULT_MANIFEST_PATH = './review-manifest.json';

const EMPTY = { schemaVersion: 1, changes: [] };

/** Read + parse + validate a manifest file. Throws on parse/validation error. */
export function loadManifest(file = DEFAULT_MANIFEST_PATH) {
  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { throw new Error(`${file}: invalid JSON — ${e.message}`); }
  const { valid, errors, warnings } = validateManifest(parsed);
  if (!valid) throw new Error(`${file}: invalid manifest\n  - ${errors.join('\n  - ')}`);
  return { manifest: parsed, warnings };
}

/**
 * Returns a getter that always reflects the current file contents, re-reading
 * (and re-validating) whenever the file changes. Falls back to the last good
 * manifest if a save is momentarily broken, so the overlay never crashes.
 */
export function watchManifest(file = DEFAULT_MANIFEST_PATH, onChange) {
  const abs = path.resolve(file);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  let current = EMPTY;
  let timer = null;
  const reload = () => {
    try { current = loadManifest(abs).manifest; if (onChange) onChange(null, current); }
    catch (e) { if (onChange) onChange(e, current); }
  };
  const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(reload, 50); };
  if (fs.existsSync(abs)) reload();
  try {
    // Watch the parent directory rather than the file itself: editors and agents
    // often save by writing a temp file and renaming it over the target, which
    // would leave a file-bound watcher pointing at a stale (unlinked) inode and
    // silently stop firing. Filtering by basename keeps it scoped.
    fs.watch(dir, { persistent: false }, (_evt, fname) => {
      if (!fname || fname === base) schedule();
    });
  } catch { /* watching is best-effort */ }
  return () => current;
}
