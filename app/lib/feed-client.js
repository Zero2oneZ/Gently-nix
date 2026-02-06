// GentlyOS Living Feed Client
// Manages feed state with charge/decay mechanics

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Feed item states based on charge level
const FeedState = {
  HOT: 'Hot',         // charge > 0.8
  ACTIVE: 'Active',   // charge 0.4-0.8
  COOLING: 'Cooling', // charge 0.1-0.4
  FROZEN: 'Frozen',   // charge < 0.1
};

// Item kinds
const ItemKind = {
  PROJECT: 'Project',
  TASK: 'Task',
  IDEA: 'Idea',
  REFERENCE: 'Reference',
  PERSON: 'Person',
};

// Get state from charge value
function getStateFromCharge(charge) {
  if (charge > 0.8) return FeedState.HOT;
  if (charge > 0.4) return FeedState.ACTIVE;
  if (charge > 0.1) return FeedState.COOLING;
  return FeedState.FROZEN;
}

// Get state color CSS variable
function getStateColor(state) {
  switch (state) {
    case FeedState.HOT: return 'var(--dead)';      // Red - needs attention
    case FeedState.ACTIVE: return 'var(--focus)';  // Cyan - active
    case FeedState.COOLING: return 'var(--warn)';  // Yellow - fading
    case FeedState.FROZEN: return 'var(--dim)';    // Gray - archived
    default: return 'var(--muted)';
  }
}

// Get kind icon
function getKindIcon(kind) {
  switch (kind) {
    case ItemKind.PROJECT: return 'i-layers';
    case ItemKind.TASK: return 'i-file';
    case ItemKind.IDEA: return 'i-star';
    case ItemKind.REFERENCE: return 'i-book';
    case ItemKind.PERSON: return 'i-msg';
    default: return 'i-diamond';
  }
}

class FeedClient {
  constructor() {
    this.items = [];
    this.lastUpdate = null;
    this.useBridge = false; // Try CLI first, fall back to bridge
  }

  // Fetch feed items from backend
  async list() {
    try {
      // Try CLI first
      const result = await invokeGently('feed', ['show', '--json']);
      if (typeof result === 'object' && result.items) {
        this.items = this.normalizeItems(result.items);
      } else if (Array.isArray(result)) {
        this.items = this.normalizeItems(result);
      } else {
        // Parse if string
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        this.items = this.normalizeItems(parsed.items || parsed || []);
      }
      this.lastUpdate = Date.now();
      return { success: true, items: this.items };
    } catch (cliErr) {
      // Fall back to bridge
      try {
        const bridgeResult = await bridgeRPC('feed.list', { limit: 100 });
        if (bridgeResult.result) {
          this.items = this.normalizeItems(bridgeResult.result.items || bridgeResult.result);
          this.lastUpdate = Date.now();
          this.useBridge = true;
          return { success: true, items: this.items };
        }
      } catch (bridgeErr) {
        // Both failed - return mock data for development
        console.warn('[FeedClient] Both CLI and Bridge unavailable, using mock data');
        this.items = this.getMockItems();
        return { success: true, items: this.items, mock: true };
      }
    }
    return { success: false, items: [], error: 'Feed unavailable' };
  }

  // Normalize items from backend format
  normalizeItems(items) {
    return items.map(item => ({
      id: item.id || item.uuid || `item-${Math.random().toString(36).slice(2)}`,
      name: item.name || item.title || 'Unnamed',
      kind: item.kind || item.type || ItemKind.TASK,
      charge: typeof item.charge === 'number' ? item.charge : 0.5,
      decayRate: item.decay_rate || item.decayRate || 0.05,
      state: item.state || getStateFromCharge(item.charge || 0.5),
      steps: (item.steps || []).map(s => ({
        id: s.id || s.step_id,
        content: s.content || s.text || '',
        completed: s.completed || s.done || false,
        createdAt: s.created_at || s.createdAt,
        completedAt: s.completed_at || s.completedAt,
      })),
      pinned: item.pinned || false,
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      lastMentionedAt: item.last_mentioned_at || item.lastMentionedAt,
      snapshots: item.snapshots || [],
    }));
  }

