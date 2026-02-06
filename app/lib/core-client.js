// GentlyOS Core Client - XOR Cryptographic Foundation
// Implements the "unsolvable half" model: LOCK (Device) XOR KEY (Public) = FULL_SECRET

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'core') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Compute SHA256 hash
function sha256(data) {
  const input = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(input).digest('hex');
}

// XOR two buffers
function xorBuffers(a, b) {
  const len = Math.min(a.length, b.length);
  const result = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

// Tag constants (for blob typing)
const TAG = {
  ENTRY: 0x01,
  PARENT: 0x02,
  CHILD: 0x03,
  SCHEMA: 0x04,
  NEXT: 0x05,
  PREV: 0x06,
  WEIGHTS: 0x07,
  CODE: 0x08,
  CONFIG: 0x09,
  GENESIS: 0x10,
  LOCK: 0x11,
  KEY: 0x12,
  VISUAL: 0x13,
  AUDIO: 0x14,
  VECTOR: 0x15,
};

// Blob - Core data unit
class Blob {
  constructor(data, kind = TAG.ENTRY) {
    this.data = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.kind = kind;
    this.hash = sha256(this.data);
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      hash: this.hash,
      kind: this.kind,
      size: this.data.length,
      createdAt: this.createdAt,
    };
  }
}

// Blob Store - Persistence layer
class BlobStore {
  constructor() {
    this.blobs = new Map(); // hash -> Blob
  }

  store(blob) {
    this.blobs.set(blob.hash, blob);
    return blob.hash;
  }

  get(hash) {
    return this.blobs.get(hash) || null;
  }

  has(hash) {
    return this.blobs.has(hash);
  }

  delete(hash) {
    return this.blobs.delete(hash);
  }

  list() {
    return Array.from(this.blobs.values()).map(b => b.toJSON());
  }

  size() {
    return this.blobs.size;
  }
}

// Genesis Key - Root cryptographic key
class GenesisKey {
  constructor(entropy = null) {
    this.entropy = entropy || crypto.randomBytes(32);
    this.hash = sha256(this.entropy);
    this.createdAt = Date.now();
  }

  derive(purpose) {
    const derived = crypto.createHmac('sha256', this.entropy)
      .update(purpose)
      .digest();
    return derived;
  }

  toJSON() {
    return {
      hash: this.hash,
      createdAt: this.createdAt,
    };
  }
}

// Session Key - Temporary session key
class SessionKey {
  constructor(genesisKey, sessionId) {
    this.sessionId = sessionId;
    this.key = genesisKey.derive(`session:${sessionId}`);
    this.hash = sha256(this.key);
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      hash: this.hash,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      expired: this.isExpired(),
    };
  }
}

// Project Key - Project-specific key
class ProjectKey {
  constructor(genesisKey, projectId) {
    this.projectId = projectId;
    this.key = genesisKey.derive(`project:${projectId}`);
    this.hash = sha256(this.key);
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      projectId: this.projectId,
      hash: this.hash,
      createdAt: this.createdAt,
    };
  }
}

// Lock - Device-side immutable secret (never leaves device)
class Lock {
  constructor(secret = null) {
    this.secret = secret || crypto.randomBytes(32);
    this.hash = sha256(this.secret);
    this.createdAt = Date.now();
  }

  // XOR with key to get full secret
  combine(key) {
    return xorBuffers(this.secret, key.secret);
  }

  toJSON() {
    return {
      hash: this.hash,
      createdAt: this.createdAt,
    };
  }
}

// Key - Public-side shareable secret
class Key {
  constructor(secret = null) {
    this.secret = secret || crypto.randomBytes(32);
    this.hash = sha256(this.secret);
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      hash: this.hash,
      createdAt: this.createdAt,
    };
  }
}

// Full Secret - Reconstructed during "dance"
class FullSecret {
  constructor(lock, key) {
    this.secret = lock.combine(key);
    this.hash = sha256(this.secret);
    this.lockHash = lock.hash;
    this.keyHash = key.hash;
    this.reconstructedAt = Date.now();
  }

  // Derive a purpose-specific key from full secret
  derive(purpose) {
    return crypto.createHmac('sha256', this.secret)
      .update(purpose)
      .digest();
  }

  toJSON() {
    return {
      hash: this.hash,
      lockHash: this.lockHash,
      keyHash: this.keyHash,
      reconstructedAt: this.reconstructedAt,
    };
  }
}

// Berlin Clock - Time-based key rotation (synced to Bitcoin blocks)
class BerlinClock {
  constructor(blockHeight = 0, rotationInterval = 144) {
    this.blockHeight = blockHeight;
    this.rotationInterval = rotationInterval; // ~1 day in blocks
    this.lastRotation = blockHeight;
  }

  update(newHeight) {
    this.blockHeight = newHeight;
  }

  shouldRotate() {
    return (this.blockHeight - this.lastRotation) >= this.rotationInterval;
  }

  rotate() {
    this.lastRotation = this.blockHeight;
    return {
      rotatedAt: this.blockHeight,
      nextRotation: this.blockHeight + this.rotationInterval,
    };
  }

