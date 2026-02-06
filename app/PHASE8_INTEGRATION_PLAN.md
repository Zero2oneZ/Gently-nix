# Phase 8: Remaining Rust Crate Integration Plan

## Overview

Integrate the 7 remaining GentlyOS Rust crates into the Electron app with code-locked rotation UI.

**Crates to integrate:**
1. gently-behavior (Adaptive UI Learning)
2. gently-network (Security Visualization)
3. gently-sploit (Security Testing)
4. gently-architect (Idea Crystallization)
5. gently-commerce (Vibe Commerce)
6. gently-dance (Device Pairing)
7. gently-artisan (Toroidal Storage)

---

## Current Architecture Summary

### Client Libraries (17 existing in /app/lib/)
```
agent-system.js, bridge-client.js, cli-bridge.js, doc-client.js,
feed-client.js, ged-client.js, goo-client.js, huggingface-client.js,
ipfs-client.js, kaggle-client.js, mcp-client.js, ollama-client.js,
porkbun-client.js, rotation-state.js, search-client.js, svg-client.js,
tier-gate.js
```

### IPC Handler Pattern (main.js)
```javascript
// Standard pattern for all new handlers:
ipcMain.handle('crate:method', async (_, { param1, param2 }) => {
  try {
    const result = await crateClient.method(param1, param2);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

### Preload API Pattern (preload.js)
```javascript
// Standard namespace pattern:
crateName: {
  method: (params) => ipcRenderer.invoke('crate:method', { ...params }),
  onEvent: (cb) => ipcRenderer.on('crate:event', (_, d) => cb(d)),
},
```

### Renderer Pattern (shell.js)
```javascript
// Standard integration pattern:
let crateState = null;
function initCrate() { /* hook buttons, check status */ }
async function openCrateModal() { /* tier check, show modal */ }
function closeCrateModal() { /* hide modal */ }
window.openCrateModal = openCrateModal;
```

---

## Tier Gate Additions (lib/tier-gate.js)

Add to FEATURE_REQUIREMENTS:

```javascript
// BEHAVIOR scope (adaptive UI)
'behavior.profile': { scope: 'behavior', tier: 'basic' },
'behavior.analysis': { scope: 'behavior', tier: 'pro', minScore: 25 },
'behavior.patterns': { scope: 'behavior', tier: 'dev', minScore: 50 },
'behavior.adaptation': { scope: 'behavior', tier: 'dev', minScore: 75 },

// NETWORK scope (security visualization)
'network.firewall': { scope: 'network', tier: 'pro' },
'network.monitor': { scope: 'network', tier: 'pro', minScore: 25 },
'network.capture': { scope: 'network', tier: 'dev', minScore: 50 },
'network.proxy': { scope: 'network', tier: 'dev', minScore: 75 },

// SPLOIT scope (security testing) - DEV ONLY
'sploit.scan': { scope: 'sploit', tier: 'dev', minScore: 50 },
'sploit.check': { scope: 'sploit', tier: 'dev', minScore: 75 },
'sploit.exploit': { scope: 'sploit', tier: 'dev', minScore: 100 },
'sploit.sessions': { scope: 'sploit', tier: 'dev', minScore: 100 },

// ARCHITECT scope (idea crystallization)
'architect.ideas': { scope: 'architect', tier: 'basic' },
'architect.tree': { scope: 'architect', tier: 'pro' },
'architect.recall': { scope: 'architect', tier: 'pro', minScore: 25 },
'architect.flowchart': { scope: 'architect', tier: 'dev', minScore: 50 },

// COMMERCE scope (vibe shopping)
'commerce.search': { scope: 'commerce', tier: 'pro' },
'commerce.cart': { scope: 'commerce', tier: 'pro' },
'commerce.checkout': { scope: 'commerce', tier: 'pro', requiresBridge: true },
'commerce.trading': { scope: 'commerce', tier: 'dev', minScore: 50 },

// DANCE scope (device pairing)
'dance.initiate': { scope: 'dance', tier: 'pro', requiresBridge: true },
'dance.exchange': { scope: 'dance', tier: 'pro', requiresBridge: true },
'dance.contract': { scope: 'dance', tier: 'dev', requiresBridge: true },
'dance.audit': { scope: 'dance', tier: 'dev', minScore: 50, requiresBridge: true },

