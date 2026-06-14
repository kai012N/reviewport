// Zero-dependency static file server with overlay injection. For sites that have
// no dev server at all — a plain folder of .html/.css/.js (the author's own
// static projects are exactly this). Serves `dir` and injects into any .html.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { injectHtml } from './inject.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/**
 * @param {object} opts
 * @param {string} opts.dir   Directory to serve
 * @param {number} opts.port  Port to listen on (default 6173)
 * @param {() => object} opts.getManifest  Returns the current manifest
 * @returns {Promise<{ server: import('node:http').Server, url: string }>}
 */
export function createStaticServer({ dir, port = 6173, getManifest }) {
  const root = path.resolve(dir);

  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { urlPath = req.url; }

    // Resolve and guard against path traversal. Use a separator-aware check so a
    // sibling dir sharing the root as a string prefix (e.g. `public` vs `public.bak`)
    // can't be escaped into via encoded `..` segments.
    let filePath = path.join(root, urlPath);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err2, buf) => {
        if (err2) {
          // SPA fallback only for navigation requests (a route, not a missing
          // asset): no file extension, or the client explicitly accepts HTML.
          const accept = req.headers['accept'] || '';
          const isNavigation = !path.extname(urlPath) || accept.indexOf('text/html') >= 0;
          if (!isNavigation) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404 Not Found: ' + urlPath); return; }
          fs.readFile(path.join(root, 'index.html'), (err3, idx) => {
            if (err3) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404 Not Found: ' + urlPath); return; }
            sendHtml(res, idx, getManifest);
          });
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.html' || ext === '.htm') { sendHtml(res, buf, getManifest); return; }
        res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
        res.end(buf);
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`reviewport: port ${port} is already in use. Try a different one with --port <n>.`);
        process.exit(1);
      }
      reject(e);
    });
    // Bind to localhost only — this is a local dev tool that injects scripts and
    // disables nothing; it should not be reachable from the LAN by default.
    server.listen(port, 'localhost', () => resolve({ server, url: `http://localhost:${port}/` }));
  });
}

function sendHtml(res, buf, getManifest) {
  let body = buf.toString('utf8');
  try { body = injectHtml(body, getManifest()); } catch { /* leave unchanged */ }
  res.writeHead(200, { 'content-type': MIME['.html'], 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
