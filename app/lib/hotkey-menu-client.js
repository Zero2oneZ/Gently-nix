// GentlyOS Hotkey Menu - Maya-style Radial/Spread Menu System
// Hold trigger + directional selection with nested submenus

const { EventEmitter } = require('events');

// Menu item types
const MENU_TYPE = {
  ACTION: 'action',
  SUBMENU: 'submenu',
  TOGGLE: 'toggle',
  SLIDER: 'slider',
  SEPARATOR: 'separator',
};

// Menu layouts
const LAYOUT = {
  RADIAL: 'radial',       // Circular spread (8 directions)
  GRID: 'grid',           // Grid layout
  PIE: 'pie',             // Pie slices
  LINEAR: 'linear',       // Horizontal/vertical strip
};

// Direction constants for radial
const DIRECTION = {
  N: 0, NE: 1, E: 2, SE: 3, S: 4, SW: 5, W: 6, NW: 7,
  CENTER: 8,
};

// Menu item
class MenuItem {
  constructor(data = {}) {
    this.id = data.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = data.type || MENU_TYPE.ACTION;
    this.label = data.label || '';
    this.icon = data.icon || null;        // Noun Project icon ID or path
    this.iconColor = data.iconColor || '#ffffff';
    this.action = data.action || null;    // Action to dispatch
    this.shortcut = data.shortcut || null;
    this.direction = data.direction;      // Position in radial (0-7)
    this.children = [];                   // For submenus
    this.enabled = data.enabled !== false;
    this.visible = data.visible !== false;
    this.toggled = data.toggled || false;
    this.value = data.value || 0;         // For sliders
    this.min = data.min || 0;
    this.max = data.max || 100;
    this.metadata = data.metadata || {};
  }

  addChild(item) {
    if (!(item instanceof MenuItem)) {
      item = new MenuItem(item);
    }
    this.children.push(item);
    this.type = MENU_TYPE.SUBMENU;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      icon: this.icon,
      iconColor: this.iconColor,
      action: this.action,
      shortcut: this.shortcut,
      direction: this.direction,
      children: this.children.map(c => c.toJSON()),
      enabled: this.enabled,
      visible: this.visible,
      toggled: this.toggled,
      value: this.value,
      min: this.min,
      max: this.max,
    };
  }
}

// Menu definition
class MenuDefinition {
  constructor(data = {}) {
    this.id = data.id || `menu_${Date.now()}`;
    this.name = data.name || 'Untitled Menu';
    this.layout = data.layout || LAYOUT.RADIAL;
    this.trigger = data.trigger || { button: 'L3', hold: true };
    this.radius = data.radius || 150;     // Pixels from center
    this.items = [];
    this.centerItem = data.centerItem || null;
    this.animation = data.animation || 'expand';
    this.theme = data.theme || 'dark';
  }

  addItem(item, direction = null) {
    if (!(item instanceof MenuItem)) {
      item = new MenuItem(item);
    }
    if (direction !== null) {
      item.direction = direction;
    } else {
      item.direction = this.items.length % 8;
    }
    this.items.push(item);
    return this;
  }

  setCenter(item) {
    if (!(item instanceof MenuItem)) {
      item = new MenuItem(item);
    }
    item.direction = DIRECTION.CENTER;
    this.centerItem = item;
    return this;
  }

  getItemByDirection(dir) {
    if (dir === DIRECTION.CENTER) return this.centerItem;
    return this.items.find(i => i.direction === dir);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      layout: this.layout,
      trigger: this.trigger,
      radius: this.radius,
      items: this.items.map(i => i.toJSON()),
      centerItem: this.centerItem?.toJSON() || null,
      animation: this.animation,
      theme: this.theme,
    };
  }
}

// Input direction calculator
class DirectionCalculator {
  constructor(deadzone = 0.3) {
    this.deadzone = deadzone;
  }

  // Convert stick position to direction (0-7, or -1 for center)
  getDirection(x, y) {
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude < this.deadzone) return DIRECTION.CENTER;

    // Angle in radians, 0 = right, counter-clockwise
    let angle = Math.atan2(-y, x);
    if (angle < 0) angle += Math.PI * 2;

    // Convert to 8 directions (each 45 degrees)
    // Offset by 22.5 degrees so N is centered
    const sector = Math.floor((angle + Math.PI / 8) / (Math.PI / 4)) % 8;

    // Map to our direction enum (0=N, going clockwise)
    const mapping = [2, 1, 0, 7, 6, 5, 4, 3]; // E, NE, N, NW, W, SW, S, SE
    return mapping[sector];
  }

  // Get direction name
  getDirectionName(dir) {
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'CENTER'];
    return names[dir] || 'UNKNOWN';
  }
}

// Main Hotkey Menu Client
class HotkeyMenuClient extends EventEmitter {
  constructor() {
    super();
    this.menus = new Map();
    this.activeMenu = null;
    this.menuStack = [];           // For nested submenus
    this.selectedDirection = -1;
    this.isOpen = false;
    this.directionCalc = new DirectionCalculator();
    this.holdTimers = new Map();
    this.history = [];
    this.maxHistory = 100;

    // Initialize default menus
    this._initDefaultMenus();
  }

