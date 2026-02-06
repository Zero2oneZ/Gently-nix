# ELECTRON ↔ CHROME — THE HYBRID PLAY

---

## THE TRUTH ABOUT ELECTRON

Electron is NOT "an app framework." It's literally this:

```
ELECTRON = Chromium (the browser engine)
         + Node.js (system access)
         + A bridge between them

That's it. When you run Electron, you ARE running Chrome.
Same V8 engine. Same Blink renderer. Same DevTools.
Same CSS. Same WebAPIs. Same everything.

The only difference:
- Chrome: sandboxed, no filesystem, no native processes
- Electron: unsandboxed Node.js in the main process
```

So "embed Electron in Chrome" = "embed Chrome in Chrome" (pointless)
And "embed Chrome in Electron" = "it's already there" (already done)

---

## THE 3 REAL OPTIONS

### Option A: Chrome Extension + Native Messaging Host
```
┌─────────────────────────────────────┐
│         CHROME BROWSER              │
│                                     │
│  ┌──────────────────────────┐       │
│  │   OLO GUARD EXTENSION    │       │
│  │                          │       │
│  │  Side Panel (organizer)  │       │
│  │  Content Script (guard)  │       │
│  │  Tab Management          │       │
│  │  Storage (chains/data)   │       │
│  │                          │       │
│  │  ──── Native Messaging ──│───┐   │
│  └──────────────────────────┘   │   │
│                                 │   │
│  [claude.ai tab] [claude.ai]   │   │
└─────────────────────────────────│───┘
                                  │
                                  ▼
                    ┌──────────────────────┐
                    │  LOCAL BRIDGE        │
                    │  (Node.js daemon)    │
                    │                      │
                    │  • Filesystem access  │
                    │  • Claude Code CLI    │
                    │  • WASM vault         │
                    │  • Script watcher     │
                    │  • PTY management     │
                    └──────────────────────┘

PROS:
  + Chrome does all the tab/UI work natively
  + Extension ecosystem (side panel, context menus, etc.)
  + Tom can still use Chrome for normal browsing
  + Native Messaging is a standard Chrome API
  + Bridge daemon is tiny (~100 lines of Node.js)
  + Extension auto-updates independently of bridge

CONS:
  - Two pieces to install (extension + bridge)
  - Native Messaging has message size limits (1MB per message)
  - Bridge needs to be registered with Chrome (JSON manifest)
  - Can't control Chrome's window chrome (toolbar, etc.)
  - Steam Deck on-screen keyboard still needs separate solution
```

### Option B: Electron App That Loads the Extension
```
┌──────────────────────────────────────────────┐
│              ELECTRON APP                     │
│                                              │
│  MAIN PROCESS (Node.js)                      │
│  ├── Filesystem access                       │
│  ├── Claude Code CLI (PTY)                   │
│  ├── WASM vault                              │
│  ├── Script watcher                          │
│  ├── Window management                       │
│  └── IPC to renderer                         │
│                                              │
│  RENDERER (Chromium — same as Chrome)        │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │  session.loadExtension('./olo-ext')  │    │
│  │  ← LOADS THE SAME EXTENSION          │    │
│  │                                      │    │
│  │  BrowserView 1: claude.ai/chat/xxx   │    │
│  │  BrowserView 2: claude.ai/chat/yyy   │    │
│  │                                      │    │
│  │  Side Panel: organizer               │    │
│  │  Content Scripts: OLO guard          │    │
│  │  Custom keyboard overlay             │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘

PROS:
  + ONE THING to install and run
  + Extension runs INSIDE Electron (same code works in both)
  + Full system access from main process (no bridge needed)
  + Complete window control (frameless, custom titlebar, kiosk)
  + Can embed OLO keyboard natively
  + Steam Deck: runs as a "game" in Steam library
  + BrowserView gives us real Chrome tabs with full functionality
  + Node.js IPC is unlimited (no 1MB message limit)

CONS:
  - Larger app size (~200MB for Chromium)
  - Need to handle Claude.ai authentication in the Electron window
  - Some Chrome extension APIs behave slightly differently
  - Must keep Electron/Chromium updated for security
```

