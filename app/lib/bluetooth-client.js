// GentlyOS Bluetooth Client - Outward BLE Connections with Custom Messages
// Manages Bluetooth device discovery, pairing, and custom message transmission

const crypto = require('crypto');
const { EventEmitter } = require('events');

// Generate ID
function generateId(prefix = 'bt') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Connection states
const BT_STATE = {
  DISCONNECTED: 'disconnected',
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  PAIRED: 'paired',
  ERROR: 'error',
};

// Message types
const MESSAGE_TYPE = {
  TEXT: 'text',
  COMMAND: 'command',
  DATA: 'data',
  PING: 'ping',
  ACK: 'ack',
  CUSTOM: 'custom',
};

// Standard BLE service UUIDs
const BLE_SERVICES = {
  GENERIC_ACCESS: '1800',
  GENERIC_ATTRIBUTE: '1801',
  DEVICE_INFO: '180a',
  BATTERY: '180f',
  HEART_RATE: '180d',
  CUSTOM_GENTLY: 'f000aa00-0451-4000-b000-000000000000',
};

// Bluetooth device representation
class BTDevice {
  constructor(data = {}) {
    this.id = data.id || generateId('dev');
    this.address = data.address || this.generateMAC();
    this.name = data.name || 'Unknown Device';
    this.rssi = data.rssi || -70;
    this.paired = data.paired || false;
    this.connected = data.connected || false;
    this.services = data.services || [];
    this.lastSeen = Date.now();
    this.metadata = data.metadata || {};
  }

  // Generate random MAC address
  generateMAC() {
    const bytes = [];
    for (let i = 0; i < 6; i++) {
      bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    return bytes.join(':').toUpperCase();
  }

  // Update RSSI
  updateRSSI(rssi) {
    this.rssi = rssi;
    this.lastSeen = Date.now();
  }

  // Get signal quality
  getSignalQuality() {
    if (this.rssi >= -50) return 'excellent';
    if (this.rssi >= -60) return 'good';
    if (this.rssi >= -70) return 'fair';
    if (this.rssi >= -80) return 'weak';
    return 'poor';
  }

  toJSON() {
    return {
      id: this.id,
      address: this.address,
      name: this.name,
      rssi: this.rssi,
      signalQuality: this.getSignalQuality(),
      paired: this.paired,
      connected: this.connected,
      services: this.services,
      lastSeen: this.lastSeen,
      metadata: this.metadata,
    };
  }
}

// Bluetooth message
class BTMessage {
  constructor(type, payload, options = {}) {
    this.id = generateId('msg');
    this.type = type;
    this.payload = payload;
    this.priority = options.priority || 0;
    this.requiresAck = options.requiresAck || false;
    this.encrypted = options.encrypted || false;
    this.timestamp = Date.now();
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.status = 'pending';
  }

  // Encode message for transmission
  encode() {
    const header = Buffer.alloc(8);
    header.writeUInt8(this.type.charCodeAt(0), 0);
    header.writeUInt8(this.priority, 1);
    header.writeUInt8(this.requiresAck ? 1 : 0, 2);
    header.writeUInt8(this.encrypted ? 1 : 0, 3);
    header.writeUInt32LE(this.timestamp % 0xFFFFFFFF, 4);

    const payloadBuffer = Buffer.from(JSON.stringify(this.payload));
    return Buffer.concat([header, payloadBuffer]);
  }

  // Mark as sent
  markSent() {
    this.attempts++;
    this.status = this.requiresAck ? 'awaiting_ack' : 'sent';
  }

  // Mark as acknowledged
  markAcked() {
    this.status = 'acked';
  }

  // Mark as failed
  markFailed(reason) {
    this.status = 'failed';
    this.failReason = reason;
  }

  // Can retry?
  canRetry() {
    return this.attempts < this.maxAttempts;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      priority: this.priority,
      requiresAck: this.requiresAck,
      encrypted: this.encrypted,
      timestamp: this.timestamp,
      attempts: this.attempts,
      status: this.status,
    };
  }
}

