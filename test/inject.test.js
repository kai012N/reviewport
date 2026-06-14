import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectHtml, buildOverlayScript } from '../src/inject.js';

const manifest = { schemaVersion: 1, changes: [{ id: 'c-1', route: '/', title: 't', category: 'copy', anchor: { mode: 'text', value: 'x' } }] };

test('injects before </body>', () => {
  const html = '<html><body><h1>hi</h1></body></html>';
  const out = injectHtml(html, manifest);
  assert.ok(out.includes('data-reviewport'));
  assert.ok(out.indexOf('data-reviewport') < out.indexOf('</body>'));
});

test('appends when there is no </body>', () => {
  const out = injectHtml('<h1>hi</h1>', manifest);
  assert.ok(out.startsWith('<h1>hi</h1>'));
  assert.ok(out.includes('data-reviewport'));
});

test('is idempotent (no double injection)', () => {
  const once = injectHtml('<body></body>', manifest);
  const twice = injectHtml(once, manifest);
  assert.equal(once, twice);
  assert.equal(twice.match(/data-reviewport/g).length, 1);
});

test('escapes < so a </script> in the manifest cannot break out', () => {
  const evil = { schemaVersion: 1, changes: [{ id: 'c-1', route: '/', title: '</script><script>alert(1)</script>', category: 'copy', anchor: { mode: 'text', value: 'x' } }] };
  const tag = buildOverlayScript(evil);
  // The only literal </script> allowed is our own closing tag at the very end.
  const closings = tag.match(/<\/script>/g) || [];
  assert.equal(closings.length, 1);
  assert.ok(tag.includes('\\u003c/script'));
});

test('the overlay boot script references the manifest global', () => {
  const tag = buildOverlayScript(manifest);
  assert.ok(tag.includes('window.__REVIEWPORT__='));
  assert.ok(tag.includes('reviewportOverlay') || tag.includes('__REVIEWPORT_DONE__'));
});

test('non-string html is returned unchanged', () => {
  assert.equal(injectHtml(undefined, manifest), undefined);
});
