// GentlyOS Wireshark Client - Packet Capture and Network Analysis
// MCP-integrated network inspection for agentic control

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Protocol types
const PROTOCOL = {
  TCP: 'tcp',
  UDP: 'udp',
  ICMP: 'icmp',
  HTTP: 'http',
  HTTPS: 'https',
  DNS: 'dns',
  SSH: 'ssh',
  WEBSOCKET: 'websocket',
  MCP: 'mcp',
  UNKNOWN: 'unknown',
};

// Capture states
const CAPTURE_STATE = {
  IDLE: 'idle',
  CAPTURING: 'capturing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

// Generate ID
function generateId(prefix = 'pkt') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// Packet representation
class Packet {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.timestamp = data.timestamp || Date.now();
    this.protocol = data.protocol || PROTOCOL.UNKNOWN;
    this.srcIp = data.srcIp || '';
    this.dstIp = data.dstIp || '';
    this.srcPort = data.srcPort || 0;
    this.dstPort = data.dstPort || 0;
    this.length = data.length || 0;
    this.payload = data.payload || null;
    this.payloadHex = data.payloadHex || '';
    this.flags = data.flags || {};
    this.info = data.info || '';
    this.iface = data.iface || '';
    this.direction = data.direction || 'unknown'; // inbound/outbound
    this.tags = data.tags || [];
    this.decoded = data.decoded || null;
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      protocol: this.protocol,
      srcIp: this.srcIp,
      dstIp: this.dstIp,
      srcPort: this.srcPort,
      dstPort: this.dstPort,
      length: this.length,
      flags: this.flags,
      info: this.info,
      iface: this.iface,
      direction: this.direction,
      tags: this.tags,
    };
  }

  toDetailedJSON() {
    return {
      ...this.toJSON(),
      payload: this.payload,
      payloadHex: this.payloadHex,
      decoded: this.decoded,
    };
  }
}

// Capture filter
class CaptureFilter {
  constructor(data = {}) {
    this.id = data.id || generateId('filter');
    this.name = data.name || 'Untitled';
    this.expression = data.expression || '';  // BPF syntax
    this.protocol = data.protocol || null;
    this.srcIp = data.srcIp || null;
    this.dstIp = data.dstIp || null;
    this.srcPort = data.srcPort || null;
    this.dstPort = data.dstPort || null;
    this.minLength = data.minLength || null;
    this.maxLength = data.maxLength || null;
    this.containsText = data.containsText || null;
    this.enabled = data.enabled !== false;
  }

  // Build BPF expression
  toBPF() {
    if (this.expression) return this.expression;

    const parts = [];

    if (this.protocol) parts.push(this.protocol);
    if (this.srcIp) parts.push(`src host ${this.srcIp}`);
    if (this.dstIp) parts.push(`dst host ${this.dstIp}`);
    if (this.srcPort) parts.push(`src port ${this.srcPort}`);
    if (this.dstPort) parts.push(`dst port ${this.dstPort}`);

    return parts.join(' and ') || '';
  }

  // Check if packet matches filter
  matches(packet) {
    if (!this.enabled) return true;

    if (this.protocol && packet.protocol !== this.protocol) return false;
    if (this.srcIp && packet.srcIp !== this.srcIp) return false;
    if (this.dstIp && packet.dstIp !== this.dstIp) return false;
    if (this.srcPort && packet.srcPort !== this.srcPort) return false;
    if (this.dstPort && packet.dstPort !== this.dstPort) return false;
    if (this.minLength && packet.length < this.minLength) return false;
    if (this.maxLength && packet.length > this.maxLength) return false;
    if (this.containsText && packet.payload && !packet.payload.includes(this.containsText)) {
      return false;
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      expression: this.expression,
      protocol: this.protocol,
      srcIp: this.srcIp,
      dstIp: this.dstIp,
      srcPort: this.srcPort,
      dstPort: this.dstPort,
      minLength: this.minLength,
      maxLength: this.maxLength,
      enabled: this.enabled,
      bpf: this.toBPF(),
    };
  }
}

