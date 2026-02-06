// GentlyOS Network Client - Security Visualization System
// Firewall rules, connection monitoring, packet capture, MITM proxy

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'net') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Network directions
const DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  BOTH: 'both',
};

// Firewall action types
const FIREWALL_ACTION = {
  ALLOW: 'allow',
  DENY: 'deny',
  LOG: 'log',
  REJECT: 'reject',
};

// Protocol types
const PROTOCOL = {
  TCP: 'tcp',
  UDP: 'udp',
  ICMP: 'icmp',
  ANY: 'any',
};

// Event types
const EVENT_TYPE = {
  CONNECTION_ATTEMPT: 'connection_attempt',
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_CLOSED: 'connection_closed',
  PACKET_SENT: 'packet_sent',
  PACKET_RECEIVED: 'packet_received',
  RULE_TRIGGERED: 'rule_triggered',
  BLOCKED: 'blocked',
  ALLOWED: 'allowed',
  ERROR: 'error',
};

// Firewall Rule
class FirewallRule {
  constructor(name, action = FIREWALL_ACTION.DENY) {
    this.id = generateId('rule');
    this.name = name;
    this.action = action;
    this.enabled = true;
    this.priority = 100;       // Lower = higher priority
    this.direction = DIRECTION.BOTH;
    this.protocol = PROTOCOL.ANY;
    this.sourceIP = null;      // null = any
    this.sourcePort = null;
    this.destIP = null;
    this.destPort = null;
    this.createdAt = Date.now();
    this.hitCount = 0;
    this.lastHit = null;
  }

  // Check if rule matches a connection
  matches(connection) {
    // Direction check
    if (this.direction !== DIRECTION.BOTH && this.direction !== connection.direction) {
      return false;
    }

    // Protocol check
    if (this.protocol !== PROTOCOL.ANY && this.protocol !== connection.protocol) {
      return false;
    }

    // Source IP check
    if (this.sourceIP && this.sourceIP !== connection.sourceIP) {
      // Check for CIDR matching (simplified)
      if (!this.ipMatches(connection.sourceIP, this.sourceIP)) {
        return false;
      }
    }

    // Source port check
    if (this.sourcePort && this.sourcePort !== connection.sourcePort) {
      return false;
    }

    // Dest IP check
    if (this.destIP && this.destIP !== connection.destIP) {
      if (!this.ipMatches(connection.destIP, this.destIP)) {
        return false;
      }
    }

    // Dest port check
    if (this.destPort && this.destPort !== connection.destPort) {
      return false;
    }

    return true;
  }

  // Simple IP matching (exact or wildcard)
  ipMatches(ip, pattern) {
    if (pattern === '*' || pattern === '0.0.0.0/0') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return ip.startsWith(prefix);
    }
    return ip === pattern;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      action: this.action,
      enabled: this.enabled,
      priority: this.priority,
      direction: this.direction,
      protocol: this.protocol,
      sourceIP: this.sourceIP,
      sourcePort: this.sourcePort,
      destIP: this.destIP,
      destPort: this.destPort,
      createdAt: this.createdAt,
      hitCount: this.hitCount,
      lastHit: this.lastHit,
    };
  }

  static fromJSON(json) {
    const rule = new FirewallRule(json.name, json.action);
    Object.assign(rule, json);
    return rule;
  }
}

// Network Event
class NetworkEvent {
  constructor(type, data = {}) {
    this.id = generateId('evt');
    this.type = type;
    this.timestamp = Date.now();
    this.sourceIP = data.sourceIP || null;
    this.sourcePort = data.sourcePort || null;
    this.destIP = data.destIP || null;
    this.destPort = data.destPort || null;
    this.protocol = data.protocol || PROTOCOL.TCP;
    this.direction = data.direction || DIRECTION.INBOUND;
    this.ruleId = data.ruleId || null;
    this.action = data.action || null;
    this.bytes = data.bytes || 0;
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      sourceIP: this.sourceIP,
      sourcePort: this.sourcePort,
      destIP: this.destIP,
      destPort: this.destPort,
      protocol: this.protocol,
      direction: this.direction,
      ruleId: this.ruleId,
      action: this.action,
      bytes: this.bytes,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const event = new NetworkEvent(json.type);
    Object.assign(event, json);
    return event;
  }
}

// Packet Capture Session
class CaptureSession {
  constructor(filter = {}) {
    this.id = generateId('cap');
    this.filter = filter;      // Filter criteria
    this.startTime = Date.now();
    this.endTime = null;
    this.active = true;
    this.packets = [];
    this.packetCount = 0;
    this.byteCount = 0;
  }

