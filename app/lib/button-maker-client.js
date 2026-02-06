// GentlyOS Button Maker - Custom Button Creator with Noun Project Icons
// Visual button designer for toolbars, menus, and actions

const { EventEmitter } = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Button shapes
const SHAPE = {
  SQUARE: 'square',
  ROUND: 'round',
  PILL: 'pill',
  HEXAGON: 'hexagon',
  DIAMOND: 'diamond',
  CUSTOM: 'custom',
};

// Button sizes
const SIZE = {
  TINY: { width: 24, height: 24, iconSize: 14 },
  SMALL: { width: 32, height: 32, iconSize: 18 },
  MEDIUM: { width: 48, height: 48, iconSize: 28 },
  LARGE: { width: 64, height: 64, iconSize: 40 },
  XLARGE: { width: 96, height: 96, iconSize: 60 },
};

// Icon categories from Noun Project
const ICON_CATEGORIES = {
  actions: ['play', 'pause', 'stop', 'forward', 'back', 'refresh', 'download', 'upload', 'share', 'edit', 'delete', 'add', 'remove', 'check', 'close', 'menu'],
  navigation: ['home', 'search', 'settings', 'user', 'folder', 'file', 'grid', 'list', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'chevron-up', 'chevron-down'],
  communication: ['message', 'mail', 'phone', 'video', 'chat', 'bell', 'mic', 'speaker', 'volume', 'mute'],
  media: ['image', 'camera', 'music', 'film', 'tv', 'headphones', 'radio', 'podcast'],
  tools: ['wrench', 'hammer', 'screwdriver', 'gear', 'cog', 'tool', 'brush', 'pen', 'pencil', 'ruler'],
  tech: ['code', 'terminal', 'server', 'database', 'cloud', 'wifi', 'bluetooth', 'cpu', 'memory', 'storage'],
  security: ['lock', 'unlock', 'shield', 'key', 'eye', 'eye-off', 'fingerprint', 'scan'],
  finance: ['wallet', 'credit-card', 'bitcoin', 'dollar', 'euro', 'chart', 'graph', 'trending'],
  gaming: ['gamepad', 'joystick', 'trophy', 'medal', 'star', 'heart', 'flag', 'target'],
  system: ['power', 'battery', 'plug', 'sun', 'moon', 'thermometer', 'gauge', 'signal'],
};

