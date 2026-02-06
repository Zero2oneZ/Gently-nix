// GentlyOS Shell Renderer - Crystallized
// Integrates with Electron main process via preload bridge
// Tier-based code-locked rotation system

// ========== STATE ==========
let currentScope = 'chat';
let windowData = null;
let projectId = null;
let selectedClans = new Set();
let genesisId = '0x0000';

// Tier state
let currentTier = 'free';
let hardwareScore = 0;
let bridgeOnline = false;
let scopeFeatures = {};

// Scope definitions
const scopes = {
  chat: {
    color: '--focus',
    label: 'CHAT',
    paneBView: 'view-chat',
    stamp: '[OLO|general|0|OPEN|#0000]'
  },
  feed: {
    color: '--feed',
    label: 'FEED',
    paneBView: 'view-feed',
    stamp: '[OLO|feed|browse|OPEN|#feed]'
  },
  build: {
    color: '--build',
    label: 'BUILD',
    paneBView: 'view-build',
    stamp: '[OLO|build|app.html|OPEN|#b1d0]'
  },
  doc: {
    color: '--doc',
    label: 'DOC',
    paneBView: 'view-doc',
    stamp: '[OLO|doc|index|v1.0|#d0c5]'
  }
};

// ========== INITIALIZATION ==========
async function init() {
  console.log('[Gently] Shell initializing...');

  // Window controls
  document.getElementById('btn-min').onclick = () => window.gently?.minimize();
  document.getElementById('btn-max').onclick = () => window.gently?.maximize();
  document.getElementById('btn-close').onclick = () => window.gently?.close();

  // Scope pills
  document.querySelectorAll('.scope-pill').forEach(pill => {
    pill.onclick = (e) => setScope(pill.dataset.scope, e);
  });

  // Pane B close
  document.getElementById('paneB-close').onclick = closePaneB;

  // Stamp copy
  document.getElementById('stamp-copy').onclick = copyStamp;

  // Listen for data from main process
  if (window.gently) {
    window.gently.onWindowData((data) => {
      windowData = data;
      projectId = data.projectId;
      if (data.genesisId) {
        genesisId = data.genesisId;
        document.getElementById('genesis-id').textContent = genesisId;
      }
      updateStamp();
    });

    window.gently.onConstantsLoaded((constants) => {
      console.log('[Gently] Constants loaded:', constants.length);
    });

    window.gently.onCLIOutput((output) => {
      console.log('[CLI]', output);
    });

    // Tier system events
    window.gently.tier.onFeaturesChanged((data) => {
      console.log('[Gently] Features changed:', data.changes);
      scopeFeatures = data.features;
      // Re-morph current scope shelves and toolbar
      morphLeftShelf(currentScope);
      morphToolbar(currentScope);
    });

    // Bridge status events
    window.gently.bridge.onStatusChange((data) => {
      bridgeOnline = data.online;
      updateBridgeIndicator(data.online);
      console.log('[Gently] Bridge status:', data.online ? 'ONLINE' : 'OFFLINE');
    });

    // Initialize tier state
    await initRotation();
  }

  // Initialize feed filter buttons
  initFeedFilters();

  // Initialize doc scope
  initDocScope();

  // Initialize build scope
  initBuildScope();

  // Initialize integrations (Pro tier)
  initIntegrations();

  // Initialize AI providers (Dev tier)
  initAIProviders();

  // Initialize Phase 7: MCP, IPFS, Agents
  initMCP();
  initIPFS();
  initAgents();

  // Initialize with chat scope
  setScope('chat');

  console.log('[Gently] Shell ready');
}

// ========== TIER ROTATION ==========
async function initRotation() {
  try {
    const tierInfo = await window.gently.tier.getEffective();
    currentTier = tierInfo.tier;
    hardwareScore = tierInfo.hardwareScore;
    bridgeOnline = tierInfo.bridgeOnline;

    // Update tier badge
    updateTierBadge(currentTier, hardwareScore);
    updateBridgeIndicator(bridgeOnline);

    // Pre-fetch all scope features
    scopeFeatures = await window.gently.tier.getAllFeatures();
    console.log('[Gently] Tier initialized:', tierInfo);
    console.log('[Gently] Available features:', scopeFeatures);
  } catch (err) {
    console.error('[Gently] Failed to initialize tier:', err);
  }
}

function updateTierBadge(tier, score) {
  const badge = document.getElementById('tier-badge');
  if (!badge) return;

  badge.dataset.tier = tier;
  badge.querySelector('.tier-label').textContent = tier.toUpperCase();
  badge.querySelector('.hw-score').textContent = `HW:${score}`;
}

function updateBridgeIndicator(online) {
  const dot = document.getElementById('bridge-dot');
  if (!dot) return;

  if (online) {
    dot.classList.add('online');
    dot.title = 'Bridge: Online';
  } else {
    dot.classList.remove('online');
    dot.title = 'Bridge: Offline';
  }
}

// ========== SCOPE SWITCHING ==========
function setScope(scope, event) {
  currentScope = scope;
  const s = scopes[scope];
  const shell = document.getElementById('shell');
  shell.dataset.scope = scope;

  // Update scope pills
  document.querySelectorAll('.scope-pill').forEach(p => p.classList.remove('on'));
  const pill = document.querySelector(`.scope-pill[data-scope="${scope}"]`);
  if (pill) pill.classList.add('on');

  // Face badge
  const c = getComputedStyle(document.documentElement).getPropertyValue(s.color).trim();
  const badge = document.getElementById('face-badge');
  badge.style.borderColor = c;
  badge.style.color = c;
  document.getElementById('scope-label').textContent = s.label;

  // Pane B header
  const dot = document.getElementById('paneBDot');
  const lbl = document.getElementById('paneBLabel');
  if (scope === 'chat') {
    dot.style.background = getComputedStyle(document.documentElement).getPropertyValue('--process').trim();
    lbl.style.color = dot.style.background;
    lbl.textContent = 'PROCESS';
  } else {
    dot.style.background = c;
    lbl.style.color = c;
    lbl.textContent = s.label;
  }

  // Scope views
  document.querySelectorAll('.scope-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(s.paneBView);
  if (view) view.classList.add('active');

  // Toolbar sections
  document.querySelectorAll('.tb-section').forEach(sec => sec.classList.remove('active'));
  const tbSec = document.getElementById('tb-' + scope);
  if (tbSec) tbSec.classList.add('active');

  // Inject target
  const it = document.getElementById('injectTarget');
  if (scope !== 'chat') {
    it.style.display = 'flex';
    it.querySelector('.inject-arrow').style.color = c;
    document.getElementById('injectLabel').textContent = s.label;
    document.getElementById('injectLabel').style.color = c;
  } else {
    it.style.display = 'none';
  }

  // Stamp
  document.getElementById('stampText').textContent = s.stamp;
  document.getElementById('stampText').style.color = c;

  // Chat context
  document.getElementById('chatCtx').textContent = scope === 'chat' ? 'claude.ai' : scope + ' context';

  // Morph shelves and toolbar based on available features
  morphLeftShelf(scope);
  morphToolbar(scope);

  // Load scope-specific content and manage refresh intervals
  if (scope === 'feed') {
    renderFeed();
    startFeedRefresh();
  } else {
    stopFeedRefresh();
  }

  // Load doc content when switching to doc scope
  if (scope === 'doc') {
    switchDocTab(currentDocTab);
  }

  // Load build content when switching to build scope
  if (scope === 'build') {
    switchBuildMode(currentBuildMode);
  }
}

// ========== LEFT SHELF MORPHING (Tier-Based) ==========
// Feature to icon mapping
const featureIcons = {
  // Chat
  'chat.basic': 'i-msg',
  'chat.guarddog': 'i-shield',
  'chat.clans': 'i-layers',
  'chat.collapse': 'i-fork',
  'chat.mcp': 'i-term',
  'chat.local-llm': 'i-gpu',
  'chat.agents': 'i-code',
  // Feed
  'feed.browse': 'i-feed',
  'feed.fork': 'i-fork',
  'feed.post': 'i-share',
  'feed.ipfs': 'i-globe',
  'feed.alexandria': 'i-book',
  // Build
  'build.view': 'i-file',
  'build.edit': 'i-code',
  'build.doc-chain': 'i-chain',
  'build.visual-svg': 'i-palette',
  'build.goo-field': 'i-chart',
  // Doc
  'doc.read': 'i-book',
  'doc.ged': 'i-globe',
  'doc.edit': 'i-edit',
  'doc.search': 'i-search',
};

async function morphLeftShelf(scope) {
  const shelf = document.getElementById('shelf-l');
  const buttons = shelf.querySelectorAll('.rb');

  // Get available features for this scope
  let features = scopeFeatures[scope];
  if (!features && window.gently) {
    features = await window.gently.tier.getScopeFeatures(scope);
    scopeFeatures[scope] = features;
  }
  features = features || [];

  // Get scope color
  const scopeColor = getComputedStyle(document.documentElement).getPropertyValue(scopes[scope].color).trim();

  // Hide all buttons first (except dividers)
  buttons.forEach((btn, i) => {
    if (!btn.classList.contains('shelf-div')) {
      btn.style.display = 'none';
      btn.classList.remove('on');
      btn.style.color = '';
      delete btn.dataset.feature;
    }
  });

  // Show only available features
  let buttonIndex = 0;
  features.forEach((f) => {
    const icon = featureIcons[f.feature];
    if (icon && buttons[buttonIndex]) {
      const btn = buttons[buttonIndex];
      const use = btn.querySelector('use');
      if (use) {
        use.setAttribute('href', '#' + icon);
      }
      btn.style.display = 'flex';
      btn.dataset.feature = f.feature;
      btn.title = f.feature.replace('.', ': ');

      // First one is active
      if (buttonIndex === 0) {
        btn.classList.add('on');
        btn.style.color = scopeColor;
      }
      buttonIndex++;
    }
  });

  console.log(`[Gently] Shelf morphed for ${scope}: ${features.length} features`);
}

// ========== TOOLBAR MORPHING (Tier-Based) ==========
async function morphToolbar(scope) {
  // Get available features for this scope
  let features = scopeFeatures[scope];
  if (!features && window.gently) {
    features = await window.gently.tier.getScopeFeatures(scope);
    scopeFeatures[scope] = features;
  }
  features = features || [];

  // Get the toolbar section
  const tbSection = document.getElementById('tb-' + scope);
  if (!tbSection) return;

  const toolbarButtons = tbSection.querySelectorAll('.tb');
  const featureSet = new Set(features.map(f => f.feature));

  // Map toolbar buttons to features
  const toolbarFeatureMap = {
    // Chat toolbar
    'tb-clans': 'chat.clans',
    'tb-gates': 'chat.basic',
    'tb-collapse': 'chat.collapse',
    // Feed toolbar
    'tb-browse': 'feed.browse',
    'tb-fork': 'feed.fork',
    'tb-post': 'feed.post',
    // Build toolbar
    'tb-editor': 'build.edit',
    'tb-preview': 'build.view',
    // Doc toolbar
    'tb-docs': 'doc.read',
    'tb-edit-doc': 'doc.edit',
  };

  // Show/hide based on features (note: we only hide if we have mapping)
  toolbarButtons.forEach(btn => {
    const feature = toolbarFeatureMap[btn.id];
    if (feature) {
      // If feature is mapped, only show if available
      btn.style.display = featureSet.has(feature) ? 'flex' : 'none';
    }
    // Buttons without mapping stay visible
  });
}

// ========== PANE B ==========
function closePaneB() {
  // In chat mode, we don't really close pane B (it's the process pane)
  // In other modes, switch back to chat
  if (currentScope !== 'chat') {
    setScope('chat');
  }
}

// ========== STAMP ==========
async function updateStamp() {
  if (!window.gently || !projectId || !windowData?.activeClan) {
    return;
  }

  try {
    const stamp = await window.gently.getStamp(projectId, windowData.activeClan);
    document.getElementById('stampText').textContent = stamp;
  } catch (err) {
    console.error('[Gently] Failed to get stamp:', err);
  }
}

function copyStamp() {
  const stamp = document.getElementById('stampText').textContent;
  navigator.clipboard.writeText(stamp).then(() => {
    const btn = document.getElementById('stamp-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

// ========== LIVING FEED ==========
let feedItems = [];
let feedFilter = 'all';
let selectedFeedId = null;

// Kind to icon mapping
const kindIcons = {
  'Project': 'i-layers',
  'Task': 'i-file',
  'Idea': 'i-star',
  'Reference': 'i-book',
  'Person': 'i-msg',
};

// Get icon for item kind
function getFeedIcon(kind) {
  return kindIcons[kind] || 'i-diamond';
}

// Format relative time
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Fetch and render Living Feed
async function renderFeed() {
  const list = document.getElementById('feedList');

  if (!window.gently) {
    list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">Feed unavailable</div></div>';
    return;
  }

  // Show loading state
  list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">Loading feed...</div></div>';

  try {
    const result = await window.gently.feed.getSorted();

    if (result.success && result.items) {
      feedItems = result.items;
      renderFeedItems();
    } else {
      list.innerHTML = `<div class="feed-empty">
        <div class="feed-empty-icon"><span class="i xl"><svg><use href="#i-feed"/></svg></span></div>
        <div class="feed-empty-text">No items in feed</div>
        <button class="feed-empty-btn" onclick="showAddFeedModal()">Add First Item</button>
      </div>`;
    }
  } catch (err) {
    console.error('[Feed] Error loading:', err);
    list.innerHTML = `<div class="feed-empty"><div class="feed-empty-text">Error loading feed</div></div>`;
  }
}

// Render feed items to DOM
function renderFeedItems() {
  const list = document.getElementById('feedList');
  list.innerHTML = '';

  // Filter items
  let items = feedItems;
  if (feedFilter !== 'all') {
    items = feedItems.filter(item => item.state === feedFilter);
  }

  if (items.length === 0) {
    list.innerHTML = `<div class="feed-empty">
      <div class="feed-empty-text">No ${feedFilter === 'all' ? '' : feedFilter.toLowerCase() + ' '}items</div>
    </div>`;
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'feed-post';
    div.dataset.id = item.id;
    div.dataset.state = item.state;
    if (selectedFeedId === item.id) div.classList.add('selected');

    const chargePercent = Math.round(item.charge * 100);
    const icon = getFeedIcon(item.kind);
    const completedSteps = item.steps.filter(s => s.completed).length;
    const totalSteps = item.steps.length;

    div.innerHTML = `
      <div class="fp-charge-wrap">
        <div class="fp-charge-bar" style="width:${chargePercent}%"></div>
      </div>
      <div class="fp-head">
        <div class="fp-icon"><span class="i" style="color:var(--feed)"><svg><use href="#${icon}"/></svg></span></div>
        <span class="fp-title"><b>${escapeHtml(item.name)}</b></span>
        <span class="fp-meta">
          ${item.pinned ? '<span class="fp-pin" title="Pinned">*</span>' : ''}
          <span class="fp-state" data-state="${item.state}">${item.state}</span>
          <span>${chargePercent}%</span>
        </span>
      </div>
      ${item.steps.length > 0 ? `
        <div class="fp-steps">
          ${item.steps.slice(0, 4).map(step => `
            <div class="fp-step ${step.completed ? 'done' : ''}" data-step-id="${step.id}">
              <div class="fp-step-check" onclick="event.stopPropagation();toggleFeedStep('${item.id}',${step.id})">
                ${step.completed ? 'x' : ''}
              </div>
              <span class="fp-step-text">${escapeHtml(step.content)}</span>
            </div>
          `).join('')}
          ${item.steps.length > 4 ? `<div class="fp-step"><span class="fp-step-text" style="color:var(--dim)">+${item.steps.length - 4} more...</span></div>` : ''}
        </div>
      ` : ''}
      <div class="fp-tags">
        <span class="fp-tag kind">${item.kind}</span>
        ${totalSteps > 0 ? `<span class="fp-tag">${completedSteps}/${totalSteps} steps</span>` : ''}
        ${item.pinned ? '<span class="fp-tag pinned">pinned</span>' : ''}
        <span class="fp-tag">${formatRelativeTime(item.lastMentionedAt || item.createdAt)}</span>
      </div>
      <div class="fp-actions">
        <button class="fp-btn pri" onclick="event.stopPropagation();injectToEdit('${item.id}')">
          <span class="i" style="width:8px;height:8px"><svg style="width:6px;height:6px"><use href="#i-inject"/></svg></span> Edit
        </button>
        <button class="fp-btn boost" onclick="event.stopPropagation();boostFeedItem('${item.id}')">
          <span class="i" style="width:8px;height:8px"><svg style="width:6px;height:6px"><use href="#i-arrow"/></svg></span> Boost
        </button>
        <button class="fp-btn" onclick="event.stopPropagation();showAddStepInput('${item.id}')">
          <span class="i" style="width:8px;height:8px"><svg style="width:6px;height:6px"><use href="#i-plus"/></svg></span> Step
        </button>
        <button class="fp-btn" onclick="event.stopPropagation();toggleFeedPin('${item.id}')">
          <span class="i" style="width:8px;height:8px"><svg style="width:6px;height:6px"><use href="#i-pin"/></svg></span> ${item.pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
      <div class="fp-add-step" id="add-step-${item.id}">
        <input type="text" placeholder="New step..." onkeydown="if(event.key==='Enter')addFeedStep('${item.id}',this.value)">
        <button onclick="addFeedStep('${item.id}',this.previousElementSibling.value)">Add</button>
      </div>
    `;

    div.onclick = () => selectFeedPost(item.id);
    list.appendChild(div);
  });
}

// Select a feed post
function selectFeedPost(itemId) {
  selectedFeedId = itemId;
  document.querySelectorAll('.feed-post').forEach(p => {
    p.classList.toggle('selected', p.dataset.id === itemId);
  });
}

// Boost item charge
async function boostFeedItem(itemId) {
  if (!window.gently) return;

  const btn = document.querySelector(`.feed-post[data-id="${itemId}"] .fp-btn.boost`);
  if (btn) {
    btn.textContent = 'Boosting...';
    btn.disabled = true;
  }

  try {
    await window.gently.feed.boost(itemId, 0.15);
    // Refresh feed
    await renderFeed();
  } catch (err) {
    console.error('[Feed] Boost error:', err);
  }
}

// Toggle step completion
async function toggleFeedStep(itemId, stepId) {
  if (!window.gently) return;

  try {
    await window.gently.feed.completeStep(itemId, stepId);
    await renderFeed();
  } catch (err) {
    console.error('[Feed] Toggle step error:', err);
  }
}

// Toggle pin status
async function toggleFeedPin(itemId) {
  if (!window.gently) return;

  try {
    await window.gently.feed.togglePin(itemId);
    await renderFeed();
  } catch (err) {
    console.error('[Feed] Toggle pin error:', err);
  }
}

// Show add step input
function showAddStepInput(itemId) {
  // Hide all other inputs
  document.querySelectorAll('.fp-add-step').forEach(el => el.classList.remove('show'));
  // Show this one
  const input = document.getElementById(`add-step-${itemId}`);
  if (input) {
    input.classList.add('show');
    input.querySelector('input').focus();
  }
}

// Add step to item
async function addFeedStep(itemId, content) {
  if (!window.gently || !content.trim()) return;

  try {
    await window.gently.feed.addStep(itemId, content.trim());
    await renderFeed();
  } catch (err) {
    console.error('[Feed] Add step error:', err);
  }
}

// Show add feed item modal
function showAddFeedModal() {
  const name = prompt('Item name:');
  if (!name) return;

  const kind = prompt('Kind (Project/Task/Idea/Reference/Person):', 'Task');
  if (!kind) return;

  addFeedItem(name, kind);
}

// Add new feed item
async function addFeedItem(name, kind) {
  if (!window.gently) return;

  try {
    await window.gently.feed.add(name, kind, '');
    await renderFeed();
  } catch (err) {
    console.error('[Feed] Add item error:', err);
  }
}

// Filter feed items
function setFeedFilter(filter) {
  feedFilter = filter;

  // Update filter buttons
  document.querySelectorAll('.feed-filter-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.filter === filter);
  });

  renderFeedItems();
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize feed filter buttons
function initFeedFilters() {
  document.querySelectorAll('.feed-filter-btn').forEach(btn => {
    btn.onclick = () => setFeedFilter(btn.dataset.filter);
  });

  const addBtn = document.getElementById('feedAddBtn');
  if (addBtn) {
    addBtn.onclick = showAddFeedModal;
  }

  const refreshBtn = document.getElementById('feedRefreshBtn');
  if (refreshBtn) {
    refreshBtn.onclick = refreshFeed;
  }
}

// Refresh feed with loading indicator
async function refreshFeed() {
  const btn = document.getElementById('feedRefreshBtn');
  if (btn) {
    btn.classList.add('spinning');
  }

  try {
    await renderFeed();
  } finally {
    if (btn) {
      btn.classList.remove('spinning');
    }
  }
}

// Periodic feed refresh (every 30 seconds when in feed scope)
let feedRefreshInterval = null;

function startFeedRefresh() {
  if (feedRefreshInterval) return;
  feedRefreshInterval = setInterval(() => {
    if (currentScope === 'feed') {
      renderFeed();
    }
  }, 30000);
}

function stopFeedRefresh() {
  if (feedRefreshInterval) {
    clearInterval(feedRefreshInterval);
    feedRefreshInterval = null;
  }
}

// Inject feed item to build editor
function injectToEdit(itemId) {
  // Find the item - support both ID string and index for backwards compat
  let item;
  if (typeof itemId === 'number') {
    item = feedItems[itemId];
  } else {
    item = feedItems.find(i => i.id === itemId);
  }

  if (!item) {
    console.warn('[Feed] Item not found for inject:', itemId);
    return;
  }

  // Show chain bar
  document.getElementById('chainBar').style.display = 'flex';

  // Switch to build view inside pane B
  document.querySelectorAll('.scope-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-build').classList.add('active');

  // Update toolbar to show build tools
  document.querySelectorAll('.tb-section').forEach(s => s.classList.remove('active'));
  document.getElementById('tb-build').classList.add('active');

  // Update editor content
  const stepsText = item.steps.map((s, i) =>
    `  // Step ${i + 1}: ${s.content} ${s.completed ? '[DONE]' : '[TODO]'}`
  ).join('\n');

  document.getElementById('buildEditor').innerHTML = `<span style="color:var(--feed)">/* Living Feed Item: ${escapeHtml(item.name)} */</span>
<span style="color:var(--feed)">/* Kind: ${item.kind} | State: ${item.state} | Charge: ${Math.round(item.charge * 100)}% */</span>

<span style="color:var(--dim)">// Steps:</span>
${stepsText || '<span style="color:var(--dim)">// No steps defined</span>'}

<span style="color:var(--build)">/* <- Edit here, Claude helps in chat */</span>
<span style="color:var(--build)">/* Item will be boosted when you save */</span>`;

  // Update pane B label
  const lbl = document.getElementById('paneBLabel');
  const dot = document.getElementById('paneBDot');
  const buildColor = getComputedStyle(document.documentElement).getPropertyValue('--build').trim();
  lbl.textContent = 'EDITING: ' + item.name;
  lbl.style.color = buildColor;
  dot.style.background = buildColor;

  // Update inject target
  const it = document.getElementById('injectTarget');
  it.style.display = 'flex';
  it.querySelector('.inject-arrow').style.color = buildColor;
  document.getElementById('injectLabel').textContent = 'BUILD';
  document.getElementById('injectLabel').style.color = buildColor;

  // Boost the item since we're working on it
  if (window.gently) {
    window.gently.feed.boost(item.id, 0.05);
  }
}

// ========== DOC SCOPE (Three-Chain, G.E.D., Search) ==========
let currentDocTab = 'docs';
let documents = [];
let currentDocument = null;
let selectedDomain = 'gaming';
let searchMode = 'forward';

// Initialize doc scope event handlers
function initDocScope() {
  // Doc tabs
  document.querySelectorAll('.doc-tab').forEach(tab => {
    tab.onclick = () => switchDocTab(tab.dataset.tab);
  });

  // New doc button
  const newDocBtn = document.getElementById('docNewBtn');
  if (newDocBtn) {
    newDocBtn.onclick = createNewDoc;
  }

  // Doc detail back button
  const backBtn = document.getElementById('docBackBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      document.getElementById('docList').style.display = 'block';
      document.getElementById('docDetail').style.display = 'none';
    };
  }

  // Verify and finalize buttons
  const verifyBtn = document.getElementById('docVerifyBtn');
  if (verifyBtn) verifyBtn.onclick = verifyCurrentDoc;
  const finalizeBtn = document.getElementById('docFinalizeBtn');
  if (finalizeBtn) finalizeBtn.onclick = finalizeCurrentDoc;

  // Add step buttons
  const addUserStepBtn = document.getElementById('addUserStepBtn');
  if (addUserStepBtn) {
    addUserStepBtn.onclick = () => addDocStep('user');
  }
  const addClaudeStepBtn = document.getElementById('addClaudeStepBtn');
  if (addClaudeStepBtn) {
    addClaudeStepBtn.onclick = () => addDocStep('claude');
  }

  // Doc action buttons
  document.querySelectorAll('.doc-action-btn').forEach(btn => {
    btn.onclick = () => performDocAction(btn.dataset.action);
  });

  // G.E.D. domain buttons
  document.querySelectorAll('.ged-domain-btn').forEach(btn => {
    btn.onclick = () => selectGedDomain(btn.dataset.domain);
  });

  // G.E.D. translate button
  const translateBtn = document.getElementById('gedTranslateBtn');
  if (translateBtn) {
    translateBtn.onclick = performGedTranslation;
  }

  // G.E.D. concept input enter key
  const conceptInput = document.getElementById('gedConceptInput');
  if (conceptInput) {
    conceptInput.onkeydown = (e) => {
      if (e.key === 'Enter') performGedTranslation();
    };
  }

  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.onclick = performSearch;
  }

  // Search input enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') performSearch();
    };
  }

  // Search mode buttons
  document.querySelectorAll('.search-mode').forEach(btn => {
    btn.onclick = () => selectSearchMode(btn.dataset.mode);
  });

  // Add thought button
  const addThoughtBtn = document.getElementById('addThoughtBtn');
  if (addThoughtBtn) {
    addThoughtBtn.onclick = addThought;
  }
}

