// GentlyOS Tab View Switcher Client - Multi-Tab Management with Auto Transitions
// Manages multiple views with automatic rotation, transitions, and persistence

const EventEmitter = require('events');

// Transition types
const TRANSITION_TYPE = {
  NONE: 'none',
  FADE: 'fade',
  SLIDE_LEFT: 'slide_left',
  SLIDE_RIGHT: 'slide_right',
  SLIDE_UP: 'slide_up',
  SLIDE_DOWN: 'slide_down',
  ZOOM_IN: 'zoom_in',
  ZOOM_OUT: 'zoom_out',
  FLIP: 'flip',
  ROTATE: 'rotate',
};

// Tab states
const TAB_STATE = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOADING: 'loading',
  ERROR: 'error',
  HIDDEN: 'hidden',
};

// View modes
const VIEW_MODE = {
  SINGLE: 'single',        // One tab visible
  SPLIT_H: 'split_h',      // Horizontal split
  SPLIT_V: 'split_v',      // Vertical split
  GRID: 'grid',            // Grid layout
  STACK: 'stack',          // Stacked cards
  CAROUSEL: 'carousel',    // Carousel rotation
};

// Tab class
class Tab {
  constructor(config = {}) {
    this.id = config.id || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = config.title || 'Untitled';
    this.icon = config.icon || null;
    this.content = config.content || null;
    this.contentType = config.contentType || 'html'; // html, webview, component
    this.url = config.url || null;
    this.state = config.state || TAB_STATE.INACTIVE;
    this.closable = config.closable !== false;
    this.pinned = config.pinned || false;
    this.order = config.order || 0;
    this.group = config.group || null;
    this.metadata = config.metadata || {};
    this.createdAt = Date.now();
    this.lastActive = Date.now();
  }

  activate() {
    this.state = TAB_STATE.ACTIVE;
    this.lastActive = Date.now();
    return this;
  }

  deactivate() {
    this.state = TAB_STATE.INACTIVE;
    return this;
  }

  setLoading(loading = true) {
    this.state = loading ? TAB_STATE.LOADING : TAB_STATE.INACTIVE;
    return this;
  }

  pin() {
    this.pinned = true;
    return this;
  }

  unpin() {
    this.pinned = false;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      icon: this.icon,
      contentType: this.contentType,
      url: this.url,
      state: this.state,
      closable: this.closable,
      pinned: this.pinned,
      order: this.order,
      group: this.group,
      metadata: this.metadata,
      createdAt: this.createdAt,
      lastActive: this.lastActive,
    };
  }
}

// Tab group class
class TabGroup {
  constructor(config = {}) {
    this.id = config.id || `group_${Date.now()}`;
    this.name = config.name || 'Group';
    this.color = config.color || '#6366f1';
    this.collapsed = config.collapsed || false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      collapsed: this.collapsed,
    };
  }
}

// Auto-rotation scheduler
class RotationScheduler {
  constructor(client) {
    this.client = client;
    this.enabled = false;
    this.interval = 5000;  // ms between rotations
    this.timer = null;
    this.paused = false;
    this.rotationOrder = [];  // Tab IDs to rotate through
    this.currentIndex = 0;
  }

  start(interval = null) {
    if (interval) this.interval = interval;
    this.enabled = true;
    this.paused = false;
    this._scheduleNext();
  }

