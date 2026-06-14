// Build the self-contained GitHub Pages demo.
//
// This deliberately reuses the production injectHtml() path, so the hosted demo
// dogfoods the exact code users run — and can never drift from it. It bakes the
// overlay + a sample manifest into demo/template.html and writes demo/index.html.
//
// Run: node scripts/build-demo.mjs   (or: npm run build:demo)

import { readFileSync, writeFileSync } from 'node:fs';
import { injectHtml } from '../src/inject.js';

const root = new URL('..', import.meta.url);

// Every change uses route "." so the overlay highlights in place without navigating
// (the demo is a single page hosted on Pages).
const manifest = {
  schemaVersion: 1,
  id: 'reviewport-demo',
  generatedAt: '2026-06-14T00:00:00Z',
  agent: 'claude-code',
  task: 'Polish the Nimbus landing page',
  routeBase: '',
  changes: [
    {
      id: 'c-1', route: '.', title: 'Sharpen the hero headline', category: 'copy', severity: 'minor',
      before: 'Deploy your app to the cloud', after: 'Deploy in one command, not ten',
      anchor: { mode: 'text', value: 'Deploy in one command, not ten' },
    },
    {
      id: 'c-2', route: '.', title: 'State the uptime SLA precisely', category: 'content', severity: 'major',
      before: '99.9%', after: '99.99%',
      anchor: { mode: 'text', value: '99.99%', selector: '.features' },
    },
    {
      id: 'c-3', route: '.', title: 'Deploy to prod, not staging, in the snippet', category: 'structure', severity: 'major',
      description: 'The install snippet now deploys with --prod.',
      before: 'nimbus deploy --staging', after: 'nimbus deploy --prod',
      anchor: { mode: 'code-marker', marker: 'nimbus deploy --prod', lineHint: 'last line of the snippet' },
    },
    {
      id: 'c-4', route: '.', title: 'Make the primary CTA teal + pill-shaped', category: 'css', severity: 'minor',
      description: 'The .cta-primary button got the brand teal and a rounded shape.',
      anchor: { mode: 'look-here', hint: 'the “Start deploying free” button — confirm teal, rounded, readable', selector: '.cta-primary' },
    },
    {
      id: 'c-5', route: '.', title: 'Update the Team plan price', category: 'content', severity: 'minor',
      before: '$15/mo', after: '$19/mo',
      anchor: { mode: 'text', value: '$19', selector: '.pricing' },
    },
  ],
};

const template = readFileSync(new URL('demo/template.html', root), 'utf8');
const html = injectHtml(template, manifest);
writeFileSync(new URL('demo/index.html', root), html);
console.log(`built demo/index.html (${manifest.changes.length} changes, ${Buffer.byteLength(html)} bytes)`);