// Generate ID
function generateId(prefix = 'btn') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// Button definition
class ButtonDefinition {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Untitled Button';
    this.icon = data.icon || 'circle';
    this.iconColor = data.iconColor || '#ffffff';
    this.iconSize = data.iconSize || 'auto';
    this.backgroundColor = data.backgroundColor || '#333333';
    this.hoverColor = data.hoverColor || '#444444';
    this.activeColor = data.activeColor || '#555555';
    this.borderColor = data.borderColor || 'transparent';
    this.borderWidth = data.borderWidth || 0;
    this.shape = data.shape || SHAPE.ROUND;
    this.size = data.size || 'medium';
    this.label = data.label || '';
    this.labelPosition = data.labelPosition || 'bottom'; // top, bottom, left, right, none
    this.labelColor = data.labelColor || '#ffffff';
    this.action = data.action || null;
    this.tooltip = data.tooltip || '';
    this.disabled = data.disabled || false;
    this.visible = data.visible !== false;
    this.customSvg = data.customSvg || null;
    this.animation = data.animation || 'none'; // none, pulse, bounce, spin, shake
    this.badge = data.badge || null; // { text: '3', color: '#ff0000' }
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  // Generate CSS for this button
  generateCSS(selector = '') {
    const s = SIZE[this.size.toUpperCase()] || SIZE.MEDIUM;
    const prefix = selector || `#${this.id}`;

    let borderRadius;
    switch (this.shape) {
      case SHAPE.ROUND: borderRadius = '50%'; break;
      case SHAPE.PILL: borderRadius = `${s.height / 2}px`; break;
      case SHAPE.HEXAGON: borderRadius = '0'; break;
      case SHAPE.DIAMOND: borderRadius = '0'; break;
      default: borderRadius = '8px';
    }

    return `
${prefix} {
  width: ${s.width}px;
  height: ${s.height}px;
  background: ${this.backgroundColor};
  border: ${this.borderWidth}px solid ${this.borderColor};
  border-radius: ${borderRadius};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${this.disabled ? 0.5 : 1};
  transition: all 0.15s ease;
  position: relative;
}
${prefix}:hover {
  background: ${this.hoverColor};
}
${prefix}:active {
  background: ${this.activeColor};
  transform: scale(0.95);
}
${prefix} svg {
  width: ${this.iconSize === 'auto' ? s.iconSize : this.iconSize}px;
  height: ${this.iconSize === 'auto' ? s.iconSize : this.iconSize}px;
  fill: ${this.iconColor};
}
${prefix} .btn-label {
  position: absolute;
  ${this.labelPosition === 'bottom' ? 'top: 100%; margin-top: 4px;' : ''}
  ${this.labelPosition === 'top' ? 'bottom: 100%; margin-bottom: 4px;' : ''}
  ${this.labelPosition === 'left' ? 'right: 100%; margin-right: 4px;' : ''}
  ${this.labelPosition === 'right' ? 'left: 100%; margin-left: 4px;' : ''}
  color: ${this.labelColor};
  font-size: 10px;
  white-space: nowrap;
}
${prefix} .btn-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: ${this.badge?.color || '#ff0000'};
  color: #fff;
  font-size: 9px;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}
`.trim();
  }

  // Generate HTML for this button
  generateHTML() {
    const iconSvg = this.customSvg || `<svg><use href="#i-${this.icon}"></use></svg>`;
    const labelHtml = this.label && this.labelPosition !== 'none'
      ? `<span class="btn-label">${this.label}</span>` : '';
    const badgeHtml = this.badge
      ? `<span class="btn-badge">${this.badge.text}</span>` : '';

    return `
<button id="${this.id}" class="gently-btn ${this.shape} ${this.animation}"
        data-action="${this.action || ''}"
        ${this.disabled ? 'disabled' : ''}
        ${this.tooltip ? `title="${this.tooltip}"` : ''}>
  ${iconSvg}
  ${labelHtml}
  ${badgeHtml}
</button>
`.trim();
  }

