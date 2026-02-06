// GentlyOS Brain Client - Self-Evolving AI Memory System
// Manages adaptive learning, memory consolidation, and knowledge evolution

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'brain') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Memory types
const MEMORY_TYPE = {
  EPISODIC: 'episodic',     // Event-based memories
  SEMANTIC: 'semantic',     // Factual knowledge
  PROCEDURAL: 'procedural', // How-to knowledge
  WORKING: 'working',       // Short-term active
  EMOTIONAL: 'emotional',   // Affective memories
};

// Memory states
const MEMORY_STATE = {
  ACTIVE: 'active',         // Currently in use
  DORMANT: 'dormant',       // Stored but not accessed
  CONSOLIDATING: 'consolidating', // Being processed
  ARCHIVED: 'archived',     // Long-term storage
  DECAYING: 'decaying',     // Scheduled for removal
};

// Learning modes
const LEARNING_MODE = {
  SUPERVISED: 'supervised',     // With feedback
  UNSUPERVISED: 'unsupervised', // Pattern discovery
  REINFORCEMENT: 'reinforcement', // Reward-based
  IMITATION: 'imitation',       // Copy behavior
  TRANSFER: 'transfer',         // Apply prior knowledge
};

// Memory unit
class Memory {
  constructor(type, content, metadata = {}) {
    this.id = generateId('mem');
    this.type = type;
    this.content = content;
    this.metadata = metadata;
    this.state = MEMORY_STATE.ACTIVE;
    this.strength = 1.0;
    this.accessCount = 0;
    this.lastAccess = Date.now();
    this.createdAt = Date.now();
    this.associations = new Set();
    this.embedding = null;
  }

  // Access memory (increases strength)
  access() {
    this.accessCount++;
    this.lastAccess = Date.now();
    this.strength = Math.min(2.0, this.strength + 0.1);
    return this;
  }

  // Decay memory over time
  decay(rate = 0.01) {
    const timeSinceAccess = (Date.now() - this.lastAccess) / 1000 / 60; // minutes
    const decayAmount = rate * Math.log(timeSinceAccess + 1);
    this.strength = Math.max(0, this.strength - decayAmount);
    if (this.strength < 0.1) {
      this.state = MEMORY_STATE.DECAYING;
    }
    return this;
  }

  // Associate with another memory
  associate(memoryId, strength = 1.0) {
    this.associations.add({ id: memoryId, strength });
    return this;
  }

  // Set embedding vector
  setEmbedding(vector) {
    this.embedding = vector;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      metadata: this.metadata,
      state: this.state,
      strength: this.strength,
      accessCount: this.accessCount,
      lastAccess: this.lastAccess,
      createdAt: this.createdAt,
      associations: Array.from(this.associations),
      hasEmbedding: !!this.embedding,
    };
  }
}

// Memory cluster (related memories)
class MemoryCluster {
  constructor(name) {
    this.id = generateId('cluster');
    this.name = name;
    this.memories = new Set();
    this.centroid = null;
    this.createdAt = Date.now();
  }

  // Add memory to cluster
  add(memoryId) {
    this.memories.add(memoryId);
    return this;
  }

  // Remove memory from cluster
  remove(memoryId) {
    this.memories.delete(memoryId);
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      memories: Array.from(this.memories),
      size: this.memories.size,
      createdAt: this.createdAt,
    };
  }
}

// Learning episode
class LearningEpisode {
  constructor(mode, context) {
    this.id = generateId('episode');
    this.mode = mode;
    this.context = context;
    this.inputs = [];
    this.outputs = [];
    this.feedback = [];
    this.reward = 0;
    this.state = 'active';
    this.startedAt = Date.now();
    this.endedAt = null;
  }

  // Add input-output pair
  addSample(input, output) {
    this.inputs.push(input);
    this.outputs.push(output);
    return this;
  }