  // Initialize default Maya-style menus
  _initDefaultMenus() {
    // Main quick menu (Steam Deck L3 hold)
    const mainMenu = new MenuDefinition({
      id: 'main',
      name: 'Quick Actions',
      trigger: { button: 'L3', hold: true, holdTime: 200 },
    });

    mainMenu.setCenter({ label: 'Cancel', icon: 'close', action: 'menu:close' });
    mainMenu.addItem({ label: 'Apps', icon: 'grid', action: 'menu:apps' }, DIRECTION.N);
    mainMenu.addItem({ label: 'Files', icon: 'folder', action: 'menu:files' }, DIRECTION.NE);
    mainMenu.addItem({ label: 'Terminal', icon: 'terminal', action: 'app:terminal' }, DIRECTION.E);
    mainMenu.addItem({ label: 'Network', icon: 'wifi', action: 'menu:network' }, DIRECTION.SE);
    mainMenu.addItem({ label: 'Settings', icon: 'cog', action: 'menu:settings' }, DIRECTION.S);
    mainMenu.addItem({ label: 'AI Chat', icon: 'message', action: 'app:chat' }, DIRECTION.SW);
    mainMenu.addItem({ label: 'Editor', icon: 'code', action: 'app:editor' }, DIRECTION.W);
    mainMenu.addItem({ label: 'Tools', icon: 'wrench', action: 'menu:tools' }, DIRECTION.NW);

    this.menus.set('main', mainMenu);

    // Tools submenu
    const toolsMenu = new MenuDefinition({
      id: 'tools',
      name: 'Tools',
      trigger: { parent: 'main', direction: DIRECTION.NW },
    });

    toolsMenu.setCenter({ label: 'Back', icon: 'arrow-left', action: 'menu:back' });
    toolsMenu.addItem({ label: 'Wireshark', icon: 'shield', action: 'app:wireshark' }, DIRECTION.N);
    toolsMenu.addItem({ label: 'VM Manager', icon: 'server', action: 'app:vm' }, DIRECTION.NE);
    toolsMenu.addItem({ label: 'Bluetooth', icon: 'bluetooth', action: 'app:bluetooth' }, DIRECTION.E);
    toolsMenu.addItem({ label: 'Phone', icon: 'phone', action: 'app:phone' }, DIRECTION.SE);
    toolsMenu.addItem({ label: 'SMS', icon: 'sms', action: 'app:sms' }, DIRECTION.S);
    toolsMenu.addItem({ label: 'Miner', icon: 'bitcoin', action: 'app:miner' }, DIRECTION.SW);
    toolsMenu.addItem({ label: 'Compositor', icon: 'layers', action: 'app:compositor' }, DIRECTION.W);
    toolsMenu.addItem({ label: 'Actions', icon: 'zap', action: 'menu:actions' }, DIRECTION.NW);

    this.menus.set('tools', toolsMenu);

    // Network submenu
    const networkMenu = new MenuDefinition({
      id: 'network',
      name: 'Network',
      trigger: { parent: 'main', direction: DIRECTION.SE },
    });

    networkMenu.setCenter({ label: 'Back', icon: 'arrow-left', action: 'menu:back' });
    networkMenu.addItem({ label: 'Scan', icon: 'radar', action: 'network:scan' }, DIRECTION.N);
    networkMenu.addItem({ label: 'Connect', icon: 'link', action: 'network:connect' }, DIRECTION.E);
    networkMenu.addItem({ label: 'Capture', icon: 'eye', action: 'network:capture' }, DIRECTION.S);
    networkMenu.addItem({ label: 'VPN', icon: 'lock', action: 'network:vpn' }, DIRECTION.W);

    this.menus.set('network', networkMenu);
  }

  // Create new menu
  createMenu(data) {
    const menu = new MenuDefinition(data);
    this.menus.set(menu.id, menu);
    return { success: true, menu: menu.toJSON() };
  }