// ARTISAN scope (toroidal storage)
'artisan.torus': { scope: 'artisan', tier: 'basic' },
'artisan.foam': { scope: 'artisan', tier: 'pro', minScore: 25 },
'artisan.barf': { scope: 'artisan', tier: 'dev', minScore: 50 },
'artisan.traverse': { scope: 'artisan', tier: 'dev', minScore: 75 },
```

---

## Phase 8a: Behavior Client (gently-behavior)

### Purpose
Adaptive UI that learns from user behavior patterns - predicts next actions, detects chains, suggests shortcuts.

### File: lib/behavior-client.js (~250 lines)

```javascript
// Key structures from Rust:
// - Action: click, input, navigate, scroll, hover, shortcut, command, tool
// - ActionType: 21 variants
// - BehavioralChain: detected sequence patterns
// - Prediction: next action with confidence

class BehaviorClient {
  constructor() {
    this.enabled = true;
    this.actions = [];
    this.chains = [];
    this.config = {
      minActionsForPrediction: 3,
      maxChainLength: 5,
      observationDecay: 0.95,
      suggestionThreshold: 0.6
    };
  }

  observe(action) { /* Record user action */ }
  predictNext() { /* Get next action predictions */ }
  getChains() { /* Get detected behavioral chains */ }
  getAdaptations(level) { /* Get UI adaptations */ }
  getStats() { /* Get learning statistics */ }
  reset() { /* Clear learning state */ }
}
```

### IPC Handlers (main.js) - 8 handlers

```javascript
ipcMain.handle('behavior:observe', async (_, { action }))
ipcMain.handle('behavior:predict', async ())
ipcMain.handle('behavior:chains', async ())
ipcMain.handle('behavior:adaptations', async (_, { level }))
ipcMain.handle('behavior:stats', async ())
ipcMain.handle('behavior:reset', async ())
ipcMain.handle('behavior:configure', async (_, { config }))
ipcMain.handle('behavior:is-enabled', async ())
```

### UI Location
- Embedded in all scopes (observes actions silently)
- Settings panel in Integrations modal
- Prediction overlay when suggestions available

---

## Phase 8b: Network Client (gently-network)

### Purpose
Network security visualization - firewall rules, connection monitoring, packet capture, MITM proxy.

### File: lib/network-client.js (~350 lines)

```javascript
// Key structures from Rust:
// - Firewall: default-deny, rules, blocked/allowed IPs
// - NetworkMonitor: event logging and stats
// - PacketCapture: capture sessions
// - ProxyConfig: MITM interception

class NetworkClient {
  constructor() {
    this.firewall = { enabled: true, rules: [], defaultAction: 'deny' };
    this.monitor = { events: [], stats: {} };
    this.captures = [];
    this.proxyConfig = null;
  }

  // Firewall
  checkConnection(ip, port, direction) { }
  addRule(rule) { }
  removeRule(ruleId) { }
  blockIP(ip) { }
  allowIP(ip) { }

  // Monitor
  getEvents(limit) { }
  getStats() { }

  // Capture
  startCapture(filter) { }
  stopCapture(sessionId) { }
  getPackets(sessionId) { }

  // Visualization
  renderTopology() { }
  exportSvg() { }
}
```

### IPC Handlers (main.js) - 15 handlers

```javascript
ipcMain.handle('network:firewall-check', ...)
ipcMain.handle('network:firewall-add-rule', ...)
ipcMain.handle('network:firewall-remove-rule', ...)
ipcMain.handle('network:firewall-block', ...)
ipcMain.handle('network:firewall-allow', ...)
ipcMain.handle('network:firewall-status', ...)
ipcMain.handle('network:monitor-events', ...)
ipcMain.handle('network:monitor-stats', ...)
ipcMain.handle('network:capture-start', ...)
ipcMain.handle('network:capture-stop', ...)
ipcMain.handle('network:capture-packets', ...)
ipcMain.handle('network:visualize-topology', ...)
ipcMain.handle('network:export-svg', ...)
ipcMain.handle('network:proxy-configure', ...)
ipcMain.handle('network:proxy-history', ...)
```

### UI Location
- New scope pill: NETWORK (between BUILD and DOC)
- Network topology visualization in paneB
- Firewall rules panel in left shelf
- Capture session list in right shelf

### Toolbar Section (tb-network)
- Topology, Nodes, Routes, Capture, Proxy

---

## Phase 8c: Sploit Client (gently-sploit)

### Purpose
Security testing framework (Metasploit-style) - module search, exploit checking, session management.

### File: lib/sploit-client.js (~400 lines)

```javascript
// Key structures from Rust:
// - Framework: main state with modules, sessions, workspace
// - Target: host, port, protocol, OS, arch
// - ModuleInfo: exploit/auxiliary metadata
// - ExploitResult: success/failure with session ID
// - Session: active session after exploitation

