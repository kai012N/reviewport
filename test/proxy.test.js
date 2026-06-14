import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProxy } from '../src/proxy.js';

// Regression for the blocker where a schemeless --target (e.g. "localhost:7300")
// didn't error at startup and crashed the whole proxy on the first request.
test('createProxy rejects a non-http(s) target up front', () => {
  for (const bad of ['localhost:7300', 'ftp://x', 'not a url', '']) {
    assert.throws(() => createProxy({ target: bad, getManifest: () => ({ schemaVersion: 1, changes: [] }) }), /http\(s\)/, bad);
  }
});