// Switch doc tabs
function switchDocTab(tab) {
  currentDocTab = tab;

  // Update tab buttons
  document.querySelectorAll('.doc-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tab);
  });

  // Show/hide panels
  document.querySelectorAll('.doc-panel').forEach(p => {
    p.classList.remove('active');
  });
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');

  // Load content
  if (tab === 'docs') {
    renderDocList();
  } else if (tab === 'ged') {
    // G.E.D. panel is ready
  } else if (tab === 'search') {
    // Search panel is ready
  }
}

// ===== DOCUMENTS (Three-Chain) =====

// Render document list
async function renderDocList() {
  const list = document.getElementById('docList');
  if (!list) return;

  if (!window.gently) {
    list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">Documents unavailable</div></div>';
    return;
  }

  list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">Loading documents...</div></div>';

  try {
    const result = await window.gently.doc.list();
    if (result.success && result.documents) {
      documents = result.documents;
      renderDocItems();
    } else {
      list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">No documents yet</div></div>';
    }
  } catch (err) {
    console.error('[Doc] Load error:', err);
    list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">Error loading documents</div></div>';
  }
}

// Render document items to DOM
function renderDocItems() {
  const list = document.getElementById('docList');
  list.innerHTML = '';

  if (documents.length === 0) {
    list.innerHTML = '<div class="feed-empty"><div class="feed-empty-text">No documents yet. Create one to get started.</div></div>';
    return;
  }

  documents.forEach(doc => {
    const div = document.createElement('div');
    div.className = 'doc-item';
    div.onclick = () => openDocument(doc.id);

    const userSteps = doc.userChain?.steps?.length || 0;
    const claudeSteps = doc.claudeChain?.steps?.length || 0;
    const resultSteps = doc.resultChain?.steps?.length || 0;

    div.innerHTML = `
      <div class="doc-item-head">
        <div class="doc-item-icon"><span class="i" style="color:var(--doc)"><svg><use href="#i-file"/></svg></span></div>
        <span class="doc-item-name">${escapeHtml(doc.name)}</span>
        <span class="doc-item-type">${doc.type}</span>
        ${doc.finalized ? '<span style="color:var(--focus);font-size:6px">FINAL</span>' : ''}
      </div>
      <div class="doc-item-meta">
        <span>User: ${userSteps} steps</span>
        <span>Claude: ${claudeSteps} steps</span>
        <span>Result: ${resultSteps} steps</span>
        <span>${formatRelativeTime(doc.updatedAt || doc.createdAt)}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

// Open a document in detail view
async function openDocument(docId) {
  if (!window.gently) return;

  try {
    const result = await window.gently.doc.get(docId);
    if (result.success && result.document) {
      currentDocument = result.document;
      renderDocDetail();
      document.getElementById('docList').style.display = 'none';
      document.getElementById('docDetail').style.display = 'flex';
    }
  } catch (err) {
    console.error('[Doc] Open error:', err);
  }
}

// Render document detail (three-chain view)
function renderDocDetail() {
  if (!currentDocument) return;

  document.getElementById('docDetailTitle').textContent = currentDocument.name;
  document.getElementById('docDetailType').textContent = currentDocument.type;

  // Render chains
  renderChainSteps('userChainSteps', currentDocument.userChain?.steps || [], 'user');
  renderChainSteps('claudeChainSteps', currentDocument.claudeChain?.steps || [], 'claude');
  renderChainSteps('resultChainSteps', currentDocument.resultChain?.steps || [], 'result');

  // Update finalize button
  const finalizeBtn = document.getElementById('docFinalizeBtn');
  if (finalizeBtn) {
    if (currentDocument.finalized) {
      finalizeBtn.textContent = 'Finalized';
      finalizeBtn.disabled = true;
    } else {
      finalizeBtn.textContent = 'Finalize';
      finalizeBtn.disabled = false;
    }
  }
}

// Render chain steps
function renderChainSteps(containerId, steps, chainType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (steps.length === 0) {
    container.innerHTML = '<div style="padding:10px;font-size:7px;color:var(--dim);text-align:center">No steps yet</div>';
    return;
  }

  steps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'chain-step';
    div.innerHTML = `
      <div>${escapeHtml(step.content)}</div>
      ${step.hash ? `<div class="chain-step-hash">#${step.hash.substring(0, 8)}</div>` : ''}
    `;
    container.appendChild(div);
  });
}

// Add step to document chain
async function addDocStep(chain) {
  if (!window.gently || !currentDocument) return;

  const inputId = chain === 'user' ? 'userStepInput' : 'claudeStepInput';
  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) return;

  const content = input.value.trim();
  input.value = '';

  try {
    if (chain === 'user') {
      await window.gently.doc.addUserStep(currentDocument.id, content);
    } else {
      await window.gently.doc.addClaudeStep(currentDocument.id, content);
    }
    // Reload document
    await openDocument(currentDocument.id);
  } catch (err) {
    console.error('[Doc] Add step error:', err);
  }
}

// Perform document action
async function performDocAction(action) {
  if (!window.gently || !currentDocument) return;

  try {
    const result = await window.gently.doc.action(currentDocument.id, action);
    if (result.success) {
      console.log('[Doc] Action result:', result);
      // Reload document
      await openDocument(currentDocument.id);
    }
  } catch (err) {
    console.error('[Doc] Action error:', err);
  }
}

// Verify document
async function verifyCurrentDoc() {
  if (!window.gently || !currentDocument) return;

  const btn = document.getElementById('docVerifyBtn');
  if (btn) btn.textContent = 'Verifying...';

  try {
    const result = await window.gently.doc.verify(currentDocument.id);
    if (btn) {
      btn.textContent = result.valid ? 'Valid!' : 'Invalid';
      setTimeout(() => { btn.textContent = 'Verify'; }, 2000);
    }
  } catch (err) {
    console.error('[Doc] Verify error:', err);
    if (btn) btn.textContent = 'Error';
  }
}

// Finalize document
async function finalizeCurrentDoc() {
  if (!window.gently || !currentDocument) return;

  if (!confirm('Finalize this document? Chains will be locked.')) return;

  try {
    await window.gently.doc.finalize(currentDocument.id);
    await openDocument(currentDocument.id);
  } catch (err) {
    console.error('[Doc] Finalize error:', err);
  }
}

// Create new document
async function createNewDoc() {
  if (!window.gently) return;

  const name = prompt('Document name:');
  if (!name) return;

  try {
    const result = await window.gently.doc.create(name, 'three-chain');
    if (result.success && result.document) {
      await renderDocList();
      await openDocument(result.document.id);
    }
  } catch (err) {
    console.error('[Doc] Create error:', err);
  }
}

// ===== G.E.D. (Generative Educational Device) =====

// Select G.E.D. domain
function selectGedDomain(domain) {
  selectedDomain = domain;
  document.querySelectorAll('.ged-domain-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.domain === domain);
  });
}

// Perform G.E.D. translation
async function performGedTranslation() {
  if (!window.gently) return;

  const conceptInput = document.getElementById('gedConceptInput');
  const resultContainer = document.getElementById('gedResult');
  const masteryContainer = document.getElementById('gedMastery');

  const concept = conceptInput?.value.trim();
  if (!concept) {
    resultContainer.innerHTML = '<div class="ged-result-empty">Please enter a concept to translate</div>';
    return;
  }

  resultContainer.innerHTML = '<div class="ged-result-empty">Translating...</div>';

  try {
    const result = await window.gently.ged.translate(concept, selectedDomain);

    if (result.success && result.translation) {
      const t = result.translation;
      const fidelityPercent = Math.round((t.fidelityScore || 0.8) * 100);
      const confidencePercent = Math.round((t.confidence || 0.85) * 100);

      resultContainer.innerHTML = `
        <div class="ged-result-card">
          <div class="ged-result-header">
            <span class="ged-result-concept">${escapeHtml(t.sourceConcept || concept)}</span>
            <span class="ged-result-arrow">-></span>
            <span class="ged-result-domain">${t.targetDomain || selectedDomain}</span>
          </div>
          <div class="ged-result-content">${escapeHtml(t.translatedContent)}</div>
          <div class="ged-result-meta">
            <span>Fidelity: <div class="ged-fidelity-bar"><div class="ged-fidelity-fill" style="width:${fidelityPercent}%"></div></div> ${fidelityPercent}%</span>
            <span>Confidence: ${confidencePercent}%</span>
            ${result.mock ? '<span style="color:var(--warn)">(mock)</span>' : ''}
          </div>
        </div>
      `;

      // Load mastery info
      await loadGedMastery(concept);
    } else {
      resultContainer.innerHTML = '<div class="ged-result-empty">Translation failed</div>';
    }
  } catch (err) {
    console.error('[G.E.D.] Translation error:', err);
    resultContainer.innerHTML = '<div class="ged-result-empty">Translation error</div>';
  }
}

// Load G.E.D. mastery info
async function loadGedMastery(concept) {
  if (!window.gently) return;

  const barsContainer = document.getElementById('gedMasteryBars');
  if (!barsContainer) return;

  try {
    const result = await window.gently.ged.mastery(concept);

    if (result.success && result.mastery) {
      const m = result.mastery;
      const exercisePercent = Math.round(m.exerciseScore * 100);
      const explainPercent = Math.round(m.explainScore * 100);
      const applyPercent = Math.round(m.applyScore * 100);
      const overallPercent = Math.round(m.overall * 100);

      barsContainer.innerHTML = `
        <div class="ged-mastery-row">
          <span class="ged-mastery-label">Exercise</span>
          <div class="ged-mastery-bar"><div class="ged-mastery-fill exercise" style="width:${exercisePercent}%"></div></div>
          <span class="ged-mastery-value">${exercisePercent}%</span>
        </div>
        <div class="ged-mastery-row">
          <span class="ged-mastery-label">Explain</span>
          <div class="ged-mastery-bar"><div class="ged-mastery-fill explain" style="width:${explainPercent}%"></div></div>
          <span class="ged-mastery-value">${explainPercent}%</span>
        </div>
        <div class="ged-mastery-row">
          <span class="ged-mastery-label">Apply</span>
          <div class="ged-mastery-bar"><div class="ged-mastery-fill apply" style="width:${applyPercent}%"></div></div>
          <span class="ged-mastery-value">${applyPercent}%</span>
        </div>
        <div class="ged-mastery-level" style="color:${getMasteryColor(m.level)}">
          ${m.level} (${overallPercent}%)
        </div>
      `;
    }
  } catch (err) {
    console.error('[G.E.D.] Mastery error:', err);
  }
}

// Get mastery color
function getMasteryColor(level) {
  switch (level) {
    case 'Master': return 'var(--focus)';
    case 'Expert': return 'var(--warn)';
    case 'Advanced': return 'var(--feed)';
    case 'Intermediate': return 'var(--doc)';
    default: return 'var(--dim)';
  }
}

// ===== SEARCH (Alexandria) =====

// Select search mode
function selectSearchMode(mode) {
  searchMode = mode;
  document.querySelectorAll('.search-mode').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.mode === mode);
  });
}

// Perform search
async function performSearch() {
  if (!window.gently) return;

  const input = document.getElementById('searchInput');
  const resultsContainer = document.getElementById('searchResults');

  const query = input?.value.trim();
  if (!query) {
    resultsContainer.innerHTML = '<div class="search-empty"><div class="search-empty-text">Enter a search query</div></div>';
    return;
  }

  resultsContainer.innerHTML = '<div class="search-empty"><div class="search-empty-text">Searching...</div></div>';

  try {
    const result = await window.gently.search.query(query, { limit: 20 });

    if (result.success && result.results && result.results.length > 0) {
      renderSearchResults(result.results);
    } else {
      resultsContainer.innerHTML = '<div class="search-empty"><div class="search-empty-text">No results found</div></div>';
    }
  } catch (err) {
    console.error('[Search] Error:', err);
    resultsContainer.innerHTML = '<div class="search-empty"><div class="search-empty-text">Search error</div></div>';
  }
}

// Render search results
function renderSearchResults(results) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';

  results.forEach(thought => {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.onclick = () => navigateToThought(thought.id);

    const scorePercent = Math.round((thought.score || 0) * 100);
    const bridges = thought.bridges || [];

    div.innerHTML = `
      <div class="search-result-head">
        <span class="search-result-shape" data-shape="${thought.shape}">${thought.shape}</span>
        <span class="search-result-score">${scorePercent}%</span>
      </div>
      <div class="search-result-content">${escapeHtml(thought.content)}</div>
      ${bridges.length > 0 ? `
        <div class="search-result-bridges">
          ${bridges.slice(0, 4).map(b => `<span class="search-result-bridge">${escapeHtml(b)}</span>`).join('')}
          ${bridges.length > 4 ? `<span class="search-result-bridge">+${bridges.length - 4} more</span>` : ''}
        </div>
      ` : ''}
    `;
    container.appendChild(div);
  });
}

// Navigate to thought (explore its connections)
async function navigateToThought(thoughtId) {
  if (!window.gently) return;

  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '<div class="search-empty"><div class="search-empty-text">Navigating...</div></div>';

  try {
    const result = await window.gently.search.navigate(thoughtId, searchMode);
    if (result.success && result.results) {
      renderSearchResults(result.results);
    }
  } catch (err) {
    console.error('[Search] Navigate error:', err);
  }
}

// Add thought to the knowledge graph
async function addThought() {
  if (!window.gently) return;

  const input = document.getElementById('thoughtInput');
  const shapeSelect = document.getElementById('thoughtShape');

  const content = input?.value.trim();
  const shape = shapeSelect?.value || 'concept';

  if (!content) return;

  try {
    const result = await window.gently.search.addThought(content, shape, {});
    if (result.success) {
      input.value = '';
      console.log('[Search] Thought added:', result.thought);
      // Optionally search for the new thought
      document.getElementById('searchInput').value = content;
      await performSearch();
    }
  } catch (err) {
    console.error('[Search] Add thought error:', err);
  }
}

// ========== BUILD SCOPE (GOO Field, SVG Visual) ==========
let currentBuildMode = 'code';
let selectedShape = 'Circle';
let selectedMotion = 'Pulse';
let selectedColor = '#4d9fff';
let selectedSize = 100;
let selectedEmotion = 'curious';
let gooBlend = 0.3;

// Initialize build scope event handlers
function initBuildScope() {
  // Build mode tabs
  document.querySelectorAll('.build-mode').forEach(tab => {
    tab.onclick = () => switchBuildMode(tab.dataset.mode);
  });

  // GOO blend slider
  const blendSlider = document.getElementById('gooBlendSlider');
  if (blendSlider) {
    blendSlider.oninput = (e) => {
      gooBlend = parseFloat(e.target.value);
      document.getElementById('gooBlendValue').textContent = gooBlend.toFixed(2);
    };
  }

  // GOO buttons
  const resetBtn = document.getElementById('gooResetBtn');
  if (resetBtn) resetBtn.onclick = resetGooField;

  const renderBtn = document.getElementById('gooRenderBtn');
  if (renderBtn) renderBtn.onclick = renderGooField;

  const addRegionBtn = document.getElementById('gooAddRegionBtn');
  if (addRegionBtn) addRegionBtn.onclick = addGooRegion;

  const claudeBtn = document.getElementById('gooClaudeBtn');
  if (claudeBtn) claudeBtn.onclick = generateClaudeEmbodiment;

  // GOO emotion buttons
  document.querySelectorAll('.goo-emotion-btn').forEach(btn => {
    btn.onclick = () => selectGooEmotion(btn.dataset.emotion);
  });

  // GOO canvas mouse tracking
  const gooCanvas = document.getElementById('gooCanvas');
  if (gooCanvas) {
    gooCanvas.onmousemove = (e) => updateGooCursor(e);
    gooCanvas.onclick = (e) => sampleGooAttention(e);
  }

  // SVG shape buttons
  document.querySelectorAll('.svg-shape-btn').forEach(btn => {
    btn.onclick = () => selectSvgShape(btn.dataset.shape);
  });

  // SVG motion buttons
  document.querySelectorAll('.svg-motion-btn').forEach(btn => {
    btn.onclick = () => selectSvgMotion(btn.dataset.motion);
  });

  // SVG color buttons
  document.querySelectorAll('.svg-color-btn').forEach(btn => {
    btn.onclick = () => selectSvgColor(btn.dataset.color);
  });

  // SVG size slider
  const sizeSlider = document.getElementById('svgSizeSlider');
  if (sizeSlider) {
    sizeSlider.oninput = (e) => {
      selectedSize = parseInt(e.target.value);
      document.getElementById('svgSizeValue').textContent = selectedSize + 'px';
    };
  }

  // SVG buttons
  const generateBtn = document.getElementById('svgGenerateBtn');
  if (generateBtn) generateBtn.onclick = generateSvgPattern;

  const randomBtn = document.getElementById('svgRandomBtn');
  if (randomBtn) randomBtn.onclick = generateRandomPattern;

  const copyBtn = document.getElementById('svgCopyBtn');
  if (copyBtn) copyBtn.onclick = copySvgToClipboard;
}

// Switch build mode (code/goo/svg)
function switchBuildMode(mode) {
  currentBuildMode = mode;

  // Update mode tabs
  document.querySelectorAll('.build-mode').forEach(t => {
    t.classList.toggle('on', t.dataset.mode === mode);
  });

  // Show/hide panels
  document.querySelectorAll('.build-panel').forEach(p => {
    p.classList.remove('active');
  });
  const panel = document.getElementById('panel-' + mode);
  if (panel) panel.classList.add('active');

  // Initialize panel content
  if (mode === 'goo') {
    initGooPanel();
  } else if (mode === 'svg') {
    initSvgPanel();
  }
}

// ===== GOO FIELD =====

async function initGooPanel() {
  if (!window.gently) return;

  // Create initial field
  try {
    await window.gently.goo.createField(gooBlend);
    await renderGooField();
  } catch (err) {
    console.error('[GOO] Init error:', err);
  }
}

async function resetGooField() {
  if (!window.gently) return;

  try {
    await window.gently.goo.createField(gooBlend);
    document.getElementById('gooRegionList').innerHTML = '';
    await renderGooField();
  } catch (err) {
    console.error('[GOO] Reset error:', err);
  }
}

async function renderGooField() {
  if (!window.gently) return;

  const canvas = document.getElementById('gooCanvas');
  if (!canvas) return;

  try {
    const result = await window.gently.goo.renderSvg(400, 400);
    if (result.success && result.svg) {
      canvas.innerHTML = result.svg;
    }
  } catch (err) {
    console.error('[GOO] Render error:', err);
    // Show placeholder
    canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--dim);font-size:8px">Click Add Region to start</div>';
  }
}

async function addGooRegion() {
  if (!window.gently) return;

  // Generate random region
  const region = {
    center: [0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6],
    shape: { type: 'Circle', radius: 0.05 + Math.random() * 0.1 },
    color: [
      0.2 + Math.random() * 0.8,
      0.2 + Math.random() * 0.8,
      0.8 + Math.random() * 0.2,
      0.6 + Math.random() * 0.4,
    ],
    label: 'Region ' + (document.querySelectorAll('.goo-region-item').length + 1),
  };

  try {
    const result = await window.gently.goo.addRegion(region);
    if (result.success) {
      // Add to region list UI
      const list = document.getElementById('gooRegionList');
      const item = document.createElement('div');
      item.className = 'goo-region-item';
      item.dataset.id = result.id;
      const [r, g, b, a] = region.color;
      item.innerHTML = `
        <div class="goo-region-color" style="background:rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})"></div>
        <span class="goo-region-name">${region.label}</span>
        <span class="goo-region-delete" onclick="removeGooRegion(${result.id})">x</span>
      `;
      list.appendChild(item);

      // Re-render field
      await renderGooField();
    }
  } catch (err) {
    console.error('[GOO] Add region error:', err);
  }
}

function selectGooEmotion(emotion) {
  selectedEmotion = emotion;
  document.querySelectorAll('.goo-emotion-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.emotion === emotion);
  });
}

async function generateClaudeEmbodiment() {
  if (!window.gently) return;

  const canvas = document.getElementById('gooCanvas');
  if (!canvas) return;

  try {
    const result = await window.gently.goo.claude(selectedEmotion);
    if (result.success && result.svg) {
      canvas.innerHTML = result.svg;
    }
  } catch (err) {
    console.error('[GOO] Claude error:', err);
  }
}

function updateGooCursor(e) {
  const canvas = document.getElementById('gooCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width).toFixed(2);
  const y = ((e.clientY - rect.top) / rect.height).toFixed(2);

  const info = document.getElementById('gooCursorInfo');
  if (info) {
    info.querySelector('.goo-coord:nth-child(1)').textContent = `x: ${x}`;
    info.querySelector('.goo-coord:nth-child(2)').textContent = `y: ${y}`;
  }
}

async function sampleGooAttention(e) {
  if (!window.gently) return;

  const canvas = document.getElementById('gooCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  try {
    // Sample distance
    const sampleResult = await window.gently.goo.sample(x, y);
    if (sampleResult.success) {
      const info = document.getElementById('gooCursorInfo');
      if (info) {
        info.querySelector('.goo-dist').textContent = `d: ${sampleResult.distance.toFixed(3)}`;
      }
    }

    // Get attention weights
    const attendResult = await window.gently.goo.attend(x, y);
    if (attendResult.success && attendResult.attention) {
      renderGooAttention(attendResult.attention);
    }
  } catch (err) {
    console.error('[GOO] Sample error:', err);
  }
}

function renderGooAttention(attention) {
  const container = document.getElementById('gooAttention');
  if (!container) return;

  if (!attention.weights || attention.weights.length === 0) {
    container.innerHTML = '<div class="goo-attention-empty">No regions to attend to</div>';
    return;
  }

  container.innerHTML = attention.weights.map(({ regionId, weight }) => {
    const percent = Math.round(weight * 100);
    return `
      <div class="goo-attention-bar">
        <span class="goo-attention-label">R${regionId}</span>
        <div class="goo-attention-track"><div class="goo-attention-fill" style="width:${percent}%"></div></div>
        <span class="goo-attention-value">${percent}%</span>
      </div>
    `;
  }).join('');
}

// ===== SVG VISUAL =====

async function initSvgPanel() {
  await generateSvgPattern();
}

function selectSvgShape(shape) {
  selectedShape = shape;
  document.querySelectorAll('.svg-shape-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.shape === shape);
  });
}

function selectSvgMotion(motion) {
  selectedMotion = motion;
  document.querySelectorAll('.svg-motion-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.motion === motion);
  });
}

function selectSvgColor(color) {
  selectedColor = color;
  document.querySelectorAll('.svg-color-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.color === color);
  });
}

async function generateSvgPattern() {
  if (!window.gently) return;

  const preview = document.getElementById('svgPreview');
  if (!preview) return;

  try {
    const result = await window.gently.svg.generatePattern({
      shape: selectedShape,
      motion: selectedMotion,
      color: selectedColor,
      size: selectedSize,
    });

    if (result.success && result.svg) {
      preview.innerHTML = result.svg;
    }
  } catch (err) {
    console.error('[SVG] Generate error:', err);
    preview.innerHTML = '<div style="color:var(--dim);font-size:8px">Generation failed</div>';
  }
}

async function generateRandomPattern() {
  const shapes = ['Circle', 'Hexagon', 'Triangle', 'Square', 'Star', 'Wave'];
  const motions = ['Pulse', 'Rotate', 'Breathe', 'Orbit', 'Glitch', 'Static'];
  const colors = ['#4d9fff', '#00e5a0', '#ff6b9d', '#4ecdc4', '#ffd93d', '#c77dff'];

  selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
  selectedMotion = motions[Math.floor(Math.random() * motions.length)];
  selectedColor = colors[Math.floor(Math.random() * colors.length)];
  selectedSize = 60 + Math.floor(Math.random() * 120);

  // Update UI
  document.querySelectorAll('.svg-shape-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.shape === selectedShape);
  });
  document.querySelectorAll('.svg-motion-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.motion === selectedMotion);
  });
  document.querySelectorAll('.svg-color-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.color === selectedColor);
  });
  document.getElementById('svgSizeSlider').value = selectedSize;
  document.getElementById('svgSizeValue').textContent = selectedSize + 'px';

  await generateSvgPattern();
}

async function copySvgToClipboard() {
  const preview = document.getElementById('svgPreview');
  if (!preview) return;

  const svg = preview.innerHTML;
  try {
    await navigator.clipboard.writeText(svg);
    const btn = document.getElementById('svgCopyBtn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="i" style="width:8px;height:8px"><svg style="width:6px;height:6px"><use href="#i-dl"/></svg></span> Copied!';
      setTimeout(() => { btn.innerHTML = originalText; }, 1500);
    }
  } catch (err) {
    console.error('[SVG] Copy error:', err);
  }
}

// ========== CLAN OPERATIONS (via IPC) ==========
async function addClan() {
  const name = prompt('Clan name:');
  if (!name) return;

  const context = prompt('Initial context/instruction:') || '';

  if (window.gently && projectId) {
    try {
      const clan = await window.gently.addClan(projectId, name, context);
      console.log('[Gently] Clan created:', clan);
      updateStamp();
    } catch (err) {
      console.error('[Gently] Failed to create clan:', err);
    }
  }
}

async function collapseSelected() {
  if (selectedClans.size < 2) {
    alert('Select at least 2 clans to collapse');
    return;
  }

  const name = prompt('New window name:');
  if (!name) return;

  if (window.gently && projectId) {
    try {
      const result = await window.gently.collapse(projectId, Array.from(selectedClans), name);
      if (result) {
        console.log('[Gently] Collapse result:', result);
        window.gently.spawnWindow({
          id: result.windowId,
          name: name,
          constants: result.constants,
          isSetupMode: false,
        });
        selectedClans.clear();
      }
    } catch (err) {
      console.error('[Gently] Failed to collapse:', err);
    }
  }
}

// ========== CLI ==========
function sendToCLI(instruction) {
  if (window.gently && windowData?.workDir) {
    window.gently.cliSend(instruction, windowData.workDir);
  }
}

// ========== FEATURE AVAILABILITY HELPERS ==========
async function isFeatureAvailable(feature) {
  if (!window.gently) return false;
  const result = await window.gently.tier.checkFeature(feature);
  return result.available;
}

async function requireFeature(feature, callback) {
  const result = await window.gently.tier.checkFeature(feature);
  if (result.available) {
    return callback();
  } else {
    console.warn(`[Gently] Feature unavailable: ${feature} - ${result.reason}`);
    return null;
  }
}

// Get tier info for display
async function getTierInfo() {
  if (!window.gently) return null;
  return await window.gently.tier.getEffective();
}

// ========== GLOBAL EXPORTS ==========
window.setScope = setScope;
window.addClan = addClan;
window.collapseSelected = collapseSelected;
window.injectToEdit = injectToEdit;
window.selectFeedPost = selectFeedPost;
window.copyStamp = copyStamp;
window.sendToCLI = sendToCLI;
window.isFeatureAvailable = isFeatureAvailable;
window.requireFeature = requireFeature;
window.getTierInfo = getTierInfo;

// Feed exports
window.renderFeed = renderFeed;
window.refreshFeed = refreshFeed;
window.boostFeedItem = boostFeedItem;
window.toggleFeedStep = toggleFeedStep;
window.toggleFeedPin = toggleFeedPin;
window.addFeedStep = addFeedStep;
window.addFeedItem = addFeedItem;
window.showAddFeedModal = showAddFeedModal;
window.showAddStepInput = showAddStepInput;
window.setFeedFilter = setFeedFilter;
window.startFeedRefresh = startFeedRefresh;
window.stopFeedRefresh = stopFeedRefresh;

// ========== INTEGRATIONS (Pro Tier - Porkbun) ==========
let porkbunConfigured = false;
let porkbunDomains = [];

function initIntegrations() {
  // Integrations button
  const intBtn = document.getElementById('rb-integrations');
  if (intBtn) {
    intBtn.addEventListener('click', openIntegrationsModal);
  }

  // Close modal
  const closeBtn = document.getElementById('closeIntegrationsModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeIntegrationsModal);
  }

  // Modal overlay click
  const modal = document.getElementById('integrationsModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeIntegrationsModal();
    });
  }

  // Porkbun buttons
  const testBtn = document.getElementById('porkbunTestBtn');
  const saveBtn = document.getElementById('porkbunSaveBtn');
  if (testBtn) testBtn.addEventListener('click', testPorkbunConnection);
  if (saveBtn) saveBtn.addEventListener('click', savePorkbunConfig);

  // Porkbun tabs
  document.querySelectorAll('.porkbun-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPorkbunTab(tab.dataset.tab));
  });

  // Refresh button
  const refreshBtn = document.getElementById('porkbunRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadPorkbunDomains);

  // DNS add button
  const dnsAddBtn = document.getElementById('dnsAddBtn');
  if (dnsAddBtn) dnsAddBtn.addEventListener('click', addDnsRecord);

  // DNS domain select
  const dnsDomainSelect = document.getElementById('dnsDomainSelect');
  if (dnsDomainSelect) {
    dnsDomainSelect.addEventListener('change', () => loadDnsRecords(dnsDomainSelect.value));
  }

  // DDNS buttons
  const ddnsRefreshBtn = document.getElementById('ddnsRefreshIP');
  const ddnsUpdateBtn = document.getElementById('ddnsUpdateBtn');
  if (ddnsRefreshBtn) ddnsRefreshBtn.addEventListener('click', refreshDdnsIP);
  if (ddnsUpdateBtn) ddnsUpdateBtn.addEventListener('click', updateDdns);

  // Check if already configured
  checkPorkbunStatus();
}

async function openIntegrationsModal() {
  // Check if Pro tier
  const features = await window.gently.tier.getScopeFeatures('integrations');
  const hasPorkbun = features.some(f => f.feature === 'integrations.porkbun');

  if (!hasPorkbun) {
    console.log('[Integrations] Pro tier required for integrations');
    return;
  }

  const modal = document.getElementById('integrationsModal');
  if (modal) {
    modal.style.display = 'flex';
    checkPorkbunStatus();
  }
}

function closeIntegrationsModal() {
  const modal = document.getElementById('integrationsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function checkPorkbunStatus() {
  try {
    const isConfigured = await window.gently.porkbun.isConfigured();
    porkbunConfigured = isConfigured;

    const status = document.getElementById('porkbunStatus');
    const config = document.getElementById('porkbunConfig');
    const content = document.getElementById('porkbunContent');

    if (isConfigured) {
      status.textContent = 'Connected';
      status.style.color = 'var(--focus)';
      config.style.display = 'none';
      content.style.display = 'block';
      loadPorkbunDomains();
    } else {
      status.textContent = 'Not configured';
      status.style.color = 'var(--dim)';
      config.style.display = 'flex';
      content.style.display = 'none';
    }
  } catch (err) {
    console.error('[Porkbun] Status check error:', err);
  }
}

async function testPorkbunConnection() {
  const apiKey = document.getElementById('porkbunApiKey').value;
  const secretKey = document.getElementById('porkbunSecretKey').value;

  if (!apiKey || !secretKey) {
    alert('Please enter both API key and Secret key');
    return;
  }

  try {
    // Configure temporarily
    await window.gently.porkbun.configure(apiKey, secretKey);
    const result = await window.gently.porkbun.ping();

    if (result.success) {
      const status = document.getElementById('porkbunStatus');
      status.textContent = 'Test OK - IP: ' + (result.yourIp || 'unknown');
      status.style.color = 'var(--focus)';
    } else {
      alert('Connection test failed: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Connection test error: ' + err.message);
  }
}

async function savePorkbunConfig() {
  const apiKey = document.getElementById('porkbunApiKey').value;
  const secretKey = document.getElementById('porkbunSecretKey').value;

  if (!apiKey || !secretKey) {
    alert('Please enter both API key and Secret key');
    return;
  }

  try {
    await window.gently.porkbun.configure(apiKey, secretKey);
    const result = await window.gently.porkbun.ping();

    if (result.success) {
      porkbunConfigured = true;
      checkPorkbunStatus();
    } else {
      alert('Configuration failed: ' + (result.error || 'Invalid credentials'));
    }
  } catch (err) {
    alert('Configuration error: ' + err.message);
  }
}

function switchPorkbunTab(tab) {
  document.querySelectorAll('.porkbun-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tab);
  });
  document.querySelectorAll('.porkbun-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'porkbun-' + tab);
  });
}

async function loadPorkbunDomains() {
  try {
    const result = await window.gently.porkbun.listDomains(0, false);

    if (result.success && result.domains) {
      porkbunDomains = result.domains;
      renderDomainList(result.domains);
      updateDomainSelects(result.domains);

      // Also get public IP
      const ipResult = await window.gently.porkbun.getPublicIP();
      if (ipResult.success) {
        const ipEl = document.getElementById('porkbunIP');
        if (ipEl) ipEl.textContent = 'IP: ' + ipResult.ip;

        const ddnsIP = document.getElementById('ddnsCurrentIP');
        if (ddnsIP) ddnsIP.textContent = ipResult.ip;
      }
    } else {
      console.error('[Porkbun] Failed to load domains:', result.error);
    }
  } catch (err) {
    console.error('[Porkbun] Domain list error:', err);
  }
}

function renderDomainList(domains) {
  const list = document.getElementById('domainList');
  if (!list) return;

  if (!domains || domains.length === 0) {
    list.innerHTML = '<div class="domain-empty">No domains found</div>';
    return;
  }

  list.innerHTML = domains.map(d => {
    const isExpired = new Date(d.expireDate) < new Date();
    return `
      <div class="domain-item">
        <span class="domain-name">${d.domain}</span>
        <span class="domain-status ${isExpired ? 'expired' : ''}">${d.status}</span>
        <span class="domain-expire">Exp: ${d.expireDate ? d.expireDate.split(' ')[0] : '--'}</span>
      </div>
    `;
  }).join('');
}

function updateDomainSelects(domains) {
  const dnsSelect = document.getElementById('dnsDomainSelect');
  const ddnsSelect = document.getElementById('ddnsDomain');

  const options = '<option value="">Select domain...</option>' +
    domains.map(d => `<option value="${d.domain}">${d.domain}</option>`).join('');

  if (dnsSelect) dnsSelect.innerHTML = options;
  if (ddnsSelect) ddnsSelect.innerHTML = options;
}

async function loadDnsRecords(domain) {
  if (!domain) return;

  const recordsEl = document.getElementById('dnsRecords');
  if (!recordsEl) return;

  try {
    const result = await window.gently.porkbun.getRecords(domain);

    if (result.success && result.records) {
      if (result.records.length === 0) {
        recordsEl.innerHTML = '<div class="domain-empty">No DNS records</div>';
        return;
      }

      recordsEl.innerHTML = result.records.map(r => `
        <div class="dns-record" data-id="${r.id}">
          <span class="dns-type">${r.type}</span>
          <span class="dns-name">${r.name || '@'}</span>
          <span class="dns-content">${r.content}</span>
          <span class="dns-ttl">${r.ttl}s</span>
          <button class="dns-delete" onclick="deleteDnsRecord('${domain}', '${r.id}')">x</button>
        </div>
      `).join('');
    } else {
      recordsEl.innerHTML = '<div class="domain-empty">Failed to load records</div>';
    }
  } catch (err) {
    console.error('[Porkbun] DNS records error:', err);
    recordsEl.innerHTML = '<div class="domain-empty">Error loading records</div>';
  }
}

async function addDnsRecord() {
  const domain = document.getElementById('dnsDomainSelect').value;
  const name = document.getElementById('dnsName').value;
  const type = document.getElementById('dnsType').value;
  const content = document.getElementById('dnsContent').value;
  const ttl = parseInt(document.getElementById('dnsTTL').value) || 600;

  if (!domain) {
    alert('Please select a domain first');
    return;
  }
  if (!content) {
    alert('Please enter record content');
    return;
  }

  try {
    const result = await window.gently.porkbun.createRecord(domain, {
      name: name || '',
      type,
      content,
      ttl
    });

    if (result.success) {
      // Clear inputs
      document.getElementById('dnsName').value = '';
      document.getElementById('dnsContent').value = '';
      // Reload records
      loadDnsRecords(domain);
    } else {
      alert('Failed to add record: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error adding record: ' + err.message);
  }
}

async function deleteDnsRecord(domain, recordId) {
  if (!confirm('Delete this DNS record?')) return;

  try {
    const result = await window.gently.porkbun.deleteRecord(domain, recordId);
    if (result.success) {
      loadDnsRecords(domain);
    } else {
      alert('Failed to delete record: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error deleting record: ' + err.message);
  }
}

async function refreshDdnsIP() {
  try {
    const result = await window.gently.porkbun.getPublicIP();
    if (result.success) {
      const ddnsIP = document.getElementById('ddnsCurrentIP');
      if (ddnsIP) ddnsIP.textContent = result.ip;
    }
  } catch (err) {
    console.error('[Porkbun] IP refresh error:', err);
  }
}

async function updateDdns() {
  const domain = document.getElementById('ddnsDomain').value;
  const subdomain = document.getElementById('ddnsSubdomain').value || '';
  const statusEl = document.getElementById('ddnsStatus');

  if (!domain) {
    alert('Please select a domain');
    return;
  }

  try {
    // Get current IP first
    const ipResult = await window.gently.porkbun.getPublicIP();
    if (!ipResult.success) {
      statusEl.textContent = 'Failed to get public IP';
      statusEl.className = 'ddns-status error';
      return;
    }

    const ip = ipResult.ip;

    // Update A record
    const result = await window.gently.porkbun.updateARecord(domain, subdomain, ip);

    if (result.success) {
      statusEl.textContent = 'Updated ' + (subdomain || '@') + '.' + domain + ' to ' + ip;
      statusEl.className = 'ddns-status success';
    } else {
      statusEl.textContent = 'Update failed: ' + (result.error || 'Unknown error');
      statusEl.className = 'ddns-status error';
    }
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'ddns-status error';
  }
}

// ========== AI PROVIDERS (Dev Tier) ==========
let huggingfaceConfigured = false;
let ollamaConfigured = false;
let kaggleConfigured = false;

function initAIProviders() {
  // Huggingface
  const hfTestBtn = document.getElementById('huggingfaceTestBtn');
  const hfSaveBtn = document.getElementById('huggingfaceSaveBtn');
  const hfChatSend = document.getElementById('hfChatSend');
  if (hfTestBtn) hfTestBtn.addEventListener('click', testHuggingface);
  if (hfSaveBtn) hfSaveBtn.addEventListener('click', saveHuggingface);
  if (hfChatSend) hfChatSend.addEventListener('click', sendHuggingfaceChat);

  // Ollama
  const ollamaTestBtn = document.getElementById('ollamaTestBtn');
  const ollamaSaveBtn = document.getElementById('ollamaSaveBtn');
  const ollamaRefreshBtn = document.getElementById('ollamaRefreshBtn');
  const ollamaPullBtn = document.getElementById('ollamaPullBtn');
  const ollamaChatSend = document.getElementById('ollamaChatSend');
  if (ollamaTestBtn) ollamaTestBtn.addEventListener('click', testOllama);
  if (ollamaSaveBtn) ollamaSaveBtn.addEventListener('click', saveOllama);
  if (ollamaRefreshBtn) ollamaRefreshBtn.addEventListener('click', refreshOllamaModels);
  if (ollamaPullBtn) ollamaPullBtn.addEventListener('click', pullOllamaModel);
  if (ollamaChatSend) ollamaChatSend.addEventListener('click', sendOllamaChat);

  // Kaggle
  const kaggleTestBtn = document.getElementById('kaggleTestBtn');
  const kaggleSaveBtn = document.getElementById('kaggleSaveBtn');
  const kaggleSearchBtn = document.getElementById('kaggleSearchBtn');
  const kaggleModelSearchBtn = document.getElementById('kaggleModelSearchBtn');
  if (kaggleTestBtn) kaggleTestBtn.addEventListener('click', testKaggle);
  if (kaggleSaveBtn) kaggleSaveBtn.addEventListener('click', saveKaggle);
  if (kaggleSearchBtn) kaggleSearchBtn.addEventListener('click', searchKaggleDatasets);
  if (kaggleModelSearchBtn) kaggleModelSearchBtn.addEventListener('click', searchKaggleModels);

  // AI tabs
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAITab(tab.dataset.provider, tab.dataset.tab));
  });

  // Check initial status
  checkAIProvidersStatus();
}

function toggleAISection(provider) {
  // Toggle visibility handled by CSS, this could expand/collapse
  console.log('[AI] Toggle section:', provider);
}

function switchAITab(provider, tab) {
  // Update tabs
  document.querySelectorAll(`.ai-tab[data-provider="${provider}"]`).forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tab);
  });

  // Update panels
  const panelPrefix = provider === 'huggingface' ? 'hf' : provider;
  document.querySelectorAll(`#${provider}Content .ai-panel`).forEach(p => {
    p.classList.remove('active');
  });
  const targetPanel = document.getElementById(`${panelPrefix}-${tab}`);
  if (targetPanel) targetPanel.classList.add('active');
}

