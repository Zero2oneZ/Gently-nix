// GentlyOS Micro Client - Local Intelligence Engine
// Manages lightweight local AI processing, embeddings, and micro-models

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'micro') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Micro model types
const MODEL_TYPE = {
  EMBEDDING: 'embedding',       // Text embeddings
  CLASSIFIER: 'classifier',     // Classification
  NER: 'ner',                   // Named entity recognition
  SENTIMENT: 'sentiment',       // Sentiment analysis
  SUMMARIZER: 'summarizer',     // Text summarization
  QA: 'qa',                     // Question answering
  TOKENIZER: 'tokenizer',       // Text tokenization
};

// Model states
const MODEL_STATE = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  READY: 'ready',
  PROCESSING: 'processing',
  ERROR: 'error',
};

// Micro model wrapper
class MicroModel {
  constructor(type, config = {}) {
    this.id = generateId('model');
    this.type = type;
    this.config = {
      name: config.name || `micro-${type}`,
      version: config.version || '1.0.0',
      maxBatchSize: config.maxBatchSize || 32,
      maxSequenceLength: config.maxSequenceLength || 512,
      ...config,
    };
    this.state = MODEL_STATE.UNLOADED;
    this.stats = {
      loaded: 0,
      processed: 0,
      errors: 0,
      avgLatencyMs: 0,
    };
    this.loadedAt = null;
  }

  // Simulate loading
  load() {
    this.state = MODEL_STATE.LOADING;
    // In real implementation, would load ONNX/TensorFlow.js model
    this.state = MODEL_STATE.READY;
    this.stats.loaded++;
    this.loadedAt = Date.now();
    return this;
  }

  // Unload model
  unload() {
    this.state = MODEL_STATE.UNLOADED;
    this.loadedAt = null;
    return this;
  }

  // Process input (simulated)
  process(input) {
    if (this.state !== MODEL_STATE.READY) {
      throw new Error(`Model not ready: ${this.state}`);
    }

    this.state = MODEL_STATE.PROCESSING;
    const startTime = Date.now();

    // Simulate processing based on type
    let result;
    switch (this.type) {
      case MODEL_TYPE.EMBEDDING:
        result = this.generateEmbedding(input);
        break;
      case MODEL_TYPE.CLASSIFIER:
        result = this.classify(input);
        break;
      case MODEL_TYPE.SENTIMENT:
        result = this.analyzeSentiment(input);
        break;
      case MODEL_TYPE.NER:
        result = this.extractEntities(input);
        break;
      case MODEL_TYPE.TOKENIZER:
        result = this.tokenize(input);
        break;
      default:
        result = { raw: input };
    }

    const latency = Date.now() - startTime;
    this.updateStats(latency);
    this.state = MODEL_STATE.READY;

    return result;
  }

  // Generate embedding (simulated)
  generateEmbedding(text) {
    // Simple hash-based embedding simulation
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = [];
    for (let i = 0; i < 128; i++) {
      embedding.push((hash[i % 32] / 255) * 2 - 1);
    }
    return { embedding, dimensions: 128 };
  }

  // Classification (simulated)
  classify(text) {
    const labels = ['general', 'technical', 'creative', 'question', 'command'];
    const scores = labels.map(l => Math.random());
    const total = scores.reduce((a, b) => a + b, 0);
    return {
      labels: labels.map((l, i) => ({
        label: l,
        score: scores[i] / total,
      })).sort((a, b) => b.score - a.score),
    };
  }

  // Sentiment analysis (simulated)
  analyzeSentiment(text) {
    const hash = crypto.createHash('md5').update(text).digest();
    const sentiment = (hash[0] / 255) * 2 - 1; // -1 to 1
    return {
      sentiment: sentiment > 0.3 ? 'positive' : sentiment < -0.3 ? 'negative' : 'neutral',
      score: sentiment,
      confidence: 0.7 + Math.random() * 0.3,
    };
  }

  // Entity extraction (simulated)
  extractEntities(text) {
    const entities = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^[A-Z][a-z]+$/.test(word)) {
        entities.push({
          text: word,
          type: 'PERSON',
          start: text.indexOf(word),
          end: text.indexOf(word) + word.length,
        });
      } else if (/^\d{4}$/.test(word)) {
        entities.push({
          text: word,
          type: 'DATE',
          start: text.indexOf(word),
          end: text.indexOf(word) + word.length,
        });
      }
    }

    return { entities };
  }

  // Tokenization
  tokenize(text) {
    // Simple whitespace + punctuation tokenization
    const tokens = text.match(/[\w]+|[^\s\w]/g) || [];
    return {
      tokens,
      count: tokens.length,
    };
  }

  updateStats(latency) {
    this.stats.processed++;
    this.stats.avgLatencyMs =
      (this.stats.avgLatencyMs * (this.stats.processed - 1) + latency) / this.stats.processed;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      config: this.config,
      state: this.state,
      stats: this.stats,
      loadedAt: this.loadedAt,
    };
  }
}

