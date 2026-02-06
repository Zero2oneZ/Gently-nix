// GentlyOS SMS Client - SMS Collection and Management
// Receive and manage SMS messages via connected devices

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Message types
const MESSAGE_TYPE = {
  SMS: 'sms',
  MMS: 'mms',
  NOTIFICATION: 'notification',
};

// Message status
const MESSAGE_STATUS = {
  RECEIVED: 'received',
  READ: 'read',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  PENDING: 'pending',
};

// Connection methods
const CONNECTION_TYPE = {
  BLUETOOTH: 'bluetooth',
  USB: 'usb',
  KDECONNECT: 'kdeconnect',
  ADB: 'adb',
  MODEM: 'modem',
};

// Generate ID
function generateId(prefix = 'sms') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// SMS Message
class SMSMessage {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.type = data.type || MESSAGE_TYPE.SMS;
    this.sender = data.sender || '';
    this.recipient = data.recipient || '';
    this.body = data.body || '';
    this.timestamp = data.timestamp || Date.now();
    this.status = data.status || MESSAGE_STATUS.RECEIVED;
    this.read = data.read || false;
    this.threadId = data.threadId || null;
    this.attachments = data.attachments || []; // For MMS
    this.metadata = data.metadata || {};
  }

  markRead() {
    this.read = true;
    this.status = MESSAGE_STATUS.READ;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      sender: this.sender,
      recipient: this.recipient,
      body: this.body,
      timestamp: this.timestamp,
      status: this.status,
      read: this.read,
      threadId: this.threadId,
      attachments: this.attachments,
    };
  }
}

// Conversation thread
class ConversationThread {
  constructor(data = {}) {
    this.id = data.id || generateId('thread');
    this.participants = data.participants || [];
    this.name = data.name || '';
    this.messages = new Map();
    this.unreadCount = 0;
    this.lastMessage = null;
    this.lastActivity = Date.now();
    this.archived = data.archived || false;
    this.muted = data.muted || false;
    this.pinned = data.pinned || false;
  }

  addMessage(message) {
    if (!(message instanceof SMSMessage)) {
      message = new SMSMessage(message);
    }
    message.threadId = this.id;
    this.messages.set(message.id, message);
    this.lastMessage = message;
    this.lastActivity = message.timestamp;
    if (!message.read) this.unreadCount++;
    return message;
  }

  markAllRead() {
    for (const msg of this.messages.values()) {
      msg.markRead();
    }
    this.unreadCount = 0;
    return this;
  }

  getMessages(limit = 50, offset = 0) {
    const msgs = Array.from(this.messages.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
    return msgs;
  }

  toJSON() {
    return {
      id: this.id,
      participants: this.participants,
      name: this.name || this.participants.join(', '),
      messageCount: this.messages.size,
      unreadCount: this.unreadCount,
      lastMessage: this.lastMessage?.toJSON() || null,
      lastActivity: this.lastActivity,
      archived: this.archived,
      muted: this.muted,
      pinned: this.pinned,
    };
  }
}

// Contact
class Contact {
  constructor(data = {}) {
    this.id = data.id || generateId('contact');
    this.name = data.name || '';
    this.phoneNumbers = data.phoneNumbers || [];
    this.email = data.email || '';
    this.avatar = data.avatar || null;
    this.notes = data.notes || '';
    this.favorite = data.favorite || false;
    this.blocked = data.blocked || false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phoneNumbers: this.phoneNumbers,
      email: this.email,
      avatar: this.avatar,
      favorite: this.favorite,
      blocked: this.blocked,
    };
  }
}

// Device connection
class DeviceConnection {
  constructor(data = {}) {
    this.id = data.id || generateId('device');
    this.name = data.name || 'Unknown Device';
    this.type = data.type || CONNECTION_TYPE.BLUETOOTH;
    this.address = data.address || '';
    this.connected = false;
    this.paired = data.paired || false;
    this.capabilities = data.capabilities || ['sms', 'notification'];
    this.lastSeen = Date.now();
    this.batteryLevel = data.batteryLevel || null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      address: this.address,
      connected: this.connected,
      paired: this.paired,
      capabilities: this.capabilities,
      lastSeen: this.lastSeen,
      batteryLevel: this.batteryLevel,
    };
  }
}