  // Add new feed item
  async add(name, kind, content = '') {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.add', { name, kind, content });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['add', name, '--kind', kind, '--content', content]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Add failed:', err);
      return { error: err.message };
    }
  }

  // Boost an item's charge
  async boost(itemId, amount = 0.1) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.boost', { item_id: itemId, boost: amount });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['boost', itemId, '--amount', amount.toString()]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Boost failed:', err);
      // Optimistic update
      const item = this.items.find(i => i.id === itemId);
      if (item) {
        item.charge = Math.min(1.0, item.charge + amount);
        item.state = getStateFromCharge(item.charge);
        item.lastMentionedAt = new Date().toISOString();
      }
      return { success: true, optimistic: true };
    }
  }

  // Add a step to an item
  async addStep(itemId, content) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.step', { item_id: itemId, content });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['step', itemId, content]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Add step failed:', err);
      // Optimistic update
      const item = this.items.find(i => i.id === itemId);
      if (item) {
        item.steps.push({
          id: item.steps.length + 1,
          content,
          completed: false,
          createdAt: new Date().toISOString(),
        });
      }
      return { success: true, optimistic: true };
    }
  }

  // Complete a step
  async completeStep(itemId, stepId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.complete_step', { item_id: itemId, step_id: stepId });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['complete', itemId, '--step', stepId.toString()]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Complete step failed:', err);
      // Optimistic update
      const item = this.items.find(i => i.id === itemId);
      if (item) {
        const step = item.steps.find(s => s.id === stepId);
        if (step) {
          step.completed = true;
          step.completedAt = new Date().toISOString();
        }
      }
      return { success: true, optimistic: true };
    }
  }

  // Toggle pin status
  async togglePin(itemId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.pin', { item_id: itemId });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['pin', itemId]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Toggle pin failed:', err);
      // Optimistic update
      const item = this.items.find(i => i.id === itemId);
      if (item) {
        item.pinned = !item.pinned;
      }
      return { success: true, optimistic: true };
    }
  }

  // Verify an item (mark as complete/archive)
  async verify(itemId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('feed.verify', { item_id: itemId });
        return result.result;
      } else {
        const result = await invokeGently('feed', ['verify', itemId]);
        return result;
      }
    } catch (err) {
      console.error('[FeedClient] Verify failed:', err);
      return { error: err.message };
    }
  }

  // Get mock items for development
  getMockItems() {
    return [
      {
        id: 'mock-1',
        name: 'GentlyOS Integration',
        kind: ItemKind.PROJECT,
        charge: 0.92,
        decayRate: 0.05,
        state: FeedState.HOT,
        steps: [
          { id: 1, content: 'Tier system', completed: true },
          { id: 2, content: 'Bridge client', completed: true },
          { id: 3, content: 'Living Feed UI', completed: false },
          { id: 4, content: 'GOO field renderer', completed: false },
        ],
        pinned: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastMentionedAt: new Date().toISOString(),
      },
      {
        id: 'mock-2',
        name: 'Porkbun API Integration',
        kind: ItemKind.TASK,
        charge: 0.65,
        decayRate: 0.05,
        state: FeedState.ACTIVE,
        steps: [
          { id: 1, content: 'API client wrapper', completed: false },
          { id: 2, content: 'Domain list view', completed: false },
        ],
        pinned: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: 'mock-3',
        name: 'Alexandria Knowledge Graph',
        kind: ItemKind.IDEA,
        charge: 0.35,
        decayRate: 0.05,
        state: FeedState.COOLING,
        steps: [],
        pinned: false,
        createdAt: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: 'mock-4',
        name: 'Dance Protocol Research',
        kind: ItemKind.REFERENCE,
        charge: 0.08,
        decayRate: 0.05,
        state: FeedState.FROZEN,
        steps: [],
        pinned: false,
        createdAt: new Date(Date.now() - 1209600000).toISOString(),
      },
    ];
  }

  // Get items sorted by charge (Hot first)
  getSortedItems() {
    return [...this.items].sort((a, b) => {
      // Pinned items first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Then by charge
      return b.charge - a.charge;
    });
  }

  // Get items by state
  getItemsByState(state) {
    return this.items.filter(i => i.state === state);
  }

  // Simulate decay tick (for UI preview)
  simulateDecay() {
    this.items.forEach(item => {
      if (item.pinned) {
        item.charge = Math.max(0.5, item.charge * (1 - item.decayRate));
      } else {
        item.charge = item.charge * (1 - item.decayRate);
      }
      item.state = getStateFromCharge(item.charge);
    });
  }
}

module.exports = {
  FeedClient,
  FeedState,
  ItemKind,
  getStateFromCharge,
  getStateColor,
  getKindIcon,
};
