// GentlyOS StartMenu Client - Settings and Launcher Functionality
// Provides start menu, settings management, app discovery, and launching

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');

// App categories
const APP_CATEGORY = {
  SYSTEM: 'system',
  DEVELOPMENT: 'development',
  NETWORK: 'network',
  SECURITY: 'security',
  COMMUNICATION: 'communication',
  MEDIA: 'media',
  UTILITIES: 'utilities',
  GAMES: 'games',
  OTHER: 'other',
};

// App source types
const APP_SOURCE = {
  DESKTOP: 'desktop',
  FLATPAK: 'flatpak',
  BUILTIN: 'builtin',
  CUSTOM: 'custom',
};

// Generate ID
function generateId(prefix = 'menu') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Menu item types
const ITEM_TYPE = {
  APP: 'app',
  FOLDER: 'folder',
  SETTING: 'setting',
  ACTION: 'action',
  SEPARATOR: 'separator',
  LINK: 'link',
  RECENT: 'recent',
};

// Setting types
const SETTING_TYPE = {
  TOGGLE: 'toggle',
  SELECT: 'select',
  INPUT: 'input',
  RANGE: 'range',
  COLOR: 'color',
  FILE: 'file',
  KEYBIND: 'keybind',
};

// Menu item
class MenuItem {
  constructor(data = {}) {
    this.id = data.id || generateId('item');
    this.type = data.type || ITEM_TYPE.APP;
    this.label = data.label || 'Untitled';
    this.icon = data.icon || null;
    this.description = data.description || '';
    this.action = data.action || null;
    this.path = data.path || null;
    this.children = data.children || [];
    this.pinned = data.pinned || false;
    this.order = data.order || 0;
    this.visible = data.visible !== false;
    this.enabled = data.enabled !== false;
    this.metadata = data.metadata || {};
    this.accessCount = 0;
    this.lastAccess = null;
  }

  // Access item
  access() {
    this.accessCount++;
    this.lastAccess = Date.now();
    return this;
  }

  // Add child
  addChild(item) {
    if (this.type !== ITEM_TYPE.FOLDER) {
      throw new Error('Only folders can have children');
    }
    this.children.push(item);
    return this;
  }

  // Remove child
  removeChild(itemId) {
    this.children = this.children.filter(c => c.id !== itemId);
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      icon: this.icon,
      description: this.description,
      action: this.action,
      path: this.path,
      children: this.children.map(c => c.toJSON ? c.toJSON() : c),
      pinned: this.pinned,
      order: this.order,
      visible: this.visible,
      enabled: this.enabled,
      accessCount: this.accessCount,
      lastAccess: this.lastAccess,
    };
  }
}

// Setting definition
class Setting {
  constructor(data = {}) {
    this.id = data.id || generateId('setting');
    this.key = data.key;
    this.label = data.label || data.key;
    this.type = data.type || SETTING_TYPE.TOGGLE;
    this.value = data.value;
    this.defaultValue = data.defaultValue;
    this.options = data.options || [];
    this.min = data.min;
    this.max = data.max;
    this.step = data.step;
    this.category = data.category || 'general';
    this.description = data.description || '';
    this.requiresRestart = data.requiresRestart || false;
    this.validation = data.validation || null;
  }

  // Set value
  setValue(value) {
    if (this.validation && typeof this.validation === 'function') {
      if (!this.validation(value)) {
        throw new Error('Validation failed');
      }
    }

    switch (this.type) {
      case SETTING_TYPE.TOGGLE:
        this.value = Boolean(value);
        break;
      case SETTING_TYPE.RANGE:
        this.value = Math.max(this.min || 0, Math.min(this.max || 100, Number(value)));
        break;
      case SETTING_TYPE.SELECT:
        if (this.options.find(o => o.value === value)) {
          this.value = value;
        }
        break;
      default:
        this.value = value;
    }
    return this;
  }

