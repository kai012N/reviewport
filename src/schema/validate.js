// Zero-dependency validator for a reviewport change manifest.
// We hand-roll this instead of pulling in a JSON-Schema library so the whole
// package keeps ZERO runtime dependencies. The JSON Schema in
// `manifest.schema.json` is the canonical spec for editor tooling; this file is
// the runtime check the CLI and adapters use.

const CATEGORIES_HINT = [
  'copy', 'typo', 'structure', 'naming', 'css',
  'layout', 'a11y', 'config', 'content', 'semantics', 'other',
];

/**
 * Validate a parsed manifest object.
 * @param {unknown} m
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateManifest(m) {
  const errors = [];
  const warnings = [];

  if (m === null || typeof m !== 'object' || Array.isArray(m)) {
    return { valid: false, errors: ['manifest must be a JSON object'], warnings };
  }

  if (m.schemaVersion !== 1) {
    errors.push(`schemaVersion must be 1 (got ${JSON.stringify(m.schemaVersion)})`);
  }

  if (!Array.isArray(m.changes)) {
    errors.push('changes must be an array');
    return { valid: errors.length === 0, errors, warnings };
  }
  if (m.changes.length === 0) {
    warnings.push('changes is empty — the overlay will have nothing to show');
  }

  const seenIds = new Set();
  m.changes.forEach((c, i) => {
    const at = `changes[${i}]`;
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      errors.push(`${at} must be an object`);
      return;
    }
    for (const field of ['id', 'route', 'title', 'category']) {
      if (typeof c[field] !== 'string' || c[field] === '') {
        errors.push(`${at}.${field} is required and must be a non-empty string`);
      }
    }
    if (typeof c.id === 'string' && c.id !== '') {
      if (seenIds.has(c.id)) errors.push(`${at}.id "${c.id}" is duplicated — ids must be unique`);
      seenIds.add(c.id);
    }
    if (typeof c.category === 'string' && c.category && !CATEGORIES_HINT.includes(c.category)) {
      // Categories are intentionally open — this is a hint, never an error.
      warnings.push(`${at}.category "${c.category}" is not one of the suggested categories (allowed, just a hint)`);
    }
    if (c.severity !== undefined && !['info', 'minor', 'major'].includes(c.severity)) {
      errors.push(`${at}.severity must be one of info|minor|major`);
    }
    validateAnchor(c.anchor, `${at}.anchor`, errors);
    if (c.status !== undefined) {
      if (typeof c.status !== 'object' || c.status === null) {
        errors.push(`${at}.status must be an object`);
      } else if (c.status.state !== undefined && !['pending', 'approved', 'rejected'].includes(c.status.state)) {
        errors.push(`${at}.status.state must be one of pending|approved|rejected`);
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateAnchor(a, at, errors) {
  if (a === null || typeof a !== 'object' || Array.isArray(a)) {
    errors.push(`${at} is required and must be an object`);
    return;
  }
  switch (a.mode) {
    case 'text':
      if (typeof a.value !== 'string' || a.value === '') errors.push(`${at}.value is required for mode "text"`);
      if (a.occurrence !== undefined && (!Number.isInteger(a.occurrence) || a.occurrence < 1)) {
        errors.push(`${at}.occurrence must be a positive integer`);
      }
      break;
    case 'code-marker':
      if (typeof a.marker !== 'string' || a.marker === '') errors.push(`${at}.marker is required for mode "code-marker"`);
      break;
    case 'look-here':
      if (typeof a.hint !== 'string' || a.hint === '') errors.push(`${at}.hint is required for mode "look-here"`);
      break;
    default:
      errors.push(`${at}.mode must be one of text|code-marker|look-here (got ${JSON.stringify(a.mode)})`);
  }
}

export { CATEGORIES_HINT };
