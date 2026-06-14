import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installAgent, AGENTS } from '../src/install.js';

function tmp() { return mkdtempSync(path.join(tmpdir(), 'reviewport-install-')); }

test('claude install writes the skill into .claude/skills', () => {
  const dir = tmp();
  try {
    const r = installAgent('claude', { dir });
    const skill = path.join(dir, '.claude/skills/reviewport-emit-manifest/SKILL.md');
    assert.ok(existsSync(skill), 'SKILL.md should exist');
    assert.ok(readFileSync(skill, 'utf8').includes('reviewport-emit-manifest'));
    assert.equal(r.scope, 'project');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('codex install uses .agents/skills', () => {
  const dir = tmp();
  try {
    installAgent('codex', { dir });
    assert.ok(existsSync(path.join(dir, '.agents/skills/reviewport-emit-manifest/SKILL.md')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('claude --hook merges a Stop hook into settings.json without clobbering', () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, '.claude'), { recursive: true });
    writeFileSync(path.join(dir, '.claude/settings.json'),
      JSON.stringify({ model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo existing' }] }] } }));
    installAgent('claude', { dir, hook: true });
    const s = JSON.parse(readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
    assert.equal(s.model, 'opus', 'existing keys preserved');
    assert.equal(s.hooks.Stop.length, 2, 'appended, not replaced');
    assert.ok(JSON.stringify(s.hooks.Stop).includes('echo existing'), 'existing hook kept');
    assert.ok(JSON.stringify(s.hooks.Stop).includes('reviewport-stop.sh'), 'ours added');
    assert.ok(existsSync(path.join(dir, '.claude/hooks/reviewport-stop.sh')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('install is idempotent — second --hook run does not duplicate', () => {
  const dir = tmp();
  try {
    installAgent('claude', { dir, hook: true });
    installAgent('claude', { dir, hook: true });
    const s = JSON.parse(readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
    assert.equal(s.hooks.Stop.length, 1, 'hook added only once');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('--print writes nothing', () => {
  const dir = tmp();
  try {
    installAgent('cursor', { dir, print: true });
    assert.ok(!existsSync(path.join(dir, '.cursor/rules/reviewport.mdc')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('unknown agent throws; AGENTS lists the supported set', () => {
  assert.throws(() => installAgent('nope', {}), /unknown agent/);
  assert.deepEqual(Object.keys(AGENTS), ['claude', 'codex', 'cline', 'cursor', 'aider']);
});