  // Add packet to capture
  addPacket(packet) {
    if (!this.active) return false;

    // Apply filter
    if (this.filter.protocol && this.filter.protocol !== packet.protocol) return false;
    if (this.filter.sourceIP && this.filter.sourceIP !== packet.sourceIP) return false;
    if (this.filter.destIP && this.filter.destIP !== packet.destIP) return false;
    if (this.filter.port && packet.destPort !== this.filter.port && packet.sourcePort !== this.filter.port) return false;

    this.packets.push(packet);
    this.packetCount++;
    this.byteCount += packet.bytes || 0;

    // Limit packet storage
    if (this.packets.length > 10000) {
      this.packets.shift();
    }

    return true;
  }

  // Stop capture
  stop() {
    this.active = false;
    this.endTime = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      filter: this.filter,
      startTime: this.startTime,
      endTime: this.endTime,
      active: this.active,
      packetCount: this.packetCount,
      byteCount: this.byteCount,
      duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
    };
  }
}

// Network Node (for topology visualization)
class NetworkNode {
  constructor(ip, type = 'host') {
    this.id = generateId('node');
    this.ip = ip;
    this.type = type;          // 'host', 'router', 'server', 'external', 'self'
    this.hostname = null;
    this.ports = [];           // Open ports
    this.connections = [];     // Connected node IDs
    this.firstSeen = Date.now();
    this.lastSeen = Date.now();
    this.metadata = {};
  }

  toJSON() {
    return {
      id: this.id,
      ip: this.ip,
      type: this.type,
      hostname: this.hostname,
      ports: this.ports,
      connections: this.connections,
      firstSeen: this.firstSeen,
      lastSeen: this.lastSeen,
      metadata: this.metadata,
    };
  }
}

// Proxy Config
class ProxyConfig {
  constructor() {
    this.enabled = false;
    this.host = '127.0.0.1';
    this.port = 8080;
    this.interceptHTTPS = false;
    this.filterPatterns = [];  // URL patterns to intercept
    this.excludePatterns = []; // URL patterns to exclude
  }

  toJSON() {
    return {
      enabled: this.enabled,
      host: this.host,
      port: this.port,
      interceptHTTPS: this.interceptHTTPS,
      filterPatterns: this.filterPatterns,
      excludePatterns: this.excludePatterns,
    };
  }
}

// Main Network Client
class NetworkClient {
  constructor() {
    // Firewall
    this.firewallEnabled = true;
    this.defaultAction = FIREWALL_ACTION.DENY;
    this.rules = [];
    this.blockedIPs = new Set();
    this.allowedIPs = new Set();

    // Monitor
    this.events = [];
    this.maxEvents = 10000;

    // Capture
    this.captures = new Map();

    // Topology
    this.nodes = new Map();

    // Proxy
    this.proxyConfig = new ProxyConfig();
    this.proxyHistory = [];
  }

  // === FIREWALL OPERATIONS ===

  // Check if connection should be allowed
  checkConnection(sourceIP, destIP, destPort, protocol = PROTOCOL.TCP, direction = DIRECTION.OUTBOUND) {
    const connection = { sourceIP, destIP, destPort, protocol, direction };

    // Check blocked IPs
    if (this.blockedIPs.has(sourceIP) || this.blockedIPs.has(destIP)) {
      this.logEvent(EVENT_TYPE.BLOCKED, { ...connection, action: FIREWALL_ACTION.DENY, reason: 'IP blocked' });
      return { allowed: false, reason: 'IP blocked', action: FIREWALL_ACTION.DENY };
    }

    // Check allowed IPs (bypass rules)
    if (this.allowedIPs.has(sourceIP) || this.allowedIPs.has(destIP)) {
      this.logEvent(EVENT_TYPE.ALLOWED, { ...connection, action: FIREWALL_ACTION.ALLOW, reason: 'IP allowed' });
      return { allowed: true, reason: 'IP allowed', action: FIREWALL_ACTION.ALLOW };
    }

    // Check rules (sorted by priority)
    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (rule.matches(connection)) {
        rule.hitCount++;
        rule.lastHit = Date.now();

        const eventType = rule.action === FIREWALL_ACTION.ALLOW ? EVENT_TYPE.ALLOWED : EVENT_TYPE.BLOCKED;
        this.logEvent(eventType, { ...connection, ruleId: rule.id, action: rule.action });

        return {
          allowed: rule.action === FIREWALL_ACTION.ALLOW,
          reason: `Rule: ${rule.name}`,
          ruleId: rule.id,
          action: rule.action,
        };
      }
    }