// Embedding store
class EmbeddingStore {
  constructor(dimensions = 128) {
    this.dimensions = dimensions;
    this.embeddings = new Map();
    this.metadata = new Map();
  }

  // Store embedding
  store(id, embedding, meta = {}) {
    this.embeddings.set(id, embedding);
    this.metadata.set(id, { ...meta, storedAt: Date.now() });
    return this;
  }

  // Get embedding
  get(id) {
    return {
      embedding: this.embeddings.get(id),
      metadata: this.metadata.get(id),
    };
  }

  // Cosine similarity
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Find similar
  findSimilar(embedding, limit = 10, threshold = 0.5) {
    const results = [];

    for (const [id, stored] of this.embeddings) {
      const similarity = this.cosineSimilarity(embedding, stored);
      if (similarity >= threshold) {
        results.push({
          id,
          similarity,
          metadata: this.metadata.get(id),
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Delete embedding
  delete(id) {
    this.embeddings.delete(id);
    this.metadata.delete(id);
    return this;
  }

  // List all IDs
  list() {
    return Array.from(this.embeddings.keys());
  }

  toJSON() {
    return {
      dimensions: this.dimensions,
      count: this.embeddings.size,
      ids: this.list(),
    };
  }
}

// Local cache for inference results
class InferenceCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  // Generate cache key
  getKey(modelId, input) {
    const hash = crypto.createHash('md5')
      .update(`${modelId}:${JSON.stringify(input)}`)
      .digest('hex');
    return hash;
  }

  // Get from cache
  get(modelId, input) {
    const key = this.getKey(modelId, input);
    const entry = this.cache.get(key);

    if (entry) {
      this.hits++;
      entry.accessCount++;
      entry.lastAccess = Date.now();
      return { hit: true, result: entry.result };
    }

    this.misses++;
    return { hit: false };
  }

  // Set in cache
  set(modelId, input, result) {
    const key = this.getKey(modelId, input);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      result,
      accessCount: 1,
      createdAt: Date.now(),
      lastAccess: Date.now(),
    });

    return this;
  }

  // Evict LRU entry
  evict() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Clear cache
  clear() {
    this.cache.clear();
    return this;
  }

  // Get stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? this.hits / (this.hits + this.misses)
        : 0,
    };
  }
}

// Pipeline for chaining micro models
class MicroPipeline {
  constructor(name) {
    this.id = generateId('pipeline');
    this.name = name;
    this.steps = [];
    this.createdAt = Date.now();
  }

  // Add step
  addStep(modelId, transform = null) {
    this.steps.push({
      order: this.steps.length,
      modelId,
      transform,
    });
    return this;
  }

  // Get step count
  getStepCount() {
    return this.steps.length;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      steps: this.steps,
      stepCount: this.steps.length,
      createdAt: this.createdAt,
    };
  }
}

// Main Micro Client
class MicroClient {
  constructor() {
    this.models = new Map();
    this.embeddings = new EmbeddingStore();
    this.cache = new InferenceCache();
    this.pipelines = new Map();
    this.stats = {
      totalInferences: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  // Create model
  createModel(type, config = {}) {
    const model = new MicroModel(type, config);
    this.models.set(model.id, model);
    return { success: true, model: model.toJSON() };
  }

  // Load model
  loadModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }
    model.load();
    return { success: true, model: model.toJSON() };
  }

