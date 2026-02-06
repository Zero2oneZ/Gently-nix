// GentlyOS Behavior Client - Adaptive UI Learning System
// Learns from user behavior patterns, predicts next actions, detects chains

const crypto = require('crypto');

// Action types (matches Rust ActionType enum)
const ACTION_TYPES = {
  // Navigation
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  SWITCH_SCOPE: 'switch_scope',
  SWITCH_PANE: 'switch_pane',

  // Input
  INPUT: 'input',
  SUBMIT: 'submit',
  SELECT: 'select',
  TOGGLE: 'toggle',

  // Interaction
  CLICK: 'click',
  DOUBLE_CLICK: 'double_click',
  RIGHT_CLICK: 'right_click',
  HOVER: 'hover',
  DRAG: 'drag',
  DROP: 'drop',

  // Commands
  SHORTCUT: 'shortcut',
  COMMAND: 'command',
  TOOL: 'tool',

  // System
  OPEN_MODAL: 'open_modal',
  CLOSE_MODAL: 'close_modal',
  RESIZE: 'resize',
};

// Generate ID
function generateId(prefix = 'act') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Action record
class Action {
  constructor(type, target, metadata = {}) {
    this.id = generateId('act');
    this.type = type;
    this.target = target;      // Element ID or description
    this.scope = null;         // Current scope when action occurred
    this.timestamp = Date.now();
    this.duration = 0;         // Time spent (for hover, input)
    this.metadata = metadata;  // Additional context
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      target: this.target,
      scope: this.scope,
      timestamp: this.timestamp,
      duration: this.duration,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const action = new Action(json.type, json.target, json.metadata);
    action.id = json.id;
    action.scope = json.scope;
    action.timestamp = json.timestamp;
    action.duration = json.duration;
    return action;
  }
}

// Behavioral chain (detected sequence pattern)
class BehavioralChain {
  constructor(actions = []) {
    this.id = generateId('chain');
    this.actions = actions;    // Action type sequence
    this.count = 1;            // Times this chain observed
    this.lastSeen = Date.now();
    this.avgDuration = 0;      // Average time to complete chain
  }

  // Get chain signature (for comparison)
  signature() {
    return this.actions.map(a => `${a.type}:${a.target || '*'}`).join(' -> ');
  }

  // Match against action sequence
  matches(actionSequence, partial = false) {
    if (partial) {
      // Check if chain starts with sequence
      if (actionSequence.length > this.actions.length) return false;
      for (let i = 0; i < actionSequence.length; i++) {
        if (this.actions[i].type !== actionSequence[i].type) return false;
      }
      return true;
    } else {
      // Exact match
      if (this.actions.length !== actionSequence.length) return false;
      for (let i = 0; i < this.actions.length; i++) {
        if (this.actions[i].type !== actionSequence[i].type) return false;
      }
      return true;
    }
  }

  // Get next predicted action
  predictNext(currentSequence) {
    if (currentSequence.length >= this.actions.length) return null;
    if (!this.matches(currentSequence, true)) return null;
    return this.actions[currentSequence.length];
  }

  toJSON() {
    return {
      id: this.id,
      actions: this.actions.map(a => a.toJSON ? a.toJSON() : a),
      count: this.count,
      lastSeen: this.lastSeen,
      avgDuration: this.avgDuration,
      signature: this.signature(),
    };
  }

  static fromJSON(json) {
    const chain = new BehavioralChain(
      (json.actions || []).map(a => Action.fromJSON(a))
    );
    chain.id = json.id;
    chain.count = json.count;
    chain.lastSeen = json.lastSeen;
    chain.avgDuration = json.avgDuration;
    return chain;
  }
}

// Prediction result
class Prediction {
  constructor(action, confidence, chain = null) {
    this.action = action;      // Predicted next action
    this.confidence = confidence; // 0-1
    this.chain = chain;        // Source chain (if from chain prediction)
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      action: this.action.toJSON ? this.action.toJSON() : this.action,
      confidence: this.confidence,
      chainId: this.chain?.id || null,
      timestamp: this.timestamp,
    };
  }
}

// UI Adaptation
class Adaptation {
  constructor(type, target, adjustment) {
    this.type = type;          // 'reorder', 'highlight', 'shortcut', 'hide'
    this.target = target;      // Element or feature ID
    this.adjustment = adjustment; // Specific change
    this.confidence = 0;
    this.reason = '';
  }

  toJSON() {
    return {
      type: this.type,
      target: this.target,
      adjustment: this.adjustment,
      confidence: this.confidence,
      reason: this.reason,
    };
  }
}