    // Default action
    const defaultAllowed = this.defaultAction === FIREWALL_ACTION.ALLOW;
    const eventType = defaultAllowed ? EVENT_TYPE.ALLOWED : EVENT_TYPE.BLOCKED;
    this.logEvent(eventType, { ...connection, action: this.defaultAction, reason: 'Default policy' });

    return {
      allowed: defaultAllowed,
      reason: 'Default policy',
      action: this.defaultAction,
    };
  }

  // Add firewall rule
  addRule(ruleData) {
    const rule = new FirewallRule(ruleData.name, ruleData.action);
    Object.assign(rule, ruleData);
    rule.id = generateId('rule');
    this.rules.push(rule);
    return { success: true, rule: rule.toJSON() };
  }

  // Remove firewall rule
  removeRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return { success: false, error: 'Rule not found' };
    }
    this.rules.splice(index, 1);
    return { success: true };
  }

  // Update firewall rule
  updateRule(ruleId, updates) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      return { success: false, error: 'Rule not found' };
    }
    Object.assign(rule, updates);
    return { success: true, rule: rule.toJSON() };
  }

  // List all rules
  listRules() {
    return {
      success: true,
      rules: this.rules.map(r => r.toJSON()),
      total: this.rules.length,
    };
  }

  // Block IP
  blockIP(ip) {
    this.blockedIPs.add(ip);
    this.allowedIPs.delete(ip);
    return { success: true, ip, action: 'blocked' };
  }

  // Allow IP
  allowIP(ip) {
    this.allowedIPs.add(ip);
    this.blockedIPs.delete(ip);
    return { success: true, ip, action: 'allowed' };
  }

  // Get firewall status
  getFirewallStatus() {
    return {
      success: true,
      status: {
        enabled: this.firewallEnabled,
        defaultAction: this.defaultAction,
        ruleCount: this.rules.length,
        blockedIPs: Array.from(this.blockedIPs),
        allowedIPs: Array.from(this.allowedIPs),
      },
    };
  }

  // Set firewall enabled
  setFirewallEnabled(enabled) {
    this.firewallEnabled = enabled;
    return { success: true, enabled };
  }

  // === MONITOR OPERATIONS ===

  // Log network event
  logEvent(type, data = {}) {
    const event = new NetworkEvent(type, data);
    this.events.push(event);

    // Trim events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Update topology
    if (data.sourceIP) this.updateTopology(data.sourceIP);
    if (data.destIP) this.updateTopology(data.destIP);

    return event;
  }

  // Get recent events
  getEvents(limit = 100, filter = {}) {
    let filtered = this.events;

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }
    if (filter.ip) {
      filtered = filtered.filter(e => e.sourceIP === filter.ip || e.destIP === filter.ip);
    }
    if (filter.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since);
    }

    return {
      success: true,
      events: filtered.slice(-limit).map(e => e.toJSON()),
      total: filtered.length,
    };
  }

  // Get monitor statistics
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const recentEvents = this.events.filter(e => e.timestamp >= oneMinuteAgo);
    const hourEvents = this.events.filter(e => e.timestamp >= oneHourAgo);

    // Count by type
    const typeCounts = {};
    for (const event of this.events) {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    }

    // Count blocked vs allowed
    const blockedCount = this.events.filter(e => e.type === EVENT_TYPE.BLOCKED).length;
    const allowedCount = this.events.filter(e => e.type === EVENT_TYPE.ALLOWED).length;

    return {
      success: true,
      stats: {
        totalEvents: this.events.length,
        eventsLastMinute: recentEvents.length,
        eventsLastHour: hourEvents.length,
        typeCounts,
        blockedCount,
        allowedCount,
        blockRate: this.events.length > 0 ? (blockedCount / this.events.length * 100).toFixed(1) : 0,
        nodeCount: this.nodes.size,
        activeCaptureCount: Array.from(this.captures.values()).filter(c => c.active).length,
      },
    };
  }

  // === CAPTURE OPERATIONS ===

  // Start packet capture
  startCapture(filter = {}) {
    const session = new CaptureSession(filter);
    this.captures.set(session.id, session);
    return { success: true, session: session.toJSON() };
  }

  // Stop packet capture
  stopCapture(sessionId) {
    const session = this.captures.get(sessionId);
    if (!session) {
      return { success: false, error: 'Capture session not found' };
    }
    session.stop();
    return { success: true, session: session.toJSON() };
  }

  // Get captured packets
  getPackets(sessionId, limit = 100, offset = 0) {
    const session = this.captures.get(sessionId);
    if (!session) {
      return { success: false, error: 'Capture session not found' };
    }

    return {
      success: true,
      packets: session.packets.slice(offset, offset + limit).map(p => p.toJSON ? p.toJSON() : p),
      total: session.packetCount,
      session: session.toJSON(),
    };
  }

  // List capture sessions
  listCaptures() {
    return {
      success: true,
      captures: Array.from(this.captures.values()).map(c => c.toJSON()),
    };
  }

  // === TOPOLOGY OPERATIONS ===

  // Update topology with observed IP
  updateTopology(ip) {
    if (!ip) return;

    let node = this.nodes.get(ip);
    if (!node) {
      node = new NetworkNode(ip);
      // Detect type
      if (ip === '127.0.0.1' || ip === 'localhost') {
        node.type = 'self';
      } else if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        node.type = 'host';
      } else {
        node.type = 'external';
      }
      this.nodes.set(ip, node);
    } else {
      node.lastSeen = Date.now();
    }
  }

  // Get network topology
  getTopology() {
    return {
      success: true,
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      nodeCount: this.nodes.size,
    };
  }

  // Render topology for visualization
  renderTopology() {
    const nodes = [];
    const edges = [];

    for (const node of this.nodes.values()) {
      nodes.push({
        id: node.id,
        ip: node.ip,
        type: node.type,
        label: node.hostname || node.ip,
      });

      // Create edges from connections
      for (const connId of node.connections) {
        edges.push({
          source: node.id,
          target: connId,
        });
      }
    }

    // Add edges from events
    const seenEdges = new Set();
    for (const event of this.events.slice(-1000)) {
      if (event.sourceIP && event.destIP) {
        const sourceNode = this.nodes.get(event.sourceIP);
        const destNode = this.nodes.get(event.destIP);
        if (sourceNode && destNode) {
          const edgeKey = `${sourceNode.id}-${destNode.id}`;
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            edges.push({
              source: sourceNode.id,
              target: destNode.id,
              type: event.type,
            });
          }
        }
      }
    }

    return {
      success: true,
      topology: { nodes, edges },
    };
  }

  // === PROXY OPERATIONS ===

  // Configure proxy
  configureProxy(config) {
    Object.assign(this.proxyConfig, config);
    return { success: true, config: this.proxyConfig.toJSON() };
  }

  // Get proxy config
  getProxyConfig() {
    return { success: true, config: this.proxyConfig.toJSON() };
  }

  // Get proxy history
  getProxyHistory(limit = 100) {
    return {
      success: true,
      history: this.proxyHistory.slice(-limit),
      total: this.proxyHistory.length,
    };
  }

  // === EXPORT/IMPORT ===

  // Export network data
  export() {
    return {
      success: true,
      data: {
        rules: this.rules.map(r => r.toJSON()),
        blockedIPs: Array.from(this.blockedIPs),
        allowedIPs: Array.from(this.allowedIPs),
        defaultAction: this.defaultAction,
        proxyConfig: this.proxyConfig.toJSON(),
      },
    };
  }

  // Import network data
  import(data) {
    try {
      if (data.rules) {
        this.rules = data.rules.map(r => FirewallRule.fromJSON(r));
      }
      if (data.blockedIPs) {
        this.blockedIPs = new Set(data.blockedIPs);
      }
      if (data.allowedIPs) {
        this.allowedIPs = new Set(data.allowedIPs);
      }
      if (data.defaultAction) {
        this.defaultAction = data.defaultAction;
      }
      if (data.proxyConfig) {
        Object.assign(this.proxyConfig, data.proxyConfig);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Clear all data
  reset() {
    this.rules = [];
    this.blockedIPs.clear();
    this.allowedIPs.clear();
    this.events = [];
    this.captures.clear();
    this.nodes.clear();
    this.proxyHistory = [];

    return { success: true, message: 'Network data reset' };
  }
}

module.exports = {
  NetworkClient,
  FirewallRule,
  NetworkEvent,
  CaptureSession,
  NetworkNode,
  ProxyConfig,
  DIRECTION,
  FIREWALL_ACTION,
  PROTOCOL,
  EVENT_TYPE,
};