// Message queue for reliable transmission
class MessageQueue {
  constructor() {
    this.pending = [];
    this.sent = new Map();
    this.failed = [];
    this.maxPending = 100;
  }

  // Enqueue message
  enqueue(message) {
    if (this.pending.length >= this.maxPending) {
      // Remove lowest priority
      this.pending.sort((a, b) => b.priority - a.priority);
      this.pending.pop();
    }
    this.pending.push(message);
    this.pending.sort((a, b) => b.priority - a.priority);
    return message.id;
  }

  // Get next message
  dequeue() {
    return this.pending.shift();
  }

  // Mark sent
  markSent(messageId) {
    const idx = this.pending.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      const msg = this.pending.splice(idx, 1)[0];
      msg.markSent();
      if (msg.requiresAck) {
        this.sent.set(messageId, msg);
      }
      return msg;
    }
    return null;
  }

  // Handle ACK
  handleAck(messageId) {
    const msg = this.sent.get(messageId);
    if (msg) {
      msg.markAcked();
      this.sent.delete(messageId);
      return true;
    }
    return false;
  }

  // Handle timeout
  handleTimeout(messageId) {
    const msg = this.sent.get(messageId);
    if (msg) {
      if (msg.canRetry()) {
        this.pending.unshift(msg);
        this.sent.delete(messageId);
        return { retry: true };
      } else {
        msg.markFailed('Max retries exceeded');
        this.failed.push(msg);
        this.sent.delete(messageId);
        return { retry: false, failed: true };
      }
    }
    return null;
  }

  // Get stats
  getStats() {
    return {
      pending: this.pending.length,
      awaitingAck: this.sent.size,
      failed: this.failed.length,
    };
  }
}

// Custom message templates
class MessageTemplate {
  constructor(name, type, payloadSchema) {
    this.id = generateId('tpl');
    this.name = name;
    this.type = type;
    this.payloadSchema = payloadSchema;
    this.createdAt = Date.now();
  }

  // Create message from template
  create(values = {}) {
    const payload = {};
    for (const [key, schema] of Object.entries(this.payloadSchema)) {
      if (values[key] !== undefined) {
        payload[key] = values[key];
      } else if (schema.default !== undefined) {
        payload[key] = schema.default;
      } else if (schema.required) {
        throw new Error(`Missing required field: ${key}`);
      }
    }
    return new BTMessage(this.type, payload);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      payloadSchema: this.payloadSchema,
      createdAt: this.createdAt,
    };
  }
}

// Main Bluetooth Client
class BluetoothClient extends EventEmitter {
  constructor() {
    super();
    this.state = BT_STATE.DISCONNECTED;
    this.devices = new Map();
    this.connectedDevice = null;
    this.messageQueue = new MessageQueue();
    this.templates = new Map();
    this.history = [];
    this.maxHistory = 500;
    this.scanInterval = null;
    this.adapterEnabled = false;

    // Create default templates
    this.createDefaultTemplates();
  }

  // Create default message templates
  createDefaultTemplates() {
    this.templates.set('ping', new MessageTemplate('Ping', MESSAGE_TYPE.PING, {
      timestamp: { type: 'number', default: Date.now() },
    }));
    this.templates.set('text', new MessageTemplate('Text Message', MESSAGE_TYPE.TEXT, {
      content: { type: 'string', required: true },
      sender: { type: 'string', default: 'GentlyOS' },
    }));
    this.templates.set('command', new MessageTemplate('Command', MESSAGE_TYPE.COMMAND, {
      cmd: { type: 'string', required: true },
      args: { type: 'array', default: [] },
    }));
    this.templates.set('data', new MessageTemplate('Data Transfer', MESSAGE_TYPE.DATA, {
      dataType: { type: 'string', required: true },
      data: { type: 'any', required: true },
      checksum: { type: 'string' },
    }));
  }

  // Enable adapter (simulated)
  enableAdapter() {
    this.adapterEnabled = true;
    this.emit('adapter', { enabled: true });
    return { success: true, enabled: true };
  }

