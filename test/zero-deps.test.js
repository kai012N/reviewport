import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

test('zero runtime dependencies (the core invariant)', () => {
  const deps = Object.keys(pkg.dependencies || {});
  assert.deepEqual(deps, [], `reviewport must have zero runtime dependencies, found: ${deps.join(', ')}`);
});

test('bin is declared and points at the entry', () => {
  assert.equal(pkg.bin.reviewport, 'bin/reviewport.js');
});
