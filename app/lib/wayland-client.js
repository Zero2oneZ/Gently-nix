// GentlyOS Wayland Compositor Client - Embedded Desktop Control
// Manage Wayland compositor surfaces, workspaces, and window templates

const { EventEmitter } = require('events');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Window states
const WINDOW_STATE = {
  NORMAL: 'normal',
  MAXIMIZED: 'maximized',
  MINIMIZED: 'minimized',
  FULLSCREEN: 'fullscreen',
  FLOATING: 'floating',
  TILED: 'tiled',
};

// Layout modes
const LAYOUT_MODE = {
  FLOATING: 'floating',
  TILED: 'tiled',
  TABBED: 'tabbed',
  STACKED: 'stacked',
  SPIRAL: 'spiral',
  GRID: 'grid',
};

// Workspace types
const WORKSPACE_TYPE = {
  NORMAL: 'normal',
  SCRATCHPAD: 'scratchpad',
  SPECIAL: 'special',
};

// Generate ID
function generateId(prefix = 'wl') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// Surface/window representation
class WaylandSurface {
  constructor(data = {}) {
    this.id = data.id || generateId('surface');
    this.pid = data.pid || null;
    this.appId = data.appId || '';
    this.title = data.title || '';
    this.class = data.class || '';
    this.state = data.state || WINDOW_STATE.NORMAL;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 800;
    this.height = data.height || 600;
    this.workspace = data.workspace || 0;
    this.monitor = data.monitor || 0;
    this.layer = data.layer || 'normal'; // background, bottom, normal, top, overlay
    this.opacity = data.opacity ?? 1.0;
    this.focused = data.focused || false;
    this.floating = data.floating || false;
    this.pinned = data.pinned || false;
    this.fullscreen = data.fullscreen || false;
    this.maximized = data.maximized || false;
    this.decorations = data.decorations !== false;
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      pid: this.pid,
      appId: this.appId,
      title: this.title,
      class: this.class,
      state: this.state,
      geometry: { x: this.x, y: this.y, width: this.width, height: this.height },
      workspace: this.workspace,
      monitor: this.monitor,
      layer: this.layer,
      opacity: this.opacity,
      focused: this.focused,
      floating: this.floating,
      pinned: this.pinned,
      fullscreen: this.fullscreen,
      maximized: this.maximized,
      decorations: this.decorations,
    };
  }
}

// Workspace definition
class Workspace {
  constructor(data = {}) {
    this.id = data.id ?? 0;
    this.name = data.name || `Workspace ${this.id}`;
    this.type = data.type || WORKSPACE_TYPE.NORMAL;
    this.layout = data.layout || LAYOUT_MODE.TILED;
    this.monitor = data.monitor || 0;
    this.active = data.active || false;
    this.persistent = data.persistent || false;
    this.surfaces = new Map();
    this.background = data.background || null;
    this.gaps = data.gaps || { inner: 5, outer: 10 };
  }

  addSurface(surface) {
    if (!(surface instanceof WaylandSurface)) {
      surface = new WaylandSurface(surface);
    }
    surface.workspace = this.id;
    this.surfaces.set(surface.id, surface);
    return surface;
  }

  removeSurface(surfaceId) {
    return this.surfaces.delete(surfaceId);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      layout: this.layout,
      monitor: this.monitor,
      active: this.active,
      persistent: this.persistent,
      surfaceCount: this.surfaces.size,
      background: this.background,
      gaps: this.gaps,
    };
  }
}

// Desktop template
class DesktopTemplate {
  constructor(data = {}) {
    this.id = data.id || generateId('template');
    this.name = data.name || 'Untitled Template';
    this.description = data.description || '';
    this.workspaces = data.workspaces || [];
    this.apps = data.apps || []; // Apps to launch
    this.layout = data.layout || LAYOUT_MODE.TILED;
    this.rules = data.rules || []; // Window rules
    this.autostart = data.autostart || [];
    this.variables = data.variables || {}; // Environment vars
    this.keybindings = data.keybindings || {};
    this.createdAt = data.createdAt || Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      workspaces: this.workspaces,
      apps: this.apps,
      layout: this.layout,
      rules: this.rules,
      autostart: this.autostart,
      variables: this.variables,
      keybindings: this.keybindings,
      createdAt: this.createdAt,
    };
  }
}

