# GentlyOS + Electron App Integration Plan v2

## Guiding Principle

**Build INTO the existing UX, not around it.**

Every feature slots into existing shelf buttons, toolbar sections, pane views, or extends current patterns. No layout changes. No new grid rows. No additional chrome.

---

## Tier Structure (Updated)

| Tier | Price | Target User | Key Features |
|------|-------|-------------|--------------|
| **FREE** | $0 | Curious | Basic chat, feed browse, doc read, build view |
| **BASIC** | $9/mo | Hobbyist | Clans, collapse, feed fork, build edit, G.E.D. |
| **PRO** | $29/mo | Creator | MCP, Porkbun DNS, IPFS, doc-chain, visual-svg |
| **DEV** | $99/mo | Builder | Huggingface, Ollama, Kaggle, agents, Alexandria |
| **ENTERPRISE** | Custom | Business | Team clans, audit logs, SSO, custom domains |

---

## Feature Requirements Matrix (Updated)

### CHAT Scope

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| chat.basic | free | - | - | - | i-msg |
| chat.guarddog | free | - | - | - | i-shield |
| chat.clans | basic | - | - | - | i-layers |
| chat.collapse | basic | - | - | - | i-fork |
| chat.mcp | pro | - | YES | - | i-term |
| chat.local-llm | pro | 50+ | - | - | i-gpu |
| chat.ollama | dev | 25+ | - | - | i-gpu |
| chat.huggingface | dev | - | - | HF_TOKEN | i-globe |
| chat.agents | dev | 100+ | YES | - | i-code |
| chat.team | enterprise | - | - | - | i-layers |

### FEED Scope

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| feed.browse | free | - | - | - | i-feed |
| feed.fork | basic | - | - | - | i-fork |
| feed.post | pro | - | - | - | i-share |
| feed.ipfs | pro | - | YES | - | i-globe |
| feed.kaggle | dev | - | - | KAGGLE_KEY | i-chart |
| feed.alexandria | dev | - | YES | - | i-book |
| feed.audit | enterprise | - | YES | - | i-shield |

### BUILD Scope

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| build.view | free | - | - | - | i-file |
| build.edit | basic | - | - | - | i-code |
| build.doc-chain | pro | - | - | - | i-chain |
| build.visual-svg | pro | 25+ | - | - | i-palette |
| build.goo-field | dev | 50+ | YES | - | i-chart |
| build.gooey | dev | - | YES | - | i-diamond |
| build.deploy | enterprise | - | - | - | i-share |

### DOC Scope

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| doc.read | free | - | - | - | i-book |
| doc.ged | basic | - | YES | - | i-globe |
| doc.edit | pro | - | - | - | i-edit |
| doc.search | dev | - | YES | - | i-search |
| doc.three-chain | dev | - | YES | - | i-chain |
| doc.versioning | enterprise | - | - | - | i-git |

### DOMAIN Scope (New - Pro+)

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| domain.browse | pro | - | - | PORKBUN_KEY | i-globe |
| domain.dns | pro | - | - | PORKBUN_KEY | i-chain |
| domain.ssl | pro | - | - | PORKBUN_KEY | i-lock |
| domain.redirect | pro | - | - | PORKBUN_KEY | i-arrow |
| domain.team | enterprise | - | - | PORKBUN_KEY | i-layers |

### AI Scope (New - Dev+)

| Feature | Tier | HW Score | Bridge | API Key | Icon |
|---------|------|----------|--------|---------|------|
| ai.huggingface | dev | - | - | HF_TOKEN | i-globe |
| ai.ollama | dev | 25+ | - | - | i-gpu |
| ai.kaggle | dev | - | - | KAGGLE_KEY | i-chart |
| ai.inference | dev | 50+ | YES | - | i-code |
| ai.finetune | enterprise | 100+ | YES | HF_TOKEN | i-morph |

---

## Slot Mapping (Where Features Go)

### Left Shelf (Max 6 Buttons + Divider)

**Per-Scope Configuration:**

