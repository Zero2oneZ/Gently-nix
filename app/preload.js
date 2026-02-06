// Preload script - bridge between renderer and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gently', {
  // Setup
  isFirstBoot: () => ipcRenderer.invoke('is-first-boot'),
  getSSHPubKey: () => ipcRenderer.invoke('get-ssh-pubkey'),
  completeSetup: (data) => ipcRenderer.invoke('complete-setup', data),

  // Projects
  createProject: (name) => ipcRenderer.invoke('create-project', { name }),
  addClan: (projectId, name, context) => ipcRenderer.invoke('add-clan', { projectId, name, context }),
  collapse: (projectId, clanIds, name) => ipcRenderer.invoke('collapse', { projectId, clanIds, name }),

  // Stamps
  getStamp: (projectId, clanId) => ipcRenderer.invoke('get-stamp', { projectId, clanId }),

  // Git
  gitHash: (dir) => ipcRenderer.invoke('git-hash', { dir }),

  // Claude CLI
  cliSend: (instruction, workDir) => ipcRenderer.invoke('cli-send', { instruction, workDir }),

  // Windows
  spawnWindow: (windowData) => ipcRenderer.invoke('spawn-window', { windowData }),

  // Events from main
  onConstantsLoaded: (callback) => ipcRenderer.on('constants-loaded', (e, data) => callback(data)),
  onWindowData: (callback) => ipcRenderer.on('window-data', (e, data) => callback(data)),
  onCLIOutput: (callback) => ipcRenderer.on('cli-output', (e, data) => callback(data)),
  onGuardDogBlocked: (callback) => ipcRenderer.on('guarddog-blocked', (e, data) => callback(data)),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // GuardDog IO Defense
  guarddog: {
    scan: (input) => ipcRenderer.invoke('guarddog-scan', { input }),
    clean: (input) => ipcRenderer.invoke('guarddog-clean', { input }),
    process: (input) => ipcRenderer.invoke('guarddog-process', { input }),
    init: (nodeModulesDir) => ipcRenderer.invoke('guarddog-init', { nodeModulesDir }),
  },

  // Tier System - Code-Locked Rotation
  tier: {
    getEffective: () => ipcRenderer.invoke('tier:get-effective'),
    checkFeature: (feature) => ipcRenderer.invoke('tier:check-feature', { feature }),
    getScopeFeatures: (scope) => ipcRenderer.invoke('tier:get-scope-features', { scope }),
    getAllFeatures: () => ipcRenderer.invoke('tier:get-all-features'),
    onTierChange: (cb) => ipcRenderer.on('rotation:tier-change', (_, data) => cb(data)),
    onFeaturesChanged: (cb) => ipcRenderer.on('rotation:features-changed', (_, data) => cb(data)),
  },

  // Bridge API
  bridge: {
    status: () => ipcRenderer.invoke('bridge:status'),
    rpc: (method, params) => ipcRenderer.invoke('bridge:rpc', { method, params }),
    feedList: (limit) => ipcRenderer.invoke('bridge:feed-list', { limit }),
    feedFork: (id) => ipcRenderer.invoke('bridge:feed-fork', { id }),
    search: (query, options) => ipcRenderer.invoke('bridge:search', { query, options }),
    gedTranslate: (text, mode) => ipcRenderer.invoke('bridge:ged-translate', { text, mode }),
    mcpTools: () => ipcRenderer.invoke('bridge:mcp-tools'),
    onStatusChange: (cb) => ipcRenderer.on('rotation:bridge-status', (_, data) => cb(data)),
  },

  // CLI Integration
  cli: {
    invoke: (cmd, args) => ipcRenderer.invoke('cli:invoke', { cmd, args }),
    feedList: () => ipcRenderer.invoke('cli:feed-list'),
    search: (query) => ipcRenderer.invoke('cli:search', { query }),
    mcpTools: () => ipcRenderer.invoke('cli:mcp-tools'),
    gooSample: (count) => ipcRenderer.invoke('cli:goo-sample', { count }),
  },

  // Living Feed
  feed: {
    list: () => ipcRenderer.invoke('feed:list'),
    add: (name, kind, content) => ipcRenderer.invoke('feed:add', { name, kind, content }),
    boost: (itemId, amount) => ipcRenderer.invoke('feed:boost', { itemId, amount }),
    addStep: (itemId, content) => ipcRenderer.invoke('feed:add-step', { itemId, content }),
    completeStep: (itemId, stepId) => ipcRenderer.invoke('feed:complete-step', { itemId, stepId }),
    togglePin: (itemId) => ipcRenderer.invoke('feed:toggle-pin', { itemId }),
    verify: (itemId) => ipcRenderer.invoke('feed:verify', { itemId }),
    getSorted: () => ipcRenderer.invoke('feed:get-sorted'),
    getByState: (state) => ipcRenderer.invoke('feed:get-by-state', { state }),
  },

  // Document System (Three-Chain)
  doc: {
    list: () => ipcRenderer.invoke('doc:list'),
    get: (docId) => ipcRenderer.invoke('doc:get', { docId }),
    create: (name, docType) => ipcRenderer.invoke('doc:create', { name, docType }),
    addUserStep: (docId, content) => ipcRenderer.invoke('doc:add-user-step', { docId, content }),
    addClaudeStep: (docId, content) => ipcRenderer.invoke('doc:add-claude-step', { docId, content }),
    action: (docId, action) => ipcRenderer.invoke('doc:action', { docId, action }),
    verify: (docId) => ipcRenderer.invoke('doc:verify', { docId }),
    finalize: (docId) => ipcRenderer.invoke('doc:finalize', { docId }),
  },

  // G.E.D. System (Generative Educational Device)
  ged: {
    translate: (concept, domain) => ipcRenderer.invoke('ged:translate', { concept, domain }),
    analyze: (concept) => ipcRenderer.invoke('ged:analyze', { concept }),
    mastery: (conceptId, userId) => ipcRenderer.invoke('ged:mastery', { conceptId, userId }),
    badge: (conceptId, userId) => ipcRenderer.invoke('ged:badge', { conceptId, userId }),
    recordExercise: (conceptId, score, evidence) => ipcRenderer.invoke('ged:record-exercise', { conceptId, score, evidence }),
    recordExplain: (conceptId, score, evidence) => ipcRenderer.invoke('ged:record-explain', { conceptId, score, evidence }),
    domains: () => ipcRenderer.invoke('ged:domains'),
  },

  // Search System (Alexandria)
  search: {
    query: (query, options) => ipcRenderer.invoke('search:query', { query, options }),
    query5W: (params) => ipcRenderer.invoke('search:5w', params),
    collapse: (pin, collapse, enumerate, limit) => ipcRenderer.invoke('search:collapse', { pin, collapse, enumerate, limit }),
    navigate: (conceptId, mode) => ipcRenderer.invoke('search:navigate', { conceptId, mode }),
    addThought: (content, shape, metadata) => ipcRenderer.invoke('search:add-thought', { content, shape, metadata }),
    wormholes: (conceptId) => ipcRenderer.invoke('search:wormholes', { conceptId }),
  },

  // GOO Field (Unified Distance Field Engine)
  goo: {
    createField: (blend) => ipcRenderer.invoke('goo:create-field', { blend }),
    addRegion: (region) => ipcRenderer.invoke('goo:add-region', { region }),
    sample: (x, y) => ipcRenderer.invoke('goo:sample', { x, y }),
    attend: (x, y) => ipcRenderer.invoke('goo:attend', { x, y }),
    colorAt: (x, y) => ipcRenderer.invoke('goo:color-at', { x, y }),
    renderSvg: (width, height) => ipcRenderer.invoke('goo:render-svg', { width, height }),
    demo: (regions, blend) => ipcRenderer.invoke('goo:demo', { regions, blend }),
    claude: (emotion) => ipcRenderer.invoke('goo:claude', { emotion }),
    stats: () => ipcRenderer.invoke('goo:stats'),
    toJson: () => ipcRenderer.invoke('goo:to-json'),
    fromJson: (json) => ipcRenderer.invoke('goo:from-json', { json }),
  },

  // SVG Visual (Pattern Generation)
  svg: {
    generatePattern: (config) => ipcRenderer.invoke('svg:generate-pattern', { config }),
    createComponent: (type, props) => ipcRenderer.invoke('svg:create-component', { type, props }),
    compose: (elements, config) => ipcRenderer.invoke('svg:compose', { elements, config }),
    generateDecoys: (pattern, count) => ipcRenderer.invoke('svg:generate-decoys', { pattern, count }),
    setDimensions: (width, height) => ipcRenderer.invoke('svg:set-dimensions', { width, height }),
  },

  // Porkbun API (Pro Tier - Domain Management)
  porkbun: {
    // Configuration
    configure: (apiKey, secretApiKey) => ipcRenderer.invoke('porkbun:configure', { apiKey, secretApiKey }),
    isConfigured: () => ipcRenderer.invoke('porkbun:is-configured'),
    ping: () => ipcRenderer.invoke('porkbun:ping'),
    // Domains
    listDomains: (start, includeLabels) => ipcRenderer.invoke('porkbun:list-domains', { start, includeLabels }),
    checkDomain: (domain) => ipcRenderer.invoke('porkbun:check-domain', { domain }),
    getPricing: () => ipcRenderer.invoke('porkbun:get-pricing'),
    getNameservers: (domain) => ipcRenderer.invoke('porkbun:get-nameservers', { domain }),
    updateNameservers: (domain, nameservers) => ipcRenderer.invoke('porkbun:update-nameservers', { domain, nameservers }),
    setAutoRenew: (domain, status) => ipcRenderer.invoke('porkbun:set-auto-renew', { domain, status }),
    // DNS Records
    createRecord: (domain, record) => ipcRenderer.invoke('porkbun:create-record', { domain, record }),
    getRecords: (domain, recordId) => ipcRenderer.invoke('porkbun:get-records', { domain, recordId }),
    editRecord: (domain, recordId, record) => ipcRenderer.invoke('porkbun:edit-record', { domain, recordId, record }),
    deleteRecord: (domain, recordId) => ipcRenderer.invoke('porkbun:delete-record', { domain, recordId }),
    // SSL
    getSSL: (domain) => ipcRenderer.invoke('porkbun:get-ssl', { domain }),
    // URL Forwarding
    addForward: (domain, config) => ipcRenderer.invoke('porkbun:add-forward', { domain, config }),
    getForwards: (domain) => ipcRenderer.invoke('porkbun:get-forwards', { domain }),
    deleteForward: (domain, recordId) => ipcRenderer.invoke('porkbun:delete-forward', { domain, recordId }),
    // Dynamic DNS
    updateARecord: (domain, subdomain, ip) => ipcRenderer.invoke('porkbun:update-a-record', { domain, subdomain, ip }),
    getPublicIP: () => ipcRenderer.invoke('porkbun:get-public-ip'),
  },

  // Huggingface API (Dev Tier)
  huggingface: {
    configure: (apiKey) => ipcRenderer.invoke('huggingface:configure', { apiKey }),
    isConfigured: () => ipcRenderer.invoke('huggingface:is-configured'),
    chat: (model, messages, options) => ipcRenderer.invoke('huggingface:chat', { model, messages, options }),
    generate: (model, prompt, options) => ipcRenderer.invoke('huggingface:generate', { model, prompt, options }),
    summarize: (model, text, options) => ipcRenderer.invoke('huggingface:summarize', { model, text, options }),
    classify: (model, text, labels) => ipcRenderer.invoke('huggingface:classify', { model, text, labels }),
    embed: (model, texts) => ipcRenderer.invoke('huggingface:embed', { model, texts }),
    getModels: (task) => ipcRenderer.invoke('huggingface:get-models', { task }),
    getTasks: () => ipcRenderer.invoke('huggingface:get-tasks'),
  },

  // Ollama API (Dev Tier - minScore: 50)
  ollama: {
    configure: (host, port) => ipcRenderer.invoke('ollama:configure', { host, port }),
    isConfigured: () => ipcRenderer.invoke('ollama:is-configured'),
    ping: () => ipcRenderer.invoke('ollama:ping'),
    listModels: () => ipcRenderer.invoke('ollama:list-models'),
    showModel: (name) => ipcRenderer.invoke('ollama:show-model', { name }),
    pullModel: (name) => ipcRenderer.invoke('ollama:pull-model', { name }),
    deleteModel: (name) => ipcRenderer.invoke('ollama:delete-model', { name }),
    generate: (model, prompt, options) => ipcRenderer.invoke('ollama:generate', { model, prompt, options }),
    chat: (model, messages, options) => ipcRenderer.invoke('ollama:chat', { model, messages, options }),
    embed: (model, input) => ipcRenderer.invoke('ollama:embed', { model, input }),
    getRunning: () => ipcRenderer.invoke('ollama:get-running'),
    getRecommended: () => ipcRenderer.invoke('ollama:get-recommended'),
  },

  // Kaggle API (Dev Tier)
  kaggle: {
    configure: (username, apiKey) => ipcRenderer.invoke('kaggle:configure', { username, apiKey }),
    isConfigured: () => ipcRenderer.invoke('kaggle:is-configured'),
    whoami: () => ipcRenderer.invoke('kaggle:whoami'),
    listDatasets: (options) => ipcRenderer.invoke('kaggle:list-datasets', { options }),
    searchDatasets: (query, options) => ipcRenderer.invoke('kaggle:search-datasets', { query, options }),
    getDataset: (owner, slug) => ipcRenderer.invoke('kaggle:get-dataset', { owner, slug }),
    listDatasetFiles: (owner, slug) => ipcRenderer.invoke('kaggle:list-dataset-files', { owner, slug }),
    listModels: (options) => ipcRenderer.invoke('kaggle:list-models', { options }),
    searchModels: (query, options) => ipcRenderer.invoke('kaggle:search-models', { query, options }),
    listCompetitions: (options) => ipcRenderer.invoke('kaggle:list-competitions', { options }),
    getDownloadUrl: (owner, slug, version) => ipcRenderer.invoke('kaggle:get-download-url', { owner, slug, version }),
  },

  // MCP (Model Context Protocol) - Multi-Scope
  mcp: {
    configure: (scope, bridgeHost, bridgePort) => ipcRenderer.invoke('mcp:configure', { scope, bridgeHost, bridgePort }),
    isConfigured: () => ipcRenderer.invoke('mcp:is-configured'),
    getScope: () => ipcRenderer.invoke('mcp:get-scope'),
    setScope: (scope) => ipcRenderer.invoke('mcp:set-scope', { scope }),
    getTools: () => ipcRenderer.invoke('mcp:get-tools'),
    getToolsByScope: () => ipcRenderer.invoke('mcp:get-tools-by-scope'),
    executeTool: (toolId, params) => ipcRenderer.invoke('mcp:execute-tool', { toolId, params }),
    isToolAllowed: (toolId) => ipcRenderer.invoke('mcp:is-tool-allowed', { toolId }),
    getAllScopes: () => ipcRenderer.invoke('mcp:get-all-scopes'),
    checkBridge: () => ipcRenderer.invoke('mcp:check-bridge'),
  },

  // IPFS (InterPlanetary File System) - Pro Tier
  ipfs: {
    configure: (host, port, protocol) => ipcRenderer.invoke('ipfs:configure', { host, port, protocol }),
    isConfigured: () => ipcRenderer.invoke('ipfs:is-configured'),
    ping: () => ipcRenderer.invoke('ipfs:ping'),
    version: () => ipcRenderer.invoke('ipfs:version'),
    stats: () => ipcRenderer.invoke('ipfs:stats'),
    add: (content, options) => ipcRenderer.invoke('ipfs:add', { content, options }),
    addJSON: (obj) => ipcRenderer.invoke('ipfs:add-json', { obj }),
    cat: (cid) => ipcRenderer.invoke('ipfs:cat', { cid }),
    getViaGateway: (cid, gatewayIndex) => ipcRenderer.invoke('ipfs:get-via-gateway', { cid, gatewayIndex }),
    pin: (cid) => ipcRenderer.invoke('ipfs:pin', { cid }),
    unpin: (cid) => ipcRenderer.invoke('ipfs:unpin', { cid }),
    listPins: () => ipcRenderer.invoke('ipfs:list-pins'),
    publishFeedItem: (feedItem) => ipcRenderer.invoke('ipfs:publish-feed-item', { feedItem }),
    publishFeedCollection: (items, metadata) => ipcRenderer.invoke('ipfs:publish-feed-collection', { items, metadata }),
    getGatewayUrls: (cid) => ipcRenderer.invoke('ipfs:get-gateway-urls', { cid }),
    validateCID: (cid) => ipcRenderer.invoke('ipfs:validate-cid', { cid }),
  },

  // Agent System (Multi-Agent Orchestration) - Dev Tier
  agent: {
    configure: (hardwareScore, userTier) => ipcRenderer.invoke('agent:configure', { hardwareScore, userTier }),
    getAvailableTypes: () => ipcRenderer.invoke('agent:get-available-types'),
    getAllTypes: () => ipcRenderer.invoke('agent:get-all-types'),
    create: (type, config) => ipcRenderer.invoke('agent:create', { type, config }),
    get: (id) => ipcRenderer.invoke('agent:get', { id }),
    execute: (id, capability, params) => ipcRenderer.invoke('agent:execute', { id, capability, params }),
    remove: (id) => ipcRenderer.invoke('agent:remove', { id }),
    list: () => ipcRenderer.invoke('agent:list'),
    createWorkflow: (name, type, steps) => ipcRenderer.invoke('agent:create-workflow', { name, type, steps }),
    runWorkflow: (id) => ipcRenderer.invoke('agent:run-workflow', { id }),
    getWorkflow: (id) => ipcRenderer.invoke('agent:get-workflow', { id }),
    listWorkflows: () => ipcRenderer.invoke('agent:list-workflows'),
    removeWorkflow: (id) => ipcRenderer.invoke('agent:remove-workflow', { id }),
  },

  // Environment Validation
  env: {
    validate: () => ipcRenderer.invoke('env-validate'),
    status: () => ipcRenderer.invoke('env-status'),
    profile: () => ipcRenderer.invoke('env-profile'),
    score: () => ipcRenderer.invoke('env-score'),
    report: () => ipcRenderer.invoke('env-report'),
    reset: () => ipcRenderer.invoke('env-reset'),
  },

  // Dance (Device Pairing Protocol)
  dance: {
    // Session
    initLock: (lockFragment, contractId) => ipcRenderer.invoke('dance:init-lock', { lockFragment, contractId }),
    initKey: (keyFragment, contractId) => ipcRenderer.invoke('dance:init-key', { keyFragment, contractId }),
    wake: () => ipcRenderer.invoke('dance:wake'),
    state: () => ipcRenderer.invoke('dance:state'),
    start: (peerDeviceId) => ipcRenderer.invoke('dance:start', { peerDeviceId }),
    challenge: () => ipcRenderer.invoke('dance:challenge'),
    respond: (challenge) => ipcRenderer.invoke('dance:respond', { challenge }),
    exchange: (remoteFragment) => ipcRenderer.invoke('dance:exchange', { remoteFragment }),
    verify: () => ipcRenderer.invoke('dance:verify'),
    audit: (context) => ipcRenderer.invoke('dance:audit', { context }),
    abort: (reason) => ipcRenderer.invoke('dance:abort', { reason }),
    secret: () => ipcRenderer.invoke('dance:secret'),

    // Contracts
    createContract: (description) => ipcRenderer.invoke('dance:create-contract', { description }),
    getContract: (contractId) => ipcRenderer.invoke('dance:get-contract', { contractId }),
    addCondition: (contractId, type, params) => ipcRenderer.invoke('dance:add-condition', { contractId, type, params }),
    setExpiry: (contractId, blockHeight, timestamp) => ipcRenderer.invoke('dance:set-expiry', { contractId, blockHeight, timestamp }),
    signContract: (contractId, secret) => ipcRenderer.invoke('dance:sign-contract', { contractId, secret }),
    verifyContract: (contractId, secret) => ipcRenderer.invoke('dance:verify-contract', { contractId, secret }),
    listContracts: () => ipcRenderer.invoke('dance:list-contracts'),
    deleteContract: (contractId) => ipcRenderer.invoke('dance:delete-contract', { contractId }),
    useContract: (contractId) => ipcRenderer.invoke('dance:use-contract', { contractId }),

    // Visual Patterns
    generatePattern: (fragment) => ipcRenderer.invoke('dance:generate-pattern', { fragment }),
    verifyPattern: (pattern, fragment) => ipcRenderer.invoke('dance:verify-pattern', { pattern, fragment }),

    // Stats
    stats: () => ipcRenderer.invoke('dance:stats'),
    completedSessions: (limit) => ipcRenderer.invoke('dance:completed-sessions', { limit }),
    reset: () => ipcRenderer.invoke('dance:reset'),
    export: () => ipcRenderer.invoke('dance:export'),
    import: (data) => ipcRenderer.invoke('dance:import', { data }),
    constants: () => ipcRenderer.invoke('dance:constants'),
  },

  // Commerce (Vibe Commerce System)
  commerce: {
    // Query
    parseQuery: (rawInput) => ipcRenderer.invoke('commerce:parse-query', { rawInput }),
    search: (query, limit) => ipcRenderer.invoke('commerce:search', { query, limit }),
    getProduct: (productId) => ipcRenderer.invoke('commerce:get-product', { productId }),

    // Cart
    addToCart: (productId, quantity, variant) => ipcRenderer.invoke('commerce:add-to-cart', { productId, quantity, variant }),
    removeFromCart: (itemId) => ipcRenderer.invoke('commerce:remove-from-cart', { itemId }),
    updateQuantity: (itemId, quantity) => ipcRenderer.invoke('commerce:update-quantity', { itemId, quantity }),
    cartSummary: () => ipcRenderer.invoke('commerce:cart-summary'),
    applyCoupon: (code) => ipcRenderer.invoke('commerce:apply-coupon', { code }),
    clearCart: () => ipcRenderer.invoke('commerce:clear-cart'),

    // Checkout
    checkout: (paymentInfo, shippingAddress) => ipcRenderer.invoke('commerce:checkout', { paymentInfo, shippingAddress }),

    // Price Alerts
    setAlert: (productId, targetPrice) => ipcRenderer.invoke('commerce:set-alert', { productId, targetPrice }),
    listAlerts: () => ipcRenderer.invoke('commerce:list-alerts'),
    removeAlert: (alertId) => ipcRenderer.invoke('commerce:remove-alert', { alertId }),

    // Market Data
    marketData: (ticker, timeframe) => ipcRenderer.invoke('commerce:market-data', { ticker, timeframe }),
    marketAlert: (ticker, targetPrice, direction) => ipcRenderer.invoke('commerce:market-alert', { ticker, targetPrice, direction }),

    // Stores
    listStores: () => ipcRenderer.invoke('commerce:list-stores'),
    addStore: (name, domain) => ipcRenderer.invoke('commerce:add-store', { name, domain }),
    setStoreEnabled: (storeId, enabled) => ipcRenderer.invoke('commerce:set-store-enabled', { storeId, enabled }),

    // Preferences
    setPreferences: (prefs) => ipcRenderer.invoke('commerce:set-preferences', { prefs }),
    getPreferences: () => ipcRenderer.invoke('commerce:get-preferences'),
    recommendations: (limit) => ipcRenderer.invoke('commerce:recommendations', { limit }),

    // Stats
    stats: () => ipcRenderer.invoke('commerce:stats'),
    export: () => ipcRenderer.invoke('commerce:export'),
    import: (data) => ipcRenderer.invoke('commerce:import', { data }),
    constants: () => ipcRenderer.invoke('commerce:constants'),
  },

  // Sploit (Security Testing Framework)
  sploit: {
    // Modules
    searchModules: (query, type) => ipcRenderer.invoke('sploit:search-modules', { query, type }),
    getModule: (fullname) => ipcRenderer.invoke('sploit:get-module', { fullname }),
    listModules: (type) => ipcRenderer.invoke('sploit:list-modules', { type }),

    // Targets
    addTarget: (host, port) => ipcRenderer.invoke('sploit:add-target', { host, port }),
    getTarget: (targetId) => ipcRenderer.invoke('sploit:get-target', { targetId }),
    listTargets: () => ipcRenderer.invoke('sploit:list-targets'),
    removeTarget: (targetId) => ipcRenderer.invoke('sploit:remove-target', { targetId }),
    updateTarget: (targetId, updates) => ipcRenderer.invoke('sploit:update-target', { targetId, updates }),
    scanTarget: (targetId) => ipcRenderer.invoke('sploit:scan-target', { targetId }),

    // Exploitation
    check: (moduleFullname, targetId) => ipcRenderer.invoke('sploit:check', { moduleFullname, targetId }),
    exploit: (moduleFullname, targetId, options) => ipcRenderer.invoke('sploit:exploit', { moduleFullname, targetId, options }),
    runAuxiliary: (moduleFullname, targetId, options) => ipcRenderer.invoke('sploit:run-auxiliary', { moduleFullname, targetId, options }),

    // Sessions
    listSessions: (activeOnly) => ipcRenderer.invoke('sploit:list-sessions', { activeOnly }),
    getSession: (sessionId) => ipcRenderer.invoke('sploit:get-session', { sessionId }),
    interact: (sessionId, command) => ipcRenderer.invoke('sploit:interact', { sessionId, command }),
    closeSession: (sessionId) => ipcRenderer.invoke('sploit:close-session', { sessionId }),
    sessionHistory: (sessionId, limit) => ipcRenderer.invoke('sploit:session-history', { sessionId, limit }),

    // Workspace
    getWorkspace: () => ipcRenderer.invoke('sploit:get-workspace'),
    saveWorkspace: () => ipcRenderer.invoke('sploit:save-workspace'),
    loadWorkspace: (data) => ipcRenderer.invoke('sploit:load-workspace', { data }),
    addCredential: (username, password, service, targetId) => ipcRenderer.invoke('sploit:add-credential', { username, password, service, targetId }),
    listCredentials: () => ipcRenderer.invoke('sploit:list-credentials'),

    // Global options
    getOptions: () => ipcRenderer.invoke('sploit:get-options'),
    setOption: (name, value) => ipcRenderer.invoke('sploit:set-option', { name, value }),

    // Stats
    stats: () => ipcRenderer.invoke('sploit:stats'),
    reset: () => ipcRenderer.invoke('sploit:reset'),
    constants: () => ipcRenderer.invoke('sploit:constants'),
  },

  // Network (Security Visualization)
  network: {
    // Firewall
    firewallCheck: (sourceIP, destIP, destPort, protocol, direction) => ipcRenderer.invoke('network:firewall-check', { sourceIP, destIP, destPort, protocol, direction }),
    addRule: (rule) => ipcRenderer.invoke('network:firewall-add-rule', { rule }),
    removeRule: (ruleId) => ipcRenderer.invoke('network:firewall-remove-rule', { ruleId }),
    updateRule: (ruleId, updates) => ipcRenderer.invoke('network:firewall-update-rule', { ruleId, updates }),
    listRules: () => ipcRenderer.invoke('network:firewall-list-rules'),
    blockIP: (ip) => ipcRenderer.invoke('network:firewall-block', { ip }),
    allowIP: (ip) => ipcRenderer.invoke('network:firewall-allow', { ip }),
    firewallStatus: () => ipcRenderer.invoke('network:firewall-status'),
    setFirewallEnabled: (enabled) => ipcRenderer.invoke('network:firewall-set-enabled', { enabled }),

    // Monitor
    getEvents: (limit, filter) => ipcRenderer.invoke('network:monitor-events', { limit, filter }),
    getStats: () => ipcRenderer.invoke('network:monitor-stats'),

    // Capture
    startCapture: (filter) => ipcRenderer.invoke('network:capture-start', { filter }),
    stopCapture: (sessionId) => ipcRenderer.invoke('network:capture-stop', { sessionId }),
    getPackets: (sessionId, limit, offset) => ipcRenderer.invoke('network:capture-packets', { sessionId, limit, offset }),
    listCaptures: () => ipcRenderer.invoke('network:capture-list'),

    // Topology
    getTopology: () => ipcRenderer.invoke('network:topology'),
    renderTopology: () => ipcRenderer.invoke('network:render-topology'),

    // Proxy
    configureProxy: (config) => ipcRenderer.invoke('network:proxy-configure', { config }),
    getProxyConfig: () => ipcRenderer.invoke('network:proxy-config'),
    getProxyHistory: (limit) => ipcRenderer.invoke('network:proxy-history', { limit }),

    // Export/Import
    export: () => ipcRenderer.invoke('network:export'),
    import: (data) => ipcRenderer.invoke('network:import', { data }),
    reset: () => ipcRenderer.invoke('network:reset'),
    constants: () => ipcRenderer.invoke('network:constants'),
  },

  // Behavior (Adaptive UI Learning)
  behavior: {
    observe: (action) => ipcRenderer.invoke('behavior:observe', { action }),
    predict: () => ipcRenderer.invoke('behavior:predict'),
    chains: () => ipcRenderer.invoke('behavior:chains'),
    adaptations: (level) => ipcRenderer.invoke('behavior:adaptations', { level }),
    stats: () => ipcRenderer.invoke('behavior:stats'),
    reset: () => ipcRenderer.invoke('behavior:reset'),
    configure: (config) => ipcRenderer.invoke('behavior:configure', { config }),
    setEnabled: (enabled) => ipcRenderer.invoke('behavior:set-enabled', { enabled }),
    export: () => ipcRenderer.invoke('behavior:export'),
    import: (data) => ipcRenderer.invoke('behavior:import', { data }),
    history: (limit) => ipcRenderer.invoke('behavior:history', { limit }),
    actionTypes: () => ipcRenderer.invoke('behavior:action-types'),
  },

  // Architect (Idea Crystallization Engine)
  architect: {
    // Idea operations
    createIdea: (content, tags) => ipcRenderer.invoke('architect:create-idea', { content, tags }),
    getIdea: (ideaId) => ipcRenderer.invoke('architect:get-idea', { ideaId }),
    listIdeas: (state) => ipcRenderer.invoke('architect:list-ideas', { state }),
    embedIdea: (ideaId, embedding, chain) => ipcRenderer.invoke('architect:embed-idea', { ideaId, embedding, chain }),
    confirmIdea: (ideaId) => ipcRenderer.invoke('architect:confirm-idea', { ideaId }),
    crystallizeIdea: (ideaId, sourceFile) => ipcRenderer.invoke('architect:crystallize-idea', { ideaId, sourceFile }),
    branchIdea: (ideaId, newContent) => ipcRenderer.invoke('architect:branch-idea', { ideaId, newContent }),
    connectIdeas: (ideaA, ideaB) => ipcRenderer.invoke('architect:connect-ideas', { ideaA, ideaB }),
    scoreIdea: (ideaId, clarity, feasibility, impact, completeness) => ipcRenderer.invoke('architect:score-idea', { ideaId, clarity, feasibility, impact, completeness }),
    tagIdea: (ideaId, tags) => ipcRenderer.invoke('architect:tag-idea', { ideaId, tags }),

    // Tree operations
    createTree: (name, rootPath) => ipcRenderer.invoke('architect:create-tree', { name, rootPath }),
    setTree: (treeId) => ipcRenderer.invoke('architect:set-tree', { treeId }),
    getTree: () => ipcRenderer.invoke('architect:get-tree'),
    listTrees: () => ipcRenderer.invoke('architect:list-trees'),
    addDirectory: (name, parentId) => ipcRenderer.invoke('architect:add-directory', { name, parentId }),
    addFile: (name, parentId, language) => ipcRenderer.invoke('architect:add-file', { name, parentId, language }),
    linkIdea: (nodeId, ideaId) => ipcRenderer.invoke('architect:link-idea', { nodeId, ideaId }),
    renderTree: (treeId) => ipcRenderer.invoke('architect:render-tree', { treeId }),

    // Recall operations
    recall: (query, limit) => ipcRenderer.invoke('architect:recall', { query, limit }),
    suggest: (limit) => ipcRenderer.invoke('architect:suggest', { limit }),
    rank: (limit) => ipcRenderer.invoke('architect:rank', { limit }),

    // Flowchart
    flowchart: (rootIdeaId) => ipcRenderer.invoke('architect:flowchart', { rootIdeaId }),

    // Export/Import
    export: () => ipcRenderer.invoke('architect:export'),
    import: (data) => ipcRenderer.invoke('architect:import', { data }),
    stats: () => ipcRenderer.invoke('architect:stats'),
    ideaStates: () => ipcRenderer.invoke('architect:idea-states'),
  },

  // Artisan (Toroidal Knowledge Storage)
  artisan: {
    // Torus operations
    createTorus: (label, majorRadius, tokensSpent) => ipcRenderer.invoke('artisan:create-torus', { label, majorRadius, tokensSpent }),
    getTorus: (torusId) => ipcRenderer.invoke('artisan:get-torus', { torusId }),
    listTori: () => ipcRenderer.invoke('artisan:list-tori'),
    addTokens: (torusId, tokens) => ipcRenderer.invoke('artisan:add-tokens', { torusId, tokens }),
    refine: (torusId) => ipcRenderer.invoke('artisan:refine', { torusId }),
    validate: (torusId, bsScore) => ipcRenderer.invoke('artisan:validate', { torusId, bsScore }),
    addPoint: (torusId, majorAngle, minorAngle, contentHash) => ipcRenderer.invoke('artisan:add-point', { torusId, majorAngle, minorAngle, contentHash }),

    // Blend operations
    blend: (torusIdA, torusIdB, strength) => ipcRenderer.invoke('artisan:blend', { torusIdA, torusIdB, strength }),
    getNeighbors: (torusId) => ipcRenderer.invoke('artisan:get-neighbors', { torusId }),
    decayBlends: (factor) => ipcRenderer.invoke('artisan:decay-blends', { factor }),
    boostBlend: (blendId, amount) => ipcRenderer.invoke('artisan:boost-blend', { blendId, amount }),

    // Traversal and search
    traverse: (startId, endId, maxDepth) => ipcRenderer.invoke('artisan:traverse', { startId, endId, maxDepth }),
    query: (queryVector, xorKey) => ipcRenderer.invoke('artisan:query', { queryVector, xorKey }),

    // Foam operations
    createFoam: (name) => ipcRenderer.invoke('artisan:create-foam', { name }),
    setFoam: (name) => ipcRenderer.invoke('artisan:set-foam', { name }),
    stats: () => ipcRenderer.invoke('artisan:stats'),
    render: () => ipcRenderer.invoke('artisan:render'),
    export: () => ipcRenderer.invoke('artisan:export'),
    import: (data) => ipcRenderer.invoke('artisan:import', { data }),

    // Reference
    windingLevels: () => ipcRenderer.invoke('artisan:winding-levels'),
  },

  // =============================================
  // PHASE 9: Core (XOR Cryptographic Foundation)
  // =============================================
  core: {
    initVault: (masterKey) => ipcRenderer.invoke('core:init-vault', { masterKey }),
    storeKey: (name, keyType, data) => ipcRenderer.invoke('core:store-key', { name, keyType, data }),
    retrieveKey: (name) => ipcRenderer.invoke('core:retrieve-key', { name }),
    listKeys: () => ipcRenderer.invoke('core:list-keys'),
    deleteKey: (name) => ipcRenderer.invoke('core:delete-key', { name }),
    createLock: (data, mode) => ipcRenderer.invoke('core:create-lock', { data, mode }),
    applyKey: (lockId, keyData) => ipcRenderer.invoke('core:apply-key', { lockId, keyData }),
    xor: (a, b) => ipcRenderer.invoke('core:xor', { a, b }),
    deriveKey: (purpose, context, length) => ipcRenderer.invoke('core:derive-key', { purpose, context, length }),
    encodePattern: (data, pattern) => ipcRenderer.invoke('core:encode-pattern', { data, pattern }),
    decodePattern: (encoded, pattern) => ipcRenderer.invoke('core:decode-pattern', { encoded, pattern }),
    genesisKey: () => ipcRenderer.invoke('core:genesis-key'),
    storeBlob: (data, metadata) => ipcRenderer.invoke('core:store-blob', { data, metadata }),
    retrieveBlob: (blobId) => ipcRenderer.invoke('core:retrieve-blob', { blobId }),
    listBlobs: () => ipcRenderer.invoke('core:list-blobs'),
    stats: () => ipcRenderer.invoke('core:stats'),
    constants: () => ipcRenderer.invoke('core:constants'),
  },

  // =============================================
  // PHASE 9: Cipher (Cryptanalysis Toolkit)
  // =============================================
  cipher: {
    identify: (text) => ipcRenderer.invoke('cipher:identify', { text }),
    analyzeFrequency: (text) => ipcRenderer.invoke('cipher:analyze-frequency', { text }),
    hash: (data, algorithm) => ipcRenderer.invoke('cipher:hash', { data, algorithm }),
    encode: (data, encoding) => ipcRenderer.invoke('cipher:encode', { data, encoding }),
    decode: (data, encoding) => ipcRenderer.invoke('cipher:decode', { data, encoding }),
    xor: (data, key) => ipcRenderer.invoke('cipher:xor', { data, key }),
    xorAnalyze: (ciphertext) => ipcRenderer.invoke('cipher:xor-analyze', { ciphertext }),
    caesar: (text, shift, decrypt) => ipcRenderer.invoke('cipher:caesar', { text, shift, decrypt }),
    vigenere: (text, key, decrypt) => ipcRenderer.invoke('cipher:vigenere', { text, key, decrypt }),
    rot13: (text) => ipcRenderer.invoke('cipher:rot13', { text }),
    morseEncode: (text) => ipcRenderer.invoke('cipher:morse-encode', { text }),
    morseDecode: (morse) => ipcRenderer.invoke('cipher:morse-decode', { morse }),
    stats: () => ipcRenderer.invoke('cipher:stats'),
    constants: () => ipcRenderer.invoke('cipher:constants'),
  },

  // =============================================
  // PHASE 9: Audio (Dual-Mode Audio Engine)
  // =============================================
  audio: {
    setMode: (mode) => ipcRenderer.invoke('audio:set-mode', { mode }),
    createSession: (mode) => ipcRenderer.invoke('audio:create-session', { mode }),
    getSession: (sessionId) => ipcRenderer.invoke('audio:get-session', { sessionId }),
    encode: (data, mode) => ipcRenderer.invoke('audio:encode', { data, mode }),
    decode: (samples, expectedBytes, mode) => ipcRenderer.invoke('audio:decode', { samples, expectedBytes, mode }),
    prepareTransmit: (sessionId, data) => ipcRenderer.invoke('audio:prepare-transmit', { sessionId, data }),
    startReceive: (sessionId, expectedBytes) => ipcRenderer.invoke('audio:start-receive', { sessionId, expectedBytes }),
    processReceived: (sessionId, samples) => ipcRenderer.invoke('audio:process-received', { sessionId, samples }),
    generateTone: (frequency, duration, mode) => ipcRenderer.invoke('audio:generate-tone', { frequency, duration, mode }),
    generateChord: (frequencies, duration, mode) => ipcRenderer.invoke('audio:generate-chord', { frequencies, duration, mode }),
    getBands: () => ipcRenderer.invoke('audio:get-bands'),
    getModes: () => ipcRenderer.invoke('audio:get-modes'),
    listSessions: () => ipcRenderer.invoke('audio:list-sessions'),
    deleteSession: (sessionId) => ipcRenderer.invoke('audio:delete-session', { sessionId }),
    calculateDuration: (dataLength, mode) => ipcRenderer.invoke('audio:calculate-duration', { dataLength, mode }),
    constants: () => ipcRenderer.invoke('audio:constants'),
  },

  // =============================================
  // PHASE 9: BTC (Bitcoin Block-Based Key Rotation)
  // =============================================
  btc: {
    setEndpoint: (url) => ipcRenderer.invoke('btc:set-endpoint', { url }),
    startSimulator: (startHeight) => ipcRenderer.invoke('btc:start-simulator', { startHeight }),
    simulateBlock: () => ipcRenderer.invoke('btc:simulate-block'),
    updateBlock: (blockData) => ipcRenderer.invoke('btc:update-block', { blockData }),
    getClock: () => ipcRenderer.invoke('btc:get-clock'),
    createSchedule: (name, granularity) => ipcRenderer.invoke('btc:create-schedule', { name, granularity }),
    getRotationKey: (scheduleName) => ipcRenderer.invoke('btc:get-rotation-key', { scheduleName }),
    deriveKey: (purpose, salt) => ipcRenderer.invoke('btc:derive-key', { purpose, salt }),
    createAnchor: (data) => ipcRenderer.invoke('btc:create-anchor', { data }),
    verifyAnchor: (anchorId, data) => ipcRenderer.invoke('btc:verify-anchor', { anchorId, data }),
    getAnchor: (anchorId) => ipcRenderer.invoke('btc:get-anchor', { anchorId }),
    listAnchors: () => ipcRenderer.invoke('btc:list-anchors'),
    getBlock: (height) => ipcRenderer.invoke('btc:get-block', { height }),
    getPeriods: () => ipcRenderer.invoke('btc:get-periods'),
    nextRotation: (scheduleName) => ipcRenderer.invoke('btc:next-rotation', { scheduleName }),
    listSchedules: () => ipcRenderer.invoke('btc:list-schedules'),
    deleteSchedule: (name) => ipcRenderer.invoke('btc:delete-schedule', { name }),
    constants: () => ipcRenderer.invoke('btc:constants'),
  },

  // =============================================
  // PHASE 9: Security (Multi-Layer Defense)
  // =============================================
  security: {
    initVault: (masterKey) => ipcRenderer.invoke('security:init-vault', { masterKey }),
    scanInput: (text) => ipcRenderer.invoke('security:scan-input', { text }),
    normalizeInput: (text) => ipcRenderer.invoke('security:normalize-input', { text }),
    checkInjection: (input, type) => ipcRenderer.invoke('security:check-injection', { input, type }),
    createPolicy: (name) => ipcRenderer.invoke('security:create-policy', { name }),
    addPolicyRule: (policyName, domain, action, condition) =>
      ipcRenderer.invoke('security:add-policy-rule', { policyName, domain, action, condition }),
    checkPolicy: (policyName, domain, context) =>
      ipcRenderer.invoke('security:check-policy', { policyName, domain, context }),
    storeSecret: (name, value) => ipcRenderer.invoke('security:store-secret', { name, value }),
    retrieveSecret: (name) => ipcRenderer.invoke('security:retrieve-secret', { name }),
    listSecrets: () => ipcRenderer.invoke('security:list-secrets'),
    deleteSecret: (name) => ipcRenderer.invoke('security:delete-secret', { name }),
    getAuditLog: (options) => ipcRenderer.invoke('security:get-audit-log', options),
    getSummary: () => ipcRenderer.invoke('security:get-summary'),
    listPolicies: () => ipcRenderer.invoke('security:list-policies'),
    deletePolicy: (name) => ipcRenderer.invoke('security:delete-policy', { name }),
    constants: () => ipcRenderer.invoke('security:constants'),
  },

  // =============================================
  // PHASE 9: Brain (Self-Evolving AI Memory)
  // =============================================
  brain: {
    storeMemory: (type, content, metadata) => ipcRenderer.invoke('brain:store-memory', { type, content, metadata }),
    recallMemory: (memoryId) => ipcRenderer.invoke('brain:recall-memory', { memoryId }),
    searchMemories: (query, options) => ipcRenderer.invoke('brain:search-memories', { query, options }),
    associateMemories: (memoryId1, memoryId2, strength) =>
      ipcRenderer.invoke('brain:associate-memories', { memoryId1, memoryId2, strength }),
    createCluster: (name) => ipcRenderer.invoke('brain:create-cluster', { name }),
    addToCluster: (clusterId, memoryId) => ipcRenderer.invoke('brain:add-to-cluster', { clusterId, memoryId }),
    startLearning: (mode, context) => ipcRenderer.invoke('brain:start-learning', { mode, context }),
    addSample: (episodeId, input, output) => ipcRenderer.invoke('brain:add-sample', { episodeId, input, output }),
    addFeedback: (episodeId, feedback, reward) => ipcRenderer.invoke('brain:add-feedback', { episodeId, feedback, reward }),
    completeLearning: (episodeId) => ipcRenderer.invoke('brain:complete-learning', { episodeId }),
    getAttention: () => ipcRenderer.invoke('brain:get-attention'),
    focusAttention: (memoryId, weight) => ipcRenderer.invoke('brain:focus-attention', { memoryId, weight }),
    clearAttention: () => ipcRenderer.invoke('brain:clear-attention'),
    runConsolidation: () => ipcRenderer.invoke('brain:run-consolidation'),
    evolve: () => ipcRenderer.invoke('brain:evolve'),
    getEvolution: () => ipcRenderer.invoke('brain:get-evolution'),
    getStats: () => ipcRenderer.invoke('brain:get-stats'),
    listMemories: (options) => ipcRenderer.invoke('brain:list-memories', options),
    deleteMemory: (memoryId) => ipcRenderer.invoke('brain:delete-memory', { memoryId }),
    listClusters: () => ipcRenderer.invoke('brain:list-clusters'),
    deleteCluster: (clusterId) => ipcRenderer.invoke('brain:delete-cluster', { clusterId }),
    listEpisodes: (options) => ipcRenderer.invoke('brain:list-episodes', options),
    constants: () => ipcRenderer.invoke('brain:constants'),
  },

  // =============================================
  // PHASE 9: Inference (Quality Mining Pipeline)
  // =============================================
  inference: {
    createRequest: (prompt, options) => ipcRenderer.invoke('inference:create-request', { prompt, options }),
    selectModel: (requestId) => ipcRenderer.invoke('inference:select-model', { requestId }),
    storeResult: (requestId, output, metrics) => ipcRenderer.invoke('inference:store-result', { requestId, output, metrics }),
    refineResult: (resultId, newOutput) => ipcRenderer.invoke('inference:refine-result', { resultId, newOutput }),
    mineQuality: (resultId) => ipcRenderer.invoke('inference:mine-quality', { resultId }),
    scoreQuality: (text) => ipcRenderer.invoke('inference:score-quality', { text }),
    startChain: (problem) => ipcRenderer.invoke('inference:start-chain', { problem }),
    addToChain: (chainId, type, content) => ipcRenderer.invoke('inference:add-to-chain', { chainId, type, content }),
    getChain: (chainId) => ipcRenderer.invoke('inference:get-chain', { chainId }),
    createPipeline: (name) => ipcRenderer.invoke('inference:create-pipeline', { name }),
    listModels: () => ipcRenderer.invoke('inference:list-models'),
    registerModel: (name, capabilities) => ipcRenderer.invoke('inference:register-model', { name, capabilities }),
    getRequest: (requestId) => ipcRenderer.invoke('inference:get-request', { requestId }),
    getResult: (resultId) => ipcRenderer.invoke('inference:get-result', { resultId }),
    getStats: () => ipcRenderer.invoke('inference:get-stats'),
    listRequests: (options) => ipcRenderer.invoke('inference:list-requests', options),
    listResults: (options) => ipcRenderer.invoke('inference:list-results', options),
    constants: () => ipcRenderer.invoke('inference:constants'),
  },

  // =============================================
  // PHASE 9: Micro (Local Intelligence Engine)
  // =============================================
  micro: {
    createModel: (type, config) => ipcRenderer.invoke('micro:create-model', { type, config }),
    loadModel: (modelId) => ipcRenderer.invoke('micro:load-model', { modelId }),
    unloadModel: (modelId) => ipcRenderer.invoke('micro:unload-model', { modelId }),
    infer: (modelId, input, useCache) => ipcRenderer.invoke('micro:infer', { modelId, input, useCache }),
    embed: (text, storeId) => ipcRenderer.invoke('micro:embed', { text, storeId }),
    findSimilar: (text, limit, threshold) => ipcRenderer.invoke('micro:find-similar', { text, limit, threshold }),
    createPipeline: (name) => ipcRenderer.invoke('micro:create-pipeline', { name }),
    addPipelineStep: (pipelineId, modelId, transform) =>
      ipcRenderer.invoke('micro:add-pipeline-step', { pipelineId, modelId, transform }),
    runPipeline: (pipelineId, input) => ipcRenderer.invoke('micro:run-pipeline', { pipelineId, input }),
    storeEmbedding: (id, embedding, metadata) => ipcRenderer.invoke('micro:store-embedding', { id, embedding, metadata }),
    getEmbedding: (id) => ipcRenderer.invoke('micro:get-embedding', { id }),
    deleteEmbedding: (id) => ipcRenderer.invoke('micro:delete-embedding', { id }),
    listModels: (options) => ipcRenderer.invoke('micro:list-models', options),
    deleteModel: (modelId) => ipcRenderer.invoke('micro:delete-model', { modelId }),
    listPipelines: () => ipcRenderer.invoke('micro:list-pipelines'),
    deletePipeline: (pipelineId) => ipcRenderer.invoke('micro:delete-pipeline', { pipelineId }),
    getStats: () => ipcRenderer.invoke('micro:get-stats'),
    clearCache: () => ipcRenderer.invoke('micro:clear-cache'),
    getModel: (modelId) => ipcRenderer.invoke('micro:get-model', { modelId }),
    constants: () => ipcRenderer.invoke('micro:constants'),
  },

  // =============================================
  // PHASE 9: Gateway (Central API Bottleneck)
  // =============================================
  gateway: {
    registerEndpoint: (name, baseUrl, options) => ipcRenderer.invoke('gateway:register-endpoint', { name, baseUrl, options }),
    getEndpoint: (endpointId) => ipcRenderer.invoke('gateway:get-endpoint', { endpointId }),
    findEndpoint: (name) => ipcRenderer.invoke('gateway:find-endpoint', { name }),
    request: (endpointId, path, options) => ipcRenderer.invoke('gateway:request', { endpointId, path, options }),
    queueRequest: (endpointId, path, options) => ipcRenderer.invoke('gateway:queue-request', { endpointId, path, options }),
    setEndpointEnabled: (endpointId, enabled) => ipcRenderer.invoke('gateway:set-endpoint-enabled', { endpointId, enabled }),
    updateEndpointAuth: (endpointId, auth) => ipcRenderer.invoke('gateway:update-endpoint-auth', { endpointId, auth }),
    getRateLimitStatus: (endpointId) => ipcRenderer.invoke('gateway:get-rate-limit-status', { endpointId }),
    getCircuitStatus: (endpointId) => ipcRenderer.invoke('gateway:get-circuit-status', { endpointId }),
    clearCache: () => ipcRenderer.invoke('gateway:clear-cache'),
    getLogs: (options) => ipcRenderer.invoke('gateway:get-logs', options),
    listEndpoints: () => ipcRenderer.invoke('gateway:list-endpoints'),
    deleteEndpoint: (endpointId) => ipcRenderer.invoke('gateway:delete-endpoint', { endpointId }),
    getStats: () => ipcRenderer.invoke('gateway:get-stats'),
    configureRateLimiter: (options) => ipcRenderer.invoke('gateway:configure-rate-limiter', options),
    configureCircuitBreaker: (options) => ipcRenderer.invoke('gateway:configure-circuit-breaker', options),
    configureCache: (options) => ipcRenderer.invoke('gateway:configure-cache', options),
    constants: () => ipcRenderer.invoke('gateway:constants'),
  },

  // =============================================
  // PHASE 9: SIM (SIM Card Security)
  // =============================================
  sim: {
    register: (data) => ipcRenderer.invoke('sim:register', data),
    get: (simId) => ipcRenderer.invoke('sim:get', { simId }),
    activate: (simId) => ipcRenderer.invoke('sim:activate', { simId }),
    deactivate: (simId) => ipcRenderer.invoke('sim:deactivate', { simId }),
    setImsi: (simId, imsi) => ipcRenderer.invoke('sim:set-imsi', { simId, imsi }),
    registerImei: (imei) => ipcRenderer.invoke('sim:register-imei', { imei }),
    validateImei: (imei) => ipcRenderer.invoke('sim:validate-imei', { imei }),
    updateCell: (data) => ipcRenderer.invoke('sim:update-cell', data),
    getCurrentCell: () => ipcRenderer.invoke('sim:get-current-cell'),
    getCellHistory: (limit) => ipcRenderer.invoke('sim:get-cell-history', { limit }),
    setPin: (simId, pin) => ipcRenderer.invoke('sim:set-pin', { simId, pin }),
    verifyPin: (simId, pin) => ipcRenderer.invoke('sim:verify-pin', { simId, pin }),
    setPuk: (simId, puk) => ipcRenderer.invoke('sim:set-puk', { simId, puk }),
    unlockWithPuk: (simId, puk, newPin) => ipcRenderer.invoke('sim:unlock-with-puk', { simId, puk, newPin }),
    getPinStatus: (simId) => ipcRenderer.invoke('sim:get-pin-status', { simId }),
    getSecurityEvents: (options) => ipcRenderer.invoke('sim:get-security-events', options),
    getSecurityAlerts: () => ipcRenderer.invoke('sim:get-security-alerts'),
    clearSecurityAlerts: () => ipcRenderer.invoke('sim:clear-security-alerts'),
    list: () => ipcRenderer.invoke('sim:list'),
    delete: (simId) => ipcRenderer.invoke('sim:delete', { simId }),
    getStats: () => ipcRenderer.invoke('sim:get-stats'),
    constants: () => ipcRenderer.invoke('sim:constants'),
  },

  // =============================================
  // PHASE 9: Codie (Compressed DSL Engine)
  // =============================================
  codie: {
    tokenize: (source) => ipcRenderer.invoke('codie:tokenize', { source }),
    parse: (source) => ipcRenderer.invoke('codie:parse', { source }),
    compile: (source) => ipcRenderer.invoke('codie:compile', { source }),
    interpret: (source) => ipcRenderer.invoke('codie:interpret', { source }),
    storeProgram: (name, source) => ipcRenderer.invoke('codie:store-program', { name, source }),
    getProgram: (name) => ipcRenderer.invoke('codie:get-program', { name }),
    runProgram: (name) => ipcRenderer.invoke('codie:run-program', { name }),
    listPrograms: () => ipcRenderer.invoke('codie:list-programs'),
    deleteProgram: (name) => ipcRenderer.invoke('codie:delete-program', { name }),
    getKeywords: () => ipcRenderer.invoke('codie:get-keywords'),
    getStats: () => ipcRenderer.invoke('codie:get-stats'),
    validate: (source) => ipcRenderer.invoke('codie:validate', { source }),
    constants: () => ipcRenderer.invoke('codie:constants'),
  },

  // =============================================
  // Bluetooth (Outward BLE Connections)
  // =============================================
  bluetooth: {
    enableAdapter: () => ipcRenderer.invoke('bluetooth:enable-adapter'),
    disableAdapter: () => ipcRenderer.invoke('bluetooth:disable-adapter'),
    startScan: (duration) => ipcRenderer.invoke('bluetooth:start-scan', { duration }),
    stopScan: () => ipcRenderer.invoke('bluetooth:stop-scan'),
    connect: (deviceId) => ipcRenderer.invoke('bluetooth:connect', { deviceId }),
    disconnect: () => ipcRenderer.invoke('bluetooth:disconnect'),
    pair: (deviceId, pin) => ipcRenderer.invoke('bluetooth:pair', { deviceId, pin }),
    unpair: (deviceId) => ipcRenderer.invoke('bluetooth:unpair', { deviceId }),
    sendMessage: (type, payload, options) => ipcRenderer.invoke('bluetooth:send-message', { type, payload, options }),
    sendFromTemplate: (templateName, values, options) =>
      ipcRenderer.invoke('bluetooth:send-from-template', { templateName, values, options }),
    sendText: (text, options) => ipcRenderer.invoke('bluetooth:send-text', { text, options }),
    sendCommand: (cmd, args, options) => ipcRenderer.invoke('bluetooth:send-command', { cmd, args, options }),
    ping: () => ipcRenderer.invoke('bluetooth:ping'),
    createTemplate: (name, type, payloadSchema) =>
      ipcRenderer.invoke('bluetooth:create-template', { name, type, payloadSchema }),
    getTemplate: (name) => ipcRenderer.invoke('bluetooth:get-template', { name }),
    listTemplates: () => ipcRenderer.invoke('bluetooth:list-templates'),
    deleteTemplate: (name) => ipcRenderer.invoke('bluetooth:delete-template', { name }),
    listDevices: (filter) => ipcRenderer.invoke('bluetooth:list-devices', filter),
    getDevice: (deviceId) => ipcRenderer.invoke('bluetooth:get-device', { deviceId }),
    removeDevice: (deviceId) => ipcRenderer.invoke('bluetooth:remove-device', { deviceId }),
    getStatus: () => ipcRenderer.invoke('bluetooth:get-status'),
    getHistory: (options) => ipcRenderer.invoke('bluetooth:get-history', options),
    clearHistory: () => ipcRenderer.invoke('bluetooth:clear-history'),
    getStats: () => ipcRenderer.invoke('bluetooth:get-stats'),
    constants: () => ipcRenderer.invoke('bluetooth:constants'),
  },

  // =============================================
  // StartMenu (Settings and Launcher)
  // =============================================
  startmenu: {
    addCategory: (key, label, icon) => ipcRenderer.invoke('startmenu:add-category', { key, label, icon }),
    getCategory: (key) => ipcRenderer.invoke('startmenu:get-category', { key }),
    listCategories: () => ipcRenderer.invoke('startmenu:list-categories'),
    addSetting: (data) => ipcRenderer.invoke('startmenu:add-setting', data),
    getSetting: (key) => ipcRenderer.invoke('startmenu:get-setting', { key }),
    setSettingValue: (key, value) => ipcRenderer.invoke('startmenu:set-setting-value', { key, value }),
    resetSetting: (key) => ipcRenderer.invoke('startmenu:reset-setting', { key }),
    resetAllSettings: () => ipcRenderer.invoke('startmenu:reset-all-settings'),
    getAllSettings: () => ipcRenderer.invoke('startmenu:get-all-settings'),
    getSettingsByCategory: (categoryKey) => ipcRenderer.invoke('startmenu:get-settings-by-category', { categoryKey }),
    addItem: (item) => ipcRenderer.invoke('startmenu:add-item', item),
    getItem: (itemId) => ipcRenderer.invoke('startmenu:get-item', { itemId }),
    updateItem: (itemId, updates) => ipcRenderer.invoke('startmenu:update-item', { itemId, updates }),
    removeItem: (itemId) => ipcRenderer.invoke('startmenu:remove-item', { itemId }),
    listItems: (filter) => ipcRenderer.invoke('startmenu:list-items', filter),
    pinItem: (itemId) => ipcRenderer.invoke('startmenu:pin-item', { itemId }),
    unpinItem: (itemId) => ipcRenderer.invoke('startmenu:unpin-item', { itemId }),
    getPinned: () => ipcRenderer.invoke('startmenu:get-pinned'),
    accessItem: (itemId) => ipcRenderer.invoke('startmenu:access-item', { itemId }),
    getRecent: (limit) => ipcRenderer.invoke('startmenu:get-recent', { limit }),
    clearRecent: () => ipcRenderer.invoke('startmenu:clear-recent'),
    search: (query) => ipcRenderer.invoke('startmenu:search', { query }),
    open: () => ipcRenderer.invoke('startmenu:open'),
    close: () => ipcRenderer.invoke('startmenu:close'),
    toggle: () => ipcRenderer.invoke('startmenu:toggle'),
    setPanel: (panel) => ipcRenderer.invoke('startmenu:set-panel', { panel }),
    getStatus: () => ipcRenderer.invoke('startmenu:get-status'),
    exportSettings: () => ipcRenderer.invoke('startmenu:export-settings'),
    importSettings: (data) => ipcRenderer.invoke('startmenu:import-settings', { data }),
    // App Discovery and Launching
    scanApps: () => ipcRenderer.invoke('startmenu:scan-apps'),
    launchApp: (appId) => ipcRenderer.invoke('startmenu:launch-app', { appId }),
    searchApps: (query) => ipcRenderer.invoke('startmenu:search-apps', { query }),
    getAppsByCategory: (category) => ipcRenderer.invoke('startmenu:get-apps-by-category', { category }),
    listApps: (filter) => ipcRenderer.invoke('startmenu:list-apps', filter),
    addAppFavorite: (appId) => ipcRenderer.invoke('startmenu:add-app-favorite', { appId }),
    removeAppFavorite: (appId) => ipcRenderer.invoke('startmenu:remove-app-favorite', { appId }),
    getAppFavorites: () => ipcRenderer.invoke('startmenu:get-app-favorites'),
    getRecentApps: () => ipcRenderer.invoke('startmenu:get-recent-apps'),
    clearRecentApps: () => ipcRenderer.invoke('startmenu:clear-recent-apps'),
    getAppCategories: () => ipcRenderer.invoke('startmenu:get-app-categories'),
    constants: () => ipcRenderer.invoke('startmenu:constants'),
    // Events
    onAppAction: (cb) => ipcRenderer.on('startmenu:app-action', (_, data) => cb(data)),
  },

  // =============================================
  // Bucket (Import/Export Hub)
  // =============================================
  bucket: {
    importUrl: (url, options) => ipcRenderer.invoke('bucket:import-url', { url, options }),
    importFile: (filePath, options) => ipcRenderer.invoke('bucket:import-file', { filePath, options }),
    importDirectory: (dirPath, options) => ipcRenderer.invoke('bucket:import-directory', { dirPath, options }),
    cloneRepo: (url, options) => ipcRenderer.invoke('bucket:clone-repo', { url, options }),
    getRepoInfo: (url) => ipcRenderer.invoke('bucket:get-repo-info', { url }),
    listRepos: () => ipcRenderer.invoke('bucket:list-repos'),
    removeRepo: (owner, repo) => ipcRenderer.invoke('bucket:remove-repo', { owner, repo }),
    listFiles: (category) => ipcRenderer.invoke('bucket:list-files', { category }),
    deleteFile: (filePath) => ipcRenderer.invoke('bucket:delete-file', { filePath }),
    restoreFile: (trashedPath, originalPath) => ipcRenderer.invoke('bucket:restore-file', { trashedPath, originalPath }),
    listTrash: () => ipcRenderer.invoke('bucket:list-trash'),
    emptyTrash: () => ipcRenderer.invoke('bucket:empty-trash'),
    cleanOldTrash: () => ipcRenderer.invoke('bucket:clean-old-trash'),
    getDiskUsage: () => ipcRenderer.invoke('bucket:get-disk-usage'),
    getHistory: (limit) => ipcRenderer.invoke('bucket:get-history', { limit }),
    clearHistory: () => ipcRenderer.invoke('bucket:clear-history'),
    getStats: () => ipcRenderer.invoke('bucket:get-stats'),
    setBaseDir: (dir) => ipcRenderer.invoke('bucket:set-base-dir', { dir }),
    constants: () => ipcRenderer.invoke('bucket:constants'),
  },

  // =============================================
  // Miner (BTC Solo Mining) - Dev Tier, minScore: 75
  // =============================================
  miner: {
    configure: (options) => ipcRenderer.invoke('miner:configure', options),
    setPool: (presetName) => ipcRenderer.invoke('miner:set-pool', { presetName }),
    getPoolPresets: () => ipcRenderer.invoke('miner:get-pool-presets'),
    initWallet: () => ipcRenderer.invoke('miner:init-wallet'),
    getWallet: () => ipcRenderer.invoke('miner:get-wallet'),
    start: () => ipcRenderer.invoke('miner:start'),
    stop: () => ipcRenderer.invoke('miner:stop'),
    pause: () => ipcRenderer.invoke('miner:pause'),
    resume: () => ipcRenderer.invoke('miner:resume'),
    getState: () => ipcRenderer.invoke('miner:get-state'),
    getStats: () => ipcRenderer.invoke('miner:get-stats'),
    resetStats: () => ipcRenderer.invoke('miner:reset-stats'),
    getConfig: () => ipcRenderer.invoke('miner:get-config'),
    getZ3RO2Z: () => ipcRenderer.invoke('miner:get-z3ro2z'),
    constants: () => ipcRenderer.invoke('miner:constants'),
    // Events from main
    onState: (cb) => ipcRenderer.on('miner:state', (_, data) => cb(data)),
    onStats: (cb) => ipcRenderer.on('miner:stats', (_, data) => cb(data)),
    onBlockFound: (cb) => ipcRenderer.on('miner:block-found', (_, data) => cb(data)),
    onShareAccepted: (cb) => ipcRenderer.on('miner:share-accepted', (_, data) => cb(data)),
    onRotation: (cb) => ipcRenderer.on('miner:rotation', (_, data) => cb(data)),
  },

  // =============================================
  // Controller (Steam Deck Full Controls)
  // =============================================
  controller: {
    scanDevices: () => ipcRenderer.invoke('controller:scan-devices'),
    connect: (devicePath) => ipcRenderer.invoke('controller:connect', { devicePath }),
    disconnect: () => ipcRenderer.invoke('controller:disconnect'),
    getState: () => ipcRenderer.invoke('controller:get-state'),
    getButton: (name) => ipcRenderer.invoke('controller:get-button', { name }),
    getStick: (name) => ipcRenderer.invoke('controller:get-stick', { name }),
    getTrigger: (name) => ipcRenderer.invoke('controller:get-trigger', { name }),
    getTrackpad: (name) => ipcRenderer.invoke('controller:get-trackpad', { name }),
    getDpad: () => ipcRenderer.invoke('controller:get-dpad'),
    getGyro: () => ipcRenderer.invoke('controller:get-gyro'),
    getAccel: () => ipcRenderer.invoke('controller:get-accel'),
    startPolling: (interval) => ipcRenderer.invoke('controller:start-polling', { interval }),
    stopPolling: () => ipcRenderer.invoke('controller:stop-polling'),
    addBinding: (data) => ipcRenderer.invoke('controller:add-binding', data),
    removeBinding: (id) => ipcRenderer.invoke('controller:remove-binding', { id }),
    updateBinding: (id, updates) => ipcRenderer.invoke('controller:update-binding', { id, updates }),
    listBindings: () => ipcRenderer.invoke('controller:list-bindings'),
    createProfile: (name, bindings) => ipcRenderer.invoke('controller:create-profile', { name, bindings }),
    loadProfile: (name) => ipcRenderer.invoke('controller:load-profile', { name }),
    saveProfile: (name) => ipcRenderer.invoke('controller:save-profile', { name }),
    listProfiles: () => ipcRenderer.invoke('controller:list-profiles'),
    deleteProfile: (name) => ipcRenderer.invoke('controller:delete-profile', { name }),
    setDeadzone: (type, value) => ipcRenderer.invoke('controller:set-deadzone', { type, value }),
    getCalibration: () => ipcRenderer.invoke('controller:get-calibration'),
    vibrate: (intensity, duration) => ipcRenderer.invoke('controller:vibrate', { intensity, duration }),
    getStatus: () => ipcRenderer.invoke('controller:get-status'),
    constants: () => ipcRenderer.invoke('controller:constants'),
    // Events
    onButtonPress: (cb) => ipcRenderer.on('controller:button:press', (_, data) => cb(data)),
    onButtonRelease: (cb) => ipcRenderer.on('controller:button:release', (_, data) => cb(data)),
    onStickLeft: (cb) => ipcRenderer.on('controller:stick:left', (_, data) => cb(data)),
    onStickRight: (cb) => ipcRenderer.on('controller:stick:right', (_, data) => cb(data)),
    onTriggerLeft: (cb) => ipcRenderer.on('controller:trigger:left', (_, data) => cb(data)),
    onTriggerRight: (cb) => ipcRenderer.on('controller:trigger:right', (_, data) => cb(data)),
    onDpad: (cb) => ipcRenderer.on('controller:dpad', (_, data) => cb(data)),
    onTrackpadLeft: (cb) => ipcRenderer.on('controller:trackpad:left', (_, data) => cb(data)),
    onTrackpadRight: (cb) => ipcRenderer.on('controller:trackpad:right', (_, data) => cb(data)),
    onGyro: (cb) => ipcRenderer.on('controller:gyro', (_, data) => cb(data)),
    onAction: (cb) => ipcRenderer.on('controller:action', (_, data) => cb(data)),
  },

  // =============================================
  // Hotkey Menu (Maya-style Radial Menu)
  // =============================================
  hotkeyMenu: {
    create: (data) => ipcRenderer.invoke('hotkey-menu:create', data),
    get: (menuId) => ipcRenderer.invoke('hotkey-menu:get', { menuId }),
    update: (menuId, updates) => ipcRenderer.invoke('hotkey-menu:update', { menuId, updates }),
    delete: (menuId) => ipcRenderer.invoke('hotkey-menu:delete', { menuId }),
    list: () => ipcRenderer.invoke('hotkey-menu:list'),
    addItem: (menuId, item, direction) => ipcRenderer.invoke('hotkey-menu:add-item', { menuId, item, direction }),
    removeItem: (menuId, itemId) => ipcRenderer.invoke('hotkey-menu:remove-item', { menuId, itemId }),
    setCenter: (menuId, item) => ipcRenderer.invoke('hotkey-menu:set-center', { menuId, item }),
    open: (menuId) => ipcRenderer.invoke('hotkey-menu:open', { menuId }),
    close: () => ipcRenderer.invoke('hotkey-menu:close'),
    navigate: (menuId) => ipcRenderer.invoke('hotkey-menu:navigate', { menuId }),
    back: () => ipcRenderer.invoke('hotkey-menu:back'),
    updateSelection: (x, y) => ipcRenderer.invoke('hotkey-menu:update-selection', { x, y }),
    confirm: () => ipcRenderer.invoke('hotkey-menu:confirm'),
    getState: () => ipcRenderer.invoke('hotkey-menu:get-state'),
    getHistory: (limit) => ipcRenderer.invoke('hotkey-menu:get-history', { limit }),
    export: () => ipcRenderer.invoke('hotkey-menu:export'),
    import: (data) => ipcRenderer.invoke('hotkey-menu:import', { data }),
    constants: () => ipcRenderer.invoke('hotkey-menu:constants'),
    // Events
    onAction: (cb) => ipcRenderer.on('hotkey-menu:action', (_, data) => cb(data)),
    onSelection: (cb) => ipcRenderer.on('hotkey-menu:selection', (_, data) => cb(data)),
    onOpen: (cb) => ipcRenderer.on('hotkey-menu:open', (_, data) => cb(data)),
    onClose: (cb) => ipcRenderer.on('hotkey-menu:close', (_, data) => cb(data)),
  },

  // =============================================
  // Action Server (Quick Action Routing)
  // =============================================
  action: {
    dispatch: (actionData) => ipcRenderer.invoke('action:dispatch', actionData),
    dispatchAsync: (actionData) => ipcRenderer.invoke('action:dispatch-async', actionData),
    registerHandler: (data) => ipcRenderer.invoke('action:register-handler', data),
    unregisterHandler: (handlerId) => ipcRenderer.invoke('action:unregister-handler', { handlerId }),
    listHandlers: () => ipcRenderer.invoke('action:list-handlers'),
    registerRoute: (data) => ipcRenderer.invoke('action:register-route', data),
    unregisterRoute: (method, path) => ipcRenderer.invoke('action:unregister-route', { method, path }),
    listRoutes: () => ipcRenderer.invoke('action:list-routes'),
    route: (method, path, body) => ipcRenderer.invoke('action:route', { method, path, body }),
    getQueue: () => ipcRenderer.invoke('action:get-queue'),
    getHistory: (limit, filter) => ipcRenderer.invoke('action:get-history', { limit, filter }),
    clearHistory: () => ipcRenderer.invoke('action:clear-history'),
    getStats: () => ipcRenderer.invoke('action:get-stats'),
    resetStats: () => ipcRenderer.invoke('action:reset-stats'),
    cancelPending: () => ipcRenderer.invoke('action:cancel-pending'),
    start: (interval) => ipcRenderer.invoke('action:start', { interval }),
    stop: () => ipcRenderer.invoke('action:stop'),
    constants: () => ipcRenderer.invoke('action:constants'),
    // Events
    onAppLaunch: (cb) => ipcRenderer.on('action:app-launch', (_, data) => cb(data)),
    onMcpCall: (cb) => ipcRenderer.on('action:mcp-call', (_, data) => cb(data)),
  },

  // =============================================
  // Wireshark (Packet Capture & Analysis)
  // =============================================
  wireshark: {
    listInterfaces: () => ipcRenderer.invoke('wireshark:list-interfaces'),
    createSession: (data) => ipcRenderer.invoke('wireshark:create-session', data),
    startCapture: (sessionId) => ipcRenderer.invoke('wireshark:start-capture', { sessionId }),
    stopCapture: (sessionId) => ipcRenderer.invoke('wireshark:stop-capture', { sessionId }),
    getPackets: (sessionId, limit, offset) => ipcRenderer.invoke('wireshark:get-packets', { sessionId, limit, offset }),
    getStats: (sessionId) => ipcRenderer.invoke('wireshark:get-stats', { sessionId }),
    clearPackets: (sessionId) => ipcRenderer.invoke('wireshark:clear-packets', { sessionId }),
    listSessions: () => ipcRenderer.invoke('wireshark:list-sessions'),
    deleteSession: (sessionId) => ipcRenderer.invoke('wireshark:delete-session', { sessionId }),
    export: (sessionId, format) => ipcRenderer.invoke('wireshark:export', { sessionId, format }),
    analyze: (sessionId) => ipcRenderer.invoke('wireshark:analyze', { sessionId }),
    decodeMcp: (packet) => ipcRenderer.invoke('wireshark:decode-mcp', { packet }),
    listFilters: () => ipcRenderer.invoke('wireshark:list-filters'),
    addFilter: (data) => ipcRenderer.invoke('wireshark:add-filter', data),
    constants: () => ipcRenderer.invoke('wireshark:constants'),
    // Events
    onPacket: (cb) => ipcRenderer.on('wireshark:packet', (_, data) => cb(data)),
  },

  // =============================================
  // Button Maker (Custom Buttons with Icons)
  // =============================================
  buttonMaker: {
    create: (data) => ipcRenderer.invoke('button-maker:create', data),
    createFromTemplate: (template, overrides) => ipcRenderer.invoke('button-maker:create-from-template', { template, overrides }),
    update: (buttonId, paletteId, updates) => ipcRenderer.invoke('button-maker:update', { buttonId, paletteId, updates }),
    delete: (buttonId, paletteId) => ipcRenderer.invoke('button-maker:delete', { buttonId, paletteId }),
    clone: (buttonId, paletteId) => ipcRenderer.invoke('button-maker:clone', { buttonId, paletteId }),
    createPalette: (data) => ipcRenderer.invoke('button-maker:create-palette', data),
    getPalette: (paletteId) => ipcRenderer.invoke('button-maker:get-palette', { paletteId }),
    listPalettes: () => ipcRenderer.invoke('button-maker:list-palettes'),
    deletePalette: (paletteId) => ipcRenderer.invoke('button-maker:delete-palette', { paletteId }),
    addToPalette: (paletteId, buttonData) => ipcRenderer.invoke('button-maker:add-to-palette', { paletteId, buttonData }),
    generateCss: (paletteId, buttonId) => ipcRenderer.invoke('button-maker:generate-css', { paletteId, buttonId }),
    generateHtml: (paletteId, buttonId) => ipcRenderer.invoke('button-maker:generate-html', { paletteId, buttonId }),
    getIcon: (name) => ipcRenderer.invoke('button-maker:get-icon', { name }),
    getIconSvg: (name, size, color) => ipcRenderer.invoke('button-maker:get-icon-svg', { name, size, color }),
    searchIcons: (query) => ipcRenderer.invoke('button-maker:search-icons', { query }),
    listIcons: () => ipcRenderer.invoke('button-maker:list-icons'),
    getIconCategory: (category) => ipcRenderer.invoke('button-maker:get-icon-category', { category }),
    listIconCategories: () => ipcRenderer.invoke('button-maker:list-icon-categories'),
    export: (paletteId) => ipcRenderer.invoke('button-maker:export', { paletteId }),
    import: (jsonData) => ipcRenderer.invoke('button-maker:import', { jsonData }),
    constants: () => ipcRenderer.invoke('button-maker:constants'),
  },

  // =============================================
  // Wayland (Compositor Control)
  // =============================================
  wayland: {
    connect: () => ipcRenderer.invoke('wayland:connect'),
    disconnect: () => ipcRenderer.invoke('wayland:disconnect'),
    refresh: () => ipcRenderer.invoke('wayland:refresh'),
    getMonitors: () => ipcRenderer.invoke('wayland:get-monitors'),
    getWorkspaces: () => ipcRenderer.invoke('wayland:get-workspaces'),
    getSurfaces: (filter) => ipcRenderer.invoke('wayland:get-surfaces', filter),
    switchWorkspace: (workspaceId) => ipcRenderer.invoke('wayland:switch-workspace', { workspaceId }),
    createWorkspace: (data) => ipcRenderer.invoke('wayland:create-workspace', data),
    deleteWorkspace: (workspaceId) => ipcRenderer.invoke('wayland:delete-workspace', { workspaceId }),
    moveToWorkspace: (surfaceId, workspaceId) => ipcRenderer.invoke('wayland:move-to-workspace', { surfaceId, workspaceId }),
    focusSurface: (surfaceId) => ipcRenderer.invoke('wayland:focus-surface', { surfaceId }),
    closeSurface: (surfaceId) => ipcRenderer.invoke('wayland:close-surface', { surfaceId }),
    toggleFullscreen: (surfaceId) => ipcRenderer.invoke('wayland:toggle-fullscreen', { surfaceId }),
    toggleFloating: (surfaceId) => ipcRenderer.invoke('wayland:toggle-floating', { surfaceId }),
    resizeSurface: (surfaceId, width, height) => ipcRenderer.invoke('wayland:resize-surface', { surfaceId, width, height }),
    moveSurface: (surfaceId, x, y) => ipcRenderer.invoke('wayland:move-surface', { surfaceId, x, y }),
    setLayout: (layout) => ipcRenderer.invoke('wayland:set-layout', { layout }),
    launchApp: (command, workspace) => ipcRenderer.invoke('wayland:launch-app', { command, workspace }),
    applyTemplate: (templateId) => ipcRenderer.invoke('wayland:apply-template', { templateId }),
    listTemplates: () => ipcRenderer.invoke('wayland:list-templates'),
    getTemplate: (templateId) => ipcRenderer.invoke('wayland:get-template', { templateId }),
    createTemplate: (data) => ipcRenderer.invoke('wayland:create-template', data),
    saveAsTemplate: (name, description) => ipcRenderer.invoke('wayland:save-as-template', { name, description }),
    deleteTemplate: (templateId) => ipcRenderer.invoke('wayland:delete-template', { templateId }),
    screenshot: (region) => ipcRenderer.invoke('wayland:screenshot', { region }),
    getStatus: () => ipcRenderer.invoke('wayland:get-status'),
    constants: () => ipcRenderer.invoke('wayland:constants'),
  },

  // =============================================
  // SMS (Message Collection)
  // =============================================
  sms: {
    connectKdeConnect: () => ipcRenderer.invoke('sms:connect-kdeconnect'),
    connectAdb: () => ipcRenderer.invoke('sms:connect-adb'),
    connectBluetooth: (address) => ipcRenderer.invoke('sms:connect-bluetooth', { address }),
    listDevices: () => ipcRenderer.invoke('sms:list-devices'),
    setActiveDevice: (deviceId) => ipcRenderer.invoke('sms:set-active-device', { deviceId }),
    fetchKdeConnect: (deviceId) => ipcRenderer.invoke('sms:fetch-kdeconnect', { deviceId }),
    fetchAdb: (deviceId) => ipcRenderer.invoke('sms:fetch-adb', { deviceId }),
    send: (recipient, body, deviceId) => ipcRenderer.invoke('sms:send', { recipient, body, deviceId }),
    getThreads: (filter) => ipcRenderer.invoke('sms:get-threads', filter),
    getThread: (threadId) => ipcRenderer.invoke('sms:get-thread', { threadId }),
    markThreadRead: (threadId) => ipcRenderer.invoke('sms:mark-thread-read', { threadId }),
    archiveThread: (threadId) => ipcRenderer.invoke('sms:archive-thread', { threadId }),
    deleteThread: (threadId) => ipcRenderer.invoke('sms:delete-thread', { threadId }),
    pinThread: (threadId) => ipcRenderer.invoke('sms:pin-thread', { threadId }),
    addContact: (data) => ipcRenderer.invoke('sms:add-contact', data),
    getContact: (contactId) => ipcRenderer.invoke('sms:get-contact', { contactId }),
    findContactByPhone: (phone) => ipcRenderer.invoke('sms:find-contact-by-phone', { phone }),
    listContacts: (filter) => ipcRenderer.invoke('sms:list-contacts', filter),
    blockContact: (contactId) => ipcRenderer.invoke('sms:block-contact', { contactId }),
    deleteContact: (contactId) => ipcRenderer.invoke('sms:delete-contact', { contactId }),
    searchMessages: (query, options) => ipcRenderer.invoke('sms:search-messages', { query, options }),
    export: (format, threadId) => ipcRenderer.invoke('sms:export', { format, threadId }),
    save: () => ipcRenderer.invoke('sms:save'),
    load: () => ipcRenderer.invoke('sms:load'),
    getStats: () => ipcRenderer.invoke('sms:get-stats'),
    constants: () => ipcRenderer.invoke('sms:constants'),
  },

  // =============================================
  // Phone (Mobile Emulator)
  // =============================================
  phone: {
    listAvds: () => ipcRenderer.invoke('phone:list-avds'),
    createAvd: (config) => ipcRenderer.invoke('phone:create-avd', config),
    deleteAvd: (avdName) => ipcRenderer.invoke('phone:delete-avd', { avdName }),
    createEmulator: (data) => ipcRenderer.invoke('phone:create-emulator', data),
    startAvd: (avdName, options) => ipcRenderer.invoke('phone:start-avd', { avdName, options }),
    startWaydroid: (options) => ipcRenderer.invoke('phone:start-waydroid', options),
    stopEmulator: (emulatorId) => ipcRenderer.invoke('phone:stop-emulator', { emulatorId }),
    killAll: () => ipcRenderer.invoke('phone:kill-all'),
    listEmulators: () => ipcRenderer.invoke('phone:list-emulators'),
    getEmulatorStatus: (emulatorId) => ipcRenderer.invoke('phone:get-emulator-status', { emulatorId }),
    installApk: (apkPath, emulatorId) => ipcRenderer.invoke('phone:install-apk', { apkPath, emulatorId }),
    uninstallApp: (packageName, emulatorId) => ipcRenderer.invoke('phone:uninstall-app', { packageName, emulatorId }),
    launchApp: (packageName, activity, emulatorId) => ipcRenderer.invoke('phone:launch-app', { packageName, activity, emulatorId }),
    listApps: (emulatorId) => ipcRenderer.invoke('phone:list-apps', { emulatorId }),
    screenshot: (emulatorId, outputPath) => ipcRenderer.invoke('phone:screenshot', { emulatorId, outputPath }),
    recordScreen: (emulatorId, duration) => ipcRenderer.invoke('phone:record-screen', { emulatorId, duration }),
    sendInput: (inputType, ...args) => ipcRenderer.invoke('phone:send-input', { inputType, args }),
    setLocation: (latitude, longitude, emulatorId) => ipcRenderer.invoke('phone:set-location', { latitude, longitude, emulatorId }),
    setNetwork: (delay, speed, emulatorId) => ipcRenderer.invoke('phone:set-network', { delay, speed, emulatorId }),
    setBattery: (level, charging, emulatorId) => ipcRenderer.invoke('phone:set-battery', { level, charging, emulatorId }),
    getBackends: () => ipcRenderer.invoke('phone:get-backends'),
    constants: () => ipcRenderer.invoke('phone:constants'),
  },

  // =============================================
  // VM (Virtual Machine Management)
  // =============================================
  vm: {
    create: (data) => ipcRenderer.invoke('vm:create', data),
    createDisk: (name, sizeGB, format) => ipcRenderer.invoke('vm:create-disk', { name, sizeGB, format }),
    resizeDisk: (diskPath, newSizeGB) => ipcRenderer.invoke('vm:resize-disk', { diskPath, newSizeGB }),
    getDiskInfo: (diskPath) => ipcRenderer.invoke('vm:get-disk-info', { diskPath }),
    start: (vmId) => ipcRenderer.invoke('vm:start', { vmId }),
    stop: (vmId, force) => ipcRenderer.invoke('vm:stop', { vmId, force }),
    pause: (vmId) => ipcRenderer.invoke('vm:pause', { vmId }),
    resume: (vmId) => ipcRenderer.invoke('vm:resume', { vmId }),
    list: (filter) => ipcRenderer.invoke('vm:list', filter),
    getStatus: (vmId) => ipcRenderer.invoke('vm:get-status', { vmId }),
    delete: (vmId, deleteDisks) => ipcRenderer.invoke('vm:delete', { vmId, deleteDisks }),
    createSnapshot: (vmId, name, description) => ipcRenderer.invoke('vm:create-snapshot', { vmId, name, description }),
    listSnapshots: (vmId) => ipcRenderer.invoke('vm:list-snapshots', { vmId }),
    restoreSnapshot: (snapshotId) => ipcRenderer.invoke('vm:restore-snapshot', { snapshotId }),
    deleteSnapshot: (snapshotId) => ipcRenderer.invoke('vm:delete-snapshot', { snapshotId }),
    createNetwork: (data) => ipcRenderer.invoke('vm:create-network', data),
    listNetworks: () => ipcRenderer.invoke('vm:list-networks'),
    deleteNetwork: (networkId) => ipcRenderer.invoke('vm:delete-network', { networkId }),
    connectToNetwork: (vmId, networkId) => ipcRenderer.invoke('vm:connect-to-network', { vmId, networkId }),
    createQuick: (preset) => ipcRenderer.invoke('vm:create-quick', { preset }),
    getBackends: () => ipcRenderer.invoke('vm:get-backends'),
    constants: () => ipcRenderer.invoke('vm:constants'),
  },

  // =============================================
  // LivePeer Video Streaming API
  // =============================================
  livepeer: {
    initialize: () => ipcRenderer.invoke('livepeer:initialize'),
    createStream: (config) => ipcRenderer.invoke('livepeer:create-stream', config),
    listStreams: () => ipcRenderer.invoke('livepeer:list-streams'),
    getStream: (streamId) => ipcRenderer.invoke('livepeer:get-stream', { streamId }),
    deleteStream: (streamId) => ipcRenderer.invoke('livepeer:delete-stream', { streamId }),
    startLocalServer: () => ipcRenderer.invoke('livepeer:start-local-server'),
    stopLocalServer: () => ipcRenderer.invoke('livepeer:stop-local-server'),
    uploadAsset: (filePath, config) => ipcRenderer.invoke('livepeer:upload-asset', { filePath, config }),
    listAssets: () => ipcRenderer.invoke('livepeer:list-assets'),
    transcodeLocal: (input, output, profile) => ipcRenderer.invoke('livepeer:transcode-local', { input, output, profile }),
    // AI Pipeline
    textToImage: (prompt, config) => ipcRenderer.invoke('livepeer:text-to-image', { prompt, config }),
    imageToImage: (imagePath, prompt, config) => ipcRenderer.invoke('livepeer:image-to-image', { imagePath, prompt, config }),
    imageToVideo: (imagePath, config) => ipcRenderer.invoke('livepeer:image-to-video', { imagePath, config }),
    upscale: (imagePath, config) => ipcRenderer.invoke('livepeer:upscale', { imagePath, config }),
    audioToText: (audioPath, config) => ipcRenderer.invoke('livepeer:audio-to-text', { audioPath, config }),
    segmentAnything: (imagePath, config) => ipcRenderer.invoke('livepeer:segment-anything', { imagePath, config }),
    llmInference: (messages, config) => ipcRenderer.invoke('livepeer:llm-inference', { messages, config }),
    listAITasks: () => ipcRenderer.invoke('livepeer:list-ai-tasks'),
    getAITask: (taskId) => ipcRenderer.invoke('livepeer:get-ai-task', { taskId }),
    getSupportedModels: (pipeline) => ipcRenderer.invoke('livepeer:get-supported-models', { pipeline }),
    getStatus: () => ipcRenderer.invoke('livepeer:get-status'),
    constants: () => ipcRenderer.invoke('livepeer:constants'),
    // Events
    onStreamCreated: (cb) => ipcRenderer.on('livepeer:stream-created', (_, data) => cb(data)),
    onAICompleted: (cb) => ipcRenderer.on('livepeer:ai-completed', (_, data) => cb(data)),
    onTranscodeProgress: (cb) => ipcRenderer.on('livepeer:transcode-progress', (_, data) => cb(data)),
  },

  // =============================================
  // Model Hub API - Central ML Model Management
  // =============================================
  modelHub: {
    initialize: () => ipcRenderer.invoke('modelhub:initialize'),
    scanModels: () => ipcRenderer.invoke('modelhub:scan-models'),
    // Model CRUD
    registerModel: (config) => ipcRenderer.invoke('modelhub:register-model', config),
    unregisterModel: (modelId) => ipcRenderer.invoke('modelhub:unregister-model', { modelId }),
    getModel: (modelId) => ipcRenderer.invoke('modelhub:get-model', { modelId }),
    listModels: (filter) => ipcRenderer.invoke('modelhub:list-models', filter),
    listModelsByType: (type) => ipcRenderer.invoke('modelhub:list-models-by-type', { type }),
    updateModel: (modelId, updates) => ipcRenderer.invoke('modelhub:update-model', { modelId, updates }),
    addModelTags: (modelId, tags) => ipcRenderer.invoke('modelhub:add-model-tags', { modelId, tags }),
    // Collections
    createCollection: (id, config) => ipcRenderer.invoke('modelhub:create-collection', { id, config }),
    addToCollection: (collectionId, modelId) => ipcRenderer.invoke('modelhub:add-to-collection', { collectionId, modelId }),
    listCollections: () => ipcRenderer.invoke('modelhub:list-collections'),
    // MCP Integration
    registerMCPTool: (modelId, config) => ipcRenderer.invoke('modelhub:register-mcp-tool', { modelId, config }),
    listMCPTools: () => ipcRenderer.invoke('modelhub:list-mcp-tools'),
    getMCPManifest: () => ipcRenderer.invoke('modelhub:get-mcp-manifest'),
    startMCPServer: () => ipcRenderer.invoke('modelhub:start-mcp-server'),
    stopMCPServer: () => ipcRenderer.invoke('modelhub:stop-mcp-server'),
    // Inference
    invokeModel: (modelId, input) => ipcRenderer.invoke('modelhub:invoke-model', { modelId, input }),
    // Download
    downloadHuggingFace: (repoId, filename, config) => ipcRenderer.invoke('modelhub:download-huggingface', { repoId, filename, config }),
    downloadOllama: (modelName) => ipcRenderer.invoke('modelhub:download-ollama', { modelName }),
    // Ollama Integration
    listOllamaModels: () => ipcRenderer.invoke('modelhub:list-ollama-models'),
    runOllama: (modelName, prompt, config) => ipcRenderer.invoke('modelhub:run-ollama', { modelName, prompt, config }),
    // Status
    getStatus: () => ipcRenderer.invoke('modelhub:get-status'),
    getDiskUsage: () => ipcRenderer.invoke('modelhub:get-disk-usage'),
    constants: () => ipcRenderer.invoke('modelhub:constants'),
    // Events
    onModelRegistered: (cb) => ipcRenderer.on('modelhub:model-registered', (_, data) => cb(data)),
    onDownloadProgress: (cb) => ipcRenderer.on('modelhub:download-progress', (_, data) => cb(data)),
    onDownloadComplete: (cb) => ipcRenderer.on('modelhub:download-complete', (_, data) => cb(data)),
    onMCPToolRegistered: (cb) => ipcRenderer.on('modelhub:mcp-tool-registered', (_, data) => cb(data)),
  },

  // =============================================
  // DNS Client API - Domain/DNS Management
  // =============================================
  dns: {
    initialize: () => ipcRenderer.invoke('dns:initialize'),
    listDomains: () => ipcRenderer.invoke('dns:list-domains'),
    getDomain: (domain) => ipcRenderer.invoke('dns:get-domain', { domain }),
    getRecords: (domain) => ipcRenderer.invoke('dns:get-records', { domain }),
    createRecord: (domain, record) => ipcRenderer.invoke('dns:create-record', { domain, record }),
    updateRecord: (domain, recordId, record) => ipcRenderer.invoke('dns:update-record', { domain, recordId, record }),
    deleteRecord: (domain, recordId) => ipcRenderer.invoke('dns:delete-record', { domain, recordId }),
    // Quick presets for hosting
    applyPreset: (domain, preset, variables) => ipcRenderer.invoke('dns:apply-preset', { domain, preset, variables }),
    listPresets: () => ipcRenderer.invoke('dns:list-presets'),
    getPreset: (preset) => ipcRenderer.invoke('dns:get-preset', { preset }),
    // Quick record helpers
    setARecord: (domain, subdomain, ip) => ipcRenderer.invoke('dns:set-a-record', { domain, subdomain, ip }),
    setCNAME: (domain, subdomain, target) => ipcRenderer.invoke('dns:set-cname', { domain, subdomain, target }),
    setTXT: (domain, subdomain, value) => ipcRenderer.invoke('dns:set-txt', { domain, subdomain, value }),
    setMX: (domain, records) => ipcRenderer.invoke('dns:set-mx', { domain, records }),
    // Provider-specific
    porkbunGetRecords: (domain) => ipcRenderer.invoke('dns:porkbun-get-records', { domain }),
    porkbunGetNameservers: (domain) => ipcRenderer.invoke('dns:porkbun-get-nameservers', { domain }),
    porkbunUpdateNameservers: (domain, nameservers) => ipcRenderer.invoke('dns:porkbun-update-nameservers', { domain, nameservers }),
    cloudflareGetRecords: (domain) => ipcRenderer.invoke('dns:cloudflare-get-records', { domain }),
    cloudflareEnableProxy: (domain, recordId, enabled) => ipcRenderer.invoke('dns:cloudflare-enable-proxy', { domain, recordId, enabled }),
    // Status
    getProviders: () => ipcRenderer.invoke('dns:get-providers'),
    getStatus: () => ipcRenderer.invoke('dns:get-status'),
    constants: () => ipcRenderer.invoke('dns:constants'),
    // Events
    onPresetApplied: (cb) => ipcRenderer.on('dns:preset-applied', (_, data) => cb(data)),
  },

  // =============================================
  // Telephony API - SMS/Voice (Telnyx/Plivo)
  // =============================================
  telephony: {
    initialize: () => ipcRenderer.invoke('telephony:initialize'),
    // SMS
    sendSMS: (from, to, body, config) => ipcRenderer.invoke('telephony:send-sms', { from, to, body, config }),
    sendMMS: (from, to, body, mediaUrls, config) => ipcRenderer.invoke('telephony:send-mms', { from, to, body, mediaUrls, config }),
    // Voice
    makeCall: (from, to, config) => ipcRenderer.invoke('telephony:make-call', { from, to, config }),
    // Numbers
    listNumbers: () => ipcRenderer.invoke('telephony:list-numbers'),
    searchNumbers: (country, config) => ipcRenderer.invoke('telephony:search-numbers', { country, config }),
    buyNumber: (phoneNumber, config) => ipcRenderer.invoke('telephony:buy-number', { phoneNumber, config }),
    // History
    getMessage: (messageId) => ipcRenderer.invoke('telephony:get-message', { messageId }),
    listMessages: (filter) => ipcRenderer.invoke('telephony:list-messages', filter),
    getCall: (callId) => ipcRenderer.invoke('telephony:get-call', { callId }),
    listCalls: (filter) => ipcRenderer.invoke('telephony:list-calls', filter),
    // Pricing
    getPricing: () => ipcRenderer.invoke('telephony:get-pricing'),
    calculateSavings: (sms, minutes, numbers) => ipcRenderer.invoke('telephony:calculate-savings', { sms, minutes, numbers }),
    // Telnyx-specific
    telnyxSendSMS: (from, to, body, config) => ipcRenderer.invoke('telephony:telnyx-send-sms', { from, to, body, config }),
    telnyxMakeCall: (from, to, config) => ipcRenderer.invoke('telephony:telnyx-make-call', { from, to, config }),
    telnyxSearch: (country, config) => ipcRenderer.invoke('telephony:telnyx-search', { country, config }),
    telnyxBuy: (phoneNumber, config) => ipcRenderer.invoke('telephony:telnyx-buy', { phoneNumber, config }),
    // Status
    getStatus: () => ipcRenderer.invoke('telephony:get-status'),
    constants: () => ipcRenderer.invoke('telephony:constants'),
    // Events
    onMessageSent: (cb) => ipcRenderer.on('telephony:message-sent', (_, data) => cb(data)),
    onCallInitiated: (cb) => ipcRenderer.on('telephony:call-initiated', (_, data) => cb(data)),
  },

  // =============================================
  // Gmail API - Local Email Management
  // =============================================
  gmail: {
    initialize: () => ipcRenderer.invoke('gmail:initialize'),
    // OAuth
    getAuthUrl: (state) => ipcRenderer.invoke('gmail:get-auth-url', { state }),
    exchangeCode: (code) => ipcRenderer.invoke('gmail:exchange-code', { code }),
    // Accounts
    listAccounts: () => ipcRenderer.invoke('gmail:list-accounts'),
    getAccount: (email) => ipcRenderer.invoke('gmail:get-account', { email }),
    removeAccount: (email) => ipcRenderer.invoke('gmail:remove-account', { email }),
    getProfile: (email) => ipcRenderer.invoke('gmail:get-profile', { email }),
    // Messages
    listMessages: (email, options) => ipcRenderer.invoke('gmail:list-messages', { email, options }),
    getMessage: (email, messageId, format) => ipcRenderer.invoke('gmail:get-message', { email, messageId, format }),
    sendEmail: (from, to, subject, body, options) => ipcRenderer.invoke('gmail:send-email', { from, to, subject, body, options }),
    replyEmail: (from, messageId, body, options) => ipcRenderer.invoke('gmail:reply-email', { from, messageId, body, options }),
    forwardEmail: (from, messageId, to, body, options) => ipcRenderer.invoke('gmail:forward-email', { from, messageId, to, body, options }),
    // Actions
    markRead: (email, messageId) => ipcRenderer.invoke('gmail:mark-read', { email, messageId }),
    markUnread: (email, messageId) => ipcRenderer.invoke('gmail:mark-unread', { email, messageId }),
    starMessage: (email, messageId, starred) => ipcRenderer.invoke('gmail:star-message', { email, messageId, starred }),
    trashMessage: (email, messageId) => ipcRenderer.invoke('gmail:trash-message', { email, messageId }),
    deleteMessage: (email, messageId) => ipcRenderer.invoke('gmail:delete-message', { email, messageId }),
    archiveMessage: (email, messageId) => ipcRenderer.invoke('gmail:archive-message', { email, messageId }),
    // Labels
    listLabels: (email) => ipcRenderer.invoke('gmail:list-labels', { email }),
    createLabel: (email, name, config) => ipcRenderer.invoke('gmail:create-label', { email, name, config }),
    deleteLabel: (email, labelId) => ipcRenderer.invoke('gmail:delete-label', { email, labelId }),
    // Threads
    listThreads: (email, options) => ipcRenderer.invoke('gmail:list-threads', { email, options }),
    getThread: (email, threadId) => ipcRenderer.invoke('gmail:get-thread', { email, threadId }),
    // Search
    search: (email, query, options) => ipcRenderer.invoke('gmail:search', { email, query, options }),
    getUnread: (email, options) => ipcRenderer.invoke('gmail:get-unread', { email, options }),
    getStarred: (email, options) => ipcRenderer.invoke('gmail:get-starred', { email, options }),
    // Sync
    syncInbox: (email, options) => ipcRenderer.invoke('gmail:sync-inbox', { email, options }),
    startAutoSync: (interval) => ipcRenderer.invoke('gmail:start-auto-sync', { interval }),
    stopAutoSync: () => ipcRenderer.invoke('gmail:stop-auto-sync'),
    // Status
    getStatus: () => ipcRenderer.invoke('gmail:get-status'),
    constants: () => ipcRenderer.invoke('gmail:constants'),
    // Events
    onAccountAdded: (cb) => ipcRenderer.on('gmail:account-added', (_, data) => cb(data)),
    onEmailSent: (cb) => ipcRenderer.on('gmail:email-sent', (_, data) => cb(data)),
    onSyncStart: (cb) => ipcRenderer.on('gmail:sync-start', (_, data) => cb(data)),
    onSyncComplete: (cb) => ipcRenderer.on('gmail:sync-complete', (_, data) => cb(data)),
  },

  // =============================================
  // FACE TRACKING API
  // =============================================
  faceTracking: {
    initialize: () => ipcRenderer.invoke('facetracking:initialize'),
    start: () => ipcRenderer.invoke('facetracking:start'),
    stop: () => ipcRenderer.invoke('facetracking:stop'),
    calibrate: () => ipcRenderer.invoke('facetracking:calibrate'),
    getCurrent: () => ipcRenderer.invoke('facetracking:get-current'),
    getHistory: () => ipcRenderer.invoke('facetracking:get-history'),
    setSmoothing: (value) => ipcRenderer.invoke('facetracking:set-smoothing', { value }),
    getCameras: () => ipcRenderer.invoke('facetracking:get-cameras'),
    setCamera: (cameraId) => ipcRenderer.invoke('facetracking:set-camera', { cameraId }),
    getStatus: () => ipcRenderer.invoke('facetracking:get-status'),
    constants: () => ipcRenderer.invoke('facetracking:constants'),
    // Events
    onFace: (cb) => ipcRenderer.on('facetracking:face', (_, data) => cb(data)),
    onLost: (cb) => ipcRenderer.on('facetracking:lost', () => cb()),
    onCalibrated: (cb) => ipcRenderer.on('facetracking:calibrated', (_, data) => cb(data)),
    onState: (cb) => ipcRenderer.on('facetracking:state', (_, state) => cb(state)),
  },

  // =============================================
  // AVATAR STUDIO API
  // =============================================
  avatar: {
    create: (config) => ipcRenderer.invoke('avatar:create', config),
    get: (avatarId) => ipcRenderer.invoke('avatar:get', { avatarId }),
    list: () => ipcRenderer.invoke('avatar:list'),
    delete: (avatarId) => ipcRenderer.invoke('avatar:delete', { avatarId }),
    setActive: (avatarId) => ipcRenderer.invoke('avatar:set-active', { avatarId }),
    getActive: () => ipcRenderer.invoke('avatar:get-active'),
    updatePart: (avatarId, partType, asset) => ipcRenderer.invoke('avatar:update-part', { avatarId, partType, asset }),
    applyBlendShapes: (avatarId, blendShapes) => ipcRenderer.invoke('avatar:apply-blendshapes', { avatarId, blendShapes }),
    playAnimation: (avatarId, name, loop) => ipcRenderer.invoke('avatar:play-animation', { avatarId, name, loop }),
    stopAnimation: (avatarId) => ipcRenderer.invoke('avatar:stop-animation', { avatarId }),
    createAnimation: (name, keyframes, duration) => ipcRenderer.invoke('avatar:create-animation', { name, keyframes, duration }),
    export: (avatarId, format) => ipcRenderer.invoke('avatar:export', { avatarId, format }),
    import: (data, format) => ipcRenderer.invoke('avatar:import', { data, format }),
    getAssetLibrary: (category) => ipcRenderer.invoke('avatar:get-asset-library', { category }),
    render: (avatarId) => ipcRenderer.invoke('avatar:render', { avatarId }),
    getStatus: () => ipcRenderer.invoke('avatar:get-status'),
    constants: () => ipcRenderer.invoke('avatar:constants'),
    // Events
    onCreated: (cb) => ipcRenderer.on('avatar:created', (_, data) => cb(data)),
    onAnimationComplete: (cb) => ipcRenderer.on('avatar:animation-complete', (_, data) => cb(data)),
  },

  // =============================================
  // REALTIME GRAPHICS API
  // =============================================
  graphics: {
    initialize: () => ipcRenderer.invoke('graphics:initialize'),
    start: () => ipcRenderer.invoke('graphics:start'),
    stop: () => ipcRenderer.invoke('graphics:stop'),
    addLayer: (config) => ipcRenderer.invoke('graphics:add-layer', config),
    removeLayer: (layerId) => ipcRenderer.invoke('graphics:remove-layer', { layerId }),
    addChatBubble: (text, speaker, options) => ipcRenderer.invoke('graphics:add-chat-bubble', { text, speaker, options }),
    clearChatBubbles: () => ipcRenderer.invoke('graphics:clear-chat-bubbles'),
    addParticles: (id, config) => ipcRenderer.invoke('graphics:add-particles', { id, config }),
    emitParticles: (systemId, x, y, count) => ipcRenderer.invoke('graphics:emit-particles', { systemId, x, y, count }),
    setEffect: (effectType) => ipcRenderer.invoke('graphics:set-effect', { effectType }),
    animate: (layerId, property, from, to, duration, easing) => ipcRenderer.invoke('graphics:animate', { layerId, property, from, to, duration, easing }),
    animateIn: (layerId, direction) => ipcRenderer.invoke('graphics:animate-in', { layerId, direction }),
    animateOut: (layerId, direction) => ipcRenderer.invoke('graphics:animate-out', { layerId, direction }),
    setMode: (mode) => ipcRenderer.invoke('graphics:set-mode', { mode }),
    resize: (width, height) => ipcRenderer.invoke('graphics:resize', { width, height }),
    getState: () => ipcRenderer.invoke('graphics:get-state'),
    constants: () => ipcRenderer.invoke('graphics:constants'),
    // Events
    onRender: (cb) => ipcRenderer.on('graphics:render', (_, data) => cb(data)),
    onChatBubble: (cb) => ipcRenderer.on('graphics:chat-bubble', (_, data) => cb(data)),
  },

  // =============================================
  // TAB VIEW SWITCHER API
  // =============================================
  tabs: {
    create: (config) => ipcRenderer.invoke('tabs:create', config),
    close: (tabId) => ipcRenderer.invoke('tabs:close', { tabId }),
    switch: (tabId, transition) => ipcRenderer.invoke('tabs:switch', { tabId, transition }),
    get: (tabId) => ipcRenderer.invoke('tabs:get', { tabId }),
    getActive: () => ipcRenderer.invoke('tabs:get-active'),
    getAll: () => ipcRenderer.invoke('tabs:get-all'),
    getByGroup: (groupId) => ipcRenderer.invoke('tabs:get-by-group', { groupId }),
    createGroup: (config) => ipcRenderer.invoke('tabs:create-group', config),
    deleteGroup: (groupId) => ipcRenderer.invoke('tabs:delete-group', { groupId }),
    move: (tabId, newIndex) => ipcRenderer.invoke('tabs:move', { tabId, newIndex }),
    togglePin: (tabId) => ipcRenderer.invoke('tabs:toggle-pin', { tabId }),
    duplicate: (tabId) => ipcRenderer.invoke('tabs:duplicate', { tabId }),
    search: (query) => ipcRenderer.invoke('tabs:search', { query }),
    goBack: () => ipcRenderer.invoke('tabs:go-back'),
    goForward: () => ipcRenderer.invoke('tabs:go-forward'),
    setViewMode: (mode) => ipcRenderer.invoke('tabs:set-view-mode', { mode }),
    addToSplit: (tabId) => ipcRenderer.invoke('tabs:add-to-split', { tabId }),
    removeFromSplit: (tabId) => ipcRenderer.invoke('tabs:remove-from-split', { tabId }),
    startAutoRotation: (interval, tabIds) => ipcRenderer.invoke('tabs:start-auto-rotation', { interval, tabIds }),
    stopAutoRotation: () => ipcRenderer.invoke('tabs:stop-auto-rotation'),
    pauseAutoRotation: () => ipcRenderer.invoke('tabs:pause-auto-rotation'),
    resumeAutoRotation: () => ipcRenderer.invoke('tabs:resume-auto-rotation'),
    setTransition: (type) => ipcRenderer.invoke('tabs:set-transition', { type }),
    setTransitionDuration: (ms) => ipcRenderer.invoke('tabs:set-transition-duration', { ms }),
    saveState: () => ipcRenderer.invoke('tabs:save-state'),
    restoreState: (state) => ipcRenderer.invoke('tabs:restore-state', { state }),
    getStatus: () => ipcRenderer.invoke('tabs:get-status'),
    constants: () => ipcRenderer.invoke('tabs:constants'),
    // Events
    onTabCreated: (cb) => ipcRenderer.on('tabs:tab-created', (_, data) => cb(data)),
    onTabClosed: (cb) => ipcRenderer.on('tabs:tab-closed', (_, data) => cb(data)),
    onTabSwitch: (cb) => ipcRenderer.on('tabs:tab-switch', (_, data) => cb(data)),
    onViewModeChanged: (cb) => ipcRenderer.on('tabs:view-mode-changed', (_, data) => cb(data)),
    onAutoRotationStarted: (cb) => ipcRenderer.on('tabs:auto-rotation-started', (_, data) => cb(data)),
  },

  // =============================================
  // INTRO CREATOR API
  // =============================================
  intro: {
    create: (config) => ipcRenderer.invoke('intro:create', config),
    createFromTemplate: (templateName) => ipcRenderer.invoke('intro:create-from-template', { templateName }),
    getTemplates: () => ipcRenderer.invoke('intro:get-templates'),
    load: (sequenceId) => ipcRenderer.invoke('intro:load', { sequenceId }),
    delete: (sequenceId) => ipcRenderer.invoke('intro:delete', { sequenceId }),
    get: (sequenceId) => ipcRenderer.invoke('intro:get', { sequenceId }),
    getAll: () => ipcRenderer.invoke('intro:get-all'),
    play: () => ipcRenderer.invoke('intro:play'),
    pause: () => ipcRenderer.invoke('intro:pause'),
    stop: () => ipcRenderer.invoke('intro:stop'),
    seek: (time) => ipcRenderer.invoke('intro:seek', { time }),
    setSpeed: (speed) => ipcRenderer.invoke('intro:set-speed', { speed }),
    previewAt: (time) => ipcRenderer.invoke('intro:preview-at', { time }),
    exportRender: () => ipcRenderer.invoke('intro:export-render'),
    saveJSON: (sequenceId) => ipcRenderer.invoke('intro:save-json', { sequenceId }),
    loadJSON: (jsonString) => ipcRenderer.invoke('intro:load-json', { jsonString }),
    getStatus: () => ipcRenderer.invoke('intro:get-status'),
    constants: () => ipcRenderer.invoke('intro:constants'),
    // Events
    onFrame: (cb) => ipcRenderer.on('intro:frame', (_, data) => cb(data)),
    onPlay: (cb) => ipcRenderer.on('intro:play', (_, data) => cb(data)),
    onPause: (cb) => ipcRenderer.on('intro:pause', (_, data) => cb(data)),
    onComplete: (cb) => ipcRenderer.on('intro:complete', (_, data) => cb(data)),
  },

  // =============================================
  // TRADINGVIEW API
  // =============================================
  tradingview: {
    // Connection
    connect: () => ipcRenderer.invoke('tradingview:connect'),
    disconnect: () => ipcRenderer.invoke('tradingview:disconnect'),

    // Chart data
    getChartData: () => ipcRenderer.invoke('tradingview:get-chart-data'),
    getSymbolInfo: () => ipcRenderer.invoke('tradingview:get-symbol-info'),
    setSymbol: (symbol) => ipcRenderer.invoke('tradingview:set-symbol', { symbol }),
    setTimeframe: (timeframe) => ipcRenderer.invoke('tradingview:set-timeframe', { timeframe }),

    // PineScript
    injectPine: (code) => ipcRenderer.invoke('tradingview:inject-pine', { code }),

    // Strategies
    createStrategy: (config) => ipcRenderer.invoke('tradingview:create-strategy', config),
    getStrategy: (strategyId) => ipcRenderer.invoke('tradingview:get-strategy', { strategyId }),
    listStrategies: () => ipcRenderer.invoke('tradingview:list-strategies'),
    deleteStrategy: (strategyId) => ipcRenderer.invoke('tradingview:delete-strategy', { strategyId }),
    deployStrategy: (strategyId) => ipcRenderer.invoke('tradingview:deploy-strategy', { strategyId }),
    getStrategyResults: () => ipcRenderer.invoke('tradingview:get-strategy-results'),

    // Data export
    exportCSV: (filename) => ipcRenderer.invoke('tradingview:export-csv', { filename }),
    getCSVString: (limit) => ipcRenderer.invoke('tradingview:get-csv-string', { limit }),

    // Indicators & tools
    addIndicator: (name) => ipcRenderer.invoke('tradingview:add-indicator', { name }),
    getWatchlist: () => ipcRenderer.invoke('tradingview:get-watchlist'),
    captureChart: () => ipcRenderer.invoke('tradingview:capture-chart'),

    // Templates
    getTemplates: () => ipcRenderer.invoke('tradingview:get-templates'),
    getTemplateCode: (templateName) => ipcRenderer.invoke('tradingview:get-template-code', { templateName }),

    // Status
    getStatus: () => ipcRenderer.invoke('tradingview:get-status'),
    constants: () => ipcRenderer.invoke('tradingview:constants'),

    // Events
    onConnected: (cb) => ipcRenderer.on('tradingview:connected', () => cb()),
    onDisconnected: (cb) => ipcRenderer.on('tradingview:disconnected', () => cb()),
    onChartData: (cb) => ipcRenderer.on('tradingview:chart-data', (_, data) => cb(data)),
    onPineInjected: (cb) => ipcRenderer.on('tradingview:pine-injected', (_, data) => cb(data)),
    onStrategyCreated: (cb) => ipcRenderer.on('tradingview:strategy-created', (_, data) => cb(data)),
    onStrategyDeployed: (cb) => ipcRenderer.on('tradingview:strategy-deployed', (_, data) => cb(data)),
    onExported: (cb) => ipcRenderer.on('tradingview:exported', (_, data) => cb(data)),
    onError: (cb) => ipcRenderer.on('tradingview:error', (_, data) => cb(data)),
  },
});
