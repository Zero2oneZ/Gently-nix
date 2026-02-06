// GentlyOS BTC Client - Bitcoin Block-Based Key Rotation
// Berlin Clock system using Bitcoin blocks for deterministic key generation

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'btc') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Block time constants
const BLOCK_TIME = {
  TARGET_SECONDS: 600,      // 10 minutes target
  EPOCH_BLOCKS: 2016,       // Difficulty adjustment period
  HALVING_BLOCKS: 210000,   // Subsidy halving
};

// Berlin Clock periods (based on block heights)
const BERLIN_PERIODS = {
  HOUR: 6,        // 6 blocks ~ 1 hour
  QUARTER_DAY: 36,   // 36 blocks ~ 6 hours
  DAY: 144,       // 144 blocks ~ 24 hours
  WEEK: 1008,     // 1008 blocks ~ 7 days
  EPOCH: 2016,    // Difficulty epoch
};

// Block header structure
class BlockHeader {
  constructor(data = {}) {
    this.height = data.height || 0;
    this.hash = data.hash || '';
    this.prevHash = data.prevHash || '';
    this.merkleRoot = data.merkleRoot || '';
    this.timestamp = data.timestamp || Date.now();
    this.bits = data.bits || 0;
    this.nonce = data.nonce || 0;
    this.version = data.version || 0;
  }

  // Get block age in seconds
  getAge() {
    return Math.floor((Date.now() - this.timestamp) / 1000);
  }

  // Get confirmation count (estimated)
  getConfirmations(currentHeight) {
    return Math.max(0, currentHeight - this.height + 1);
  }

  toJSON() {
    return {
      height: this.height,
      hash: this.hash,
      prevHash: this.prevHash,
      merkleRoot: this.merkleRoot,
      timestamp: this.timestamp,
      bits: this.bits,
      nonce: this.nonce,
      version: this.version,
      age: this.getAge(),
    };
  }
}

// Berlin Clock - Block-based time tracking
class BerlinClock {
  constructor() {
    this.lastBlock = null;
    this.blockCache = new Map();
    this.listeners = new Set();
  }

  // Update with new block
  updateBlock(blockData) {
    const block = new BlockHeader(blockData);
    const prevBlock = this.lastBlock;
    this.lastBlock = block;
    this.blockCache.set(block.height, block);

    // Trim old blocks (keep last 2016 for epoch)
    if (this.blockCache.size > BERLIN_PERIODS.EPOCH * 2) {
      const minHeight = block.height - BERLIN_PERIODS.EPOCH;
      for (const [h] of this.blockCache) {
        if (h < minHeight) this.blockCache.delete(h);
      }
    }

    // Notify listeners
    this.emit('block', { block, prevBlock });

    // Check period boundaries
    this.checkPeriods(block, prevBlock);

    return block;
  }

  // Check if we crossed any period boundaries
  checkPeriods(block, prevBlock) {
    if (!prevBlock) return;

    for (const [name, period] of Object.entries(BERLIN_PERIODS)) {
      const prevPeriod = Math.floor(prevBlock.height / period);
      const currPeriod = Math.floor(block.height / period);
      if (currPeriod > prevPeriod) {
        this.emit('period', { name, period: currPeriod, block });
      }
    }
  }

  // Get current period for a given granularity
  getPeriod(granularity = 'HOUR') {
    if (!this.lastBlock) return 0;
    const period = BERLIN_PERIODS[granularity] || BERLIN_PERIODS.HOUR;
    return Math.floor(this.lastBlock.height / period);
  }

  // Get all current periods
  getAllPeriods() {
    if (!this.lastBlock) return {};
    return {
      hour: this.getPeriod('HOUR'),
      quarterDay: this.getPeriod('QUARTER_DAY'),
      day: this.getPeriod('DAY'),
      week: this.getPeriod('WEEK'),
      epoch: this.getPeriod('EPOCH'),
      blockHeight: this.lastBlock.height,
    };
  }

  // Subscribe to events
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  }

  toJSON() {
    return {
      lastBlock: this.lastBlock ? this.lastBlock.toJSON() : null,
      periods: this.getAllPeriods(),
      cacheSize: this.blockCache.size,
    };
  }
}

// Block-derived key material
class BlockKey {
  constructor(block, salt = '') {
    this.blockHeight = block.height;
    this.blockHash = block.hash;
    this.salt = salt;
    this.material = this.derive();
    this.createdAt = Date.now();
  }

  // Derive key material from block
  derive() {
    const input = `${this.blockHash}:${this.blockHeight}:${this.salt}`;
    return crypto.createHash('sha256').update(input).digest();
  }