  blocksUntilRotation() {
    const remaining = this.rotationInterval - (this.blockHeight - this.lastRotation);
    return Math.max(0, remaining);
  }

  toJSON() {
    return {
      blockHeight: this.blockHeight,
      rotationInterval: this.rotationInterval,
      lastRotation: this.lastRotation,
      shouldRotate: this.shouldRotate(),
      blocksUntilRotation: this.blocksUntilRotation(),
    };
  }
}

// Vault Entry
class VaultEntry {
  constructor(name, key, metadata = {}) {
    this.id = generateId('entry');
    this.name = name;
    this.keyHash = sha256(key);
    this.encryptedKey = this.encrypt(key);
    this.metadata = metadata;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
  }

  // Simple encryption (in production, use proper AEAD)
  encrypt(key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc',
      crypto.scryptSync('vault-master', 'salt', 32), iv);
    const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('hex');
  }

  decrypt() {
    const data = Buffer.from(this.encryptedKey, 'hex');
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc',
      crypto.scryptSync('vault-master', 'salt', 32), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      keyHash: this.keyHash,
      metadata: this.metadata,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
    };
  }
}

// Key Vault - Secure key storage
class KeyVault {
  constructor() {
    this.id = generateId('vault');
    this.entries = new Map();
    this.genesis = null;
    this.lock = null;
    this.createdAt = Date.now();
  }

  // Initialize vault with genesis key
  init(entropy = null) {
    this.genesis = new GenesisKey(entropy);
    this.lock = new Lock(this.genesis.derive('device-lock'));
    return { success: true, genesisHash: this.genesis.hash };
  }

  // Store a key
  store(name, key, metadata = {}) {
    const entry = new VaultEntry(name, key, metadata);
    this.entries.set(entry.id, entry);
    return { success: true, entry: entry.toJSON() };
  }

  // Retrieve a key
  retrieve(entryId) {
    const entry = this.entries.get(entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }
    entry.lastAccessed = Date.now();
    return { success: true, key: entry.decrypt(), entry: entry.toJSON() };
  }

  // Get entry by name
  getByName(name) {
    for (const entry of this.entries.values()) {
      if (entry.name === name) {
        return { success: true, entry: entry.toJSON() };
      }
    }
    return { success: false, error: 'Entry not found' };
  }

  // List all entries (without keys)
  list() {
    return {
      success: true,
      entries: Array.from(this.entries.values()).map(e => e.toJSON()),
    };
  }

  // Delete entry
  delete(entryId) {
    if (!this.entries.has(entryId)) {
      return { success: false, error: 'Entry not found' };
    }
    this.entries.delete(entryId);
    return { success: true };
  }

  // Create session key
  createSessionKey(sessionId) {
    if (!this.genesis) {
      return { success: false, error: 'Vault not initialized' };
    }
    const sessionKey = new SessionKey(this.genesis, sessionId);
    return { success: true, sessionKey: sessionKey.toJSON() };
  }

  // Create project key
  createProjectKey(projectId) {
    if (!this.genesis) {
      return { success: false, error: 'Vault not initialized' };
    }
    const projectKey = new ProjectKey(this.genesis, projectId);
    return { success: true, projectKey: projectKey.toJSON() };
  }

  // Get lock (for dance protocol)
  getLock() {
    if (!this.lock) {
      return { success: false, error: 'Vault not initialized' };
    }
    return { success: true, lock: this.lock.toJSON() };
  }

  // Sign data
  sign(data) {
    if (!this.genesis) {
      return { success: false, error: 'Vault not initialized' };
    }
    const signature = crypto.createHmac('sha256', this.genesis.entropy)
      .update(typeof data === 'string' ? data : JSON.stringify(data))
      .digest('hex');
    return { success: true, signature };
  }

  // Verify signature
  verify(data, signature) {
    const expected = this.sign(data);
    if (!expected.success) return expected;
    return { success: true, valid: expected.signature === signature };
  }

  toJSON() {
    return {
      id: this.id,
      initialized: this.genesis !== null,
      entryCount: this.entries.size,
      createdAt: this.createdAt,
    };
  }
}

// Pattern Encoder - Visual/audio instruction encoding
class PatternEncoder {
  constructor() {
    this.patterns = new Map();
  }

  // Encode data to visual pattern (color grid)
  encodeVisual(data) {
    const hash = sha256(data);
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const byte = parseInt(hash.substr(i * 2, 2), 16);
      const hue = Math.round(byte * 360 / 255);
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return {
      type: 'visual',
      hash: hash.slice(0, 8),
      grid: { size: 4, colors },
    };
  }

  // Encode data to audio pattern (frequency sequence)
  encodeAudio(data) {
    const hash = sha256(data);
    const frequencies = [];
    for (let i = 0; i < 8; i++) {
      const byte = parseInt(hash.substr(i * 4, 4), 16);
      // Map to audible range 200-4000 Hz
      const freq = 200 + (byte % 3800);
      frequencies.push(freq);
    }
    return {
      type: 'audio',
      hash: hash.slice(0, 8),
      frequencies,
      duration: 0.5, // seconds per tone
    };
  }