  // Reset to default
  reset() {
    this.value = this.defaultValue;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      key: this.key,
      label: this.label,
      type: this.type,
      value: this.value,
      defaultValue: this.defaultValue,
      options: this.options,
      min: this.min,
      max: this.max,
      step: this.step,
      category: this.category,
      description: this.description,
      requiresRestart: this.requiresRestart,
    };
  }
}

// Settings category
class SettingsCategory {
  constructor(key, label, icon = null) {
    this.key = key;
    this.label = label;
    this.icon = icon;
    this.settings = new Map();
    this.order = 0;
  }

  addSetting(setting) {
    this.settings.set(setting.key, setting);
    return this;
  }

  getSetting(key) {
    return this.settings.get(key);
  }

  toJSON() {
    return {
      key: this.key,
      label: this.label,
      icon: this.icon,
      order: this.order,
      settings: Array.from(this.settings.values()).map(s => s.toJSON()),
    };
  }
}

// Recent item tracker
class RecentTracker {
  constructor(maxItems = 20) {
    this.items = [];
    this.maxItems = maxItems;
  }

  // Add item
  add(item) {
    // Remove if exists
    this.items = this.items.filter(i => i.id !== item.id);
    // Add to front
    this.items.unshift({
      ...item,
      accessedAt: Date.now(),
    });
    // Trim
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems);
    }
    return this;
  }

  // Get recent
  get(limit = 10) {
    return this.items.slice(0, limit);
  }

  // Clear
  clear() {
    this.items = [];
    return this;
  }

  // Remove item
  remove(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    return this;
  }
}

// Application entry for launcher
class AppEntry {
  constructor(data = {}) {
    this.id = data.id || generateId('app');
    this.name = data.name || 'Unknown App';
    this.description = data.description || '';
    this.icon = data.icon || 'application-default-icon';
    this.exec = data.exec || '';
    this.terminal = data.terminal || false;
    this.category = data.category || APP_CATEGORY.OTHER;
    this.source = data.source || APP_SOURCE.DESKTOP;
    this.keywords = data.keywords || [];
    this.desktopFile = data.desktopFile || null;
    this.favorite = data.favorite || false;
    this.hidden = data.hidden || false;
    this.noDisplay = data.noDisplay || false;
    this.launchCount = data.launchCount || 0;
    this.lastLaunched = data.lastLaunched || null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      exec: this.exec,
      terminal: this.terminal,
      category: this.category,
      source: this.source,
      keywords: this.keywords,
      favorite: this.favorite,
      hidden: this.hidden,
      launchCount: this.launchCount,
      lastLaunched: this.lastLaunched,
    };
  }
}

// Parse .desktop file
function parseDesktopFile(content, filePath) {
  const entry = {
    desktopFile: filePath,
    source: APP_SOURCE.DESKTOP,
    keywords: [],
  };

  const lines = content.split('\n');
  let inDesktopEntry = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '[Desktop Entry]') { inDesktopEntry = true; continue; }
    if (trimmed.startsWith('[') && trimmed !== '[Desktop Entry]') { inDesktopEntry = false; continue; }
    if (!inDesktopEntry) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');

    switch (key) {
      case 'Name': if (!entry.name) entry.name = value; break;
      case 'Comment': entry.description = value; break;
      case 'Exec': entry.exec = value.replace(/%[fFuUdDnNickvm]/g, '').trim(); break;
      case 'Icon': entry.icon = value; break;
      case 'Terminal': entry.terminal = value.toLowerCase() === 'true'; break;
      case 'Categories':
        const cats = value.split(';').filter(c => c);
        const catMap = {
          'Development': APP_CATEGORY.DEVELOPMENT, 'Network': APP_CATEGORY.NETWORK,
          'System': APP_CATEGORY.SYSTEM, 'Game': APP_CATEGORY.GAMES,
          'AudioVideo': APP_CATEGORY.MEDIA, 'Utility': APP_CATEGORY.UTILITIES,
          'Security': APP_CATEGORY.SECURITY, 'Chat': APP_CATEGORY.COMMUNICATION,
        };
        for (const c of cats) { if (catMap[c]) { entry.category = catMap[c]; break; } }
        break;
      case 'Keywords': entry.keywords = value.split(';').filter(k => k); break;
      case 'NoDisplay': entry.noDisplay = value.toLowerCase() === 'true'; break;
      case 'Hidden': entry.hidden = value.toLowerCase() === 'true'; break;
    }
  }
  return entry;
}

