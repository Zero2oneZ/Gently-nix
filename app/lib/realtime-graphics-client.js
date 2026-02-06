// GentlyOS Realtime Graphics Client - On-Screen Rendering Engine
// WebGL-based real-time graphics for shelf AI chat overlays

const EventEmitter = require('events');

// Render modes
const RENDER_MODE = {
  OVERLAY: 'overlay',      // Transparent overlay on content
  SHELF: 'shelf',          // Contained in shelf panel
  FULLSCREEN: 'fullscreen', // Full window rendering
  PIP: 'pip',              // Picture-in-picture floating
};

// Effect types
const EFFECT_TYPE = {
  NONE: 'none',
  PARTICLES: 'particles',
  GLOW: 'glow',
  WAVE: 'wave',
  RIPPLE: 'ripple',
  MATRIX: 'matrix',
  AURORA: 'aurora',
  PULSE: 'pulse',
};

// Layer types for compositing
const LAYER_TYPE = {
  BACKGROUND: 'background',
  AVATAR: 'avatar',
  CHAT_BUBBLE: 'chat_bubble',
  EFFECT: 'effect',
  UI: 'ui',
};

// Graphics layer class
class GraphicsLayer {
  constructor(config = {}) {
    this.id = config.id || `layer_${Date.now()}`;
    this.type = config.type || LAYER_TYPE.UI;
    this.visible = config.visible !== false;
    this.opacity = config.opacity || 1;
    this.zIndex = config.zIndex || 0;
    this.position = config.position || { x: 0, y: 0 };
    this.size = config.size || { width: 100, height: 100 };
    this.content = config.content || null;
    this.effects = config.effects || [];
    this.transform = config.transform || { scale: 1, rotation: 0 };
  }

  setPosition(x, y) {
    this.position = { x, y };
    return this;
  }

  setSize(width, height) {
    this.size = { width, height };
    return this;
  }

  setOpacity(value) {
    this.opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  addEffect(effect) {
    this.effects.push(effect);
    return this;
  }

  toRenderData() {
    return {
      id: this.id,
      type: this.type,
      visible: this.visible,
      opacity: this.opacity,
      zIndex: this.zIndex,
      position: this.position,
      size: this.size,
      content: this.content,
      effects: this.effects,
      transform: this.transform,
    };
  }
}

// Chat bubble for AI responses
class ChatBubble extends GraphicsLayer {
  constructor(config = {}) {
    super({
      ...config,
      type: LAYER_TYPE.CHAT_BUBBLE,
    });
    this.text = config.text || '';
    this.speaker = config.speaker || 'ai';
    this.typing = false;
    this.typingIndex = 0;
    this.displayedText = '';
    this.style = config.style || {
      background: 'rgba(30, 30, 40, 0.9)',
      borderColor: '#6366f1',
      textColor: '#ffffff',
      fontSize: 14,
      padding: 12,
      borderRadius: 12,
      maxWidth: 320,
    };
  }

  setText(text) {
    this.text = text;
    this.displayedText = '';
    this.typingIndex = 0;
    return this;
  }

  startTyping() {
    this.typing = true;
    this.typingIndex = 0;
    this.displayedText = '';
    return this;
  }

  updateTyping(charsPerFrame = 2) {
    if (!this.typing) return false;

    this.typingIndex = Math.min(this.typingIndex + charsPerFrame, this.text.length);
    this.displayedText = this.text.substring(0, this.typingIndex);

    if (this.typingIndex >= this.text.length) {
      this.typing = false;
      return false;
    }
    return true;
  }

  toRenderData() {
    return {
      ...super.toRenderData(),
      text: this.displayedText || this.text,
      fullText: this.text,
      speaker: this.speaker,
      typing: this.typing,
      style: this.style,
    };
  }
}

// Particle system for effects
class ParticleSystem {
  constructor(config = {}) {
    this.particles = [];
    this.maxParticles = config.maxParticles || 100;
    this.emissionRate = config.emissionRate || 5;
    this.gravity = config.gravity || { x: 0, y: 0.1 };
    this.bounds = config.bounds || { x: 0, y: 0, width: 400, height: 300 };
    this.particleConfig = {
      minSize: config.minSize || 2,
      maxSize: config.maxSize || 8,
      minLife: config.minLife || 30,
      maxLife: config.maxLife || 90,
      colors: config.colors || ['#6366f1', '#8b5cf6', '#a855f7'],
      velocity: config.velocity || { minX: -2, maxX: 2, minY: -3, maxY: -1 },
    };
  }

