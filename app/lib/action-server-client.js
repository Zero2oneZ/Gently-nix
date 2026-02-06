// GentlyOS Action Server - Quick Action Routing and Dispatch
// Central hub for routing actions between components

const { EventEmitter } = require('events');
const crypto = require('crypto');

// Action priority levels
const PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BACKGROUND: 4,
};

// Action states
const ACTION_STATE = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Generate ID
function generateId(prefix = 'action') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Action definition
class Action {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.type = data.type;                    // Action type (e.g., 'app:launch', 'mcp:call')
    this.payload = data.payload || {};        // Action data
    this.source = data.source || 'unknown';   // Origin (menu, keyboard, mcp, etc.)
    this.target = data.target || null;        // Specific handler
    this.priority = data.priority ?? PRIORITY.NORMAL;
    this.state = ACTION_STATE.PENDING;
    this.result = null;
    this.error = null;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.timeout = data.timeout || 30000;
    this.retries = data.retries || 0;
    this.maxRetries = data.maxRetries || 3;
    this.metadata = data.metadata || {};
  }

  start() {
    this.state = ACTION_STATE.RUNNING;
    this.startedAt = Date.now();
    return this;
  }

  complete(result) {
    this.state = ACTION_STATE.COMPLETED;
    this.result = result;
    this.completedAt = Date.now();
    return this;
  }

  fail(error) {
    this.state = ACTION_STATE.FAILED;
    this.error = error;
    this.completedAt = Date.now();
    return this;
  }

  cancel() {
    this.state = ACTION_STATE.CANCELLED;
    this.completedAt = Date.now();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      source: this.source,
      target: this.target,
      priority: this.priority,
      state: this.state,
      result: this.result,
      error: this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.completedAt ? this.completedAt - this.startedAt : null,
    };
  }
}

// Action handler registration
class ActionHandler {
  constructor(data = {}) {
    this.id = data.id || generateId('handler');
    this.pattern = data.pattern;              // Action type pattern (supports wildcards)
    this.handler = data.handler;              // Function or IPC channel
    this.priority = data.priority ?? 0;       // Handler priority (lower = first)
    this.enabled = data.enabled !== false;
    this.async = data.async !== false;
    this.description = data.description || '';
  }

  matches(actionType) {
    if (this.pattern === '*') return true;
    if (this.pattern === actionType) return true;

    // Wildcard matching (e.g., 'app:*' matches 'app:launch')
    if (this.pattern.endsWith('*')) {
      const prefix = this.pattern.slice(0, -1);
      return actionType.startsWith(prefix);
    }

    return false;
  }

  toJSON() {
    return {
      id: this.id,
      pattern: this.pattern,
      priority: this.priority,
      enabled: this.enabled,
      async: this.async,
      description: this.description,
    };
  }
}

// Action queue with priority
class ActionQueue {
  constructor() {
    this.queues = {
      [PRIORITY.CRITICAL]: [],
      [PRIORITY.HIGH]: [],
      [PRIORITY.NORMAL]: [],
      [PRIORITY.LOW]: [],
      [PRIORITY.BACKGROUND]: [],
    };
    this.processing = false;
  }

  enqueue(action) {
    this.queues[action.priority].push(action);
  }

  dequeue() {
    for (const priority of Object.keys(this.queues).sort((a, b) => a - b)) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }

  peek() {
    for (const priority of Object.keys(this.queues).sort((a, b) => a - b)) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority][0];
      }
    }
    return null;
  }

  size() {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  clear() {
    for (const key of Object.keys(this.queues)) {
      this.queues[key] = [];
    }
  }
}

// Route definition for MCP/agentic control
class Route {
  constructor(data = {}) {
    this.id = data.id || generateId('route');
    this.path = data.path;                    // Route path (e.g., '/mcp/tools')
    this.method = data.method || 'POST';
    this.handler = data.handler;              // Handler function or action type
    this.middleware = data.middleware || [];  // Pre-processing middleware
    this.auth = data.auth || false;           // Requires authentication
    this.rateLimit = data.rateLimit || null;
    this.description = data.description || '';
  }