### Option C: THE HYBRID — Build Both, Share the Extension
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  THE SAME EXTENSION works in BOTH environments:     │
│                                                     │
│  ┌──────────────────────┐                           │
│  │   OLO GUARD          │                           │
│  │   EXTENSION          │                           │
│  │                      │                           │
│  │  (identical code)    │                           │
│  └──────┬───────┬───────┘                           │
│         │       │                                   │
│    ┌────┴──┐ ┌──┴─────┐                             │
│    │Chrome │ │Electron│                              │
│    │ Mode  │ │ Mode   │                              │
│    │       │ │        │                              │
│    │Native │ │Direct  │                              │
│    │Msg    │ │IPC to  │                              │
│    │Host   │ │Node.js │                              │
│    └───┬───┘ └───┬────┘                             │
│        │         │                                  │
│        ▼         ▼                                  │
│    ┌──────────────────┐                             │
│    │  BRIDGE API       │  ← Same interface,         │
│    │  (abstracted)     │    different transport      │
│    │                   │                             │
│    │  .readFile()      │  In Chrome: native msg      │
│    │  .spawnCLI()      │  In Electron: direct IPC    │
│    │  .getVault()      │                             │
│    │  .watchDir()      │  Same function calls,       │
│    │  .execScript()    │  different backends          │
│    └──────────────────┘                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## OPTION C IS THE ANSWER — HERE'S WHY

```
DEVELOPMENT:
  1. Build the extension ONCE
  2. Add an abstraction layer for system access
  3. Implement two backends:
     a. Native Messaging (for Chrome)
     b. Direct IPC (for Electron)
  4. Extension code doesn't know or care which one it's using

DEPLOYMENT:
  Desktop (normal computer):
    → Install Chrome extension + tiny bridge daemon
    → Works in your normal browser
    → Lightweight, familiar

  Steam Deck (gaming mode):
    → Run Electron app (added to Steam as non-Steam game)
    → Full kiosk mode, custom keyboard, game controller mapping
    → Extension loads inside Electron automatically
    → No external Chrome needed

  Steam Deck (desktop mode):
    → Either option works
    → Chrome extension if you want browser flexibility
    → Electron if you want the integrated experience

THE EXTENSION IS THE PRODUCT.
Chrome vs Electron is just the SHELL it runs in.
```

---

## THE ABSTRACTION LAYER — THE KEY PIECE

This is what makes it work in both environments:

```javascript
// bridge.js — The universal bridge

class OloBridge {
  constructor() {
    this.backend = null;
    this.detect();
  }

  detect() {
    // Are we in Electron?
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.backend = 'electron';
      this.transport = window.electronAPI;  // preload bridge
    }
    // Are we in Chrome with native messaging?
    else if (typeof chrome !== 'undefined' && chrome.runtime) {
      this.backend = 'chrome';
      this.port = chrome.runtime.connectNative('com.gentlyos.olo_bridge');
    }
    // Fallback: no system access (web-only mode)
    else {
      this.backend = 'web';
    }
  }

  // ─── UNIFIED API ───
  // Same functions regardless of backend

  async readFile(path) {
    return this.send('readFile', { path });
  }

  async writeFile(path, content) {
    return this.send('writeFile', { path, content });
  }

  async watchDir(path, callback) {
    return this.send('watchDir', { path }, callback);
  }

  async spawnCLI(command, args) {
    return this.send('spawnCLI', { command, args });
  }

  async getVault(key) {
    return this.send('getVault', { key });
  }

  async setVault(key, value) {
    return this.send('setVault', { key, value });
  }

  async execScript(scriptPath) {
    return this.send('execScript', { scriptPath });
  }

  async listScripts() {
    return this.send('listScripts', {});
  }

  // ─── TRANSPORT ───

  send(method, params, callback) {
    switch (this.backend) {
      case 'electron':
        return this.transport.invoke(method, params);

      case 'chrome':
        return new Promise((resolve, reject) => {
          const id = crypto.randomUUID();
          this.port.postMessage({ id, method, params });
          // Listen for response with matching id
          const handler = (msg) => {
            if (msg.id === id) {
              this.port.onMessage.removeListener(handler);
              if (msg.error) reject(msg.error);
              else resolve(msg.result);
            }
          };
          this.port.onMessage.addListener(handler);
        });

      case 'web':
        // No system access — return graceful fallback
        console.warn(`OloBridge: ${method} not available in web mode`);
        return Promise.resolve(null);
    }
  }
}

// Singleton — the rest of the extension just imports this
export const bridge = new OloBridge();
```

### Usage in extension code (same everywhere):