  // Disable adapter
  disableAdapter() {
    this.adapterEnabled = false;
    this.stopScan();
    if (this.connectedDevice) {
      this.disconnect();
    }
    this.emit('adapter', { enabled: false });
    return { success: true, enabled: false };
  }

  // Start scanning for devices
  startScan(duration = 10000) {
    if (!this.adapterEnabled) {
      return { success: false, error: 'Adapter not enabled' };
    }
    if (this.state === BT_STATE.SCANNING) {
      return { success: false, error: 'Already scanning' };
    }

    this.state = BT_STATE.SCANNING;
    this.emit('scan', { started: true });

    // Simulate device discovery
    this.scanInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const device = new BTDevice({
          name: `Device-${Math.floor(Math.random() * 1000)}`,
          rssi: -50 - Math.floor(Math.random() * 40),
        });
        this.devices.set(device.id, device);
        this.emit('device', { discovered: true, device: device.toJSON() });
      }
    }, 1000);

    // Auto-stop after duration
    setTimeout(() => this.stopScan(), duration);

    return { success: true, duration };
  }

  // Stop scanning
  stopScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.state === BT_STATE.SCANNING) {
      this.state = BT_STATE.DISCONNECTED;
      this.emit('scan', { started: false });
    }
    return { success: true };
  }

  // Connect to device
  connect(deviceId) {
    if (!this.adapterEnabled) {
      return { success: false, error: 'Adapter not enabled' };
    }
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    this.state = BT_STATE.CONNECTING;
    this.emit('connecting', { device: device.toJSON() });

    // Simulate connection delay
    setTimeout(() => {
      device.connected = true;
      this.connectedDevice = device;
      this.state = BT_STATE.CONNECTED;
      this.emit('connected', { device: device.toJSON() });
    }, 500);

    return { success: true, connecting: true };
  }

  // Disconnect
  disconnect() {
    if (!this.connectedDevice) {
      return { success: false, error: 'Not connected' };
    }

    this.connectedDevice.connected = false;
    const deviceId = this.connectedDevice.id;
    this.connectedDevice = null;
    this.state = BT_STATE.DISCONNECTED;
    this.emit('disconnected', { deviceId });

    return { success: true };
  }

  // Pair with device
  pair(deviceId, pin = null) {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    // Simulate pairing
    device.paired = true;
    this.emit('paired', { device: device.toJSON() });

    return { success: true, paired: true };
  }

  // Unpair device
  unpair(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    device.paired = false;
    if (this.connectedDevice && this.connectedDevice.id === deviceId) {
      this.disconnect();
    }

    return { success: true };
  }

  // Send message
  sendMessage(type, payload, options = {}) {
    if (!this.connectedDevice) {
      return { success: false, error: 'Not connected' };
    }

    const message = new BTMessage(type, payload, options);
    this.messageQueue.enqueue(message);

    // Process queue
    this.processQueue();

    return { success: true, messageId: message.id };
  }

  // Send from template
  sendFromTemplate(templateName, values = {}, options = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    try {
      const message = template.create(values);
      Object.assign(message, options);
      this.messageQueue.enqueue(message);
      this.processQueue();
      return { success: true, messageId: message.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send custom text message
  sendText(text, options = {}) {
    return this.sendFromTemplate('text', { content: text }, options);
  }

  // Send command
  sendCommand(cmd, args = [], options = {}) {
    return this.sendFromTemplate('command', { cmd, args }, options);
  }

  // Send ping
  ping() {
    return this.sendFromTemplate('ping', {}, { requiresAck: true });
  }

  // Process message queue
  processQueue() {
    if (!this.connectedDevice) return;

    while (this.messageQueue.pending.length > 0) {
      const msg = this.messageQueue.dequeue();
      if (msg) {
        // Simulate transmission
        this.transmit(msg);
      }
    }
  }

  // Transmit message (simulated)
  transmit(message) {
    const encoded = message.encode();
    message.markSent();

    // Add to history
    this.history.push({
      messageId: message.id,
      deviceId: this.connectedDevice.id,
      direction: 'out',
      type: message.type,
      size: encoded.length,
      timestamp: Date.now(),
    });

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    this.emit('transmitted', { message: message.toJSON(), bytes: encoded.length });

    // Simulate ACK if required
    if (message.requiresAck) {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          this.messageQueue.handleAck(message.id);
          this.emit('ack', { messageId: message.id });
        } else {
          this.messageQueue.handleTimeout(message.id);
          this.emit('timeout', { messageId: message.id });
        }
      }, 100 + Math.random() * 200);
    }
  }

  // Create custom template
  createTemplate(name, type, payloadSchema) {
    const template = new MessageTemplate(name, type, payloadSchema);
    this.templates.set(name.toLowerCase(), template);
    return { success: true, template: template.toJSON() };
  }

  // Get template
  getTemplate(name) {
    const template = this.templates.get(name.toLowerCase());
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    return { success: true, template: template.toJSON() };
  }

  // List templates
  listTemplates() {
    return {
      success: true,
      templates: Array.from(this.templates.values()).map(t => t.toJSON()),
    };
  }

  // Delete template
  deleteTemplate(name) {
    const key = name.toLowerCase();
    if (['ping', 'text', 'command', 'data'].includes(key)) {
      return { success: false, error: 'Cannot delete default template' };
    }
    if (!this.templates.has(key)) {
      return { success: false, error: 'Template not found' };
    }
    this.templates.delete(key);
    return { success: true };
  }

  // List devices
  listDevices(filter = {}) {
    let devices = Array.from(this.devices.values());

    if (filter.paired !== undefined) {
      devices = devices.filter(d => d.paired === filter.paired);
    }
    if (filter.connected !== undefined) {
      devices = devices.filter(d => d.connected === filter.connected);
    }
    if (filter.minRssi !== undefined) {
      devices = devices.filter(d => d.rssi >= filter.minRssi);
    }

    return {
      success: true,
      devices: devices.map(d => d.toJSON()),
      total: devices.length,
    };
  }

  // Get device
  getDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }
    return { success: true, device: device.toJSON() };
  }

  // Get connection status
  getStatus() {
    return {
      success: true,
      adapterEnabled: this.adapterEnabled,
      state: this.state,
      connectedDevice: this.connectedDevice ? this.connectedDevice.toJSON() : null,
      deviceCount: this.devices.size,
      queue: this.messageQueue.getStats(),
    };
  }

  // Get message history
  getHistory(options = {}) {
    let history = [...this.history];

    if (options.deviceId) {
      history = history.filter(h => h.deviceId === options.deviceId);
    }
    if (options.direction) {
      history = history.filter(h => h.direction === options.direction);
    }
    if (options.since) {
      history = history.filter(h => h.timestamp >= options.since);
    }

    return {
      success: true,
      history: history.slice(-options.limit || -100),
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
    const outMessages = this.history.filter(h => h.direction === 'out').length;
    const inMessages = this.history.filter(h => h.direction === 'in').length;

    return {
      success: true,
      stats: {
        adapterEnabled: this.adapterEnabled,
        state: this.state,
        deviceCount: this.devices.size,
        pairedDevices: Array.from(this.devices.values()).filter(d => d.paired).length,
        connectedDevice: this.connectedDevice ? this.connectedDevice.id : null,
        templateCount: this.templates.size,
        historySize: this.history.length,
        messagesSent: outMessages,
        messagesReceived: inMessages,
        queue: this.messageQueue.getStats(),
      },
    };
  }

  // Remove device
  removeDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      return { success: false, error: 'Device not found' };
    }
    if (this.connectedDevice && this.connectedDevice.id === deviceId) {
      this.disconnect();
    }
    this.devices.delete(deviceId);
    return { success: true };
  }
}

module.exports = {
  BluetoothClient,
  BTDevice,
  BTMessage,
  MessageQueue,
  MessageTemplate,
  BT_STATE,
  MESSAGE_TYPE,
  BLE_SERVICES,
};