class SploitClient {
  constructor() {
    this.workspace = { name: 'default', hosts: [], credentials: [], loot: [] };
    this.modules = [];
    this.sessions = [];
    this.globalOptions = { lhost: '', lport: 4444, threads: 4, timeout: 10 };
  }

  // Modules
  searchModules(query) { }
  getModuleInfo(name) { }
  setModuleOption(name, value) { }

  // Targets
  addTarget(host, port) { }
  scanTarget(targetId) { }

  // Exploitation
  checkVulnerable(moduleId, targetId) { }
  runExploit(moduleId, targetId) { }

  // Sessions
  listSessions() { }
  interactSession(sessionId) { }
  closeSession(sessionId) { }
}
```

### IPC Handlers (main.js) - 14 handlers

```javascript
ipcMain.handle('sploit:search-modules', ...)
ipcMain.handle('sploit:get-module', ...)
ipcMain.handle('sploit:set-option', ...)
ipcMain.handle('sploit:add-target', ...)
ipcMain.handle('sploit:scan-target', ...)
ipcMain.handle('sploit:check', ...)
ipcMain.handle('sploit:exploit', ...)
ipcMain.handle('sploit:list-sessions', ...)
ipcMain.handle('sploit:interact', ...)
ipcMain.handle('sploit:close-session', ...)
ipcMain.handle('sploit:workspace-save', ...)
ipcMain.handle('sploit:workspace-load', ...)
ipcMain.handle('sploit:global-options', ...)
ipcMain.handle('sploit:credentials', ...)
```

### UI Location
- Sub-scope of BUILD (build.sploit) or separate modal
- Module browser in paneB
- Session manager in right shelf
- Console output area

### Toolbar Section (tb-sploit)
- Scan, Exploit, Sessions, Console, Report

---

## Phase 8d: Architect Client (gently-architect)

### Purpose
Idea crystallization engine - track ideas from spoken to crystallized, link to project tree, flow through recall.

### File: lib/architect-client.js (~350 lines)

```javascript
// Key structures from Rust:
// - IdeaCrystal: idea with state (Spoken -> Embedded -> Confirmed -> Crystallized)
// - IdeaScore: clarity, feasibility, impact, completeness
// - ProjectTree: file/folder structure linked to ideas
// - RecallEngine: memory recall and suggestion system

class ArchitectClient {
  constructor() {
    this.ideas = [];
    this.tree = null;
    this.recall = null;
  }

  // Ideas
  createIdea(content) { }
  embedIdea(ideaId, embedding, chain) { }
  confirmIdea(ideaId) { }
  crystallizeIdea(ideaId, sourceFile) { }
  branchIdea(ideaId, newContent) { }
  connectIdeas(ideaA, ideaB) { }
  scoreIdea(ideaId) { }

  // Project Tree
  createTree(name, root) { }
  addDirectory(path) { }
  addFile(path, language) { }
  linkIdeaToPath(ideaId, path) { }
  renderTree() { }

  // Recall
  recall(query) { }
  suggestConnections() { }
  rankIdeas() { }
}
```

### IPC Handlers (main.js) - 16 handlers

```javascript
ipcMain.handle('architect:create-idea', ...)
ipcMain.handle('architect:embed-idea', ...)
ipcMain.handle('architect:confirm-idea', ...)
ipcMain.handle('architect:crystallize-idea', ...)
ipcMain.handle('architect:branch-idea', ...)
ipcMain.handle('architect:connect-ideas', ...)
ipcMain.handle('architect:score-idea', ...)
ipcMain.handle('architect:list-ideas', ...)
ipcMain.handle('architect:get-idea', ...)
ipcMain.handle('architect:create-tree', ...)
ipcMain.handle('architect:add-node', ...)
ipcMain.handle('architect:link-idea', ...)
ipcMain.handle('architect:render-tree', ...)
ipcMain.handle('architect:recall', ...)
ipcMain.handle('architect:suggest', ...)
ipcMain.handle('architect:flowchart', ...)
```

### UI Location
- New scope pill: ARCHITECT (before BUILD)
- Idea flow visualization in paneB
- Project tree in left shelf
- Recall results in right shelf

### Toolbar Section (tb-architect)
- Blueprint, Ideas, Tree, Recall, Flow

---

## Phase 8e: Commerce Client (gently-commerce)

### Purpose
Vibe commerce - natural language shopping queries, unified checkout, TradingView integration.

### File: lib/commerce-client.js (~400 lines)

```javascript
// Key structures from Rust:
// - VibeQuery: natural language parsed to structured query
// - Product: unified product model across stores
// - Cart: shopping cart with items
// - TradingEngine: market data interface