```javascript
import { bridge } from './bridge.js';

// This works identically in Chrome and Electron:

// Read a file
const claudeMd = await bridge.readFile('/gentlyos/workspace/claude.md');

// Watch for new scripts (self-modifying GUI)
bridge.watchDir('/gentlyos/scripts/', (event) => {
  if (event.type === 'add') {
    registerQuickAction(event.path);
  }
});

// Spawn Claude Code CLI
const session = await bridge.spawnCLI('claude', ['--model', 'opus']);

// Get encrypted credential
const apiKey = await bridge.getVault('anthropic_api_key');

// Run a script (Quick Action button pressed)
const result = await bridge.execScript('/gentlyos/scripts/git_status_all.sh');
```

---

## ELECTRON SETUP — LOADING THE EXTENSION

```javascript
// main.js (Electron main process)

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow, refWindow;

app.whenReady().then(async () => {

  // ─── Load our Chrome extension into Electron ───
  const extPath = path.join(__dirname, 'olo-guard-extension');
  await session.defaultSession.loadExtension(extPath, {
    allowFileAccess: true
  });

  // ─── Window 1: Focus (Session A) ───
  mainWindow = new BrowserWindow({
    width: 960,
    height: 800,
    // Frameless for Steam Deck kiosk mode:
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,  // Security: renderer can't access Node
    }
  });
  mainWindow.loadURL('https://claude.ai');

  // ─── Window 2: Reference (Session B) ───
  refWindow = new BrowserWindow({
    width: 640,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  refWindow.loadURL('https://claude.ai');

  // ─── IPC Handlers (the bridge backend) ───

  ipcMain.handle('readFile', async (event, { path: filePath }) => {
    return fs.promises.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('writeFile', async (event, { path: filePath, content }) => {
    return fs.promises.writeFile(filePath, content, 'utf-8');
  });

  ipcMain.handle('watchDir', async (event, { path: dirPath }) => {
    // Set up fs.watch and send events back to renderer
    const watcher = fs.watch(dirPath, (eventType, filename) => {
      event.sender.send('dir-change', { eventType, filename, dir: dirPath });
    });
    return { watching: dirPath };
  });

  ipcMain.handle('spawnCLI', async (event, { command, args }) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args || []);
      let stdout = '', stderr = '';
      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);
      proc.on('close', code => resolve({ code, stdout, stderr }));
      proc.on('error', reject);
    });
  });

  ipcMain.handle('execScript', async (event, { scriptPath }) => {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath]);
      let output = '';
      proc.stdout.on('data', d => output += d);
      proc.stderr.on('data', d => output += d);
      proc.on('close', code => resolve({ code, output }));
      proc.on('error', reject);
    });
  });

  ipcMain.handle('listScripts', async () => {
    const dir = '/gentlyos/scripts/';
    const files = await fs.promises.readdir(dir);
    return files.filter(f => f.endsWith('.sh'));
  });
});
```

```javascript
// preload.js — Exposes bridge to renderer (secure)

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (method, params) => ipcRenderer.invoke(method, params),
  onDirChange: (callback) => ipcRenderer.on('dir-change', (_, data) => callback(data)),
});
```

---

## NATIVE MESSAGING HOST — FOR CHROME MODE

```javascript
// native-host.js — Runs as standalone daemon
// Chrome launches this automatically via Native Messaging

const fs = require('fs');
const { spawn } = require('child_process');

// Chrome native messaging protocol:
// Read 4 bytes (uint32 LE) = message length
// Read N bytes = JSON message
// Write 4 bytes + JSON for response

function readMessage() {
  return new Promise((resolve) => {
    let lengthBuf = Buffer.alloc(4);
    let bytesRead = 0;

    process.stdin.on('readable', function onReadable() {
      if (bytesRead < 4) {
        const chunk = process.stdin.read(4 - bytesRead);
        if (chunk) {
          chunk.copy(lengthBuf, bytesRead);
          bytesRead += chunk.length;
        }
      }
      if (bytesRead === 4) {
        const msgLength = lengthBuf.readUInt32LE(0);
        const msgBuf = process.stdin.read(msgLength);
        if (msgBuf) {
          process.stdin.removeListener('readable', onReadable);
          resolve(JSON.parse(msgBuf.toString()));
        }
      }
    });
  });
}

function sendMessage(msg) {
  const json = JSON.stringify(msg);
  const buf = Buffer.alloc(4 + json.length);
  buf.writeUInt32LE(json.length, 0);
  buf.write(json, 4);
  process.stdout.write(buf);
}

// ─── Handle requests (same API as Electron IPC) ───

const handlers = {
  async readFile({ path }) {
    return fs.promises.readFile(path, 'utf-8');
  },
  async writeFile({ path, content }) {
    await fs.promises.writeFile(path, content, 'utf-8');
    return { ok: true };
  },
  async listScripts() {
    const files = await fs.promises.readdir('/gentlyos/scripts/');
    return files.filter(f => f.endsWith('.sh'));
  },
  async execScript({ scriptPath }) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath]);
      let output = '';
      proc.stdout.on('data', d => output += d);
      proc.stderr.on('data', d => output += d);
      proc.on('close', code => resolve({ code, output }));
    });
  },
  // ... same handlers as Electron
};

async function main() {
  while (true) {
    const msg = await readMessage();
    const { id, method, params } = msg;

    try {
      const result = await handlers[method](params);
      sendMessage({ id, result });
    } catch (error) {
      sendMessage({ id, error: error.message });
    }
  }
}

main();
```

