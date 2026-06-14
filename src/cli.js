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
import { installAgent, AGENTS } from './install.js';

const pkg = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
);

const HELP = `reviewport ${pkg.version} — review your AI agent's frontend changes in the live UI

Usage:
  reviewport proxy --target <url> [options]   Proxy a running dev server and inject the overlay
  reviewport serve <dir> [options]            Serve a static folder and inject the overlay
  reviewport demo                             Try it now on a bundled sample site
  reviewport install <agent> [options]        Install the agent integration (skill/rules)
  reviewport validate [manifest]              Validate a change manifest
  reviewport init [manifest]                  Write a starter review-manifest.json

Run / serve options:
  --target <url>     Upstream dev server (proxy mode), e.g. http://localhost:5174
  --port <n>         Port to listen on (default 6173)
  --manifest <path>  Manifest file (default ${DEFAULT_MANIFEST_PATH})
  --route-base <p>   Path prefix prepended to every change.route
  --open             Open the URL in your browser

A change's "route" is matched ignoring ".html" and a trailing "/index" — so the home
page can be written as "/", "/index.html", or "."; "severity" accepts info|minor|major
(low|medium|high too). See docs/MANIFEST_SCHEMA.md.

install <agent> — one of: ${Object.keys(AGENTS).join(', ')}
  --global           Install for all projects (~/.claude, ~/.agents) instead of this project
  --hook             (claude) also register the Stop hook in settings.json
  --dir <path>       Target project directory (default: current directory)
  --force            Overwrite existing files
  --print            Show what would be written, without writing

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
      severity: 'minor', // info | minor | major  (low | medium | high also accepted)
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

  // `install` has its own flags, so parse it before the shared option set below.
  if (cmd === 'install') { return doInstall(argv.slice(1)); }
  if (cmd === 'demo') { return doDemo(argv.slice(1)); }

  const rest = argv.slice(1);
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        target: { type: 'string' },
        port: { type: 'string' },
        manifest: { type: 'string', default: DEFAULT_MANIFEST_PATH },
        'route-base': { type: 'string' },
        open: { type: 'boolean', default: false },
      },
    }));
  } catch (e) {
    console.error(`reviewport: ${e.message}`);
    process.exitCode = 1;
    return;
  }

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

function doInstall(args) {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        global: { type: 'boolean', default: false },
        hook: { type: 'boolean', default: false },
        dir: { type: 'string' },
        force: { type: 'boolean', default: false },
        print: { type: 'boolean', default: false },
      },
    });
  } catch (e) {
    console.error(`reviewport: ${e.message}`);
    process.exitCode = 1;
    return;
  }
  const agent = parsed.positionals[0];
  if (!agent) {
    console.error('Usage: reviewport install <agent> [--global] [--hook] [--dir <path>] [--force] [--print]');
    console.error(`Agents: ${Object.keys(AGENTS).join(', ')}`);
    console.error('Example: npx reviewport install claude --hook');
    process.exitCode = 1;
    return;
  }
  if (!AGENTS[agent]) {
    console.error(`reviewport: unknown agent "${agent}". Supported: ${Object.keys(AGENTS).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  let r;
  try { r = installAgent(agent, parsed.values); }
  catch (e) { console.error(`reviewport: ${e.message}`); process.exitCode = 1; return; }

  console.log('');
  console.log(`reviewport → ${AGENTS[agent]} (${r.scope}${parsed.values.print ? ', dry run' : ''})`);
  for (const [action, dest] of r.results) console.log(`  ${action}: ${dest}`);
  if (r.hookNote) console.log(`  ${r.hookNote}`);
  console.log('');
  console.log('Next:');
  for (const step of r.nextSteps) console.log(`  • ${step}`);
  console.log('');
}

function doInit(file) {
  if (typeof file === 'string' && file.startsWith('-')) {
    console.error(`reviewport: "${file}" looks like a flag, not a filename. Usage: reviewport init [path]`);
    process.exitCode = 1;
    return;
  }
  const abs = path.resolve(file);
  if (fs.existsSync(abs)) { console.error(`reviewport: ${file} already exists — not overwriting`); process.exitCode = 1; return; }
  fs.writeFileSync(abs, JSON.stringify(STARTER, null, 2) + '\n');
  console.log(`✓ wrote starter manifest to ${file}`);
  console.log('  Next — point reviewport at your site:');
  console.log('    • have a dev server?  reviewport proxy --target <its-url>   (e.g. http://localhost:5173)');
  console.log('    • just static files?  reviewport serve <folder>');
  console.log('    • just exploring?     reviewport demo');
}

async function doDemo(args) {
  let parsed;
  try { parsed = parseArgs({ args, allowPositionals: true, options: { port: { type: 'string' }, open: { type: 'boolean', default: false } } }); }
  catch (e) { console.error(`reviewport: ${e.message}`); process.exitCode = 1; return; }
  let port = 6173;
  if (parsed.values.port != null) {
    port = Number(parsed.values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('reviewport: --port must be an integer between 0 and 65535'); process.exitCode = 1; return; }
  }
  const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = path.join(pkgRoot, 'examples', 'static-site');
  const manifestFile = path.join(dir, 'review-manifest.json');
  if (!fs.existsSync(manifestFile)) { console.error('reviewport: bundled demo not found in this install.'); process.exitCode = 1; return; }
  const getManifest = watchManifest(manifestFile);
  const info = await listenWithRetry((p) => createStaticServer({ dir, port: p, getManifest }), port, parsed.values.port != null);
  if (!info) return;
  banner(info.url, 'serving the bundled demo — a sample site with 5 changes to walk through');
  openBrowser(info.url);
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

  const portExplicit = values.port != null;
  let info;
  if (cmd === 'proxy') {
    if (!values.target) { console.error('reviewport: proxy mode needs --target <url>'); process.exitCode = 1; return; }
    info = await listenWithRetry((p) => createProxy({ target: values.target, port: p, getManifest: wrapped }), port, portExplicit);
    if (!info) return;
    banner(info.url, `proxying ${values.target}`);
    probeTarget(values.target);
  } else {
    const dir = positionals[0] || '.';
    info = await listenWithRetry((p) => createStaticServer({ dir, port: p, getManifest: wrapped }), port, portExplicit);
    if (!info) return;
    banner(info.url, `serving ${path.resolve(dir)}`);
  }

  if (values.open) openBrowser(info.url);
}

// Start a server, auto-incrementing off the default port if it's busy. If the user
// explicitly passed --port, a clash is a clear error instead (don't silently move).
async function listenWithRetry(make, startPort, explicit) {
  for (let p = startPort, tries = 0; tries < 20; p++, tries++) {
    try { return await make(p); }
    catch (e) {
      if (e && e.code === 'EADDRINUSE') {
        if (explicit) { console.error(`reviewport: port ${p} is already in use. Try a different --port.`); process.exitCode = 1; return null; }
        continue; // default port busy — try the next one (like Vite/webpack do)
      }
      throw e; // e.g. an invalid --target — let the top-level handler report it cleanly
    }
  }
  console.error('reviewport: could not find a free port to bind to.'); process.exitCode = 1; return null;
}

// Non-blocking heads-up if the proxied dev server isn't reachable yet (it may start later).
function probeTarget(target) {
  try {
    fetch(target).then(() => {}, (e) => {
      const code = (e && e.cause && e.cause.code) || (e && e.message) || 'unreachable';
      console.warn(`reviewport: heads up — couldn't reach ${target} yet (${code}). The overlay will work once your dev server is up.`);
    });
  } catch { /* fetch unavailable — skip the probe */ }
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
