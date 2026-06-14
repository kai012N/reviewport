import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../src/schema/validate.js';

const baseChange = {
  id: 'c-1', route: '/', title: 'A change', category: 'copy',
  anchor: { mode: 'text', value: 'hello' },
};

test('a minimal valid manifest passes', () => {
  const r = validateManifest({ schemaVersion: 1, changes: [baseChange] });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test('wrong schemaVersion fails', () => {
  const r = validateManifest({ schemaVersion: 2, changes: [] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('schemaVersion')));
});

test('non-object manifest fails', () => {
  assert.equal(validateManifest(null).valid, false);
  assert.equal(validateManifest([]).valid, false);
  assert.equal(validateManifest('x').valid, false);
});

test('missing required change fields fail', () => {
  const r = validateManifest({ schemaVersion: 1, changes: [{ id: 'c-1' }] });
  assert.equal(r.valid, false);
  for (const f of ['route', 'title', 'category', 'anchor']) {
    assert.ok(r.errors.some((e) => e.includes(f)), `expected error mentioning ${f}`);
  }
});

test('duplicate ids fail', () => {
  const r = validateManifest({ schemaVersion: 1, changes: [baseChange, { ...baseChange }] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('duplicated')));
});

test('each anchor mode validates its required field', () => {
  const text = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, anchor: { mode: 'text' } }] });
  assert.ok(text.errors.some((e) => e.includes('value')));

  const code = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, anchor: { mode: 'code-marker' } }] });
  assert.ok(code.errors.some((e) => e.includes('marker')));

  const look = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, anchor: { mode: 'look-here' } }] });
  assert.ok(look.errors.some((e) => e.includes('hint')));

  const bad = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, anchor: { mode: 'nope' } }] });
  assert.ok(bad.errors.some((e) => e.includes('mode')));
});

test('all three anchor modes are accepted when complete', () => {
  const r = validateManifest({
    schemaVersion: 1,
    changes: [
      { id: 'a', route: '/', title: 't', category: 'copy', anchor: { mode: 'text', value: 'x' } },
      { id: 'b', route: '/', title: 't', category: 'css', anchor: { mode: 'code-marker', marker: 'x' } },
      { id: 'c', route: '/', title: 't', category: 'css', anchor: { mode: 'look-here', hint: 'x' } },
    ],
  });
  assert.equal(r.valid, true);
});

test('unknown category is a warning, not an error', () => {
  const r = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, category: 'whatever' }] });
  assert.equal(r.valid, true);
  assert.ok(r.warnings.some((w) => w.includes('category')));
});

test('bad severity / status.state fail', () => {
  const sev = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, severity: 'huge' }] });
  assert.equal(sev.valid, false);
  const st = validateManifest({ schemaVersion: 1, changes: [{ ...baseChange, status: { state: 'maybe' } }] });
  assert.equal(st.valid, false);
});
