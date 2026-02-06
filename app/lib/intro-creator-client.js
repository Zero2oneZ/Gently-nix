// GentlyOS Intro Creator Client - Animated Introduction Sequences
// Creates customizable intro sequences with text, graphics, and audio

const EventEmitter = require('events');
const path = require('path');

// Intro styles
const INTRO_STYLE = {
  MINIMAL: 'minimal',      // Simple fade text
  CINEMATIC: 'cinematic',  // Movie-style reveal
  GLITCH: 'glitch',        // Digital glitch effect
  TYPEWRITER: 'typewriter', // Character-by-character
  PARTICLE: 'particle',    // Particle text reveal
  MATRIX: 'matrix',        // Matrix rain then reveal
  NEON: 'neon',            // Neon glow effect
  WAVE: 'wave',            // Wave distortion
};

// Element types
const ELEMENT_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  SHAPE: 'shape',
  VIDEO: 'video',
  AUDIO: 'audio',
  PARTICLE: 'particle',
};

// Animation presets
const ANIMATION_PRESET = {
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  SLIDE_IN: 'slide_in',
  SLIDE_OUT: 'slide_out',
  SCALE_IN: 'scale_in',
  SCALE_OUT: 'scale_out',
  ROTATE_IN: 'rotate_in',
  BOUNCE: 'bounce',
  PULSE: 'pulse',
  SHAKE: 'shake',
  TYPEWRITER: 'typewriter',
  GLITCH: 'glitch',
};