  // Get menu
  getMenu(menuId) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };
    return { success: true, menu: menu.toJSON() };
  }

  // Update menu
  updateMenu(menuId, updates) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };
    Object.assign(menu, updates);
    return { success: true, menu: menu.toJSON() };
  }

  // Delete menu
  deleteMenu(menuId) {
    if (!this.menus.has(menuId)) return { success: false, error: 'Menu not found' };
    this.menus.delete(menuId);
    return { success: true };
  }

  // List menus
  listMenus() {
    return {
      success: true,
      menus: Array.from(this.menus.values()).map(m => ({
        id: m.id,
        name: m.name,
        itemCount: m.items.length,
      })),
    };
  }

  // Add item to menu
  addMenuItem(menuId, item, direction = null) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };
    menu.addItem(item, direction);
    return { success: true, menu: menu.toJSON() };
  }

  // Remove item from menu
  removeMenuItem(menuId, itemId) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };
    menu.items = menu.items.filter(i => i.id !== itemId);
    return { success: true };
  }

  // Set center item
  setCenterItem(menuId, item) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };
    menu.setCenter(item);
    return { success: true, menu: menu.toJSON() };
  }

  // Open menu
  open(menuId = 'main') {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };

    this.activeMenu = menu;
    this.menuStack = [menu];
    this.isOpen = true;
    this.selectedDirection = DIRECTION.CENTER;

    this.emit('open', { menu: menu.toJSON() });
    return { success: true, menu: menu.toJSON() };
  }

  // Close menu
  close() {
    if (!this.isOpen) return { success: false, error: 'Menu not open' };

    const wasActive = this.activeMenu;
    this.activeMenu = null;
    this.menuStack = [];
    this.isOpen = false;
    this.selectedDirection = -1;

    this.emit('close', { menu: wasActive?.id });
    return { success: true };
  }

  // Navigate to submenu
  navigateTo(menuId) {
    const menu = this.menus.get(menuId);
    if (!menu) return { success: false, error: 'Menu not found' };

    this.menuStack.push(menu);
    this.activeMenu = menu;
    this.selectedDirection = DIRECTION.CENTER;

    this.emit('navigate', { menu: menu.toJSON(), depth: this.menuStack.length });
    return { success: true, menu: menu.toJSON() };
  }

  // Go back in menu stack
  back() {
    if (this.menuStack.length <= 1) {
      return this.close();
    }

    this.menuStack.pop();
    this.activeMenu = this.menuStack[this.menuStack.length - 1];
    this.selectedDirection = DIRECTION.CENTER;

    this.emit('back', { menu: this.activeMenu.toJSON(), depth: this.menuStack.length });
    return { success: true, menu: this.activeMenu.toJSON() };
  }

  // Update selection based on stick input
  updateSelection(x, y) {
    if (!this.isOpen) return { success: false, error: 'Menu not open' };

    const newDirection = this.directionCalc.getDirection(x, y);
    if (newDirection !== this.selectedDirection) {
      this.selectedDirection = newDirection;
      const item = this.activeMenu.getItemByDirection(newDirection);

      this.emit('selection', {
        direction: newDirection,
        directionName: this.directionCalc.getDirectionName(newDirection),
        item: item?.toJSON() || null,
      });
    }

    return {
      success: true,
      direction: this.selectedDirection,
      item: this.activeMenu.getItemByDirection(this.selectedDirection)?.toJSON(),
    };
  }

  // Confirm current selection
  confirm() {
    if (!this.isOpen) return { success: false, error: 'Menu not open' };

    const item = this.activeMenu.getItemByDirection(this.selectedDirection);
    if (!item || !item.enabled) {
      return { success: false, error: 'No valid selection' };
    }

    // Add to history
    this.history.unshift({
      action: item.action,
      label: item.label,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    // Handle different item types
    switch (item.type) {
      case MENU_TYPE.SUBMENU:
        // Check if submenu exists
        const submenuId = item.action?.replace('menu:', '');
        if (submenuId && this.menus.has(submenuId)) {
          return this.navigateTo(submenuId);
        }
        break;

      case MENU_TYPE.TOGGLE:
        item.toggled = !item.toggled;
        this.emit('toggle', { item: item.toJSON() });
        break;

      case MENU_TYPE.ACTION:
      default:
        this.emit('action', { action: item.action, item: item.toJSON() });

        // Handle special actions
        if (item.action === 'menu:close') return this.close();
        if (item.action === 'menu:back') return this.back();
        break;
    }

    return { success: true, item: item.toJSON(), action: item.action };
  }

  // Get current state
  getState() {
    return {
      success: true,
      isOpen: this.isOpen,
      activeMenu: this.activeMenu?.toJSON() || null,
      selectedDirection: this.selectedDirection,
      selectedItem: this.activeMenu?.getItemByDirection(this.selectedDirection)?.toJSON() || null,
      stackDepth: this.menuStack.length,
    };
  }

  // Get history
  getHistory(limit = 20) {
    return {
      success: true,
      history: this.history.slice(0, limit),
    };
  }

  // Clear history
  clearHistory() {
    this.history = [];
    return { success: true };
  }

  // Export menu configuration
  exportMenus() {
    const data = {};
    for (const [id, menu] of this.menus) {
      data[id] = menu.toJSON();
    }
    return { success: true, menus: data };
  }

  // Import menu configuration
  importMenus(data) {
    let imported = 0;
    for (const [id, menuData] of Object.entries(data)) {
      const menu = new MenuDefinition(menuData);
      menu.items = menuData.items.map(i => new MenuItem(i));
      if (menuData.centerItem) {
        menu.centerItem = new MenuItem(menuData.centerItem);
      }
      this.menus.set(id, menu);
      imported++;
    }
    return { success: true, imported };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      MENU_TYPE,
      LAYOUT,
      DIRECTION,
    };
  }
}

module.exports = {
  HotkeyMenuClient,
  MenuDefinition,
  MenuItem,
  DirectionCalculator,
  MENU_TYPE,
  LAYOUT,
  DIRECTION,
};
