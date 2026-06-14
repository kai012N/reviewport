// Zero-dependency reverse proxy. Sits in front of any dev server, injects the
// reviewport overlay into HTML responses, and passes everything else (incl. HMR
// websockets) straight through. Generalized from the original DS26 prototype.

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { injectHtml } from './inject.js';

/**
 * @param {object} opts
 * @param {string} opts.target   Upstream dev server URL, e.g. http://localhost:5174
 * @param {number} opts.port     Port to listen on (default 6173)
 * @param {() => object} opts.getManifest  Returns the current manifest (called per request so a watched file can hot-update)
 * @returns {Promise<{ server: import('node:http').Server, url: string }>}
 */
export function createProxy({ target, port = 6173, getManifest }) {
  const up = new URL(target);
  const upstreamIsTls = up.protocol === 'https:';
  const client = upstreamIsTls ? https : http;
  const upstreamPort = up.port || (upstreamIsTls ? 443 : 80);

  const server = http.createServer((req, res) => {
    const headers = { ...req.headers, host: up.host, 'accept-encoding': 'identity' };
    const opts = {
      protocol: up.protocol,
      hostname: up.hostname,
      port: upstreamPort,
      method: req.method,
      path: req.url,
      headers,
      rejectUnauthorized: false, // dev servers often use self-signed certs
    };
    const upReq = client.request(opts, (r) => {
      const ct = r.headers['content-type'] || '';
      // Only inject into GET HTML. HEAD has no body to inject into, and injecting
      // would advertise a wrong content-length for the bodyless response.
      if (ct.indexOf('text/html') >= 0 && req.method !== 'HEAD') {
        const chunks = [];
        r.on('data', (d) => chunks.push(d));
        r.on('end', () => {
          let body = Buffer.concat(chunks).toString('utf8');
          try { body = injectHtml(body, getManifest()); } catch (e) { /* leave body unchanged */ }
          const h = { ...r.headers };
          delete h['content-length'];
          delete h['content-encoding'];
          h['content-length'] = Buffer.byteLength(body);
          res.writeHead(r.statusCode || 200, h);
          res.end(body);
        });
      } else {
        res.writeHead(r.statusCode || 200, r.headers);
        r.pipe(res);
      }
    });
    upReq.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('reviewport: upstream error (is the dev server running at ' + target + '?)\n' + e.message);
    });
    req.pipe(upReq);
  });

  // Pass through websocket upgrades (Vite/webpack HMR, etc.).
  server.on('upgrade', (req, socket, head) => {
    const upstream = net.connect(upstreamPort, up.hostname, () => {
      const reqLine = req.method + ' ' + req.url + ' HTTP/1.1\r\n';
      const headerLines = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        headerLines.push(req.rawHeaders[i] + ': ' + req.rawHeaders[i + 1]);
      }
      upstream.write(reqLine + headerLines.join('\r\n') + '\r\n\r\n');
      if (head && head.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
  });

  return new Promise((resolve, reject) => {
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`reviewport: port ${port} is already in use. Try a different one with --port <n>.`);
        process.exit(1);
      }
      reject(e);
    });
    // Bind to localhost only (local dev tool; not for LAN exposure).
    server.listen(port, 'localhost', () => resolve({ server, url: `http://localhost:${port}/` }));
  });
}