// Intro element class
class IntroElement {
  constructor(config = {}) {
    this.id = config.id || `elem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.type = config.type || ELEMENT_TYPE.TEXT;
    this.content = config.content || '';
    this.position = config.position || { x: 50, y: 50 };  // Percentage
    this.size = config.size || { width: 'auto', height: 'auto' };
    this.style = config.style || {};
    this.animations = config.animations || [];
    this.startTime = config.startTime || 0;  // ms from intro start
    this.duration = config.duration || 2000;  // ms
    this.layer = config.layer || 0;
    this.visible = false;
  }

  addAnimation(preset, options = {}) {
    this.animations.push({
      preset,
      delay: options.delay || 0,
      duration: options.duration || 500,
      easing: options.easing || 'ease-out',
      ...options,
    });
    return this;
  }

  setPosition(x, y) {
    this.position = { x, y };
    return this;
  }

  setStyle(style) {
    this.style = { ...this.style, ...style };
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      position: this.position,
      size: this.size,
      style: this.style,
      animations: this.animations,
      startTime: this.startTime,
      duration: this.duration,
      layer: this.layer,
      visible: this.visible,
    };
  }
}

// Text element with styling
class TextElement extends IntroElement {
  constructor(config = {}) {
    super({ ...config, type: ELEMENT_TYPE.TEXT });
    this.text = config.text || config.content || '';
    this.content = this.text;
    this.style = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 48,
      fontWeight: 700,
      color: '#ffffff',
      textAlign: 'center',
      textShadow: 'none',
      letterSpacing: 0,
      lineHeight: 1.2,
      ...config.style,
    };
  }

  setFont(family, size, weight = 700) {
    this.style.fontFamily = family;
    this.style.fontSize = size;
    this.style.fontWeight = weight;
    return this;
  }

  setColor(color) {
    this.style.color = color;
    return this;
  }

  addGlow(color, blur = 20) {
    this.style.textShadow = `0 0 ${blur}px ${color}`;
    return this;
  }
}

// Shape element
class ShapeElement extends IntroElement {
  constructor(config = {}) {
    super({ ...config, type: ELEMENT_TYPE.SHAPE });
    this.shapeType = config.shapeType || 'rectangle';  // rectangle, circle, line, polygon
    this.style = {
      fill: '#6366f1',
      stroke: 'none',
      strokeWidth: 2,
      opacity: 1,
      ...config.style,
    };
    this.points = config.points || [];  // For polygon
  }
}

// Intro sequence class
class IntroSequence {
  constructor(config = {}) {
    this.id = config.id || `intro_${Date.now()}`;
    this.name = config.name || 'Untitled Intro';
    this.style = config.style || INTRO_STYLE.MINIMAL;
    this.elements = [];
    this.duration = config.duration || 5000;  // Total duration in ms
    this.backgroundColor = config.backgroundColor || '#0a0a0f';
    this.backgroundGradient = config.backgroundGradient || null;
    this.audioTrack = config.audioTrack || null;
    this.loop = config.loop || false;
    this.createdAt = Date.now();
  }

  addElement(element) {
    if (!(element instanceof IntroElement)) {
      element = new IntroElement(element);
    }
    this.elements.push(element);
    this._recalculateDuration();
    return element;
  }

  addText(text, options = {}) {
    const elem = new TextElement({
      text,
      ...options,
    });
    return this.addElement(elem);
  }

  addShape(shapeType, options = {}) {
    const elem = new ShapeElement({
      shapeType,
      ...options,
    });
    return this.addElement(elem);
  }

  removeElement(elementId) {
    this.elements = this.elements.filter(e => e.id !== elementId);
    this._recalculateDuration();
  }

  _recalculateDuration() {
    let maxEnd = 0;
    this.elements.forEach(e => {
      const endTime = e.startTime + e.duration;
      if (endTime > maxEnd) maxEnd = endTime;
    });
    this.duration = Math.max(this.duration, maxEnd + 500);  // Add 500ms buffer
  }

  getElementsAtTime(time) {
    return this.elements.filter(e => {
      return time >= e.startTime && time < e.startTime + e.duration;
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      style: this.style,
      elements: this.elements.map(e => e.toJSON()),
      duration: this.duration,
      backgroundColor: this.backgroundColor,
      backgroundGradient: this.backgroundGradient,
      audioTrack: this.audioTrack,
      loop: this.loop,
      createdAt: this.createdAt,
    };
  }
}

// Intro templates
const TEMPLATES = {
  gentlyDefault: () => {
    const intro = new IntroSequence({
      name: 'Gently Default',
      style: INTRO_STYLE.MINIMAL,
      backgroundColor: '#0a0a0f',
      duration: 4000,
    });

    // Logo/text
    intro.addText('Gently', {
      startTime: 500,
      duration: 3000,
      position: { x: 50, y: 45 },
      style: { fontSize: 72, fontWeight: 300, color: '#ffffff' },
    }).addAnimation(ANIMATION_PRESET.FADE_IN, { duration: 800 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 2200, duration: 500 });

    // Tagline
    intro.addText('Your AI Desktop', {
      startTime: 1200,
      duration: 2300,
      position: { x: 50, y: 58 },
      style: { fontSize: 18, fontWeight: 400, color: '#888888' },
    }).addAnimation(ANIMATION_PRESET.FADE_IN, { duration: 600 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 1700, duration: 400 });

    return intro;
  },

  cinematic: () => {
    const intro = new IntroSequence({
      name: 'Cinematic',
      style: INTRO_STYLE.CINEMATIC,
      backgroundColor: '#000000',
      duration: 6000,
    });

    // Top bar
    intro.addShape('rectangle', {
      startTime: 0,
      duration: 6000,
      position: { x: 50, y: 10 },
      size: { width: '100%', height: 60 },
      style: { fill: '#000000' },
    });

    // Bottom bar
    intro.addShape('rectangle', {
      startTime: 0,
      duration: 6000,
      position: { x: 50, y: 90 },
      size: { width: '100%', height: 60 },
      style: { fill: '#000000' },
    });

    // Main text
    intro.addText('GENTLY', {
      startTime: 1000,
      duration: 4500,
      position: { x: 50, y: 50 },
      style: { fontSize: 96, fontWeight: 100, letterSpacing: 20, color: '#ffffff' },
    }).addAnimation(ANIMATION_PRESET.SCALE_IN, { duration: 1000 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 3500, duration: 800 });

    return intro;
  },

  glitch: () => {
    const intro = new IntroSequence({
      name: 'Glitch',
      style: INTRO_STYLE.GLITCH,
      backgroundColor: '#0a0a0f',
      duration: 4000,
    });

    intro.addText('GENTLY', {
      startTime: 200,
      duration: 3500,
      position: { x: 50, y: 50 },
      style: { fontSize: 80, fontWeight: 700, color: '#ffffff' },
    }).addAnimation(ANIMATION_PRESET.GLITCH, { duration: 2000 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 2800, duration: 500 });

    return intro;
  },

  neon: () => {
    const intro = new IntroSequence({
      name: 'Neon',
      style: INTRO_STYLE.NEON,
      backgroundColor: '#0a0a0f',
      duration: 5000,
    });

    intro.addText('Gently', {
      startTime: 500,
      duration: 4000,
      position: { x: 50, y: 50 },
      style: {
        fontSize: 84,
        fontWeight: 400,
        color: '#ff00ff',
        textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 40px #ff00ff',
      },
    }).addAnimation(ANIMATION_PRESET.FADE_IN, { duration: 500 })
      .addAnimation(ANIMATION_PRESET.PULSE, { delay: 500, duration: 2500 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 3500, duration: 500 });

    return intro;
  },

  matrix: () => {
    const intro = new IntroSequence({
      name: 'Matrix',
      style: INTRO_STYLE.MATRIX,
      backgroundColor: '#000000',
      duration: 5000,
    });

    // Matrix rain is generated by the renderer
    intro.addText('GENTLY', {
      startTime: 2000,
      duration: 2500,
      position: { x: 50, y: 50 },
      style: { fontSize: 72, fontWeight: 700, color: '#00ff00' },
    }).addAnimation(ANIMATION_PRESET.FADE_IN, { duration: 800 })
      .addAnimation(ANIMATION_PRESET.FADE_OUT, { delay: 1700, duration: 500 });

    return intro;
  },
};

// Main intro creator client
class IntroCreatorClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.sequences = new Map();
    this.activeSequence = null;
    this.playing = false;
    this.currentTime = 0;
    this.startTimestamp = 0;
    this.playbackSpeed = 1;

    // Output settings
    this.outputWidth = config.width || 1920;
    this.outputHeight = config.height || 1080;
    this.fps = config.fps || 60;

    // Storage path
    this.storagePath = config.storagePath || null;
  }

  // Create new sequence
  createSequence(config = {}) {
    const sequence = new IntroSequence(config);
    this.sequences.set(sequence.id, sequence);
    this.emit('sequence-created', sequence.toJSON());
    return sequence;
  }

  // Create from template
  createFromTemplate(templateName) {
    const templateFn = TEMPLATES[templateName];
    if (!templateFn) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const sequence = templateFn();
    this.sequences.set(sequence.id, sequence);
    this.emit('sequence-created', sequence.toJSON());
    return sequence;
  }

  // Get available templates
  getTemplates() {
    return Object.keys(TEMPLATES);
  }

  // Load sequence
  loadSequence(sequenceId) {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence "${sequenceId}" not found`);
    }

    this.activeSequence = sequence;
    this.currentTime = 0;
    this.emit('sequence-loaded', sequence.toJSON());
    return sequence;
  }

  // Delete sequence
  deleteSequence(sequenceId) {
    if (this.activeSequence && this.activeSequence.id === sequenceId) {
      this.stop();
      this.activeSequence = null;
    }
    this.sequences.delete(sequenceId);
    this.emit('sequence-deleted', { sequenceId });
  }

  // Get sequence
  getSequence(sequenceId) {
    return this.sequences.get(sequenceId);
  }

  // Get all sequences
  getAllSequences() {
    return Array.from(this.sequences.values()).map(s => ({
      id: s.id,
      name: s.name,
      style: s.style,
      duration: s.duration,
      elementCount: s.elements.length,
      createdAt: s.createdAt,
    }));
  }

  // Play intro
  play() {
    if (!this.activeSequence) {
      throw new Error('No sequence loaded');
    }

    this.playing = true;
    this.startTimestamp = Date.now() - (this.currentTime / this.playbackSpeed);
    this._startPlayback();
    this.emit('play', { sequenceId: this.activeSequence.id });
  }

  // Pause
  pause() {
    this.playing = false;
    this.emit('pause', { currentTime: this.currentTime });
  }

  // Stop
  stop() {
    this.playing = false;
    this.currentTime = 0;
    this.emit('stop');
  }

  // Seek to time
  seek(time) {
    this.currentTime = Math.max(0, Math.min(time, this.activeSequence?.duration || 0));
    this.startTimestamp = Date.now() - (this.currentTime / this.playbackSpeed);
    this.emit('seek', { currentTime: this.currentTime });
  }

  // Set playback speed
  setSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(4, speed));
    if (this.playing) {
      this.startTimestamp = Date.now() - (this.currentTime / this.playbackSpeed);
    }
  }

  // Internal playback loop
  _startPlayback() {
    const tick = () => {
      if (!this.playing || !this.activeSequence) return;

      this.currentTime = (Date.now() - this.startTimestamp) * this.playbackSpeed;

      // Get current frame data
      const frameData = this._getFrameData(this.currentTime);
      this.emit('frame', frameData);

      // Check for completion
      if (this.currentTime >= this.activeSequence.duration) {
        if (this.activeSequence.loop) {
          this.currentTime = 0;
          this.startTimestamp = Date.now();
        } else {
          this.playing = false;
          this.emit('complete', { sequenceId: this.activeSequence.id });
          return;
        }
      }

      setImmediate(tick);
    };

    tick();
  }

  // Get frame data at specific time
  _getFrameData(time) {
    if (!this.activeSequence) return null;

    const seq = this.activeSequence;
    const activeElements = seq.getElementsAtTime(time);

    // Calculate animation states
    const elements = activeElements.map(elem => {
      const localTime = time - elem.startTime;
      const progress = localTime / elem.duration;

      // Calculate animation state for each animation
      const animationStates = elem.animations.map(anim => {
        const animStart = anim.delay || 0;
        const animEnd = animStart + anim.duration;

        if (localTime < animStart) {
          return { preset: anim.preset, progress: 0, active: false };
        } else if (localTime >= animEnd) {
          return { preset: anim.preset, progress: 1, active: false };
        } else {
          const animProgress = (localTime - animStart) / anim.duration;
          return { preset: anim.preset, progress: animProgress, active: true };
        }
      });

      return {
        ...elem.toJSON(),
        visible: true,
        localTime,
        progress,
        animationStates,
      };
    });

    return {
      sequenceId: seq.id,
      style: seq.style,
      time: this.currentTime,
      duration: seq.duration,
      progress: this.currentTime / seq.duration,
      backgroundColor: seq.backgroundColor,
      backgroundGradient: seq.backgroundGradient,
      elements,
      width: this.outputWidth,
      height: this.outputHeight,
    };
  }

  // Preview at specific time (without playing)
  previewAt(time) {
    if (!this.activeSequence) return null;
    return this._getFrameData(time);
  }

  // Export as render commands (for external renderer)
  exportRenderCommands() {
    if (!this.activeSequence) return null;

    const commands = [];
    const frameCount = Math.ceil(this.activeSequence.duration / (1000 / this.fps));

    for (let i = 0; i < frameCount; i++) {
      const time = (i / this.fps) * 1000;
      commands.push(this._getFrameData(time));
    }

    return {
      sequenceId: this.activeSequence.id,
      fps: this.fps,
      frameCount,
      duration: this.activeSequence.duration,
      commands,
    };
  }

  // Save sequence to JSON
  saveSequence(sequenceId) {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;
    return JSON.stringify(sequence.toJSON(), null, 2);
  }

  // Load sequence from JSON
  loadFromJSON(jsonString) {
    const data = JSON.parse(jsonString);
    const sequence = new IntroSequence(data);

    // Recreate elements
    if (data.elements) {
      sequence.elements = data.elements.map(e => {
        if (e.type === ELEMENT_TYPE.TEXT) {
          return new TextElement(e);
        } else if (e.type === ELEMENT_TYPE.SHAPE) {
          return new ShapeElement(e);
        }
        return new IntroElement(e);
      });
    }

    this.sequences.set(sequence.id, sequence);
    this.emit('sequence-loaded-json', sequence.toJSON());
    return sequence;
  }

  // Get status
  getStatus() {
    return {
      sequenceCount: this.sequences.size,
      activeSequence: this.activeSequence?.id || null,
      playing: this.playing,
      currentTime: this.currentTime,
      duration: this.activeSequence?.duration || 0,
      playbackSpeed: this.playbackSpeed,
      fps: this.fps,
      outputSize: { width: this.outputWidth, height: this.outputHeight },
    };
  }

  // Get constants
  getConstants() {
    return {
      INTRO_STYLE,
      ELEMENT_TYPE,
      ANIMATION_PRESET,
    };
  }

  // Cleanup
  cleanup() {
    this.stop();
    this.sequences.clear();
    this.activeSequence = null;
  }
}

module.exports = {
  IntroCreatorClient,
  IntroSequence,
  IntroElement,
  TextElement,
  ShapeElement,
  INTRO_STYLE,
  ELEMENT_TYPE,
  ANIMATION_PRESET,
  TEMPLATES,
};
