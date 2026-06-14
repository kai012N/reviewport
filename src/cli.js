// reviewport CLI — zero dependencies (node:util parseArgs only).
//
//   reviewport proxy   --target <url> [--port 6173] [--manifest ./review-manifest.json] [--route-base ""] [--open]
//   reviewport serve   <dir>          [--port 6173] [--manifest ./review-manifest.json] [--open]
//   reviewport validate [manifest]
//   reviewport init    [manifest]
//   reviewport --help | --version

import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxy } from './proxy.js';
import { createStaticServer } from './serve.js';
import { loadManifest, watchManifest, DEFAULT_MANIFEST_PATH } from './manifest.js';
import { validateManifest } from './schema/validate.js';

const pkg = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
);

const HELP = `reviewport ${pkg.version} — review your AI agent's frontend changes in the live UI

Usage:
  reviewport proxy --target <url> [options]   Proxy a running dev server and inject the overlay
  reviewport serve <dir> [options]            Serve a static folder and inject the overlay
  reviewport validate [manifest]              Validate a change manifest
  reviewport init [manifest]                  Write a starter review-manifest.json

Options:
  --target <url>     Upstream dev server (proxy mode), e.g. http://localhost:5174
  --port <n>         Port to listen on (default 6173)
  --manifest <path>  Manifest file (default ${DEFAULT_MANIFEST_PATH})
  --route-base <p>   Path prefix prepended to every change.route
  --open             Open the URL in your browser
  -h, --help         Show this help
  -v, --version      Show version

Docs: https://github.com/kai012N/reviewport`;

const STARTER = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  agent: 'human',
  task: 'Describe what was changed',
  routeBase: '',
  changes: [
    {
      id: 'c-1',
      route: '/',
      title: 'Example: a copy change',
      category: 'copy',
      before: 'old text',
      after: 'new text',
      anchor: { mode: 'text', value: 'new text' },
    },
  ],
};

export async function run(argv = process.argv.slice(2)) {
  const cmd = argv[0];

  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') { console.log(HELP); return; }
  if (cmd === '-v' || cmd === '--version') { console.log(pkg.version); return; }

  const rest = argv.slice(1);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      target: { type: 'string' },
      port: { type: 'string' },
      manifest: { type: 'string', default: DEFAULT_MANIFEST_PATH },
      'route-base': { type: 'string' },
      open: { type: 'boolean', default: false },
    },
  });

  if (cmd === 'validate') {
    const file = positionals[0] || values.manifest;
    return doValidate(file);
  }
  if (cmd === 'init') {
    const file = positionals[0] || values.manifest;
    return doInit(file);
  }
  if (cmd === 'proxy' || cmd === 'serve') {
    return doServe(cmd, values, positionals);
  }

  console.error(`reviewport: unknown command "${cmd}"\n`);
  console.log(HELP);
  process.exitCode = 1;
}

function doValidate(file) {
  let raw;
  try { raw = fs.readFileSync(path.resolve(file), 'utf8'); }
  catch { console.error(`reviewport: cannot read ${file}`); process.exitCode = 1; return; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { console.error(`reviewport: ${file} is not valid JSON — ${e.message}`); process.exitCode = 1; return; }
  const { valid, errors, warnings } = validateManifest(parsed);
  warnings.forEach((w) => console.warn(`  warning: ${w}`));
  if (valid) {
    console.log(`✓ ${file} is valid (${parsed.changes.length} change${parsed.changes.length === 1 ? '' : 's'})`);
  } else {
    console.error(`✗ ${file} is invalid:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
  }
}

function doInit(file) {
  const abs = path.resolve(file);
  if (fs.existsSync(abs)) { console.error(`reviewport: ${file} already exists — not overwriting`); process.exitCode = 1; return; }
  fs.writeFileSync(abs, JSON.stringify(STARTER, null, 2) + '\n');
  console.log(`✓ wrote starter manifest to ${file}`);
  console.log(`  Next: reviewport proxy --target http://localhost:5173`);
}

async function doServe(cmd, values, positionals) {
  let port = 6173;
  if (values.port != null) {
    port = Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error('reviewport: --port must be an integer between 0 and 65535');
      process.exitCode = 1;
      return;
    }
  }
  const manifestFile = values.manifest;

  // Load once up front so we can fail fast with a clear message, then watch.
  if (fs.existsSync(path.resolve(manifestFile))) {
    try { const { warnings } = loadManifest(manifestFile); warnings.forEach((w) => console.warn(`  warning: ${w}`)); }
    catch (e) { console.error('reviewport: ' + e.message); process.exitCode = 1; return; }
  } else {
    console.warn(`reviewport: ${manifestFile} not found — starting with an empty overlay. Run "reviewport init" to create one.`);
  }

  const getManifest = watchManifest(manifestFile, (err) => {
    if (err) console.warn(`reviewport: manifest reload failed — ${err.message} (keeping last good version)`);
    else console.log('reviewport: manifest reloaded');
  });

  // Apply --route-base override on top of whatever the file declares.
  const baseOverride = values['route-base'];
  const wrapped = () => {
    const m = getManifest();
    return baseOverride != null ? { ...m, routeBase: baseOverride } : m;
  };

  let info;
  if (cmd === 'proxy') {
    if (!values.target) { console.error('reviewport: proxy mode needs --target <url>'); process.exitCode = 1; return; }
    info = await createProxy({ target: values.target, port, getManifest: wrapped });
    banner(info.url, `proxying ${values.target}`);
  } else {
    const dir = positionals[0] || '.';
    info = await createStaticServer({ dir, port, getManifest: wrapped });
    banner(info.url, `serving ${path.resolve(dir)}`);
  }

  if (values.open) openBrowser(info.url);
}

function banner(url, what) {
  console.log('');
  console.log('  reviewport is running');
  console.log('  → open: ' + url);
  console.log('  (' + what + '; Ctrl+C to stop)');
  console.log('');
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch { /* best effort */ }
}