  stop() {
    this.enabled = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  pause() {
    this.paused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resume() {
    if (this.enabled && this.paused) {
      this.paused = false;
      this._scheduleNext();
    }
  }

  setOrder(tabIds) {
    this.rotationOrder = tabIds;
    this.currentIndex = 0;
  }

  _scheduleNext() {
    if (!this.enabled || this.paused) return;

    this.timer = setTimeout(() => {
      this._rotate();
      this._scheduleNext();
    }, this.interval);
  }

  _rotate() {
    if (this.rotationOrder.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.rotationOrder.length;
    const nextTabId = this.rotationOrder[this.currentIndex];
    this.client.switchToTab(nextTabId, TRANSITION_TYPE.FADE);
  }

  getState() {
    return {
      enabled: this.enabled,
      paused: this.paused,
      interval: this.interval,
      currentIndex: this.currentIndex,
      orderLength: this.rotationOrder.length,
    };
  }
}

// Transition animator
class TransitionAnimator {
  constructor() {
    this.duration = 300;  // ms
    this.easing = 'ease-out';
  }

  getAnimationCSS(type, direction = 'in') {
    const isIn = direction === 'in';

    switch (type) {
      case TRANSITION_TYPE.FADE:
        return {
          keyframes: isIn
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.SLIDE_LEFT:
        return {
          keyframes: isIn
            ? [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }]
            : [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.SLIDE_RIGHT:
        return {
          keyframes: isIn
            ? [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }]
            : [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.SLIDE_UP:
        return {
          keyframes: isIn
            ? [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]
            : [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.SLIDE_DOWN:
        return {
          keyframes: isIn
            ? [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }]
            : [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.ZOOM_IN:
        return {
          keyframes: isIn
            ? [{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]
            : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.8)', opacity: 0 }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.ZOOM_OUT:
        return {
          keyframes: isIn
            ? [{ transform: 'scale(1.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]
            : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.FLIP:
        return {
          keyframes: isIn
            ? [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }]
            : [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }],
          options: { duration: this.duration, easing: this.easing },
        };

      case TRANSITION_TYPE.ROTATE:
        return {
          keyframes: isIn
            ? [{ transform: 'rotate(-180deg) scale(0)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }]
            : [{ transform: 'rotate(0deg) scale(1)', opacity: 1 }, { transform: 'rotate(180deg) scale(0)', opacity: 0 }],
          options: { duration: this.duration, easing: this.easing },
        };

      default:
        return null;
    }
  }

  setDuration(ms) {
    this.duration = ms;
  }

  setEasing(easing) {
    this.easing = easing;
  }
}

// Main tab view switcher client
class TabViewSwitcherClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.tabs = new Map();
    this.groups = new Map();
    this.activeTabId = null;
    this.viewMode = config.viewMode || VIEW_MODE.SINGLE;
    this.defaultTransition = config.defaultTransition || TRANSITION_TYPE.FADE;
    this.maxTabs = config.maxTabs || 50;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = config.maxHistory || 100;

    // Components
    this.scheduler = new RotationScheduler(this);
    this.animator = new TransitionAnimator();

    // Split view state
    this.splitTabs = [];  // For split/grid modes

    // Persistence
    this.persistKey = config.persistKey || 'gently_tabs';
  }

  // Create a new tab
  createTab(config = {}) {
    if (this.tabs.size >= this.maxTabs) {
      throw new Error(`Maximum tab limit (${this.maxTabs}) reached`);
    }

    const tab = new Tab({
      ...config,
      order: this.tabs.size,
    });

    this.tabs.set(tab.id, tab);

    // Add to group if specified
    if (config.group) {
      if (!this.groups.has(config.group)) {
        this.createGroup({ id: config.group, name: config.group });
      }
    }

    this.emit('tab-created', tab.toJSON());

    // Auto-activate if first tab
    if (this.tabs.size === 1) {
      this.switchToTab(tab.id);
    }

    return tab;
  }

  // Close a tab
  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    if (!tab.closable) {
      this.emit('close-prevented', { tabId, reason: 'Tab is not closable' });
      return false;
    }

    // If closing active tab, switch to another
    if (tabId === this.activeTabId) {
      const nextTab = this._findNextTab(tabId);
      if (nextTab) {
        this.switchToTab(nextTab.id);
      } else {
        this.activeTabId = null;
      }
    }

    this.tabs.delete(tabId);

    // Remove from history
    this.history = this.history.filter(id => id !== tabId);

    this.emit('tab-closed', { tabId });
    return true;
  }

  // Find next tab when closing current
  _findNextTab(closingId) {
    const tabsArray = Array.from(this.tabs.values())
      .filter(t => t.id !== closingId)
      .sort((a, b) => a.order - b.order);

    // Try to find next by order
    const closingTab = this.tabs.get(closingId);
    if (closingTab) {
      const nextInOrder = tabsArray.find(t => t.order > closingTab.order);
      if (nextInOrder) return nextInOrder;
    }

    // Return last tab
    return tabsArray[tabsArray.length - 1] || null;
  }

  // Switch to a tab
  async switchToTab(tabId, transition = null) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    const previousTabId = this.activeTabId;
    const previousTab = previousTabId ? this.tabs.get(previousTabId) : null;

    // Deactivate previous
    if (previousTab) {
      previousTab.deactivate();
    }

    // Activate new
    tab.activate();
    this.activeTabId = tabId;

    // Add to history
    this._addToHistory(tabId);

    // Get transition animation data
    const transitionType = transition || this.defaultTransition;
    const animationData = this.animator.getAnimationCSS(transitionType, 'in');

    this.emit('tab-switch', {
      from: previousTabId,
      to: tabId,
      tab: tab.toJSON(),
      transition: transitionType,
      animation: animationData,
    });

    return true;
  }

  // Add to navigation history
  _addToHistory(tabId) {
    // Remove any forward history
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add to history if different from last
    if (this.history[this.history.length - 1] !== tabId) {
      this.history.push(tabId);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    }

    this.historyIndex = this.history.length - 1;
  }

  // Navigate back
  goBack() {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    const tabId = this.history[this.historyIndex];
    if (this.tabs.has(tabId)) {
      return this.switchToTab(tabId, TRANSITION_TYPE.SLIDE_RIGHT);
    }
    return this.goBack();  // Skip deleted tabs
  }

  // Navigate forward
  goForward() {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    const tabId = this.history[this.historyIndex];
    if (this.tabs.has(tabId)) {
      return this.switchToTab(tabId, TRANSITION_TYPE.SLIDE_LEFT);
    }
    return this.goForward();  // Skip deleted tabs
  }

  // Get tab
  getTab(tabId) {
    return this.tabs.get(tabId);
  }

  // Get active tab
  getActiveTab() {
    return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
  }

  // Get all tabs
  getAllTabs() {
    return Array.from(this.tabs.values())
      .sort((a, b) => {
        // Pinned first, then by order
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.order - b.order;
      })
      .map(t => t.toJSON());
  }

  // Get tabs by group
  getTabsByGroup(groupId) {
    return Array.from(this.tabs.values())
      .filter(t => t.group === groupId)
      .map(t => t.toJSON());
  }

  // Create a tab group
  createGroup(config = {}) {
    const group = new TabGroup(config);
    this.groups.set(group.id, group);
    this.emit('group-created', group.toJSON());
    return group;
  }

  // Delete a group (tabs become ungrouped)
  deleteGroup(groupId) {
    // Ungroup tabs
    this.tabs.forEach(tab => {
      if (tab.group === groupId) {
        tab.group = null;
      }
    });

    this.groups.delete(groupId);
    this.emit('group-deleted', { groupId });
  }

  // Move tab to position
  moveTab(tabId, newIndex) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    const tabsArray = this.getAllTabs();
    const currentIndex = tabsArray.findIndex(t => t.id === tabId);

    if (currentIndex === -1 || currentIndex === newIndex) return false;

    // Reorder
    tabsArray.splice(currentIndex, 1);
    tabsArray.splice(newIndex, 0, tab.toJSON());

    // Update orders
    tabsArray.forEach((t, i) => {
      const realTab = this.tabs.get(t.id);
      if (realTab) realTab.order = i;
    });

    this.emit('tabs-reordered', this.getAllTabs());
    return true;
  }

  // Pin/unpin tab
  togglePin(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    if (tab.pinned) {
      tab.unpin();
    } else {
      tab.pin();
    }

    this.emit('tab-pin-changed', { tabId, pinned: tab.pinned });
    return true;
  }

  // Set view mode
  setViewMode(mode) {
    this.viewMode = mode;

    // Initialize split tabs for split modes
    if (mode === VIEW_MODE.SPLIT_H || mode === VIEW_MODE.SPLIT_V) {
      this.splitTabs = [this.activeTabId];
      const secondTab = Array.from(this.tabs.values())
        .find(t => t.id !== this.activeTabId);
      if (secondTab) {
        this.splitTabs.push(secondTab.id);
      }
    } else if (mode === VIEW_MODE.GRID) {
      this.splitTabs = Array.from(this.tabs.keys()).slice(0, 4);
    } else {
      this.splitTabs = [];
    }

    this.emit('view-mode-changed', {
      mode,
      splitTabs: this.splitTabs,
    });
  }

  // Add tab to split view
  addToSplit(tabId) {
    if (!this.tabs.has(tabId)) return false;
    if (this.splitTabs.includes(tabId)) return false;

    const maxSplit = this.viewMode === VIEW_MODE.GRID ? 4 : 2;
    if (this.splitTabs.length >= maxSplit) {
      this.splitTabs.shift();
    }

    this.splitTabs.push(tabId);
    this.emit('split-changed', { splitTabs: this.splitTabs });
    return true;
  }

  // Remove from split view
  removeFromSplit(tabId) {
    const index = this.splitTabs.indexOf(tabId);
    if (index === -1) return false;

    this.splitTabs.splice(index, 1);
    this.emit('split-changed', { splitTabs: this.splitTabs });
    return true;
  }

  // Auto-rotation controls
  startAutoRotation(interval = 5000, tabIds = null) {
    const order = tabIds || Array.from(this.tabs.keys());
    this.scheduler.setOrder(order);
    this.scheduler.start(interval);
    this.emit('auto-rotation-started', { interval, tabCount: order.length });
  }

  stopAutoRotation() {
    this.scheduler.stop();
    this.emit('auto-rotation-stopped');
  }

  pauseAutoRotation() {
    this.scheduler.pause();
    this.emit('auto-rotation-paused');
  }

  resumeAutoRotation() {
    this.scheduler.resume();
    this.emit('auto-rotation-resumed');
  }

  // Transition settings
  setDefaultTransition(type) {
    this.defaultTransition = type;
  }

  setTransitionDuration(ms) {
    this.animator.setDuration(ms);
  }

  // Duplicate tab
  duplicateTab(tabId) {
    const original = this.tabs.get(tabId);
    if (!original) return null;

    return this.createTab({
      title: `${original.title} (copy)`,
      icon: original.icon,
      content: original.content,
      contentType: original.contentType,
      url: original.url,
      group: original.group,
      metadata: { ...original.metadata },
    });
  }

  // Search tabs
  searchTabs(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tabs.values())
      .filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        (t.url && t.url.toLowerCase().includes(lowerQuery))
      )
      .map(t => t.toJSON());
  }

  // Save state for persistence
  saveState() {
    const state = {
      tabs: Array.from(this.tabs.values()).map(t => ({
        ...t.toJSON(),
        content: null,  // Don't persist content
      })),
      groups: Array.from(this.groups.values()).map(g => g.toJSON()),
      activeTabId: this.activeTabId,
      viewMode: this.viewMode,
      splitTabs: this.splitTabs,
    };

    return state;
  }

  // Restore state
  restoreState(state) {
    if (!state) return false;

    // Clear current
    this.tabs.clear();
    this.groups.clear();

    // Restore groups
    if (state.groups) {
      state.groups.forEach(g => {
        this.groups.set(g.id, new TabGroup(g));
      });
    }

    // Restore tabs
    if (state.tabs) {
      state.tabs.forEach(t => {
        const tab = new Tab(t);
        this.tabs.set(tab.id, tab);
      });
    }

    // Restore view
    this.viewMode = state.viewMode || VIEW_MODE.SINGLE;
    this.splitTabs = state.splitTabs || [];

    // Restore active
    if (state.activeTabId && this.tabs.has(state.activeTabId)) {
      this.switchToTab(state.activeTabId, TRANSITION_TYPE.NONE);
    }

    this.emit('state-restored', this.getStatus());
    return true;
  }

  // Get status
  getStatus() {
    return {
      tabCount: this.tabs.size,
      groupCount: this.groups.size,
      activeTabId: this.activeTabId,
      viewMode: this.viewMode,
      splitTabs: this.splitTabs,
      autoRotation: this.scheduler.getState(),
      historyLength: this.history.length,
      historyIndex: this.historyIndex,
    };
  }

  // Cleanup
  cleanup() {
    this.scheduler.stop();
    this.tabs.clear();
    this.groups.clear();
    this.history = [];
    this.historyIndex = -1;
  }
}

module.exports = {
  TabViewSwitcherClient,
  Tab,
  TabGroup,
  RotationScheduler,
  TransitionAnimator,
  TRANSITION_TYPE,
  TAB_STATE,
  VIEW_MODE,
};
