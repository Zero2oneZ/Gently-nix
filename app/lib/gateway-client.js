// GentlyOS Gateway Client - Central API Bottleneck
// Unified gateway for all external API calls with rate limiting, caching, and monitoring

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'gw') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Endpoint types
const ENDPOINT_TYPE = {
  REST: 'rest',
  GRAPHQL: 'graphql',
  GRPC: 'grpc',
  WEBSOCKET: 'websocket',
  RPC: 'rpc',
};

// Request priority
const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

// Endpoint configuration
class Endpoint {
  constructor(name, baseUrl, options = {}) {
    this.id = generateId('endpoint');
    this.name = name;
    this.baseUrl = baseUrl;
    this.type = options.type || ENDPOINT_TYPE.REST;
    this.auth = options.auth || null; // { type: 'bearer', token: '...' }
    this.headers = options.headers || {};
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.enabled = true;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      avgLatencyMs: 0,
      lastRequest: null,
    };
    this.createdAt = Date.now();
  }

  // Update stats
  recordRequest(latencyMs, success) {
    this.stats.requests++;
    if (success) {
      this.stats.successes++;
    } else {
      this.stats.failures++;
    }
    this.stats.avgLatencyMs =
      (this.stats.avgLatencyMs * (this.stats.requests - 1) + latencyMs) / this.stats.requests;
    this.stats.lastRequest = Date.now();
  }

  // Get success rate
  getSuccessRate() {
    return this.stats.requests > 0
      ? this.stats.successes / this.stats.requests
      : 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      baseUrl: this.baseUrl,
      type: this.type,
      hasAuth: !!this.auth,
      timeout: this.timeout,
      retries: this.retries,
      enabled: this.enabled,
      stats: this.stats,
      successRate: this.getSuccessRate(),
      createdAt: this.createdAt,
    };
  }
}

// Rate limiter
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.buckets = new Map(); // endpointId -> { count, windowStart }
  }

  // Check if request is allowed
  check(endpointId) {
    const now = Date.now();
    let bucket = this.buckets.get(endpointId);

    if (!bucket || now - bucket.windowStart > this.windowMs) {
      // New window
      bucket = { count: 0, windowStart: now };
      this.buckets.set(endpointId, bucket);
    }

    if (bucket.count >= this.maxRequests) {
      return {
        allowed: false,
        retryAfter: this.windowMs - (now - bucket.windowStart),
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - bucket.count,
      retryAfter: 0,
    };
  }

  // Record request
  record(endpointId) {
    const bucket = this.buckets.get(endpointId);
    if (bucket) {
      bucket.count++;
    }
  }

  // Get status for endpoint
  getStatus(endpointId) {
    const bucket = this.buckets.get(endpointId);
    if (!bucket) {
      return { used: 0, limit: this.maxRequests, resetIn: 0 };
    }
    const now = Date.now();
    return {
      used: bucket.count,
      limit: this.maxRequests,
      resetIn: Math.max(0, this.windowMs - (now - bucket.windowStart)),
    };
  }

  toJSON() {
    return {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      buckets: this.buckets.size,
    };
  }
}

// Request cache
class RequestCache {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs || 300000; // 5 minutes
    this.maxSize = options.maxSize || 500;
    this.entries = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  // Generate cache key
  getKey(endpointId, path, params) {
    const data = JSON.stringify({ endpointId, path, params });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // Get from cache
  get(endpointId, path, params) {
    const key = this.getKey(endpointId, path, params);
    const entry = this.entries.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.entries.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  // Set in cache
  set(endpointId, path, params, data) {
    const key = this.getKey(endpointId, path, params);

    // Evict if full
    if (this.entries.size >= this.maxSize) {
      const firstKey = this.entries.keys().next().value;
      this.entries.delete(firstKey);
    }

    this.entries.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Clear cache
  clear() {
    this.entries.clear();
  }

  // Get stats
  getStats() {
    return {
      size: this.entries.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }
}

// Request queue for prioritized processing
class RequestQueue {
  constructor() {
    this.queues = {
      [PRIORITY.CRITICAL]: [],
      [PRIORITY.HIGH]: [],
      [PRIORITY.NORMAL]: [],
      [PRIORITY.LOW]: [],
    };
    this.processing = false;
    this.concurrency = 5;
    this.active = 0;
    this.pending = [];
  }

  // Enqueue request
  enqueue(request, priority = PRIORITY.NORMAL) {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({
        request,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });
      this.processNext();
    });
  }

  // Get next request (by priority)
  getNext() {
    for (const priority of [PRIORITY.CRITICAL, PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW]) {
      if (this.queues[priority].length > 0) {
        return { priority, item: this.queues[priority].shift() };
      }
    }
    return null;
  }

  // Process next request
  async processNext() {
    if (this.active >= this.concurrency) return;

    const next = this.getNext();
    if (!next) return;

    this.active++;
    try {
      const result = await next.item.request();
      next.item.resolve(result);
    } catch (error) {
      next.item.reject(error);
    } finally {
      this.active--;
      this.processNext();
    }
  }

  // Get queue sizes
  getStats() {
    return {
      critical: this.queues[PRIORITY.CRITICAL].length,
      high: this.queues[PRIORITY.HIGH].length,
      normal: this.queues[PRIORITY.NORMAL].length,
      low: this.queues[PRIORITY.LOW].length,
      active: this.active,
      concurrency: this.concurrency,
    };
  }
}

// Circuit breaker for endpoint protection
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.circuits = new Map(); // endpointId -> { state, failures, lastFailure }
  }