async function checkAIProvidersStatus() {
  try {
    // Check Huggingface
    const hfConfigured = await window.gently.huggingface.isConfigured();
    huggingfaceConfigured = hfConfigured;
    updateAIStatus('huggingface', hfConfigured);

    // Check Ollama
    const ollamaResult = await window.gently.ollama.ping();
    ollamaConfigured = ollamaResult.online;
    updateAIStatus('ollama', ollamaResult.online, ollamaResult.online ? 'Running' : 'Not running');

    // Check Kaggle
    const kaggleConfigured = await window.gently.kaggle.isConfigured();
    updateAIStatus('kaggle', kaggleConfigured);
  } catch (err) {
    console.error('[AI] Status check error:', err);
  }
}

function updateAIStatus(provider, configured, customText = null) {
  const statusEl = document.getElementById(`${provider}Status`);
  const configEl = document.getElementById(`${provider}Config`);
  const contentEl = document.getElementById(`${provider}Content`);

  if (statusEl) {
    if (customText) {
      statusEl.textContent = customText;
    } else {
      statusEl.textContent = configured ? 'Connected' : 'Not configured';
    }
    statusEl.style.color = configured ? 'var(--focus)' : 'var(--dim)';
  }

  if (configEl && contentEl) {
    configEl.style.display = configured ? 'none' : 'flex';
    contentEl.style.display = configured ? 'block' : 'none';
  }
}

