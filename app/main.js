const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

// GuardDog - Tier 0 IO Defense
const { createGuardDog, EnvironmentValidator, ValidationStatus } = require('guarddog');
const guarddog = createGuardDog();

// Environment Validation - runs on every boot
const envValidator = new EnvironmentValidator({ devMode: process.env.GENTLY_DEV_MODE === 'true' });
let envValidation = null;

// Tier System - Code-Locked Rotation
const { TierGate, TIERS, FEATURE_REQUIREMENTS } = require('./lib/tier-gate');
const { RotationState } = require('./lib/rotation-state');
const { bridgeRPC, checkBridgeStatus, BridgeAPI } = require('./lib/bridge-client');
const { invokeGently, CLI } = require('./lib/cli-bridge');

// Phase 9 Client Libraries
const { CoreClient, LOCK_MODE } = require('./lib/core-client');
const { CipherClient, CIPHER_TYPE } = require('./lib/cipher-client');
const { AudioClient, AUDIO_MODE } = require('./lib/audio-client');
const { BTCClient, BERLIN_PERIODS } = require('./lib/btc-client');
const { SecurityClient, THREAT_LEVEL, SECURITY_DOMAIN } = require('./lib/security-client');
const { BrainClient, MEMORY_TYPE, LEARNING_MODE } = require('./lib/brain-client');
const { InferenceClient, QUALITY_LEVEL, INFERENCE_MODE } = require('./lib/inference-client');
const { MicroClient, MODEL_TYPE } = require('./lib/micro-client');
const { GatewayClient, ENDPOINT_TYPE, PRIORITY } = require('./lib/gateway-client');
const { SIMClient, SIM_TYPE, NETWORK_TYPE } = require('./lib/sim-client');
const { CodieClient, CODIE_KEYWORDS } = require('./lib/codie-client');

// New Feature Client Libraries (Bluetooth, StartMenu, Bucket)
const { BluetoothClient, BT_STATE, MESSAGE_TYPE, BLE_SERVICES } = require('./lib/bluetooth-client');
const { StartMenuClient, ITEM_TYPE, SETTING_TYPE } = require('./lib/startmenu-client');
const { BucketClient, CONTENT_TYPE, IMPORT_STATE } = require('./lib/bucket-client');
const { MinerClient, MINER_STATE, POOL_PRESETS, Z3RO2Z } = require('./lib/miner-client');
const { ControllerClient, BUTTON, AXIS, EV_TYPE } = require('./lib/controller-client');

// Maya-style Menu and Action System
const { HotkeyMenuClient, MENU_TYPE, LAYOUT, DIRECTION } = require('./lib/hotkey-menu-client');
const { ActionServerClient, PRIORITY: ACTION_PRIORITY, ACTION_STATE } = require('./lib/action-server-client');
const { WiresharkClient, PROTOCOL, CAPTURE_STATE } = require('./lib/wireshark-client');
const { ButtonMakerClient, SHAPE, SIZE } = require('./lib/button-maker-client');
const { WaylandClient, WINDOW_STATE, LAYOUT_MODE, WORKSPACE_TYPE } = require('./lib/wayland-client');
const { SMSClient, MESSAGE_TYPE: SMS_MESSAGE_TYPE, MESSAGE_STATUS, CONNECTION_TYPE } = require('./lib/sms-client');
const { PhoneClient, EMULATOR_TYPE, EMULATOR_STATE, DEVICE_TYPE } = require('./lib/phone-client');
const { VMClient, VM_BACKEND, VM_STATE, OS_TYPE, NETWORK_MODE } = require('./lib/vm-client');

// LivePeer Video Streaming and Model Hub
const { LivePeerClient, STREAM_STATE, TRANSCODE_PROFILE, AI_PIPELINE } = require('./lib/livepeer-client');
const { ModelHubClient, MODEL_TYPE: HUB_MODEL_TYPE, MODEL_FORMAT, MODEL_SOURCE, MODEL_STATUS } = require('./lib/model-hub-client');

// DNS, Telephony, and Gmail
const { DNSClient, RECORD_TYPE, DNS_PROVIDER, HOSTING_PRESET } = require('./lib/dns-client');
const { TelephonyClient, TELEPHONY_PROVIDER, MESSAGE_STATUS: TEL_MESSAGE_STATUS, CALL_STATUS, NUMBER_TYPE } = require('./lib/telephony-client');
const { GmailClient, EMAIL_STATUS, GMAIL_LABEL, SYNC_STATE: GMAIL_SYNC_STATE } = require('./lib/gmail-client');

// Face Tracking, Avatar Studio, Graphics, Tab Views, Intro
const { FaceTrackingClient, LANDMARK, EXPRESSION, TRACKING_STATE } = require('./lib/face-tracking-client');
const { AvatarStudioClient, AVATAR_STYLE, AVATAR_PART, EXPORT_FORMAT } = require('./lib/avatar-studio-client');
const { RealtimeGraphicsClient, RENDER_MODE, EFFECT_TYPE, LAYER_TYPE, EASING } = require('./lib/realtime-graphics-client');
const { TabViewSwitcherClient, TRANSITION_TYPE, TAB_STATE, VIEW_MODE } = require('./lib/tab-view-switcher-client');
const { IntroCreatorClient, INTRO_STYLE, ELEMENT_TYPE, ANIMATION_PRESET, TEMPLATES } = require('./lib/intro-creator-client');

// TradingView Integration
const { TradingViewClient, TV_STATE, TIMEFRAME, CHART_TYPE, ORDER_TYPE, POSITION_SIDE, PINESCRIPT_TEMPLATES } = require('./lib/tradingview-client');

let rotationState = new RotationState();
let bridgeOnline = false;
let bridgeCheckInterval = null;

// Phase 9 Client Instances
const coreClient = new CoreClient();
const cipherClient = new CipherClient();
const audioClient = new AudioClient();
const btcClient = new BTCClient();
const securityClient = new SecurityClient();
const brainClient = new BrainClient();
const inferenceClient = new InferenceClient();
const microClient = new MicroClient();
const gatewayClient = new GatewayClient();
const simClient = new SIMClient();
const codieClient = new CodieClient();

// New Feature Client Instances
const bluetoothClient = new BluetoothClient();
const startMenuClient = new StartMenuClient();
const bucketClient = new BucketClient();
const minerClient = new MinerClient();
const controllerClient = new ControllerClient();

// Maya Menu and Action System Instances
const hotkeyMenuClient = new HotkeyMenuClient();
const actionServerClient = new ActionServerClient();
const wiresharkClient = new WiresharkClient();
const buttonMakerClient = new ButtonMakerClient();
const waylandClient = new WaylandClient();
const smsClient = new SMSClient();
const phoneClient = new PhoneClient();
const vmClient = new VMClient();

// LivePeer and Model Hub Instances
const livePeerClient = new LivePeerClient();
const modelHubClient = new ModelHubClient();

// DNS, Telephony, and Gmail Instances
const dnsClient = new DNSClient();
const telephonyClient = new TelephonyClient();
const gmailClient = new GmailClient();

// Face Tracking, Avatar Studio, Graphics, Tab Views, Intro Instances
const faceTrackingClient = new FaceTrackingClient();
const avatarStudioClient = new AvatarStudioClient();
const realtimeGraphicsClient = new RealtimeGraphicsClient();
const tabViewSwitcherClient = new TabViewSwitcherClient();
const introCreatorClient = new IntroCreatorClient();

// TradingView Instance
const tradingViewClient = new TradingViewClient();

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

  // Layout constants matching crystallized CSS
  const SHELF_W = 44;      // --shelf-w in CSS
  const TOP_BAR_H = 32;    // topbar height
  const PANE_HEAD_H = 24;  // paneA-head / paneB-head height
  const STAMP_H = 24;      // stamp bar height
  const BOTTOM_H = 44;     // bottom bar height

  function calculateBounds() {
    const contentBounds = bw.getContentBounds();
    const mainTop = TOP_BAR_H;
    const mainHeight = contentBounds.height - TOP_BAR_H - STAMP_H - BOTTOM_H;
    const paneTop = mainTop + PANE_HEAD_H;
    const paneHeight = mainHeight - PANE_HEAD_H;
    const contentWidth = contentBounds.width - (SHELF_W * 2);
    const paneWidth = Math.floor(contentWidth / 2);

    return {
      focus: {
        x: SHELF_W,
        y: paneTop,
        width: paneWidth,
        height: paneHeight
      },
      process: {
        x: SHELF_W + paneWidth,
        y: paneTop,
        width: paneWidth,
        height: paneHeight
      }
    };
  }

  const bounds = calculateBounds();

  // Focus pane - claude.ai
  const focusView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'inject', 'stamp-inject.js'),
      contextIsolation: true,
      partition: 'persist:gently'  // Share session for auth
    },
  });
  bw.addBrowserView(focusView);
  focusView.setBounds(bounds.focus);
  focusView.webContents.loadURL('https://claude.ai/new');
  entry.focusView = focusView;

  // Process pane - claude.ai
  const processView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'inject', 'stamp-inject.js'),
      contextIsolation: true,
      partition: 'persist:gently'  // Share session for auth
    },
  });
  bw.addBrowserView(processView);
  processView.setBounds(bounds.process);
  processView.webContents.loadURL('https://claude.ai/new');
  entry.processView = processView;

  // Handle resize
  bw.on('resize', () => {
    const newBounds = calculateBounds();
    focusView.setBounds(newBounds.focus);
    processView.setBounds(newBounds.process);
  });

  // Handle maximize/unmaximize
  bw.on('maximize', () => {
    setTimeout(() => {
      const newBounds = calculateBounds();
      focusView.setBounds(newBounds.focus);
      processView.setBounds(newBounds.process);
    }, 100);
  });

  bw.on('unmaximize', () => {
    setTimeout(() => {
      const newBounds = calculateBounds();
      focusView.setBounds(newBounds.focus);
      processView.setBounds(newBounds.process);
    }, 100);
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
    // GuardDog: scan before sending to CLI
    const result = guarddog.process(instruction);
    if (result.blocked) {
      console.warn('[GuardDog] BLOCKED CLI input:', result.threats);
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('guarddog-blocked', {
          input: instruction,
          threats: result.threats,
          threatLevel: result.threatLevel
        });
      });
      return;
    }
    // Use cleaned input
    cliProcess.stdin.write(result.output + '\n');
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

// Window controls
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// GuardDog IO Defense
ipcMain.handle('guarddog-scan', (event, { input }) => {
  return guarddog.scan(input);
});

ipcMain.handle('guarddog-clean', (event, { input }) => {
  return guarddog.clean(input);
});

ipcMain.handle('guarddog-process', (event, { input }) => {
  return guarddog.process(input);
});

ipcMain.handle('guarddog-init', async (event, { nodeModulesDir }) => {
  return await guarddog.init(nodeModulesDir);
});

// Environment Validation
ipcMain.handle('env-validate', () => {
  return envValidator.validate();
});

ipcMain.handle('env-status', () => {
  return envValidator.getBootStatus();
});

ipcMain.handle('env-profile', () => {
  return envValidator.currentProfile || envValidator.validate().profile;
});

ipcMain.handle('env-score', () => {
  return envValidator.getHardwareScore();
});

ipcMain.handle('env-report', () => {
  return envValidator.generateReport();
});

ipcMain.handle('env-reset', () => {
  return envValidator.resetBaseline();
});

// =============================================
// TIER SYSTEM - Code-Locked Rotation
// =============================================
ipcMain.handle('tier:get-effective', () => {
  const score = envValidator.getHardwareScore();
  const userTier = process.env.GENTLY_TIER || 'free';
  const gate = new TierGate(userTier, score, bridgeOnline);
  return {
    tier: gate.getEffectiveTier(),
    hardwareScore: score,
    userTier,
    bridgeOnline,
    tierLevel: TIERS[gate.getEffectiveTier()],
  };
});

ipcMain.handle('tier:check-feature', (_, { feature }) => {
  const score = envValidator.getHardwareScore();
  const userTier = process.env.GENTLY_TIER || 'free';
  const gate = new TierGate(userTier, score, bridgeOnline);
  const available = gate.isFeatureAvailable(feature);
  const reason = gate.getFeatureBlockReason(feature);
  return { available, reason, feature };
});

ipcMain.handle('tier:get-scope-features', (_, { scope }) => {
  const score = envValidator.getHardwareScore();
  const userTier = process.env.GENTLY_TIER || 'free';
  const gate = new TierGate(userTier, score, bridgeOnline);
  return gate.getAvailableFeatures(scope);
});

ipcMain.handle('tier:get-all-features', () => {
  const score = envValidator.getHardwareScore();
  const userTier = process.env.GENTLY_TIER || 'free';
  const gate = new TierGate(userTier, score, bridgeOnline);
  return {
    chat: gate.getAvailableFeatures('chat'),
    feed: gate.getAvailableFeatures('feed'),
    build: gate.getAvailableFeatures('build'),
    doc: gate.getAvailableFeatures('doc'),
  };
});

// =============================================
// BRIDGE INTEGRATION
// =============================================
ipcMain.handle('bridge:status', () => checkBridgeStatus());

ipcMain.handle('bridge:rpc', async (_, { method, params }) => {
  try {
    return await bridgeRPC(method, params);
  } catch (err) {
    return { error: err.message };
  }
});