  // Clone button
  clone() {
    const data = this.toJSON();
    data.id = generateId();
    data.name = `${this.name} (copy)`;
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    return new ButtonDefinition(data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      iconColor: this.iconColor,
      iconSize: this.iconSize,
      backgroundColor: this.backgroundColor,
      hoverColor: this.hoverColor,
      activeColor: this.activeColor,
      borderColor: this.borderColor,
      borderWidth: this.borderWidth,
      shape: this.shape,
      size: this.size,
      label: this.label,
      labelPosition: this.labelPosition,
      labelColor: this.labelColor,
      action: this.action,
      tooltip: this.tooltip,
      disabled: this.disabled,
      visible: this.visible,
      customSvg: this.customSvg,
      animation: this.animation,
      badge: this.badge,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Button palette/collection
class ButtonPalette {
  constructor(data = {}) {
    this.id = data.id || generateId('palette');
    this.name = data.name || 'Untitled Palette';
    this.description = data.description || '';
    this.buttons = new Map();
    this.theme = data.theme || {
      primary: '#0066ff',
      secondary: '#666666',
      accent: '#ff6600',
      background: '#222222',
      text: '#ffffff',
    };
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  addButton(button) {
    if (!(button instanceof ButtonDefinition)) {
      button = new ButtonDefinition(button);
    }
    this.buttons.set(button.id, button);
    this.updatedAt = Date.now();
    return button;
  }

  removeButton(buttonId) {
    this.buttons.delete(buttonId);
    this.updatedAt = Date.now();
  }

  getButton(buttonId) {
    return this.buttons.get(buttonId);
  }

  listButtons() {
    return Array.from(this.buttons.values());
  }

  // Generate combined CSS for all buttons
  generateCSS() {
    return this.listButtons().map(b => b.generateCSS()).join('\n\n');
  }

  // Generate combined HTML for all buttons
  generateHTML() {
    return `<div class="button-palette" id="${this.id}">\n${
      this.listButtons().map(b => '  ' + b.generateHTML()).join('\n')
    }\n</div>`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      buttons: this.listButtons().map(b => b.toJSON()),
      theme: this.theme,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Noun Project API client (mock for local icons)
class NounProjectClient {
  constructor(apiKey = null, apiSecret = null) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.cache = new Map();
    this.localIcons = this._loadLocalIcons();
  }

  _loadLocalIcons() {
    // Built-in icon set (SVG paths)
    return {
      'circle': '<circle cx="12" cy="12" r="10"/>',
      'square': '<rect x="3" y="3" width="18" height="18" rx="2"/>',
      'play': '<polygon points="5,3 19,12 5,21"/>',
      'pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
      'stop': '<rect x="4" y="4" width="16" height="16"/>',
      'home': '<path d="M3,12 L5,10 L5,19 C5,20.1 5.9,21 7,21 L17,21 C18.1,21 19,20.1 19,19 L19,10 L21,12 L12,3 Z"/>',
      'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4,15 a1.65,1.65 0 0 0 .33,1.82 l.06.06 a2,2 0 0 1 -1.42,3.42 a2,2 0 0 1 -1.41-.59 l-.06-.06 a1.65,1.65 0 0 0 -1.82-.33 a1.65,1.65 0 0 0 -1,1.51 V21 a2,2 0 0 1 -4,0 v-.09 A1.65,1.65 0 0 0 9,19.4 a1.65,1.65 0 0 0 -1.82.33 l-.06.06 a2,2 0 0 1 -3.42,-1.42 a2,2 0 0 1 .59,-1.41 l.06-.06 a1.65,1.65 0 0 0 .33,-1.82 a1.65,1.65 0 0 0 -1.51,-1 H3 a2,2 0 0 1 0,-4 h.09 A1.65,1.65 0 0 0 4.6,9 a1.65,1.65 0 0 0 -.33,-1.82 l-.06-.06 a2,2 0 1 1 2.83,-2.83 l.06.06 a1.65,1.65 0 0 0 1.82.33 H9 a1.65,1.65 0 0 0 1,-1.51 V3 a2,2 0 0 1 4,0 v.09 a1.65,1.65 0 0 0 1,1.51 a1.65,1.65 0 0 0 1.82,-.33 l.06-.06 a2,2 0 1 1 2.83,2.83 l-.06.06 a1.65,1.65 0 0 0 -.33,1.82 V9 a1.65,1.65 0 0 0 1.51,1 H21 a2,2 0 0 1 0,4 h-.09 a1.65,1.65 0 0 0 -1.51,1 z"/>',
      'cog': '<path d="M12,15.5 A3.5,3.5 0 1 1 12,8.5 A3.5,3.5 0 0 1 12,15.5 M19.43,12.98 C19.47,12.66 19.5,12.34 19.5,12 C19.5,11.66 19.47,11.34 19.43,11.02 L21.54,9.37 C21.73,9.22 21.78,8.95 21.66,8.73 L19.66,5.27 C19.54,5.05 19.27,4.97 19.05,5.05 L16.56,6.05 C16.04,5.65 15.48,5.32 14.87,5.07 L14.49,2.42 C14.46,2.18 14.25,2 14,2 L10,2 C9.75,2 9.54,2.18 9.51,2.42 L9.13,5.07 C8.52,5.32 7.96,5.66 7.44,6.05 L4.95,5.05 C4.73,4.96 4.46,5.05 4.34,5.27 L2.34,8.73 C2.21,8.95 2.27,9.22 2.46,9.37 L4.57,11.02 C4.53,11.34 4.5,11.67 4.5,12 C4.5,12.33 4.53,12.66 4.57,12.98 L2.46,14.63 C2.27,14.78 2.21,15.05 2.34,15.27 L4.34,18.73 C4.46,18.95 4.73,19.03 4.95,18.95 L7.44,17.95 C7.96,18.35 8.52,18.68 9.13,18.93 L9.51,21.58 C9.54,21.82 9.75,22 10,22 L14,22 C14.25,22 14.46,21.82 14.49,21.58 L14.87,18.93 C15.48,18.68 16.04,18.34 16.56,17.95 L19.05,18.95 C19.27,19.04 19.54,18.95 19.66,18.73 L21.66,15.27 C21.78,15.05 21.73,14.78 21.54,14.63 L19.43,12.98 Z"/>',
      'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      'user': '<path d="M20,21 v-2 a4,4 0 0 0 -4,-4 H8 a4,4 0 0 0 -4,4 v2"/><circle cx="12" cy="7" r="4"/>',
      'folder': '<path d="M22,19 a2,2 0 0 1 -2,2 H4 a2,2 0 0 1 -2,-2 V5 a2,2 0 0 1 2,-2 h5 l2,3 h9 a2,2 0 0 1 2,2 z"/>',
      'file': '<path d="M13,2 H6 a2,2 0 0 0 -2,2 v16 a2,2 0 0 0 2,2 h12 a2,2 0 0 0 2,-2 V9 Z"/><polyline points="13,2 13,9 20,9"/>',
      'message': '<path d="M21,15 a2,2 0 0 1 -2,2 H7 l-4,4 V5 a2,2 0 0 1 2,-2 h14 a2,2 0 0 1 2,2 z"/>',
      'mail': '<path d="M4,4 h16 c1.1,0 2,0.9 2,2 v12 c0,1.1 -0.9,2 -2,2 H4 c-1.1,0 -2,-0.9 -2,-2 V6 c0,-1.1 0.9,-2 2,-2 z"/><polyline points="22,6 12,13 2,6"/>',
      'phone': '<path d="M22,16.92 v3 a2,2 0 0 1 -2.18,2 a19.79,19.79 0 0 1 -8.63,-3.07 a19.5,19.5 0 0 1 -6,-6 a19.79,19.79 0 0 1 -3.07,-8.67 A2,2 0 0 1 4.11,2 h3 a2,2 0 0 1 2,1.72 a12.84,12.84 0 0 0 .7,2.81 a2,2 0 0 1 -.45,2.11 L8.09,9.91 a16,16 0 0 0 6,6 l1.27,-1.27 a2,2 0 0 1 2.11,-.45 a12.84,12.84 0 0 0 2.81,.7 A2,2 0 0 1 22,16.92 z"/>',
      'terminal': '<polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/>',
      'code': '<polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>',
      'server': '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
      'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21,12 c0,1.66 -4,3 -9,3 s-9,-1.34 -9,-3"/><path d="M3,5 v14 c0,1.66 4,3 9,3 s9,-1.34 9,-3 V5"/>',
      'wifi': '<path d="M5,12.55 a11,11 0 0 1 14.08,0"/><path d="M1.42,9 a16,16 0 0 1 21.16,0"/><path d="M8.53,16.11 a6,6 0 0 1 6.95,0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
      'bluetooth': '<polyline points="6.5,6.5 17.5,17.5 12,23 12,1 17.5,6.5 6.5,17.5"/>',
      'lock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7,11 V7 a5,5 0 0 1 10,0 v4"/>',
      'unlock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7,11 V7 a5,5 0 0 1 9.9,-1"/>',
      'shield': '<path d="M12,22 s8,-4 8,-10 V5 l-8,-3 l-8,3 v7 c0,6 8,10 8,10 z"/>',
      'key': '<path d="M21,2 l-2,2 m-7.61,7.61 a5.5,5.5 0 1 1 -7.778,7.778 a5.5,5.5 0 0 1 7.777,-7.777 z m0,0 L15.5,7.5 m0,0 l3,3 L22,7 l-3,-3 m-3.5,3.5 L19,4"/>',
      'eye': '<path d="M1,12 s4,-8 11,-8 s11,8 11,8 s-4,8 -11,8 s-11,-8 -11,-8 z"/><circle cx="12" cy="12" r="3"/>',
      'power': '<path d="M18.36,6.64 a9,9 0 1 1 -12.73,0"/><line x1="12" y1="2" x2="12" y2="12"/>',
      'battery': '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="13" x2="23" y2="11"/>',
      'zap': '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>',
      'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
      'moon': '<path d="M21,12.79 A9,9 0 1 1 11.21,3 A7,7 0 0 0 21,12.79 z"/>',
      'bitcoin': '<path d="M11.767,19.089 c4.924,.868 6.14,-6.025 1.216,-6.894 m-1.216,6.894 L5.86,18.047 m5.908,1.042 l-.347,1.97 m1.563,-8.864 c4.924,.869 6.14,-6.025 1.215,-6.893 m-1.215,6.893 l-3.94,-.694 m5.155,-6.2 L8.29,4.26 m5.908,1.042 l.348,-1.97 M7.48,16.93 l1.86,-10.56 m0,0 l-.347,1.97"/>',
      'gamepad': '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>',
      'layers': '<polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/>',
      'grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
      'close': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      'check': '<polyline points="20,6 9,17 4,12"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
      'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/>',
      'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/>',
      'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>',
      'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>',
      'refresh': '<polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51,9 a9,9 0 0 1 14.85,-3.36 L23,10 M1,14 l4.64,4.36 A9,9 0 0 0 20.49,15"/>',
      'download': '<path d="M21,15 v4 a2,2 0 0 1 -2,2 H5 a2,2 0 0 1 -2,-2 v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>',
      'upload': '<path d="M21,15 v4 a2,2 0 0 1 -2,2 H5 a2,2 0 0 1 -2,-2 v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
      'wrench': '<path d="M14.7,6.3 a1,1 0 0 0 0,1.4 l1.6,1.6 a1,1 0 0 0 1.4,0 l3.77,-3.77 a6,6 0 0 1 -7.94,7.94 l-6.91,6.91 a2.12,2.12 0 0 1 -3,-3 l6.91,-6.91 a6,6 0 0 1 7.94,-7.94 l-3.76,3.76 z"/>',
      'radar': '<circle cx="12" cy="12" r="10"/><path d="M12,2 a10,10 0 0 1 10,10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="12"/>',
      'sms': '<path d="M21,15 a2,2 0 0 1 -2,2 H7 l-4,4 V5 a2,2 0 0 1 2,-2 h14 a2,2 0 0 1 2,2 z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>',
    };
  }

  // Get icon SVG
  getIcon(name) {
    const path = this.localIcons[name];
    if (!path) return this.localIcons['circle'];
    return path;
  }

  // Get full SVG element
  getIconSvg(name, size = 24, color = '#ffffff') {
    const content = this.getIcon(name);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  }

  // Search icons
  searchIcons(query) {
    const results = [];
    const q = query.toLowerCase();
    for (const name of Object.keys(this.localIcons)) {
      if (name.includes(q)) {
        results.push({ name, svg: this.getIcon(name) });
      }
    }
    return results;
  }

  // List all icons
  listIcons() {
    return Object.keys(this.localIcons).map(name => ({
      name,
      svg: this.getIcon(name),
    }));
  }

  // Get icons by category
  getCategory(category) {
    const icons = ICON_CATEGORIES[category] || [];
    return icons.map(name => ({
      name,
      svg: this.getIcon(name),
    }));
  }

  // List categories
  listCategories() {
    return Object.keys(ICON_CATEGORIES);
  }
}

// Main Button Maker Client
class ButtonMakerClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.palettes = new Map();
    this.nounProject = new NounProjectClient(config.apiKey, config.apiSecret);
    this.savePath = config.savePath || null;
    this.history = [];
    this.maxHistory = 50;

    // Create default palette
    this._initDefaultPalette();
  }

  _initDefaultPalette() {
    const defaultPalette = new ButtonPalette({
      id: 'default',
      name: 'Default Palette',
      description: 'Built-in button styles',
    });

    // Add some default buttons
    defaultPalette.addButton({
      name: 'Primary Action',
      icon: 'check',
      backgroundColor: '#0066ff',
      hoverColor: '#0055dd',
      activeColor: '#0044bb',
      action: 'action:primary',
    });

    defaultPalette.addButton({
      name: 'Secondary Action',
      icon: 'close',
      backgroundColor: '#666666',
      hoverColor: '#555555',
      activeColor: '#444444',
      action: 'action:secondary',
    });

    defaultPalette.addButton({
      name: 'Settings',
      icon: 'settings',
      backgroundColor: '#333333',
      hoverColor: '#444444',
      action: 'app:settings',
    });

    this.palettes.set('default', defaultPalette);
  }

  // Create new button
  createButton(data) {
    const button = new ButtonDefinition(data);
    this.emit('button-created', { button: button.toJSON() });
    this._addToHistory('create', button);
    return { success: true, button: button.toJSON() };
  }

  // Create button from template
  createFromTemplate(template, overrides = {}) {
    const templates = {
      'icon-only': {
        labelPosition: 'none',
        shape: SHAPE.ROUND,
        size: 'medium',
      },
      'labeled': {
        labelPosition: 'bottom',
        shape: SHAPE.SQUARE,
        size: 'medium',
      },
      'pill': {
        shape: SHAPE.PILL,
        size: 'small',
        labelPosition: 'none',
      },
      'toolbar': {
        shape: SHAPE.SQUARE,
        size: 'small',
        labelPosition: 'none',
        borderRadius: 4,
      },
      'floating': {
        shape: SHAPE.ROUND,
        size: 'large',
        animation: 'pulse',
        backgroundColor: '#0066ff',
      },
    };

    const base = templates[template] || {};
    const button = new ButtonDefinition({ ...base, ...overrides });
    this._addToHistory('create-template', button);
    return { success: true, button: button.toJSON() };
  }

  // Update button
  updateButton(buttonId, paletteId, updates) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    const button = palette.getButton(buttonId);
    if (!button) return { success: false, error: 'Button not found' };

    Object.assign(button, updates, { updatedAt: Date.now() });
    this._addToHistory('update', button);
    this.emit('button-updated', { button: button.toJSON() });
    return { success: true, button: button.toJSON() };
  }

  // Delete button
  deleteButton(buttonId, paletteId) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    const button = palette.getButton(buttonId);
    if (!button) return { success: false, error: 'Button not found' };

    palette.removeButton(buttonId);
    this._addToHistory('delete', button);
    this.emit('button-deleted', { buttonId });
    return { success: true };
  }

  // Clone button
  cloneButton(buttonId, paletteId) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    const button = palette.getButton(buttonId);
    if (!button) return { success: false, error: 'Button not found' };

    const clone = button.clone();
    palette.addButton(clone);
    this._addToHistory('clone', clone);
    return { success: true, button: clone.toJSON() };
  }

