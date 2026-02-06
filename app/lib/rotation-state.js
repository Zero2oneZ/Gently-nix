// GentlyOS Rotation State - Reactive feature state management
// Tracks tier, hardware score, and bridge status; emits rotation events on change

const { TierGate } = require('./tier-gate');

class RotationState {
  constructor() {
    this.state = {
      tier: 'free',
      hardwareScore: 0,
      bridgeOnline: false,
    };
    this.listeners = new Set();
    this.cachedFeatures = null;
  }

  // Update state and trigger rotation if features changed
  update(partial) {
    const oldFeatures = this.computeValidFeatures();
    Object.assign(this.state, partial);
    const newFeatures = this.computeValidFeatures();

    const changes = this.diff(oldFeatures, newFeatures);
    if (changes.added.length > 0 || changes.removed.length > 0) {
      this.cachedFeatures = newFeatures;
      this.emit('rotate', {
        changes,
        features: newFeatures,
        state: this.getState(),
      });
    }
  }

  // Get current state
  getState() {
    const gate = this.createGate();
    return {
      ...this.state,
      effectiveTier: gate.getEffectiveTier(),
    };
  }

  // Create a TierGate from current state
  createGate() {
    return new TierGate(
      this.state.tier,
      this.state.hardwareScore,
      this.state.bridgeOnline
    );
  }

  // Compute valid features for all scopes
  computeValidFeatures() {
    const gate = this.createGate();
    return {
      chat: gate.getAvailableFeatures('chat'),
      feed: gate.getAvailableFeatures('feed'),
      build: gate.getAvailableFeatures('build'),
      doc: gate.getAvailableFeatures('doc'),
    };
  }

  // Get features (cached if available)
  getFeatures() {
    if (!this.cachedFeatures) {
      this.cachedFeatures = this.computeValidFeatures();
    }
    return this.cachedFeatures;
  }

  // Diff two feature sets
  diff(oldFeatures, newFeatures) {
    const added = [];
    const removed = [];

    const scopes = ['chat', 'feed', 'build', 'doc'];
    for (const scope of scopes) {
      const oldSet = new Set(oldFeatures[scope].map(f => f.feature));
      const newSet = new Set(newFeatures[scope].map(f => f.feature));

      for (const f of newFeatures[scope]) {
        if (!oldSet.has(f.feature)) {
          added.push({ scope, ...f });
        }
      }

      for (const f of oldFeatures[scope]) {
        if (!newSet.has(f.feature)) {
          removed.push({ scope, ...f });
        }
      }
    }

    return { added, removed };
  }

  // Subscribe to rotation events
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Emit event to all listeners
  emit(event, data) {
    this.listeners.forEach(fn => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('[RotationState] Listener error:', err);
      }
    });
  }

  // Get features for a specific scope
  getScopeFeatures(scope) {
    const features = this.getFeatures();
    return features[scope] || [];
  }

  // Check if a specific feature is available
  isFeatureAvailable(feature) {
    return this.createGate().isFeatureAvailable(feature);
  }
}

module.exports = { RotationState };