  // Add feedback
  addFeedback(feedback, reward = 0) {
    this.feedback.push({ feedback, reward, ts: Date.now() });
    this.reward += reward;
    return this;
  }

  // Complete episode
  complete() {
    this.state = 'completed';
    this.endedAt = Date.now();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      mode: this.mode,
      context: this.context,
      sampleCount: this.inputs.length,
      feedbackCount: this.feedback.length,
      totalReward: this.reward,
      state: this.state,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      duration: this.endedAt ? this.endedAt - this.startedAt : null,
    };
  }
}

// Attention focus
class AttentionFocus {
  constructor() {
    this.targets = new Map(); // memoryId -> weight
    this.capacity = 7; // Miller's magic number
    this.lastUpdate = Date.now();
  }

  // Focus on memory
  focus(memoryId, weight = 1.0) {
    this.targets.set(memoryId, weight);

    // If over capacity, remove lowest weight
    if (this.targets.size > this.capacity) {
      let minId = null;
      let minWeight = Infinity;
      for (const [id, w] of this.targets) {
        if (w < minWeight) {
          minWeight = w;
          minId = id;
        }
      }
      if (minId) this.targets.delete(minId);
    }

    this.lastUpdate = Date.now();
    return this;
  }

  // Defocus memory
  defocus(memoryId) {
    this.targets.delete(memoryId);
    return this;
  }

  // Get focused memories
  getFocused() {
    return Array.from(this.targets.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, weight]) => ({ id, weight }));
  }

  // Clear all focus
  clear() {
    this.targets.clear();
    return this;
  }

  toJSON() {
    return {
      focused: this.getFocused(),
      capacity: this.capacity,
      used: this.targets.size,
      lastUpdate: this.lastUpdate,
    };
  }
}

// Evolution tracker
class EvolutionTracker {
  constructor() {
    this.generations = [];
    this.currentGeneration = 0;
    this.mutations = [];
    this.fitness = 0;
  }

  // Start new generation
  newGeneration() {
    this.currentGeneration++;
    this.generations.push({
      id: this.currentGeneration,
      startedAt: Date.now(),
      mutations: [],
      fitness: 0,
    });
    return this;
  }

  // Record mutation
  recordMutation(type, details) {
    const mutation = {
      type,
      details,
      generation: this.currentGeneration,
      ts: Date.now(),
    };
    this.mutations.push(mutation);
    if (this.generations.length > 0) {
      this.generations[this.generations.length - 1].mutations.push(mutation);
    }
    return mutation;
  }

  // Update fitness
  updateFitness(delta) {
    this.fitness += delta;
    if (this.generations.length > 0) {
      this.generations[this.generations.length - 1].fitness = this.fitness;
    }
    return this;
  }

  toJSON() {
    return {
      currentGeneration: this.currentGeneration,
      totalMutations: this.mutations.length,
      fitness: this.fitness,
      generationCount: this.generations.length,
      recentGenerations: this.generations.slice(-5),
    };
  }
}

// Consolidation process
class Consolidator {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.stats = {
      processed: 0,
      merged: 0,
      archived: 0,
      pruned: 0,
    };
  }

  // Queue memory for consolidation
  queue(memory) {
    this.queue.push(memory);
    return this;
  }

  // Process consolidation (should be called periodically)
  process(memories, options = {}) {
    const results = {
      merged: [],
      archived: [],
      pruned: [],
    };

    for (const mem of this.queue) {
      if (mem.strength < 0.1) {
        // Prune weak memories
        results.pruned.push(mem.id);
        this.stats.pruned++;
      } else if (mem.strength < 0.3 && mem.accessCount < 2) {
        // Archive rarely accessed
        mem.state = MEMORY_STATE.ARCHIVED;
        results.archived.push(mem.id);
        this.stats.archived++;
      }
      this.stats.processed++;
    }

    this.queue = [];
    return results;
  }

  toJSON() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      stats: this.stats,
    };
  }
}