class CommerceClient {
  constructor() {
    this.stores = [];
    this.preferences = null;
    this.cart = { items: [], totals: {} };
  }

  // Search
  parseVibeQuery(rawInput) { }
  searchProducts(query) { }
  getProduct(productId) { }

  // Cart
  addToCart(productId, quantity, variant) { }
  removeFromCart(productId) { }
  updateQuantity(productId, quantity) { }
  getCartSummary() { }
  applyCoupon(code) { }

  // Checkout
  processCheckout(payment, address) { }

  // Trading
  getMarketData(ticker, timeframe) { }
  setAlert(ticker, price, direction) { }

  // Preferences
  setPreferences(prefs) { }
  getRecommendations() { }
}
```

### IPC Handlers (main.js) - 16 handlers

```javascript
ipcMain.handle('commerce:parse-query', ...)
ipcMain.handle('commerce:search', ...)
ipcMain.handle('commerce:get-product', ...)
ipcMain.handle('commerce:add-to-cart', ...)
ipcMain.handle('commerce:remove-from-cart', ...)
ipcMain.handle('commerce:update-quantity', ...)
ipcMain.handle('commerce:cart-summary', ...)
ipcMain.handle('commerce:apply-coupon', ...)
ipcMain.handle('commerce:checkout', ...)
ipcMain.handle('commerce:market-data', ...)
ipcMain.handle('commerce:set-alert', ...)
ipcMain.handle('commerce:list-alerts', ...)
ipcMain.handle('commerce:set-preferences', ...)
ipcMain.handle('commerce:recommendations', ...)
ipcMain.handle('commerce:add-store', ...)
ipcMain.handle('commerce:list-stores', ...)
```

### UI Location
- Integrations modal (Pro tier section)
- Vibe search bar component
- Product grid view
- Cart sidebar

---

## Phase 8f: Dance Client (gently-dance)

### Purpose
Two-device pairing protocol - visual/audio call-and-response for XOR secret reconstruction with contract enforcement.

### File: lib/dance-client.js (~300 lines)

```javascript
// Key structures from Rust:
// - DanceSession: orchestrates handshake (Dormant -> Ready -> Init -> Challenge -> Exchange -> Verify -> Audit -> Complete)
// - Contract: access control with conditions
// - Condition: TokenBalance, TimeWindow, DevicePresent, NftHolder, Location, Custom
// - AuditResult: Pass, InvalidSignature, Expired, ConditionFailed

class DanceClient {
  constructor() {
    this.session = null;
    this.role = null; // 'lock' or 'key'
    this.contract = null;
  }

  // Session
  initiateLockHolder(lock, contract) { }
  initiateKeyHolder(key, contract) { }
  wake() { }
  getCurrentState() { }

  // Protocol
  init() { }
  challenge() { }
  exchange(hashFragment) { }
  verify() { }
  audit() { }

  // Result
  getReconstructedSecret() { }
  getAuditResult() { }

  // Contract
  createContract(creator, description) { }
  addCondition(condition) { }
  setExpiry(blockHeight) { }
  signContract(secret) { }
  verifyContract(secret) { }
}
```

### IPC Handlers (main.js) - 14 handlers

```javascript
ipcMain.handle('dance:init-lock', ...)
ipcMain.handle('dance:init-key', ...)
ipcMain.handle('dance:wake', ...)
ipcMain.handle('dance:state', ...)
ipcMain.handle('dance:start', ...)
ipcMain.handle('dance:challenge', ...)
ipcMain.handle('dance:exchange', ...)
ipcMain.handle('dance:verify', ...)
ipcMain.handle('dance:audit', ...)
ipcMain.handle('dance:secret', ...)
ipcMain.handle('dance:create-contract', ...)
ipcMain.handle('dance:add-condition', ...)
ipcMain.handle('dance:sign-contract', ...)
ipcMain.handle('dance:verify-contract', ...)
```

### UI Location
- Security modal in right shelf
- Visual pattern display area
- Contract builder form
- Audit status indicator

---

## Phase 8g: Artisan Client (gently-artisan)

### Purpose
Toroidal knowledge storage - Torus (knowledge surface), Foam (multi-torus mesh), BARF (XOR-based retrieval).

### File: lib/artisan-client.js (~350 lines)

```javascript
// Key structures from Rust:
// - Torus: knowledge surface with major/minor radii, winding level, BS score
// - TorusPoint: location on torus surface
// - Foam: multi-torus interconnected memory
// - TorusBlend: connection between tori with strength
// - BarfQuery: XOR-based search