  toJSON() {
    return {
      id: this.id,
      path: this.path,
      method: this.method,
      auth: this.auth,
      rateLimit: this.rateLimit,
      description: this.description,
    };
  }
}

// Main Action Server
class ActionServerClient extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
    this.routes = new Map();
    this.queue = new ActionQueue();
    this.history = [];
    this.maxHistory = 500;
    this.running = false;
    this.processInterval = null;
    this.stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    // Built-in handlers
    this._registerBuiltinHandlers();
  }

  // Register built-in action handlers
  _registerBuiltinHandlers() {
    // Menu actions
    this.registerHandler({
      pattern: 'menu:*',
      description: 'Menu navigation actions',
      handler: (action) => {
        this.emit('menu-action', action);
        return { handled: true, by: 'menu' };
      },
    });

    // App launch actions
    this.registerHandler({
      pattern: 'app:*',
      description: 'Application launch actions',
      handler: (action) => {
        const app = action.type.split(':')[1];
        this.emit('app-launch', { app, action });
        return { handled: true, app };
      },
    });

    // System actions
    this.registerHandler({
      pattern: 'system:*',
      description: 'System control actions',
      handler: (action) => {
        this.emit('system-action', action);
        return { handled: true, by: 'system' };
      },
    });

    // MCP tool calls
    this.registerHandler({
      pattern: 'mcp:*',
      description: 'MCP tool invocations',
      handler: (action) => {
        this.emit('mcp-call', action);
        return { handled: true, by: 'mcp' };
      },
    });

    // Network actions
    this.registerHandler({
      pattern: 'network:*',
      description: 'Network control actions',
      handler: (action) => {
        this.emit('network-action', action);
        return { handled: true, by: 'network' };
      },
    });

    // UI actions
    this.registerHandler({
      pattern: 'ui:*',
      description: 'UI control actions',
      handler: (action) => {
        this.emit('ui-action', action);
        return { handled: true, by: 'ui' };
      },
    });
  }

  // Register action handler
  registerHandler(data) {
    const handler = new ActionHandler(data);
    this.handlers.set(handler.id, handler);
    return { success: true, handler: handler.toJSON() };
  }

  // Unregister handler
  unregisterHandler(handlerId) {
    if (!this.handlers.has(handlerId)) {
      return { success: false, error: 'Handler not found' };
    }
    this.handlers.delete(handlerId);
    return { success: true };
  }

  // List handlers
  listHandlers() {
    return {
      success: true,
      handlers: Array.from(this.handlers.values()).map(h => h.toJSON()),
    };
  }

  // Register route
  registerRoute(data) {
    const route = new Route(data);
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);
    return { success: true, route: route.toJSON() };
  }

  // Unregister route
  unregisterRoute(method, path) {
    const key = `${method}:${path}`;
    if (!this.routes.has(key)) {
      return { success: false, error: 'Route not found' };
    }
    this.routes.delete(key);
    return { success: true };
  }

  // List routes
  listRoutes() {
    return {
      success: true,
      routes: Array.from(this.routes.values()).map(r => r.toJSON()),
    };
  }

  // Dispatch action
  dispatch(actionData) {
    const action = new Action(actionData);
    this.queue.enqueue(action);
    this.stats.dispatched++;

    this.emit('dispatched', { action: action.toJSON() });

    // Process immediately if not running background processor
    if (!this.running) {
      return this._processAction(action);
    }

    return { success: true, action: action.toJSON(), queued: true };
  }

  // Dispatch and wait for result
  async dispatchAsync(actionData) {
    const action = new Action(actionData);
    action.start();

    const result = await this._processAction(action);
    return result;
  }

  // Process single action
  async _processAction(action) {
    action.start();

    // Find matching handlers
    const matchingHandlers = Array.from(this.handlers.values())
      .filter(h => h.enabled && h.matches(action.type))
      .sort((a, b) => a.priority - b.priority);

    if (matchingHandlers.length === 0) {
      action.fail('No handler found for action type: ' + action.type);
      this.stats.failed++;
      this._addToHistory(action);
      return { success: false, error: action.error, action: action.toJSON() };
    }

    // Execute handlers
    let result = null;
    for (const handler of matchingHandlers) {
      try {
        if (handler.async) {
          result = await Promise.resolve(handler.handler(action));
        } else {
          result = handler.handler(action);
        }
        if (result?.handled) break;
      } catch (err) {
        action.fail(err.message);
        this.stats.failed++;
        this._addToHistory(action);
        this.emit('error', { action: action.toJSON(), error: err.message });
        return { success: false, error: err.message, action: action.toJSON() };
      }
    }

    action.complete(result);
    this.stats.completed++;
    this._addToHistory(action);
    this.emit('completed', { action: action.toJSON() });

    return { success: true, result, action: action.toJSON() };
  }

  // Add to history
  _addToHistory(action) {
    this.history.unshift(action.toJSON());
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  // Start background processor
  start(intervalMs = 10) {
    if (this.running) return { success: false, error: 'Already running' };

    this.running = true;
    this.processInterval = setInterval(async () => {
      const action = this.queue.dequeue();
      if (action) {
        await this._processAction(action);
      }
    }, intervalMs);

    this.emit('started');
    return { success: true };
  }

  // Stop background processor
  stop() {
    if (!this.running) return { success: false, error: 'Not running' };

    clearInterval(this.processInterval);
    this.processInterval = null;
    this.running = false;

    this.emit('stopped');
    return { success: true };
  }

  // Route HTTP-like request (for MCP/agentic)
  async route(method, path, body = {}) {
    const key = `${method}:${path}`;
    const route = this.routes.get(key);

    if (!route) {
      // Try wildcard routes
      for (const [k, r] of this.routes) {
        if (k.endsWith('*') && `${method}:${path}`.startsWith(k.slice(0, -1))) {
          return this._executeRoute(r, body);
        }
      }
      return { success: false, error: 'Route not found', status: 404 };
    }

    return this._executeRoute(route, body);
  }

  // Execute route
  async _executeRoute(route, body) {
    // Run middleware
    for (const mw of route.middleware) {
      try {
        body = await mw(body);
      } catch (err) {
        return { success: false, error: err.message, status: 500 };
      }
    }

    // Execute handler
    if (typeof route.handler === 'string') {
      // Handler is an action type
      return this.dispatchAsync({
        type: route.handler,
        payload: body,
        source: 'route',
      });
    } else if (typeof route.handler === 'function') {
      try {
        const result = await route.handler(body);
        return { success: true, result, status: 200 };
      } catch (err) {
        return { success: false, error: err.message, status: 500 };
      }
    }

    return { success: false, error: 'Invalid handler', status: 500 };
  }

  // Get queue status
  getQueueStatus() {
    return {
      success: true,
      size: this.queue.size(),
      processing: this.running,
      next: this.queue.peek()?.toJSON() || null,
    };
  }

  // Get history
  getHistory(limit = 50, filter = {}) {
    let history = this.history;

    if (filter.type) {
      history = history.filter(a => a.type.startsWith(filter.type));
    }
    if (filter.state) {
      history = history.filter(a => a.state === filter.state);
    }
    if (filter.source) {
      history = history.filter(a => a.source === filter.source);
    }

    return {
      success: true,
      history: history.slice(0, limit),
      total: history.length,
    };
  }

  // Clear history
  clearHistory() {
    this.history = [];
    return { success: true };
  }

  // Get stats
  getStats() {
    return {
      success: true,
      stats: { ...this.stats },
      queueSize: this.queue.size(),
      handlerCount: this.handlers.size,
      routeCount: this.routes.size,
      running: this.running,
    };
  }

  // Reset stats
  resetStats() {
    this.stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    return { success: true };
  }

  // Cancel pending actions
  cancelPending() {
    let cancelled = 0;
    for (const priority of Object.values(this.queue.queues)) {
      for (const action of priority) {
        action.cancel();
        cancelled++;
        this.stats.cancelled++;
      }
    }
    this.queue.clear();
    return { success: true, cancelled };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      PRIORITY,
      ACTION_STATE,
    };
  }
}

module.exports = {
  ActionServerClient,
  Action,
  ActionHandler,
  ActionQueue,
  Route,
  PRIORITY,
  ACTION_STATE,
};