  // Verify pattern matches data
  verifyPattern(pattern, data) {
    const dataHash = sha256(data).slice(0, 8);
    return pattern.hash === dataHash;
  }
}

// Main Core Client
class CoreClient {
  constructor() {
    this.vault = new KeyVault();
    this.blobStore = new BlobStore();
    this.clock = new BerlinClock();
    this.patternEncoder = new PatternEncoder();
  }

  // Initialize
  init(entropy = null) {
    const result = this.vault.init(entropy);
    return { ...result, vaultId: this.vault.id };
  }

  // === VAULT OPERATIONS ===

  storeKey(name, key, metadata) {
    return this.vault.store(name, key, metadata);
  }

  retrieveKey(entryId) {
    return this.vault.retrieve(entryId);
  }

  getKeyByName(name) {
    return this.vault.getByName(name);
  }

  listKeys() {
    return this.vault.list();
  }

  deleteKey(entryId) {
    return this.vault.delete(entryId);
  }

  createSessionKey(sessionId) {
    return this.vault.createSessionKey(sessionId);
  }

  createProjectKey(projectId) {
    return this.vault.createProjectKey(projectId);
  }

  sign(data) {
    return this.vault.sign(data);
  }

  verify(data, signature) {
    return this.vault.verify(data, signature);
  }

  // === BLOB OPERATIONS ===

  createBlob(data, kind = TAG.ENTRY) {
    const blob = new Blob(data, kind);
    const hash = this.blobStore.store(blob);
    return { success: true, hash, blob: blob.toJSON() };
  }

  getBlob(hash) {
    const blob = this.blobStore.get(hash);
    if (!blob) {
      return { success: false, error: 'Blob not found' };
    }
    return { success: true, blob: blob.toJSON(), data: blob.data.toString() };
  }

  listBlobs() {
    return { success: true, blobs: this.blobStore.list() };
  }

  // === XOR OPERATIONS ===

  // Create lock/key pair
  createLockKeyPair() {
    const lock = new Lock();
    const key = new Key();
    // Ensure XOR produces desired secret
    const fullSecret = new FullSecret(lock, key);
    return {
      success: true,
      lock: lock.toJSON(),
      key: key.toJSON(),
      fullSecretHash: fullSecret.hash,
    };
  }

  // Reconstruct secret from lock and key
  reconstructSecret(lockSecret, keySecret) {
    const lock = new Lock(Buffer.from(lockSecret, 'hex'));
    const key = new Key(Buffer.from(keySecret, 'hex'));
    const fullSecret = new FullSecret(lock, key);
    return { success: true, fullSecret: fullSecret.toJSON() };
  }

  // XOR two hex strings
  xor(a, b) {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    const result = xorBuffers(bufA, bufB);
    return { success: true, result: result.toString('hex') };
  }

  // === CLOCK OPERATIONS ===

  updateBlockHeight(height) {
    this.clock.update(height);
    return { success: true, clock: this.clock.toJSON() };
  }

  shouldRotate() {
    return { success: true, shouldRotate: this.clock.shouldRotate() };
  }

  rotate() {
    if (!this.clock.shouldRotate()) {
      return { success: false, error: 'Rotation not due' };
    }
    const rotation = this.clock.rotate();
    return { success: true, rotation };
  }

  getClockStatus() {
    return { success: true, clock: this.clock.toJSON() };
  }

  // === PATTERN OPERATIONS ===

  encodeVisualPattern(data) {
    return { success: true, pattern: this.patternEncoder.encodeVisual(data) };
  }

  encodeAudioPattern(data) {
    return { success: true, pattern: this.patternEncoder.encodeAudio(data) };
  }

  verifyPattern(pattern, data) {
    return { success: true, valid: this.patternEncoder.verifyPattern(pattern, data) };
  }

  // === HASH OPERATIONS ===

  hash(data) {
    return { success: true, hash: sha256(data) };
  }

  // === STATS ===

  getStats() {
    return {
      success: true,
      stats: {
        vaultInitialized: this.vault.genesis !== null,
        keyCount: this.vault.entries.size,
        blobCount: this.blobStore.size(),
        blockHeight: this.clock.blockHeight,
        shouldRotate: this.clock.shouldRotate(),
      },
    };
  }

  // Export vault metadata (not keys)
  exportMetadata() {
    return {
      success: true,
      metadata: {
        vault: this.vault.toJSON(),
        clock: this.clock.toJSON(),
        blobCount: this.blobStore.size(),
      },
    };
  }
}

module.exports = {
  CoreClient,
  KeyVault,
  VaultEntry,
  BlobStore,
  Blob,
  GenesisKey,
  SessionKey,
  ProjectKey,
  Lock,
  Key,
  FullSecret,
  BerlinClock,
  PatternEncoder,
  TAG,
  sha256,
  xorBuffers,
};
