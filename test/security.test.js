import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../src/schema/validate.js';
import { createStaticServer } from '../src/serve.js';

const HOOK = fileURLToPath(new URL('../integrations/claude-code/hooks/reviewport-stop.sh', import.meta.url));
const NUL = String.fromCharCode(0);

// --- route/routeBase scheme validation (defense in depth vs javascript:/data: XSS) ---

const baseChange = { id: 'c1', title: 't', category: 'copy', anchor: { mode: 'text', value: 'x' } };
const withRoute = (route) => ({ schemaVersion: 1, changes: [{ ...baseChange, route }] });

test('validate rejects javascript:/data:/vbscript:/protocol-relative routes', () => {
  for (const bad of ['javascript:alert(1)//', '  javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'vbscript:msgbox', '//evil.example/x']) {
    const r = validateManifest(withRoute(bad));
    assert.equal(r.valid, false, `should reject route ${JSON.stringify(bad)}`);
    assert.ok(r.errors.some((e) => e.includes('route')), `error should mention route for ${JSON.stringify(bad)}`);
  }
});

test('validate still accepts legitimate routes', () => {
  for (const ok of ['/', '/index.html', '/uikit/modals', '.', 'http://localhost:5173/', 'https://example.com/x']) {
    assert.equal(validateManifest(withRoute(ok)).valid, true, `should accept route ${JSON.stringify(ok)}`);
  }
});

test('validate rejects a dangerous top-level routeBase', () => {
  assert.equal(validateManifest({ schemaVersion: 1, routeBase: 'javascript:alert(1)//', changes: [{ ...baseChange, route: '/' }] }).valid, false);
  assert.equal(validateManifest({ schemaVersion: 1, routeBase: '/docs', changes: [{ ...baseChange, route: '/' }] }).valid, true);
});

// --- null-byte DoS in the static server ---

let base, server, origin;
before(async () => {
  base = mkdtempSync(path.join(tmpdir(), 'reviewport-sec-'));
  writeFileSync(path.join(base, 'index.html'), '<html><body>ok</body></html>');
  const info = await createStaticServer({ dir: base, port: 0, getManifest: () => ({ schemaVersion: 1, changes: [] }) });
  server = info.server;
  origin = `http://localhost:${server.address().port}`;
});
after(() => { server && server.close(); base && rmSync(base, { recursive: true, force: true }); });

test('a NUL-byte path returns 400 and does NOT crash the server', async () => {
  const res = await fetch(`${origin}/x${encodeURIComponent(NUL)}.png`);
  assert.equal(res.status, 400);
  // server must still be alive
  const ok = await fetch(`${origin}/`);
  assert.equal(ok.status, 200);
});

// --- RCE regression: the Stop hook must not execute code from a directory name ---

test('Stop hook does not execute code embedded in the working-directory name', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'reviewport-rce-'));
  try {
    // A directory name that breaks out of the old node -e string literal and ran `id` before the fix.
    const evil = 'app");}catch(e){};require("child_process").execSync("id>pwned.txt");try{m=("';
    const dir = path.join(root, evil);
    mkdirSync(dir);
    writeFileSync(path.join(dir, 'review-manifest.json'),
      JSON.stringify({ schemaVersion: 1, changes: [{ ...baseChange, route: '/' }] }));
    const out = execFileSync('sh', [HOOK], { cwd: dir }).toString();
    assert.ok(!existsSync(path.join(dir, 'pwned.txt')), 'RCE: hook must not execute the directory-name payload');
    assert.ok(out.includes('1 change'), 'hook should still report the change count');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