  // Get key for specific purpose
  getKey(purpose, length = 32) {
    const hmac = crypto.createHmac('sha256', this.material);
    hmac.update(purpose);
    const key = hmac.digest();
    return key.slice(0, length);
  }

  // Get deterministic IV
  getIV(purpose, length = 16) {
    const hmac = crypto.createHmac('sha256', this.material);
    hmac.update(`iv:${purpose}`);
    const iv = hmac.digest();
    return iv.slice(0, length);
  }

  toJSON() {
    return {
      blockHeight: this.blockHeight,
      blockHash: this.blockHash,
      salt: this.salt,
      materialHex: this.material.toString('hex'),
      createdAt: this.createdAt,
    };
  }
}

// Key rotation schedule
class RotationSchedule {
  constructor(granularity = 'DAY') {
    this.granularity = granularity;
    this.period = BERLIN_PERIODS[granularity] || BERLIN_PERIODS.DAY;
    this.keys = new Map();
    this.currentPeriod = 0;
  }

  // Generate key for a period
  generateKey(block, period) {
    const salt = `rotation:${this.granularity}:${period}`;
    const key = new BlockKey(block, salt);
    this.keys.set(period, key);
    return key;
  }

  // Get or create key for current period
  getCurrentKey(block) {
    const period = Math.floor(block.height / this.period);
    if (period !== this.currentPeriod) {
      this.currentPeriod = period;
      // Keep only last 3 periods of keys
      for (const [p] of this.keys) {
        if (p < period - 2) this.keys.delete(p);
      }
    }
    if (!this.keys.has(period)) {
      return this.generateKey(block, period);
    }
    return this.keys.get(period);
  }

  // Get key for specific period (for decryption)
  getKeyForPeriod(block, period) {
    if (!this.keys.has(period)) {
      return this.generateKey(block, period);
    }
    return this.keys.get(period);
  }

  toJSON() {
    return {
      granularity: this.granularity,
      period: this.period,
      currentPeriod: this.currentPeriod,
      keyCount: this.keys.size,
    };
  }
}

// Block timestamp anchor
class BlockAnchor {
  constructor(data, block) {
    this.id = generateId('anchor');
    this.dataHash = crypto.createHash('sha256').update(data).digest('hex');
    this.blockHeight = block.height;
    this.blockHash = block.hash;
    this.timestamp = Date.now();
    this.commitment = this.createCommitment();
  }