  // Get circuit state
  getState(endpointId) {
    const circuit = this.circuits.get(endpointId);
    if (!circuit) {
      return { state: 'closed', failures: 0 };
    }

    if (circuit.state === 'open') {
      // Check if reset timeout passed
      if (Date.now() - circuit.lastFailure > this.resetTimeout) {
        circuit.state = 'half-open';
      }
    }

    return circuit;
  }

  // Check if request allowed
  canRequest(endpointId) {
    const circuit = this.getState(endpointId);
    return circuit.state !== 'open';
  }

  // Record success
  recordSuccess(endpointId) {
    const circuit = this.circuits.get(endpointId);
    if (circuit) {
      circuit.failures = 0;
      circuit.state = 'closed';
    }
  }

  // Record failure
  recordFailure(endpointId) {
    let circuit = this.circuits.get(endpointId);
    if (!circuit) {
      circuit = { state: 'closed', failures: 0, lastFailure: null };
      this.circuits.set(endpointId, circuit);
    }

    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.failureThreshold) {
      circuit.state = 'open';
    }
  }

  toJSON() {
    const circuits = {};
    for (const [id, circuit] of this.circuits) {
      circuits[id] = circuit;
    }
    return {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      circuits,
    };
  }
}

// Request interceptor
class Interceptor {
  constructor(name, handler) {
    this.id = generateId('int');
    this.name = name;
    this.handler = handler;
    this.enabled = true;
    this.order = 0;
  }

  // Execute interceptor
  execute(request) {
    if (!this.enabled) return request;
    return this.handler(request);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      order: this.order,
    };
  }
}

// Main Gateway Client
class GatewayClient {
  constructor() {
    this.endpoints = new Map();
    this.rateLimiter = new RateLimiter();
    this.cache = new RequestCache();
    this.queue = new RequestQueue();
    this.breaker = new CircuitBreaker();
    this.interceptors = {
      request: [],
      response: [],
    };
    this.logs = [];
    this.maxLogs = 1000;
  }

  // Register endpoint
  registerEndpoint(name, baseUrl, options = {}) {
    const endpoint = new Endpoint(name, baseUrl, options);
    this.endpoints.set(endpoint.id, endpoint);
    return { success: true, endpoint: endpoint.toJSON() };
  }

