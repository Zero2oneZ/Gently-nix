// GentlyOS Avatar Studio Client - Avatar Creation and Animation
// Create, customize, and animate 2D/3D avatars with face tracking

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// Avatar styles
const AVATAR_STYLE = {
  ANIME: 'anime',
  REALISTIC: 'realistic',
  CARTOON: 'cartoon',
  PIXEL: 'pixel',
  MINIMAL: 'minimal',
  VTUBER: 'vtuber',
  EMOJI: 'emoji',
  CUSTOM: 'custom',
};

// Avatar parts
const AVATAR_PART = {
  HEAD: 'head',
  HAIR: 'hair',
  EYES: 'eyes',
  EYEBROWS: 'eyebrows',
  NOSE: 'nose',
  MOUTH: 'mouth',
  EARS: 'ears',
  FACE_SHAPE: 'face_shape',
  SKIN: 'skin',
  ACCESSORIES: 'accessories',
  CLOTHING: 'clothing',
  BACKGROUND: 'background',
};

// Animation types
const ANIMATION_TYPE = {
  IDLE: 'idle',
  TALK: 'talk',
  BLINK: 'blink',
  NOD: 'nod',
  SHAKE: 'shake',
  WAVE: 'wave',
  EMOTE: 'emote',
  CUSTOM: 'custom',
};

// Avatar state
const AVATAR_STATE = {
  IDLE: 'idle',
  ANIMATING: 'animating',
  TRACKING: 'tracking',
  LOADING: 'loading',
};

// Preset color palettes
const COLOR_PALETTE = {
  SKIN: ['#ffdfc4', '#f0c8a0', '#deb887', '#c68642', '#8d5524', '#4a312c'],
  HAIR: ['#090806', '#2c1608', '#6a4e35', '#b55239', '#d6c4c2', '#e5c100', '#ff6b9d', '#8b5cf6', '#06b6d4'],
  EYES: ['#634e34', '#2e5a1f', '#497ee8', '#808080', '#8b4513', '#9400d3', '#ff1493'],
};

// Avatar asset definition
class AvatarAsset {
  constructor(data = {}) {
    this.id = data.id || `asset_${Date.now()}`;
    this.part = data.part || AVATAR_PART.HEAD;
    this.style = data.style || AVATAR_STYLE.ANIME;
    this.name = data.name || 'Unnamed Asset';
    this.svgPath = data.svgPath || null;
    this.imagePath = data.imagePath || null;
    this.color = data.color || '#ffffff';
    this.layers = data.layers || [];
    this.blendShapeTargets = data.blendShapeTargets || {};
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      part: this.part,
      style: this.style,
      name: this.name,
      svgPath: this.svgPath,
      imagePath: this.imagePath,
      color: this.color,
      layers: this.layers,
      blendShapeTargets: this.blendShapeTargets,
      metadata: this.metadata,
    };
  }
}

// Avatar definition
class Avatar {
  constructor(data = {}) {
    this.id = data.id || `avatar_${Date.now()}`;
    this.name = data.name || 'My Avatar';
    this.style = data.style || AVATAR_STYLE.ANIME;
    this.parts = new Map();
    this.colors = data.colors || {};
    this.state = AVATAR_STATE.IDLE;
    this.currentAnimation = null;
    this.blendShapes = {};
    this.transform = { x: 0, y: 0, scale: 1, rotation: 0 };
    this.createdAt = data.createdAt || Date.now();
    this.modifiedAt = data.modifiedAt || Date.now();

    // Initialize parts from data
    if (data.parts) {
      for (const [part, asset] of Object.entries(data.parts)) {
        this.parts.set(part, new AvatarAsset(asset));
      }
    }
  }

  setPart(part, asset) {
    this.parts.set(part, asset);
    this.modifiedAt = Date.now();
  }

  getPart(part) {
    return this.parts.get(part);
  }

  setColor(part, color) {
    this.colors[part] = color;
    this.modifiedAt = Date.now();
  }

  applyBlendShapes(blendShapes) {
    this.blendShapes = { ...this.blendShapes, ...blendShapes };
  }