```
CHAT (--focus cyan):
  [1] i-layers    chat.clans       basic
  [2] i-msg       chat.basic       free
  [3] i-shield    chat.guarddog    free
  [4] i-gpu       chat.ollama      dev
  ---
  [5] i-chart     analytics        free

FEED (--feed blue):
  [1] i-feed      feed.browse      free
  [2] i-fork      feed.fork        basic
  [3] i-globe     feed.ipfs        pro
  [4] i-chart     feed.kaggle      dev
  ---
  [5] i-book      feed.alexandria  dev

BUILD (--build pink):
  [1] i-file      build.view       free
  [2] i-code      build.edit       basic
  [3] i-chain     build.doc-chain  pro
  [4] i-palette   build.visual-svg pro
  ---
  [5] i-diamond   build.gooey      dev

DOC (--doc teal):
  [1] i-book      doc.read         free
  [2] i-globe     doc.ged          basic
  [3] i-edit      doc.edit         pro
  [4] i-search    doc.search       dev
  ---
  [5] i-chain     doc.three-chain  dev
```

### Right Shelf (Fixed Structure)

```
[1] i-inject + dot   Forge/inject system
[2] i-pin            Pinned items
[3] i-key            API keys (new)
---
[4] i-shield         Security/vault
---
[5] i-term           CLI/MCP access
```