// ===== HUGGINGFACE =====
async function testHuggingface() {
  const token = document.getElementById('huggingfaceToken').value;
  if (!token) {
    alert('Please enter your Huggingface API token');
    return;
  }

  try {
    await window.gently.huggingface.configure(token);
    const status = document.getElementById('huggingfaceStatus');
    status.textContent = 'Token set - test with chat';
    status.style.color = 'var(--warn)';
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function saveHuggingface() {
  const token = document.getElementById('huggingfaceToken').value;
  if (!token) {
    alert('Please enter your Huggingface API token');
    return;
  }

  try {
    await window.gently.huggingface.configure(token);
    huggingfaceConfigured = true;
    updateAIStatus('huggingface', true);
  } catch (err) {
    alert('Configuration error: ' + err.message);
  }
}

async function sendHuggingfaceChat() {
  const model = document.getElementById('hfChatModel').value;
  const input = document.getElementById('hfChatInput').value;
  const responseEl = document.getElementById('hfChatResponse');

  if (!input.trim()) return;

  responseEl.textContent = 'Generating...';
  responseEl.className = 'ai-response loading';

  try {
    const messages = [{ role: 'user', content: input }];
    const result = await window.gently.huggingface.chat(model, messages, { maxTokens: 256 });

    if (result.success && result.result) {
      const response = result.result.choices?.[0]?.message?.content ||
                       result.result[0]?.generated_text ||
                       JSON.stringify(result.result);
      responseEl.textContent = response;
      responseEl.className = 'ai-response';
    } else {
      responseEl.textContent = 'Error: ' + (result.error || 'Unknown error');
      responseEl.className = 'ai-response error';
    }
  } catch (err) {
    responseEl.textContent = 'Error: ' + err.message;
    responseEl.className = 'ai-response error';
  }
}

// ===== OLLAMA =====
async function testOllama() {
  const host = document.getElementById('ollamaHost').value || 'localhost';
  const port = parseInt(document.getElementById('ollamaPort').value) || 11434;

  try {
    await window.gently.ollama.configure(host, port);
    const result = await window.gently.ollama.ping();

    const status = document.getElementById('ollamaStatus');
    if (result.online) {
      status.textContent = 'Running at ' + host + ':' + port;
      status.style.color = 'var(--focus)';
    } else {
      status.textContent = 'Not responding';
      status.style.color = 'var(--dead)';
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function saveOllama() {
  const host = document.getElementById('ollamaHost').value || 'localhost';
  const port = parseInt(document.getElementById('ollamaPort').value) || 11434;

  try {
    await window.gently.ollama.configure(host, port);
    const result = await window.gently.ollama.ping();

    if (result.online) {
      ollamaConfigured = true;
      updateAIStatus('ollama', true, 'Running');
      refreshOllamaModels();
    } else {
      alert('Ollama is not responding. Make sure it is running: ollama serve');
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  }
}

async function refreshOllamaModels() {
  const listEl = document.getElementById('ollamaModelList');
  const selectEl = document.getElementById('ollamaChatModel');
  const runningEl = document.getElementById('ollamaRunning');

  try {
    const result = await window.gently.ollama.listModels();

    if (result.success && result.models) {
      if (result.models.length === 0) {
        listEl.innerHTML = '<div class="domain-empty">No models installed. Pull one below.</div>';
        selectEl.innerHTML = '<option value="">No models</option>';
      } else {
        listEl.innerHTML = result.models.map(m => `
          <div class="ollama-model-item">
            <span class="ollama-model-name">${m.name}</span>
            <span class="ollama-model-size">${m.sizeHuman}</span>
            <span class="ollama-model-family">${m.family}</span>
            <button class="ollama-model-delete" onclick="deleteOllamaModel('${m.name}')">x</button>
          </div>
        `).join('');

        selectEl.innerHTML = result.models.map(m =>
          `<option value="${m.name}">${m.name}</option>`
        ).join('');
      }

      // Check running models
      const running = await window.gently.ollama.getRunning();
      if (running.success && running.models) {
        runningEl.textContent = running.models.length + ' running';
      }
    } else {
      listEl.innerHTML = '<div class="domain-empty">Failed to load models</div>';
    }
  } catch (err) {
    console.error('[Ollama] Refresh error:', err);
    listEl.innerHTML = '<div class="domain-empty">Error loading models</div>';
  }
}

async function pullOllamaModel() {
  const select = document.getElementById('ollamaPullSelect');
  const model = select.value;

  if (!model) {
    alert('Select a model to pull');
    return;
  }

  const status = document.getElementById('ollamaStatus');
  status.textContent = 'Pulling ' + model + '...';
  status.style.color = 'var(--warn)';

  try {
    const result = await window.gently.ollama.pullModel(model);
    if (result.success) {
      status.textContent = 'Pull complete';
      status.style.color = 'var(--focus)';
      refreshOllamaModels();
    } else {
      status.textContent = 'Pull failed: ' + (result.error || 'Unknown');
      status.style.color = 'var(--dead)';
    }
  } catch (err) {
    status.textContent = 'Pull error: ' + err.message;
    status.style.color = 'var(--dead)';
  }
}

async function deleteOllamaModel(name) {
  if (!confirm('Delete model ' + name + '?')) return;

  try {
    const result = await window.gently.ollama.deleteModel(name);
    if (result.success) {
      refreshOllamaModels();
    } else {
      alert('Delete failed: ' + (result.error || 'Unknown'));
    }
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

async function sendOllamaChat() {
  const model = document.getElementById('ollamaChatModel').value;
  const input = document.getElementById('ollamaChatInput').value;
  const responseEl = document.getElementById('ollamaChatResponse');

  if (!model) {
    alert('Select a model first');
    return;
  }
  if (!input.trim()) return;

  responseEl.textContent = 'Generating...';
  responseEl.className = 'ai-response loading';

  try {
    const messages = [{ role: 'user', content: input }];
    const result = await window.gently.ollama.chat(model, messages, { maxTokens: 256 });

    if (result.success && result.message) {
      responseEl.textContent = result.message.content;
      responseEl.className = 'ai-response';
    } else {
      responseEl.textContent = 'Error: ' + (result.error || 'Unknown error');
      responseEl.className = 'ai-response error';
    }
  } catch (err) {
    responseEl.textContent = 'Error: ' + err.message;
    responseEl.className = 'ai-response error';
  }
}

// ===== KAGGLE =====
async function testKaggle() {
  const username = document.getElementById('kaggleUsername').value;
  const apiKey = document.getElementById('kaggleApiKey').value;

  if (!username || !apiKey) {
    alert('Please enter both username and API key');
    return;
  }

  try {
    await window.gently.kaggle.configure(username, apiKey);
    const result = await window.gently.kaggle.whoami();

    const status = document.getElementById('kaggleStatus');
    if (result.success) {
      status.textContent = 'Verified: ' + username;
      status.style.color = 'var(--focus)';
    } else {
      status.textContent = 'Invalid credentials';
      status.style.color = 'var(--dead)';
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function saveKaggle() {
  const username = document.getElementById('kaggleUsername').value;
  const apiKey = document.getElementById('kaggleApiKey').value;

  if (!username || !apiKey) {
    alert('Please enter both username and API key');
    return;
  }

  try {
    await window.gently.kaggle.configure(username, apiKey);
    const result = await window.gently.kaggle.whoami();

    if (result.success) {
      kaggleConfigured = true;
      updateAIStatus('kaggle', true);
      loadKagglePopular();
    } else {
      alert('Invalid credentials');
    }
  } catch (err) {
    alert('Configuration error: ' + err.message);
  }
}

async function loadKagglePopular() {
  const listEl = document.getElementById('kaggleDatasetList');

  try {
    const result = await window.gently.kaggle.listDatasets({ sortBy: 'hottest', pageSize: 10 });

    if (result.success && result.datasets) {
      renderKaggleDatasets(result.datasets);
    }
  } catch (err) {
    listEl.innerHTML = '<div class="domain-empty">Error loading datasets</div>';
  }
}

async function searchKaggleDatasets() {
  const query = document.getElementById('kaggleSearchInput').value;
  const listEl = document.getElementById('kaggleDatasetList');

  if (!query.trim()) {
    loadKagglePopular();
    return;
  }

  try {
    const result = await window.gently.kaggle.searchDatasets(query, { pageSize: 10 });

    if (result.success && result.datasets) {
      renderKaggleDatasets(result.datasets);
    } else {
      listEl.innerHTML = '<div class="domain-empty">No datasets found</div>';
    }
  } catch (err) {
    listEl.innerHTML = '<div class="domain-empty">Search error</div>';
  }
}

function renderKaggleDatasets(datasets) {
  const listEl = document.getElementById('kaggleDatasetList');

  if (!datasets || datasets.length === 0) {
    listEl.innerHTML = '<div class="domain-empty">No datasets found</div>';
    return;
  }

  listEl.innerHTML = datasets.map(d => `
    <div class="kaggle-item" onclick="openKaggleDataset('${d.owner}', '${d.slug}')">
      <span class="kaggle-item-title">${d.title}</span>
      <div class="kaggle-item-meta">
        <span class="kaggle-item-size">${d.sizeHuman}</span>
        <span class="kaggle-item-votes">${d.votes} votes</span>
        <span class="kaggle-item-downloads">${d.downloads} downloads</span>
      </div>
    </div>
  `).join('');
}

async function searchKaggleModels() {
  const query = document.getElementById('kaggleModelSearchInput').value;
  const listEl = document.getElementById('kaggleModelList');

  try {
    const result = query.trim()
      ? await window.gently.kaggle.searchModels(query, { pageSize: 10 })
      : await window.gently.kaggle.listModels({ pageSize: 10 });

    if (result.success && result.models) {
      if (result.models.length === 0) {
        listEl.innerHTML = '<div class="domain-empty">No models found</div>';
      } else {
        listEl.innerHTML = result.models.map(m => `
          <div class="kaggle-item">
            <span class="kaggle-item-title">${m.slug}</span>
            <div class="kaggle-item-meta">
              <span>${m.framework}</span>
              <span>${m.owner}</span>
            </div>
          </div>
        `).join('');
      }
    } else {
      listEl.innerHTML = '<div class="domain-empty">No models found</div>';
    }
  } catch (err) {
    listEl.innerHTML = '<div class="domain-empty">Search error</div>';
  }
}

function openKaggleDataset(owner, slug) {
  // Could open in browser or show details
  console.log('[Kaggle] Open dataset:', owner, slug);
}

// ========== MCP (Model Context Protocol) ==========
let mcpCurrentScope = 'visitor';
let mcpSelectedTool = null;
let mcpTools = [];

function initMCP() {
  // MCP button
  const mcpBtn = document.getElementById('tb-mcp');
  if (mcpBtn) mcpBtn.addEventListener('click', openMCPModal);

  // Close modal
  const closeBtn = document.getElementById('closeMCPModal');
  if (closeBtn) closeBtn.addEventListener('click', closeMCPModal);

  // Modal overlay click
  const modal = document.getElementById('mcpModal');
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMCPModal();
  });

  // Scope buttons
  document.querySelectorAll('.mcp-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => selectMCPScope(btn.dataset.scope));
  });

  // Execute button
  const executeBtn = document.getElementById('mcpExecuteBtn');
  if (executeBtn) executeBtn.addEventListener('click', executeMCPTool);
}

async function openMCPModal() {
  const modal = document.getElementById('mcpModal');
  if (modal) {
    modal.style.display = 'flex';
    await loadMCPTools();
  }
}

function closeMCPModal() {
  const modal = document.getElementById('mcpModal');
  if (modal) modal.style.display = 'none';
}

async function selectMCPScope(scope) {
  // Check tier availability
  const feature = `mcp.${scope}`;
  const result = await window.gently.tier.checkFeature(feature);

  if (!result.available) {
    alert(result.reason || 'This scope requires a higher tier');
    return;
  }

  await window.gently.mcp.setScope(scope);
  mcpCurrentScope = scope;

  // Update UI
  document.querySelectorAll('.mcp-scope-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.scope === scope);
  });

  const badge = document.getElementById('mcpScopeBadge');
  if (badge) badge.textContent = scope.toUpperCase();

  await loadMCPTools();
}

async function loadMCPTools() {
  const listEl = document.getElementById('mcpToolsList');
  const countEl = document.getElementById('mcpToolCount');

  try {
    const result = await window.gently.mcp.getTools();
    if (result.success) {
      mcpTools = result.tools;
      countEl.textContent = mcpTools.length + ' tools';

      listEl.innerHTML = mcpTools.map(t => `
        <div class="mcp-tool-item" data-tool="${t.id}" onclick="selectMCPTool('${t.id}')">
          ${t.name.replace(/_/g, ' ')}
          <span class="mcp-tool-scope">[${t.scope}]</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('[MCP] Load tools error:', err);
    listEl.innerHTML = '<div class="domain-empty">Failed to load tools</div>';
  }
}

function selectMCPTool(toolId) {
  mcpSelectedTool = toolId;
  const tool = mcpTools.find(t => t.id === toolId);

  // Update UI
  document.querySelectorAll('.mcp-tool-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.tool === toolId);
  });

  const selectedEl = document.getElementById('mcpSelectedTool');
  if (selectedEl) selectedEl.textContent = tool ? tool.name : toolId;

  // Pre-fill params
  const paramsEl = document.getElementById('mcpParamsInput');
  if (paramsEl && tool && tool.inputSchema) {
    const example = {};
    if (tool.inputSchema.properties) {
      Object.keys(tool.inputSchema.properties).forEach(key => {
        example[key] = tool.inputSchema.properties[key].default || '';
      });
    }
    paramsEl.value = JSON.stringify(example, null, 2);
  }
}

async function executeMCPTool() {
  if (!mcpSelectedTool) {
    alert('Select a tool first');
    return;
  }

  const paramsEl = document.getElementById('mcpParamsInput');
  const resultEl = document.getElementById('mcpResult');

  let params = {};
  try {
    params = JSON.parse(paramsEl.value || '{}');
  } catch {
    resultEl.textContent = 'Invalid JSON parameters';
    resultEl.className = 'mcp-result error';
    return;
  }

  resultEl.textContent = 'Executing...';
  resultEl.className = 'mcp-result';

  try {
    const result = await window.gently.mcp.executeTool(mcpSelectedTool, params);
    if (result.success) {
      resultEl.textContent = JSON.stringify(result.result, null, 2);
      resultEl.className = 'mcp-result success';
    } else {
      resultEl.textContent = 'Error: ' + (result.error || 'Unknown error');
      resultEl.className = 'mcp-result error';
    }
  } catch (err) {
    resultEl.textContent = 'Error: ' + err.message;
    resultEl.className = 'mcp-result error';
  }
}

// ========== IPFS PUBLISHING ==========
let ipfsConnected = false;

function initIPFS() {
  // IPFS button in feed
  const ipfsBtn = document.getElementById('feedIPFSBtn');
  if (ipfsBtn) ipfsBtn.addEventListener('click', openIPFSModal);

  // Close modal
  const closeBtn = document.getElementById('closeIPFSModal');
  if (closeBtn) closeBtn.addEventListener('click', closeIPFSModal);

  // Modal overlay click
  const modal = document.getElementById('ipfsModal');
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeIPFSModal();
  });

  // Test and connect buttons
  const testBtn = document.getElementById('ipfsTestBtn');
  const connectBtn = document.getElementById('ipfsConnectBtn');
  const publishBtn = document.getElementById('ipfsPublishBtn');

  if (testBtn) testBtn.addEventListener('click', testIPFSConnection);
  if (connectBtn) connectBtn.addEventListener('click', connectIPFS);
  if (publishBtn) publishBtn.addEventListener('click', publishToIPFS);
}

async function openIPFSModal() {
  // Check tier
  const result = await window.gently.tier.checkFeature('ipfs.publish');
  if (!result.available) {
    alert(result.reason || 'IPFS publishing requires Pro tier');
    return;
  }

  const modal = document.getElementById('ipfsModal');
  if (modal) {
    modal.style.display = 'flex';
    checkIPFSStatus();
  }
}

function closeIPFSModal() {
  const modal = document.getElementById('ipfsModal');
  if (modal) modal.style.display = 'none';
}

async function checkIPFSStatus() {
  const indicator = document.getElementById('ipfsNodeIndicator');
  const configEl = document.getElementById('ipfsConfig');
  const publishEl = document.getElementById('ipfsPublish');

  try {
    const result = await window.gently.ipfs.ping();
    ipfsConnected = result.online;

    if (result.online) {
      indicator.textContent = 'Online - ' + (result.peerId || '').substring(0, 12) + '...';
      indicator.className = 'ipfs-node-indicator online';
      configEl.style.display = 'none';
      publishEl.style.display = 'block';
    } else {
      indicator.textContent = 'Offline';
      indicator.className = 'ipfs-node-indicator offline';
      configEl.style.display = 'block';
      publishEl.style.display = 'none';
    }
  } catch (err) {
    indicator.textContent = 'Error';
    indicator.className = 'ipfs-node-indicator offline';
  }
}

async function testIPFSConnection() {
  const host = document.getElementById('ipfsHost').value || 'localhost';
  const port = parseInt(document.getElementById('ipfsPort').value) || 5001;

  await window.gently.ipfs.configure(host, port);
  const result = await window.gently.ipfs.ping();

  const indicator = document.getElementById('ipfsNodeIndicator');
  if (result.online) {
    indicator.textContent = 'Test OK - Online';
    indicator.className = 'ipfs-node-indicator online';
  } else {
    indicator.textContent = 'Test Failed - ' + (result.error || 'Cannot connect');
    indicator.className = 'ipfs-node-indicator offline';
  }
}

async function connectIPFS() {
  const host = document.getElementById('ipfsHost').value || 'localhost';
  const port = parseInt(document.getElementById('ipfsPort').value) || 5001;

  await window.gently.ipfs.configure(host, port);
  await checkIPFSStatus();
}

async function publishToIPFS() {
  const resultEl = document.getElementById('ipfsResult');
  const shouldPin = document.getElementById('ipfsPublishPin').checked;

  // For demo, publish a test item
  const feedItem = {
    name: 'GentlyOS Feed Item',
    content: 'Published via GentlyOS IPFS integration',
    timestamp: Date.now(),
  };

  resultEl.textContent = 'Publishing...';
  resultEl.className = 'ipfs-result';

  try {
    const result = await window.gently.ipfs.publishFeedItem(feedItem);
    if (result.success) {
      resultEl.textContent = 'Published!\nCID: ' + result.cid + '\nURL: ' + result.url;
      resultEl.className = 'ipfs-result success';
    } else {
      resultEl.textContent = 'Error: ' + (result.error || 'Unknown error');
      resultEl.className = 'ipfs-result error';
    }
  } catch (err) {
    resultEl.textContent = 'Error: ' + err.message;
    resultEl.className = 'ipfs-result error';
  }
}

// ========== AGENT SYSTEM ==========
let agentActiveList = [];

function initAgents() {
  // Agent button
  const agentBtn = document.getElementById('tb-agents');
  if (agentBtn) agentBtn.addEventListener('click', openAgentModal);

  // Close modal
  const closeBtn = document.getElementById('closeAgentModal');
  if (closeBtn) closeBtn.addEventListener('click', closeAgentModal);

  // Modal overlay click
  const modal = document.getElementById('agentModal');
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAgentModal();
  });

  // Agent tabs
  document.querySelectorAll('.agent-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAgentTab(tab.dataset.tab));
  });

  // Refresh button
  const refreshBtn = document.getElementById('agentRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshAgents);

  // Create button
  const createBtn = document.getElementById('createAgentBtn');
  if (createBtn) createBtn.addEventListener('click', createAgent);

  // Agent type select change
  const typeSelect = document.getElementById('createAgentType');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => showAgentCapabilities(typeSelect.value));
  }
}

async function openAgentModal() {
  // Check tier
  const result = await window.gently.tier.checkFeature('agent.writer');
  if (!result.available) {
    alert(result.reason || 'Agent system requires Basic tier or higher');
    return;
  }

  const modal = document.getElementById('agentModal');
  if (modal) {
    modal.style.display = 'flex';

    // Configure agent system
    const tierInfo = await window.gently.tier.getEffective();
    await window.gently.agent.configure(tierInfo.hardwareScore, tierInfo.tier);

    await loadAgentTypes();
    await refreshAgents();
  }
}

function closeAgentModal() {
  const modal = document.getElementById('agentModal');
  if (modal) modal.style.display = 'none';
}

function switchAgentTab(tab) {
  document.querySelectorAll('.agent-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tab);
  });
  document.querySelectorAll('.agent-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'agent-' + tab);
  });
}

async function loadAgentTypes() {
  const listEl = document.getElementById('agentTypeList');

  try {
    const result = await window.gently.agent.getAllTypes();
    if (result.success) {
      listEl.innerHTML = result.types.map(t => `
        <div class="agent-type-item ${t.available ? '' : 'locked'}"
             onclick="${t.available ? `quickCreateAgent('${t.type}')` : ''}">
          <span class="agent-type-name">${t.name}</span>
          <span class="agent-type-desc">${t.description}</span>
          <span class="agent-type-tier">${t.tier.toUpperCase()}${t.minScore ? ' | HW:' + t.minScore + '+' : ''}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('[Agents] Load types error:', err);
  }
}

async function refreshAgents() {
  const listEl = document.getElementById('agentActiveList');
  const statusEl = document.getElementById('agentStatus');

  try {
    const result = await window.gently.agent.list();
    if (result.success) {
      agentActiveList = result.agents;
      statusEl.textContent = result.agents.length + ' active';

      if (result.agents.length === 0) {
        listEl.innerHTML = '<div class="domain-empty">No active agents</div>';
      } else {
        listEl.innerHTML = result.agents.map(a => `
          <div class="agent-active-item">
            <span class="agent-active-type">${a.name}</span>
            <span class="agent-active-id">${a.id}</span>
            <span class="agent-active-state ${a.state}">${a.state}</span>
            <button class="ollama-model-delete" onclick="removeAgent('${a.id}')">x</button>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('[Agents] Refresh error:', err);
  }
}

async function quickCreateAgent(type) {
  try {
    const result = await window.gently.agent.create(type, {});
    if (result.success) {
      await refreshAgents();
    } else {
      alert('Failed to create agent: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function createAgent() {
  const type = document.getElementById('createAgentType').value;
  const configStr = document.getElementById('createAgentConfig').value;

  if (!type) {
    alert('Select an agent type');
    return;
  }

  let config = {};
  try {
    config = configStr ? JSON.parse(configStr) : {};
  } catch {
    alert('Invalid JSON config');
    return;
  }

  try {
    const result = await window.gently.agent.create(type, config);
    if (result.success) {
      await refreshAgents();
      switchAgentTab('agents');
    } else {
      alert('Failed to create agent: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function removeAgent(id) {
  if (!confirm('Remove this agent?')) return;

  try {
    const result = await window.gently.agent.remove(id);
    if (result.success) {
      await refreshAgents();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function showAgentCapabilities(type) {
  const capEl = document.getElementById('agentCapabilities');
  const capList = capEl.querySelector('.cap-list');

  const capabilities = {
    writer: ['draft', 'edit', 'format', 'localize'],
    analyst: ['query', 'aggregate', 'visualize', 'report'],
    designer: ['layout', 'style', 'component', 'animate'],
    researcher: ['search', 'read', 'summarize', 'cite'],
    coder: ['generate', 'review', 'refactor', 'test'],
    coordinator: ['delegate', 'chain', 'parallel', 'wait'],
  };

  const caps = capabilities[type] || [];
  if (caps.length > 0) {
    capList.innerHTML = caps.map(c => `<span class="cap-item">${c}</span>`).join('');
  } else {
    capList.innerHTML = 'Select an agent type to see capabilities';
  }
}

// Doc exports
window.switchDocTab = switchDocTab;
window.renderDocList = renderDocList;
window.openDocument = openDocument;
window.createNewDoc = createNewDoc;
window.addDocStep = addDocStep;
window.performDocAction = performDocAction;
window.verifyCurrentDoc = verifyCurrentDoc;
window.finalizeCurrentDoc = finalizeCurrentDoc;

// G.E.D. exports
window.selectGedDomain = selectGedDomain;
window.performGedTranslation = performGedTranslation;
window.loadGedMastery = loadGedMastery;

// Search exports
window.selectSearchMode = selectSearchMode;
window.performSearch = performSearch;
window.navigateToThought = navigateToThought;
window.addThought = addThought;

// Build exports
window.switchBuildMode = switchBuildMode;
window.resetGooField = resetGooField;
window.renderGooField = renderGooField;
window.addGooRegion = addGooRegion;
window.selectGooEmotion = selectGooEmotion;
window.generateClaudeEmbodiment = generateClaudeEmbodiment;
window.selectSvgShape = selectSvgShape;
window.selectSvgMotion = selectSvgMotion;
window.selectSvgColor = selectSvgColor;
window.generateSvgPattern = generateSvgPattern;
window.generateRandomPattern = generateRandomPattern;
window.copySvgToClipboard = copySvgToClipboard;

// Integrations exports (Porkbun)
window.openIntegrationsModal = openIntegrationsModal;
window.closeIntegrationsModal = closeIntegrationsModal;
window.testPorkbunConnection = testPorkbunConnection;
window.savePorkbunConfig = savePorkbunConfig;
window.loadPorkbunDomains = loadPorkbunDomains;
window.loadDnsRecords = loadDnsRecords;
window.addDnsRecord = addDnsRecord;
window.deleteDnsRecord = deleteDnsRecord;
window.updateDdns = updateDdns;

// AI Providers exports (Dev Tier)
window.toggleAISection = toggleAISection;
window.switchAITab = switchAITab;
window.testHuggingface = testHuggingface;
window.saveHuggingface = saveHuggingface;
window.sendHuggingfaceChat = sendHuggingfaceChat;
window.testOllama = testOllama;
window.saveOllama = saveOllama;
window.refreshOllamaModels = refreshOllamaModels;
window.pullOllamaModel = pullOllamaModel;
window.deleteOllamaModel = deleteOllamaModel;
window.sendOllamaChat = sendOllamaChat;
window.testKaggle = testKaggle;
window.saveKaggle = saveKaggle;
window.searchKaggleDatasets = searchKaggleDatasets;
window.searchKaggleModels = searchKaggleModels;
window.openKaggleDataset = openKaggleDataset;

// MCP exports (Multi-Scope)
window.openMCPModal = openMCPModal;
window.closeMCPModal = closeMCPModal;
window.selectMCPScope = selectMCPScope;
window.selectMCPTool = selectMCPTool;
window.executeMCPTool = executeMCPTool;

// IPFS exports (Pro Tier)
window.openIPFSModal = openIPFSModal;
window.closeIPFSModal = closeIPFSModal;
window.testIPFSConnection = testIPFSConnection;
window.connectIPFS = connectIPFS;
window.publishToIPFS = publishToIPFS;

// ========== DNS MODAL ==========
function openDNSModal() {
  document.getElementById('dnsModal').style.display = 'flex';
  loadDomains();
}
function closeDNSModal() {
  document.getElementById('dnsModal').style.display = 'none';
}
async function loadDomains() {
  try {
    await window.gently.dns.initialize();
    const domains = await window.gently.dns.listDomains();
    const list = document.getElementById('domainList');
    if (domains.length === 0) {
      list.innerHTML = '<div class="list-item"><span class="item-sub">No domains configured. Add API keys in settings.</span></div>';
    } else {
      list.innerHTML = domains.map(d => `
        <div class="list-item" onclick="selectDomain('${d.name}')">
          <div><span class="item-name">${d.name}</span><br><span class="item-sub">${d.provider}</span></div>
          <span class="item-tag">${d.status}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('DNS load error:', e);
  }
}
async function applyPreset(preset) {
  const domain = document.getElementById('domainSelect').value;
  if (!domain) return alert('Select a domain first');
  await window.gently.dns.applyPreset(domain, preset, {});
  alert('Preset applied: ' + preset);
}

// ========== TELEPHONY MODAL ==========
function openTelephonyModal() {
  document.getElementById('telephonyModal').style.display = 'flex';
  loadTelephony();
}
function closeTelephonyModal() {
  document.getElementById('telephonyModal').style.display = 'none';
}
async function loadTelephony() {
  try {
    await window.gently.telephony.initialize();
    const numbers = await window.gently.telephony.listNumbers();
    const select = document.getElementById('fromNumber');
    select.innerHTML = numbers.length ?
      numbers.map(n => `<option value="${n.number}">${n.number}</option>`).join('') :
      '<option value="">No numbers - add Telnyx API key</option>';
    loadPricing();
  } catch (e) {
    console.error('Telephony load error:', e);
  }
}
async function loadPricing() {
  const pricing = await window.gently.telephony.getPricing();
  const savings = await window.gently.telephony.calculateSavings(1000, 100, 1);
  const container = document.getElementById('pricingCompare');
  container.innerHTML = `
    <div class="pricing-row header"><span>Provider</span><span>SMS/msg</span><span>Voice/min</span><span>Savings</span></div>
    ${Object.entries(savings.providers).map(([name, p]) => `
      <div class="pricing-row">
        <span>${name}</span>
        <span>$${pricing[name]?.sms?.outbound || '-'}</span>
        <span>$${pricing[name]?.voice?.outbound || '-'}</span>
        <span class="savings">${p.savingsPercent}%</span>
      </div>
    `).join('')}
    <div class="pricing-row"><span>Twilio</span><span>$0.0079</span><span>$0.014</span><span>baseline</span></div>
  `;
}
async function sendSMS() {
  const from = document.getElementById('fromNumber').value;
  const to = document.getElementById('toNumber').value;
  const body = document.getElementById('smsBody').value;
  if (!from || !to || !body) return alert('Fill all fields');
  try {
    await window.gently.telephony.sendSMS(from, to, body);
    alert('SMS sent!');
    document.getElementById('smsBody').value = '';
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ========== GMAIL MODAL ==========
function openGmailModal() {
  document.getElementById('gmailModal').style.display = 'flex';
  loadGmail();
}
function closeGmailModal() {
  document.getElementById('gmailModal').style.display = 'none';
}
async function loadGmail() {
  try {
    await window.gently.gmail.initialize();
    const accounts = await window.gently.gmail.listAccounts();
    const select = document.getElementById('gmailAccount');
    select.innerHTML = accounts.length ?
      accounts.map(a => `<option value="${a.email}">${a.email}</option>`).join('') :
      '<option value="">No accounts - click Add Account</option>';
    if (accounts.length) loadEmails(accounts[0].email);
  } catch (e) {
    console.error('Gmail load error:', e);
  }
}
async function loadEmails(email) {
  try {
    const data = await window.gently.gmail.listMessages(email, { maxResults: 20 });
    const list = document.getElementById('emailList');
    const emails = await Promise.all(
      data.messages.slice(0, 10).map(m => window.gently.gmail.getMessage(email, m.id))
    );
    list.innerHTML = emails.map(e => `
      <div class="list-item ${e.status === 'unread' ? 'unread' : ''}">
        <span class="email-from">${e.from}</span>
        <span class="email-subject">${e.subject}</span>
        <span class="email-date">${new Date(e.date).toLocaleDateString()}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('Load emails error:', e);
  }
}
async function addGmailAccount() {
  const url = await window.gently.gmail.getAuthUrl();
  alert('Open this URL to authenticate:\\n' + url);
}
async function sendEmail() {
  const from = document.getElementById('gmailAccount').value;
  const to = document.getElementById('emailTo').value;
  const subject = document.getElementById('emailSubject').value;
  const body = document.getElementById('emailBody').value;
  if (!from || !to || !subject) return alert('Fill required fields');
  try {
    await window.gently.gmail.sendEmail(from, to, subject, body);
    alert('Email sent!');
    document.getElementById('emailTo').value = '';
    document.getElementById('emailSubject').value = '';
    document.getElementById('emailBody').value = '';
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ========== MODEL HUB MODAL ==========
function openModelHubModal() {
  document.getElementById('modelHubModal').style.display = 'flex';
  loadModelHub();
}
function closeModelHubModal() {
  document.getElementById('modelHubModal').style.display = 'none';
}
async function loadModelHub() {
  try {
    await window.gently.modelHub.initialize();
    const models = await window.gently.modelHub.listModels();
    const list = document.getElementById('modelList');
    list.innerHTML = models.length ?
      models.map(m => `
        <div class="list-item">
          <div><span class="item-name">${m.name}</span><br><span class="item-sub">${m.path || 'No path'}</span></div>
          <span class="item-tag">${m.type}</span>
          <span class="item-sub">${formatBytes(m.size)}</span>
        </div>
      `).join('') :
      '<div class="list-item"><span class="item-sub">No models found. Download or scan for models.</span></div>';
    loadDiskUsage();
    loadMCPStatus();
  } catch (e) {
    console.error('Model hub load error:', e);
  }
}
async function loadDiskUsage() {
  const usage = await window.gently.modelHub.getDiskUsage();
  document.getElementById('diskUsage').innerHTML = `Total: ${usage.totalSizeHuman}`;
}
async function loadMCPStatus() {
  const status = await window.gently.modelHub.getStatus();
  document.getElementById('mcpServerStatus').innerHTML = status.mcpServerRunning ?
    `MCP Server running on port ${status.mcpPort}` : 'MCP Server stopped';
  document.getElementById('mcpServerBtn').textContent = status.mcpServerRunning ? 'Stop MCP' : 'Start MCP';
}
async function toggleMCPServer() {
  const status = await window.gently.modelHub.getStatus();
  if (status.mcpServerRunning) {
    await window.gently.modelHub.stopMCPServer();
  } else {
    await window.gently.modelHub.startMCPServer();
  }
  loadMCPStatus();
}
async function downloadHF() {
  const repo = document.getElementById('hfRepo').value;
  if (!repo) return alert('Enter repo ID');
  document.getElementById('downloadProgress').textContent = 'Downloading...';
  try {
    await window.gently.modelHub.downloadHuggingFace(repo);
    document.getElementById('downloadProgress').textContent = 'Done!';
    loadModelHub();
  } catch (e) {
    document.getElementById('downloadProgress').textContent = 'Error: ' + e.message;
  }
}
async function downloadOllama() {
  const model = document.getElementById('ollamaModel').value;
  if (!model) return alert('Enter model name');
  document.getElementById('downloadProgress').textContent = 'Pulling...';
  try {
    await window.gently.modelHub.downloadOllama(model);
    document.getElementById('downloadProgress').textContent = 'Done!';
    loadModelHub();
  } catch (e) {
    document.getElementById('downloadProgress').textContent = 'Error: ' + e.message;
  }
}
function formatBytes(bytes) {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// ========== LIVEPEER MODAL ==========
function openLivepeerModal() {
  document.getElementById('livepeerModal').style.display = 'flex';
  loadLivepeer();
}
function closeLivepeerModal() {
  document.getElementById('livepeerModal').style.display = 'none';
}
async function loadLivepeer() {
  try {
    await window.gently.livepeer.initialize();
    const streams = await window.gently.livepeer.listStreams();
    const list = document.getElementById('streamList');
    list.innerHTML = streams.length ?
      streams.map(s => `
        <div class="list-item">
          <div><span class="item-name">${s.name}</span><br><span class="item-sub">${s.playbackUrl || 'No URL'}</span></div>
          <span class="item-tag">${s.state}</span>
        </div>
      `).join('') :
      '<div class="list-item"><span class="item-sub">No streams. Create one or add LivePeer API key.</span></div>';
  } catch (e) {
    console.error('LivePeer load error:', e);
  }
}
async function createStream() {
  const name = prompt('Stream name:');
  if (!name) return;
  try {
    await window.gently.livepeer.createStream({ name });
    loadLivepeer();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ========== FACE TRACKING MODAL ==========
let faceTrackingActive = false;

function openFaceTrackingModal() {
  document.getElementById('faceTrackingModal').style.display = 'flex';
  loadCameras();
  updateFaceTrackingStatus();
}

function closeFaceTrackingModal() {
  document.getElementById('faceTrackingModal').style.display = 'none';
}

async function loadCameras() {
  try {
    const cameras = await window.gently.faceTracking.getCameras();
    const select = document.getElementById('cameraSelect');
    select.innerHTML = cameras.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  } catch (e) {
    console.error('Camera load error:', e);
  }
}

async function toggleFaceTracking() {
  const btn = document.getElementById('btnStartTracking');
  const status = document.getElementById('faceStatus');

  if (faceTrackingActive) {
    await window.gently.faceTracking.stop();
    faceTrackingActive = false;
    btn.textContent = 'Start Tracking';
    status.textContent = 'Not tracking';
    status.className = 'face-status';
  } else {
    await window.gently.faceTracking.initialize();
    await window.gently.faceTracking.start();
    faceTrackingActive = true;
    btn.textContent = 'Stop Tracking';
    status.textContent = 'Tracking...';
    status.className = 'face-status tracking';
  }
}

async function calibrateFace() {
  try {
    const result = await window.gently.faceTracking.calibrate();
    alert('Calibration complete');
  } catch (e) {
    alert('Calibration failed: ' + e.message);
  }
}

async function updateFaceTrackingStatus() {
  try {
    const status = await window.gently.faceTracking.getStatus();
    faceTrackingActive = status.state === 'tracking';
    document.getElementById('btnStartTracking').textContent = faceTrackingActive ? 'Stop Tracking' : 'Start Tracking';
  } catch (e) {
    console.error('Status error:', e);
  }
}

// Face tracking event listeners
if (window.gently?.faceTracking) {
  window.gently.faceTracking.onFace((data) => {
    const stats = document.getElementById('faceStats');
    if (stats && data.blendShapes) {
      const bs = data.blendShapes;
      stats.innerHTML = `
        <div class="face-stat">Yaw: ${(bs.headYaw || 0).toFixed(2)}</div>
        <div class="face-stat">Pitch: ${(bs.headPitch || 0).toFixed(2)}</div>
        <div class="face-stat">Blink L: ${(bs.eyeBlinkLeft || 0).toFixed(2)}</div>
      `;
    }
  });
  window.gently.faceTracking.onLost(() => {
    const status = document.getElementById('faceStatus');
    if (status) {
      status.textContent = 'Face lost';
      status.className = 'face-status lost';
    }
  });
}

// Smoothing slider
document.getElementById('smoothingSlider')?.addEventListener('input', async (e) => {
  const value = e.target.value / 100;
  document.getElementById('smoothingValue').textContent = value.toFixed(2);
  await window.gently.faceTracking.setSmoothing(value);
});

// ========== AVATAR STUDIO MODAL ==========
let activeAvatarId = null;

function openAvatarModal() {
  document.getElementById('avatarModal').style.display = 'flex';
  loadAvatarGallery();
}

function closeAvatarModal() {
  document.getElementById('avatarModal').style.display = 'none';
}

async function loadAvatarGallery() {
  try {
    const avatars = await window.gently.avatar.list();
    const gallery = document.getElementById('avatarGallery');
    gallery.innerHTML = avatars.length ?
      avatars.map(a => `
        <div class="avatar-card ${a.id === activeAvatarId ? 'active' : ''}" onclick="selectAvatar('${a.id}')">
          <div class="avatar-thumb"><svg width="40" height="40"><use href="#i-avatar"/></svg></div>
          <div class="avatar-name">${a.name}</div>
        </div>
      `).join('') :
      '<div class="avatar-card" onclick="createNewAvatar()">+ Create First Avatar</div>';
  } catch (e) {
    console.error('Avatar gallery error:', e);
  }
}

async function selectAvatar(avatarId) {
  activeAvatarId = avatarId;
  await window.gently.avatar.setActive(avatarId);
  loadAvatarGallery();
  loadAvatarEditor();
}

async function loadAvatarEditor() {
  if (!activeAvatarId) return;
  try {
    const svg = await window.gently.avatar.render(activeAvatarId);
    document.getElementById('avatarPreview').innerHTML = svg || '<div>No preview</div>';
  } catch (e) {
    console.error('Avatar render error:', e);
  }
}

async function createNewAvatar() {
  const name = prompt('Avatar name:');
  if (!name) return;
  try {
    const avatar = await window.gently.avatar.create({ name, style: 'cartoon' });
    activeAvatarId = avatar.id;
    loadAvatarGallery();
    loadAvatarEditor();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function createCustomAnimation() {
  const name = prompt('Animation name:');
  if (!name) return;
  try {
    await window.gently.avatar.createAnimation(name, {}, 2000);
    alert('Animation created');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Animation buttons
document.querySelectorAll('.anim-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!activeAvatarId) return;
    const anim = btn.dataset.anim;
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('playing'));
    btn.classList.add('playing');
    await window.gently.avatar.playAnimation(activeAvatarId, anim, false);
  });
});

// ========== REALTIME GRAPHICS MODAL ==========
let graphicsRunning = false;

function openGraphicsModal() {
  document.getElementById('graphicsModal').style.display = 'flex';
  loadGraphicsLayers();
}

function closeGraphicsModal() {
  document.getElementById('graphicsModal').style.display = 'none';
}

async function loadGraphicsLayers() {
  try {
    const state = await window.gently.graphics.getState();
    const list = document.getElementById('layerList');
    list.innerHTML = '<div class="layer-item"><span class="item-sub">No layers. Add one to start.</span></div>';
  } catch (e) {
    console.error('Graphics layer error:', e);
  }
}

async function addGraphicsLayer() {
  const name = prompt('Layer name:');
  if (!name) return;
  try {
    await window.gently.graphics.addLayer({ id: name, type: 'ui' });
    loadGraphicsLayers();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function addChatBubbleOverlay() {
  const text = document.getElementById('chatBubbleText').value;
  if (!text) return;
  try {
    await window.gently.graphics.addChatBubble(text, 'ai', {});
    document.getElementById('chatBubbleText').value = '';
    const preview = document.getElementById('chatBubblePreview');
    preview.innerHTML += `<div class="chat-bubble-preview ai">${text}</div>`;
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function clearChatBubbles() {
  await window.gently.graphics.clearChatBubbles();
  document.getElementById('chatBubblePreview').innerHTML = '';
}

// Effect buttons
document.querySelectorAll('.effect-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const effect = btn.dataset.effect;
    document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    await window.gently.graphics.setEffect(effect);
  });
});

// ========== TAB SWITCHER MODAL ==========
let autoRotationActive = false;

function openTabsModal() {
  document.getElementById('tabsModal').style.display = 'flex';
  loadTabsList();
}

function closeTabsModal() {
  document.getElementById('tabsModal').style.display = 'none';
}

async function loadTabsList() {
  try {
    const tabs = await window.gently.tabs.getAll();
    const list = document.getElementById('tabsList');
    const active = await window.gently.tabs.getActive();
    list.innerHTML = tabs.length ?
      tabs.map(t => `
        <div class="tab-item ${t.id === active?.id ? 'active' : ''}" onclick="switchTab('${t.id}')">
          <span class="tab-icon"><svg width="16" height="16"><use href="#i-tabs"/></svg></span>
          <span class="tab-title">${t.title}</span>
          ${t.pinned ? '<span class="tab-badge">Pinned</span>' : ''}
          <button class="tab-close" onclick="event.stopPropagation(); closeTab('${t.id}')">x</button>
        </div>
      `).join('') :
      '<div class="tab-item"><span class="item-sub">No tabs. Create one to start.</span></div>';
  } catch (e) {
    console.error('Tabs load error:', e);
  }
}

async function createNewTab() {
  const title = prompt('Tab title:');
  if (!title) return;
  try {
    await window.gently.tabs.create({ title });
    loadTabsList();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function switchTab(tabId) {
  await window.gently.tabs.switch(tabId);
  loadTabsList();
}

async function closeTab(tabId) {
  await window.gently.tabs.close(tabId);
  loadTabsList();
}

async function goBackTab() {
  await window.gently.tabs.goBack();
  loadTabsList();
}

async function goForwardTab() {
  await window.gently.tabs.goForward();
  loadTabsList();
}

async function createNewGroup() {
  const name = prompt('Group name:');
  if (!name) return;
  try {
    await window.gently.tabs.createGroup({ name });
    loadGroupsList();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function loadGroupsList() {
  // Groups list would be loaded here
}

async function toggleAutoRotation() {
  const btn = document.getElementById('btnAutoRotation');
  const interval = parseInt(document.getElementById('rotationInterval').value) || 5000;

  if (autoRotationActive) {
    await window.gently.tabs.stopAutoRotation();
    autoRotationActive = false;
    btn.textContent = 'Start Rotation';
  } else {
    await window.gently.tabs.startAutoRotation(interval);
    autoRotationActive = true;
    btn.textContent = 'Stop Rotation';
  }
}

// View mode select
document.getElementById('viewModeSelect')?.addEventListener('change', async (e) => {
  await window.gently.tabs.setViewMode(e.target.value);
});

// ========== INTRO CREATOR MODAL ==========
let introPlaying = false;
let activeSequenceId = null;

function openIntroModal() {
  document.getElementById('introModal').style.display = 'flex';
  loadIntroSequences();
}

function closeIntroModal() {
  document.getElementById('introModal').style.display = 'none';
}

async function loadIntroSequences() {
  try {
    const sequences = await window.gently.intro.getAll();
    // Update UI with sequences
  } catch (e) {
    console.error('Intro sequences error:', e);
  }
}

// Template buttons
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const template = btn.dataset.template;
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    try {
      const sequence = await window.gently.intro.createFromTemplate(template);
      activeSequenceId = sequence.id;
      await window.gently.intro.load(activeSequenceId);
      updateIntroTimeline();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });
});

async function addIntroText() {
  const text = prompt('Text content:');
  if (!text) return;
  // Would add text element to sequence
}

async function addIntroShape() {
  // Would add shape element to sequence
}

async function toggleIntroPlay() {
  const btn = document.getElementById('btnPlayIntro');

  if (introPlaying) {
    await window.gently.intro.pause();
    introPlaying = false;
    btn.textContent = 'Play';
  } else {
    await window.gently.intro.play();
    introPlaying = true;
    btn.textContent = 'Pause';
  }
}

function updateIntroTimeline() {
  // Would update timeline display
}

// Intro seek slider
document.getElementById('introSeek')?.addEventListener('input', async (e) => {
  const value = e.target.value;
  const status = await window.gently.intro.getStatus();
  const time = (value / 100) * status.duration;
  await window.gently.intro.seek(time);
});

// Intro event listeners
if (window.gently?.intro) {
  window.gently.intro.onFrame((data) => {
    const time = document.getElementById('introTime');
    if (time) {
      const current = Math.floor(data.time / 1000);
      const total = Math.floor(data.duration / 1000);
      time.textContent = `${current}s / ${total}s`;
    }
    const seek = document.getElementById('introSeek');
    if (seek) {
      seek.value = data.progress * 100;
    }
  });
  window.gently.intro.onComplete(() => {
    introPlaying = false;
    document.getElementById('btnPlayIntro').textContent = 'Play';
  });
}

// ========== TRADINGVIEW MODAL ==========
let tvConnected = false;
let currentStrategy = null;

function openTradingViewModal() {
  document.getElementById('tradingviewModal').style.display = 'flex';
  updateTVStatus();
  loadStrategies();
}

function closeTradingViewModal() {
  document.getElementById('tradingviewModal').style.display = 'none';
}

async function updateTVStatus() {
  try {
    const status = await window.gently.tradingview.getStatus();
    tvConnected = status.connected;
    const stateEl = document.querySelector('.tv-state');
    const btn = document.getElementById('btnTVConnect');

    if (stateEl) {
      stateEl.textContent = tvConnected ? 'Connected' : 'Disconnected';
      stateEl.className = 'tv-state' + (tvConnected ? ' connected' : '');
    }
    if (btn) {
      btn.textContent = tvConnected ? 'Disconnect' : 'Connect';
    }
  } catch (e) {
    console.error('TV status error:', e);
  }
}

async function toggleTVConnect() {
  const btn = document.getElementById('btnTVConnect');
  btn.disabled = true;
  btn.textContent = 'Connecting...';

  try {
    if (tvConnected) {
      await window.gently.tradingview.disconnect();
      tvConnected = false;
    } else {
      const result = await window.gently.tradingview.connect();
      tvConnected = result.success;
      if (tvConnected) {
        startTVDataPolling();
      }
    }
    updateTVStatus();
  } catch (e) {
    alert('Connection error: ' + e.message);
  }

  btn.disabled = false;
}

async function applyTVSettings() {
  const symbol = document.getElementById('tvSymbol').value;
  const timeframe = document.getElementById('tvTimeframe').value;

  if (symbol) {
    await window.gently.tradingview.setSymbol(symbol);
  }
  await window.gently.tradingview.setTimeframe(timeframe);
}

function startTVDataPolling() {
  // Poll for chart data updates
  setInterval(async () => {
    if (!tvConnected) return;

    try {
      const info = await window.gently.tradingview.getSymbolInfo();
      if (info) {
        const priceEl = document.querySelector('.tv-current-price');
        const changeEl = document.querySelector('.tv-change');

        if (priceEl) priceEl.textContent = info.price || '--';
        if (changeEl) {
          changeEl.textContent = info.change || '--';
          changeEl.className = 'tv-change' +
            (info.change?.startsWith('+') ? ' positive' :
             info.change?.startsWith('-') ? ' negative' : '');
        }
      }

      const data = await window.gently.tradingview.getChartData();
      if (data && data.data) {
        updateDataPreview(data);
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 2000);
}

function updateDataPreview(data) {
  const preview = document.getElementById('tvDataPreview');
  if (!preview || !data.data || data.data.length === 0) return;

  const rows = data.data.slice(-10).reverse();
  let html = `<table class="tv-data-table">
    <tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Vol</th></tr>`;

  rows.forEach(row => {
    const date = new Date(row.timestamp).toLocaleString();
    html += `<tr>
      <td>${date}</td>
      <td>${row.open?.toFixed(2)}</td>
      <td>${row.high?.toFixed(2)}</td>
      <td>${row.low?.toFixed(2)}</td>
      <td>${row.close?.toFixed(2)}</td>
      <td>${row.volume?.toFixed(0)}</td>
    </tr>`;
  });

  html += '</table>';
  preview.innerHTML = html;
}

// PineScript Template buttons
document.querySelectorAll('.pine-template-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const template = btn.dataset.template;
    document.querySelectorAll('.pine-template-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    try {
      const code = await window.gently.tradingview.getTemplateCode(template);
      if (code) {
        // Fill in some default values
        let filled = code
          .replace(/\{\{name\}\}/g, 'My Strategy')
          .replace(/\{\{capital\}\}/g, '10000')
          .replace(/\{\{qty\}\}/g, '10')
          .replace(/\{\{length\}\}/g, '14')
          .replace(/\{\{rsi_length\}\}/g, '14')
          .replace(/\{\{overbought\}\}/g, '70')
          .replace(/\{\{oversold\}\}/g, '30')
          .replace(/\{\{fast\}\}/g, '12')
          .replace(/\{\{slow\}\}/g, '26')
          .replace(/\{\{signal\}\}/g, '9')
          .replace(/\{\{mult\}\}/g, '2.0');

        document.getElementById('pineCodeEditor').value = filled;
      }
    } catch (e) {
      console.error('Template load error:', e);
    }
  });
});

async function injectPineScript() {
  const code = document.getElementById('pineCodeEditor').value;
  if (!code.trim()) {
    alert('Please enter PineScript code');
    return;
  }

  const output = document.getElementById('pineOutput');
  output.textContent = 'Injecting...';
  output.className = 'pine-output';

  try {
    const result = await window.gently.tradingview.injectPine(code);
    if (result.success) {
      output.textContent = 'Successfully injected to TradingView!';
      output.className = 'pine-output success';
    } else {
      output.textContent = 'Errors: ' + (result.errors?.join(', ') || 'Unknown error');
      output.className = 'pine-output error';
    }
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
    output.className = 'pine-output error';
  }
}

function validatePineScript() {
  const code = document.getElementById('pineCodeEditor').value;
  const output = document.getElementById('pineOutput');

  // Basic validation
  if (!code.includes('//@version=')) {
    output.textContent = 'Warning: Missing version directive (e.g., //@version=5)';
    output.className = 'pine-output error';
    return;
  }

  if (!code.includes('strategy(') && !code.includes('indicator(')) {
    output.textContent = 'Warning: Missing strategy() or indicator() declaration';
    output.className = 'pine-output error';
    return;
  }

  output.textContent = 'Basic validation passed. Inject to TradingView for full validation.';
  output.className = 'pine-output success';
}

// Strategy management
async function loadStrategies() {
  try {
    const strategies = await window.gently.tradingview.listStrategies();
    const list = document.getElementById('strategyList');

    list.innerHTML = strategies.length ?
      strategies.map(s => `
        <div class="strategy-item">
          <div class="strategy-info">
            <div class="strategy-name">${s.name}</div>
            <div class="strategy-meta">${s.symbol} | ${s.template} | $${s.capital}</div>
          </div>
          <div class="strategy-actions">
            <button class="strategy-btn deploy" onclick="deployStrategy('${s.id}')">Deploy</button>
            <button class="strategy-btn" onclick="deleteStrategy('${s.id}')">Delete</button>
          </div>
        </div>
      `).join('') :
      '<div class="strategy-item"><span class="strategy-meta">No strategies. Create one to get started.</span></div>';
  } catch (e) {
    console.error('Load strategies error:', e);
  }
}

function createNewStrategy() {
  document.getElementById('strategyForm').classList.remove('hidden');
}

function cancelStrategy() {
  document.getElementById('strategyForm').classList.add('hidden');
}

async function saveStrategy() {
  const name = document.getElementById('strategyName').value || 'My Strategy';
  const template = document.getElementById('strategyTemplate').value;
  const capital = parseInt(document.getElementById('strategyCapital').value) || 10000;
  const positionSize = parseInt(document.getElementById('strategyPosition').value) || 10;
  const symbol = document.getElementById('tvSymbol').value || 'BTCUSD';

  // Default parameters based on template
  const params = {
    basic_strategy: { length: 14 },
    rsi_strategy: { rsi_length: 14, overbought: 70, oversold: 30 },
    macd_strategy: { fast: 12, slow: 26, signal: 9 },
    bollinger_strategy: { length: 20, mult: 2.0 },
  };

  try {
    const strategy = await window.gently.tradingview.createStrategy({
      name,
      symbol,
      template,
      capital,
      positionSize,
      parameters: params[template] || {},
    });

    // Auto-deploy
    await deployStrategy(strategy.id);

    document.getElementById('strategyForm').classList.add('hidden');
    loadStrategies();
  } catch (e) {
    alert('Error creating strategy: ' + e.message);
  }
}

async function deployStrategy(strategyId) {
  try {
    const result = await window.gently.tradingview.deployStrategy(strategyId);
    if (result.success) {
      alert('Strategy deployed to TradingView!');
      showBacktestResults();
    } else {
      alert('Deploy error: ' + (result.errors?.join(', ') || result.error));
    }
  } catch (e) {
    alert('Deploy error: ' + e.message);
  }
}

async function deleteStrategy(strategyId) {
  if (!confirm('Delete this strategy?')) return;
  await window.gently.tradingview.deleteStrategy(strategyId);
  loadStrategies();
}

async function showBacktestResults() {
  const resultsDiv = document.getElementById('backtestResults');
  const grid = document.getElementById('resultsGrid');

  try {
    const results = await window.gently.tradingview.getStrategyResults();
    if (results) {
      resultsDiv.classList.remove('hidden');
      grid.innerHTML = `
        <div class="result-item">
          <div class="result-label">Net Profit</div>
          <div class="result-value ${parseFloat(results.netProfit) >= 0 ? 'positive' : 'negative'}">${results.netProfit}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Trades</div>
          <div class="result-value">${results.totalTrades}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Win Rate</div>
          <div class="result-value">${results.winRate}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Profit Factor</div>
          <div class="result-value">${results.profitFactor}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Max Drawdown</div>
          <div class="result-value negative">${results.maxDrawdown}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Sharpe Ratio</div>
          <div class="result-value">${results.sharpeRatio}</div>
        </div>
      `;
    }
  } catch (e) {
    console.error('Backtest results error:', e);
  }
}

// Export functions
async function exportToCSV() {
  try {
    const result = await window.gently.tradingview.exportCSV();
    if (result.success) {
      alert(`Exported ${result.rows} rows to: ${result.filePath}`);
    } else {
      alert('Export error: ' + result.error);
    }
  } catch (e) {
    alert('Export error: ' + e.message);
  }
}

async function showCSVInChat() {
  const limit = parseInt(document.getElementById('exportRows').value) || 100;

  try {
    const data = await window.gently.tradingview.getCSVString(limit);
    if (data && data.csv) {
      document.getElementById('csvContent').textContent = data.csv;
      document.getElementById('csvPreview').scrollTop = 0;

      // Could also send to chat pane here
      alert(`Showing ${data.rows} rows of ${data.symbol} (${data.timeframe})`);
    } else {
      alert('No data available. Connect to TradingView first.');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function captureChartImage() {
  try {
    const dataUrl = await window.gently.tradingview.captureChart();
    if (dataUrl) {
      // Open in new window or show preview
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';

      const preview = document.getElementById('csvPreview');
      preview.innerHTML = '';
      preview.appendChild(img);
    } else {
      alert('Could not capture chart. Make sure TradingView is connected.');
    }
  } catch (e) {
    alert('Capture error: ' + e.message);
  }
}

// TradingView event listeners
if (window.gently?.tradingview) {
  window.gently.tradingview.onConnected(() => {
    tvConnected = true;
    updateTVStatus();
  });
  window.gently.tradingview.onDisconnected(() => {
    tvConnected = false;
    updateTVStatus();
  });
  window.gently.tradingview.onChartData((data) => {
    updateDataPreview(data);
  });
  window.gently.tradingview.onPineInjected((data) => {
    const output = document.getElementById('pineOutput');
    if (output) {
      if (data.errors && data.errors.length > 0) {
        output.textContent = 'Errors: ' + data.errors.join(', ');
        output.className = 'pine-output error';
      } else {
        output.textContent = 'Code injected successfully!';
        output.className = 'pine-output success';
      }
    }
  });
  window.gently.tradingview.onExported((data) => {
    console.log('Exported:', data);
  });
}

// ========== TAB SWITCHING ==========
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('mtab')) {
    const panel = e.target.dataset.panel;
    const tabs = e.target.parentElement;
    const body = tabs.parentElement;
    tabs.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    body.querySelectorAll('.modal-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(panel)?.classList.remove('hidden');
  }
  if (e.target.classList.contains('preset-btn')) {
    applyPreset(e.target.dataset.preset);
  }
});

// ========== RIGHT SHELF CLICK HANDLERS ==========
document.getElementById('rb-dns')?.addEventListener('click', openDNSModal);
document.getElementById('rb-phone')?.addEventListener('click', openTelephonyModal);
document.getElementById('rb-mail')?.addEventListener('click', openGmailModal);
document.getElementById('rb-models')?.addEventListener('click', openModelHubModal);
document.getElementById('rb-video')?.addEventListener('click', openLivepeerModal);
document.getElementById('rb-face')?.addEventListener('click', openFaceTrackingModal);
document.getElementById('rb-avatar')?.addEventListener('click', openAvatarModal);
document.getElementById('rb-graphics')?.addEventListener('click', openGraphicsModal);
document.getElementById('rb-tabs')?.addEventListener('click', openTabsModal);
document.getElementById('rb-intro')?.addEventListener('click', openIntroModal);
document.getElementById('rb-tradingview')?.addEventListener('click', openTradingViewModal);

// New modal exports
window.openDNSModal = openDNSModal;
window.closeDNSModal = closeDNSModal;
window.openTelephonyModal = openTelephonyModal;
window.closeTelephonyModal = closeTelephonyModal;
window.sendSMS = sendSMS;
window.openGmailModal = openGmailModal;
window.closeGmailModal = closeGmailModal;
window.addGmailAccount = addGmailAccount;
window.sendEmail = sendEmail;
window.openModelHubModal = openModelHubModal;
window.closeModelHubModal = closeModelHubModal;
window.toggleMCPServer = toggleMCPServer;
window.downloadHF = downloadHF;
window.downloadOllama = downloadOllama;
window.openLivepeerModal = openLivepeerModal;
window.closeLivepeerModal = closeLivepeerModal;
window.createStream = createStream;

// Face Tracking exports
window.openFaceTrackingModal = openFaceTrackingModal;
window.closeFaceTrackingModal = closeFaceTrackingModal;
window.toggleFaceTracking = toggleFaceTracking;
window.calibrateFace = calibrateFace;

// Avatar Studio exports
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.selectAvatar = selectAvatar;
window.createNewAvatar = createNewAvatar;
window.createCustomAnimation = createCustomAnimation;

// Realtime Graphics exports
window.openGraphicsModal = openGraphicsModal;
window.closeGraphicsModal = closeGraphicsModal;
window.addGraphicsLayer = addGraphicsLayer;
window.addChatBubbleOverlay = addChatBubbleOverlay;
window.clearChatBubbles = clearChatBubbles;

// Tab Switcher exports
window.openTabsModal = openTabsModal;
window.closeTabsModal = closeTabsModal;
window.createNewTab = createNewTab;
window.switchTab = switchTab;
window.closeTab = closeTab;
window.goBackTab = goBackTab;
window.goForwardTab = goForwardTab;
window.createNewGroup = createNewGroup;
window.toggleAutoRotation = toggleAutoRotation;

// Intro Creator exports
window.openIntroModal = openIntroModal;
window.closeIntroModal = closeIntroModal;
window.addIntroText = addIntroText;
window.addIntroShape = addIntroShape;
window.toggleIntroPlay = toggleIntroPlay;

// TradingView exports
window.openTradingViewModal = openTradingViewModal;
window.closeTradingViewModal = closeTradingViewModal;
window.toggleTVConnect = toggleTVConnect;
window.applyTVSettings = applyTVSettings;
window.injectPineScript = injectPineScript;
window.validatePineScript = validatePineScript;
window.createNewStrategy = createNewStrategy;
window.cancelStrategy = cancelStrategy;
window.saveStrategy = saveStrategy;
window.deployStrategy = deployStrategy;
window.deleteStrategy = deleteStrategy;
window.exportToCSV = exportToCSV;
window.showCSVInChat = showCSVInChat;
window.captureChartImage = captureChartImage;

// Agent exports (Dev Tier)
window.openAgentModal = openAgentModal;
window.closeAgentModal = closeAgentModal;
window.switchAgentTab = switchAgentTab;
window.refreshAgents = refreshAgents;
window.quickCreateAgent = quickCreateAgent;
window.createAgent = createAgent;
window.removeAgent = removeAgent;
window.showAgentCapabilities = showAgentCapabilities;

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
