// `reviewport install <agent>` — drop the integration files into the right place
// so users don't hand-copy anything into their dotfiles.
//
// Claude Code has no npm->plugin bridge: skills auto-load from .claude/skills/ and
// hooks live in settings.json. Codex skills load from .agents/skills/. So "install
// via npm" means: this command writes those files for the user. The asset content
// is shipped inside the package (integrations/ is in package.json "files"), so the
// integrations/ folder on GitHub stays the single source of truth.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url));

export const AGENTS = {
  claude: 'Claude Code',
  codex: 'Codex',
  cline: 'Cline',
  cursor: 'Cursor',
  aider: 'Aider',
};

const SKILL_SRC = 'integrations/claude-code/skills/reviewport-emit-manifest/SKILL.md';
const HOOK_SRC = 'integrations/claude-code/hooks/reviewport-stop.sh';

const readAsset = (rel) => fs.readFileSync(path.join(PKG_ROOT, rel), 'utf8');

/**
 * Plan + perform an install for one agent.
 * @param {string} agent
 * @param {{ dir?: string, global?: boolean, hook?: boolean, force?: boolean, print?: boolean }} opts
 * @returns {{ agent: string, scope: string, results: Array<[string,string]>, hookNote: string|null, nextSteps: string[] }}
 */
export function installAgent(agent, opts = {}) {
  if (!AGENTS[agent]) {
    throw new Error(`unknown agent "${agent}". Supported: ${Object.keys(AGENTS).join(', ')}`);
  }
  const dir = path.resolve(opts.dir || '.');
  const home = os.homedir();
  const useGlobal = !!opts.global;
  const writes = []; // { dest, content, mode? }
  const nextSteps = [];

  if (agent === 'claude' || agent === 'codex') {
    const skill = readAsset(SKILL_SRC);
    const skillsRoot = agent === 'claude'
      ? (useGlobal ? path.join(home, '.claude', 'skills') : path.join(dir, '.claude', 'skills'))
      : (useGlobal ? path.join(home, '.agents', 'skills') : path.join(dir, '.agents', 'skills'));
    writes.push({ dest: path.join(skillsRoot, 'reviewport-emit-manifest', 'SKILL.md'), content: skill });
    nextSteps.push(`Restart ${AGENTS[agent]} (or start a new session) so it picks up the skill.`);
    nextSteps.push('Ask it to make a frontend change; it will write review-manifest.json. Then run: npx reviewport proxy --target <dev-url>');

    if (agent === 'claude' && opts.hook) {
      const hookDir = useGlobal ? path.join(home, '.claude', 'hooks') : path.join(dir, '.claude', 'hooks');
      writes.push({ dest: path.join(hookDir, 'reviewport-stop.sh'), content: readAsset(HOOK_SRC), mode: 0o755 });
    }
  } else if (agent === 'cline') {
    writes.push({ dest: path.join(dir, '.clinerules'), content: readAsset('integrations/cline/.clinerules') });
    nextSteps.push('Cline reads .clinerules automatically from the project root.');
  } else if (agent === 'cursor') {
    writes.push({ dest: path.join(dir, '.cursor', 'rules', 'reviewport.mdc'), content: readAsset('integrations/cursor/reviewport.mdc') });
    nextSteps.push('Cursor loads rules from .cursor/rules/ automatically.');
  } else if (agent === 'aider') {
    writes.push({ dest: path.join(dir, 'reviewport-conventions.md'), content: readAsset('integrations/aider/CONVENTIONS.md') });
    nextSteps.push('Load it with: aider --read reviewport-conventions.md (or add it to .aider.conf.yml).');
  }

  // Perform the file writes.
  const results = [];
  for (const w of writes) {
    const exists = fs.existsSync(w.dest);
    if (opts.print) { results.push(['would write', w.dest]); continue; }
    if (exists && !opts.force) { results.push(['exists — skipped (use --force)', w.dest]); continue; }
    fs.mkdirSync(path.dirname(w.dest), { recursive: true });
    fs.writeFileSync(w.dest, w.content);
    if (w.mode) { try { fs.chmodSync(w.dest, w.mode); } catch { /* best effort on non-POSIX */ } }
    results.push([exists ? 'overwrote' : 'wrote', w.dest]);
  }

  // Claude Stop hook: merge into settings.json (opt-in via --hook).
  let hookNote = null;
  if (agent === 'claude' && opts.hook) {
    const settingsPath = useGlobal ? path.join(home, '.claude', 'settings.json') : path.join(dir, '.claude', 'settings.json');
    const command = useGlobal
      ? `sh "${path.join(home, '.claude', 'hooks', 'reviewport-stop.sh')}"`
      : 'sh "${CLAUDE_PROJECT_DIR}/.claude/hooks/reviewport-stop.sh"';
    hookNote = opts.print ? `would add a Stop hook to ${settingsPath}` : mergeStopHook(settingsPath, command);
  }

  return { agent, scope: useGlobal ? 'global' : 'project', results, hookNote, nextSteps };
}

// Merge a Stop hook into a Claude settings.json without clobbering existing config.
function mergeStopHook(settingsPath, command) {
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
    catch { return `could not parse ${settingsPath} — left unchanged; add the Stop hook manually (see integrations/claude-code/)`; }
  }
  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  if (!Array.isArray(settings.hooks.Stop)) settings.hooks.Stop = [];
  if (JSON.stringify(settings.hooks.Stop).includes('reviewport-stop.sh')) {
    return `Stop hook already present in ${settingsPath} — left unchanged`;
  }
  settings.hooks.Stop.push({ hooks: [{ type: 'command', command }] });
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return `added Stop hook to ${settingsPath}`;
}