  // Get endpoint
  getEndpoint(endpointId) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }
    return { success: true, endpoint: endpoint.toJSON() };
  }

  // Find endpoint by name
  findEndpoint(name) {
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.name === name) {
        return { success: true, endpoint: endpoint.toJSON() };
      }
    }
    return { success: false, error: 'Endpoint not found' };
  }

  // Make request (simulated - in real impl would use fetch/axios)
  async request(endpointId, path, options = {}) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }

    if (!endpoint.enabled) {
      return { success: false, error: 'Endpoint disabled' };
    }

    // Check circuit breaker
    if (!this.breaker.canRequest(endpointId)) {
      return { success: false, error: 'Circuit open - endpoint unavailable' };
    }

    // Check rate limit
    const rateCheck = this.rateLimiter.check(endpointId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter,
      };
    }

    // Check cache (for GET requests)
    const method = options.method || 'GET';
    if (method === 'GET' && options.cache !== false) {
      const cached = this.cache.get(endpointId, path, options.params);
      if (cached) {
        return { success: true, data: cached, cached: true };
      }
    }

    // Build request
    let request = {
      url: `${endpoint.baseUrl}${path}`,
      method,
      headers: { ...endpoint.headers, ...options.headers },
      body: options.body,
      params: options.params,
    };

    // Apply auth
    if (endpoint.auth) {
      if (endpoint.auth.type === 'bearer') {
        request.headers['Authorization'] = `Bearer ${endpoint.auth.token}`;
      } else if (endpoint.auth.type === 'api-key') {
        request.headers[endpoint.auth.header || 'X-API-Key'] = endpoint.auth.key;
      }
    }

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      request = interceptor.execute(request);
    }

    // Execute request (simulated)
    const startTime = Date.now();
    this.rateLimiter.record(endpointId);

    try {
      // Simulate request/response
      const response = await this.simulateRequest(request, endpoint);
      const latency = Date.now() - startTime;

      endpoint.recordRequest(latency, true);
      this.breaker.recordSuccess(endpointId);

      // Cache successful GET responses
      if (method === 'GET' && options.cache !== false) {
        this.cache.set(endpointId, path, options.params, response.data);
      }

      // Log
      this.log('request', { endpointId, path, method, latency, status: 'success' });

      return { success: true, data: response.data, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      endpoint.recordRequest(latency, false);
      this.breaker.recordFailure(endpointId);

      this.log('request', { endpointId, path, method, latency, status: 'error', error: error.message });

      return { success: false, error: error.message, latency };
    }
  }

  // Simulate request (for testing)
  async simulateRequest(request, endpoint) {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Random failure (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Simulated network error');
    }

    return {
      data: {
        url: request.url,
        method: request.method,
        timestamp: Date.now(),
        simulated: true,
      },
    };
  }

  // Queue request
  queueRequest(endpointId, path, options = {}) {
    const priority = options.priority || PRIORITY.NORMAL;
    return this.queue.enqueue(
      () => this.request(endpointId, path, options),
      priority
    );
  }

  // Add interceptor
  addInterceptor(type, name, handler) {
    if (type !== 'request' && type !== 'response') {
      return { success: false, error: 'Invalid interceptor type' };
    }
    const interceptor = new Interceptor(name, handler);
    this.interceptors[type].push(interceptor);
    return { success: true, interceptor: interceptor.toJSON() };
  }

  // Remove interceptor
  removeInterceptor(type, interceptorId) {
    const list = this.interceptors[type];
    const index = list.findIndex(i => i.id === interceptorId);
    if (index === -1) {
      return { success: false, error: 'Interceptor not found' };
    }
    list.splice(index, 1);
    return { success: true };
  }

  // Enable/disable endpoint
  setEndpointEnabled(endpointId, enabled) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }
    endpoint.enabled = enabled;
    return { success: true, endpoint: endpoint.toJSON() };
  }

  // Update endpoint auth
  updateEndpointAuth(endpointId, auth) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }
    endpoint.auth = auth;
    return { success: true };
  }

  // Get rate limit status
  getRateLimitStatus(endpointId) {
    return { success: true, status: this.rateLimiter.getStatus(endpointId) };
  }

  // Get circuit status
  getCircuitStatus(endpointId) {
    return { success: true, circuit: this.breaker.getState(endpointId) };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    return { success: true };
  }

  // Log entry
  log(type, data) {
    this.logs.push({
      type,
      data,
      timestamp: Date.now(),
    });

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // Get logs
  getLogs(options = {}) {
    let logs = [...this.logs];

    if (options.type) {
      logs = logs.filter(l => l.type === options.type);
    }
    if (options.since) {
      logs = logs.filter(l => l.timestamp >= options.since);
    }

    return {
      success: true,
      logs: logs.slice(-options.limit || -100),
      total: logs.length,
    };
  }

  // List endpoints
  listEndpoints() {
    return {
      success: true,
      endpoints: Array.from(this.endpoints.values()).map(e => e.toJSON()),
    };
  }

  // Delete endpoint
  deleteEndpoint(endpointId) {
    if (!this.endpoints.has(endpointId)) {
      return { success: false, error: 'Endpoint not found' };
    }
    this.endpoints.delete(endpointId);
    return { success: true };
  }

  // Get statistics
  getStats() {
    let totalRequests = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const endpoint of this.endpoints.values()) {
      totalRequests += endpoint.stats.requests;
      totalSuccesses += endpoint.stats.successes;
      totalFailures += endpoint.stats.failures;
    }

    return {
      success: true,
      stats: {
        endpoints: this.endpoints.size,
        totalRequests,
        totalSuccesses,
        totalFailures,
        successRate: totalRequests > 0 ? totalSuccesses / totalRequests : 0,
        cache: this.cache.getStats(),
        queue: this.queue.getStats(),
        rateLimiter: this.rateLimiter.toJSON(),
        circuitBreaker: this.breaker.toJSON(),
        interceptors: {
          request: this.interceptors.request.length,
          response: this.interceptors.response.length,
        },
      },
    };
  }

  // Configure rate limiter
  configureRateLimiter(options) {
    this.rateLimiter = new RateLimiter(options);
    return { success: true, rateLimiter: this.rateLimiter.toJSON() };
  }

  // Configure circuit breaker
  configureCircuitBreaker(options) {
    this.breaker = new CircuitBreaker(options);
    return { success: true };
  }

  // Configure cache
  configureCache(options) {
    this.cache = new RequestCache(options);
    return { success: true, cache: this.cache.getStats() };
  }
}

module.exports = {
  GatewayClient,
  Endpoint,
  RateLimiter,
  RequestCache,
  RequestQueue,
  CircuitBreaker,
  Interceptor,
  ENDPOINT_TYPE,
  PRIORITY,
};
