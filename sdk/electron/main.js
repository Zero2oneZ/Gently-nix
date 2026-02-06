const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

// ═══════════════════════════════════════
// PATHS
// ═══════════════════════════════════════
const HOME = process.env.HOME || '/home/gently';
const CONFIG_DIR = path.join(HOME, '.config', 'gently');
const PROJECTS_DIR = path.join(HOME, 'projects');
const INITIALIZED_FLAG = path.join(CONFIG_DIR, '.initialized');
const WINDOWS_STATE = path.join(CONFIG_DIR, 'windows.json');

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let mainWindow = null;          // Current Gently BrowserWindow
let gentlyWindows = new Map();  // windowId -> { bw, focusView, processView, data }
let cliProcess = null;          // Claude CLI background process
let isSetup = false;

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function ensureDirs() {
  [CONFIG_DIR, PROJECTS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function isFirstBoot() {
  return !fs.existsSync(INITIALIZED_FLAG);
}

function getSSHPubKey() {
  const keyPath = path.join(HOME, '.ssh', 'gently_ed25519.pub');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8').trim();
  }
  return '(SSH key not yet generated — will appear on next boot)';
}

// ═══════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════
function createGentlyWindow(windowData) {
  const { id, name, constants, isSetupMode } = windowData;

  const bw = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,       // Frameless — Gently draws its own title bar
    backgroundColor: '#08080c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,  // We use BrowserView, not webview
    },
  });

  if (isSetupMode) {
    bw.loadFile('setup.html');
  } else {
    bw.loadFile('shell.html');
  }

  // Maximize on launch
  bw.maximize();

  // Store reference
  const entry = { bw, focusView: null, processView: null, data: windowData };
  gentlyWindows.set(id, entry);

  // Once shell loads, create embedded Claude views
  if (!isSetupMode) {
    bw.webContents.on('did-finish-load', () => {
      createEmbeddedViews(id);
      // Send constants to renderer
      bw.webContents.send('constants-loaded', constants || []);
      bw.webContents.send('window-data', windowData);
    });
  }

  bw.on('closed', () => {
    gentlyWindows.delete(id);
  });

  return bw;
}

function createEmbeddedViews(windowId) {
  const entry = gentlyWindows.get(windowId);
  if (!entry) return;

  const { bw } = entry;
  const bounds = bw.getBounds();

  // Calculate pane positions (matching our CSS grid)
  const shelfW = 240;
  const stampH = 32;
  const bottomH = 190;
  const tabH = 34;
  const paneTop = tabH;
  const paneH = bounds.height - tabH - stampH - bottomH;
  const paneW = Math.floor((bounds.width - shelfW * 2) / 2);

  // Focus pane — claude.ai
  const focusView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'inject', 'stamp-inject.js'),
      contextIsolation: true,
    },
  });
  bw.addBrowserView(focusView);
  focusView.setBounds({
    x: shelfW,
    y: paneTop,
    width: paneW,
    height: paneH,
  });
  focusView.setAutoResize({ width: true, height: true });
  focusView.webContents.loadURL('https://claude.ai/new');
  entry.focusView = focusView;

  // Process pane — claude.ai
  const processView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'inject', 'stamp-inject.js'),
      contextIsolation: true,
    },
  });
  bw.addBrowserView(processView);
  processView.setBounds({
    x: shelfW + paneW,
    y: paneTop,
    width: paneW,
    height: paneH,
  });
  processView.setAutoResize({ width: true, height: true });
  processView.webContents.loadURL('https://claude.ai/new');
  entry.processView = processView;

  // Handle resize
  bw.on('resize', () => {
    const newBounds = bw.getContentBounds();
    const newPaneW = Math.floor((newBounds.width - shelfW * 2) / 2);
    const newPaneH = newBounds.height - tabH - stampH - bottomH;

    focusView.setBounds({ x: shelfW, y: paneTop, width: newPaneW, height: newPaneH });
    processView.setBounds({ x: shelfW + newPaneW, y: paneTop, width: newPaneW, height: newPaneH });
  });
}