// Search index
class MenuSearchIndex {
  constructor() {
    this.index = new Map();
  }

  // Index item
  indexItem(item) {
    const terms = this.extractTerms(item);
    for (const term of terms) {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term).add(item.id);
    }
  }

  // Extract search terms
  extractTerms(item) {
    const text = `${item.label} ${item.description || ''} ${item.path || ''}`.toLowerCase();
    return text.split(/\s+/).filter(t => t.length > 1);
  }

  // Search
  search(query, items) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return [];

    const scores = new Map();

    for (const term of terms) {
      for (const [indexedTerm, itemIds] of this.index) {
        if (indexedTerm.includes(term) || term.includes(indexedTerm)) {
          const similarity = term === indexedTerm ? 1 : 0.5;
          for (const itemId of itemIds) {
            scores.set(itemId, (scores.get(itemId) || 0) + similarity);
          }
        }
      }
    }

    // Sort by score
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => items.get(id))
      .filter(Boolean);

    return results;
  }

  // Clear
  clear() {
    this.index.clear();
  }
}

// Main StartMenu Client
class StartMenuClient extends EventEmitter {
  constructor() {
    super();
    this.items = new Map();
    this.categories = new Map();
    this.settings = new Map();
    this.recent = new RecentTracker();
    this.pinned = [];
    this.searchIndex = new MenuSearchIndex();
    this.isOpen = false;
    this.activePanel = 'main';

    // Initialize default structure
    this.initDefaults();
  }

  // Initialize default menu structure
  initDefaults() {
    // Create default categories
    this.addCategory('general', 'General', 'i-settings');
    this.addCategory('appearance', 'Appearance', 'i-palette');
    this.addCategory('security', 'Security', 'i-shield');
    this.addCategory('network', 'Network', 'i-globe');
    this.addCategory('ai', 'AI & Models', 'i-cpu');
    this.addCategory('advanced', 'Advanced', 'i-code');

    // Add default settings
    this.addSetting({
      key: 'theme',
      label: 'Theme',
      type: SETTING_TYPE.SELECT,
      value: 'dark',
      defaultValue: 'dark',
      category: 'appearance',
      options: [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'system', label: 'System' },
      ],
    });

    this.addSetting({
      key: 'accentColor',
      label: 'Accent Color',
      type: SETTING_TYPE.COLOR,
      value: '#00e5a0',
      defaultValue: '#00e5a0',
      category: 'appearance',
    });

    this.addSetting({
      key: 'fontSize',
      label: 'Font Size',
      type: SETTING_TYPE.RANGE,
      value: 14,
      defaultValue: 14,
      min: 10,
      max: 24,
      step: 1,
      category: 'appearance',
    });

    this.addSetting({
      key: 'guarddog',
      label: 'GuardDog Protection',
      type: SETTING_TYPE.TOGGLE,
      value: true,
      defaultValue: true,
      category: 'security',
      description: 'Enable Tier 0 IO defense',
    });

    this.addSetting({
      key: 'bridgeAutoConnect',
      label: 'Auto-connect Bridge',
      type: SETTING_TYPE.TOGGLE,
      value: true,
      defaultValue: true,
      category: 'network',
    });