// Main SMS Client
class SMSClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.threads = new Map();
    this.contacts = new Map();
    this.devices = new Map();
    this.messages = new Map();
    this.activeDevice = null;
    this.kdeConnectProc = null;
    this.adbProc = null;
    this.modemPath = config.modemPath || '/dev/ttyUSB0';
    this.savePath = config.savePath || path.join(process.env.HOME || '/home/deck', '.gently', 'sms');

    // Initialize storage
    this._initStorage();
  }

  _initStorage() {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  // Connect via KDE Connect
  async connectKDEConnect() {
    return new Promise((resolve, reject) => {
      exec('kdeconnect-cli -l', (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: 'KDE Connect not available' });
        }

        const lines = stdout.split('\n').filter(l => l.trim());
        const devices = [];

        for (const line of lines) {
          const match = line.match(/- (.+): (.+) \((.+)\)/);
          if (match) {
            const device = new DeviceConnection({
              name: match[1],
              id: match[2],
              type: CONNECTION_TYPE.KDECONNECT,
              address: match[2],
              paired: line.includes('paired'),
              connected: line.includes('reachable'),
            });
            this.devices.set(device.id, device);
            devices.push(device.toJSON());
          }
        }

        resolve({ success: true, devices });
      });
    });
  }

  // Connect via ADB
  async connectADB() {
    return new Promise((resolve, reject) => {
      exec('adb devices', (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: 'ADB not available' });
        }

        const lines = stdout.split('\n').slice(1).filter(l => l.trim());
        const devices = [];

        for (const line of lines) {
          const parts = line.split('\t');
          if (parts.length >= 2 && parts[1] === 'device') {
            const device = new DeviceConnection({
              id: parts[0],
              name: `ADB Device ${parts[0].slice(0, 8)}`,
              type: CONNECTION_TYPE.ADB,
              address: parts[0],
              connected: true,
            });
            this.devices.set(device.id, device);
            devices.push(device.toJSON());
          }
        }

        resolve({ success: true, devices });
      });
    });
  }

  // Connect via Bluetooth (using bluetoothctl)
  async connectBluetooth(address) {
    return new Promise((resolve, reject) => {
      exec(`bluetoothctl connect ${address}`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || 'Bluetooth connection failed' });
        }

        const device = new DeviceConnection({
          address,
          type: CONNECTION_TYPE.BLUETOOTH,
          connected: stdout.includes('successful'),
        });
        this.devices.set(device.id, device);

        resolve({ success: true, device: device.toJSON() });
      });
    });
  }

  // List connected devices
  listDevices() {
    return {
      success: true,
      devices: Array.from(this.devices.values()).map(d => d.toJSON()),
      active: this.activeDevice?.toJSON() || null,
    };
  }

  // Set active device
  setActiveDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return { success: false, error: 'Device not found' };

    this.activeDevice = device;
    this.emit('device-changed', { device: device.toJSON() });
    return { success: true, device: device.toJSON() };
  }

  // Fetch SMS from device (KDE Connect)
  async fetchSMSKDEConnect(deviceId) {
    return new Promise((resolve, reject) => {
      const device = this.devices.get(deviceId);
      if (!device) return resolve({ success: false, error: 'Device not found' });

      exec(`kdeconnect-cli -d ${deviceId} --list-sms`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || 'Failed to fetch SMS' });
        }

        // Parse SMS list
        const messages = [];
        // Format varies, basic parsing
        const lines = stdout.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const msg = new SMSMessage({
            body: line,
            timestamp: Date.now(),
          });
          this.messages.set(msg.id, msg);
          messages.push(msg.toJSON());
        }

        resolve({ success: true, messages });
      });
    });
  }

  // Fetch SMS from device (ADB)
  async fetchSMSADB(deviceId) {
    return new Promise((resolve, reject) => {
      const cmd = `adb -s ${deviceId} shell content query --uri content://sms/inbox --projection address,body,date`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || 'Failed to fetch SMS via ADB' });
        }

        const messages = [];
        const rows = stdout.split('\n').filter(l => l.includes('Row:'));

        for (const row of rows) {
          const addressMatch = row.match(/address=([^,]+)/);
          const bodyMatch = row.match(/body=([^,]+)/);
          const dateMatch = row.match(/date=(\d+)/);

          if (addressMatch && bodyMatch) {
            const msg = new SMSMessage({
              sender: addressMatch[1],
              body: bodyMatch[1],
              timestamp: dateMatch ? parseInt(dateMatch[1]) : Date.now(),
            });
            this.messages.set(msg.id, msg);
            this._addToThread(msg);
            messages.push(msg.toJSON());
          }
        }

        resolve({ success: true, messages, count: messages.length });
      });
    });
  }

  // Add message to appropriate thread
  _addToThread(message) {
    const participant = message.sender || message.recipient;
    let thread = Array.from(this.threads.values())
      .find(t => t.participants.includes(participant));

    if (!thread) {
      thread = new ConversationThread({
        participants: [participant],
      });
      this.threads.set(thread.id, thread);
    }

    thread.addMessage(message);
    return thread;
  }

  // Send SMS (KDE Connect)
  async sendSMSKDEConnect(deviceId, recipient, body) {
    return new Promise((resolve, reject) => {
      const cmd = `kdeconnect-cli -d ${deviceId} --send-sms "${body}" --destination "${recipient}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || 'Failed to send SMS' });
        }

        const msg = new SMSMessage({
          recipient,
          body,
          status: MESSAGE_STATUS.SENT,
          timestamp: Date.now(),
        });
        this.messages.set(msg.id, msg);
        this._addToThread(msg);

        this.emit('message-sent', { message: msg.toJSON() });
        resolve({ success: true, message: msg.toJSON() });
      });
    });
  }

  // Send SMS (ADB)
  async sendSMSADB(deviceId, recipient, body) {
    return new Promise((resolve, reject) => {
      // ADB SMS sending requires specific app or root
      const cmd = `adb -s ${deviceId} shell am start -a android.intent.action.SENDTO -d sms:${recipient} --es sms_body "${body}" --ez exit_on_sent true`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || 'Failed to send SMS via ADB' });
        }

        const msg = new SMSMessage({
          recipient,
          body,
          status: MESSAGE_STATUS.PENDING,
          timestamp: Date.now(),
        });
        this.messages.set(msg.id, msg);
        this._addToThread(msg);

        resolve({ success: true, message: msg.toJSON() });
      });
    });
  }

  // Generic send SMS
  async sendSMS(recipient, body, deviceId = null) {
    const device = deviceId
      ? this.devices.get(deviceId)
      : this.activeDevice;

    if (!device) return { success: false, error: 'No device connected' };

    switch (device.type) {
      case CONNECTION_TYPE.KDECONNECT:
        return this.sendSMSKDEConnect(device.id, recipient, body);
      case CONNECTION_TYPE.ADB:
        return this.sendSMSADB(device.id, recipient, body);
      default:
        return { success: false, error: 'Send not supported for this device type' };
    }
  }

  // Get all threads
  getThreads(filter = {}) {
    let threads = Array.from(this.threads.values());

    if (filter.archived !== undefined) {
      threads = threads.filter(t => t.archived === filter.archived);
    }
    if (filter.unread) {
      threads = threads.filter(t => t.unreadCount > 0);
    }
    if (filter.pinned) {
      threads = threads.filter(t => t.pinned);
    }

    // Sort by last activity
    threads.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.lastActivity - a.lastActivity;
    });

    return {
      success: true,
      threads: threads.map(t => t.toJSON()),
      total: threads.length,
    };
  }

  // Get thread
  getThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return { success: false, error: 'Thread not found' };

    return {
      success: true,
      thread: thread.toJSON(),
      messages: thread.getMessages().map(m => m.toJSON()),
    };
  }

  // Mark thread as read
  markThreadRead(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return { success: false, error: 'Thread not found' };

    thread.markAllRead();
    this.emit('thread-read', { thread: threadId });
    return { success: true };
  }

  // Archive thread
  archiveThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return { success: false, error: 'Thread not found' };

    thread.archived = true;
    return { success: true };
  }

  // Delete thread
  deleteThread(threadId) {
    if (!this.threads.has(threadId)) {
      return { success: false, error: 'Thread not found' };
    }
    this.threads.delete(threadId);
    return { success: true };
  }

  // Pin thread
  pinThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return { success: false, error: 'Thread not found' };

    thread.pinned = !thread.pinned;
    return { success: true, pinned: thread.pinned };
  }

  // Add contact
  addContact(data) {
    const contact = new Contact(data);
    this.contacts.set(contact.id, contact);
    this.emit('contact-added', { contact: contact.toJSON() });
    return { success: true, contact: contact.toJSON() };
  }

  // Get contact
  getContact(contactId) {
    const contact = this.contacts.get(contactId);
    if (!contact) return { success: false, error: 'Contact not found' };
    return { success: true, contact: contact.toJSON() };
  }

  // Find contact by phone
  findContactByPhone(phone) {
    const contact = Array.from(this.contacts.values())
      .find(c => c.phoneNumbers.some(p => p.includes(phone) || phone.includes(p)));
    return contact ? { success: true, contact: contact.toJSON() } : { success: false };
  }

  // List contacts
  listContacts(filter = {}) {
    let contacts = Array.from(this.contacts.values());

    if (filter.favorite) {
      contacts = contacts.filter(c => c.favorite);
    }
    if (filter.blocked !== undefined) {
      contacts = contacts.filter(c => c.blocked === filter.blocked);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phoneNumbers.some(p => p.includes(q))
      );
    }

    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      contacts: contacts.map(c => c.toJSON()),
      total: contacts.length,
    };
  }

  // Block contact
  blockContact(contactId) {
    const contact = this.contacts.get(contactId);
    if (!contact) return { success: false, error: 'Contact not found' };

    contact.blocked = !contact.blocked;
    return { success: true, blocked: contact.blocked };
  }

  // Delete contact
  deleteContact(contactId) {
    if (!this.contacts.has(contactId)) {
      return { success: false, error: 'Contact not found' };
    }
    this.contacts.delete(contactId);
    return { success: true };
  }

  // Search messages
  searchMessages(query, options = {}) {
    const q = query.toLowerCase();
    let results = Array.from(this.messages.values())
      .filter(m => m.body.toLowerCase().includes(q));

    if (options.sender) {
      results = results.filter(m => m.sender.includes(options.sender));
    }
    if (options.startDate) {
      results = results.filter(m => m.timestamp >= options.startDate);
    }
    if (options.endDate) {
      results = results.filter(m => m.timestamp <= options.endDate);
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    const limit = options.limit || 50;
    return {
      success: true,
      messages: results.slice(0, limit).map(m => m.toJSON()),
      total: results.length,
    };
  }

  // Export messages
  exportMessages(format = 'json', threadId = null) {
    let messages;
    if (threadId) {
      const thread = this.threads.get(threadId);
      if (!thread) return { success: false, error: 'Thread not found' };
      messages = thread.getMessages(1000);
    } else {
      messages = Array.from(this.messages.values());
    }

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(messages.map(m => m.toJSON()), null, 2),
      };
    } else if (format === 'csv') {
      const header = 'id,sender,recipient,body,timestamp,status\n';
      const rows = messages.map(m =>
        `"${m.id}","${m.sender}","${m.recipient}","${m.body.replace(/"/g, '""')}",${m.timestamp},"${m.status}"`
      ).join('\n');
      return { success: true, data: header + rows };
    }

    return { success: false, error: 'Unknown format' };
  }

  // Save to disk
  async save() {
    const data = {
      threads: Array.from(this.threads.values()).map(t => ({
        ...t.toJSON(),
        messages: Array.from(t.messages.values()).map(m => m.toJSON()),
      })),
      contacts: Array.from(this.contacts.values()).map(c => c.toJSON()),
      devices: Array.from(this.devices.values()).map(d => d.toJSON()),
    };

    const filePath = path.join(this.savePath, 'sms-data.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true, path: filePath };
  }

  // Load from disk
  async load() {
    const filePath = path.join(this.savePath, 'sms-data.json');
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'No saved data' };
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Load contacts
      this.contacts.clear();
      for (const c of data.contacts || []) {
        this.contacts.set(c.id, new Contact(c));
      }

      // Load threads and messages
      this.threads.clear();
      this.messages.clear();
      for (const t of data.threads || []) {
        const thread = new ConversationThread(t);
        for (const m of t.messages || []) {
          const msg = new SMSMessage(m);
          thread.messages.set(msg.id, msg);
          this.messages.set(msg.id, msg);
        }
        thread.unreadCount = Array.from(thread.messages.values()).filter(m => !m.read).length;
        this.threads.set(thread.id, thread);
      }

      // Load devices
      this.devices.clear();
      for (const d of data.devices || []) {
        this.devices.set(d.id, new DeviceConnection(d));
      }

      return { success: true, threads: this.threads.size, contacts: this.contacts.size };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Get statistics
  getStats() {
    const totalMessages = this.messages.size;
    const unreadCount = Array.from(this.messages.values()).filter(m => !m.read).length;
    const sentCount = Array.from(this.messages.values()).filter(m => m.status === MESSAGE_STATUS.SENT).length;

    return {
      success: true,
      stats: {
        totalMessages,
        unreadCount,
        sentCount,
        receivedCount: totalMessages - sentCount,
        threadCount: this.threads.size,
        contactCount: this.contacts.size,
        deviceCount: this.devices.size,
      },
    };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      MESSAGE_TYPE,
      MESSAGE_STATUS,
      CONNECTION_TYPE,
    };
  }
}

module.exports = {
  SMSClient,
  SMSMessage,
  ConversationThread,
  Contact,
  DeviceConnection,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  CONNECTION_TYPE,
};