// ═══════════════════════════════════════
// GIT OPERATIONS
// ═══════════════════════════════════════
function gitInit(projectDir) {
  execSync('git init', { cwd: projectDir });
  execSync('git commit --allow-empty -m "init: project created"', { cwd: projectDir });
  return gitHash(projectDir);
}

function gitBranch(projectDir, branchName) {
  execSync(`git checkout -b "${branchName}"`, { cwd: projectDir });
}

function gitWorktreeAdd(projectDir, worktreePath, branchName) {
  // Create branch if it doesn't exist
  try {
    execSync(`git branch "${branchName}"`, { cwd: projectDir });
  } catch (e) { /* branch may already exist */ }
  execSync(`git worktree add "${worktreePath}" "${branchName}"`, { cwd: projectDir });
}

function gitCommit(dir, message, files) {
  if (files && files.length > 0) {
    files.forEach(f => {
      const fp = path.join(dir, f);
      if (!fs.existsSync(path.dirname(fp))) {
        fs.mkdirSync(path.dirname(fp), { recursive: true });
      }
      if (!fs.existsSync(fp)) {
        fs.writeFileSync(fp, ''); // touch
      }
    });
    execSync('git add -A', { cwd: dir });
  }
  try {
    execSync(`git commit -m "${message}" --allow-empty`, { cwd: dir });
  } catch (e) { /* nothing to commit */ }
  return gitHash(dir);
}

function gitTag(dir, tagName) {
  execSync(`git tag "${tagName}"`, { cwd: dir });
}

function gitHash(dir) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim();
  } catch (e) {
    return '00000000';
  }
}

// ═══════════════════════════════════════
// CLAUDE CLI BRIDGE
// ═══════════════════════════════════════
function startCLI(workDir) {
  if (cliProcess) {
    cliProcess.kill();
  }

  cliProcess = spawn('claude', ['--agent'], {
    cwd: workDir,
    env: { ...process.env, CLAUDE_WORKSPACE: workDir },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  cliProcess.stdout.on('data', (data) => {
    // Forward CLI output to all Gently windows
    gentlyWindows.forEach((entry) => {
      entry.bw.webContents.send('cli-output', data.toString());
    });
  });

  cliProcess.stderr.on('data', (data) => {
    console.error('CLI error:', data.toString());
  });

  cliProcess.on('exit', (code) => {
    console.log('CLI process exited:', code);
    cliProcess = null;
  });
}

function sendToCLI(instruction) {
  if (cliProcess && cliProcess.stdin.writable) {
    cliProcess.stdin.write(instruction + '\n');
  }
}

// ═══════════════════════════════════════
// PROJECT OPERATIONS
// ═══════════════════════════════════════
function createProject(name) {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const dir = path.join(PROJECTS_DIR, id);

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'worktrees'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'constants'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'stamps'), { recursive: true });

  // Init git
  const hash = gitInit(dir);

  // Create gently.json
  const config = {
    id,
    name,
    created: new Date().toISOString(),
    gates: [
      { letter: 'A', question: '', state: 'open' },
      { letter: 'B', question: '', state: 'open' },
      { letter: 'C', question: '', state: 'open' },
      { letter: 'D', question: '', state: 'open' },
      { letter: 'E', question: '', state: 'open' },
    ],
    clans: [],
    windows: [{ id: 'win-root', name, constants: [], gitBranch: 'main' }],
    activeWindow: 'win-root',
  };

  fs.writeFileSync(path.join(dir, 'gently.json'), JSON.stringify(config, null, 2));
  gitCommit(dir, 'init: gently project created', ['gently.json']);

  return config;
}