    this.addSetting({
      key: 'localModels',
      label: 'Enable Local Models',
      type: SETTING_TYPE.TOGGLE,
      value: false,
      defaultValue: false,
      category: 'ai',
      description: 'Use local AI models when available',
    });

    this.addSetting({
      key: 'devMode',
      label: 'Developer Mode',
      type: SETTING_TYPE.TOGGLE,
      value: false,
      defaultValue: false,
      category: 'advanced',
      requiresRestart: true,
    });

    // Create default menu items
    this.addItem(new MenuItem({
      type: ITEM_TYPE.FOLDER,
      label: 'Apps',
      icon: 'i-layers',
      order: 0,
    }));

    this.addItem(new MenuItem({
      type: ITEM_TYPE.FOLDER,
      label: 'Tools',
      icon: 'i-code',
      order: 1,
    }));

    this.addItem(new MenuItem({
      type: ITEM_TYPE.ACTION,
      label: 'Settings',
      icon: 'i-settings',
      action: 'open-settings',
      order: 100,
    }));
  }

  // Add category
  addCategory(key, label, icon = null) {
    const category = new SettingsCategory(key, label, icon);
    category.order = this.categories.size;
    this.categories.set(key, category);
    return { success: true, category: category.toJSON() };
  }

  // Get category
  getCategory(key) {
    const category = this.categories.get(key);
    if (!category) {
      return { success: false, error: 'Category not found' };
    }
    return { success: true, category: category.toJSON() };
  }

  // List categories
  listCategories() {
    return {
      success: true,
      categories: Array.from(this.categories.values())
        .sort((a, b) => a.order - b.order)
        .map(c => c.toJSON()),
    };
  }

  // Add setting
  addSetting(data) {
    const setting = new Setting(data);
    this.settings.set(setting.key, setting);

    // Add to category
    const category = this.categories.get(setting.category);
    if (category) {
      category.addSetting(setting);
    }

    return { success: true, setting: setting.toJSON() };
  }

  // Get setting
  getSetting(key) {
    const setting = this.settings.get(key);
    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }
    return { success: true, setting: setting.toJSON() };
  }

  // Set setting value
  setSettingValue(key, value) {
    const setting = this.settings.get(key);
    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }

    try {
      setting.setValue(value);
      this.emit('setting-changed', { key, value: setting.value, requiresRestart: setting.requiresRestart });
      return { success: true, setting: setting.toJSON() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset setting
  resetSetting(key) {
    const setting = this.settings.get(key);
    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }
    setting.reset();
    this.emit('setting-changed', { key, value: setting.value, reset: true });
    return { success: true, setting: setting.toJSON() };
  }

  // Reset all settings
  resetAllSettings() {
    for (const setting of this.settings.values()) {
      setting.reset();
    }
    this.emit('settings-reset');
    return { success: true };
  }

  // Get all settings
  getAllSettings() {
    return {
      success: true,
      settings: Array.from(this.settings.values()).map(s => s.toJSON()),
    };
  }

  // Get settings by category
  getSettingsByCategory(categoryKey) {
    const category = this.categories.get(categoryKey);
    if (!category) {
      return { success: false, error: 'Category not found' };
    }
    return {
      success: true,
      settings: Array.from(category.settings.values()).map(s => s.toJSON()),
    };
  }

  // Add menu item
  addItem(item) {
    if (!(item instanceof MenuItem)) {
      item = new MenuItem(item);
    }
    this.items.set(item.id, item);
    this.searchIndex.indexItem(item);
    return { success: true, item: item.toJSON() };
  }

  // Get item
  getItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    return { success: true, item: item.toJSON() };
  }

  // Update item
  updateItem(itemId, updates) {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    Object.assign(item, updates);
    this.searchIndex.indexItem(item);
    return { success: true, item: item.toJSON() };
  }

  // Remove item
  removeItem(itemId) {
    if (!this.items.has(itemId)) {
      return { success: false, error: 'Item not found' };
    }
    this.items.delete(itemId);
    this.pinned = this.pinned.filter(id => id !== itemId);
    return { success: true };
  }

  // List items
  listItems(filter = {}) {
    let items = Array.from(this.items.values());

    if (filter.type) {
      items = items.filter(i => i.type === filter.type);
    }
    if (filter.visible !== undefined) {
      items = items.filter(i => i.visible === filter.visible);
    }
    if (filter.pinned !== undefined) {
      items = items.filter(i => i.pinned === filter.pinned);
    }

    items.sort((a, b) => a.order - b.order);

    return {
      success: true,
      items: items.map(i => i.toJSON()),
      total: items.length,
    };
  }

  // Pin item
  pinItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    item.pinned = true;
    if (!this.pinned.includes(itemId)) {
      this.pinned.push(itemId);
    }
    return { success: true, item: item.toJSON() };
  }

  // Unpin item
  unpinItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    item.pinned = false;
    this.pinned = this.pinned.filter(id => id !== itemId);
    return { success: true };
  }

  // Get pinned items
  getPinned() {
    return {
      success: true,
      items: this.pinned
        .map(id => this.items.get(id))
        .filter(Boolean)
        .map(i => i.toJSON()),
    };
  }

  // Access item (for recent tracking)
  accessItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    item.access();
    this.recent.add(item.toJSON());
    this.emit('item-accessed', { item: item.toJSON() });
    return { success: true, item: item.toJSON() };
  }

  // Get recent items
  getRecent(limit = 10) {
    return {
      success: true,
      items: this.recent.get(limit),
    };
  }

  // Clear recent
  clearRecent() {
    this.recent.clear();
    return { success: true };
  }

  // Search menu
  search(query) {
    if (!query || query.trim().length === 0) {
      return { success: true, results: [] };
    }

    const results = this.searchIndex.search(query, this.items);
    return {
      success: true,
      results: results.map(i => i.toJSON()),
      query,
    };
  }

  // Open menu
  open() {
    this.isOpen = true;
    this.emit('menu-opened');
    return { success: true, isOpen: true };
  }

  // Close menu
  close() {
    this.isOpen = false;
    this.emit('menu-closed');
    return { success: true, isOpen: false };
  }

  // Toggle menu
  toggle() {
    this.isOpen = !this.isOpen;
    this.emit(this.isOpen ? 'menu-opened' : 'menu-closed');
    return { success: true, isOpen: this.isOpen };
  }

  // Set active panel
  setPanel(panel) {
    this.activePanel = panel;
    this.emit('panel-changed', { panel });
    return { success: true, panel };
  }

  // Get status
  getStatus() {
    return {
      success: true,
      isOpen: this.isOpen,
      activePanel: this.activePanel,
      itemCount: this.items.size,
      categoryCount: this.categories.size,
      settingCount: this.settings.size,
      pinnedCount: this.pinned.length,
      recentCount: this.recent.items.length,
    };
  }

  // Export settings
  exportSettings() {
    const settings = {};
    for (const [key, setting] of this.settings) {
      settings[key] = setting.value;
    }
    return {
      success: true,
      settings,
      exportedAt: Date.now(),
    };
  }

  // Import settings
  importSettings(data) {
    let imported = 0;
    for (const [key, value] of Object.entries(data)) {
      const setting = this.settings.get(key);
      if (setting) {
        try {
          setting.setValue(value);
          imported++;
        } catch (e) {
          // Skip invalid values
        }
      }
    }
    return { success: true, imported };
  }

  // ============ APP DISCOVERY AND LAUNCHING ============

  // Initialize apps map if not exists
  _ensureApps() {
    if (!this.apps) {
      this.apps = new Map();
      this.favorites = new Set();
      this.recentApps = [];
      this.maxRecentApps = 10;
      this.desktopPaths = [
        '/usr/share/applications',
        '/usr/local/share/applications',
        path.join(process.env.HOME || '/home/deck', '.local/share/applications'),
        '/var/lib/flatpak/exports/share/applications',
      ];
      this._initBuiltinApps();
    }
  }

  // Initialize built-in GentlyOS apps
  _initBuiltinApps() {
    const builtins = [
      { id: 'gently-terminal', name: 'Terminal', icon: 'terminal', exec: 'app:terminal', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['shell', 'console'] },
      { id: 'gently-chat', name: 'AI Chat', icon: 'message', exec: 'app:chat', category: APP_CATEGORY.COMMUNICATION, source: APP_SOURCE.BUILTIN, keywords: ['ai', 'claude'] },
      { id: 'gently-editor', name: 'Editor', icon: 'code', exec: 'app:editor', category: APP_CATEGORY.DEVELOPMENT, source: APP_SOURCE.BUILTIN, keywords: ['code', 'text'] },
      { id: 'gently-files', name: 'Files', icon: 'folder', exec: 'app:files', category: APP_CATEGORY.UTILITIES, source: APP_SOURCE.BUILTIN, keywords: ['browse', 'explorer'] },
      { id: 'gently-settings', name: 'Settings', icon: 'cog', exec: 'app:settings', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['config', 'preferences'] },
      { id: 'gently-wireshark', name: 'Packet Capture', icon: 'shield', exec: 'app:wireshark', category: APP_CATEGORY.SECURITY, source: APP_SOURCE.BUILTIN, keywords: ['network', 'capture'] },
      { id: 'gently-vm', name: 'VM Manager', icon: 'server', exec: 'app:vm', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['virtual', 'qemu'] },
      { id: 'gently-bluetooth', name: 'Bluetooth', icon: 'bluetooth', exec: 'app:bluetooth', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['wireless', 'pair'] },
      { id: 'gently-phone', name: 'Phone', icon: 'phone', exec: 'app:phone', category: APP_CATEGORY.DEVELOPMENT, source: APP_SOURCE.BUILTIN, keywords: ['android', 'emulator'] },
      { id: 'gently-sms', name: 'SMS', icon: 'sms', exec: 'app:sms', category: APP_CATEGORY.COMMUNICATION, source: APP_SOURCE.BUILTIN, keywords: ['text', 'message'] },
      { id: 'gently-miner', name: 'Miner', icon: 'bitcoin', exec: 'app:miner', category: APP_CATEGORY.UTILITIES, source: APP_SOURCE.BUILTIN, keywords: ['crypto', 'mining'] },
      { id: 'gently-compositor', name: 'Compositor', icon: 'layers', exec: 'app:compositor', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['wayland', 'windows'] },
      { id: 'gently-actions', name: 'Actions', icon: 'zap', exec: 'app:actions', category: APP_CATEGORY.SYSTEM, source: APP_SOURCE.BUILTIN, keywords: ['quick', 'shortcuts'] },
    ];

    for (const app of builtins) {
      this.registerApp(app);
    }
  }

  // Register an application
  registerApp(data) {
    this._ensureApps();
    const app = new AppEntry(data);
    this.apps.set(app.id, app);
    return { success: true, app: app.toJSON() };
  }

  // Scan desktop files for applications
  async scanDesktopFiles() {
    this._ensureApps();
    const scanned = [];

    for (const dirPath of this.desktopPaths) {
      if (!fs.existsSync(dirPath)) continue;
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (!file.endsWith('.desktop')) continue;
          const filePath = path.join(dirPath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry = parseDesktopFile(content, filePath);
            if (entry.name && entry.exec && !entry.noDisplay && !entry.hidden) {
              entry.id = file.replace('.desktop', '');
              this.registerApp(entry);
              scanned.push(entry.id);
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    }

    this.emit('apps-scanned', { count: scanned.length });
    return { success: true, scanned: scanned.length };
  }

  // Launch an application
  async launchApp(appId) {
    this._ensureApps();
    const app = this.apps.get(appId);
    if (!app) return { success: false, error: 'App not found' };

    try {
      app.launchCount++;
      app.lastLaunched = Date.now();

      // Update recent apps
      this.recentApps = this.recentApps.filter(id => id !== appId);
      this.recentApps.unshift(appId);
      if (this.recentApps.length > this.maxRecentApps) {
        this.recentApps = this.recentApps.slice(0, this.maxRecentApps);
      }

      // Check if built-in action
      if (app.exec.startsWith('app:')) {
        this.emit('app-action', { action: app.exec, app: app.toJSON() });
        return { success: true, type: 'action', action: app.exec };
      }

      // Launch external app
      const cmd = app.terminal ? `x-terminal-emulator -e ${app.exec}` : app.exec;
      spawn('sh', ['-c', cmd], { detached: true, stdio: 'ignore' }).unref();

      this.emit('app-launched', { app: app.toJSON() });
      return { success: true, app: app.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Search applications
  searchApps(query) {
    this._ensureApps();
    const q = query.toLowerCase().trim();
    if (!q) return { success: true, results: [] };

    const results = Array.from(this.apps.values())
      .filter(app => !app.hidden && !app.noDisplay)
      .filter(app =>
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.keywords.some(k => k.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 20)
      .map(app => app.toJSON());

    return { success: true, results, query: q };
  }

  // Get apps by category
  getAppsByCategory(category) {
    this._ensureApps();
    const apps = Array.from(this.apps.values())
      .filter(app => app.category === category && !app.hidden && !app.noDisplay)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(app => app.toJSON());

    return { success: true, category, apps };
  }

  // List all applications
  listApps(filter = {}) {
    this._ensureApps();
    let apps = Array.from(this.apps.values());

    if (filter.category) apps = apps.filter(a => a.category === filter.category);
    if (filter.source) apps = apps.filter(a => a.source === filter.source);
    if (filter.favorites) apps = apps.filter(a => a.favorite);
    if (!filter.showHidden) apps = apps.filter(a => !a.hidden && !a.noDisplay);

    apps.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, apps: apps.map(a => a.toJSON()), total: apps.length };
  }

  // Add app to favorites
  addAppFavorite(appId) {
    this._ensureApps();
    const app = this.apps.get(appId);
    if (!app) return { success: false, error: 'App not found' };
    app.favorite = true;
    this.favorites.add(appId);
    return { success: true };
  }

  // Remove app from favorites
  removeAppFavorite(appId) {
    this._ensureApps();
    const app = this.apps.get(appId);
    if (app) app.favorite = false;
    this.favorites.delete(appId);
    return { success: true };
  }

  // Get favorite apps
  getAppFavorites() {
    this._ensureApps();
    const apps = Array.from(this.favorites)
      .map(id => this.apps.get(id))
      .filter(a => a)
      .map(a => a.toJSON());
    return { success: true, favorites: apps };
  }

  // Get recent apps
  getRecentApps() {
    this._ensureApps();
    const apps = this.recentApps
      .map(id => this.apps.get(id))
      .filter(a => a)
      .map(a => a.toJSON());
    return { success: true, recent: apps };
  }

  // Clear recent apps
  clearRecentApps() {
    this._ensureApps();
    this.recentApps = [];
    return { success: true };
  }

  // Get app categories
  getAppCategories() {
    return { success: true, categories: Object.values(APP_CATEGORY) };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      ITEM_TYPE,
      SETTING_TYPE,
      APP_CATEGORY,
      APP_SOURCE,
    };
  }
}

module.exports = {
  StartMenuClient,
  MenuItem,
  Setting,
  SettingsCategory,
  RecentTracker,
  MenuSearchIndex,
  AppEntry,
  ITEM_TYPE,
  SETTING_TYPE,
  APP_CATEGORY,
  APP_SOURCE,
};