// Capture session
class CaptureSession {
  constructor(data = {}) {
    this.id = data.id || generateId('capture');
    this.name = data.name || `Capture ${new Date().toISOString().slice(0, 19)}`;
    this.interface = data.interface || 'any';
    this.filter = data.filter ? new CaptureFilter(data.filter) : null;
    this.snaplen = data.snaplen || 65535;
    this.promiscuous = data.promiscuous !== false;
    this.state = CAPTURE_STATE.IDLE;
    this.packets = [];
    this.maxPackets = data.maxPackets || 10000;
    this.startedAt = null;
    this.stoppedAt = null;
    this.stats = {
      captured: 0,
      filtered: 0,
      dropped: 0,
    };
  }

  addPacket(packet) {
    if (this.filter && !this.filter.matches(packet)) {
      this.stats.filtered++;
      return false;
    }

    this.packets.push(packet);
    this.stats.captured++;

    // Trim old packets if over limit
    if (this.packets.length > this.maxPackets) {
      this.packets.shift();
      this.stats.dropped++;
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      interface: this.interface,
      filter: this.filter?.toJSON() || null,
      state: this.state,
      packetCount: this.packets.length,
      stats: this.stats,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      duration: this.stoppedAt ? this.stoppedAt - this.startedAt :
                this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }
}

// MCP Traffic decoder
class MCPDecoder {
  constructor() {
    this.pendingRequests = new Map();
  }

  // Decode MCP JSON-RPC traffic
  decode(payload) {
    try {
      const data = JSON.parse(payload);

      if (data.method) {
        // Request
        return {
          type: 'request',
          id: data.id,
          method: data.method,
          params: data.params,
        };
      } else if (data.result !== undefined) {
        // Response
        return {
          type: 'response',
          id: data.id,
          result: data.result,
        };
      } else if (data.error) {
        // Error response
        return {
          type: 'error',
          id: data.id,
          error: data.error,
        };
      }

      return { type: 'unknown', data };
    } catch {
      return null;
    }
  }
}

// Main Wireshark Client
class WiresharkClient extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.activeSession = null;
    this.filters = new Map();
    this.interfaces = [];
    this.captureProcess = null;
    this.mcpDecoder = new MCPDecoder();
    this.state = CAPTURE_STATE.IDLE;

    // Discover interfaces
    this._discoverInterfaces();