function addClan(projectId, clanName, context) {
  const dir = path.join(PROJECTS_DIR, projectId);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'gently.json'), 'utf-8'));

  const clanId = `clan-${config.clans.length}-${clanName.toLowerCase().replace(/\s+/g, '-')}`;
  const branchName = `clan/${clanId}`;
  const worktreePath = path.join(dir, 'worktrees', clanId);

  // Create git worktree (parallel branch, no switching)
  gitWorktreeAdd(dir, worktreePath, branchName);

  // Write clan context
  fs.writeFileSync(path.join(worktreePath, 'context.md'), context);
  fs.writeFileSync(path.join(worktreePath, 'state.json'), JSON.stringify({
    id: clanId,
    name: clanName,
    depth: 0,
    pin: '',
    state: 'active',
    gates: [],
  }, null, 2));

  gitCommit(worktreePath, `clan-start: ${clanName}`, ['context.md', 'state.json']);

  // Update project config
  config.clans.push({
    id: clanId,
    name: clanName,
    branch: branchName,
    worktree: worktreePath,
    state: 'active',
    desktopChatId: `chat-${clanId}`,
  });

  fs.writeFileSync(path.join(dir, 'gently.json'), JSON.stringify(config, null, 2));

  return config.clans[config.clans.length - 1];
}

function collapseClans(projectId, clanIds, newWindowName) {
  const dir = path.join(PROJECTS_DIR, projectId);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'gently.json'), 'utf-8'));

  const sources = config.clans.filter(c => clanIds.includes(c.id) && c.state === 'active');
  if (sources.length < 2) return null;

  const constants = [];

  // Freeze each clan
  sources.forEach(clan => {
    clan.state = 'frozen';

    // Read clan's current state
    const stateFile = path.join(clan.worktree, 'state.json');
    const clanState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

    // Commit freeze
    const hash = gitCommit(clan.worktree, `FROZEN: collapsed into ${newWindowName}`, ['state.json']);

    // Tag as constant
    const tagName = `const/${clan.id}`;
    gitTag(clan.worktree, tagName);

    // Build constant
    const constant = {
      id: `const-${clan.id}`,
      sourceName: clan.name,
      summary: clanState.pin || '',
      gateSnapshot: clanState.gates || [],
      gitTag: tagName,
      gitCommit: hash,
      depth: clanState.depth || 0,
    };
    constants.push(constant);

    // Write constant file
    fs.writeFileSync(
      path.join(dir, 'constants', `${clan.id}.json`),
      JSON.stringify(constant, null, 2)
    );
  });

  // Create new window branch
  const windowBranch = `window/${newWindowName.toLowerCase().replace(/\s+/g, '-')}`;
  gitBranch(dir, windowBranch);
  const mergeHash = gitCommit(dir, `COLLAPSE: ${sources.map(s => s.name).join(' + ')} → ${newWindowName}`, ['constants/']);

  // Inherit parent window's constants + add new ones
  const parentWindow = config.windows.find(w => w.id === config.activeWindow);
  const allConstants = [...(parentWindow?.constants || []), ...constants];

  // Create new window in config
  const windowId = `win-${Date.now()}`;
  config.windows.push({
    id: windowId,
    name: newWindowName,
    parentWindow: config.activeWindow,
    constants: allConstants,
    gitBranch: windowBranch,
    gitCommitAtBirth: mergeHash,
  });
  config.activeWindow = windowId;

  fs.writeFileSync(path.join(dir, 'gently.json'), JSON.stringify(config, null, 2));

  // Build synthesis prompt
  const prompt = buildSynthesisPrompt(newWindowName, allConstants, windowBranch, mergeHash);

  return { windowId, constants: allConstants, prompt, mergeHash };
}