  // Create palette
  createPalette(data) {
    const palette = new ButtonPalette(data);
    this.palettes.set(palette.id, palette);
    this.emit('palette-created', { palette: palette.toJSON() });
    return { success: true, palette: palette.toJSON() };
  }

  // Get palette
  getPalette(paletteId) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };
    return { success: true, palette: palette.toJSON() };
  }

  // List palettes
  listPalettes() {
    return {
      success: true,
      palettes: Array.from(this.palettes.values()).map(p => ({
        id: p.id,
        name: p.name,
        buttonCount: p.buttons.size,
      })),
    };
  }

  // Delete palette
  deletePalette(paletteId) {
    if (paletteId === 'default') {
      return { success: false, error: 'Cannot delete default palette' };
    }
    if (!this.palettes.has(paletteId)) {
      return { success: false, error: 'Palette not found' };
    }
    this.palettes.delete(paletteId);
    this.emit('palette-deleted', { paletteId });
    return { success: true };
  }

  // Add button to palette
  addToPalette(paletteId, buttonData) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    const button = palette.addButton(buttonData);
    this.emit('button-added-to-palette', { paletteId, button: button.toJSON() });
    return { success: true, button: button.toJSON() };
  }

  // Generate CSS for button/palette
  generateCSS(paletteId = 'default', buttonId = null) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    if (buttonId) {
      const button = palette.getButton(buttonId);
      if (!button) return { success: false, error: 'Button not found' };
      return { success: true, css: button.generateCSS() };
    }

    return { success: true, css: palette.generateCSS() };
  }

  // Generate HTML for button/palette
  generateHTML(paletteId = 'default', buttonId = null) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };

    if (buttonId) {
      const button = palette.getButton(buttonId);
      if (!button) return { success: false, error: 'Button not found' };
      return { success: true, html: button.generateHTML() };
    }

    return { success: true, html: palette.generateHTML() };
  }

  // Get icon
  getIcon(name) {
    return {
      success: true,
      icon: { name, svg: this.nounProject.getIcon(name) },
    };
  }

  // Get icon SVG
  getIconSvg(name, size = 24, color = '#ffffff') {
    return {
      success: true,
      svg: this.nounProject.getIconSvg(name, size, color),
    };
  }

  // Search icons
  searchIcons(query) {
    return {
      success: true,
      icons: this.nounProject.searchIcons(query),
    };
  }

  // List all icons
  listIcons() {
    return {
      success: true,
      icons: this.nounProject.listIcons(),
    };
  }

  // Get icons by category
  getIconCategory(category) {
    return {
      success: true,
      category,
      icons: this.nounProject.getCategory(category),
    };
  }

  // List icon categories
  listIconCategories() {
    return {
      success: true,
      categories: this.nounProject.listCategories(),
    };
  }

  // Export palette to JSON
  exportPalette(paletteId) {
    const palette = this.palettes.get(paletteId);
    if (!palette) return { success: false, error: 'Palette not found' };
    return { success: true, data: JSON.stringify(palette.toJSON(), null, 2) };
  }

  // Import palette from JSON
  importPalette(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const palette = new ButtonPalette(data);
      data.buttons?.forEach(b => palette.addButton(new ButtonDefinition(b)));
      this.palettes.set(palette.id, palette);
      return { success: true, palette: palette.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Save palette to file
  async savePalette(paletteId, filePath) {
    const result = this.exportPalette(paletteId);
    if (!result.success) return result;

    try {
      fs.writeFileSync(filePath, result.data);
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Load palette from file
  async loadPalette(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return this.importPalette(data);
    } catch (e) {
      return { success: false, error: e.message };
    }
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

  _addToHistory(action, button) {
    this.history.unshift({
      action,
      buttonId: button.id,
      buttonName: button.name,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      SHAPE,
      SIZE,
      ICON_CATEGORIES,
    };
  }
}

module.exports = {
  ButtonMakerClient,
  ButtonDefinition,
  ButtonPalette,
  NounProjectClient,
  SHAPE,
  SIZE,
  ICON_CATEGORIES,
};