// Main Brain Client
class BrainClient {
  constructor() {
    this.memories = new Map();
    this.clusters = new Map();
    this.episodes = new Map();
    this.attention = new AttentionFocus();
    this.evolution = new EvolutionTracker();
    this.consolidator = new Consolidator();
    this.config = {
      decayRate: 0.01,
      consolidationInterval: 60000, // 1 minute
      maxMemories: 10000,
    };
  }

  // Store memory
  storeMemory(type, content, metadata = {}) {
    const memory = new Memory(type, content, metadata);
    this.memories.set(memory.id, memory);

    // Auto-focus new memories
    this.attention.focus(memory.id, 0.8);

    // Trigger evolution
    this.evolution.recordMutation('memory_created', { id: memory.id, type });

    return { success: true, memory: memory.toJSON() };
  }

  // Recall memory
  recallMemory(memoryId) {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      return { success: false, error: 'Memory not found' };
    }
    memory.access();
    this.attention.focus(memoryId, 1.0);
    return { success: true, memory: memory.toJSON() };
  }

  // Search memories
  searchMemories(query, options = {}) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const memory of this.memories.values()) {
      if (options.type && memory.type !== options.type) continue;
      if (options.state && memory.state !== options.state) continue;

      // Simple text search
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      if (contentStr.includes(queryLower)) {
        results.push(memory);
      }
    }

    // Sort by strength
    results.sort((a, b) => b.strength - a.strength);

    return {
      success: true,
      memories: results.slice(0, options.limit || 20).map(m => m.toJSON()),
      total: results.length,
    };
  }

  // Associate memories
  associateMemories(memoryId1, memoryId2, strength = 1.0) {
    const mem1 = this.memories.get(memoryId1);
    const mem2 = this.memories.get(memoryId2);
    if (!mem1 || !mem2) {
      return { success: false, error: 'Memory not found' };
    }
    mem1.associate(memoryId2, strength);
    mem2.associate(memoryId1, strength);
    return { success: true };
  }

  // Create cluster
  createCluster(name) {
    const cluster = new MemoryCluster(name);
    this.clusters.set(cluster.id, cluster);
    return { success: true, cluster: cluster.toJSON() };
  }

  // Add memory to cluster
  addToCluster(clusterId, memoryId) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      return { success: false, error: 'Cluster not found' };
    }
    if (!this.memories.has(memoryId)) {
      return { success: false, error: 'Memory not found' };
    }
    cluster.add(memoryId);
    return { success: true, cluster: cluster.toJSON() };
  }

  // Start learning episode
  startLearning(mode, context = {}) {
    const episode = new LearningEpisode(mode, context);
    this.episodes.set(episode.id, episode);
    this.evolution.recordMutation('learning_started', { mode, episodeId: episode.id });
    return { success: true, episode: episode.toJSON() };
  }

  // Add sample to episode
  addSample(episodeId, input, output) {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return { success: false, error: 'Episode not found' };
    }
    episode.addSample(input, output);
    return { success: true, sampleCount: episode.inputs.length };
  }

  // Add feedback to episode
  addFeedback(episodeId, feedback, reward = 0) {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return { success: false, error: 'Episode not found' };
    }
    episode.addFeedback(feedback, reward);
    this.evolution.updateFitness(reward);
    return { success: true, totalReward: episode.reward };
  }

  // Complete learning episode
  completeLearning(episodeId) {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return { success: false, error: 'Episode not found' };
    }
    episode.complete();
    this.evolution.recordMutation('learning_completed', {
      episodeId,
      reward: episode.reward
    });
    return { success: true, episode: episode.toJSON() };
  }

  // Get attention focus
  getAttention() {
    return { success: true, attention: this.attention.toJSON() };
  }

  // Focus attention
  focusAttention(memoryId, weight = 1.0) {
    this.attention.focus(memoryId, weight);
    return { success: true, attention: this.attention.toJSON() };
  }

  // Clear attention
  clearAttention() {
    this.attention.clear();
    return { success: true };
  }

  // Run consolidation
  runConsolidation() {
    // Decay all memories
    for (const memory of this.memories.values()) {
      memory.decay(this.config.decayRate);
      if (memory.state === MEMORY_STATE.DECAYING || memory.state === MEMORY_STATE.CONSOLIDATING) {
        this.consolidator.queue(memory);
      }
    }

    const results = this.consolidator.process(this.memories);

    // Remove pruned memories
    for (const id of results.pruned) {
      this.memories.delete(id);
    }

    return { success: true, results };
  }

  // Start new evolution generation
  evolve() {
    this.evolution.newGeneration();
    return { success: true, evolution: this.evolution.toJSON() };
  }

  // Get evolution status
  getEvolution() {
    return { success: true, evolution: this.evolution.toJSON() };
  }

  // Get brain statistics
  getStats() {
    const typeCount = {};
    const stateCount = {};
    let totalStrength = 0;

    for (const memory of this.memories.values()) {
      typeCount[memory.type] = (typeCount[memory.type] || 0) + 1;
      stateCount[memory.state] = (stateCount[memory.state] || 0) + 1;
      totalStrength += memory.strength;
    }

    return {
      success: true,
      stats: {
        totalMemories: this.memories.size,
        typeDistribution: typeCount,
        stateDistribution: stateCount,
        averageStrength: this.memories.size > 0 ? totalStrength / this.memories.size : 0,
        clusterCount: this.clusters.size,
        episodeCount: this.episodes.size,
        evolution: this.evolution.toJSON(),
        consolidation: this.consolidator.toJSON(),
        attention: this.attention.toJSON(),
      },
    };
  }

  // List memories
  listMemories(options = {}) {
    let memories = Array.from(this.memories.values());

    if (options.type) {
      memories = memories.filter(m => m.type === options.type);
    }
    if (options.state) {
      memories = memories.filter(m => m.state === options.state);
    }
    if (options.minStrength) {
      memories = memories.filter(m => m.strength >= options.minStrength);
    }

    // Sort by strength or recency
    if (options.sortBy === 'recency') {
      memories.sort((a, b) => b.lastAccess - a.lastAccess);
    } else {
      memories.sort((a, b) => b.strength - a.strength);
    }

    return {
      success: true,
      memories: memories.slice(0, options.limit || 50).map(m => m.toJSON()),
      total: memories.length,
    };
  }

  // Delete memory
  deleteMemory(memoryId) {
    if (!this.memories.has(memoryId)) {
      return { success: false, error: 'Memory not found' };
    }
    this.memories.delete(memoryId);
    this.attention.defocus(memoryId);
    return { success: true };
  }

  // List clusters
  listClusters() {
    return {
      success: true,
      clusters: Array.from(this.clusters.values()).map(c => c.toJSON()),
    };
  }

  // Delete cluster
  deleteCluster(clusterId) {
    if (!this.clusters.has(clusterId)) {
      return { success: false, error: 'Cluster not found' };
    }
    this.clusters.delete(clusterId);
    return { success: true };
  }

  // List episodes
  listEpisodes(options = {}) {
    let episodes = Array.from(this.episodes.values());

    if (options.mode) {
      episodes = episodes.filter(e => e.mode === options.mode);
    }
    if (options.state) {
      episodes = episodes.filter(e => e.state === options.state);
    }

    return {
      success: true,
      episodes: episodes.map(e => e.toJSON()),
      total: episodes.length,
    };
  }
}

module.exports = {
  BrainClient,
  Memory,
  MemoryCluster,
  LearningEpisode,
  AttentionFocus,
  EvolutionTracker,
  Consolidator,
  MEMORY_TYPE,
  MEMORY_STATE,
  LEARNING_MODE,
};
