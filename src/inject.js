// HTML injection — turns a manifest into a <script> tag and splices it into an
// HTML document. Shared by every adapter (proxy, static server, future plugins).

import { reviewportOverlay } from './overlay.js';

// U+2028/U+2029 are valid in JSON strings but illegal in JS string literals,
// so they must be escaped when we inline JSON into a <script>. We build the
// patterns via RegExp() so no literal separator chars appear in this source.
const LS = new RegExp('\\u2028', 'g');
const PS = new RegExp('\\u2029', 'g');

// Escape characters that could break out of the <script> context or confuse the
// HTML/JS parser when we inline the manifest as JSON.
function safeJson(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029');
}

/** Build the full <script>…</script> tag that boots the overlay with `manifest`. */
export function buildOverlayScript(manifest) {
  return (
    '<script data-reviewport>' +
    'window.__REVIEWPORT__=' + safeJson(manifest) + ';' +
    '(' + reviewportOverlay.toString() + ')();' +
    '</script>'
  );
}

/**
 * Inject the overlay into an HTML string. Inserts before </body> when present,
 * otherwise appends. No-ops if it's already injected.
 */
export function injectHtml(html, manifest) {
  if (typeof html !== 'string') return html;
  if (html.indexOf('data-reviewport') >= 0) return html; // already injected
  const tag = buildOverlayScript(manifest);
  const i = html.lastIndexOf('</body>');
  if (i >= 0) return html.slice(0, i) + tag + html.slice(i);
  return html + tag;
}