function buildSynthesisPrompt(name, constants, branch, hash) {
  let lines = [
    `=== GENTLY WINDOW: ${name} ===`,
    `Git: ${branch} @ ${hash}`,
    `Constants (immutable, ${constants.length} total):`,
    '',
  ];
  constants.forEach(c => {
    lines.push(`  [${c.gitTag}] ${c.sourceName}`);
    lines.push(`    "${c.summary}"`);
    if (c.gateSnapshot?.length) {
      const gs = c.gateSnapshot.map(g => `${g.letter}${g.state}`).join(' ');
      lines.push(`    gates: ${gs} | depth: ${c.depth}`);
    }
    lines.push('');
  });
  lines.push('=== BUILD ON THESE CONSTANTS ===');
  return lines.join('\n');
}

// ═══════════════════════════════════════
// STAMP GENERATION
// ═══════════════════════════════════════
function generateStamp(projectId, clanId) {
  const dir = path.join(PROJECTS_DIR, projectId);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'gently.json'), 'utf-8'));
  const clan = config.clans.find(c => c.id === clanId);
  if (!clan) return '[OLO|?]';

  const stateFile = path.join(clan.worktree, 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  const gs = (state.gates || []).map(g => `${g.letter}${g.state === 'yes' ? '●' : g.state === 'no' ? '✕' : g.state === 'half' ? '◐' : '○'}`).join('');
  const hash = gitHash(clan.worktree);
  const ts = new Date().toISOString().slice(5, 16).replace(/-/g, '').replace(':', '');
  const pin = (state.pin || '').slice(0, 20).replace(/\s/g, '-');

  return `[OLO|🌿${clan.branch}|📍${state.depth}|🔒${gs}|📌${pin}|#${hash}|⏱${ts}]`;
}

// ═══════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════
ipcMain.handle('is-first-boot', () => isFirstBoot());
ipcMain.handle('get-ssh-pubkey', () => getSSHPubKey());

ipcMain.handle('complete-setup', (event, { gitName, gitEmail }) => {
  // Set git config
  execSync(`git config --global user.name "${gitName}"`);
  execSync(`git config --global user.email "${gitEmail}"`);
  // Write initialized flag
  fs.writeFileSync(INITIALIZED_FLAG, new Date().toISOString());
  return true;
});

ipcMain.handle('create-project', (event, { name }) => {
  return createProject(name);
});

ipcMain.handle('add-clan', (event, { projectId, name, context }) => {
  return addClan(projectId, name, context);
});

ipcMain.handle('collapse', (event, { projectId, clanIds, name }) => {
  return collapseClans(projectId, clanIds, name);
});

ipcMain.handle('get-stamp', (event, { projectId, clanId }) => {
  return generateStamp(projectId, clanId);
});

ipcMain.handle('cli-send', (event, { instruction, workDir }) => {
  sendToCLI(instruction);
});

ipcMain.handle('git-hash', (event, { dir }) => {
  return gitHash(dir);
});

ipcMain.handle('spawn-window', (event, { windowData }) => {
  createGentlyWindow(windowData);
});

// ═══════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════
app.whenReady().then(() => {
  ensureDirs();

  if (isFirstBoot()) {
    // Setup mode
    createGentlyWindow({
      id: 'setup',
      name: 'Gently Setup',
      constants: [],
      isSetupMode: true,
    });
  } else {
    // Normal mode — load last project or show project picker
    const windowData = {
      id: 'win-root',
      name: 'Gently',
      constants: [],
      isSetupMode: false,
    };

    // Try to load saved window state
    if (fs.existsSync(WINDOWS_STATE)) {
      const saved = JSON.parse(fs.readFileSync(WINDOWS_STATE, 'utf-8'));
      Object.assign(windowData, saved);
    }

    mainWindow = createGentlyWindow(windowData);
  }
});

app.on('window-all-closed', () => {
  // Save window state
  const state = {};
  gentlyWindows.forEach((entry, id) => {
    state[id] = entry.data;
  });
  fs.writeFileSync(WINDOWS_STATE, JSON.stringify(state, null, 2));

  if (cliProcess) cliProcess.kill();
  app.quit();
});