// Monitor/output
class Monitor {
  constructor(data = {}) {
    this.id = data.id || 0;
    this.name = data.name || 'Unknown';
    this.make = data.make || '';
    this.model = data.model || '';
    this.serial = data.serial || '';
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 1920;
    this.height = data.height || 1080;
    this.refreshRate = data.refreshRate || 60;
    this.scale = data.scale || 1.0;
    this.transform = data.transform || 0; // 0, 90, 180, 270
    this.primary = data.primary || false;
    this.enabled = data.enabled !== false;
    this.activeWorkspace = data.activeWorkspace || 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      make: this.make,
      model: this.model,
      geometry: { x: this.x, y: this.y, width: this.width, height: this.height },
      refreshRate: this.refreshRate,
      scale: this.scale,
      transform: this.transform,
      primary: this.primary,
      enabled: this.enabled,
      activeWorkspace: this.activeWorkspace,
    };
  }
}

// Main Wayland Compositor Client
class WaylandClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.compositor = config.compositor || 'hyprland'; // hyprland, sway, wlroots
    this.socketPath = config.socketPath || null;
    this.monitors = new Map();
    this.workspaces = new Map();
    this.surfaces = new Map();
    this.templates = new Map();
    this.activeWorkspace = 0;
    this.focusedSurface = null;
    this.ipcProcess = null;
    this.connected = false;

    // Initialize defaults
    this._initDefaults();
  }

  _initDefaults() {
    // Default templates
    this._addDefaultTemplates();

    // Default workspaces
    for (let i = 0; i < 10; i++) {
      this.workspaces.set(i, new Workspace({ id: i }));
    }
  }

  _addDefaultTemplates() {
    // Development template
    this.templates.set('dev', new DesktopTemplate({
      id: 'dev',
      name: 'Development',
      description: 'IDE + Terminal + Browser',
      workspaces: [
        { id: 1, name: 'Code', layout: 'tiled' },
        { id: 2, name: 'Terminal', layout: 'tabbed' },
        { id: 3, name: 'Browser', layout: 'tiled' },
      ],
      apps: [
        { command: 'code', workspace: 1 },
        { command: 'alacritty', workspace: 2 },
        { command: 'firefox', workspace: 3 },
      ],
      rules: [
        { class: 'Code', workspace: 1 },
        { class: 'Alacritty', workspace: 2 },
        { class: 'Firefox', workspace: 3 },
      ],
    }));

    // Security/hacking template
    this.templates.set('security', new DesktopTemplate({
      id: 'security',
      name: 'Security',
      description: 'Wireshark + Terminal + VM',
      workspaces: [
        { id: 1, name: 'Monitor', layout: 'tiled' },
        { id: 2, name: 'Terminal', layout: 'stacked' },
        { id: 3, name: 'VM', layout: 'floating' },
      ],
      apps: [
        { command: 'wireshark', workspace: 1 },
        { command: 'alacritty', workspace: 2, count: 4 },
        { command: 'virt-manager', workspace: 3 },
      ],
    }));

    // Media template
    this.templates.set('media', new DesktopTemplate({
      id: 'media',
      name: 'Media',
      description: 'Player + Editor',
      workspaces: [
        { id: 1, name: 'Player', layout: 'floating' },
        { id: 2, name: 'Editor', layout: 'tiled' },
      ],
      apps: [
        { command: 'mpv', workspace: 1 },
        { command: 'kdenlive', workspace: 2 },
      ],
    }));

    // Minimal template
    this.templates.set('minimal', new DesktopTemplate({
      id: 'minimal',
      name: 'Minimal',
      description: 'Single focused workspace',
      workspaces: [
        { id: 1, name: 'Focus', layout: 'floating' },
      ],
    }));
  }

  // Execute compositor command
  async _execCompositor(cmd) {
    return new Promise((resolve, reject) => {
      const fullCmd = this._buildCommand(cmd);
      exec(fullCmd, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout.trim());
      });
    });
  }

  _buildCommand(cmd) {
    switch (this.compositor) {
      case 'hyprland':
        return `hyprctl ${cmd}`;
      case 'sway':
        return `swaymsg ${cmd}`;
      default:
        return cmd;
    }
  }

  // Connect to compositor
  async connect() {
    try {
      // Detect compositor
      if (process.env.HYPRLAND_INSTANCE_SIGNATURE) {
        this.compositor = 'hyprland';
        this.socketPath = `/tmp/hypr/${process.env.HYPRLAND_INSTANCE_SIGNATURE}/.socket.sock`;
      } else if (process.env.SWAYSOCK) {
        this.compositor = 'sway';
        this.socketPath = process.env.SWAYSOCK;
      }

      // Get initial state
      await this.refreshState();
      this.connected = true;
      this.emit('connected', { compositor: this.compositor });
      return { success: true, compositor: this.compositor };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Disconnect
  disconnect() {
    if (this.ipcProcess) {
      this.ipcProcess.kill();
      this.ipcProcess = null;
    }
    this.connected = false;
    this.emit('disconnected');
    return { success: true };
  }

  // Refresh compositor state
  async refreshState() {
    try {
      // Get monitors
      const monitorsJson = await this._execCompositor('monitors -j');
      const monitorsData = JSON.parse(monitorsJson);
      this.monitors.clear();
      monitorsData.forEach((m, i) => {
        this.monitors.set(i, new Monitor({
          id: i,
          name: m.name,
          make: m.make || '',
          model: m.model || '',
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
          refreshRate: m.refreshRate,
          scale: m.scale,
          activeWorkspace: m.activeWorkspace?.id || 0,
        }));
      });

      // Get workspaces
      const workspacesJson = await this._execCompositor('workspaces -j');
      const workspacesData = JSON.parse(workspacesJson);
      workspacesData.forEach(w => {
        if (!this.workspaces.has(w.id)) {
          this.workspaces.set(w.id, new Workspace({ id: w.id, name: w.name }));
        }
        const ws = this.workspaces.get(w.id);
        ws.active = w.id === this.activeWorkspace;
        ws.monitor = w.monitor || 0;
      });

      // Get windows/surfaces
      const clientsJson = await this._execCompositor('clients -j');
      const clientsData = JSON.parse(clientsJson);
      this.surfaces.clear();
      clientsData.forEach(c => {
        const surface = new WaylandSurface({
          id: `surface_${c.address || c.pid}`,
          pid: c.pid,
          appId: c.class || '',
          title: c.title || '',
          class: c.class || '',
          x: c.at?.[0] || 0,
          y: c.at?.[1] || 0,
          width: c.size?.[0] || 800,
          height: c.size?.[1] || 600,
          workspace: c.workspace?.id || 0,
          monitor: c.monitor || 0,
          focused: c.focused || false,
          floating: c.floating || false,
          fullscreen: c.fullscreen || false,
        });
        this.surfaces.set(surface.id, surface);
        if (surface.focused) this.focusedSurface = surface.id;
      });

      // Get active workspace
      const activeWsJson = await this._execCompositor('activeworkspace -j');
      const activeWs = JSON.parse(activeWsJson);
      this.activeWorkspace = activeWs.id || 0;

      this.emit('state-refreshed');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Get monitors
  getMonitors() {
    return {
      success: true,
      monitors: Array.from(this.monitors.values()).map(m => m.toJSON()),
    };
  }

  // Get workspaces
  getWorkspaces() {
    return {
      success: true,
      workspaces: Array.from(this.workspaces.values()).map(w => w.toJSON()),
      active: this.activeWorkspace,
    };
  }

  // Get surfaces/windows
  getSurfaces(filter = {}) {
    let surfaces = Array.from(this.surfaces.values());

    if (filter.workspace !== undefined) {
      surfaces = surfaces.filter(s => s.workspace === filter.workspace);
    }
    if (filter.monitor !== undefined) {
      surfaces = surfaces.filter(s => s.monitor === filter.monitor);
    }
    if (filter.appId) {
      surfaces = surfaces.filter(s => s.appId.includes(filter.appId));
    }
    if (filter.focused !== undefined) {
      surfaces = surfaces.filter(s => s.focused === filter.focused);
    }

    return {
      success: true,
      surfaces: surfaces.map(s => s.toJSON()),
      focused: this.focusedSurface,
    };
  }

  // Switch workspace
  async switchWorkspace(workspaceId) {
    try {
      await this._execCompositor(`dispatch workspace ${workspaceId}`);
      this.activeWorkspace = workspaceId;
      this.emit('workspace-changed', { workspace: workspaceId });
      return { success: true, workspace: workspaceId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Create workspace
  async createWorkspace(data = {}) {
    const id = data.id || Math.max(...this.workspaces.keys()) + 1;
    const workspace = new Workspace({ ...data, id });
    this.workspaces.set(id, workspace);
    this.emit('workspace-created', { workspace: workspace.toJSON() });
    return { success: true, workspace: workspace.toJSON() };
  }

  // Delete workspace
  async deleteWorkspace(workspaceId) {
    if (!this.workspaces.has(workspaceId)) {
      return { success: false, error: 'Workspace not found' };
    }
    this.workspaces.delete(workspaceId);
    this.emit('workspace-deleted', { workspace: workspaceId });
    return { success: true };
  }

  // Move window to workspace
  async moveToWorkspace(surfaceId, workspaceId) {
    try {
      const surface = this.surfaces.get(surfaceId);
      if (!surface) return { success: false, error: 'Surface not found' };

      await this._execCompositor(`dispatch movetoworkspace ${workspaceId},address:${surface.id.replace('surface_', '')}`);
      surface.workspace = workspaceId;
      this.emit('surface-moved', { surface: surfaceId, workspace: workspaceId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Focus window
  async focusSurface(surfaceId) {
    try {
      const surface = this.surfaces.get(surfaceId);
      if (!surface) return { success: false, error: 'Surface not found' };

      await this._execCompositor(`dispatch focuswindow address:${surface.id.replace('surface_', '')}`);
      this.focusedSurface = surfaceId;
      this.emit('surface-focused', { surface: surfaceId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Close window
  async closeSurface(surfaceId) {
    try {
      const surface = this.surfaces.get(surfaceId);
      if (!surface) return { success: false, error: 'Surface not found' };

      await this._execCompositor(`dispatch closewindow address:${surface.id.replace('surface_', '')}`);
      this.surfaces.delete(surfaceId);
      this.emit('surface-closed', { surface: surfaceId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Toggle fullscreen
  async toggleFullscreen(surfaceId) {
    try {
      await this._execCompositor('dispatch fullscreen 0');
      const surface = this.surfaces.get(surfaceId);
      if (surface) surface.fullscreen = !surface.fullscreen;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Toggle floating
  async toggleFloating(surfaceId) {
    try {
      await this._execCompositor('dispatch togglefloating');
      const surface = this.surfaces.get(surfaceId);
      if (surface) surface.floating = !surface.floating;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Resize window
  async resizeSurface(surfaceId, width, height) {
    try {
      await this._execCompositor(`dispatch resizeactive exact ${width} ${height}`);
      const surface = this.surfaces.get(surfaceId);
      if (surface) {
        surface.width = width;
        surface.height = height;
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Move window
  async moveSurface(surfaceId, x, y) {
    try {
      await this._execCompositor(`dispatch moveactive exact ${x} ${y}`);
      const surface = this.surfaces.get(surfaceId);
      if (surface) {
        surface.x = x;
        surface.y = y;
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Set layout mode
  async setLayout(layout) {
    try {
      const layoutCmd = {
        [LAYOUT_MODE.TILED]: 'dwindle',
        [LAYOUT_MODE.FLOATING]: 'floating',
        [LAYOUT_MODE.TABBED]: 'tabbed',
        [LAYOUT_MODE.STACKED]: 'master',
      };
      await this._execCompositor(`keyword general:layout ${layoutCmd[layout] || layout}`);
      return { success: true, layout };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Launch application
  async launchApp(command, workspace = null) {
    try {
      if (workspace !== null) {
        await this._execCompositor(`dispatch exec [workspace ${workspace}] ${command}`);
      } else {
        await this._execCompositor(`dispatch exec ${command}`);
      }
      this.emit('app-launched', { command, workspace });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Apply template
  async applyTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) return { success: false, error: 'Template not found' };

    try {
      // Create workspaces
      for (const wsConfig of template.workspaces) {
        const ws = this.workspaces.get(wsConfig.id) || new Workspace(wsConfig);
        ws.name = wsConfig.name;
        ws.layout = wsConfig.layout || LAYOUT_MODE.TILED;
        this.workspaces.set(wsConfig.id, ws);
      }

      // Launch apps
      for (const app of template.apps) {
        const count = app.count || 1;
        for (let i = 0; i < count; i++) {
          await this.launchApp(app.command, app.workspace);
        }
      }

      this.emit('template-applied', { template: templateId });
      return { success: true, template: template.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // List templates
  listTemplates() {
    return {
      success: true,
      templates: Array.from(this.templates.values()).map(t => t.toJSON()),
    };
  }

  // Get template
  getTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) return { success: false, error: 'Template not found' };
    return { success: true, template: template.toJSON() };
  }

  // Create template
  createTemplate(data) {
    const template = new DesktopTemplate(data);
    this.templates.set(template.id, template);
    this.emit('template-created', { template: template.toJSON() });
    return { success: true, template: template.toJSON() };
  }

  // Save current layout as template
  saveAsTemplate(name, description = '') {
    const workspaces = Array.from(this.workspaces.values())
      .filter(ws => ws.surfaces.size > 0)
      .map(ws => ({
        id: ws.id,
        name: ws.name,
        layout: ws.layout,
      }));

    const apps = Array.from(this.surfaces.values()).map(s => ({
      command: s.appId,
      workspace: s.workspace,
    }));

    const template = new DesktopTemplate({
      name,
      description,
      workspaces,
      apps,
    });

    this.templates.set(template.id, template);
    return { success: true, template: template.toJSON() };
  }

  // Delete template
  deleteTemplate(templateId) {
    if (!this.templates.has(templateId)) {
      return { success: false, error: 'Template not found' };
    }
    this.templates.delete(templateId);
    return { success: true };
  }

  // Set keybinding
  async setKeybinding(key, action) {
    try {
      await this._execCompositor(`keyword bind ${key},${action}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Set window rule
  async setWindowRule(rule) {
    try {
      const ruleStr = `${rule.class || rule.title},${rule.action}`;
      await this._execCompositor(`keyword windowrule ${ruleStr}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Take screenshot
  async screenshot(region = 'screen') {
    try {
      const timestamp = Date.now();
      const filename = `/tmp/screenshot_${timestamp}.png`;

      switch (region) {
        case 'screen':
          await this._execCompositor(`dispatch exec grim ${filename}`);
          break;
        case 'window':
          await this._execCompositor(`dispatch exec grim -g "$(slurp)" ${filename}`);
          break;
        case 'select':
          await this._execCompositor(`dispatch exec grim -g "$(slurp)" ${filename}`);
          break;
      }

      return { success: true, path: filename };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Get status
  getStatus() {
    return {
      success: true,
      connected: this.connected,
      compositor: this.compositor,
      monitorCount: this.monitors.size,
      workspaceCount: this.workspaces.size,
      surfaceCount: this.surfaces.size,
      activeWorkspace: this.activeWorkspace,
      focusedSurface: this.focusedSurface,
    };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      WINDOW_STATE,
      LAYOUT_MODE,
      WORKSPACE_TYPE,
    };
  }
}

module.exports = {
  WaylandClient,
  WaylandSurface,
  Workspace,
  DesktopTemplate,
  Monitor,
  WINDOW_STATE,
  LAYOUT_MODE,
  WORKSPACE_TYPE,
};
