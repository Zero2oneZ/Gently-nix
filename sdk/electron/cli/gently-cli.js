#!/usr/bin/env node
/**
 * gently-cli.js — Command-line interface for Gently project management
 *
 * Usage:
 *   gently init <name>              Create new project + git repo
 *   gently clan <name> [context]    Add independent clan
 *   gently collapse <a> <b> <name>  Collapse clans → new window
 *   gently stamp [clan]             Show current stamp
 *   gently gate <letter> [state]    View/set gate state
 *   gently status                   Show project tree
 *   gently windows                  List all windows
 *   gently log                      Git log with gently context
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME = process.env.HOME || '/home/gently';
const PROJECTS_DIR = path.join(HOME, 'projects');

// ─── Find active project ───
function findProject() {
  const cwd = process.cwd();
  // Check if we're inside a project dir
  let dir = cwd;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'gently.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Check for single project
  if (fs.existsSync(PROJECTS_DIR)) {
    const dirs = fs.readdirSync(PROJECTS_DIR);
    if (dirs.length === 1) {
      const d = path.join(PROJECTS_DIR, dirs[0]);
      if (fs.existsSync(path.join(d, 'gently.json'))) return d;
    }
  }
  return null;
}

function loadConfig(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'gently.json'), 'utf-8'));
}

function saveConfig(dir, config) {
  fs.writeFileSync(path.join(dir, 'gently.json'), JSON.stringify(config, null, 2));
}

function gitHash(dir) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim();
  } catch { return '0000'; }
}

// ─── Gate symbols ───
const GS = { open: '○', half: '◐', yes: '●', no: '✕', revisit: '↺' };

// ═══ COMMANDS ═══

function cmdInit(name) {
  if (!name) { console.log('Usage: gently init <project-name>'); return; }
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const dir = path.join(PROJECTS_DIR, id);

  fs.mkdirSync(dir, { recursive: true });
  ['worktrees', 'constants', 'artifacts', 'stamps'].forEach(d =>
    fs.mkdirSync(path.join(dir, d), { recursive: true })
  );

  execSync('git init', { cwd: dir });
  execSync('git commit --allow-empty -m "init: project created"', { cwd: dir });

  const config = {
    id, name,
    created: new Date().toISOString(),
    gates: 'ABCDE'.split('').map(l => ({ letter: l, question: '', state: 'open' })),
    clans: [],
    windows: [{ id: 'win-root', name, constants: [], gitBranch: 'main' }],
    activeWindow: 'win-root',
  };
  saveConfig(dir, config);
  execSync('git add -A && git commit -m "init: gently config"', { cwd: dir });

  console.log(`✓ Project created: ${dir}`);
  console.log(`  git: main @ ${gitHash(dir)}`);
}

function cmdClan(name, context) {
  const dir = findProject();
  if (!dir) { console.log('Not in a gently project. Run: gently init <name>'); return; }
  if (!name) { console.log('Usage: gently clan <name> [context]'); return; }

  const config = loadConfig(dir);
  const clanId = `clan-${config.clans.length}-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const branch = `clan/${clanId}`;
  const wt = path.join(dir, 'worktrees', clanId);

  try { execSync(`git branch "${branch}"`, { cwd: dir }); } catch {}
  execSync(`git worktree add "${wt}" "${branch}"`, { cwd: dir });

  const ctx = context || `Independent exploration: ${name}`;
  fs.writeFileSync(path.join(wt, 'context.md'), ctx);
  fs.writeFileSync(path.join(wt, 'state.json'), JSON.stringify({
    id: clanId, name, depth: 0, pin: '', state: 'active', gates: [],
  }, null, 2));
  execSync('git add -A && git commit -m "clan-start: ' + name + '"', { cwd: wt });

  config.clans.push({ id: clanId, name, branch, worktree: wt, state: 'active' });
  saveConfig(dir, config);

  console.log(`✓ Clan created: ${name}`);
  console.log(`  branch: ${branch}`);
  console.log(`  worktree: ${wt}`);
  console.log(`  hash: ${gitHash(wt)}`);
}

function cmdStatus() {
  const dir = findProject();
  if (!dir) { console.log('Not in a gently project.'); return; }

  const config = loadConfig(dir);

  console.log(`\n◆ ${config.name}`);
  console.log(`│ git: ${gitHash(dir)}`);
  console.log(`│ gates: ${config.gates.map(g => `${g.letter}${GS[g.state]}`).join(' ')}`);
  console.log('│');

  const active = config.clans.filter(c => c.state === 'active');
  const frozen = config.clans.filter(c => c.state === 'frozen');

  if (active.length) {
    console.log('│ ACTIVE CLANS:');
    active.forEach(c => {
      let state = { depth: 0, pin: '' };
      try { state = JSON.parse(fs.readFileSync(path.join(c.worktree, 'state.json'), 'utf-8')); } catch {}
      const h = gitHash(c.worktree);
      console.log(`│   ◆ ${c.name} [d=${state.depth}] "${state.pin}" #${h}`);
    });
  }

  if (frozen.length) {
    console.log('│ FROZEN:');
    frozen.forEach(c => {
      console.log(`│   ❄ ${c.name}`);
    });
  }

  console.log('│');
  console.log(`│ WINDOWS: ${config.windows.length}`);
  config.windows.forEach(w => {
    const isActive = w.id === config.activeWindow;
    console.log(`│   ${isActive ? '◆' : '○'} ${w.name} [${w.constants?.length || 0} constants] ${w.gitBranch}`);
  });
  console.log();
}

function cmdStamp(clanRef) {
  const dir = findProject();
  if (!dir) { console.log('Not in a gently project.'); return; }

  const config = loadConfig(dir);
  const clan = clanRef
    ? config.clans.find(c => c.name.toLowerCase().includes(clanRef.toLowerCase()) || c.id.includes(clanRef))
    : config.clans.find(c => c.state === 'active');

  if (!clan) { console.log('No active clan found.'); return; }

  let state = { depth: 0, pin: '', gates: [] };
  try { state = JSON.parse(fs.readFileSync(path.join(clan.worktree, 'state.json'), 'utf-8')); } catch {}

  const gs = (state.gates || config.gates).map(g => `${g.letter}${GS[g.state] || '○'}`).join('');
  const h = gitHash(clan.worktree);
  const ts = new Date().toISOString().slice(5, 16).replace(/-/g, '').replace(':', '');
  const pin = (state.pin || '').slice(0, 20).replace(/\s/g, '-');

  const stamp = `[OLO|🌿${clan.branch}|📍${state.depth}|🔒${gs}|📌${pin}|#${h}|⏱${ts}]`;
  console.log(stamp);
}

function cmdGate(letter, newState) {
  const dir = findProject();
  if (!dir) { console.log('Not in a gently project.'); return; }

  const config = loadConfig(dir);

  if (!letter) {
    // Show all gates
    config.gates.forEach(g => {
      console.log(`  ${g.letter}${GS[g.state]}  ${g.question || '(no question)'}`);
    });
    return;
  }

  const gate = config.gates.find(g => g.letter === letter.toUpperCase());
  if (!gate) { console.log(`Gate ${letter} not found.`); return; }

  if (newState) {
    const valid = Object.keys(GS);
    if (!valid.includes(newState)) {
      console.log(`Invalid state. Valid: ${valid.join(', ')}`);
      return;
    }
    gate.state = newState;
    saveConfig(dir, config);
    console.log(`  ${gate.letter}${GS[gate.state]}  ${gate.question || '(updated)'}`);
  } else {
    console.log(`  ${gate.letter}${GS[gate.state]}  ${gate.question || ''}`);
  }
}

function cmdWindows() {
  const dir = findProject();
  if (!dir) return;
  const config = loadConfig(dir);

  config.windows.forEach(w => {
    const isActive = w.id === config.activeWindow;
    const consts = w.constants?.length || 0;
    console.log(`${isActive ? '◆' : '○'} ${w.name}`);
    console.log(`  branch: ${w.gitBranch} | constants: ${consts}`);
    if (w.constants?.length) {
      w.constants.forEach(c => {
        console.log(`    ▒ ${c.sourceName}: "${c.summary}"`);
      });
    }
  });
}

function cmdLog() {
  const dir = findProject();
  if (!dir) return;
  console.log(execSync('git log --oneline --graph --all -20', { cwd: dir }).toString());
}

function cmdHelp() {
  console.log(`
gently — AI development shell CLI

  gently init <name>              Create new project
  gently clan <name> [context]    Add independent clan
  gently collapse <a> <b> <name>  Collapse clans → new window
  gently stamp [clan]             Show current stamp
  gently gate [letter] [state]    View/set gates
  gently status                   Project tree
  gently windows                  List windows
  gently log                      Git log
  gently help                     This message
  `);
}

// ═══ DISPATCH ═══
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'init':     cmdInit(args.join(' ')); break;
  case 'clan':     cmdClan(args[0], args.slice(1).join(' ')); break;
  case 'status':   cmdStatus(); break;
  case 'stamp':    cmdStamp(args[0]); break;
  case 'gate':     cmdGate(args[0], args[1]); break;
  case 'windows':  cmdWindows(); break;
  case 'log':      cmdLog(); break;
  case 'help':     cmdHelp(); break;
  default:         cmdHelp();
}