  // Unload model
  unloadModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }
    model.unload();
    return { success: true, model: model.toJSON() };
  }

  // Run inference
  infer(modelId, input, useCache = true) {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    // Check cache
    if (useCache) {
      const cached = this.cache.get(modelId, input);
      if (cached.hit) {
        this.stats.cacheHits++;
        return { success: true, result: cached.result, cached: true };
      }
      this.stats.cacheMisses++;
    }

    // Ensure model is loaded
    if (model.state === MODEL_STATE.UNLOADED) {
      model.load();
    }

    try {
      const result = model.process(input);
      this.stats.totalInferences++;

      if (useCache) {
        this.cache.set(modelId, input, result);
      }

      return { success: true, result, cached: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Embed text
  embed(text, storeId = null) {
    // Find or create embedding model
    let embeddingModel = null;
    for (const model of this.models.values()) {
      if (model.type === MODEL_TYPE.EMBEDDING && model.state === MODEL_STATE.READY) {
        embeddingModel = model;
        break;
      }
    }

    if (!embeddingModel) {
      // Create default embedding model
      const result = this.createModel(MODEL_TYPE.EMBEDDING, { name: 'default-embedder' });
      embeddingModel = this.models.get(result.model.id);
      embeddingModel.load();
    }

    const { embedding, dimensions } = embeddingModel.process(text);

    if (storeId) {
      this.embeddings.store(storeId, embedding, { text });
    }

    return { success: true, embedding, dimensions, stored: !!storeId };
  }

  // Find similar by text
  findSimilar(text, limit = 10, threshold = 0.5) {
    const { embedding } = this.embed(text).success ?
      this.embed(text) :
      { embedding: [] };

    if (!embedding.length) {
      return { success: false, error: 'Could not generate embedding' };
    }

    const results = this.embeddings.findSimilar(embedding, limit, threshold);
    return { success: true, results };
  }

  // Create pipeline
  createPipeline(name) {
    const pipeline = new MicroPipeline(name);
    this.pipelines.set(pipeline.id, pipeline);
    return { success: true, pipeline: pipeline.toJSON() };
  }

  // Add step to pipeline
  addPipelineStep(pipelineId, modelId, transform = null) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      return { success: false, error: 'Pipeline not found' };
    }
    if (!this.models.has(modelId)) {
      return { success: false, error: 'Model not found' };
    }
    pipeline.addStep(modelId, transform);
    return { success: true, pipeline: pipeline.toJSON() };
  }

  // Run pipeline
  runPipeline(pipelineId, input) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      return { success: false, error: 'Pipeline not found' };
    }

    let current = input;
    const stepResults = [];

    for (const step of pipeline.steps) {
      const result = this.infer(step.modelId, current, false);
      if (!result.success) {
        return { success: false, error: `Step ${step.order} failed: ${result.error}` };
      }

      // Apply transform if provided
      if (step.transform && typeof step.transform === 'function') {
        current = step.transform(result.result);
      } else {
        current = result.result;
      }

      stepResults.push({
        step: step.order,
        modelId: step.modelId,
        result: current,
      });
    }

    return {
      success: true,
      output: current,
      steps: stepResults,
    };
  }

  // Store embedding directly
  storeEmbedding(id, embedding, metadata = {}) {
    this.embeddings.store(id, embedding, metadata);
    return { success: true, id };
  }

  // Get embedding
  getEmbedding(id) {
    const result = this.embeddings.get(id);
    if (!result.embedding) {
      return { success: false, error: 'Embedding not found' };
    }
    return { success: true, ...result };
  }

  // Delete embedding
  deleteEmbedding(id) {
    this.embeddings.delete(id);
    return { success: true };
  }

  // List models
  listModels(options = {}) {
    let models = Array.from(this.models.values());

    if (options.type) {
      models = models.filter(m => m.type === options.type);
    }
    if (options.state) {
      models = models.filter(m => m.state === options.state);
    }

    return {
      success: true,
      models: models.map(m => m.toJSON()),
      total: models.length,
    };
  }

  // Delete model
  deleteModel(modelId) {
    if (!this.models.has(modelId)) {
      return { success: false, error: 'Model not found' };
    }
    const model = this.models.get(modelId);
    if (model.state !== MODEL_STATE.UNLOADED) {
      model.unload();
    }
    this.models.delete(modelId);
    return { success: true };
  }

  // List pipelines
  listPipelines() {
    return {
      success: true,
      pipelines: Array.from(this.pipelines.values()).map(p => p.toJSON()),
    };
  }

  // Delete pipeline
  deletePipeline(pipelineId) {
    if (!this.pipelines.has(pipelineId)) {
      return { success: false, error: 'Pipeline not found' };
    }
    this.pipelines.delete(pipelineId);
    return { success: true };
  }

  // Get statistics
  getStats() {
    const loadedModels = Array.from(this.models.values())
      .filter(m => m.state === MODEL_STATE.READY).length;

    return {
      success: true,
      stats: {
        totalModels: this.models.size,
        loadedModels,
        totalInferences: this.stats.totalInferences,
        embeddings: this.embeddings.toJSON(),
        cache: this.cache.getStats(),
        pipelines: this.pipelines.size,
      },
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    return { success: true };
  }

  // Get model
  getModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }
    return { success: true, model: model.toJSON() };
  }
}

module.exports = {
  MicroClient,
  MicroModel,
  MicroPipeline,
  EmbeddingStore,
  InferenceCache,
  MODEL_TYPE,
  MODEL_STATE,
};