  createCommitment() {
    const input = `${this.dataHash}:${this.blockHash}:${this.blockHeight}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  // Verify the anchor
  verify(data, block) {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (hash !== this.dataHash) return { valid: false, reason: 'Data mismatch' };
    if (block.hash !== this.blockHash) return { valid: false, reason: 'Block mismatch' };
    const commitment = this.createCommitment();
    if (commitment !== this.commitment) return { valid: false, reason: 'Commitment mismatch' };
    return { valid: true };
  }

  toJSON() {
    return {
      id: this.id,
      dataHash: this.dataHash,
      blockHeight: this.blockHeight,
      blockHash: this.blockHash,
      timestamp: this.timestamp,
      commitment: this.commitment,
    };
  }
}

// Block stream simulator (for offline/testing)
class BlockSimulator {
  constructor(startHeight = 800000) {
    this.height = startHeight;
    this.prevHash = crypto.randomBytes(32).toString('hex');
  }

  // Generate next simulated block
  nextBlock() {
    const hash = crypto.createHash('sha256')
      .update(`${this.prevHash}:${this.height}:${Date.now()}`)
      .digest('hex');

    const block = new BlockHeader({
      height: this.height,
      hash,
      prevHash: this.prevHash,
      merkleRoot: crypto.randomBytes(32).toString('hex'),
      timestamp: Date.now(),
      bits: 0x1d00ffff,
      nonce: Math.floor(Math.random() * 0xffffffff),
      version: 0x20000000,
    });

    this.prevHash = hash;
    this.height++;
    return block;
  }
}

// Main BTC Client
class BTCClient {
  constructor() {
    this.clock = new BerlinClock();
    this.schedules = new Map();
    this.anchors = new Map();
    this.simulator = null;
    this.apiEndpoint = null;
  }

  // Configure API endpoint
  setEndpoint(url) {
    this.apiEndpoint = url;
    return { success: true, endpoint: url };
  }

  // Start simulator (for offline mode)
  startSimulator(startHeight = 800000) {
    this.simulator = new BlockSimulator(startHeight);
    return { success: true, height: startHeight };
  }

  // Get next simulated block
  simulateBlock() {
    if (!this.simulator) {
      return { success: false, error: 'Simulator not started' };
    }
    const block = this.simulator.nextBlock();
    this.clock.updateBlock(block);
    return { success: true, block: block.toJSON() };
  }

  // Update with real block data
  updateBlock(blockData) {
    const block = this.clock.updateBlock(blockData);
    return { success: true, block: block.toJSON() };
  }

  // Get current Berlin Clock state
  getClockState() {
    return { success: true, clock: this.clock.toJSON() };
  }

  // Create rotation schedule
  createSchedule(name, granularity = 'DAY') {
    if (this.schedules.has(name)) {
      return { success: false, error: 'Schedule already exists' };
    }
    const schedule = new RotationSchedule(granularity);
    this.schedules.set(name, schedule);
    return { success: true, schedule: schedule.toJSON() };
  }

  // Get current rotation key
  getRotationKey(scheduleName) {
    const schedule = this.schedules.get(scheduleName);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }
    if (!this.clock.lastBlock) {
      return { success: false, error: 'No block data available' };
    }
    const key = schedule.getCurrentKey(this.clock.lastBlock);
    return {
      success: true,
      key: key.toJSON(),
      keyHex: key.material.toString('hex'),
    };
  }

  // Create block-derived key
  deriveKey(purpose, salt = '') {
    if (!this.clock.lastBlock) {
      return { success: false, error: 'No block data available' };
    }
    const key = new BlockKey(this.clock.lastBlock, salt);
    return {
      success: true,
      key: key.getKey(purpose).toString('hex'),
      iv: key.getIV(purpose).toString('hex'),
      blockHeight: key.blockHeight,
    };
  }

  // Create timestamp anchor
  createAnchor(data) {
    if (!this.clock.lastBlock) {
      return { success: false, error: 'No block data available' };
    }
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const anchor = new BlockAnchor(dataBuffer, this.clock.lastBlock);
    this.anchors.set(anchor.id, anchor);
    return { success: true, anchor: anchor.toJSON() };
  }

  // Verify anchor
  verifyAnchor(anchorId, data) {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      return { success: false, error: 'Anchor not found' };
    }
    const block = this.clock.blockCache.get(anchor.blockHeight);
    if (!block) {
      return { success: false, error: 'Block not in cache' };
    }
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const result = anchor.verify(dataBuffer, block);
    return { success: true, ...result };
  }

  // Get anchor
  getAnchor(anchorId) {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      return { success: false, error: 'Anchor not found' };
    }
    return { success: true, anchor: anchor.toJSON() };
  }

  // List anchors
  listAnchors() {
    return {
      success: true,
      anchors: Array.from(this.anchors.values()).map(a => a.toJSON()),
    };
  }

  // Subscribe to block events
  subscribe(callback) {
    return this.clock.subscribe(callback);
  }

  // Get block at height
  getBlock(height) {
    const block = this.clock.blockCache.get(height);
    if (!block) {
      return { success: false, error: 'Block not in cache' };
    }
    return { success: true, block: block.toJSON() };
  }

  // Get all periods
  getPeriods() {
    return { success: true, periods: this.clock.getAllPeriods() };
  }

  // Calculate next rotation time
  getNextRotation(scheduleName) {
    const schedule = this.schedules.get(scheduleName);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }
    if (!this.clock.lastBlock) {
      return { success: false, error: 'No block data available' };
    }
    const currentPeriod = Math.floor(this.clock.lastBlock.height / schedule.period);
    const nextPeriodBlock = (currentPeriod + 1) * schedule.period;
    const blocksRemaining = nextPeriodBlock - this.clock.lastBlock.height;
    const estimatedSeconds = blocksRemaining * BLOCK_TIME.TARGET_SECONDS;
    return {
      success: true,
      currentPeriod,
      nextPeriodBlock,
      blocksRemaining,
      estimatedSeconds,
      estimatedTime: new Date(Date.now() + estimatedSeconds * 1000).toISOString(),
    };
  }

  // List schedules
  listSchedules() {
    return {
      success: true,
      schedules: Array.from(this.schedules.entries()).map(([name, s]) => ({
        name,
        ...s.toJSON(),
      })),
    };
  }

  // Delete schedule
  deleteSchedule(name) {
    if (!this.schedules.has(name)) {
      return { success: false, error: 'Schedule not found' };
    }
    this.schedules.delete(name);
    return { success: true };
  }
}

module.exports = {
  BTCClient,
  BerlinClock,
  BlockHeader,
  BlockKey,
  RotationSchedule,
  BlockAnchor,
  BlockSimulator,
  BLOCK_TIME,
  BERLIN_PERIODS,
};