// Feed via Bridge
ipcMain.handle('bridge:feed-list', async (_, { limit }) => {
  try {
    return await BridgeAPI.feedList(limit);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('bridge:feed-fork', async (_, { id }) => {
  try {
    return await BridgeAPI.feedFork(id);
  } catch (err) {
    return { error: err.message };
  }
});

// Search via Bridge
ipcMain.handle('bridge:search', async (_, { query, options }) => {
  try {
    return await BridgeAPI.search(query, options);
  } catch (err) {
    return { error: err.message };
  }
});

// G.E.D. via Bridge
ipcMain.handle('bridge:ged-translate', async (_, { text, mode }) => {
  try {
    return await BridgeAPI.gedTranslate(text, mode);
  } catch (err) {
    return { error: err.message };
  }
});

// MCP via Bridge
ipcMain.handle('bridge:mcp-tools', async () => {
  try {
    return await BridgeAPI.mcpTools();
  } catch (err) {
    return { error: err.message };
  }
});

// =============================================
// CLI INTEGRATION
// =============================================
ipcMain.handle('cli:invoke', async (_, { cmd, args }) => {
  try {
    return await invokeGently(cmd, args);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('cli:feed-list', async () => {
  try {
    return await CLI.feedShow({ json: true });
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('cli:search', async (_, { query }) => {
  try {
    return await CLI.search(query, { json: true });
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('cli:mcp-tools', async () => {
  try {
    return await CLI.mcpTools();
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('cli:goo-sample', async (_, { count }) => {
  try {
    return await CLI.gooSample(count);
  } catch (err) {
    return { error: err.message };
  }
});

// =============================================
// LIVING FEED INTEGRATION
// =============================================
const { FeedClient, FeedState, ItemKind, getStateFromCharge, getStateColor, getKindIcon } = require('./lib/feed-client');
const feedClient = new FeedClient();

ipcMain.handle('feed:list', async () => {
  try {
    return await feedClient.list();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:add', async (_, { name, kind, content }) => {
  try {
    const result = await feedClient.add(name, kind, content);
    return { success: true, item: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:boost', async (_, { itemId, amount }) => {
  try {
    const result = await feedClient.boost(itemId, amount || 0.1);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:add-step', async (_, { itemId, content }) => {
  try {
    const result = await feedClient.addStep(itemId, content);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:complete-step', async (_, { itemId, stepId }) => {
  try {
    const result = await feedClient.completeStep(itemId, stepId);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:toggle-pin', async (_, { itemId }) => {
  try {
    const result = await feedClient.togglePin(itemId);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:verify', async (_, { itemId }) => {
  try {
    const result = await feedClient.verify(itemId);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:get-sorted', async () => {
  try {
    await feedClient.list(); // Refresh
    return { success: true, items: feedClient.getSortedItems() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('feed:get-by-state', async (_, { state }) => {
  try {
    await feedClient.list(); // Refresh
    return { success: true, items: feedClient.getItemsByState(state) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// DOCUMENT SYSTEM (Three-Chain)
// =============================================
const { DocClient, DocAction, DocType } = require('./lib/doc-client');
const docClient = new DocClient();

ipcMain.handle('doc:list', async () => {
  try {
    return await docClient.list();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:get', async (_, { docId }) => {
  try {
    return await docClient.get(docId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:create', async (_, { name, docType }) => {
  try {
    return await docClient.create(name, docType || DocType.THREE_CHAIN);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:add-user-step', async (_, { docId, content }) => {
  try {
    return await docClient.addUserStep(docId, content);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:add-claude-step', async (_, { docId, content }) => {
  try {
    return await docClient.addClaudeStep(docId, content);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:action', async (_, { docId, action }) => {
  try {
    return await docClient.action(docId, action);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:verify', async (_, { docId }) => {
  try {
    return await docClient.verify(docId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:finalize', async (_, { docId }) => {
  try {
    return await docClient.finalize(docId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// G.E.D. SYSTEM (Generative Educational Device)
// =============================================
const { GedClient, Domains, MasteryLevel } = require('./lib/ged-client');
const gedClient = new GedClient();

ipcMain.handle('ged:translate', async (_, { concept, domain }) => {
  try {
    return await gedClient.translate(concept, domain);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:analyze', async (_, { concept }) => {
  try {
    return await gedClient.analyze(concept);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:mastery', async (_, { conceptId, userId }) => {
  try {
    return await gedClient.getMastery(conceptId, userId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:badge', async (_, { conceptId, userId }) => {
  try {
    return await gedClient.getBadge(conceptId, userId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:record-exercise', async (_, { conceptId, score, evidence }) => {
  try {
    return await gedClient.recordExercise(conceptId, score, evidence);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:record-explain', async (_, { conceptId, score, evidence }) => {
  try {
    return await gedClient.recordExplanation(conceptId, score, evidence);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ged:domains', () => {
  return { success: true, domains: Object.values(Domains) };
});

// =============================================
// SEARCH SYSTEM (Alexandria)
// =============================================
const { SearchClient, SearchType, NavMode, ThoughtShape } = require('./lib/search-client');
const searchClient = new SearchClient();

ipcMain.handle('search:query', async (_, { query, options }) => {
  try {
    return await searchClient.query(query, options);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search:5w', async (_, params) => {
  try {
    return await searchClient.query5W(params);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search:collapse', async (_, { pin, collapse, enumerate, limit }) => {
  try {
    return await searchClient.collapse(pin, collapse, enumerate, limit);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search:navigate', async (_, { conceptId, mode }) => {
  try {
    return await searchClient.navigate(conceptId, mode);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search:add-thought', async (_, { content, shape, metadata }) => {
  try {
    return await searchClient.addThought(content, shape, metadata);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search:wormholes', async (_, { conceptId }) => {
  try {
    return await searchClient.getWormholes(conceptId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// GOO FIELD (Unified Distance Field Engine)
// =============================================
const { GooClient, RegionShape, EmotionalState } = require('./lib/goo-client');
const gooClient = new GooClient();

ipcMain.handle('goo:create-field', async (_, { blend }) => {
  try {
    const field = gooClient.createField(blend || 0.3);
    return { success: true, field };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:add-region', async (_, { region }) => {
  try {
    const id = gooClient.addRegion(region);
    return { success: true, id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:sample', async (_, { x, y }) => {
  try {
    return await gooClient.sample(x, y);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:attend', async (_, { x, y }) => {
  try {
    return await gooClient.attend(x, y);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:color-at', async (_, { x, y }) => {
  try {
    const color = await gooClient.colorAt(x, y);
    return { success: true, color };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:render-svg', async (_, { width, height }) => {
  try {
    return await gooClient.renderToSvg(width || 400, height || 400);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:demo', async (_, { regions, blend }) => {
  try {
    return await gooClient.generateDemo(regions || 5, blend || 0.3);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:claude', async (_, { emotion }) => {
  try {
    return await gooClient.createClaudeEmbodiment(emotion || 'curious');
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:stats', async () => {
  try {
    const stats = gooClient.getStats();
    return { success: true, stats };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:to-json', async () => {
  try {
    const json = gooClient.toJSON();
    return { success: true, json };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('goo:from-json', async (_, { json }) => {
  try {
    return gooClient.fromJSON(json);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// SVG VISUAL CLIENT (Pattern Generation)
// =============================================
const { SvgClient, Shape, Motion, Palettes } = require('./lib/svg-client');
const svgClient = new SvgClient();

ipcMain.handle('svg:generate-pattern', async (_, { config }) => {
  try {
    return await svgClient.generatePattern(config);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('svg:create-component', async (_, { type, props }) => {
  try {
    const component = svgClient.createComponent(type, props);
    return { success: true, component };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('svg:compose', async (_, { elements, config }) => {
  try {
    const svg = svgClient.compose(elements, config);
    return { success: true, svg };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('svg:generate-decoys', async (_, { pattern, count }) => {
  try {
    return await svgClient.generateDecoys(pattern, count || 3);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('svg:set-dimensions', async (_, { width, height }) => {
  try {
    svgClient.setDimensions(width, height);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// PORKBUN API (Pro Tier - Domain Management)
// =============================================
const { PorkbunClient, RecordType } = require('./lib/porkbun-client');
const porkbunClient = new PorkbunClient();

// AI Providers (Dev Tier)
const { HuggingFaceClient, RECOMMENDED_MODELS } = require('./lib/huggingface-client');
const { OllamaClient } = require('./lib/ollama-client');
const { KaggleClient } = require('./lib/kaggle-client');

const huggingfaceClient = new HuggingFaceClient();
const ollamaClient = new OllamaClient();
const kaggleClient = new KaggleClient();

// Phase 7: MCP, IPFS, Agent System
const { MCPClient, MCP_SCOPES, MCP_TOOLS } = require('./lib/mcp-client');
const { IPFSClient } = require('./lib/ipfs-client');
const { AgentSystem, AGENT_TYPES, WORKFLOW_TYPES } = require('./lib/agent-system');

const mcpClient = new MCPClient();
const ipfsClient = new IPFSClient();
const agentSystem = new AgentSystem();

// Configuration
ipcMain.handle('porkbun:configure', async (_, { apiKey, secretApiKey }) => {
  try {
    return porkbunClient.configure(apiKey, secretApiKey);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:is-configured', async () => {
  return { success: true, configured: porkbunClient.isConfigured() };
});

ipcMain.handle('porkbun:ping', async () => {
  try {
    return await porkbunClient.ping();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Domain Management
ipcMain.handle('porkbun:list-domains', async (_, { start, includeLabels }) => {
  try {
    return await porkbunClient.listDomains(start || 0, includeLabels || false);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:check-domain', async (_, { domain }) => {
  try {
    return await porkbunClient.checkDomain(domain);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:get-pricing', async () => {
  try {
    return await porkbunClient.getPricing();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:get-nameservers', async (_, { domain }) => {
  try {
    return await porkbunClient.getNameservers(domain);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:update-nameservers', async (_, { domain, nameservers }) => {
  try {
    return await porkbunClient.updateNameservers(domain, nameservers);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:set-auto-renew', async (_, { domain, status }) => {
  try {
    return await porkbunClient.setAutoRenew(domain, status);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// DNS Records
ipcMain.handle('porkbun:create-record', async (_, { domain, record }) => {
  try {
    return await porkbunClient.createRecord(domain, record);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:get-records', async (_, { domain, recordId }) => {
  try {
    return await porkbunClient.getRecords(domain, recordId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:edit-record', async (_, { domain, recordId, record }) => {
  try {
    return await porkbunClient.editRecord(domain, recordId, record);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:delete-record', async (_, { domain, recordId }) => {
  try {
    return await porkbunClient.deleteRecord(domain, recordId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// SSL Certificates
ipcMain.handle('porkbun:get-ssl', async (_, { domain }) => {
  try {
    return await porkbunClient.getSSLBundle(domain);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// URL Forwarding
ipcMain.handle('porkbun:add-forward', async (_, { domain, config }) => {
  try {
    return await porkbunClient.addUrlForward(domain, config);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:get-forwards', async (_, { domain }) => {
  try {
    return await porkbunClient.getUrlForwarding(domain);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:delete-forward', async (_, { domain, recordId }) => {
  try {
    return await porkbunClient.deleteUrlForward(domain, recordId);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Dynamic DNS helpers
ipcMain.handle('porkbun:update-a-record', async (_, { domain, subdomain, ip }) => {
  try {
    return await porkbunClient.updateARecord(domain, subdomain, ip);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('porkbun:get-public-ip', async () => {
  try {
    return await porkbunClient.getPublicIP();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// HUGGINGFACE API (Dev Tier)
// =============================================
ipcMain.handle('huggingface:configure', async (_, { apiKey }) => {
  try {
    return huggingfaceClient.configure(apiKey);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:is-configured', () => {
  return huggingfaceClient.isConfigured();
});

ipcMain.handle('huggingface:chat', async (_, { model, messages, options }) => {
  try {
    return await huggingfaceClient.chat(model, messages, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:generate', async (_, { model, prompt, options }) => {
  try {
    return await huggingfaceClient.generate(model, prompt, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:summarize', async (_, { model, text, options }) => {
  try {
    return await huggingfaceClient.summarize(model, text, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:classify', async (_, { model, text, labels }) => {
  try {
    return await huggingfaceClient.classify(model, text, labels);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:embed', async (_, { model, texts }) => {
  try {
    return await huggingfaceClient.embed(model, texts);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('huggingface:get-models', (_, { task }) => {
  return { success: true, models: huggingfaceClient.getRecommendedModels(task) };
});

ipcMain.handle('huggingface:get-tasks', () => {
  return { success: true, tasks: huggingfaceClient.getAvailableTasks() };
});

// =============================================
// OLLAMA API (Dev Tier - minScore: 50)
// =============================================
ipcMain.handle('ollama:configure', async (_, { host, port }) => {
  try {
    return ollamaClient.configure(host, port);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:is-configured', () => {
  return ollamaClient.isConfigured();
});

ipcMain.handle('ollama:ping', async () => {
  try {
    return await ollamaClient.ping();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:list-models', async () => {
  try {
    return await ollamaClient.listModels();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:show-model', async (_, { name }) => {
  try {
    return await ollamaClient.showModel(name);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:pull-model', async (_, { name }) => {
  try {
    return await ollamaClient.pullModel(name);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:delete-model', async (_, { name }) => {
  try {
    return await ollamaClient.deleteModel(name);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:generate', async (_, { model, prompt, options }) => {
  try {
    return await ollamaClient.generate(model, prompt, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:chat', async (_, { model, messages, options }) => {
  try {
    return await ollamaClient.chat(model, messages, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:embed', async (_, { model, input }) => {
  try {
    return await ollamaClient.embed(model, input);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:get-running', async () => {
  try {
    return await ollamaClient.getRunningModels();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ollama:get-recommended', () => {
  return { success: true, models: ollamaClient.getRecommendedModels() };
});

// =============================================
// KAGGLE API (Dev Tier)
// =============================================
ipcMain.handle('kaggle:configure', async (_, { username, apiKey }) => {
  try {
    return kaggleClient.configure(username, apiKey);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:is-configured', () => {
  return kaggleClient.isConfigured();
});

ipcMain.handle('kaggle:whoami', async () => {
  try {
    return await kaggleClient.whoami();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:list-datasets', async (_, { options }) => {
  try {
    return await kaggleClient.listDatasets(options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:search-datasets', async (_, { query, options }) => {
  try {
    return await kaggleClient.searchDatasets(query, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:get-dataset', async (_, { owner, slug }) => {
  try {
    return await kaggleClient.getDataset(owner, slug);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:list-dataset-files', async (_, { owner, slug }) => {
  try {
    return await kaggleClient.listDatasetFiles(owner, slug);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:list-models', async (_, { options }) => {
  try {
    return await kaggleClient.listModels(options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:search-models', async (_, { query, options }) => {
  try {
    return await kaggleClient.searchModels(query, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:list-competitions', async (_, { options }) => {
  try {
    return await kaggleClient.listCompetitions(options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kaggle:get-download-url', (_, { owner, slug, version }) => {
  return { success: true, url: kaggleClient.getDownloadUrl(owner, slug, version) };
});

// =============================================
// MCP (Model Context Protocol) - Multi-Scope
// =============================================
ipcMain.handle('mcp:configure', (_, { scope, bridgeHost, bridgePort }) => {
  try {
    return mcpClient.configure(scope, bridgeHost, bridgePort);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mcp:is-configured', () => {
  return mcpClient.isConfigured();
});

ipcMain.handle('mcp:get-scope', () => {
  return { success: true, ...mcpClient.getScopeInfo() };
});

ipcMain.handle('mcp:set-scope', (_, { scope }) => {
  try {
    return mcpClient.setScope(scope);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mcp:get-tools', () => {
  return { success: true, tools: mcpClient.getAvailableTools() };
});

ipcMain.handle('mcp:get-tools-by-scope', () => {
  return { success: true, scopes: mcpClient.getToolsByScope() };
});

ipcMain.handle('mcp:execute-tool', async (_, { toolId, params }) => {
  try {
    return await mcpClient.executeTool(toolId, params);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mcp:is-tool-allowed', (_, { toolId }) => {
  return { success: true, allowed: mcpClient.isToolAllowed(toolId) };
});

ipcMain.handle('mcp:get-all-scopes', () => {
  return { success: true, scopes: mcpClient.getAllScopes() };
});

ipcMain.handle('mcp:check-bridge', async () => {
  try {
    return await mcpClient.checkBridgeStatus();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// IPFS (InterPlanetary File System) - Pro Tier
// =============================================
ipcMain.handle('ipfs:configure', (_, { host, port, protocol }) => {
  try {
    return ipfsClient.configure(host, port, protocol);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:is-configured', () => {
  return ipfsClient.isConfigured();
});

ipcMain.handle('ipfs:ping', async () => {
  try {
    return await ipfsClient.ping();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:version', async () => {
  try {
    return await ipfsClient.version();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:stats', async () => {
  try {
    return await ipfsClient.stats();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:add', async (_, { content, options }) => {
  try {
    return await ipfsClient.add(content, options || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:add-json', async (_, { obj }) => {
  try {
    return await ipfsClient.addJSON(obj);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:cat', async (_, { cid }) => {
  try {
    return await ipfsClient.cat(cid);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:get-via-gateway', async (_, { cid, gatewayIndex }) => {
  try {
    return await ipfsClient.getViaGateway(cid, gatewayIndex);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:pin', async (_, { cid }) => {
  try {
    return await ipfsClient.pin(cid);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:unpin', async (_, { cid }) => {
  try {
    return await ipfsClient.unpin(cid);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:list-pins', async () => {
  try {
    return await ipfsClient.listPins();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:publish-feed-item', async (_, { feedItem }) => {
  try {
    return await ipfsClient.publishFeedItem(feedItem);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:publish-feed-collection', async (_, { items, metadata }) => {
  try {
    return await ipfsClient.publishFeedCollection(items, metadata);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ipfs:get-gateway-urls', (_, { cid }) => {
  return { success: true, urls: ipfsClient.getGatewayUrls(cid) };
});

ipcMain.handle('ipfs:validate-cid', (_, { cid }) => {
  return { success: true, valid: ipfsClient.isValidCID(cid) };
});

// =============================================
// AGENT SYSTEM (Multi-Agent Orchestration) - Dev Tier
// =============================================
ipcMain.handle('agent:configure', (_, { hardwareScore, userTier }) => {
  try {
    return agentSystem.configure(hardwareScore, userTier);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:get-available-types', () => {
  return { success: true, types: agentSystem.getAvailableTypes() };
});

ipcMain.handle('agent:get-all-types', () => {
  return { success: true, types: agentSystem.getAllTypes() };
});

ipcMain.handle('agent:create', (_, { type, config }) => {
  try {
    return agentSystem.createAgent(type, config);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:get', (_, { id }) => {
  try {
    return agentSystem.getAgent(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:execute', async (_, { id, capability, params }) => {
  try {
    return await agentSystem.executeAgent(id, capability, params || {});
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:remove', (_, { id }) => {
  try {
    return agentSystem.removeAgent(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:list', () => {
  return { success: true, agents: agentSystem.listAgents() };
});

ipcMain.handle('agent:create-workflow', (_, { name, type, steps }) => {
  try {
    return agentSystem.createWorkflow(name, type, steps);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:run-workflow', async (_, { id }) => {
  try {
    return await agentSystem.runWorkflow(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:get-workflow', (_, { id }) => {
  try {
    return agentSystem.getWorkflow(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:list-workflows', () => {
  return { success: true, workflows: agentSystem.listWorkflows() };
});

ipcMain.handle('agent:remove-workflow', (_, { id }) => {
  try {
    return agentSystem.removeWorkflow(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =============================================
// ARTISAN (Toroidal Knowledge Storage)
// =============================================
const { ArtisanClient, WINDING_LEVELS } = require('./lib/artisan-client');
const artisanClient = new ArtisanClient();

// Initialize artisan on startup
artisanClient.init();

// Create a torus
ipcMain.handle('artisan:create-torus', (_, { label, majorRadius, tokensSpent }) => {
  return artisanClient.createTorus(label, majorRadius, tokensSpent);
});

// Get torus by ID
ipcMain.handle('artisan:get-torus', (_, { torusId }) => {
  return artisanClient.getTorus(torusId);
});

// List all tori
ipcMain.handle('artisan:list-tori', () => {
  return artisanClient.listTori();
});

// Add tokens to torus (increases minor radius)
ipcMain.handle('artisan:add-tokens', (_, { torusId, tokens }) => {
  return artisanClient.addTokens(torusId, tokens);
});

// Refine torus (increase winding level)
ipcMain.handle('artisan:refine', (_, { torusId }) => {
  return artisanClient.refineTorus(torusId);
});

// Validate torus (update BS score)
ipcMain.handle('artisan:validate', (_, { torusId, bsScore }) => {
  return artisanClient.validateTorus(torusId, bsScore);
});

// Add point to torus surface
ipcMain.handle('artisan:add-point', (_, { torusId, majorAngle, minorAngle, contentHash }) => {
  return artisanClient.addPoint(torusId, majorAngle, minorAngle, contentHash);
});

// Create blend between tori
ipcMain.handle('artisan:blend', (_, { torusIdA, torusIdB, strength }) => {
  return artisanClient.blendTori(torusIdA, torusIdB, strength);
});

// Get neighbors of a torus
ipcMain.handle('artisan:get-neighbors', (_, { torusId }) => {
  return artisanClient.getNeighbors(torusId);
});

// Traverse path between tori
ipcMain.handle('artisan:traverse', (_, { startId, endId, maxDepth }) => {
  return artisanClient.traverse(startId, endId, maxDepth);
});

// BARF query (search foam)
ipcMain.handle('artisan:query', (_, { queryVector, xorKey }) => {
  return artisanClient.query(queryVector, xorKey);
});

// Decay all blends
ipcMain.handle('artisan:decay-blends', (_, { factor }) => {
  return artisanClient.decayBlends(factor);
});

// Boost a specific blend
ipcMain.handle('artisan:boost-blend', (_, { blendId, amount }) => {
  return artisanClient.boostBlend(blendId, amount);
});

// Get foam statistics
ipcMain.handle('artisan:stats', () => {
  return artisanClient.stats();
});

// Render foam as visualization data
ipcMain.handle('artisan:render', () => {
  return artisanClient.renderFoam();
});

// Export foam to JSON
ipcMain.handle('artisan:export', () => {
  return artisanClient.exportFoam();
});

// Import foam from JSON
ipcMain.handle('artisan:import', (_, { data }) => {
  return artisanClient.importFoam(data);
});

// Create a new foam
ipcMain.handle('artisan:create-foam', (_, { name }) => {
  return artisanClient.createFoam(name);
});

// Set active foam
ipcMain.handle('artisan:set-foam', (_, { name }) => {
  return artisanClient.setActiveFoam(name);
});

// Get winding levels reference
ipcMain.handle('artisan:winding-levels', () => {
  return { success: true, levels: WINDING_LEVELS };
});

// =============================================
// ARCHITECT (Idea Crystallization Engine)
// =============================================
const { ArchitectClient, IDEA_STATES } = require('./lib/architect-client');
const architectClient = new ArchitectClient();

// === Idea Operations ===
ipcMain.handle('architect:create-idea', (_, { content, tags }) => {
  return architectClient.createIdea(content, tags);
});

ipcMain.handle('architect:get-idea', (_, { ideaId }) => {
  return architectClient.getIdea(ideaId);
});

ipcMain.handle('architect:list-ideas', (_, { state }) => {
  return architectClient.listIdeas(state);
});

ipcMain.handle('architect:embed-idea', (_, { ideaId, embedding, chain }) => {
  return architectClient.embedIdea(ideaId, embedding, chain);
});

ipcMain.handle('architect:confirm-idea', (_, { ideaId }) => {
  return architectClient.confirmIdea(ideaId);
});

ipcMain.handle('architect:crystallize-idea', (_, { ideaId, sourceFile }) => {
  return architectClient.crystallizeIdea(ideaId, sourceFile);
});

ipcMain.handle('architect:branch-idea', (_, { ideaId, newContent }) => {
  return architectClient.branchIdea(ideaId, newContent);
});

ipcMain.handle('architect:connect-ideas', (_, { ideaA, ideaB }) => {
  return architectClient.connectIdeas(ideaA, ideaB);
});

ipcMain.handle('architect:score-idea', (_, { ideaId, clarity, feasibility, impact, completeness }) => {
  return architectClient.scoreIdea(ideaId, clarity, feasibility, impact, completeness);
});

ipcMain.handle('architect:tag-idea', (_, { ideaId, tags }) => {
  return architectClient.tagIdea(ideaId, tags);
});

// === Tree Operations ===
ipcMain.handle('architect:create-tree', (_, { name, rootPath }) => {
  return architectClient.createTree(name, rootPath);
});

ipcMain.handle('architect:set-tree', (_, { treeId }) => {
  return architectClient.setActiveTree(treeId);
});

ipcMain.handle('architect:get-tree', () => {
  return architectClient.getActiveTree();
});

ipcMain.handle('architect:list-trees', () => {
  return architectClient.listTrees();
});

ipcMain.handle('architect:add-directory', (_, { name, parentId }) => {
  return architectClient.addDirectory(name, parentId);
});

ipcMain.handle('architect:add-file', (_, { name, parentId, language }) => {
  return architectClient.addFile(name, parentId, language);
});

ipcMain.handle('architect:link-idea', (_, { nodeId, ideaId }) => {
  return architectClient.linkIdeaToNode(nodeId, ideaId);
});

ipcMain.handle('architect:render-tree', (_, { treeId }) => {
  return architectClient.renderTree(treeId);
});

// === Recall Operations ===
ipcMain.handle('architect:recall', (_, { query, limit }) => {
  return architectClient.recallIdeas(query, limit);
});

ipcMain.handle('architect:suggest', (_, { limit }) => {
  return architectClient.suggestConnections(limit);
});

ipcMain.handle('architect:rank', (_, { limit }) => {
  return architectClient.rankIdeas(limit);
});

// === Flowchart ===
ipcMain.handle('architect:flowchart', (_, { rootIdeaId }) => {
  return architectClient.flowchart(rootIdeaId);
});

// === Export/Import ===
ipcMain.handle('architect:export', () => {
  return architectClient.exportAll();
});

ipcMain.handle('architect:import', (_, { data }) => {
  return architectClient.importAll(data);
});

ipcMain.handle('architect:stats', () => {
  return architectClient.stats();
});

// Get idea states reference
ipcMain.handle('architect:idea-states', () => {
  return { success: true, states: IDEA_STATES };
});

// =============================================
// BEHAVIOR (Adaptive UI Learning)
// =============================================
const { BehaviorClient, ACTION_TYPES } = require('./lib/behavior-client');
const behaviorClient = new BehaviorClient();

// Observe a user action
ipcMain.handle('behavior:observe', (_, { action }) => {
  return behaviorClient.observe(action);
});

// Predict next action
ipcMain.handle('behavior:predict', () => {
  return behaviorClient.predictNext();
});

// Get detected behavioral chains
ipcMain.handle('behavior:chains', () => {
  return behaviorClient.getChains();
});

// Get UI adaptations
ipcMain.handle('behavior:adaptations', (_, { level }) => {
  return behaviorClient.getAdaptations(level);
});

// Get learning statistics
ipcMain.handle('behavior:stats', () => {
  return behaviorClient.getStats();
});

// Reset learning state
ipcMain.handle('behavior:reset', () => {
  return behaviorClient.reset();
});

// Configure behavior client
ipcMain.handle('behavior:configure', (_, { config }) => {
  return behaviorClient.configure(config);
});

// Enable/disable learning
ipcMain.handle('behavior:set-enabled', (_, { enabled }) => {
  return behaviorClient.setEnabled(enabled);
});

// Export learned data
ipcMain.handle('behavior:export', () => {
  return behaviorClient.export();
});

// Import learned data
ipcMain.handle('behavior:import', (_, { data }) => {
  return behaviorClient.import(data);
});

// Get action history
ipcMain.handle('behavior:history', (_, { limit }) => {
  return behaviorClient.getHistory(limit);
});

// Get action types reference
ipcMain.handle('behavior:action-types', () => {
  return { success: true, types: ACTION_TYPES };
});

// =============================================
// NETWORK (Security Visualization)
// =============================================
const { NetworkClient, DIRECTION: NET_DIRECTION, FIREWALL_ACTION, PROTOCOL: NET_PROTOCOL, EVENT_TYPE } = require('./lib/network-client');
const networkClient = new NetworkClient();

// === Firewall Operations ===
ipcMain.handle('network:firewall-check', (_, { sourceIP, destIP, destPort, protocol, direction }) => {
  return networkClient.checkConnection(sourceIP, destIP, destPort, protocol, direction);
});

ipcMain.handle('network:firewall-add-rule', (_, { rule }) => {
  return networkClient.addRule(rule);
});

ipcMain.handle('network:firewall-remove-rule', (_, { ruleId }) => {
  return networkClient.removeRule(ruleId);
});

ipcMain.handle('network:firewall-update-rule', (_, { ruleId, updates }) => {
  return networkClient.updateRule(ruleId, updates);
});

ipcMain.handle('network:firewall-list-rules', () => {
  return networkClient.listRules();
});

ipcMain.handle('network:firewall-block', (_, { ip }) => {
  return networkClient.blockIP(ip);
});

ipcMain.handle('network:firewall-allow', (_, { ip }) => {
  return networkClient.allowIP(ip);
});

ipcMain.handle('network:firewall-status', () => {
  return networkClient.getFirewallStatus();
});

ipcMain.handle('network:firewall-set-enabled', (_, { enabled }) => {
  return networkClient.setFirewallEnabled(enabled);
});

// === Monitor Operations ===
ipcMain.handle('network:monitor-events', (_, { limit, filter }) => {
  return networkClient.getEvents(limit, filter);
});

ipcMain.handle('network:monitor-stats', () => {
  return networkClient.getStats();
});

// === Capture Operations ===
ipcMain.handle('network:capture-start', (_, { filter }) => {
  return networkClient.startCapture(filter);
});

ipcMain.handle('network:capture-stop', (_, { sessionId }) => {
  return networkClient.stopCapture(sessionId);
});

ipcMain.handle('network:capture-packets', (_, { sessionId, limit, offset }) => {
  return networkClient.getPackets(sessionId, limit, offset);
});

ipcMain.handle('network:capture-list', () => {
  return networkClient.listCaptures();
});

// === Topology Operations ===
ipcMain.handle('network:topology', () => {
  return networkClient.getTopology();
});

ipcMain.handle('network:render-topology', () => {
  return networkClient.renderTopology();
});

// === Proxy Operations ===
ipcMain.handle('network:proxy-configure', (_, { config }) => {
  return networkClient.configureProxy(config);
});

ipcMain.handle('network:proxy-config', () => {
  return networkClient.getProxyConfig();
});

ipcMain.handle('network:proxy-history', (_, { limit }) => {
  return networkClient.getProxyHistory(limit);
});

// === Export/Import ===
ipcMain.handle('network:export', () => {
  return networkClient.export();
});

ipcMain.handle('network:import', (_, { data }) => {
  return networkClient.import(data);
});

ipcMain.handle('network:reset', () => {
  return networkClient.reset();
});

// Get constants
ipcMain.handle('network:constants', () => {
  return { success: true, DIRECTION: NET_DIRECTION, FIREWALL_ACTION, PROTOCOL: NET_PROTOCOL, EVENT_TYPE };
});

// =============================================
// SPLOIT (Security Testing Framework)
// =============================================
const { SploitClient, MODULE_TYPE, RANK, SESSION_TYPE, CHECK_RESULT } = require('./lib/sploit-client');
const sploitClient = new SploitClient();

// === Module Operations ===
ipcMain.handle('sploit:search-modules', (_, { query, type }) => {
  return sploitClient.searchModules(query, type);
});

ipcMain.handle('sploit:get-module', (_, { fullname }) => {
  return sploitClient.getModuleInfo(fullname);
});

ipcMain.handle('sploit:list-modules', (_, { type }) => {
  return sploitClient.listModules(type);
});

// === Target Operations ===
ipcMain.handle('sploit:add-target', (_, { host, port }) => {
  return sploitClient.addTarget(host, port);
});

ipcMain.handle('sploit:get-target', (_, { targetId }) => {
  return sploitClient.getTarget(targetId);
});

ipcMain.handle('sploit:list-targets', () => {
  return sploitClient.listTargets();
});

ipcMain.handle('sploit:remove-target', (_, { targetId }) => {
  return sploitClient.removeTarget(targetId);
});

ipcMain.handle('sploit:update-target', (_, { targetId, updates }) => {
  return sploitClient.updateTarget(targetId, updates);
});

ipcMain.handle('sploit:scan-target', (_, { targetId }) => {
  return sploitClient.scanTarget(targetId);
});

// === Exploitation Operations ===
ipcMain.handle('sploit:check', (_, { moduleFullname, targetId }) => {
  return sploitClient.checkVulnerable(moduleFullname, targetId);
});

ipcMain.handle('sploit:exploit', (_, { moduleFullname, targetId, options }) => {
  return sploitClient.runExploit(moduleFullname, targetId, options);
});

ipcMain.handle('sploit:run-auxiliary', (_, { moduleFullname, targetId, options }) => {
  return sploitClient.runAuxiliary(moduleFullname, targetId, options);
});

// === Session Operations ===
ipcMain.handle('sploit:list-sessions', (_, { activeOnly }) => {
  return sploitClient.listSessions(activeOnly);
});

ipcMain.handle('sploit:get-session', (_, { sessionId }) => {
  return sploitClient.getSession(sessionId);
});

ipcMain.handle('sploit:interact', (_, { sessionId, command }) => {
  return sploitClient.interactSession(sessionId, command);
});

ipcMain.handle('sploit:close-session', (_, { sessionId }) => {
  return sploitClient.closeSession(sessionId);
});

ipcMain.handle('sploit:session-history', (_, { sessionId, limit }) => {
  return sploitClient.getSessionHistory(sessionId, limit);
});

// === Workspace Operations ===
ipcMain.handle('sploit:get-workspace', () => {
  return sploitClient.getWorkspace();
});

ipcMain.handle('sploit:save-workspace', () => {
  return sploitClient.saveWorkspace();
});

ipcMain.handle('sploit:load-workspace', (_, { data }) => {
  return sploitClient.loadWorkspace(data);
});

ipcMain.handle('sploit:add-credential', (_, { username, password, service, targetId }) => {
  return sploitClient.addCredential(username, password, service, targetId);
});

ipcMain.handle('sploit:list-credentials', () => {
  return sploitClient.listCredentials();
});

// === Global Options ===
ipcMain.handle('sploit:get-options', () => {
  return sploitClient.getGlobalOptions();
});

ipcMain.handle('sploit:set-option', (_, { name, value }) => {
  return sploitClient.setGlobalOption(name, value);
});

// === Stats ===
ipcMain.handle('sploit:stats', () => {
  return sploitClient.getStats();
});

ipcMain.handle('sploit:reset', () => {
  return sploitClient.reset();
});

// Get constants
ipcMain.handle('sploit:constants', () => {
  return { success: true, MODULE_TYPE, RANK, SESSION_TYPE, CHECK_RESULT };
});

// =============================================
// COMMERCE (Vibe Commerce System)
// =============================================
const { CommerceClient, QUERY_INTENT, CATEGORY, ITEM_STATUS } = require('./lib/commerce-client');
const commerceClient = new CommerceClient();

// === Query Operations ===
ipcMain.handle('commerce:parse-query', (_, { rawInput }) => {
  return commerceClient.parseVibeQuery(rawInput);
});

ipcMain.handle('commerce:search', (_, { query, limit }) => {
  return commerceClient.searchProducts(query, limit);
});

ipcMain.handle('commerce:get-product', (_, { productId }) => {
  return commerceClient.getProduct(productId);
});

// === Cart Operations ===
ipcMain.handle('commerce:add-to-cart', (_, { productId, quantity, variant }) => {
  return commerceClient.addToCart(productId, quantity, variant);
});

ipcMain.handle('commerce:remove-from-cart', (_, { itemId }) => {
  return commerceClient.removeFromCart(itemId);
});

ipcMain.handle('commerce:update-quantity', (_, { itemId, quantity }) => {
  return commerceClient.updateQuantity(itemId, quantity);
});

ipcMain.handle('commerce:cart-summary', () => {
  return commerceClient.getCartSummary();
});

ipcMain.handle('commerce:apply-coupon', (_, { code }) => {
  return commerceClient.applyCoupon(code);
});

ipcMain.handle('commerce:clear-cart', () => {
  return commerceClient.clearCart();
});

// === Checkout ===
ipcMain.handle('commerce:checkout', (_, { paymentInfo, shippingAddress }) => {
  return commerceClient.processCheckout(paymentInfo, shippingAddress);
});

// === Price Alerts ===
ipcMain.handle('commerce:set-alert', (_, { productId, targetPrice }) => {
  return commerceClient.setPriceAlert(productId, targetPrice);
});

ipcMain.handle('commerce:list-alerts', () => {
  return commerceClient.listAlerts();
});

ipcMain.handle('commerce:remove-alert', (_, { alertId }) => {
  return commerceClient.removeAlert(alertId);
});

// === Market Data ===
ipcMain.handle('commerce:market-data', (_, { ticker, timeframe }) => {
  return commerceClient.getMarketData(ticker, timeframe);
});

ipcMain.handle('commerce:market-alert', (_, { ticker, targetPrice, direction }) => {
  return commerceClient.setMarketAlert(ticker, targetPrice, direction);
});

// === Stores ===
ipcMain.handle('commerce:list-stores', () => {
  return commerceClient.listStores();
});

ipcMain.handle('commerce:add-store', (_, { name, domain }) => {
  return commerceClient.addStore(name, domain);
});

ipcMain.handle('commerce:set-store-enabled', (_, { storeId, enabled }) => {
  return commerceClient.setStoreEnabled(storeId, enabled);
});

// === Preferences ===
ipcMain.handle('commerce:set-preferences', (_, { prefs }) => {
  return commerceClient.setPreferences(prefs);
});

ipcMain.handle('commerce:get-preferences', () => {
  return commerceClient.getPreferences();
});

ipcMain.handle('commerce:recommendations', (_, { limit }) => {
  return commerceClient.getRecommendations(limit);
});

// === Stats & Export ===
ipcMain.handle('commerce:stats', () => {
  return commerceClient.getStats();
});

ipcMain.handle('commerce:export', () => {
  return commerceClient.export();
});

ipcMain.handle('commerce:import', (_, { data }) => {
  return commerceClient.import(data);
});

// Get constants
ipcMain.handle('commerce:constants', () => {
  return { success: true, QUERY_INTENT, CATEGORY, ITEM_STATUS };
});

// =============================================
// DANCE (Device Pairing Protocol)
// =============================================
const { DanceClient, DANCE_STATE, DANCE_ROLE, CONDITION_TYPE, AUDIT_RESULT } = require('./lib/dance-client');
const danceClient = new DanceClient();

// === Session Operations ===
ipcMain.handle('dance:init-lock', (_, { lockFragment, contractId }) => {
  const contract = contractId ? danceClient.contracts.get(contractId) : null;
  return danceClient.initiateLockHolder(lockFragment, contract);
});

ipcMain.handle('dance:init-key', (_, { keyFragment, contractId }) => {
  const contract = contractId ? danceClient.contracts.get(contractId) : null;
  return danceClient.initiateKeyHolder(keyFragment, contract);
});

ipcMain.handle('dance:wake', () => {
  return danceClient.wake();
});

ipcMain.handle('dance:state', () => {
  return danceClient.getCurrentState();
});

ipcMain.handle('dance:start', (_, { peerDeviceId }) => {
  return danceClient.init(peerDeviceId);
});

ipcMain.handle('dance:challenge', () => {
  return danceClient.challenge();
});

ipcMain.handle('dance:respond', (_, { challenge }) => {
  return danceClient.respondChallenge(challenge);
});

ipcMain.handle('dance:exchange', (_, { remoteFragment }) => {
  return danceClient.exchange(remoteFragment);
});

ipcMain.handle('dance:verify', () => {
  return danceClient.verify();
});

ipcMain.handle('dance:audit', (_, { context }) => {
  return danceClient.audit(context);
});

ipcMain.handle('dance:abort', (_, { reason }) => {
  return danceClient.abort(reason);
});

ipcMain.handle('dance:secret', () => {
  return danceClient.getReconstructedSecret();
});

// === Contract Operations ===
ipcMain.handle('dance:create-contract', (_, { description }) => {
  return danceClient.createContract(description);
});

ipcMain.handle('dance:get-contract', (_, { contractId }) => {
  return danceClient.getContract(contractId);
});

ipcMain.handle('dance:add-condition', (_, { contractId, type, params }) => {
  return danceClient.addCondition(contractId, type, params);
});

ipcMain.handle('dance:set-expiry', (_, { contractId, blockHeight, timestamp }) => {
  return danceClient.setExpiry(contractId, blockHeight, timestamp);
});

ipcMain.handle('dance:sign-contract', (_, { contractId, secret }) => {
  return danceClient.signContract(contractId, secret);
});

ipcMain.handle('dance:verify-contract', (_, { contractId, secret }) => {
  return danceClient.verifyContract(contractId, secret);
});

ipcMain.handle('dance:list-contracts', () => {
  return danceClient.listContracts();
});

ipcMain.handle('dance:delete-contract', (_, { contractId }) => {
  return danceClient.deleteContract(contractId);
});

ipcMain.handle('dance:use-contract', (_, { contractId }) => {
  return danceClient.useContract(contractId);
});

// === Visual Patterns ===
ipcMain.handle('dance:generate-pattern', (_, { fragment }) => {
  return danceClient.generatePattern(fragment);
});

ipcMain.handle('dance:verify-pattern', (_, { pattern, fragment }) => {
  return danceClient.verifyPattern(pattern, fragment);
});

// === Stats & Export ===
ipcMain.handle('dance:stats', () => {
  return danceClient.getStats();
});

ipcMain.handle('dance:completed-sessions', (_, { limit }) => {
  return danceClient.getCompletedSessions(limit);
});

ipcMain.handle('dance:reset', () => {
  return danceClient.reset();
});

ipcMain.handle('dance:export', () => {
  return danceClient.export();
});

ipcMain.handle('dance:import', (_, { data }) => {
  return danceClient.import(data);
});

// Get constants
ipcMain.handle('dance:constants', () => {
  return { success: true, DANCE_STATE, DANCE_ROLE, CONDITION_TYPE, AUDIT_RESULT };
});

// =============================================
// PHASE 9: CORE CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('core:init-vault', (_, { masterKey }) => coreClient.initVault(masterKey));
ipcMain.handle('core:store-key', (_, { name, keyType, data }) => coreClient.storeKey(name, keyType, data));
ipcMain.handle('core:retrieve-key', (_, { name }) => coreClient.retrieveKey(name));
ipcMain.handle('core:list-keys', () => coreClient.listKeys());
ipcMain.handle('core:delete-key', (_, { name }) => coreClient.deleteKey(name));
ipcMain.handle('core:create-lock', (_, { data, mode }) => coreClient.createLock(data, mode));
ipcMain.handle('core:apply-key', (_, { lockId, keyData }) => coreClient.applyKey(lockId, keyData));
ipcMain.handle('core:xor', (_, { a, b }) => coreClient.xor(a, b));
ipcMain.handle('core:derive-key', (_, { purpose, context, length }) => coreClient.deriveKey(purpose, context, length));
ipcMain.handle('core:encode-pattern', (_, { data, pattern }) => coreClient.encodePattern(data, pattern));
ipcMain.handle('core:decode-pattern', (_, { encoded, pattern }) => coreClient.decodePattern(encoded, pattern));
ipcMain.handle('core:genesis-key', () => coreClient.getGenesisKey());
ipcMain.handle('core:store-blob', (_, { data, metadata }) => coreClient.storeBlob(data, metadata));
ipcMain.handle('core:retrieve-blob', (_, { blobId }) => coreClient.retrieveBlob(blobId));
ipcMain.handle('core:list-blobs', () => coreClient.listBlobs());
ipcMain.handle('core:stats', () => coreClient.getStats());
ipcMain.handle('core:constants', () => ({ success: true, LOCK_MODE }));

// =============================================
// PHASE 9: CIPHER CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('cipher:identify', (_, { text }) => cipherClient.identify(text));
ipcMain.handle('cipher:analyze-frequency', (_, { text }) => cipherClient.analyzeFrequency(text));
ipcMain.handle('cipher:hash', (_, { data, algorithm }) => cipherClient.hash(data, algorithm));
ipcMain.handle('cipher:encode', (_, { data, encoding }) => cipherClient.encode(data, encoding));
ipcMain.handle('cipher:decode', (_, { data, encoding }) => cipherClient.decode(data, encoding));
ipcMain.handle('cipher:xor', (_, { data, key }) => cipherClient.xor(data, key));
ipcMain.handle('cipher:xor-analyze', (_, { ciphertext }) => cipherClient.xorAnalyze(ciphertext));
ipcMain.handle('cipher:caesar', (_, { text, shift, decrypt }) => cipherClient.caesar(text, shift, decrypt));
ipcMain.handle('cipher:vigenere', (_, { text, key, decrypt }) => cipherClient.vigenere(text, key, decrypt));
ipcMain.handle('cipher:rot13', (_, { text }) => cipherClient.rot13(text));
ipcMain.handle('cipher:morse-encode', (_, { text }) => cipherClient.morseEncode(text));
ipcMain.handle('cipher:morse-decode', (_, { morse }) => cipherClient.morseDecode(morse));
ipcMain.handle('cipher:stats', () => cipherClient.getStats());
ipcMain.handle('cipher:constants', () => ({ success: true, CIPHER_TYPE }));

// =============================================
// PHASE 9: AUDIO CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('audio:set-mode', (_, { mode }) => audioClient.setMode(mode));
ipcMain.handle('audio:create-session', (_, { mode }) => audioClient.createSession(mode));
ipcMain.handle('audio:get-session', (_, { sessionId }) => audioClient.getSession(sessionId));
ipcMain.handle('audio:encode', (_, { data, mode }) => audioClient.encode(data, mode));
ipcMain.handle('audio:decode', (_, { samples, expectedBytes, mode }) => audioClient.decode(samples, expectedBytes, mode));
ipcMain.handle('audio:prepare-transmit', (_, { sessionId, data }) => audioClient.prepareTransmit(sessionId, data));
ipcMain.handle('audio:start-receive', (_, { sessionId, expectedBytes }) => audioClient.startReceive(sessionId, expectedBytes));
ipcMain.handle('audio:process-received', (_, { sessionId, samples }) => audioClient.processReceived(sessionId, samples));
ipcMain.handle('audio:generate-tone', (_, { frequency, duration, mode }) => audioClient.generateTone(frequency, duration, mode));
ipcMain.handle('audio:generate-chord', (_, { frequencies, duration, mode }) => audioClient.generateChord(frequencies, duration, mode));
ipcMain.handle('audio:get-bands', () => audioClient.getBands());
ipcMain.handle('audio:get-modes', () => audioClient.getModes());
ipcMain.handle('audio:list-sessions', () => audioClient.listSessions());
ipcMain.handle('audio:delete-session', (_, { sessionId }) => audioClient.deleteSession(sessionId));
ipcMain.handle('audio:calculate-duration', (_, { dataLength, mode }) => audioClient.calculateDuration(dataLength, mode));
ipcMain.handle('audio:constants', () => ({ success: true, AUDIO_MODE }));

// =============================================
// PHASE 9: BTC CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('btc:set-endpoint', (_, { url }) => btcClient.setEndpoint(url));
ipcMain.handle('btc:start-simulator', (_, { startHeight }) => btcClient.startSimulator(startHeight));
ipcMain.handle('btc:simulate-block', () => btcClient.simulateBlock());
ipcMain.handle('btc:update-block', (_, { blockData }) => btcClient.updateBlock(blockData));
ipcMain.handle('btc:get-clock', () => btcClient.getClockState());
ipcMain.handle('btc:create-schedule', (_, { name, granularity }) => btcClient.createSchedule(name, granularity));
ipcMain.handle('btc:get-rotation-key', (_, { scheduleName }) => btcClient.getRotationKey(scheduleName));
ipcMain.handle('btc:derive-key', (_, { purpose, salt }) => btcClient.deriveKey(purpose, salt));
ipcMain.handle('btc:create-anchor', (_, { data }) => btcClient.createAnchor(data));
ipcMain.handle('btc:verify-anchor', (_, { anchorId, data }) => btcClient.verifyAnchor(anchorId, data));
ipcMain.handle('btc:get-anchor', (_, { anchorId }) => btcClient.getAnchor(anchorId));
ipcMain.handle('btc:list-anchors', () => btcClient.listAnchors());
ipcMain.handle('btc:get-block', (_, { height }) => btcClient.getBlock(height));
ipcMain.handle('btc:get-periods', () => btcClient.getPeriods());
ipcMain.handle('btc:next-rotation', (_, { scheduleName }) => btcClient.getNextRotation(scheduleName));
ipcMain.handle('btc:list-schedules', () => btcClient.listSchedules());
ipcMain.handle('btc:delete-schedule', (_, { name }) => btcClient.deleteSchedule(name));
ipcMain.handle('btc:constants', () => ({ success: true, BERLIN_PERIODS }));

// =============================================
// PHASE 9: SECURITY CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('security:init-vault', (_, { masterKey }) => securityClient.initVault(masterKey));
ipcMain.handle('security:scan-input', (_, { text }) => securityClient.scanInput(text));
ipcMain.handle('security:normalize-input', (_, { text }) => securityClient.normalizeInput(text));
ipcMain.handle('security:check-injection', (_, { input, type }) => securityClient.checkInjection(input, type));
ipcMain.handle('security:create-policy', (_, { name }) => securityClient.createPolicy(name));
ipcMain.handle('security:add-policy-rule', (_, { policyName, domain, action, condition }) =>
  securityClient.addPolicyRule(policyName, domain, action, condition));
ipcMain.handle('security:check-policy', (_, { policyName, domain, context }) =>
  securityClient.checkPolicy(policyName, domain, context));
ipcMain.handle('security:store-secret', (_, { name, value }) => securityClient.storeSecret(name, value));
ipcMain.handle('security:retrieve-secret', (_, { name }) => securityClient.retrieveSecret(name));
ipcMain.handle('security:list-secrets', () => securityClient.listSecrets());
ipcMain.handle('security:delete-secret', (_, { name }) => securityClient.deleteSecret(name));
ipcMain.handle('security:get-audit-log', (_, options) => securityClient.getAuditLog(options));
ipcMain.handle('security:get-summary', () => securityClient.getSummary());
ipcMain.handle('security:list-policies', () => securityClient.listPolicies());
ipcMain.handle('security:delete-policy', (_, { name }) => securityClient.deletePolicy(name));
ipcMain.handle('security:constants', () => ({ success: true, THREAT_LEVEL, SECURITY_DOMAIN }));

// =============================================
// PHASE 9: BRAIN CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('brain:store-memory', (_, { type, content, metadata }) => brainClient.storeMemory(type, content, metadata));
ipcMain.handle('brain:recall-memory', (_, { memoryId }) => brainClient.recallMemory(memoryId));
ipcMain.handle('brain:search-memories', (_, { query, options }) => brainClient.searchMemories(query, options));
ipcMain.handle('brain:associate-memories', (_, { memoryId1, memoryId2, strength }) =>
  brainClient.associateMemories(memoryId1, memoryId2, strength));
ipcMain.handle('brain:create-cluster', (_, { name }) => brainClient.createCluster(name));
ipcMain.handle('brain:add-to-cluster', (_, { clusterId, memoryId }) => brainClient.addToCluster(clusterId, memoryId));
ipcMain.handle('brain:start-learning', (_, { mode, context }) => brainClient.startLearning(mode, context));
ipcMain.handle('brain:add-sample', (_, { episodeId, input, output }) => brainClient.addSample(episodeId, input, output));
ipcMain.handle('brain:add-feedback', (_, { episodeId, feedback, reward }) => brainClient.addFeedback(episodeId, feedback, reward));
ipcMain.handle('brain:complete-learning', (_, { episodeId }) => brainClient.completeLearning(episodeId));
ipcMain.handle('brain:get-attention', () => brainClient.getAttention());
ipcMain.handle('brain:focus-attention', (_, { memoryId, weight }) => brainClient.focusAttention(memoryId, weight));
ipcMain.handle('brain:clear-attention', () => brainClient.clearAttention());
ipcMain.handle('brain:run-consolidation', () => brainClient.runConsolidation());
ipcMain.handle('brain:evolve', () => brainClient.evolve());
ipcMain.handle('brain:get-evolution', () => brainClient.getEvolution());
ipcMain.handle('brain:get-stats', () => brainClient.getStats());
ipcMain.handle('brain:list-memories', (_, options) => brainClient.listMemories(options));
ipcMain.handle('brain:delete-memory', (_, { memoryId }) => brainClient.deleteMemory(memoryId));
ipcMain.handle('brain:list-clusters', () => brainClient.listClusters());
ipcMain.handle('brain:delete-cluster', (_, { clusterId }) => brainClient.deleteCluster(clusterId));
ipcMain.handle('brain:list-episodes', (_, options) => brainClient.listEpisodes(options));
ipcMain.handle('brain:constants', () => ({ success: true, MEMORY_TYPE, LEARNING_MODE }));

// =============================================
// PHASE 9: INFERENCE CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('inference:create-request', (_, { prompt, options }) => inferenceClient.createRequest(prompt, options));
ipcMain.handle('inference:select-model', (_, { requestId }) => inferenceClient.selectModel(requestId));
ipcMain.handle('inference:store-result', (_, { requestId, output, metrics }) =>
  inferenceClient.storeResult(requestId, output, metrics));
ipcMain.handle('inference:refine-result', (_, { resultId, newOutput }) => inferenceClient.refineResult(resultId, newOutput));
ipcMain.handle('inference:mine-quality', (_, { resultId }) => inferenceClient.mineQuality(resultId));
ipcMain.handle('inference:score-quality', (_, { text }) => inferenceClient.scoreQuality(text));
ipcMain.handle('inference:start-chain', (_, { problem }) => inferenceClient.startChain(problem));
ipcMain.handle('inference:add-to-chain', (_, { chainId, type, content }) => inferenceClient.addToChain(chainId, type, content));
ipcMain.handle('inference:get-chain', (_, { chainId }) => inferenceClient.getChain(chainId));
ipcMain.handle('inference:create-pipeline', (_, { name }) => inferenceClient.createPipeline(name));
ipcMain.handle('inference:list-models', () => inferenceClient.listModels());
ipcMain.handle('inference:register-model', (_, { name, capabilities }) => inferenceClient.registerModel(name, capabilities));
ipcMain.handle('inference:get-request', (_, { requestId }) => inferenceClient.getRequest(requestId));
ipcMain.handle('inference:get-result', (_, { resultId }) => inferenceClient.getResult(resultId));
ipcMain.handle('inference:get-stats', () => inferenceClient.getStats());
ipcMain.handle('inference:list-requests', (_, options) => inferenceClient.listRequests(options));
ipcMain.handle('inference:list-results', (_, options) => inferenceClient.listResults(options));
ipcMain.handle('inference:constants', () => ({ success: true, QUALITY_LEVEL, INFERENCE_MODE }));

// =============================================
// PHASE 9: MICRO CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('micro:create-model', (_, { type, config }) => microClient.createModel(type, config));
ipcMain.handle('micro:load-model', (_, { modelId }) => microClient.loadModel(modelId));
ipcMain.handle('micro:unload-model', (_, { modelId }) => microClient.unloadModel(modelId));
ipcMain.handle('micro:infer', (_, { modelId, input, useCache }) => microClient.infer(modelId, input, useCache));
ipcMain.handle('micro:embed', (_, { text, storeId }) => microClient.embed(text, storeId));
ipcMain.handle('micro:find-similar', (_, { text, limit, threshold }) => microClient.findSimilar(text, limit, threshold));
ipcMain.handle('micro:create-pipeline', (_, { name }) => microClient.createPipeline(name));
ipcMain.handle('micro:add-pipeline-step', (_, { pipelineId, modelId, transform }) =>
  microClient.addPipelineStep(pipelineId, modelId, transform));
ipcMain.handle('micro:run-pipeline', (_, { pipelineId, input }) => microClient.runPipeline(pipelineId, input));
ipcMain.handle('micro:store-embedding', (_, { id, embedding, metadata }) => microClient.storeEmbedding(id, embedding, metadata));
ipcMain.handle('micro:get-embedding', (_, { id }) => microClient.getEmbedding(id));
ipcMain.handle('micro:delete-embedding', (_, { id }) => microClient.deleteEmbedding(id));
ipcMain.handle('micro:list-models', (_, options) => microClient.listModels(options));
ipcMain.handle('micro:delete-model', (_, { modelId }) => microClient.deleteModel(modelId));
ipcMain.handle('micro:list-pipelines', () => microClient.listPipelines());
ipcMain.handle('micro:delete-pipeline', (_, { pipelineId }) => microClient.deletePipeline(pipelineId));
ipcMain.handle('micro:get-stats', () => microClient.getStats());
ipcMain.handle('micro:clear-cache', () => microClient.clearCache());
ipcMain.handle('micro:get-model', (_, { modelId }) => microClient.getModel(modelId));
ipcMain.handle('micro:constants', () => ({ success: true, MODEL_TYPE }));

// =============================================
// PHASE 9: GATEWAY CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('gateway:register-endpoint', (_, { name, baseUrl, options }) =>
  gatewayClient.registerEndpoint(name, baseUrl, options));
ipcMain.handle('gateway:get-endpoint', (_, { endpointId }) => gatewayClient.getEndpoint(endpointId));
ipcMain.handle('gateway:find-endpoint', (_, { name }) => gatewayClient.findEndpoint(name));
ipcMain.handle('gateway:request', async (_, { endpointId, path, options }) =>
  gatewayClient.request(endpointId, path, options));
ipcMain.handle('gateway:queue-request', async (_, { endpointId, path, options }) =>
  gatewayClient.queueRequest(endpointId, path, options));
ipcMain.handle('gateway:set-endpoint-enabled', (_, { endpointId, enabled }) =>
  gatewayClient.setEndpointEnabled(endpointId, enabled));
ipcMain.handle('gateway:update-endpoint-auth', (_, { endpointId, auth }) =>
  gatewayClient.updateEndpointAuth(endpointId, auth));
ipcMain.handle('gateway:get-rate-limit-status', (_, { endpointId }) => gatewayClient.getRateLimitStatus(endpointId));
ipcMain.handle('gateway:get-circuit-status', (_, { endpointId }) => gatewayClient.getCircuitStatus(endpointId));
ipcMain.handle('gateway:clear-cache', () => gatewayClient.clearCache());
ipcMain.handle('gateway:get-logs', (_, options) => gatewayClient.getLogs(options));
ipcMain.handle('gateway:list-endpoints', () => gatewayClient.listEndpoints());
ipcMain.handle('gateway:delete-endpoint', (_, { endpointId }) => gatewayClient.deleteEndpoint(endpointId));
ipcMain.handle('gateway:get-stats', () => gatewayClient.getStats());
ipcMain.handle('gateway:configure-rate-limiter', (_, options) => gatewayClient.configureRateLimiter(options));
ipcMain.handle('gateway:configure-circuit-breaker', (_, options) => gatewayClient.configureCircuitBreaker(options));
ipcMain.handle('gateway:configure-cache', (_, options) => gatewayClient.configureCache(options));
ipcMain.handle('gateway:constants', () => ({ success: true, ENDPOINT_TYPE, PRIORITY }));

// =============================================
// PHASE 9: SIM CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('sim:register', (_, data) => simClient.registerSIM(data));
ipcMain.handle('sim:get', (_, { simId }) => simClient.getSIM(simId));
ipcMain.handle('sim:activate', (_, { simId }) => simClient.activateSIM(simId));
ipcMain.handle('sim:deactivate', (_, { simId }) => simClient.deactivateSIM(simId));
ipcMain.handle('sim:set-imsi', (_, { simId, imsi }) => simClient.setIMSI(simId, imsi));
ipcMain.handle('sim:register-imei', (_, { imei }) => simClient.registerIMEI(imei));
ipcMain.handle('sim:validate-imei', (_, { imei }) => simClient.validateIMEI(imei));
ipcMain.handle('sim:update-cell', (_, data) => simClient.updateCellInfo(data));
ipcMain.handle('sim:get-current-cell', () => simClient.getCurrentCell());
ipcMain.handle('sim:get-cell-history', (_, { limit }) => simClient.getCellHistory(limit));
ipcMain.handle('sim:set-pin', (_, { simId, pin }) => simClient.setPin(simId, pin));
ipcMain.handle('sim:verify-pin', (_, { simId, pin }) => simClient.verifyPin(simId, pin));
ipcMain.handle('sim:set-puk', (_, { simId, puk }) => simClient.setPuk(simId, puk));
ipcMain.handle('sim:unlock-with-puk', (_, { simId, puk, newPin }) => simClient.unlockWithPuk(simId, puk, newPin));
ipcMain.handle('sim:get-pin-status', (_, { simId }) => simClient.getPinStatus(simId));
ipcMain.handle('sim:get-security-events', (_, options) => simClient.getSecurityEvents(options));
ipcMain.handle('sim:get-security-alerts', () => simClient.getSecurityAlerts());
ipcMain.handle('sim:clear-security-alerts', () => simClient.clearSecurityAlerts());
ipcMain.handle('sim:list', () => simClient.listSIMs());
ipcMain.handle('sim:delete', (_, { simId }) => simClient.deleteSIM(simId));
ipcMain.handle('sim:get-stats', () => simClient.getStats());
ipcMain.handle('sim:constants', () => ({ success: true, SIM_TYPE, NETWORK_TYPE }));

// =============================================
// PHASE 9: CODIE CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('codie:tokenize', (_, { source }) => codieClient.tokenize(source));
ipcMain.handle('codie:parse', (_, { source }) => codieClient.parse(source));
ipcMain.handle('codie:compile', (_, { source }) => codieClient.compile(source));
ipcMain.handle('codie:interpret', (_, { source }) => codieClient.interpret(source));
ipcMain.handle('codie:store-program', (_, { name, source }) => codieClient.storeProgram(name, source));
ipcMain.handle('codie:get-program', (_, { name }) => codieClient.getProgram(name));
ipcMain.handle('codie:run-program', (_, { name }) => codieClient.runProgram(name));
ipcMain.handle('codie:list-programs', () => codieClient.listPrograms());
ipcMain.handle('codie:delete-program', (_, { name }) => codieClient.deleteProgram(name));
ipcMain.handle('codie:get-keywords', () => codieClient.getKeywords());
ipcMain.handle('codie:get-stats', () => codieClient.getStats());
ipcMain.handle('codie:validate', (_, { source }) => codieClient.validate(source));
ipcMain.handle('codie:constants', () => ({ success: true, CODIE_KEYWORDS }));

// =============================================
// BLUETOOTH CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('bluetooth:enable-adapter', () => bluetoothClient.enableAdapter());
ipcMain.handle('bluetooth:disable-adapter', () => bluetoothClient.disableAdapter());
ipcMain.handle('bluetooth:start-scan', (_, { duration }) => bluetoothClient.startScan(duration));
ipcMain.handle('bluetooth:stop-scan', () => bluetoothClient.stopScan());
ipcMain.handle('bluetooth:connect', (_, { deviceId }) => bluetoothClient.connect(deviceId));
ipcMain.handle('bluetooth:disconnect', () => bluetoothClient.disconnect());
ipcMain.handle('bluetooth:pair', (_, { deviceId, pin }) => bluetoothClient.pair(deviceId, pin));
ipcMain.handle('bluetooth:unpair', (_, { deviceId }) => bluetoothClient.unpair(deviceId));
ipcMain.handle('bluetooth:send-message', (_, { type, payload, options }) =>
  bluetoothClient.sendMessage(type, payload, options));
ipcMain.handle('bluetooth:send-from-template', (_, { templateName, values, options }) =>
  bluetoothClient.sendFromTemplate(templateName, values, options));
ipcMain.handle('bluetooth:send-text', (_, { text, options }) => bluetoothClient.sendText(text, options));
ipcMain.handle('bluetooth:send-command', (_, { cmd, args, options }) => bluetoothClient.sendCommand(cmd, args, options));
ipcMain.handle('bluetooth:ping', () => bluetoothClient.ping());
ipcMain.handle('bluetooth:create-template', (_, { name, type, payloadSchema }) =>
  bluetoothClient.createTemplate(name, type, payloadSchema));
ipcMain.handle('bluetooth:get-template', (_, { name }) => bluetoothClient.getTemplate(name));
ipcMain.handle('bluetooth:list-templates', () => bluetoothClient.listTemplates());
ipcMain.handle('bluetooth:delete-template', (_, { name }) => bluetoothClient.deleteTemplate(name));
ipcMain.handle('bluetooth:list-devices', (_, filter) => bluetoothClient.listDevices(filter || {}));
ipcMain.handle('bluetooth:get-device', (_, { deviceId }) => bluetoothClient.getDevice(deviceId));
ipcMain.handle('bluetooth:remove-device', (_, { deviceId }) => bluetoothClient.removeDevice(deviceId));
ipcMain.handle('bluetooth:get-status', () => bluetoothClient.getStatus());
ipcMain.handle('bluetooth:get-history', (_, options) => bluetoothClient.getHistory(options || {}));
ipcMain.handle('bluetooth:clear-history', () => bluetoothClient.clearHistory());
ipcMain.handle('bluetooth:get-stats', () => bluetoothClient.getStats());
ipcMain.handle('bluetooth:constants', () => ({ success: true, BT_STATE, MESSAGE_TYPE, BLE_SERVICES }));

// =============================================
// STARTMENU CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('startmenu:add-category', (_, { key, label, icon }) => startMenuClient.addCategory(key, label, icon));
ipcMain.handle('startmenu:get-category', (_, { key }) => startMenuClient.getCategory(key));
ipcMain.handle('startmenu:list-categories', () => startMenuClient.listCategories());
ipcMain.handle('startmenu:add-setting', (_, data) => startMenuClient.addSetting(data));
ipcMain.handle('startmenu:get-setting', (_, { key }) => startMenuClient.getSetting(key));
ipcMain.handle('startmenu:set-setting-value', (_, { key, value }) => startMenuClient.setSettingValue(key, value));
ipcMain.handle('startmenu:reset-setting', (_, { key }) => startMenuClient.resetSetting(key));
ipcMain.handle('startmenu:reset-all-settings', () => startMenuClient.resetAllSettings());
ipcMain.handle('startmenu:get-all-settings', () => startMenuClient.getAllSettings());
ipcMain.handle('startmenu:get-settings-by-category', (_, { categoryKey }) =>
  startMenuClient.getSettingsByCategory(categoryKey));
ipcMain.handle('startmenu:add-item', (_, item) => startMenuClient.addItem(item));
ipcMain.handle('startmenu:get-item', (_, { itemId }) => startMenuClient.getItem(itemId));
ipcMain.handle('startmenu:update-item', (_, { itemId, updates }) => startMenuClient.updateItem(itemId, updates));
ipcMain.handle('startmenu:remove-item', (_, { itemId }) => startMenuClient.removeItem(itemId));
ipcMain.handle('startmenu:list-items', (_, filter) => startMenuClient.listItems(filter || {}));
ipcMain.handle('startmenu:pin-item', (_, { itemId }) => startMenuClient.pinItem(itemId));
ipcMain.handle('startmenu:unpin-item', (_, { itemId }) => startMenuClient.unpinItem(itemId));
ipcMain.handle('startmenu:get-pinned', () => startMenuClient.getPinned());
ipcMain.handle('startmenu:access-item', (_, { itemId }) => startMenuClient.accessItem(itemId));
ipcMain.handle('startmenu:get-recent', (_, { limit }) => startMenuClient.getRecent(limit));
ipcMain.handle('startmenu:clear-recent', () => startMenuClient.clearRecent());
ipcMain.handle('startmenu:search', (_, { query }) => startMenuClient.search(query));
ipcMain.handle('startmenu:open', () => startMenuClient.open());
ipcMain.handle('startmenu:close', () => startMenuClient.close());
ipcMain.handle('startmenu:toggle', () => startMenuClient.toggle());
ipcMain.handle('startmenu:set-panel', (_, { panel }) => startMenuClient.setPanel(panel));
ipcMain.handle('startmenu:get-status', () => startMenuClient.getStatus());
ipcMain.handle('startmenu:export-settings', () => startMenuClient.exportSettings());
ipcMain.handle('startmenu:import-settings', (_, { data }) => startMenuClient.importSettings(data));
ipcMain.handle('startmenu:constants', () => ({ success: true, ITEM_TYPE, SETTING_TYPE }));

// =============================================
// BUCKET CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('bucket:import-url', async (_, { url, options }) => bucketClient.importUrl(url, options || {}));
ipcMain.handle('bucket:import-file', async (_, { filePath, options }) => bucketClient.importFile(filePath, options || {}));
ipcMain.handle('bucket:import-directory', async (_, { dirPath, options }) =>
  bucketClient.importDirectory(dirPath, options || {}));
ipcMain.handle('bucket:clone-repo', async (_, { url, options }) => bucketClient.cloneRepo(url, options || {}));
ipcMain.handle('bucket:get-repo-info', (_, { url }) => bucketClient.getRepoInfo(url));
ipcMain.handle('bucket:list-repos', () => bucketClient.listRepos());
ipcMain.handle('bucket:remove-repo', async (_, { owner, repo }) => bucketClient.removeRepo(owner, repo));
ipcMain.handle('bucket:list-files', (_, { category }) => bucketClient.listFiles(category));
ipcMain.handle('bucket:delete-file', (_, { filePath }) => bucketClient.deleteFile(filePath));
ipcMain.handle('bucket:restore-file', (_, { trashedPath, originalPath }) =>
  bucketClient.restoreFile(trashedPath, originalPath));
ipcMain.handle('bucket:list-trash', () => bucketClient.listTrash());
ipcMain.handle('bucket:empty-trash', () => bucketClient.emptyTrash());
ipcMain.handle('bucket:clean-old-trash', () => bucketClient.cleanOldTrash());
ipcMain.handle('bucket:get-disk-usage', () => bucketClient.getDiskUsage());
ipcMain.handle('bucket:get-history', (_, { limit }) => bucketClient.getHistory(limit));
ipcMain.handle('bucket:clear-history', () => bucketClient.clearHistory());
ipcMain.handle('bucket:get-stats', () => bucketClient.getStats());
ipcMain.handle('bucket:set-base-dir', (_, { dir }) => bucketClient.setBaseDir(dir));
ipcMain.handle('bucket:constants', () => ({ success: true, CONTENT_TYPE, IMPORT_STATE }));

// =============================================
// MINER CLIENT IPC HANDLERS (Dev Tier - minScore: 75)
// =============================================
ipcMain.handle('miner:configure', (_, options) => minerClient.configure(options));
ipcMain.handle('miner:set-pool', (_, { presetName }) => minerClient.setPool(presetName));
ipcMain.handle('miner:get-pool-presets', () => minerClient.getPoolPresets());
ipcMain.handle('miner:init-wallet', () => minerClient.initWallet());
ipcMain.handle('miner:get-wallet', () => minerClient.getWallet());
ipcMain.handle('miner:start', async () => {
  const result = await minerClient.start();
  // Forward miner events to renderer
  if (result.success) {
    minerClient.on('state', (state) => {
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('miner:state', { state });
      });
    });
    minerClient.on('stats', (stats) => {
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('miner:stats', stats);
      });
    });
    minerClient.on('block-found', (data) => {
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('miner:block-found', data);
      });
    });
    minerClient.on('share-accepted', (data) => {
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('miner:share-accepted', data);
      });
    });
    minerClient.on('rotation', (count) => {
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('miner:rotation', { count });
      });
    });
  }
  return result;
});
ipcMain.handle('miner:stop', () => minerClient.stop());
ipcMain.handle('miner:pause', () => minerClient.pause());
ipcMain.handle('miner:resume', () => minerClient.resume());
ipcMain.handle('miner:get-state', () => minerClient.getState());
ipcMain.handle('miner:get-stats', () => minerClient.getStats());
ipcMain.handle('miner:reset-stats', () => minerClient.resetStats());
ipcMain.handle('miner:get-config', () => minerClient.getConfig());
ipcMain.handle('miner:get-z3ro2z', () => minerClient.getZ3RO2ZConstants());
ipcMain.handle('miner:constants', () => ({ success: true, MINER_STATE, POOL_PRESETS, Z3RO2Z }));

// =============================================
// CONTROLLER CLIENT IPC HANDLERS (Steam Deck Controls)
// =============================================
ipcMain.handle('controller:scan-devices', () => controllerClient.scanDevices());
ipcMain.handle('controller:connect', (_, { devicePath }) => controllerClient.connect(devicePath));
ipcMain.handle('controller:disconnect', () => controllerClient.disconnect());
ipcMain.handle('controller:get-state', () => controllerClient.getState());
ipcMain.handle('controller:get-button', (_, { name }) => controllerClient.getButton(name));
ipcMain.handle('controller:get-stick', (_, { name }) => controllerClient.getStick(name));
ipcMain.handle('controller:get-trigger', (_, { name }) => controllerClient.getTrigger(name));
ipcMain.handle('controller:get-trackpad', (_, { name }) => controllerClient.getTrackpad(name));
ipcMain.handle('controller:get-dpad', () => controllerClient.getDpad());
ipcMain.handle('controller:get-gyro', () => controllerClient.getGyro());
ipcMain.handle('controller:get-accel', () => controllerClient.getAccel());
ipcMain.handle('controller:start-polling', (_, { interval }) => controllerClient.startPolling(interval));
ipcMain.handle('controller:stop-polling', () => controllerClient.stopPolling());
ipcMain.handle('controller:add-binding', (_, data) => controllerClient.addBinding(data));
ipcMain.handle('controller:remove-binding', (_, { id }) => controllerClient.removeBinding(id));
ipcMain.handle('controller:update-binding', (_, { id, updates }) => controllerClient.updateBinding(id, updates));
ipcMain.handle('controller:list-bindings', () => controllerClient.listBindings());
ipcMain.handle('controller:create-profile', (_, { name, bindings }) => controllerClient.createProfile(name, bindings));
ipcMain.handle('controller:load-profile', (_, { name }) => controllerClient.loadProfile(name));
ipcMain.handle('controller:save-profile', (_, { name }) => controllerClient.saveProfile(name));
ipcMain.handle('controller:list-profiles', () => controllerClient.listProfiles());
ipcMain.handle('controller:delete-profile', (_, { name }) => controllerClient.deleteProfile(name));
ipcMain.handle('controller:set-deadzone', (_, { type, value }) => controllerClient.setDeadzone(type, value));
ipcMain.handle('controller:get-calibration', () => controllerClient.getCalibration());
ipcMain.handle('controller:vibrate', (_, { intensity, duration }) => controllerClient.vibrate(intensity, duration));
ipcMain.handle('controller:get-status', () => controllerClient.getStatus());
ipcMain.handle('controller:constants', () => ({ success: true, BUTTON, AXIS, EV_TYPE }));

// Forward controller events to renderer
controllerClient.on('button:press', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:button:press', data);
  });
});
controllerClient.on('button:release', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:button:release', data);
  });
});
controllerClient.on('stick:left', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:stick:left', data);
  });
});
controllerClient.on('stick:right', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:stick:right', data);
  });
});
controllerClient.on('trigger:left', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:trigger:left', data);
  });
});
controllerClient.on('trigger:right', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:trigger:right', data);
  });
});
controllerClient.on('dpad', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:dpad', data);
  });
});
controllerClient.on('trackpad:left', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:trackpad:left', data);
  });
});
controllerClient.on('trackpad:right', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:trackpad:right', data);
  });
});
controllerClient.on('gyro', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:gyro', data);
  });
});
controllerClient.on('action', (data) => {
  gentlyWindows.forEach((entry) => {
    entry.bw.webContents.send('controller:action', data);
  });
});

// =============================================
// HOTKEY MENU CLIENT IPC HANDLERS (Maya-style Radial Menu)
// =============================================
ipcMain.handle('hotkey-menu:create', (_, data) => hotkeyMenuClient.createMenu(data));
ipcMain.handle('hotkey-menu:get', (_, { menuId }) => hotkeyMenuClient.getMenu(menuId));
ipcMain.handle('hotkey-menu:update', (_, { menuId, updates }) => hotkeyMenuClient.updateMenu(menuId, updates));
ipcMain.handle('hotkey-menu:delete', (_, { menuId }) => hotkeyMenuClient.deleteMenu(menuId));
ipcMain.handle('hotkey-menu:list', () => hotkeyMenuClient.listMenus());
ipcMain.handle('hotkey-menu:add-item', (_, { menuId, item, direction }) => hotkeyMenuClient.addMenuItem(menuId, item, direction));
ipcMain.handle('hotkey-menu:remove-item', (_, { menuId, itemId }) => hotkeyMenuClient.removeMenuItem(menuId, itemId));
ipcMain.handle('hotkey-menu:set-center', (_, { menuId, item }) => hotkeyMenuClient.setCenterItem(menuId, item));
ipcMain.handle('hotkey-menu:open', (_, { menuId }) => hotkeyMenuClient.open(menuId));
ipcMain.handle('hotkey-menu:close', () => hotkeyMenuClient.close());
ipcMain.handle('hotkey-menu:navigate', (_, { menuId }) => hotkeyMenuClient.navigateTo(menuId));
ipcMain.handle('hotkey-menu:back', () => hotkeyMenuClient.back());
ipcMain.handle('hotkey-menu:update-selection', (_, { x, y }) => hotkeyMenuClient.updateSelection(x, y));
ipcMain.handle('hotkey-menu:confirm', () => hotkeyMenuClient.confirm());
ipcMain.handle('hotkey-menu:get-state', () => hotkeyMenuClient.getState());
ipcMain.handle('hotkey-menu:get-history', (_, { limit }) => hotkeyMenuClient.getHistory(limit));
ipcMain.handle('hotkey-menu:export', () => hotkeyMenuClient.exportMenus());
ipcMain.handle('hotkey-menu:import', (_, { data }) => hotkeyMenuClient.importMenus(data));
ipcMain.handle('hotkey-menu:constants', () => hotkeyMenuClient.getConstants());

// Forward hotkey menu events
hotkeyMenuClient.on('action', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('hotkey-menu:action', data));
  // Route to action server
  if (data.action) actionServerClient.dispatch({ type: data.action, source: 'hotkey-menu', payload: data });
});
hotkeyMenuClient.on('selection', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('hotkey-menu:selection', data));
});
hotkeyMenuClient.on('open', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('hotkey-menu:open', data));
});
hotkeyMenuClient.on('close', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('hotkey-menu:close', data));
});

// =============================================
// ACTION SERVER CLIENT IPC HANDLERS (Quick Action Routing)
// =============================================
ipcMain.handle('action:dispatch', (_, actionData) => actionServerClient.dispatch(actionData));
ipcMain.handle('action:dispatch-async', async (_, actionData) => actionServerClient.dispatchAsync(actionData));
ipcMain.handle('action:register-handler', (_, data) => actionServerClient.registerHandler(data));
ipcMain.handle('action:unregister-handler', (_, { handlerId }) => actionServerClient.unregisterHandler(handlerId));
ipcMain.handle('action:list-handlers', () => actionServerClient.listHandlers());
ipcMain.handle('action:register-route', (_, data) => actionServerClient.registerRoute(data));
ipcMain.handle('action:unregister-route', (_, { method, path }) => actionServerClient.unregisterRoute(method, path));
ipcMain.handle('action:list-routes', () => actionServerClient.listRoutes());
ipcMain.handle('action:route', async (_, { method, path, body }) => actionServerClient.route(method, path, body));
ipcMain.handle('action:get-queue', () => actionServerClient.getQueueStatus());
ipcMain.handle('action:get-history', (_, { limit, filter }) => actionServerClient.getHistory(limit, filter));
ipcMain.handle('action:clear-history', () => actionServerClient.clearHistory());
ipcMain.handle('action:get-stats', () => actionServerClient.getStats());
ipcMain.handle('action:reset-stats', () => actionServerClient.resetStats());
ipcMain.handle('action:cancel-pending', () => actionServerClient.cancelPending());
ipcMain.handle('action:start', (_, { interval }) => actionServerClient.start(interval));
ipcMain.handle('action:stop', () => actionServerClient.stop());
ipcMain.handle('action:constants', () => actionServerClient.getConstants());

// Forward action server events
actionServerClient.on('app-launch', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('action:app-launch', data));
});
actionServerClient.on('mcp-call', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('action:mcp-call', data));
});

// =============================================
// WIRESHARK CLIENT IPC HANDLERS (Packet Capture)
// =============================================
ipcMain.handle('wireshark:list-interfaces', () => wiresharkClient.listInterfaces());
ipcMain.handle('wireshark:create-session', (_, data) => wiresharkClient.createSession(data));
ipcMain.handle('wireshark:start-capture', (_, { sessionId }) => wiresharkClient.startCapture(sessionId));
ipcMain.handle('wireshark:stop-capture', (_, { sessionId }) => wiresharkClient.stopCapture(sessionId));
ipcMain.handle('wireshark:get-packets', (_, { sessionId, limit, offset }) => wiresharkClient.getPackets(sessionId, limit, offset));
ipcMain.handle('wireshark:get-stats', (_, { sessionId }) => wiresharkClient.getSessionStats(sessionId));
ipcMain.handle('wireshark:clear-packets', (_, { sessionId }) => wiresharkClient.clearPackets(sessionId));
ipcMain.handle('wireshark:list-sessions', () => wiresharkClient.listSessions());
ipcMain.handle('wireshark:delete-session', (_, { sessionId }) => wiresharkClient.deleteSession(sessionId));
ipcMain.handle('wireshark:export', (_, { sessionId, format }) => wiresharkClient.exportPackets(sessionId, format));
ipcMain.handle('wireshark:analyze', (_, { sessionId }) => wiresharkClient.analyzeSession(sessionId));
ipcMain.handle('wireshark:decode-mcp', (_, { packet }) => wiresharkClient.decodeMCPPacket(packet));
ipcMain.handle('wireshark:list-filters', () => wiresharkClient.listFilters());
ipcMain.handle('wireshark:add-filter', (_, data) => wiresharkClient.addFilter(data));
ipcMain.handle('wireshark:constants', () => wiresharkClient.getConstants());

// Forward wireshark events
wiresharkClient.on('packet', (data) => {
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('wireshark:packet', data));
});

// =============================================
// BUTTON MAKER CLIENT IPC HANDLERS (Custom Buttons with Noun Project)
// =============================================
ipcMain.handle('button-maker:create', (_, data) => buttonMakerClient.createButton(data));
ipcMain.handle('button-maker:create-from-template', (_, { template, overrides }) => buttonMakerClient.createFromTemplate(template, overrides));
ipcMain.handle('button-maker:update', (_, { buttonId, paletteId, updates }) => buttonMakerClient.updateButton(buttonId, paletteId, updates));
ipcMain.handle('button-maker:delete', (_, { buttonId, paletteId }) => buttonMakerClient.deleteButton(buttonId, paletteId));
ipcMain.handle('button-maker:clone', (_, { buttonId, paletteId }) => buttonMakerClient.cloneButton(buttonId, paletteId));
ipcMain.handle('button-maker:create-palette', (_, data) => buttonMakerClient.createPalette(data));
ipcMain.handle('button-maker:get-palette', (_, { paletteId }) => buttonMakerClient.getPalette(paletteId));
ipcMain.handle('button-maker:list-palettes', () => buttonMakerClient.listPalettes());
ipcMain.handle('button-maker:delete-palette', (_, { paletteId }) => buttonMakerClient.deletePalette(paletteId));
ipcMain.handle('button-maker:add-to-palette', (_, { paletteId, buttonData }) => buttonMakerClient.addToPalette(paletteId, buttonData));
ipcMain.handle('button-maker:generate-css', (_, { paletteId, buttonId }) => buttonMakerClient.generateCSS(paletteId, buttonId));
ipcMain.handle('button-maker:generate-html', (_, { paletteId, buttonId }) => buttonMakerClient.generateHTML(paletteId, buttonId));
ipcMain.handle('button-maker:get-icon', (_, { name }) => buttonMakerClient.getIcon(name));
ipcMain.handle('button-maker:get-icon-svg', (_, { name, size, color }) => buttonMakerClient.getIconSvg(name, size, color));
ipcMain.handle('button-maker:search-icons', (_, { query }) => buttonMakerClient.searchIcons(query));
ipcMain.handle('button-maker:list-icons', () => buttonMakerClient.listIcons());
ipcMain.handle('button-maker:get-icon-category', (_, { category }) => buttonMakerClient.getIconCategory(category));
ipcMain.handle('button-maker:list-icon-categories', () => buttonMakerClient.listIconCategories());
ipcMain.handle('button-maker:export', (_, { paletteId }) => buttonMakerClient.exportPalette(paletteId));
ipcMain.handle('button-maker:import', (_, { jsonData }) => buttonMakerClient.importPalette(jsonData));
ipcMain.handle('button-maker:constants', () => buttonMakerClient.getConstants());

// =============================================
// WAYLAND CLIENT IPC HANDLERS (Compositor Control)
// =============================================
ipcMain.handle('wayland:connect', () => waylandClient.connect());
ipcMain.handle('wayland:disconnect', () => waylandClient.disconnect());
ipcMain.handle('wayland:refresh', () => waylandClient.refreshState());
ipcMain.handle('wayland:get-monitors', () => waylandClient.getMonitors());
ipcMain.handle('wayland:get-workspaces', () => waylandClient.getWorkspaces());
ipcMain.handle('wayland:get-surfaces', (_, filter) => waylandClient.getSurfaces(filter));
ipcMain.handle('wayland:switch-workspace', (_, { workspaceId }) => waylandClient.switchWorkspace(workspaceId));
ipcMain.handle('wayland:create-workspace', (_, data) => waylandClient.createWorkspace(data));
ipcMain.handle('wayland:delete-workspace', (_, { workspaceId }) => waylandClient.deleteWorkspace(workspaceId));
ipcMain.handle('wayland:move-to-workspace', (_, { surfaceId, workspaceId }) => waylandClient.moveToWorkspace(surfaceId, workspaceId));
ipcMain.handle('wayland:focus-surface', (_, { surfaceId }) => waylandClient.focusSurface(surfaceId));
ipcMain.handle('wayland:close-surface', (_, { surfaceId }) => waylandClient.closeSurface(surfaceId));
ipcMain.handle('wayland:toggle-fullscreen', (_, { surfaceId }) => waylandClient.toggleFullscreen(surfaceId));
ipcMain.handle('wayland:toggle-floating', (_, { surfaceId }) => waylandClient.toggleFloating(surfaceId));
ipcMain.handle('wayland:resize-surface', (_, { surfaceId, width, height }) => waylandClient.resizeSurface(surfaceId, width, height));
ipcMain.handle('wayland:move-surface', (_, { surfaceId, x, y }) => waylandClient.moveSurface(surfaceId, x, y));
ipcMain.handle('wayland:set-layout', (_, { layout }) => waylandClient.setLayout(layout));
ipcMain.handle('wayland:launch-app', (_, { command, workspace }) => waylandClient.launchApp(command, workspace));
ipcMain.handle('wayland:apply-template', (_, { templateId }) => waylandClient.applyTemplate(templateId));
ipcMain.handle('wayland:list-templates', () => waylandClient.listTemplates());
ipcMain.handle('wayland:get-template', (_, { templateId }) => waylandClient.getTemplate(templateId));
ipcMain.handle('wayland:create-template', (_, data) => waylandClient.createTemplate(data));
ipcMain.handle('wayland:save-as-template', (_, { name, description }) => waylandClient.saveAsTemplate(name, description));
ipcMain.handle('wayland:delete-template', (_, { templateId }) => waylandClient.deleteTemplate(templateId));
ipcMain.handle('wayland:screenshot', (_, { region }) => waylandClient.screenshot(region));
ipcMain.handle('wayland:get-status', () => waylandClient.getStatus());
ipcMain.handle('wayland:constants', () => waylandClient.getConstants());

// =============================================
// SMS CLIENT IPC HANDLERS (SMS Collection)
// =============================================
ipcMain.handle('sms:connect-kdeconnect', () => smsClient.connectKDEConnect());
ipcMain.handle('sms:connect-adb', () => smsClient.connectADB());
ipcMain.handle('sms:connect-bluetooth', (_, { address }) => smsClient.connectBluetooth(address));
ipcMain.handle('sms:list-devices', () => smsClient.listDevices());
ipcMain.handle('sms:set-active-device', (_, { deviceId }) => smsClient.setActiveDevice(deviceId));
ipcMain.handle('sms:fetch-kdeconnect', (_, { deviceId }) => smsClient.fetchSMSKDEConnect(deviceId));
ipcMain.handle('sms:fetch-adb', (_, { deviceId }) => smsClient.fetchSMSADB(deviceId));
ipcMain.handle('sms:send', (_, { recipient, body, deviceId }) => smsClient.sendSMS(recipient, body, deviceId));
ipcMain.handle('sms:get-threads', (_, filter) => smsClient.getThreads(filter));
ipcMain.handle('sms:get-thread', (_, { threadId }) => smsClient.getThread(threadId));
ipcMain.handle('sms:mark-thread-read', (_, { threadId }) => smsClient.markThreadRead(threadId));
ipcMain.handle('sms:archive-thread', (_, { threadId }) => smsClient.archiveThread(threadId));
ipcMain.handle('sms:delete-thread', (_, { threadId }) => smsClient.deleteThread(threadId));
ipcMain.handle('sms:pin-thread', (_, { threadId }) => smsClient.pinThread(threadId));
ipcMain.handle('sms:add-contact', (_, data) => smsClient.addContact(data));
ipcMain.handle('sms:get-contact', (_, { contactId }) => smsClient.getContact(contactId));
ipcMain.handle('sms:find-contact-by-phone', (_, { phone }) => smsClient.findContactByPhone(phone));
ipcMain.handle('sms:list-contacts', (_, filter) => smsClient.listContacts(filter));
ipcMain.handle('sms:block-contact', (_, { contactId }) => smsClient.blockContact(contactId));
ipcMain.handle('sms:delete-contact', (_, { contactId }) => smsClient.deleteContact(contactId));
ipcMain.handle('sms:search-messages', (_, { query, options }) => smsClient.searchMessages(query, options));
ipcMain.handle('sms:export', (_, { format, threadId }) => smsClient.exportMessages(format, threadId));
ipcMain.handle('sms:save', () => smsClient.save());
ipcMain.handle('sms:load', () => smsClient.load());
ipcMain.handle('sms:get-stats', () => smsClient.getStats());
ipcMain.handle('sms:constants', () => smsClient.getConstants());

// =============================================
// PHONE CLIENT IPC HANDLERS (Phone Emulator)
// =============================================
ipcMain.handle('phone:list-avds', () => phoneClient.listAVDs());
ipcMain.handle('phone:create-avd', (_, config) => phoneClient.createAVD(config));
ipcMain.handle('phone:delete-avd', (_, { avdName }) => phoneClient.deleteAVD(avdName));
ipcMain.handle('phone:create-emulator', (_, data) => phoneClient.createEmulator(data));
ipcMain.handle('phone:start-avd', (_, { avdName, options }) => phoneClient.startAVD(avdName, options));
ipcMain.handle('phone:start-waydroid', (_, options) => phoneClient.startWaydroid(options));
ipcMain.handle('phone:stop-emulator', (_, { emulatorId }) => phoneClient.stopEmulator(emulatorId));
ipcMain.handle('phone:kill-all', () => phoneClient.killAll());
ipcMain.handle('phone:list-emulators', () => phoneClient.listEmulators());
ipcMain.handle('phone:get-emulator-status', (_, { emulatorId }) => phoneClient.getEmulatorStatus(emulatorId));
ipcMain.handle('phone:install-apk', (_, { apkPath, emulatorId }) => phoneClient.installAPK(apkPath, emulatorId));
ipcMain.handle('phone:uninstall-app', (_, { packageName, emulatorId }) => phoneClient.uninstallApp(packageName, emulatorId));
ipcMain.handle('phone:launch-app', (_, { packageName, activity, emulatorId }) => phoneClient.launchApp(packageName, activity, emulatorId));
ipcMain.handle('phone:list-apps', (_, { emulatorId }) => phoneClient.listApps(emulatorId));
ipcMain.handle('phone:screenshot', (_, { emulatorId, outputPath }) => phoneClient.screenshot(emulatorId, outputPath));
ipcMain.handle('phone:record-screen', (_, { emulatorId, duration }) => phoneClient.recordScreen(emulatorId, duration));
ipcMain.handle('phone:send-input', (_, { inputType, args }) => phoneClient.sendInput(inputType, ...args));
ipcMain.handle('phone:set-location', (_, { latitude, longitude, emulatorId }) => phoneClient.setLocation(latitude, longitude, emulatorId));
ipcMain.handle('phone:set-network', (_, { delay, speed, emulatorId }) => phoneClient.setNetwork(delay, speed, emulatorId));
ipcMain.handle('phone:set-battery', (_, { level, charging, emulatorId }) => phoneClient.setBattery(level, charging, emulatorId));
ipcMain.handle('phone:get-backends', () => phoneClient.getBackends());
ipcMain.handle('phone:constants', () => phoneClient.getConstants());

// =============================================
// VM CLIENT IPC HANDLERS (Virtual Machine Management)
// =============================================
ipcMain.handle('vm:create', (_, data) => vmClient.createVM(data));
ipcMain.handle('vm:create-disk', (_, { name, sizeGB, format }) => vmClient.createDisk(name, sizeGB, format));
ipcMain.handle('vm:resize-disk', (_, { diskPath, newSizeGB }) => vmClient.resizeDisk(diskPath, newSizeGB));
ipcMain.handle('vm:get-disk-info', (_, { diskPath }) => vmClient.getDiskInfo(diskPath));
ipcMain.handle('vm:start', (_, { vmId }) => vmClient.startVM(vmId));
ipcMain.handle('vm:stop', (_, { vmId, force }) => vmClient.stopVM(vmId, force));
ipcMain.handle('vm:pause', (_, { vmId }) => vmClient.pauseVM(vmId));
ipcMain.handle('vm:resume', (_, { vmId }) => vmClient.resumeVM(vmId));
ipcMain.handle('vm:list', (_, filter) => vmClient.listVMs(filter));
ipcMain.handle('vm:get-status', (_, { vmId }) => vmClient.getVMStatus(vmId));
ipcMain.handle('vm:delete', (_, { vmId, deleteDisks }) => vmClient.deleteVM(vmId, deleteDisks));
ipcMain.handle('vm:create-snapshot', (_, { vmId, name, description }) => vmClient.createSnapshot(vmId, name, description));
ipcMain.handle('vm:list-snapshots', (_, { vmId }) => vmClient.listSnapshots(vmId));
ipcMain.handle('vm:restore-snapshot', (_, { snapshotId }) => vmClient.restoreSnapshot(snapshotId));
ipcMain.handle('vm:delete-snapshot', (_, { snapshotId }) => vmClient.deleteSnapshot(snapshotId));
ipcMain.handle('vm:create-network', (_, data) => vmClient.createNetwork(data));
ipcMain.handle('vm:list-networks', () => vmClient.listNetworks());
ipcMain.handle('vm:delete-network', (_, { networkId }) => vmClient.deleteNetwork(networkId));
ipcMain.handle('vm:connect-to-network', (_, { vmId, networkId }) => vmClient.connectToNetwork(vmId, networkId));
ipcMain.handle('vm:create-quick', (_, { preset }) => vmClient.createQuickVM(preset));
ipcMain.handle('vm:get-backends', () => vmClient.getBackends());
ipcMain.handle('vm:constants', () => vmClient.getConstants());

// =============================================
// LIVEPEER VIDEO STREAMING IPC HANDLERS
// =============================================
ipcMain.handle('livepeer:initialize', () => livePeerClient.initialize());
ipcMain.handle('livepeer:create-stream', (_, config) => livePeerClient.createStream(config));
ipcMain.handle('livepeer:list-streams', () => livePeerClient.listStreams());
ipcMain.handle('livepeer:get-stream', (_, { streamId }) => livePeerClient.getStream(streamId));
ipcMain.handle('livepeer:delete-stream', (_, { streamId }) => livePeerClient.deleteStream(streamId));
ipcMain.handle('livepeer:start-local-server', () => livePeerClient.startLocalServer());
ipcMain.handle('livepeer:stop-local-server', () => livePeerClient.stopLocalServer());
ipcMain.handle('livepeer:upload-asset', (_, { filePath, config }) => livePeerClient.uploadAsset(filePath, config));
ipcMain.handle('livepeer:list-assets', () => livePeerClient.listAssets());
ipcMain.handle('livepeer:transcode-local', (_, { input, output, profile }) => livePeerClient.transcodeLocal(input, output, profile));
ipcMain.handle('livepeer:text-to-image', (_, { prompt, config }) => livePeerClient.textToImage(prompt, config));
ipcMain.handle('livepeer:image-to-image', (_, { imagePath, prompt, config }) => livePeerClient.imageToImage(imagePath, prompt, config));
ipcMain.handle('livepeer:image-to-video', (_, { imagePath, config }) => livePeerClient.imageToVideo(imagePath, config));
ipcMain.handle('livepeer:upscale', (_, { imagePath, config }) => livePeerClient.upscale(imagePath, config));
ipcMain.handle('livepeer:audio-to-text', (_, { audioPath, config }) => livePeerClient.audioToText(audioPath, config));
ipcMain.handle('livepeer:segment-anything', (_, { imagePath, config }) => livePeerClient.segmentAnything(imagePath, config));
ipcMain.handle('livepeer:llm-inference', (_, { messages, config }) => livePeerClient.llmInference(messages, config));
ipcMain.handle('livepeer:list-ai-tasks', () => livePeerClient.listAITasks());
ipcMain.handle('livepeer:get-ai-task', (_, { taskId }) => livePeerClient.getAITask(taskId));
ipcMain.handle('livepeer:get-supported-models', (_, { pipeline }) => livePeerClient.getSupportedModels(pipeline));
ipcMain.handle('livepeer:get-status', () => livePeerClient.getStatus());
ipcMain.handle('livepeer:constants', () => ({ STREAM_STATE, TRANSCODE_PROFILE, AI_PIPELINE }));

// LivePeer event forwarding
livePeerClient.on('stream:created', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('livepeer:stream-created', data));
});
livePeerClient.on('ai:completed', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('livepeer:ai-completed', data));
});
livePeerClient.on('transcode:progress', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('livepeer:transcode-progress', data));
});

// =============================================
// MODEL HUB IPC HANDLERS
// =============================================
ipcMain.handle('modelhub:initialize', () => modelHubClient.initialize());
ipcMain.handle('modelhub:scan-models', () => modelHubClient.scanModels());
ipcMain.handle('modelhub:register-model', (_, config) => modelHubClient.registerModel(config));
ipcMain.handle('modelhub:unregister-model', (_, { modelId }) => modelHubClient.unregisterModel(modelId));
ipcMain.handle('modelhub:get-model', (_, { modelId }) => modelHubClient.getModel(modelId));
ipcMain.handle('modelhub:list-models', (_, filter) => modelHubClient.listModels(filter));
ipcMain.handle('modelhub:list-models-by-type', (_, { type }) => modelHubClient.listModelsByType(type));
ipcMain.handle('modelhub:update-model', (_, { modelId, updates }) => modelHubClient.updateModel(modelId, updates));
ipcMain.handle('modelhub:add-model-tags', (_, { modelId, tags }) => modelHubClient.addModelTags(modelId, tags));
ipcMain.handle('modelhub:create-collection', (_, { id, config }) => modelHubClient.createCollection(id, config));
ipcMain.handle('modelhub:add-to-collection', (_, { collectionId, modelId }) => modelHubClient.addToCollection(collectionId, modelId));
ipcMain.handle('modelhub:list-collections', () => modelHubClient.listCollections());
ipcMain.handle('modelhub:register-mcp-tool', (_, { modelId, config }) => modelHubClient.registerMCPTool(modelId, config));
ipcMain.handle('modelhub:list-mcp-tools', () => modelHubClient.listMCPTools());
ipcMain.handle('modelhub:get-mcp-manifest', () => modelHubClient.getMCPToolManifest());
ipcMain.handle('modelhub:start-mcp-server', () => modelHubClient.startMCPServer());
ipcMain.handle('modelhub:stop-mcp-server', () => modelHubClient.stopMCPServer());
ipcMain.handle('modelhub:invoke-model', (_, { modelId, input }) => modelHubClient.invokeModel(modelId, input));
ipcMain.handle('modelhub:download-huggingface', (_, { repoId, filename, config }) => modelHubClient.downloadFromHuggingFace(repoId, filename, config));
ipcMain.handle('modelhub:download-ollama', (_, { modelName }) => modelHubClient.downloadFromOllama(modelName));
ipcMain.handle('modelhub:list-ollama-models', () => modelHubClient.listOllamaModels());
ipcMain.handle('modelhub:run-ollama', (_, { modelName, prompt, config }) => modelHubClient.runOllama(modelName, prompt, config));
ipcMain.handle('modelhub:get-status', () => modelHubClient.getStatus());
ipcMain.handle('modelhub:get-disk-usage', () => modelHubClient.getDiskUsage());
ipcMain.handle('modelhub:constants', () => ({ MODEL_TYPE: HUB_MODEL_TYPE, MODEL_FORMAT, MODEL_SOURCE, MODEL_STATUS }));

// Model Hub event forwarding
modelHubClient.on('model:registered', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('modelhub:model-registered', data));
});
modelHubClient.on('download:progress', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('modelhub:download-progress', data));
});
modelHubClient.on('download:complete', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('modelhub:download-complete', data));
});
modelHubClient.on('mcp:tool-registered', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('modelhub:mcp-tool-registered', data));
});

// =============================================
// DNS CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('dns:initialize', () => dnsClient.initialize());
ipcMain.handle('dns:list-domains', () => dnsClient.listDomains());
ipcMain.handle('dns:get-domain', (_, { domain }) => dnsClient.getDomain(domain));
ipcMain.handle('dns:get-records', (_, { domain }) => dnsClient.getRecords(domain));
ipcMain.handle('dns:create-record', (_, { domain, record }) => dnsClient.createRecord(domain, record));
ipcMain.handle('dns:update-record', (_, { domain, recordId, record }) => dnsClient.updateRecord(domain, recordId, record));
ipcMain.handle('dns:delete-record', (_, { domain, recordId }) => dnsClient.deleteRecord(domain, recordId));
ipcMain.handle('dns:apply-preset', (_, { domain, preset, variables }) => dnsClient.applyPreset(domain, preset, variables));
ipcMain.handle('dns:set-a-record', (_, { domain, subdomain, ip }) => dnsClient.setARecord(domain, subdomain, ip));
ipcMain.handle('dns:set-cname', (_, { domain, subdomain, target }) => dnsClient.setCNAME(domain, subdomain, target));
ipcMain.handle('dns:set-txt', (_, { domain, subdomain, value }) => dnsClient.setTXT(domain, subdomain, value));
ipcMain.handle('dns:set-mx', (_, { domain, records }) => dnsClient.setMX(domain, records));
ipcMain.handle('dns:list-presets', () => dnsClient.listPresets());
ipcMain.handle('dns:get-preset', (_, { preset }) => dnsClient.getPreset(preset));
ipcMain.handle('dns:get-providers', () => dnsClient.getProviders());
ipcMain.handle('dns:get-status', () => dnsClient.getStatus());
ipcMain.handle('dns:constants', () => ({ RECORD_TYPE, DNS_PROVIDER, HOSTING_PRESET: Object.keys(HOSTING_PRESET) }));

// Porkbun-specific
ipcMain.handle('dns:porkbun-get-records', (_, { domain }) => dnsClient.porkbunGetRecords(domain));
ipcMain.handle('dns:porkbun-get-nameservers', (_, { domain }) => dnsClient.porkbunGetNameservers(domain));
ipcMain.handle('dns:porkbun-update-nameservers', (_, { domain, nameservers }) => dnsClient.porkbunUpdateNameservers(domain, nameservers));

// Cloudflare-specific
ipcMain.handle('dns:cloudflare-get-records', (_, { domain }) => dnsClient.cloudflareGetRecords(domain));
ipcMain.handle('dns:cloudflare-enable-proxy', (_, { domain, recordId, enabled }) => dnsClient.cloudflareEnableProxy(domain, recordId, enabled));

// DNS event forwarding
dnsClient.on('preset:applied', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('dns:preset-applied', data));
});

// =============================================
// TELEPHONY CLIENT IPC HANDLERS (Telnyx/Plivo)
// =============================================
ipcMain.handle('telephony:initialize', () => telephonyClient.initialize());
ipcMain.handle('telephony:send-sms', (_, { from, to, body, config }) => telephonyClient.sendSMS(from, to, body, config));
ipcMain.handle('telephony:send-mms', (_, { from, to, body, mediaUrls, config }) => telephonyClient.sendMMS(from, to, body, mediaUrls, config));
ipcMain.handle('telephony:make-call', (_, { from, to, config }) => telephonyClient.makeCall(from, to, config));
ipcMain.handle('telephony:list-numbers', () => telephonyClient.listNumbers());
ipcMain.handle('telephony:search-numbers', (_, { country, config }) => telephonyClient.searchNumbers(country, config));
ipcMain.handle('telephony:buy-number', (_, { phoneNumber, config }) => telephonyClient.buyNumber(phoneNumber, config));
ipcMain.handle('telephony:get-message', (_, { messageId }) => telephonyClient.getMessage(messageId));
ipcMain.handle('telephony:list-messages', (_, filter) => telephonyClient.listMessages(filter));
ipcMain.handle('telephony:get-call', (_, { callId }) => telephonyClient.getCall(callId));
ipcMain.handle('telephony:list-calls', (_, filter) => telephonyClient.listCalls(filter));
ipcMain.handle('telephony:get-pricing', () => telephonyClient.getPricing());
ipcMain.handle('telephony:calculate-savings', (_, { sms, minutes, numbers }) => telephonyClient.calculateSavings(sms, minutes, numbers));
ipcMain.handle('telephony:get-status', () => telephonyClient.getStatus());
ipcMain.handle('telephony:constants', () => telephonyClient.getConstants());

// Telnyx-specific
ipcMain.handle('telephony:telnyx-send-sms', (_, { from, to, body, config }) => telephonyClient.telnyxSendSMS(from, to, body, config));
ipcMain.handle('telephony:telnyx-make-call', (_, { from, to, config }) => telephonyClient.telnyxMakeCall(from, to, config));
ipcMain.handle('telephony:telnyx-search', (_, { country, config }) => telephonyClient.telnyxSearchNumbers(country, config));
ipcMain.handle('telephony:telnyx-buy', (_, { phoneNumber, config }) => telephonyClient.telnyxBuyNumber(phoneNumber, config));

// Telephony event forwarding
telephonyClient.on('message:sent', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('telephony:message-sent', data));
});
telephonyClient.on('call:initiated', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('telephony:call-initiated', data));
});

// =============================================
// GMAIL CLIENT IPC HANDLERS
// =============================================
ipcMain.handle('gmail:initialize', () => gmailClient.initialize());
ipcMain.handle('gmail:get-auth-url', (_, { state }) => gmailClient.getAuthUrl(state));
ipcMain.handle('gmail:exchange-code', (_, { code }) => gmailClient.exchangeCode(code));
ipcMain.handle('gmail:list-accounts', () => gmailClient.listAccounts());
ipcMain.handle('gmail:get-account', (_, { email }) => gmailClient.getAccount(email));
ipcMain.handle('gmail:remove-account', (_, { email }) => gmailClient.removeAccount(email));
ipcMain.handle('gmail:get-profile', (_, { email }) => gmailClient.getProfile(email));
ipcMain.handle('gmail:list-messages', (_, { email, options }) => gmailClient.listMessages(email, options));
ipcMain.handle('gmail:get-message', (_, { email, messageId, format }) => gmailClient.getMessage(email, messageId, format));
ipcMain.handle('gmail:send-email', (_, { from, to, subject, body, options }) => gmailClient.sendEmail(from, to, subject, body, options));
ipcMain.handle('gmail:reply-email', (_, { from, messageId, body, options }) => gmailClient.replyEmail(from, messageId, body, options));
ipcMain.handle('gmail:forward-email', (_, { from, messageId, to, body, options }) => gmailClient.forwardEmail(from, messageId, to, body, options));
ipcMain.handle('gmail:mark-read', (_, { email, messageId }) => gmailClient.markAsRead(email, messageId));
ipcMain.handle('gmail:mark-unread', (_, { email, messageId }) => gmailClient.markAsUnread(email, messageId));
ipcMain.handle('gmail:star-message', (_, { email, messageId, starred }) => gmailClient.starMessage(email, messageId, starred));
ipcMain.handle('gmail:trash-message', (_, { email, messageId }) => gmailClient.trashMessage(email, messageId));
ipcMain.handle('gmail:delete-message', (_, { email, messageId }) => gmailClient.deleteMessage(email, messageId));
ipcMain.handle('gmail:archive-message', (_, { email, messageId }) => gmailClient.archiveMessage(email, messageId));
ipcMain.handle('gmail:list-labels', (_, { email }) => gmailClient.listLabels(email));
ipcMain.handle('gmail:create-label', (_, { email, name, config }) => gmailClient.createLabel(email, name, config));
ipcMain.handle('gmail:delete-label', (_, { email, labelId }) => gmailClient.deleteLabel(email, labelId));
ipcMain.handle('gmail:list-threads', (_, { email, options }) => gmailClient.listThreads(email, options));
ipcMain.handle('gmail:get-thread', (_, { email, threadId }) => gmailClient.getThread(email, threadId));
ipcMain.handle('gmail:search', (_, { email, query, options }) => gmailClient.search(email, query, options));
ipcMain.handle('gmail:get-unread', (_, { email, options }) => gmailClient.getUnread(email, options));
ipcMain.handle('gmail:get-starred', (_, { email, options }) => gmailClient.getStarred(email, options));
ipcMain.handle('gmail:sync-inbox', (_, { email, options }) => gmailClient.syncInbox(email, options));
ipcMain.handle('gmail:start-auto-sync', (_, { interval }) => gmailClient.startAutoSync(interval));
ipcMain.handle('gmail:stop-auto-sync', () => gmailClient.stopAutoSync());
ipcMain.handle('gmail:get-status', () => gmailClient.getStatus());
ipcMain.handle('gmail:constants', () => gmailClient.getConstants());

// Gmail event forwarding
gmailClient.on('account:added', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('gmail:account-added', data));
});
gmailClient.on('email:sent', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('gmail:email-sent', data));
});
gmailClient.on('sync:start', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('gmail:sync-start', data));
});
gmailClient.on('sync:complete', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('gmail:sync-complete', data));
});

// =============================================
// FACE TRACKING IPC HANDLERS
// =============================================
ipcMain.handle('facetracking:initialize', () => faceTrackingClient.initialize());
ipcMain.handle('facetracking:start', () => faceTrackingClient.startTracking());
ipcMain.handle('facetracking:stop', () => faceTrackingClient.stopTracking());
ipcMain.handle('facetracking:calibrate', () => faceTrackingClient.calibrate());
ipcMain.handle('facetracking:get-current', () => faceTrackingClient.getCurrentFace());
ipcMain.handle('facetracking:get-history', () => faceTrackingClient.getHistory());
ipcMain.handle('facetracking:set-smoothing', (_, { value }) => faceTrackingClient.setSmoothing(value));
ipcMain.handle('facetracking:get-cameras', () => faceTrackingClient.getCameras());
ipcMain.handle('facetracking:set-camera', (_, { cameraId }) => faceTrackingClient.setCamera(cameraId));
ipcMain.handle('facetracking:get-status', () => faceTrackingClient.getStatus());
ipcMain.handle('facetracking:constants', () => faceTrackingClient.getConstants());

// Face tracking event forwarding
faceTrackingClient.on('face', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('facetracking:face', data));
});
faceTrackingClient.on('lost', () => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('facetracking:lost'));
});
faceTrackingClient.on('calibrated', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('facetracking:calibrated', data));
});
faceTrackingClient.on('state', (state) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('facetracking:state', state));
});

// =============================================
// AVATAR STUDIO IPC HANDLERS
// =============================================
ipcMain.handle('avatar:create', (_, config) => avatarStudioClient.createAvatar(config));
ipcMain.handle('avatar:get', (_, { avatarId }) => {
  const avatar = avatarStudioClient.getAvatar(avatarId);
  return avatar ? avatar.toJSON() : null;
});
ipcMain.handle('avatar:list', () => avatarStudioClient.listAvatars());
ipcMain.handle('avatar:delete', (_, { avatarId }) => avatarStudioClient.deleteAvatar(avatarId));
ipcMain.handle('avatar:set-active', (_, { avatarId }) => avatarStudioClient.setActiveAvatar(avatarId));
ipcMain.handle('avatar:get-active', () => {
  const avatar = avatarStudioClient.getActiveAvatar();
  return avatar ? avatar.toJSON() : null;
});
ipcMain.handle('avatar:update-part', (_, { avatarId, partType, asset }) => avatarStudioClient.updateAvatarPart(avatarId, partType, asset));
ipcMain.handle('avatar:apply-blendshapes', (_, { avatarId, blendShapes }) => avatarStudioClient.applyBlendShapes(avatarId, blendShapes));
ipcMain.handle('avatar:play-animation', (_, { avatarId, name, loop }) => avatarStudioClient.playAnimation(avatarId, name, loop));
ipcMain.handle('avatar:stop-animation', (_, { avatarId }) => avatarStudioClient.stopAnimation(avatarId));
ipcMain.handle('avatar:create-animation', (_, { name, keyframes, duration }) => {
  const clip = avatarStudioClient.createAnimationClip(name, keyframes, duration);
  return clip ? { id: clip.id, name: clip.name, duration: clip.duration } : null;
});
ipcMain.handle('avatar:export', (_, { avatarId, format }) => avatarStudioClient.exportAvatar(avatarId, format));
ipcMain.handle('avatar:import', (_, { data, format }) => avatarStudioClient.importAvatar(data, format));
ipcMain.handle('avatar:get-asset-library', (_, { category }) => avatarStudioClient.getAssetLibrary(category));
ipcMain.handle('avatar:render', (_, { avatarId }) => avatarStudioClient.renderAvatar(avatarId));
ipcMain.handle('avatar:get-status', () => avatarStudioClient.getStatus());
ipcMain.handle('avatar:constants', () => avatarStudioClient.getConstants());

// Avatar event forwarding
avatarStudioClient.on('avatar-created', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('avatar:created', data));
});
avatarStudioClient.on('animation-complete', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('avatar:animation-complete', data));
});

// =============================================
// REALTIME GRAPHICS IPC HANDLERS
// =============================================
ipcMain.handle('graphics:initialize', () => realtimeGraphicsClient.initialize());
ipcMain.handle('graphics:start', () => realtimeGraphicsClient.startRenderLoop());
ipcMain.handle('graphics:stop', () => realtimeGraphicsClient.stop());
ipcMain.handle('graphics:add-layer', (_, config) => {
  const layer = realtimeGraphicsClient.addLayer(config);
  return layer.toRenderData();
});
ipcMain.handle('graphics:remove-layer', (_, { layerId }) => realtimeGraphicsClient.removeLayer(layerId));
ipcMain.handle('graphics:add-chat-bubble', (_, { text, speaker, options }) => {
  const bubble = realtimeGraphicsClient.addChatBubble(text, speaker, options);
  return bubble.toRenderData();
});
ipcMain.handle('graphics:clear-chat-bubbles', () => realtimeGraphicsClient.clearChatBubbles());
ipcMain.handle('graphics:add-particles', (_, { id, config }) => {
  realtimeGraphicsClient.addParticleSystem(id, config);
  return { success: true };
});
ipcMain.handle('graphics:emit-particles', (_, { systemId, x, y, count }) => realtimeGraphicsClient.emitParticles(systemId, x, y, count));
ipcMain.handle('graphics:set-effect', (_, { effectType }) => realtimeGraphicsClient.setEffect(effectType));
ipcMain.handle('graphics:animate', (_, { layerId, property, from, to, duration, easing }) => realtimeGraphicsClient.animate(layerId, property, from, to, duration, easing));
ipcMain.handle('graphics:animate-in', (_, { layerId, direction }) => realtimeGraphicsClient.animateIn(layerId, direction));
ipcMain.handle('graphics:animate-out', (_, { layerId, direction }) => realtimeGraphicsClient.animateOut(layerId, direction));
ipcMain.handle('graphics:set-mode', (_, { mode }) => realtimeGraphicsClient.setMode(mode));
ipcMain.handle('graphics:resize', (_, { width, height }) => realtimeGraphicsClient.resize(width, height));
ipcMain.handle('graphics:get-state', () => realtimeGraphicsClient.getState());
ipcMain.handle('graphics:constants', () => ({ RENDER_MODE, EFFECT_TYPE, LAYER_TYPE, EASING }));

// Graphics event forwarding
realtimeGraphicsClient.on('render', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('graphics:render', data));
});
realtimeGraphicsClient.on('chat-bubble', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('graphics:chat-bubble', data));
});

// =============================================
// TAB VIEW SWITCHER IPC HANDLERS
// =============================================
ipcMain.handle('tabs:create', (_, config) => {
  const tab = tabViewSwitcherClient.createTab(config);
  return tab.toJSON();
});
ipcMain.handle('tabs:close', (_, { tabId }) => tabViewSwitcherClient.closeTab(tabId));
ipcMain.handle('tabs:switch', (_, { tabId, transition }) => tabViewSwitcherClient.switchToTab(tabId, transition));
ipcMain.handle('tabs:get', (_, { tabId }) => {
  const tab = tabViewSwitcherClient.getTab(tabId);
  return tab ? tab.toJSON() : null;
});
ipcMain.handle('tabs:get-active', () => {
  const tab = tabViewSwitcherClient.getActiveTab();
  return tab ? tab.toJSON() : null;
});
ipcMain.handle('tabs:get-all', () => tabViewSwitcherClient.getAllTabs());
ipcMain.handle('tabs:get-by-group', (_, { groupId }) => tabViewSwitcherClient.getTabsByGroup(groupId));
ipcMain.handle('tabs:create-group', (_, config) => {
  const group = tabViewSwitcherClient.createGroup(config);
  return group.toJSON();
});
ipcMain.handle('tabs:delete-group', (_, { groupId }) => tabViewSwitcherClient.deleteGroup(groupId));
ipcMain.handle('tabs:move', (_, { tabId, newIndex }) => tabViewSwitcherClient.moveTab(tabId, newIndex));
ipcMain.handle('tabs:toggle-pin', (_, { tabId }) => tabViewSwitcherClient.togglePin(tabId));
ipcMain.handle('tabs:duplicate', (_, { tabId }) => {
  const tab = tabViewSwitcherClient.duplicateTab(tabId);
  return tab ? tab.toJSON() : null;
});
ipcMain.handle('tabs:search', (_, { query }) => tabViewSwitcherClient.searchTabs(query));
ipcMain.handle('tabs:go-back', () => tabViewSwitcherClient.goBack());
ipcMain.handle('tabs:go-forward', () => tabViewSwitcherClient.goForward());
ipcMain.handle('tabs:set-view-mode', (_, { mode }) => tabViewSwitcherClient.setViewMode(mode));
ipcMain.handle('tabs:add-to-split', (_, { tabId }) => tabViewSwitcherClient.addToSplit(tabId));
ipcMain.handle('tabs:remove-from-split', (_, { tabId }) => tabViewSwitcherClient.removeFromSplit(tabId));
ipcMain.handle('tabs:start-auto-rotation', (_, { interval, tabIds }) => tabViewSwitcherClient.startAutoRotation(interval, tabIds));
ipcMain.handle('tabs:stop-auto-rotation', () => tabViewSwitcherClient.stopAutoRotation());
ipcMain.handle('tabs:pause-auto-rotation', () => tabViewSwitcherClient.pauseAutoRotation());
ipcMain.handle('tabs:resume-auto-rotation', () => tabViewSwitcherClient.resumeAutoRotation());
ipcMain.handle('tabs:set-transition', (_, { type }) => tabViewSwitcherClient.setDefaultTransition(type));
ipcMain.handle('tabs:set-transition-duration', (_, { ms }) => tabViewSwitcherClient.setTransitionDuration(ms));
ipcMain.handle('tabs:save-state', () => tabViewSwitcherClient.saveState());
ipcMain.handle('tabs:restore-state', (_, { state }) => tabViewSwitcherClient.restoreState(state));
ipcMain.handle('tabs:get-status', () => tabViewSwitcherClient.getStatus());
ipcMain.handle('tabs:constants', () => ({ TRANSITION_TYPE, TAB_STATE, VIEW_MODE }));

// Tab event forwarding
tabViewSwitcherClient.on('tab-created', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tabs:tab-created', data));
});
tabViewSwitcherClient.on('tab-closed', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tabs:tab-closed', data));
});
tabViewSwitcherClient.on('tab-switch', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tabs:tab-switch', data));
});
tabViewSwitcherClient.on('view-mode-changed', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tabs:view-mode-changed', data));
});
tabViewSwitcherClient.on('auto-rotation-started', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tabs:auto-rotation-started', data));
});

// =============================================
// INTRO CREATOR IPC HANDLERS
// =============================================
ipcMain.handle('intro:create', (_, config) => {
  const sequence = introCreatorClient.createSequence(config);
  return sequence.toJSON();
});
ipcMain.handle('intro:create-from-template', (_, { templateName }) => {
  const sequence = introCreatorClient.createFromTemplate(templateName);
  return sequence.toJSON();
});
ipcMain.handle('intro:get-templates', () => introCreatorClient.getTemplates());
ipcMain.handle('intro:load', (_, { sequenceId }) => {
  const sequence = introCreatorClient.loadSequence(sequenceId);
  return sequence.toJSON();
});
ipcMain.handle('intro:delete', (_, { sequenceId }) => introCreatorClient.deleteSequence(sequenceId));
ipcMain.handle('intro:get', (_, { sequenceId }) => {
  const sequence = introCreatorClient.getSequence(sequenceId);
  return sequence ? sequence.toJSON() : null;
});
ipcMain.handle('intro:get-all', () => introCreatorClient.getAllSequences());
ipcMain.handle('intro:play', () => introCreatorClient.play());
ipcMain.handle('intro:pause', () => introCreatorClient.pause());
ipcMain.handle('intro:stop', () => introCreatorClient.stop());
ipcMain.handle('intro:seek', (_, { time }) => introCreatorClient.seek(time));
ipcMain.handle('intro:set-speed', (_, { speed }) => introCreatorClient.setSpeed(speed));
ipcMain.handle('intro:preview-at', (_, { time }) => introCreatorClient.previewAt(time));
ipcMain.handle('intro:export-render', () => introCreatorClient.exportRenderCommands());
ipcMain.handle('intro:save-json', (_, { sequenceId }) => introCreatorClient.saveSequence(sequenceId));
ipcMain.handle('intro:load-json', (_, { jsonString }) => {
  const sequence = introCreatorClient.loadFromJSON(jsonString);
  return sequence.toJSON();
});
ipcMain.handle('intro:get-status', () => introCreatorClient.getStatus());
ipcMain.handle('intro:constants', () => introCreatorClient.getConstants());

// Intro event forwarding
introCreatorClient.on('frame', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('intro:frame', data));
});
introCreatorClient.on('play', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('intro:play', data));
});
introCreatorClient.on('pause', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('intro:pause', data));
});
introCreatorClient.on('complete', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('intro:complete', data));
});

// =============================================
// TRADINGVIEW IPC HANDLERS
// =============================================
ipcMain.handle('tradingview:connect', async (event) => {
  // Connect to the webview that sent this message
  const webContents = event.sender;
  return tradingViewClient.connect(webContents);
});
ipcMain.handle('tradingview:disconnect', () => tradingViewClient.disconnect());
ipcMain.handle('tradingview:get-chart-data', () => tradingViewClient.getChartData());
ipcMain.handle('tradingview:get-symbol-info', () => tradingViewClient.getSymbolInfo());
ipcMain.handle('tradingview:set-symbol', (_, { symbol }) => tradingViewClient.setSymbol(symbol));
ipcMain.handle('tradingview:set-timeframe', (_, { timeframe }) => tradingViewClient.setTimeframe(timeframe));
ipcMain.handle('tradingview:inject-pine', (_, { code }) => tradingViewClient.injectPineScript(code));
ipcMain.handle('tradingview:create-strategy', (_, config) => {
  const strategy = tradingViewClient.createStrategy(config);
  return strategy.toJSON();
});
ipcMain.handle('tradingview:get-strategy', (_, { strategyId }) => {
  const strategy = tradingViewClient.getStrategy(strategyId);
  return strategy ? strategy.toJSON() : null;
});
ipcMain.handle('tradingview:list-strategies', () => tradingViewClient.listStrategies());
ipcMain.handle('tradingview:delete-strategy', (_, { strategyId }) => tradingViewClient.deleteStrategy(strategyId));
ipcMain.handle('tradingview:deploy-strategy', (_, { strategyId }) => tradingViewClient.deployStrategy(strategyId));
ipcMain.handle('tradingview:get-strategy-results', () => tradingViewClient.getStrategyResults());
ipcMain.handle('tradingview:export-csv', (_, { filename }) => tradingViewClient.exportToCSV(filename));
ipcMain.handle('tradingview:get-csv-string', (_, { limit }) => tradingViewClient.getCSVString(limit));
ipcMain.handle('tradingview:add-indicator', (_, { name }) => tradingViewClient.addIndicator(name));
ipcMain.handle('tradingview:get-watchlist', () => tradingViewClient.getWatchlist());
ipcMain.handle('tradingview:capture-chart', () => tradingViewClient.captureChart());
ipcMain.handle('tradingview:get-templates', () => tradingViewClient.getTemplates());
ipcMain.handle('tradingview:get-template-code', (_, { templateName }) => tradingViewClient.getTemplateCode(templateName));
ipcMain.handle('tradingview:get-status', () => tradingViewClient.getStatus());
ipcMain.handle('tradingview:constants', () => tradingViewClient.getConstants());

// TradingView event forwarding
tradingViewClient.on('connected', () => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:connected'));
});
tradingViewClient.on('disconnected', () => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:disconnected'));
});
tradingViewClient.on('chartData', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:chart-data', data));
});
tradingViewClient.on('pineInjected', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:pine-injected', data));
});
tradingViewClient.on('strategyCreated', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:strategy-created', data));
});
tradingViewClient.on('strategyDeployed', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:strategy-deployed', data));
});
tradingViewClient.on('exported', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:exported', data));
});
tradingViewClient.on('error', (data) => {
  gentlyWindows.forEach(entry => entry.bw.webContents.send('tradingview:error', data));
});

// =============================================
// START MENU APP DISCOVERY IPC HANDLERS
// =============================================
ipcMain.handle('startmenu:scan-apps', () => startMenuClient.scanDesktopFiles());
ipcMain.handle('startmenu:launch-app', (_, { appId }) => startMenuClient.launchApp(appId));
ipcMain.handle('startmenu:search-apps', (_, { query }) => startMenuClient.searchApps(query));
ipcMain.handle('startmenu:get-apps-by-category', (_, { category }) => startMenuClient.getAppsByCategory(category));
ipcMain.handle('startmenu:list-apps', (_, filter) => startMenuClient.listApps(filter));
ipcMain.handle('startmenu:add-app-favorite', (_, { appId }) => startMenuClient.addAppFavorite(appId));
ipcMain.handle('startmenu:remove-app-favorite', (_, { appId }) => startMenuClient.removeAppFavorite(appId));
ipcMain.handle('startmenu:get-app-favorites', () => startMenuClient.getAppFavorites());
ipcMain.handle('startmenu:get-recent-apps', () => startMenuClient.getRecentApps());
ipcMain.handle('startmenu:clear-recent-apps', () => startMenuClient.clearRecentApps());
ipcMain.handle('startmenu:get-app-categories', () => startMenuClient.getAppCategories());

// Forward startmenu app actions
startMenuClient.on('app-action', (data) => {
  actionServerClient.dispatch({ type: data.action, source: 'startmenu', payload: data });
  gentlyWindows.forEach((entry) => entry.bw.webContents.send('startmenu:app-action', data));
});

// =============================================
// BRIDGE STATUS POLLING
// =============================================
function startBridgePolling() {
  const checkBridge = async () => {
    const status = await checkBridgeStatus();
    const wasOnline = bridgeOnline;
    bridgeOnline = status.online;

    // Update rotation state
    rotationState.update({ bridgeOnline });

    // Notify all windows if status changed
    if (wasOnline !== bridgeOnline) {
      console.log(`[Gently] Bridge status: ${bridgeOnline ? 'ONLINE' : 'OFFLINE'}`);
      gentlyWindows.forEach((entry) => {
        entry.bw.webContents.send('rotation:bridge-status', {
          online: bridgeOnline,
          ...status,
        });
      });
    }
  };

  // Initial check
  checkBridge();

  // Poll every 5 seconds
  bridgeCheckInterval = setInterval(checkBridge, 5000);
}

function stopBridgePolling() {
  if (bridgeCheckInterval) {
    clearInterval(bridgeCheckInterval);
    bridgeCheckInterval = null;
  }
}

// Subscribe to rotation state changes and broadcast to windows
rotationState.subscribe((event, data) => {
  if (event === 'rotate') {
    console.log('[Gently] Rotation event:', data.changes);
    gentlyWindows.forEach((entry) => {
      entry.bw.webContents.send('rotation:features-changed', data);
    });
  }
});

// ═══════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════
app.whenReady().then(() => {
  ensureDirs();

  // Run environment validation at boot
  console.log('[Gently] Running environment validation...');
  envValidation = envValidator.validate();
  console.log(`[Gently] Environment status: ${envValidation.status}`);
  console.log(`[Gently] Hardware score: ${envValidator.getHardwareScore()}`);
  console.log(`[Gently] Fingerprint: ${envValidation.fingerprint?.slice(0, 16)}...`);

  // Initialize rotation state with hardware score
  const hwScore = envValidator.getHardwareScore();
  const userTier = process.env.GENTLY_TIER || 'free';
  rotationState.update({ tier: userTier, hardwareScore: hwScore });
  console.log(`[Gently] User tier: ${userTier}, Effective tier: ${rotationState.getState().effectiveTier}`);

  // Start bridge status polling
  startBridgePolling();

  if (envValidation.status === ValidationStatus.MISMATCH) {
    console.warn('[Gently] WARNING: Environment mismatch detected!');
    if (envValidation.differences) {
      console.warn('[Gently] Differences:', JSON.stringify(envValidation.differences, null, 2));
    }
  }

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

  // Cleanup
  stopBridgePolling();
  if (cliProcess) cliProcess.kill();
  app.quit();
});