    // Built-in filters
    this._initBuiltinFilters();
  }

  // Initialize built-in filters
  _initBuiltinFilters() {
    const builtins = [
      { name: 'HTTP Traffic', protocol: 'tcp', dstPort: 80 },
      { name: 'HTTPS Traffic', protocol: 'tcp', dstPort: 443 },
      { name: 'DNS Queries', protocol: 'udp', dstPort: 53 },
      { name: 'SSH Traffic', protocol: 'tcp', dstPort: 22 },
      { name: 'MCP Bridge', protocol: 'tcp', dstPort: 7335 },
    ];

    for (const f of builtins) {
      const filter = new CaptureFilter(f);
      this.filters.set(filter.id, filter);
    }
  }

  // Discover network interfaces
  _discoverInterfaces() {
    try {
      const { execSync } = require('child_process');
      const output = execSync('ip link show 2>/dev/null || ifconfig -l 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000,
      });

      // Parse Linux ip link output
      const matches = output.matchAll(/^\d+:\s+(\w+):/gm);
      this.interfaces = Array.from(matches, m => m[1]);

      if (this.interfaces.length === 0) {
        this.interfaces = ['lo', 'eth0', 'wlan0', 'any'];
      }
    } catch {
      this.interfaces = ['lo', 'eth0', 'wlan0', 'any'];
    }
  }

  // Get available interfaces
  getInterfaces() {
    this._discoverInterfaces();
    return {
      success: true,
      interfaces: this.interfaces,
    };
  }

  // Create capture session
  createSession(data = {}) {
    const session = new CaptureSession(data);
    this.sessions.set(session.id, session);
    return { success: true, session: session.toJSON() };
  }

  // Get session
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    return { success: true, session: session.toJSON() };
  }

  // List sessions
  listSessions() {
    return {
      success: true,
      sessions: Array.from(this.sessions.values()).map(s => s.toJSON()),
    };
  }

  // Delete session
  deleteSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return { success: false, error: 'Session not found' };
    }
    const session = this.sessions.get(sessionId);
    if (session.state === CAPTURE_STATE.CAPTURING) {
      this.stopCapture(sessionId);
    }
    this.sessions.delete(sessionId);
    return { success: true };
  }

  // Start capture
  startCapture(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (session.state === CAPTURE_STATE.CAPTURING) {
      return { success: false, error: 'Already capturing' };
    }

    session.state = CAPTURE_STATE.CAPTURING;
    session.startedAt = Date.now();
    this.activeSession = session;
    this.state = CAPTURE_STATE.CAPTURING;

    // Build tcpdump command
    const args = [
      '-i', session.interface,
      '-s', String(session.snaplen),
      '-l',  // Line buffered
      '-n',  // Don't resolve hostnames
      '-tt', // Unix timestamp
    ];

    if (session.promiscuous) {
      args.push('-p');
    }

    if (session.filter) {
      const bpf = session.filter.toBPF();
      if (bpf) args.push(bpf);
    }

    try {
      this.captureProcess = spawn('tcpdump', args);

      this.captureProcess.stdout.on('data', (data) => {
        this._parsePacket(data.toString(), session);
      });

      this.captureProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('listening on')) {
          this.emit('error', { error: msg });
        }
      });

      this.captureProcess.on('close', (code) => {
        session.state = CAPTURE_STATE.STOPPED;
        session.stoppedAt = Date.now();
        this.state = CAPTURE_STATE.STOPPED;
        this.emit('capture-stopped', { session: session.toJSON(), code });
      });

      this.emit('capture-started', { session: session.toJSON() });
      return { success: true, session: session.toJSON() };
    } catch (err) {
      session.state = CAPTURE_STATE.IDLE;
      return { success: false, error: err.message };
    }
  }

  // Stop capture
  stopCapture(sessionId = null) {
    const session = sessionId ? this.sessions.get(sessionId) : this.activeSession;
    if (!session) return { success: false, error: 'No active session' };

    if (this.captureProcess) {
      this.captureProcess.kill('SIGINT');
      this.captureProcess = null;
    }

    session.state = CAPTURE_STATE.STOPPED;
    session.stoppedAt = Date.now();
    this.state = CAPTURE_STATE.STOPPED;
    this.activeSession = null;

    return { success: true, session: session.toJSON() };
  }

  // Pause capture
  pauseCapture() {
    if (this.state !== CAPTURE_STATE.CAPTURING) {
      return { success: false, error: 'Not capturing' };
    }

    if (this.captureProcess) {
      this.captureProcess.kill('SIGSTOP');
    }
    this.state = CAPTURE_STATE.PAUSED;
    if (this.activeSession) {
      this.activeSession.state = CAPTURE_STATE.PAUSED;
    }

    return { success: true };
  }

  // Resume capture
  resumeCapture() {
    if (this.state !== CAPTURE_STATE.PAUSED) {
      return { success: false, error: 'Not paused' };
    }

    if (this.captureProcess) {
      this.captureProcess.kill('SIGCONT');
    }
    this.state = CAPTURE_STATE.CAPTURING;
    if (this.activeSession) {
      this.activeSession.state = CAPTURE_STATE.CAPTURING;
    }

    return { success: true };
  }

  // Parse tcpdump output
  _parsePacket(line, session) {
    // Basic tcpdump output parsing
    // Format: timestamp IP src.port > dst.port: flags, length
    const match = line.match(
      /^(\d+\.\d+)\s+IP\s+(\S+)\.(\d+)\s+>\s+(\S+)\.(\d+):\s+(\S+).*length\s+(\d+)/
    );

    if (match) {
      const packet = new Packet({
        timestamp: parseFloat(match[1]) * 1000,
        srcIp: match[2],
        srcPort: parseInt(match[3]),
        dstIp: match[4],
        dstPort: parseInt(match[5]),
        flags: { raw: match[6] },
        length: parseInt(match[7]),
        protocol: this._guessProtocol(parseInt(match[3]), parseInt(match[5])),
        info: line.trim(),
        iface: session.interface,
      });

      // Decode MCP traffic
      if (packet.dstPort === 7335 || packet.srcPort === 7335) {
        packet.protocol = PROTOCOL.MCP;
        packet.tags.push('mcp');
      }

      if (session.addPacket(packet)) {
        this.emit('packet', { packet: packet.toJSON(), sessionId: session.id });
      }
    }
  }

  // Guess protocol from ports
  _guessProtocol(srcPort, dstPort) {
    const port = Math.min(srcPort, dstPort);
    switch (port) {
      case 80: return PROTOCOL.HTTP;
      case 443: return PROTOCOL.HTTPS;
      case 53: return PROTOCOL.DNS;
      case 22: return PROTOCOL.SSH;
      case 7335: return PROTOCOL.MCP;
      default: return PROTOCOL.TCP;
    }
  }

  // Get packets from session
  getPackets(sessionId, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    let packets = session.packets;

    // Apply display filter
    if (options.filter) {
      const filter = new CaptureFilter(options.filter);
      packets = packets.filter(p => filter.matches(p));
    }

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    packets = packets.slice(offset, offset + limit);

    return {
      success: true,
      packets: packets.map(p => p.toJSON()),
      total: session.packets.length,
      offset,
      limit,
    };
  }

  // Get single packet with full details
  getPacket(sessionId, packetId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    const packet = session.packets.find(p => p.id === packetId);
    if (!packet) return { success: false, error: 'Packet not found' };

    return { success: true, packet: packet.toDetailedJSON() };
  }

  // Clear packets from session
  clearPackets(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.packets = [];
    session.stats.captured = 0;
    session.stats.filtered = 0;

    return { success: true };
  }

  // Create filter
  createFilter(data) {
    const filter = new CaptureFilter(data);
    this.filters.set(filter.id, filter);
    return { success: true, filter: filter.toJSON() };
  }

  // Get filter
  getFilter(filterId) {
    const filter = this.filters.get(filterId);
    if (!filter) return { success: false, error: 'Filter not found' };
    return { success: true, filter: filter.toJSON() };
  }

  // List filters
  listFilters() {
    return {
      success: true,
      filters: Array.from(this.filters.values()).map(f => f.toJSON()),
    };
  }

  // Delete filter
  deleteFilter(filterId) {
    if (!this.filters.has(filterId)) {
      return { success: false, error: 'Filter not found' };
    }
    this.filters.delete(filterId);
    return { success: true };
  }

  // Export packets to PCAP-like format
  exportPackets(sessionId, format = 'json') {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (format === 'json') {
      return {
        success: true,
        data: {
          session: session.toJSON(),
          packets: session.packets.map(p => p.toDetailedJSON()),
        },
      };
    }

    // CSV format
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'protocol', 'srcIp', 'srcPort', 'dstIp', 'dstPort', 'length', 'info'];
      const rows = session.packets.map(p =>
        headers.map(h => p[h] ?? '').join(',')
      );
      return {
        success: true,
        data: [headers.join(','), ...rows].join('\n'),
      };
    }

    return { success: false, error: 'Unknown format' };
  }

  // Get capture state
  getState() {
    return {
      success: true,
      state: this.state,
      activeSession: this.activeSession?.toJSON() || null,
      isCapturing: this.state === CAPTURE_STATE.CAPTURING,
    };
  }

  // Get statistics
  getStats() {
    let totalPackets = 0;
    let totalSessions = this.sessions.size;

    for (const session of this.sessions.values()) {
      totalPackets += session.packets.length;
    }

    return {
      success: true,
      stats: {
        totalSessions,
        totalPackets,
        activeSession: this.activeSession?.id || null,
        state: this.state,
        interfaces: this.interfaces.length,
        filters: this.filters.size,
      },
    };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      PROTOCOL,
      CAPTURE_STATE,
    };
  }
}

module.exports = {
  WiresharkClient,
  CaptureSession,
  CaptureFilter,
  Packet,
  MCPDecoder,
  PROTOCOL,
  CAPTURE_STATE,
};