```json
// com.gentlyos.olo_bridge.json
// Place in ~/.config/google-chrome/NativeMessagingHosts/ (Linux)
{
  "name": "com.gentlyos.olo_bridge",
  "description": "OLO Guard local bridge",
  "path": "/gentlyos/app/native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

---

## THE DECISION MATRIX

```
                        Chrome Ext     Electron      Hybrid
                        + Bridge       Standalone    (both)
─────────────────────────────────────────────────────────────
Install simplicity        ★★☆          ★★★           ★★☆
Tab management            ★★★          ★★☆           ★★★
System access             ★★☆          ★★★           ★★★
Steam Deck kiosk          ★☆☆          ★★★           ★★★
Normal desktop use        ★★★          ★★☆           ★★★
Build effort              ★★★          ★★☆           ★★☆
Code reuse                ★★☆          ★★☆           ★★★
OLO guard quality         ★★★          ★★★           ★★★
Future flexibility        ★★☆          ★★☆           ★★★
─────────────────────────────────────────────────────────────

HYBRID WINS.

Build the extension.
It runs in Chrome on desktop.
It runs in Electron on Steam Deck.
Same code. Two shells.
```

---

## REVISED BUILD ORDER

### Sprint 0: THE BRIDGE (build once, powers everything)
```
[ ] bridge.js — Abstraction layer with detect()
[ ] Electron backend (ipcMain handlers)
[ ] Native messaging backend (stdio host)
[ ] Test both: same extension code, both transports
```

### Sprint 1: THE EXTENSION (the actual product)
```
[ ] manifest.json (Manifest V3)
[ ] service-worker.js (tab detection, chain management)
[ ] sidepanel/ (organizer UI — projects/tracks/chains)
[ ] content/ (OLO guard injection on claude.ai)
[ ] storage-schema.js (data model)
```

### Sprint 2: THE SHELLS
```
[ ] Chrome mode: native messaging host registration
[ ] Electron mode: main.js + preload.js + extension loading
[ ] Steam Deck: desktop entry, Steam shortcut, controller mapping
```

### Sprint 3-6: Same as v2 architecture (chain management,
### split view, artifacts, OLO guard overlay, polish)

---

## FILE STRUCTURE — THE MONOREPO

```
gentlyos-olo/
│
├── extension/                    # THE EXTENSION (runs everywhere)
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.css
│   │   └── sidepanel.js
│   ├── content/
│   │   ├── olo-guard.js
│   │   ├── olo-guard.css
│   │   ├── collector.js
│   │   └── chat-detector.js
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   ├── lib/
│   │   ├── bridge.js             # ← THE ABSTRACTION
│   │   ├── transliterate.js
│   │   ├── gematria.js
│   │   ├── olo-encoder.js
│   │   └── storage-schema.js
│   └── assets/
│
├── electron/                     # ELECTRON SHELL
│   ├── main.js
│   ├── preload.js
│   └── package.json
│
├── native-host/                  # CHROME NATIVE MESSAGING
│   ├── native-host.js
│   └── com.gentlyos.olo_bridge.json
│
├── shared/                       # SHARED LOGIC
│   └── handlers.js               # Same file/CLI handlers
│                                  # used by both Electron and
│                                  # native messaging host
│
├── steam-deck/                   # STEAM DECK CONFIG
│   ├── olo-guard.desktop         # Desktop entry
│   ├── controller-mapping.vdf    # Steam input config
│   └── kiosk.sh                  # Launch script
│
└── workspace/                    # USER DATA (created on first run)
    ├── claude.md
    ├── skills.md
    ├── scripts/                  # Self-modifying GUI scripts
    └── downloads/                # Artifact pipeline
```

---

*One extension. Two shells. Zero compromise.*
*Chrome for the desk. Electron for the Deck.*
*The bridge doesn't care which world it's in.*