class ArtisanClient {
  constructor() {
    this.foam = { tori: {}, blends: [] };
  }

  // Torus
  createTorus(label, majorRadius, tokens) { }
  addTokens(torusId, tokens) { }
  refineTorus(torusId) { }
  validateTorus(torusId, bsScore) { }
  getTorusInfo(torusId) { }

  // Points
  createPoint(majorAngle, minorAngle) { }
  distanceBetween(pointA, pointB) { }

  // Foam
  addTorusToFoam(torus) { }
  blendTori(torusA, torusB, pointA, pointB, strength) { }
  simpleBlend(torusA, torusB, strength) { }
  traverse(start, end) { }
  decayBlend(blendId, factor) { }
  boostBlend(blendId, amount) { }

  // BARF (Bark And Retrieve Foam)
  queryFoam(queryVector, xorKey) { }
  getBestMatch(results) { }

  // Visualization
  renderFoam() { }
  exportToJson() { }
  importFromJson(data) { }
}
```

### IPC Handlers (main.js) - 18 handlers

```javascript
ipcMain.handle('artisan:create-torus', ...)
ipcMain.handle('artisan:add-tokens', ...)
ipcMain.handle('artisan:refine', ...)
ipcMain.handle('artisan:validate', ...)
ipcMain.handle('artisan:get-torus', ...)
ipcMain.handle('artisan:list-tori', ...)
ipcMain.handle('artisan:create-point', ...)
ipcMain.handle('artisan:distance', ...)
ipcMain.handle('artisan:add-to-foam', ...)
ipcMain.handle('artisan:blend', ...)
ipcMain.handle('artisan:simple-blend', ...)
ipcMain.handle('artisan:traverse', ...)
ipcMain.handle('artisan:decay-blend', ...)
ipcMain.handle('artisan:boost-blend', ...)
ipcMain.handle('artisan:barf-query', ...)
ipcMain.handle('artisan:render-foam', ...)
ipcMain.handle('artisan:export-json', ...)
ipcMain.handle('artisan:import-json', ...)
```

### UI Location
- New scope pill: ARTISAN (or sub-scope of DOC)
- Foam visualization in paneB (3D toroidal mesh)
- Torus list in left shelf
- Blend controls in right shelf

### Toolbar Section (tb-artisan)
- Craft, Torus, Blend, Query, Traverse

---

## Implementation Order

### Priority 1 (Essential)
1. **gently-artisan** - Foundation for knowledge storage
2. **gently-architect** - Idea tracking flows into artisan

### Priority 2 (High Value)
3. **gently-behavior** - Enhances all UI with predictions
4. **gently-network** - Security visualization critical for pro users

### Priority 3 (Advanced)
5. **gently-sploit** - Dev-tier security testing
6. **gently-commerce** - Pro-tier shopping integration
7. **gently-dance** - Device pairing for key reconstruction

---

## File Summary

### New Files (7 clients)
- lib/behavior-client.js (~250 lines)
- lib/network-client.js (~350 lines)
- lib/sploit-client.js (~400 lines)
- lib/architect-client.js (~350 lines)
- lib/commerce-client.js (~400 lines)
- lib/dance-client.js (~300 lines)
- lib/artisan-client.js (~350 lines)

**Total new client code: ~2,400 lines**

### Modified Files
- lib/tier-gate.js (+45 lines for new features)
- main.js (+100 IPC handlers, ~800 lines)
- preload.js (+7 namespaces, ~120 lines)
- shell.js (+7 modules, ~1,400 lines)
- shell.html (+4 modals, +3 scope views, ~400 lines)
- styles/shell.css (+7 scope styles, ~600 lines)

**Total modifications: ~3,365 lines**

### Grand Total: ~5,765 new lines

---

## Verification Checklist

For each new crate integration:

- [ ] Client library created in lib/
- [ ] IPC handlers added to main.js
- [ ] Preload API namespace added
- [ ] Tier gate features defined
- [ ] Init function in shell.js
- [ ] Modal (if applicable) in shell.html
- [ ] CSS styles in shell.css
- [ ] Toolbar section (if new scope)
- [ ] Left shelf morphing (if new scope)
- [ ] Syntax checks pass (node --check)
- [ ] CSS brace balance verified
- [ ] Tier gating tested at each level