// Main Behavior Client
class BehaviorClient {
  constructor() {
    this.enabled = true;
    this.actions = [];         // Recent action history
    this.chains = [];          // Detected behavioral chains
    this.predictions = [];     // Recent predictions
    this.frequencyMap = new Map(); // Action type -> count
    this.targetMap = new Map();    // Target -> action counts
    this.scopeStats = new Map();   // Scope -> action stats

    this.config = {
      minActionsForPrediction: 3,
      maxChainLength: 5,
      maxHistorySize: 1000,
      observationDecay: 0.95,
      suggestionThreshold: 0.6,
      chainDetectionWindow: 10,
    };
  }

  // Configure the behavior client
  configure(config) {
    Object.assign(this.config, config);
    return { success: true, config: this.config };
  }

  // Enable/disable learning
  setEnabled(enabled) {
    this.enabled = enabled;
    return { success: true, enabled: this.enabled };
  }

  // Observe a user action
  observe(actionData) {
    if (!this.enabled) {
      return { success: true, recorded: false };
    }

    const action = new Action(
      actionData.type,
      actionData.target,
      actionData.metadata || {}
    );
    action.scope = actionData.scope || null;
    action.duration = actionData.duration || 0;

    // Add to history
    this.actions.push(action);
    if (this.actions.length > this.config.maxHistorySize) {
      this.actions.shift();
    }

    // Update frequency maps
    const typeCount = this.frequencyMap.get(action.type) || 0;
    this.frequencyMap.set(action.type, typeCount + 1);

    if (action.target) {
      const targetCount = this.targetMap.get(action.target) || 0;
      this.targetMap.set(action.target, targetCount + 1);
    }

    if (action.scope) {
      const scopeStats = this.scopeStats.get(action.scope) || { count: 0, actions: {} };
      scopeStats.count++;
      scopeStats.actions[action.type] = (scopeStats.actions[action.type] || 0) + 1;
      this.scopeStats.set(action.scope, scopeStats);
    }

    // Detect chains
    this.detectChains();

    return { success: true, recorded: true, action: action.toJSON() };
  }

  // Detect behavioral chains from recent actions
  detectChains() {
    if (this.actions.length < this.config.minActionsForPrediction) {
      return;
    }

    const window = this.actions.slice(-this.config.chainDetectionWindow);

    // Look for repeating sequences
    for (let len = 2; len <= this.config.maxChainLength; len++) {
      if (window.length < len * 2) continue;

      const recent = window.slice(-len);
      const previous = window.slice(-len * 2, -len);

      // Check if recent matches previous
      let matches = true;
      for (let i = 0; i < len; i++) {
        if (recent[i].type !== previous[i].type) {
          matches = false;
          break;
        }
      }

      if (matches) {
        // Found a repeating pattern
        const existingChain = this.chains.find(c =>
          c.actions.length === len &&
          c.matches(recent, false)
        );

        if (existingChain) {
          existingChain.count++;
          existingChain.lastSeen = Date.now();
        } else {
          const chain = new BehavioralChain(recent.map(a => {
            const copy = new Action(a.type, a.target);
            copy.scope = a.scope;
            return copy;
          }));
          this.chains.push(chain);
        }
      }
    }
  }

  // Predict next action
  predictNext() {
    if (this.actions.length < this.config.minActionsForPrediction) {
      return { success: true, predictions: [], reason: 'Insufficient history' };
    }

    const predictions = [];
    const recentActions = this.actions.slice(-this.config.maxChainLength);

    // Chain-based predictions
    for (const chain of this.chains) {
      const predicted = chain.predictNext(recentActions);
      if (predicted) {
        const confidence = Math.min(1, chain.count / 10) * 0.8;
        predictions.push(new Prediction(predicted, confidence, chain));
      }
    }

    // Frequency-based predictions
    const lastAction = this.actions[this.actions.length - 1];
    const followCounts = new Map();

    // Count what actions typically follow the last action type
    for (let i = 0; i < this.actions.length - 1; i++) {
      if (this.actions[i].type === lastAction.type) {
        const next = this.actions[i + 1];
        const key = `${next.type}:${next.target || '*'}`;
        followCounts.set(key, (followCounts.get(key) || 0) + 1);
      }
    }

    // Convert to predictions
    const total = Array.from(followCounts.values()).reduce((a, b) => a + b, 0);
    for (const [key, count] of followCounts) {
      const [type, target] = key.split(':');
      const confidence = (count / total) * 0.6;
      if (confidence >= 0.1) {
        const action = new Action(type, target === '*' ? null : target);
        predictions.push(new Prediction(action, confidence));
      }
    }

    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    // Store recent predictions
    this.predictions = predictions.slice(0, 5);

    return {
      success: true,
      predictions: this.predictions.map(p => p.toJSON()),
      topPrediction: this.predictions[0]?.toJSON() || null,
    };
  }

  // Get detected behavioral chains
  getChains() {
    // Sort by count (most common first)
    const sorted = [...this.chains].sort((a, b) => b.count - a.count);
    return {
      success: true,
      chains: sorted.map(c => c.toJSON()),
      total: this.chains.length,
    };
  }