  emit(x, y, count = 1) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const pc = this.particleConfig;
      this.particles.push({
        x, y,
        vx: pc.velocity.minX + Math.random() * (pc.velocity.maxX - pc.velocity.minX),
        vy: pc.velocity.minY + Math.random() * (pc.velocity.maxY - pc.velocity.minY),
        size: pc.minSize + Math.random() * (pc.maxSize - pc.minSize),
        life: pc.minLife + Math.random() * (pc.maxLife - pc.minLife),
        maxLife: pc.maxLife,
        color: pc.colors[Math.floor(Math.random() * pc.colors.length)],
      });
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx += this.gravity.x;
      p.vy += this.gravity.y;
      p.life--;
      return p.life > 0;
    });
  }

  toRenderData() {
    return this.particles.map(p => ({
      x: p.x,
      y: p.y,
      size: p.size,
      opacity: p.life / p.maxLife,
      color: p.color,
    }));
  }
}

// Animation easing functions
const EASING = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutElastic: t => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// Main graphics client
class RealtimeGraphicsClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.mode = config.mode || RENDER_MODE.SHELF;
    this.layers = new Map();
    this.particleSystems = new Map();
    this.animations = [];
    this.running = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.targetFPS = config.targetFPS || 60;
    this.frameInterval = 1000 / this.targetFPS;

    // Canvas dimensions
    this.width = config.width || 400;
    this.height = config.height || 300;

    // Active effect
    this.activeEffect = EFFECT_TYPE.NONE;

    // Chat state
    this.chatBubbles = [];
    this.maxBubbles = config.maxBubbles || 5;
  }

  // Initialize the graphics system
  initialize() {
    this.running = true;
    this.lastFrameTime = Date.now();
    this.emit('initialized');
    return { success: true };
  }

  // Start render loop
  startRenderLoop() {
    if (!this.running) return;

    const loop = () => {
      if (!this.running) return;

      const now = Date.now();
      const delta = now - this.lastFrameTime;

      if (delta >= this.frameInterval) {
        this.update(delta);
        this.render();
        this.lastFrameTime = now - (delta % this.frameInterval);
        this.frameCount++;
      }

      if (this.running) {
        setImmediate(loop);
      }
    };

    loop();
  }

  // Update all systems
  update(delta) {
    // Update particle systems
    this.particleSystems.forEach(ps => ps.update());

    // Update animations
    this.animations = this.animations.filter(anim => {
      anim.elapsed += delta;
      const progress = Math.min(anim.elapsed / anim.duration, 1);
      const eased = (EASING[anim.easing] || EASING.linear)(progress);

      // Apply animation
      if (anim.target && anim.property) {
        const layer = this.layers.get(anim.target);
        if (layer) {
          const value = anim.from + (anim.to - anim.from) * eased;
          this._setNestedProperty(layer, anim.property, value);
        }
      }

      if (progress >= 1) {
        if (anim.onComplete) anim.onComplete();
        return false;
      }
      return true;
    });

    // Update chat bubbles typing
    this.chatBubbles.forEach(bubble => {
      if (bubble.typing) {
        bubble.updateTyping();
      }
    });

    this.emit('update', { frameCount: this.frameCount, delta });
  }

  // Render current frame
  render() {
    const renderData = {
      mode: this.mode,
      width: this.width,
      height: this.height,
      frameCount: this.frameCount,
      layers: [],
      particles: {},
      chatBubbles: this.chatBubbles.map(b => b.toRenderData()),
      activeEffect: this.activeEffect,
    };

    // Sort layers by zIndex
    const sortedLayers = Array.from(this.layers.values())
      .filter(l => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    renderData.layers = sortedLayers.map(l => l.toRenderData());

    // Add particle data
    this.particleSystems.forEach((ps, id) => {
      renderData.particles[id] = ps.toRenderData();
    });

    this.emit('render', renderData);
    return renderData;
  }

  // Add a layer
  addLayer(layer) {
    if (!(layer instanceof GraphicsLayer)) {
      layer = new GraphicsLayer(layer);
    }
    this.layers.set(layer.id, layer);
    return layer;
  }

  // Remove a layer
  removeLayer(id) {
    return this.layers.delete(id);
  }

  // Get a layer
  getLayer(id) {
    return this.layers.get(id);
  }

  // Add chat bubble with typing animation
  addChatBubble(text, speaker = 'ai', options = {}) {
    const bubble = new ChatBubble({
      text,
      speaker,
      position: options.position || this._getNextBubblePosition(),
      ...options,
    });

    if (options.typeIn !== false) {
      bubble.startTyping();
    }

    this.chatBubbles.push(bubble);

    // Remove oldest if exceeds max
    while (this.chatBubbles.length > this.maxBubbles) {
      this.chatBubbles.shift();
    }

    this.emit('chat-bubble', bubble.toRenderData());
    return bubble;
  }

  // Calculate next bubble position
  _getNextBubblePosition() {
    const baseY = this.height - 80;
    const offset = this.chatBubbles.length * 70;
    return { x: 20, y: Math.max(20, baseY - offset) };
  }

  // Clear all chat bubbles
  clearChatBubbles() {
    this.chatBubbles = [];
  }

  // Add particle system
  addParticleSystem(id, config = {}) {
    const ps = new ParticleSystem({
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
      ...config,
    });
    this.particleSystems.set(id, ps);
    return ps;
  }

  // Emit particles
  emitParticles(systemId, x, y, count = 10) {
    const ps = this.particleSystems.get(systemId);
    if (ps) {
      ps.emit(x, y, count);
    }
  }

  // Set active effect
  setEffect(effectType) {
    this.activeEffect = effectType;

    // Create appropriate particle system for effect
    switch (effectType) {
      case EFFECT_TYPE.PARTICLES:
        this.addParticleSystem('effect_particles', {
          colors: ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899'],
        });
        break;
      case EFFECT_TYPE.GLOW:
        // Glow is handled in render
        break;
      case EFFECT_TYPE.MATRIX:
        this.addParticleSystem('effect_matrix', {
          gravity: { x: 0, y: 0.5 },
          colors: ['#00ff00', '#00cc00', '#009900'],
          velocity: { minX: 0, maxX: 0, minY: 1, maxY: 3 },
        });
        break;
      default:
        this.particleSystems.delete('effect_particles');
        this.particleSystems.delete('effect_matrix');
    }

    this.emit('effect-change', effectType);
  }

  // Animate a layer property
  animate(layerId, property, from, to, duration, easing = 'easeOutCubic') {
    return new Promise(resolve => {
      this.animations.push({
        target: layerId,
        property,
        from,
        to,
        duration,
        easing,
        elapsed: 0,
        onComplete: resolve,
      });
    });
  }

  // Animate layer entrance
  async animateIn(layerId, direction = 'bottom') {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const startPos = { ...layer.position };
    switch (direction) {
      case 'bottom':
        layer.position.y = this.height + layer.size.height;
        break;
      case 'top':
        layer.position.y = -layer.size.height;
        break;
      case 'left':
        layer.position.x = -layer.size.width;
        break;
      case 'right':
        layer.position.x = this.width + layer.size.width;
        break;
    }

    layer.visible = true;
    await this.animate(layerId, `position.${direction === 'left' || direction === 'right' ? 'x' : 'y'}`,
      layer.position[direction === 'left' || direction === 'right' ? 'x' : 'y'],
      startPos[direction === 'left' || direction === 'right' ? 'x' : 'y'],
      400, 'easeOutCubic');
  }

  // Animate layer exit
  async animateOut(layerId, direction = 'bottom') {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    let targetPos;
    switch (direction) {
      case 'bottom':
        targetPos = this.height + layer.size.height;
        break;
      case 'top':
        targetPos = -layer.size.height;
        break;
      case 'left':
        targetPos = -layer.size.width;
        break;
      case 'right':
        targetPos = this.width + layer.size.width;
        break;
    }

    const prop = direction === 'left' || direction === 'right' ? 'x' : 'y';
    await this.animate(layerId, `position.${prop}`, layer.position[prop], targetPos, 300, 'easeInCubic');
    layer.visible = false;
  }

  // Helper to set nested property
  _setNestedProperty(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  // Set render mode
  setMode(mode) {
    this.mode = mode;
    this.emit('mode-change', mode);
  }

  // Resize canvas
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.emit('resize', { width, height });
  }

  // Get current state
  getState() {
    return {
      running: this.running,
      mode: this.mode,
      width: this.width,
      height: this.height,
      layerCount: this.layers.size,
      particleSystemCount: this.particleSystems.size,
      chatBubbleCount: this.chatBubbles.length,
      activeEffect: this.activeEffect,
      frameCount: this.frameCount,
      targetFPS: this.targetFPS,
    };
  }

  // Stop render loop
  stop() {
    this.running = false;
    this.emit('stopped');
  }

  // Cleanup
  cleanup() {
    this.stop();
    this.layers.clear();
    this.particleSystems.clear();
    this.chatBubbles = [];
    this.animations = [];
  }
}

module.exports = {
  RealtimeGraphicsClient,
  GraphicsLayer,
  ChatBubble,
  ParticleSystem,
  RENDER_MODE,
  EFFECT_TYPE,
  LAYER_TYPE,
  EASING,
};
