// GentlyOS Bridge Client - HTTP client for Bridge API on port 7335
// Handles JSON-RPC communication with GentlyOS Rust backend

const http = require('http');

const BRIDGE_PORT = 7335;
const BRIDGE_HOST = 'localhost';
const REQUEST_TIMEOUT = 5000;

// Make a JSON-RPC request to the Bridge
async function bridgeRPC(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });

    const req = http.request({
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: REQUEST_TIMEOUT,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message || 'Bridge RPC error'));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Bridge'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Bridge connection failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Bridge request timeout'));
    });

    req.write(data);
    req.end();
  });
}

// Check if Bridge is online
async function checkBridgeStatus() {
  try {
    const res = await bridgeRPC('bridge.status');
    return {
      online: true,
      version: res.result?.version || 'unknown',
      uptime: res.result?.uptime || 0,
      services: res.result?.services || [],
    };
  } catch (err) {
    return {
      online: false,
      error: err.message,
    };
  }
}

// Bridge API methods mapped to specific endpoints
const BridgeAPI = {
  // Core status
  status: () => bridgeRPC('bridge.status'),
  health: () => bridgeRPC('bridge.health'),

  // Feed operations
  feedList: (limit = 50) => bridgeRPC('feed.list', { limit }),
  feedGet: (id) => bridgeRPC('feed.get', { id }),
  feedFork: (id) => bridgeRPC('feed.fork', { id }),
  feedPost: (content, metadata) => bridgeRPC('feed.post', { content, metadata }),

  // Search operations
  search: (query, options = {}) => bridgeRPC('search.query', { query, ...options }),
  searchIndex: (docId) => bridgeRPC('search.index', { doc_id: docId }),

  // G.E.D. operations
  gedTranslate: (text, mode) => bridgeRPC('ged.translate', { text, mode }),
  gedAnalyze: (text) => bridgeRPC('ged.analyze', { text }),

  // Doc operations
  docNew: (name, docType) => bridgeRPC('doc.new', { name, doc_type: docType }),
  docStep: (docId, content) => bridgeRPC('doc.step', { doc_id: docId, content }),
  docList: () => bridgeRPC('doc.list'),

  // MCP operations
  mcpTools: () => bridgeRPC('mcp.tools'),
  mcpInvoke: (tool, args) => bridgeRPC('mcp.invoke', { tool, args }),

  // GOO field operations
  gooSample: (count = 10) => bridgeRPC('goo.sample', { count }),
  gooField: (center, radius) => bridgeRPC('goo.field', { center, radius }),
};

module.exports = {
  bridgeRPC,
  checkBridgeStatus,
  BridgeAPI,
  BRIDGE_PORT,
  BRIDGE_HOST,
};
