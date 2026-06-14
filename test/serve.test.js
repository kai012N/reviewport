import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStaticServer } from '../src/serve.js';

// Build a layout where a SIBLING directory shares the served root as a string
// prefix: <tmp>/site (served) and <tmp>/site-secret (must NOT be reachable).
let base, server, origin;

before(async () => {
  base = mkdtempSync(path.join(tmpdir(), 'reviewport-serve-'));
  mkdirSync(path.join(base, 'site'));
  mkdirSync(path.join(base, 'site-secret'));
  writeFileSync(path.join(base, 'site', 'index.html'), '<html><body>ok</body></html>');
  writeFileSync(path.join(base, 'site-secret', 'secret.txt'), 'TOP SECRET');
  const info = await createStaticServer({ dir: path.join(base, 'site'), port: 0, getManifest: () => ({ schemaVersion: 1, changes: [] }) });
  server = info.server;
  origin = `http://localhost:${server.address().port}`;
});

after(() => { server && server.close(); base && rmSync(base, { recursive: true, force: true }); });

test('serves files inside the root', async () => {
  const res = await fetch(`${origin}/index.html`);
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes('ok'));
});

test('does NOT escape into a sibling dir that shares the root prefix', async () => {
  // %2e%2e%2f = ../  — survives URL pathname normalization, then decodes to ../
  const res = await fetch(`${origin}/%2e%2e%2fsite-secret%2fsecret.txt`);
  const body = await res.text();
  assert.notEqual(res.status, 200, 'traversal request must not return 200');
  assert.ok(!body.includes('TOP SECRET'), 'must not leak the sibling-dir secret');
});

test('binds to localhost only', () => {
  const addr = server.address().address;
  assert.ok(addr === '127.0.0.1' || addr === '::1', `expected loopback, got ${addr}`);
});