  // Get UI adaptations based on behavior
  getAdaptations(level = 'basic') {
    const adaptations = [];

    // Level: basic - reorder frequently used items
    if (level === 'basic' || level === 'pro' || level === 'dev') {
      // Find most used targets
      const sortedTargets = Array.from(this.targetMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [target, count] of sortedTargets) {
        if (count > 5) {
          const adaptation = new Adaptation('reorder', target, { priority: count });
          adaptation.confidence = Math.min(1, count / 20);
          adaptation.reason = `Used ${count} times`;
          adaptations.push(adaptation);
        }
      }
    }

    // Level: pro - suggest shortcuts for chains
    if (level === 'pro' || level === 'dev') {
      for (const chain of this.chains) {
        if (chain.count >= 3 && chain.actions.length >= 2) {
          const adaptation = new Adaptation('shortcut', chain.id, {
            sequence: chain.signature(),
            suggestedKey: this.suggestShortcutKey(chain),
          });
          adaptation.confidence = Math.min(1, chain.count / 10);
          adaptation.reason = `Chain used ${chain.count} times`;
          adaptations.push(adaptation);
        }
      }
    }

    // Level: dev - adaptive hiding of unused features
    if (level === 'dev') {
      // Find actions that haven't been used
      const allTypes = Object.values(ACTION_TYPES);
      const usedTypes = new Set(this.frequencyMap.keys());
      const unusedTypes = allTypes.filter(t => !usedTypes.has(t));

      // Only suggest hiding if we have enough history
      if (this.actions.length > 100) {
        for (const type of unusedTypes) {
          const adaptation = new Adaptation('hide', type, { reason: 'Never used' });
          adaptation.confidence = 0.3;
          adaptation.reason = 'Never observed in user behavior';
          adaptations.push(adaptation);
        }
      }
    }

    return {
      success: true,
      adaptations: adaptations.map(a => a.toJSON()),
      level,
    };
  }

  // Suggest a shortcut key for a chain
  suggestShortcutKey(chain) {
    const firstAction = chain.actions[0];
    const firstChar = (firstAction.target || firstAction.type)[0].toUpperCase();
    return `Ctrl+Shift+${firstChar}`;
  }

  // Get learning statistics
  getStats() {
    const totalActions = this.actions.length;
    const uniqueTypes = this.frequencyMap.size;
    const uniqueTargets = this.targetMap.size;
    const totalChains = this.chains.length;

    // Most common actions
    const topActions = Array.from(this.frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count, percentage: (count / totalActions * 100).toFixed(1) }));

    // Scope distribution
    const scopeDistribution = {};
    for (const [scope, stats] of this.scopeStats) {
      scopeDistribution[scope] = {
        count: stats.count,
        percentage: (stats.count / totalActions * 100).toFixed(1),
        topAction: Object.entries(stats.actions)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      };
    }

    return {
      success: true,
      stats: {
        enabled: this.enabled,
        totalActions,
        uniqueTypes,
        uniqueTargets,
        totalChains,
        topActions,
        scopeDistribution,
        historySize: this.actions.length,
        maxHistory: this.config.maxHistorySize,
      },
    };
  }

  // Reset learning state
  reset() {
    this.actions = [];
    this.chains = [];
    this.predictions = [];
    this.frequencyMap.clear();
    this.targetMap.clear();
    this.scopeStats.clear();

    return { success: true, message: 'Behavior learning reset' };
  }

  // Export learned data
  export() {
    return {
      success: true,
      data: {
        actions: this.actions.map(a => a.toJSON()),
        chains: this.chains.map(c => c.toJSON()),
        frequencyMap: Object.fromEntries(this.frequencyMap),
        targetMap: Object.fromEntries(this.targetMap),
        scopeStats: Object.fromEntries(this.scopeStats),
        config: this.config,
      },
    };
  }

  // Import learned data
  import(data) {
    try {
      this.actions = (data.actions || []).map(a => Action.fromJSON(a));
      this.chains = (data.chains || []).map(c => BehavioralChain.fromJSON(c));
      this.frequencyMap = new Map(Object.entries(data.frequencyMap || {}));
      this.targetMap = new Map(Object.entries(data.targetMap || {}));
      this.scopeStats = new Map(Object.entries(data.scopeStats || {}));
      if (data.config) {
        Object.assign(this.config, data.config);
      }

      return {
        success: true,
        imported: {
          actions: this.actions.length,
          chains: this.chains.length,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Get recent action history
  getHistory(limit = 50) {
    return {
      success: true,
      actions: this.actions.slice(-limit).map(a => a.toJSON()),
      total: this.actions.length,
    };
  }
}

module.exports = {
  BehaviorClient,
  Action,
  BehavioralChain,
  Prediction,
  Adaptation,
  ACTION_TYPES,
};