  toJSON() {
    const parts = {};
    for (const [key, value] of this.parts) {
      parts[key] = value.toJSON();
    }
    return {
      id: this.id,
      name: this.name,
      style: this.style,
      parts,
      colors: this.colors,
      state: this.state,
      blendShapes: this.blendShapes,
      transform: this.transform,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    };
  }
}

// Animation keyframe
class Keyframe {
  constructor(data = {}) {
    this.time = data.time || 0;
    this.blendShapes = data.blendShapes || {};
    this.transform = data.transform || {};
    this.easing = data.easing || 'linear';
  }
}

// Animation clip
class AnimationClip {
  constructor(data = {}) {
    this.id = data.id || `anim_${Date.now()}`;
    this.name = data.name || 'Animation';
    this.type = data.type || ANIMATION_TYPE.CUSTOM;
    this.duration = data.duration || 1000;
    this.keyframes = (data.keyframes || []).map(k => new Keyframe(k));
    this.loop = data.loop || false;
  }

  addKeyframe(keyframe) {
    this.keyframes.push(keyframe);
    this.keyframes.sort((a, b) => a.time - b.time);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      duration: this.duration,
      keyframes: this.keyframes,
      loop: this.loop,
    };
  }
}

class AvatarStudioClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.avatars = new Map();
    this.currentAvatar = null;
    this.assets = new Map();
    this.animations = new Map();
    this.dataDir = config.dataDir || path.join(process.env.HOME || '/home/deck', '.gently', 'avatars');
    this.initialized = false;

    // Animation state
    this.animationFrame = null;
    this.animationStartTime = 0;

    // Face tracking integration
    this.faceTrackingEnabled = false;

    // Built-in animations
    this._initBuiltInAnimations();
  }

  // Initialize built-in animations
  _initBuiltInAnimations() {
    // Idle breathing
    const idle = new AnimationClip({
      id: 'idle',
      name: 'Idle',
      type: ANIMATION_TYPE.IDLE,
      duration: 3000,
      loop: true,
      keyframes: [
        { time: 0, blendShapes: { breathe: 0 }, transform: { y: 0 } },
        { time: 1500, blendShapes: { breathe: 0.1 }, transform: { y: -2 } },
        { time: 3000, blendShapes: { breathe: 0 }, transform: { y: 0 } },
      ],
    });
    this.animations.set('idle', idle);

    // Blink
    const blink = new AnimationClip({
      id: 'blink',
      name: 'Blink',
      type: ANIMATION_TYPE.BLINK,
      duration: 200,
      loop: false,
      keyframes: [
        { time: 0, blendShapes: { eyeBlinkLeft: 0, eyeBlinkRight: 0 } },
        { time: 100, blendShapes: { eyeBlinkLeft: 1, eyeBlinkRight: 1 } },
        { time: 200, blendShapes: { eyeBlinkLeft: 0, eyeBlinkRight: 0 } },
      ],
    });
    this.animations.set('blink', blink);

    // Talk
    const talk = new AnimationClip({
      id: 'talk',
      name: 'Talk',
      type: ANIMATION_TYPE.TALK,
      duration: 300,
      loop: true,
      keyframes: [
        { time: 0, blendShapes: { jawOpen: 0 } },
        { time: 150, blendShapes: { jawOpen: 0.3 } },
        { time: 300, blendShapes: { jawOpen: 0 } },
      ],
    });
    this.animations.set('talk', talk);

    // Nod
    const nod = new AnimationClip({
      id: 'nod',
      name: 'Nod',
      type: ANIMATION_TYPE.NOD,
      duration: 600,
      loop: false,
      keyframes: [
        { time: 0, blendShapes: { headPitch: 0 } },
        { time: 200, blendShapes: { headPitch: 0.2 } },
        { time: 400, blendShapes: { headPitch: -0.1 } },
        { time: 600, blendShapes: { headPitch: 0 } },
      ],
    });
    this.animations.set('nod', nod);
  }

  // Initialize studio
  async initialize() {
    if (this.initialized) return { success: true };

    // Create data directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load saved avatars
    await this._loadAvatars();

    // Load asset library
    await this._loadAssets();

    this.initialized = true;
    this.emit('initialized', { avatarCount: this.avatars.size });
    return { success: true, avatarCount: this.avatars.size };
  }

  // Load avatars from disk
  async _loadAvatars() {
    const avatarsFile = path.join(this.dataDir, 'avatars.json');
    if (fs.existsSync(avatarsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(avatarsFile, 'utf-8'));
        for (const avatarData of data.avatars || []) {
          const avatar = new Avatar(avatarData);
          this.avatars.set(avatar.id, avatar);
        }
      } catch (e) {
        this.emit('error', { message: `Failed to load avatars: ${e.message}` });
      }
    }
  }

  // Save avatars to disk
  async _saveAvatars() {
    const avatarsFile = path.join(this.dataDir, 'avatars.json');
    const data = {
      avatars: Array.from(this.avatars.values()).map(a => a.toJSON()),
    };
    fs.writeFileSync(avatarsFile, JSON.stringify(data, null, 2));
  }

  // Load built-in assets
  async _loadAssets() {
    // Built-in anime style assets (SVG paths)
    const builtInAssets = [
      // Head shapes
      { id: 'head_round', part: AVATAR_PART.HEAD, style: AVATAR_STYLE.ANIME, name: 'Round Head',
        svgPath: 'M50 10 C80 10 95 35 95 60 C95 85 80 95 50 95 C20 95 5 85 5 60 C5 35 20 10 50 10' },
      { id: 'head_oval', part: AVATAR_PART.HEAD, style: AVATAR_STYLE.ANIME, name: 'Oval Head',
        svgPath: 'M50 5 C85 5 95 30 95 55 C95 80 75 98 50 98 C25 98 5 80 5 55 C5 30 15 5 50 5' },

      // Eyes
      { id: 'eyes_anime_big', part: AVATAR_PART.EYES, style: AVATAR_STYLE.ANIME, name: 'Big Anime Eyes',
        svgPath: 'M20 50 Q35 35 50 50 Q35 65 20 50 M80 50 Q65 35 50 50 Q65 65 80 50',
        blendShapeTargets: { eyeBlinkLeft: 'scaleY:0', eyeBlinkRight: 'scaleY:0' } },
      { id: 'eyes_simple', part: AVATAR_PART.EYES, style: AVATAR_STYLE.CARTOON, name: 'Simple Eyes',
        svgPath: 'M30 50 A5 5 0 1 1 30 50.1 M70 50 A5 5 0 1 1 70 50.1' },

      // Mouths
      { id: 'mouth_smile', part: AVATAR_PART.MOUTH, style: AVATAR_STYLE.ANIME, name: 'Smile',
        svgPath: 'M30 70 Q50 85 70 70',
        blendShapeTargets: { jawOpen: 'path:M30 70 Q50 90 70 70', mouthSmileLeft: 'path:M25 68 Q50 88 70 70' } },
      { id: 'mouth_neutral', part: AVATAR_PART.MOUTH, style: AVATAR_STYLE.ANIME, name: 'Neutral',
        svgPath: 'M35 75 L65 75' },

      // Hair
      { id: 'hair_short', part: AVATAR_PART.HAIR, style: AVATAR_STYLE.ANIME, name: 'Short Hair',
        svgPath: 'M15 45 Q15 5 50 5 Q85 5 85 45 Q85 25 75 20 Q65 15 50 15 Q35 15 25 20 Q15 25 15 45' },
      { id: 'hair_long', part: AVATAR_PART.HAIR, style: AVATAR_STYLE.ANIME, name: 'Long Hair',
        svgPath: 'M10 45 Q10 0 50 0 Q90 0 90 45 L90 90 Q90 95 85 95 L80 50 Q50 10 20 50 L15 95 Q10 95 10 90 Z' },

      // Eyebrows
      { id: 'eyebrow_normal', part: AVATAR_PART.EYEBROWS, style: AVATAR_STYLE.ANIME, name: 'Normal',
        svgPath: 'M20 40 Q35 35 45 40 M55 40 Q65 35 80 40' },
    ];

    for (const assetData of builtInAssets) {
      const asset = new AvatarAsset(assetData);
      this.assets.set(asset.id, asset);
    }
  }

  // =============================================
  // AVATAR MANAGEMENT
  // =============================================

  // Create new avatar
  createAvatar(config = {}) {
    const avatar = new Avatar({
      name: config.name || 'New Avatar',
      style: config.style || AVATAR_STYLE.ANIME,
    });

    // Apply default parts based on style
    this._applyDefaultParts(avatar);

    this.avatars.set(avatar.id, avatar);
    this._saveAvatars();

    this.emit('avatar:created', avatar.toJSON());
    return avatar.toJSON();
  }

  // Apply default parts based on style
  _applyDefaultParts(avatar) {
    const style = avatar.style;
    const defaultParts = {
      [AVATAR_PART.HEAD]: `head_round`,
      [AVATAR_PART.EYES]: style === AVATAR_STYLE.ANIME ? 'eyes_anime_big' : 'eyes_simple',
      [AVATAR_PART.MOUTH]: 'mouth_smile',
      [AVATAR_PART.EYEBROWS]: 'eyebrow_normal',
      [AVATAR_PART.HAIR]: 'hair_short',
    };

    for (const [part, assetId] of Object.entries(defaultParts)) {
      const asset = this.assets.get(assetId);
      if (asset) {
        avatar.setPart(part, new AvatarAsset(asset.toJSON()));
      }
    }

    // Default colors
    avatar.colors = {
      [AVATAR_PART.SKIN]: COLOR_PALETTE.SKIN[1],
      [AVATAR_PART.HAIR]: COLOR_PALETTE.HAIR[0],
      [AVATAR_PART.EYES]: COLOR_PALETTE.EYES[4],
    };
  }

  // Get avatar
  getAvatar(avatarId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);
    return avatar.toJSON();
  }

  // List avatars
  listAvatars() {
    return Array.from(this.avatars.values()).map(a => ({
      id: a.id,
      name: a.name,
      style: a.style,
      createdAt: a.createdAt,
    }));
  }

  // Update avatar
  updateAvatar(avatarId, updates) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);

    if (updates.name) avatar.name = updates.name;
    if (updates.style) avatar.style = updates.style;
    if (updates.colors) avatar.colors = { ...avatar.colors, ...updates.colors };
    if (updates.transform) avatar.transform = { ...avatar.transform, ...updates.transform };

    avatar.modifiedAt = Date.now();
    this._saveAvatars();

    this.emit('avatar:updated', avatar.toJSON());
    return avatar.toJSON();
  }

  // Delete avatar
  deleteAvatar(avatarId) {
    if (!this.avatars.has(avatarId)) throw new Error(`Avatar not found: ${avatarId}`);
    this.avatars.delete(avatarId);
    if (this.currentAvatar?.id === avatarId) this.currentAvatar = null;
    this._saveAvatars();
    this.emit('avatar:deleted', { id: avatarId });
    return { success: true };
  }

  // Set current avatar
  setCurrentAvatar(avatarId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);
    this.currentAvatar = avatar;
    this.emit('avatar:selected', avatar.toJSON());
    return avatar.toJSON();
  }

  // =============================================
  // CUSTOMIZATION
  // =============================================

  // Set avatar part
  setAvatarPart(avatarId, part, assetId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);

    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    avatar.setPart(part, new AvatarAsset(asset.toJSON()));
    this._saveAvatars();

    this.emit('avatar:part-changed', { avatarId, part, assetId });
    return avatar.toJSON();
  }

  // Set avatar color
  setAvatarColor(avatarId, part, color) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);

    avatar.setColor(part, color);
    this._saveAvatars();

    this.emit('avatar:color-changed', { avatarId, part, color });
    return avatar.toJSON();
  }

  // Get available assets for part
  getAssetsForPart(part, style = null) {
    return Array.from(this.assets.values())
      .filter(a => a.part === part && (!style || a.style === style))
      .map(a => a.toJSON());
  }

  // =============================================
  // ANIMATION
  // =============================================

  // Play animation
  playAnimation(avatarId, animationId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);

    const animation = this.animations.get(animationId);
    if (!animation) throw new Error(`Animation not found: ${animationId}`);

    avatar.state = AVATAR_STATE.ANIMATING;
    avatar.currentAnimation = animationId;
    this.animationStartTime = Date.now();

    this._runAnimation(avatar, animation);

    this.emit('animation:started', { avatarId, animationId });
    return { success: true };
  }

  // Run animation loop
  _runAnimation(avatar, animation) {
    const tick = () => {
      const elapsed = Date.now() - this.animationStartTime;
      let time = elapsed % animation.duration;

      if (!animation.loop && elapsed >= animation.duration) {
        this.stopAnimation(avatar.id);
        return;
      }

      // Interpolate blend shapes
      const blendShapes = this._interpolateKeyframes(animation.keyframes, time);
      avatar.applyBlendShapes(blendShapes);

      this.emit('animation:frame', {
        avatarId: avatar.id,
        blendShapes,
        time,
      });

      if (avatar.state === AVATAR_STATE.ANIMATING) {
        this.animationFrame = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  // Interpolate between keyframes
  _interpolateKeyframes(keyframes, time) {
    if (keyframes.length === 0) return {};
    if (keyframes.length === 1) return keyframes[0].blendShapes;

    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time >= time) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }

    // Linear interpolation
    const t = (time - prev.time) / (next.time - prev.time);
    const result = {};

    for (const key of new Set([...Object.keys(prev.blendShapes), ...Object.keys(next.blendShapes)])) {
      const a = prev.blendShapes[key] || 0;
      const b = next.blendShapes[key] || 0;
      result[key] = a + (b - a) * t;
    }

    return result;
  }

  // Stop animation
  stopAnimation(avatarId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    avatar.state = AVATAR_STATE.IDLE;
    avatar.currentAnimation = null;

    this.emit('animation:stopped', { avatarId });
    return { success: true };
  }

  // Apply face tracking data
  applyFaceTracking(avatarId, blendShapes) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    avatar.state = AVATAR_STATE.TRACKING;
    avatar.applyBlendShapes(blendShapes);

    this.emit('tracking:applied', { avatarId, blendShapes });
  }

  // =============================================
  // RENDERING
  // =============================================

  // Generate SVG for avatar
  generateSVG(avatarId) {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) throw new Error(`Avatar not found: ${avatarId}`);

    const width = 200;
    const height = 200;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;

    // Add parts in order
    const partOrder = [
      AVATAR_PART.BACKGROUND,
      AVATAR_PART.HAIR, // Back layer
      AVATAR_PART.HEAD,
      AVATAR_PART.EARS,
      AVATAR_PART.EYES,
      AVATAR_PART.EYEBROWS,
      AVATAR_PART.NOSE,
      AVATAR_PART.MOUTH,
      AVATAR_PART.ACCESSORIES,
    ];

    for (const part of partOrder) {
      const asset = avatar.getPart(part);
      if (asset?.svgPath) {
        const color = avatar.colors[part] || asset.color || '#000';
        svg += `<path d="${asset.svgPath}" fill="${color}" class="${part}"/>`;
      }
    }

    // Apply blend shape transforms
    // This would need more sophisticated SVG manipulation

    svg += '</svg>';
    return svg;
  }

  // Export avatar as PNG
  async exportPNG(avatarId, size = 512) {
    const svg = this.generateSVG(avatarId);
    // Would need canvas or sharp to convert SVG to PNG
    return { svg, message: 'PNG export requires canvas library' };
  }

  // =============================================
  // STATUS
  // =============================================

  getStatus() {
    return {
      initialized: this.initialized,
      avatarCount: this.avatars.size,
      assetCount: this.assets.size,
      animationCount: this.animations.size,
      currentAvatar: this.currentAvatar?.id || null,
    };
  }

  getConstants() {
    return {
      AVATAR_STYLE,
      AVATAR_PART,
      ANIMATION_TYPE,
      AVATAR_STATE,
      COLOR_PALETTE,
    };
  }
}

module.exports = {
  AvatarStudioClient,
  Avatar,
  AvatarAsset,
  AnimationClip,
  Keyframe,
  AVATAR_STYLE,
  AVATAR_PART,
  ANIMATION_TYPE,
  AVATAR_STATE,
  COLOR_PALETTE,
};