**New: API Keys Button (#3)**
- Opens modal for managing API keys (Porkbun, HF, Kaggle)
- Dot indicator: green if all required keys present, yellow if partial, hidden if none needed

### Bottom Toolbar Sections

**Core (Always Visible):**
```
[Diamond] Shell
[i-term]  Term
[i-git]   Git
[i-gpu]   GPU
[i-shield] Vault
```

**Chat Section (#tb-chat):**
```
[i-layers] Clans      (basic)
[i-morph]  Gates      (free)
[i-fork]   Collapse   (basic)
[i-gpu]    Ollama     (dev)     <- NEW
[i-globe]  HF         (dev)     <- NEW
```

**Feed Section (#tb-feed):**
```
[i-feed]   Browse     (free)
[i-fork]   Fork       (basic)
[i-share]  Post       (pro)
[i-chain]  Chain      (free)
[i-star]   Saved      (free)
[i-chart]  Kaggle     (dev)     <- NEW
```

**Build Section (#tb-build):**
```
[i-code]    Editor    (basic)
[i-play]    Preview   (free)
[i-save]    Save      (basic)
[i-pin]     Pin       (free)
[i-share]   Publish   (pro)
[i-palette] SVG       (pro)     <- NEW
[i-diamond] GOO       (dev)     <- NEW
```

**Doc Section (#tb-doc):**
```
[i-book]   Docs       (free)
[i-edit]   Edit       (pro)
[i-git]    Version    (enterprise)
[i-search] Search     (dev)     <- NEW
[i-chain]  3-Chain    (dev)     <- NEW
```

**Domain Section (#tb-domain) - NEW (Pro+):**
```
[i-globe]  Domains    (pro)
[i-chain]  DNS        (pro)
[i-lock]   SSL        (pro)
[i-arrow]  Redirect   (pro)
```

**AI Section (#tb-ai) - NEW (Dev+):**
```
[i-globe]  HuggingFace (dev)
[i-gpu]    Ollama      (dev)
[i-chart]  Kaggle      (dev)
[i-code]   Inference   (dev)
```

---

## Pane B Views (Scope Content)

### Existing Views (Enhanced)

**view-chat** - Process pane (WebContentsView)
- No changes needed, claude.ai embeds here

**view-feed** - Feed browser
- ENHANCE: Real Living Feed from `gently feed show --json`
- ADD: Kaggle dataset cards (dev tier)
- ADD: IPFS pin indicators (pro tier)

**view-build** - Code editor
- ENHANCE: Three tabs become dynamic based on project
- ADD: GOO field preview panel (dev tier, split view)
- ADD: SVG visual editor (pro tier)

**view-doc** - Documentation
- ENHANCE: Render actual docs from `gently doc list`
- ADD: G.E.D. translation panel (basic tier)
- ADD: Search results panel (dev tier)

### New Views

**view-domain** (Pro+)
```html
<div class="scope-view" id="view-domain">
  <div class="domain-list" id="domainList">
    <!-- Domain cards from Porkbun API -->
  </div>
  <div class="domain-detail" id="domainDetail">
    <!-- DNS records, SSL status, redirects -->
  </div>
</div>
```

**view-ai** (Dev+)
```html
<div class="scope-view" id="view-ai">
  <div class="ai-providers" id="aiProviders">
    <div class="ai-card" data-provider="huggingface">...</div>
    <div class="ai-card" data-provider="ollama">...</div>
    <div class="ai-card" data-provider="kaggle">...</div>
  </div>
  <div class="ai-output" id="aiOutput">
    <!-- Model inference output -->
  </div>
</div>
```

---

## Integration Points (Rust -> Electron)

### Living Feed Integration

**Location:** view-feed, left shelf, bottom toolbar

**Data Flow:**
```
gently feed show --json
  |
  v
main.js: ipcMain.handle('feed:list')
  |
  v
preload.js: window.gently.feed.list()
  |
  v
shell.js: renderLivingFeed(items)
  |
  v
#feedList DOM update
```

**Feed Item Card (Enhanced):**
```html
<div class="feed-post" data-id="{uuid}" data-state="{Hot|Active|Cooling|Frozen}">
  <div class="fp-head">
    <div class="fp-charge-bar" style="width:{charge*100}%"></div>
    <div class="fp-icon"><span class="i"><svg><use href="#{icon}"/></svg></span></div>
    <span class="fp-title"><b>{name}</b></span>
    <span class="fp-meta">{kind} | {state}</span>
  </div>
  <div class="fp-desc">{last snapshot}</div>
  <div class="fp-steps">
    {steps.map(s => `<div class="fp-step ${s.completed?'done':''}">${s.content}</div>`)}
  </div>
  <div class="fp-actions">
    <button class="fp-btn pri" data-action="boost">Boost</button>
    <button class="fp-btn" data-action="step">+ Step</button>
    <button class="fp-btn" data-action="pin">{pinned?'Unpin':'Pin'}</button>
  </div>
</div>
```

### GOO Field Integration

**Location:** view-build (split panel), visual indicator in left shelf

**Data Flow:**
```
gently goo sample --json
  |
  v
main.js: ipcMain.handle('goo:sample')
  |
  v
preload.js: window.gently.goo.sample()
  |
  v
shell.js: renderGooField(regions)
  |
  v
<canvas id="gooCanvas"> or <svg id="gooSvg">
```

**GOO Panel (Build scope):**
```html
<div class="goo-panel" id="gooPanel" style="display:none">
  <div class="goo-header">
    <span>GOO Field</span>
    <button class="goo-toggle">Collapse</button>
  </div>
  <canvas id="gooCanvas" width="400" height="300"></canvas>
  <div class="goo-controls">
    <input type="range" id="gooBlend" min="0" max="100" value="50">
    <span>Blend: <span id="gooBlendValue">0.5</span></span>
  </div>
</div>
```

### G.E.D. Integration

**Location:** view-doc (translation panel), doc toolbar

**Data Flow:**
```
gently ged translate "{concept}" --domain "{user_domain}"
  |
  v
main.js: ipcMain.handle('ged:translate')
  |
  v
preload.js: window.gently.ged.translate(concept, domain)
  |
  v
shell.js: showGedTranslation(result)
  |
  v
#gedPanel DOM update
```

**G.E.D. Panel (Doc scope):**
```html
<div class="ged-panel" id="gedPanel" style="display:none">
  <div class="ged-header">G.E.D. Translation</div>
  <div class="ged-source">
    <label>Concept:</label>
    <input type="text" id="gedConcept" placeholder="e.g., recursion">
  </div>
  <div class="ged-domain">
    <label>Your Domain:</label>
    <select id="gedDomain">
      <option value="gaming">Gaming</option>
      <option value="cooking">Cooking</option>
      <option value="music">Music</option>
      <option value="sports">Sports</option>
    </select>
  </div>
  <button class="ged-translate" id="gedTranslateBtn">Translate</button>
  <div class="ged-result" id="gedResult"></div>
</div>
```

### Alexandria Search Integration

**Location:** view-doc (search results), doc toolbar

**Data Flow:**
```
gently search query "{query}" --json
  |
  v
main.js: ipcMain.handle('search:query')
  |
  v
preload.js: window.gently.search.query(q)
  |
  v
shell.js: showSearchResults(thoughts)
  |
  v
#searchResults DOM update
```

### Three-Chain Document Integration

**Location:** view-doc, doc toolbar

**Data Flow:**
```
gently doc list --json
gently doc new "{name}" --type three-chain
gently doc action "{id}" "{action}"
  |
  v
main.js: doc:* handlers
  |
  v
preload.js: window.gently.doc.*
  |
  v
shell.js: renderDocument(doc)
```

**Three-Chain View:**
```html
<div class="three-chain" id="threeChain" style="display:none">
  <div class="chain-col user-chain">
    <div class="chain-label">Your Chain</div>
    <div class="chain-steps" id="userChainSteps"></div>
  </div>
  <div class="chain-col claude-chain">
    <div class="chain-label">Claude Chain</div>
    <div class="chain-steps" id="claudeChainSteps"></div>
  </div>
  <div class="chain-col result-chain">
    <div class="chain-label">Result Chain</div>
    <div class="chain-steps" id="resultChainSteps"></div>
  </div>
</div>
```

---

## API Integrations (External Services)

### Porkbun API (Pro Tier)

**Required Key:** `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY`

**Features:**
- Domain list with status
- DNS record management
- SSL certificate status
- URL forwarding/redirects

**IPC Handlers (main.js):**
```javascript
ipcMain.handle('porkbun:domains', async () => {
  // GET https://porkbun.com/api/json/v3/domain/listAll
});

ipcMain.handle('porkbun:dns-list', async (_, { domain }) => {
  // GET https://porkbun.com/api/json/v3/dns/retrieve/{domain}
});

ipcMain.handle('porkbun:dns-create', async (_, { domain, record }) => {
  // POST https://porkbun.com/api/json/v3/dns/create/{domain}
});

ipcMain.handle('porkbun:ssl-status', async (_, { domain }) => {
  // GET https://porkbun.com/api/json/v3/ssl/retrieve/{domain}
});
```

### Huggingface API (Dev Tier)

**Required Key:** `HF_TOKEN`

**Features:**
- Model search and info
- Inference API calls
- Dataset browser
- Space deployment

**IPC Handlers (main.js):**
```javascript
ipcMain.handle('hf:models', async (_, { query, task }) => {
  // GET https://huggingface.co/api/models?search={query}&pipeline_tag={task}
});

ipcMain.handle('hf:inference', async (_, { model, inputs }) => {
  // POST https://api-inference.huggingface.co/models/{model}
});

ipcMain.handle('hf:datasets', async (_, { query }) => {
  // GET https://huggingface.co/api/datasets?search={query}
});
```

### Ollama API (Dev Tier)

**Required:** Local Ollama installation

**Features:**
- Model list (local)
- Chat completions
- Model pull/delete

**IPC Handlers (main.js):**
```javascript
ipcMain.handle('ollama:models', async () => {
  // GET http://localhost:11434/api/tags
});

ipcMain.handle('ollama:chat', async (_, { model, messages }) => {
  // POST http://localhost:11434/api/chat
});

ipcMain.handle('ollama:pull', async (_, { model }) => {
  // POST http://localhost:11434/api/pull
});
```

### Kaggle API (Dev Tier)

**Required Key:** `KAGGLE_USERNAME`, `KAGGLE_KEY`

**Features:**
- Dataset search and download
- Competition browser
- Notebook execution

**IPC Handlers (main.js):**
```javascript
ipcMain.handle('kaggle:datasets', async (_, { query }) => {
  // kaggle CLI or API
});

ipcMain.handle('kaggle:download', async (_, { dataset, path }) => {
  // kaggle datasets download -d {dataset} -p {path}
});

ipcMain.handle('kaggle:competitions', async () => {
  // kaggle competitions list
});
```

---

## New Scope: Domain (Pro+)

**Scope Color:** `--domain: #ffa500` (Orange)

**Scope Pill:** Insert between Build and Doc
```html
<button class="scope-pill" style="--scope-color:var(--domain)" data-scope="domain">
  <span class="i" style="width:8px;height:8px">
    <svg style="width:6px;height:6px"><use href="#i-globe"/></svg>
  </span> Domain
</button>
```

**Toolbar Section:**
```html
<div class="tb-section" id="tb-domain">
  <div class="tb" id="tb-domains"><span class="i" style="color:var(--domain)"><svg><use href="#i-globe"/></svg></span><span class="tb-name">Domains</span></div>
  <div class="tb" id="tb-dns"><span class="i"><svg><use href="#i-chain"/></svg></span><span class="tb-name">DNS</span></div>
  <div class="tb" id="tb-ssl"><span class="i"><svg><use href="#i-lock"/></svg></span><span class="tb-name">SSL</span></div>
  <div class="tb" id="tb-redirect"><span class="i"><svg><use href="#i-arrow"/></svg></span><span class="tb-name">Redirect</span></div>
</div>
```

**Pane B View:**
```html
<div class="scope-view" id="view-domain">
  <div class="domain-toolbar">
    <input type="text" id="domainSearch" placeholder="Search domains...">
    <button class="domain-refresh" id="domainRefresh">Refresh</button>
  </div>
  <div class="domain-list" id="domainList">
    <!-- Domain cards rendered here -->
  </div>
  <div class="domain-detail" id="domainDetail" style="display:none">
    <!-- DNS records, SSL, redirects -->
  </div>
</div>
```

---

## New Scope: AI (Dev+)

**Scope Color:** `--ai: #9b59b6` (Purple)

**Scope Pill:** Insert after Domain
```html
<button class="scope-pill" style="--scope-color:var(--ai)" data-scope="ai">
  <span class="i" style="width:8px;height:8px">
    <svg style="width:6px;height:6px"><use href="#i-gpu"/></svg>
  </span> AI
</button>
```

**Toolbar Section:**
```html
<div class="tb-section" id="tb-ai">
  <div class="tb" id="tb-hf"><span class="i" style="color:var(--ai)"><svg><use href="#i-globe"/></svg></span><span class="tb-name">HF</span></div>
  <div class="tb" id="tb-ollama"><span class="i"><svg><use href="#i-gpu"/></svg></span><span class="tb-name">Ollama</span></div>
  <div class="tb" id="tb-kaggle"><span class="i"><svg><use href="#i-chart"/></svg></span><span class="tb-name">Kaggle</span></div>
  <div class="tb" id="tb-inference"><span class="i"><svg><use href="#i-code"/></svg></span><span class="tb-name">Run</span></div>
</div>
```

**Pane B View:**
```html
<div class="scope-view" id="view-ai">
  <div class="ai-tabs">
    <button class="ai-tab on" data-provider="huggingface">HuggingFace</button>
    <button class="ai-tab" data-provider="ollama">Ollama</button>
    <button class="ai-tab" data-provider="kaggle">Kaggle</button>
  </div>
  <div class="ai-provider-view" id="ai-huggingface">
    <div class="ai-search">
      <input type="text" id="hfSearch" placeholder="Search models...">
      <select id="hfTask">
        <option value="">All tasks</option>
        <option value="text-generation">Text Generation</option>
        <option value="image-classification">Image Classification</option>
      </select>
    </div>
    <div class="ai-models" id="hfModels"></div>
  </div>
  <div class="ai-provider-view" id="ai-ollama" style="display:none">
    <div class="ai-local-models" id="ollamaModels"></div>
    <div class="ai-chat" id="ollamaChat"></div>
  </div>
  <div class="ai-provider-view" id="ai-kaggle" style="display:none">
    <div class="ai-datasets" id="kaggleDatasets"></div>
    <div class="ai-competitions" id="kaggleCompetitions"></div>
  </div>
</div>
```

---

## Enterprise Features

### Team Clans
- Multiple users in same clan
- Real-time collaboration indicators
- Permission levels (owner, editor, viewer)
- Activity audit log

### Custom Domains
- Connect Porkbun domain to Gently instance
- SSL auto-provisioning
- Custom branding

### SSO Integration
- SAML/OIDC support
- Google Workspace
- Microsoft Entra ID
- Okta

### Audit Logging
- All actions logged with timestamps
- User attribution
- Export to SIEM
- Retention policies

---

## Implementation Phases

### Phase 1: Foundation (Current - Complete)
- [x] Tier system (tier-gate.js)
- [x] Rotation state (rotation-state.js)
- [x] Bridge client (bridge-client.js)
- [x] CLI bridge (cli-bridge.js)
- [x] IPC handlers in main.js
- [x] Preload API exposure
- [x] Tier badge UI
- [x] Left shelf morphing

### Phase 2: Living Feed (Next)
- [ ] Real feed data from `gently feed show`
- [ ] Feed item charge/decay display
- [ ] Boost/step actions
- [ ] State indicators (Hot/Active/Cooling/Frozen)
- [ ] Pin functionality

### Phase 3: Document System
- [ ] G.E.D. translation panel
- [ ] Three-chain document view
- [ ] Alexandria search integration
- [ ] Doc versioning (enterprise)

### Phase 4: Build Enhancements
- [ ] GOO field preview panel
- [ ] Visual SVG editor
- [ ] Gooey app builder integration

### Phase 5: External APIs (Pro)
- [ ] Porkbun API integration
- [ ] Domain scope and views
- [ ] DNS/SSL/Redirect management

### Phase 6: AI Providers (Dev)
- [ ] Huggingface API integration
- [ ] Ollama local model support
- [ ] Kaggle dataset/competition browser
- [ ] AI scope and views

### Phase 7: Enterprise
- [ ] Team clan system
- [ ] SSO integration
- [ ] Audit logging
- [ ] Custom domain binding

---

## File Changes Summary

### New Files to Create

```
lib/
  porkbun-client.js    # Porkbun API wrapper
  huggingface-client.js # HF API wrapper
  ollama-client.js     # Ollama API wrapper
  kaggle-client.js     # Kaggle API wrapper
  api-keys.js          # API key storage/validation

renderer/
  feed-renderer.js     # Living Feed rendering
  goo-renderer.js      # GOO field canvas/SVG
  ged-panel.js         # G.E.D. translation UI
  domain-view.js       # Domain management UI
  ai-view.js           # AI providers UI
  three-chain.js       # Document chain UI
```

### Files to Modify

```
main.js
  + External API IPC handlers (porkbun, hf, ollama, kaggle)
  + API key management handlers
  + Living feed handlers
  + GOO field handlers

preload.js
  + window.gently.porkbun.*
  + window.gently.hf.*
  + window.gently.ollama.*
  + window.gently.kaggle.*
  + window.gently.apiKeys.*

lib/tier-gate.js
  + New feature requirements
  + API key requirements
  + New scopes (domain, ai)

shell.html
  + Domain scope pill (conditional)
  + AI scope pill (conditional)
  + view-domain
  + view-ai
  + tb-domain section
  + tb-ai section
  + API keys button in right shelf
  + GED panel in view-doc
  + GOO panel in view-build
  + Three-chain in view-doc

shell.css
  + --domain color
  + --ai color
  + .domain-* styles
  + .ai-* styles
  + .ged-* styles
  + .goo-* styles
  + .three-chain styles
  + .charge-bar styles

renderer/shell.js
  + Domain scope handling
  + AI scope handling
  + Living feed rendering
  + GOO field rendering
  + G.E.D. panel logic
  + Three-chain document logic
  + API key modal
```

---

## Testing Checklist

### Tier Rotation
- [ ] Free tier: Only free features visible
- [ ] Basic tier: basic + free features
- [ ] Pro tier: pro + basic + free
- [ ] Dev tier: all features except enterprise
- [ ] Enterprise: all features
- [ ] Hardware downgrade: Features hide appropriately
- [ ] Bridge offline: Bridge-required features hide

### API Integrations
- [ ] Porkbun: List domains, manage DNS, check SSL
- [ ] Huggingface: Search models, run inference
- [ ] Ollama: List local models, chat
- [ ] Kaggle: Search datasets, view competitions

### UI Consistency
- [ ] All new buttons follow 36x32 / 16x16 sizing
- [ ] Colors use existing CSS variables
- [ ] Transitions use 100-200ms timing
- [ ] No layout shift on scope change
- [ ] No visual regressions in existing scopes

---

## Commands Reference

```bash
# Development
cd /home/deck/Desktop/Gently-nix/app
npm start                      # Free tier
GENTLY_TIER=basic npm start   # Basic tier
GENTLY_TIER=pro npm start     # Pro tier
GENTLY_TIER=dev npm start     # Dev tier
GENTLY_TIER=enterprise npm start # Enterprise

# Build GentlyOS
cd /home/deck/Desktop/Gently-nix/GentlyOS
cargo build --release -p gently-cli

# Start Bridge
./target/release/gently bridge

# Test Living Feed
./target/release/gently feed show --json

# Test Search
./target/release/gently search query "test" --json

# Test G.E.D.
./target/release/gently ged translate "recursion" --domain gaming
```
