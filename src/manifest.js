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
  let current = EMPTY;
  const reload = () => {
    try { current = loadManifest(abs).manifest; if (onChange) onChange(null, current); }
    catch (e) { if (onChange) onChange(e, current); }
  };
  if (fs.existsSync(abs)) reload();
  try {
    fs.watch(abs, { persistent: false }, () => setTimeout(reload, 50));
  } catch { /* watching is best-effort */ }
  return () => current;
}
