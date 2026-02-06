// GentlyOS Miner Client - Integrated BTC Solo Mining
// Dev tier only, requires high hardware score (75+)

const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// Z3RO2Z Constants
const Z = {
  XOR_KEY: 73,
  SACRED_POSITION: 19,
  YHWH: 26,
  PHI_SEED: 618033988,
  MOD9_BIAS: 9,
  MOD22_REM: 19,
};

// Miner states
const MINER_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  MINING: 'mining',
  PAUSED: 'paused',
  ERROR: 'error',
  STOPPED: 'stopped',
};

// Pool presets
const POOL_PRESETS = {
  'solo-ckpool': { host: 'solo.ckpool.org', port: 3333, name: 'CKPool Solo' },
  'solo-ckpool-ssl': { host: 'solo.ckpool.org', port: 443, name: 'CKPool Solo SSL' },
  'antpool-ssl': { host: 'ss.antpool.com', port: 443, name: 'AntPool SSL' },
  'public-pool': { host: 'public-pool.io', port: 21496, name: 'Public Pool' },
  'braiins': { host: 'stratum.braiins.com', port: 3333, name: 'Braiins Pool' },
};

// Base58 encoding
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  let zeros = 0;
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) zeros++;
  const digits = [];
  let num = BigInt('0x' + buffer.toString('hex'));
  while (num > 0n) {
    const [q, r] = [num / 58n, num % 58n];
    digits.push(Number(r));
    num = q;
  }
  for (let i = 0; i < zeros; i++) digits.push(0);
  return digits.reverse().map(d => B58[d]).join('');
}

function base58Check(payload) {
  const checksum = crypto.createHash('sha256')
    .update(crypto.createHash('sha256').update(payload).digest())
    .digest()
    .slice(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

function sha256d(buf) {
  return crypto.createHash('sha256').update(
    crypto.createHash('sha256').update(buf).digest()
  ).digest();
}

// Wallet Manager
class WalletManager {
  constructor(walletDir) {
    this.walletDir = walletDir || path.join(os.homedir(), '.gentlyos');
    this.walletFile = path.join(this.walletDir, 'wallet.json');
    this.wallet = null;
  }

  generate() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const rawPub = publicKey.slice(-65);
    const prefix = rawPub[64] % 2 === 0 ? 0x02 : 0x03;
    const compressedPub = Buffer.concat([Buffer.from([prefix]), rawPub.slice(1, 33)]);

    const sha = crypto.createHash('sha256').update(compressedPub).digest();
    const ripemd = crypto.createHash('ripemd160').update(sha).digest();
    const versioned = Buffer.concat([Buffer.from([0x00]), ripemd]);
    const address = base58Check(versioned);

    let rawPriv = null;
    for (let i = 0; i < privateKey.length - 32; i++) {
      if (privateKey[i] === 0x04 && privateKey[i + 1] === 0x20) {
        rawPriv = privateKey.slice(i + 2, i + 34);
        if (rawPriv.length === 32 && !rawPriv.every(b => b === 0)) break;
        rawPriv = null;
      }
    }

    if (!rawPriv) {
      for (let i = privateKey.length - 34; i >= 0; i--) {
        const candidate = privateKey.slice(i, i + 32);
        const nonZero = candidate.filter(b => b !== 0).length;
        if (nonZero > 20) {
          rawPriv = candidate;
          break;
        }
      }
    }

    let wif = '';
    if (rawPriv) {
      const wifPayload = Buffer.concat([
        Buffer.from([0x80]),
        rawPriv,
        Buffer.from([0x01]),
      ]);
      wif = base58Check(wifPayload);
    }

    return {
      address,
      publicKey: compressedPub.toString('hex'),
      wif,
      privateKeyDer: privateKey.toString('hex'),
      createdAt: new Date().toISOString(),
    };
  }

  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.walletFile, 'utf8'));
      if (data.address) {
        this.wallet = { ...data, source: 'file' };
        return this.wallet;
      }
    } catch { /* doesn't exist */ }
    return null;
  }

  save(wallet) {
    try {
      fs.mkdirSync(this.walletDir, { recursive: true });
      fs.writeFileSync(this.walletFile, JSON.stringify(wallet, null, 2), { mode: 0o600 });
      return true;
    } catch {
      return false;
    }
  }

  getOrCreate() {
    let wallet = this.load();
    if (!wallet) {
      wallet = this.generate();
      wallet.source = 'generated';
      this.save(wallet);
    }
    this.wallet = wallet;
    return wallet;
  }

  getAddress() {
    return this.wallet?.address || null;
  }

  export() {
    if (!this.wallet) return null;
    return {
      address: this.wallet.address,
      wif: this.wallet.wif,
      publicKey: this.wallet.publicKey,
      createdAt: this.wallet.createdAt,
    };
  }
}

// Stratum Protocol Client
class StratumClient extends EventEmitter {
  constructor(host, port) {
    super();
    this.host = host;
    this.port = port;
    this.sock = null;
    this.buf = '';
    this.id = 1;
    this.cbs = new Map();
    this.en1 = '';
    this.en2size = 4;
    this.diff = 1;
    this.connected = false;
  }

  connect(timeout = 15000) {
    return new Promise((resolve, reject) => {
      this.sock = net.createConnection({ host: this.host, port: this.port });
      this.sock.setEncoding('utf8');
      this.sock.setKeepAlive(true, 30000);

      const timer = setTimeout(() => {
        this.sock.destroy();
        reject(new Error('Connection timeout'));
      }, timeout);

      this.sock.on('connect', () => {
        clearTimeout(timer);
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.sock.on('data', (d) => {
        this.buf += d;
        this._drain();
      });

      this.sock.on('error', (e) => {
        clearTimeout(timer);
        this.connected = false;
        this.emit('error', e);
        reject(e);
      });

      this.sock.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });
    });
  }

  close() {
    if (this.sock) {
      this.sock.destroy();
      this.sock = null;
    }
    this.connected = false;
  }

  _call(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.sock.write(JSON.stringify({ id, method, params }) + '\n');
      this.cbs.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.cbs.has(id)) {
          this.cbs.get(id).reject(new Error(`Timeout: ${method}`));
          this.cbs.delete(id);
        }
      }, 30000);
    });
  }

  _drain() {
    const lines = this.buf.split('\n');
    this.buf = lines.pop();
    for (const ln of lines) {
      if (!ln.trim()) continue;
      try { this._handle(JSON.parse(ln)); } catch {}
    }
  }

  _handle(msg) {
    if (msg.id && this.cbs.has(msg.id)) {
      const cb = this.cbs.get(msg.id);
      this.cbs.delete(msg.id);
      msg.error ? cb.reject(new Error(JSON.stringify(msg.error))) : cb.resolve(msg.result);
      return;
    }
    if (msg.method === 'mining.notify') this.emit('job', msg.params);
    if (msg.method === 'mining.set_difficulty') {
      this.diff = msg.params[0];
      this.emit('difficulty', this.diff);
    }
  }

  async subscribe() {
    const r = await this._call('mining.subscribe', ['GentlyOS/1.0']);
    if (Array.isArray(r) && r.length >= 3) {
      this.en1 = r[1];
      this.en2size = r[2];
    }
    return r;
  }

  async authorize(user, pass) {
    return this._call('mining.authorize', [user, pass]);
  }

  async submit(user, jobId, en2, ntime, nonce) {
    return this._call('mining.submit', [user, jobId, en2, ntime, nonce]);
  }
}

// Block Header Builder
function buildHeader(version, prevHash, merkleRoot, timestamp, bits, nonce) {
  const h = Buffer.alloc(80);
  h.writeUInt32LE(version, 0);
  Buffer.from(prevHash, 'hex').copy(h, 4);
  Buffer.from(merkleRoot, 'hex').copy(h, 36);
  h.writeUInt32LE(timestamp, 68);
  h.writeUInt32LE(bits, 72);
  h.writeUInt32LE(nonce, 76);
  return h;
}

function targetFromBits(bitsHex) {
  const bits = parseInt(bitsHex, 16);
  const exp = (bits >> 24) & 0xff;
  const coeff = bits & 0x7fffff;
  const target = Buffer.alloc(32, 0);
  const shift = exp - 3;
  if (shift >= 0 && shift < 29) {
    target[32 - shift - 3] = (coeff >> 16) & 0xff;
    target[32 - shift - 2] = (coeff >> 8) & 0xff;
    target[32 - shift - 1] = coeff & 0xff;
  }
  return target;
}

function hashBeatsTarget(hash, target) {
  for (let i = 31; i >= 0; i--) {
    if (hash[i] < target[i]) return true;
    if (hash[i] > target[i]) return false;
  }
  return true;
}

function buildCoinbase(cb1, en1, en2, cb2) {
  return Buffer.from(cb1 + en1 + en2 + cb2, 'hex');
}

function buildMerkle(coinbaseTx, branches) {
  let hash = sha256d(coinbaseTx);
  for (const b of branches) {
    hash = sha256d(Buffer.concat([hash, Buffer.from(b, 'hex')]));
  }
  return hash;
}

function generateHints(prevHash, timestamp) {
  const hints = [];
  for (let b = 0; b < 4294967296; b += 477218588) {
    hints.push(b - (b % 9));
  }
  for (let b = 19; b < 4294967296; b += 477218588) {
    hints.push(b - (b % 22) + 19);
  }
  if (prevHash) {
    const pb = Buffer.from(prevHash, 'hex');
    let x = Z.XOR_KEY;
    for (let i = 0; i < Math.min(8, pb.length); i++) x ^= pb[i];
    const off = (x * Z.PHI_SEED) >>> 0;
    hints.push(off);
    hints.push(off - (off % 9));
    hints.push(off - (off % 22) + 19);
  }
  if (timestamp) {
    const ts = (timestamp * Z.XOR_KEY) >>> 0;
    hints.push(ts);
    hints.push(ts - (ts % 9));
  }
  return [...new Set(hints)].map(n => n >>> 0).filter(n => n < 4294967296);
}

// Main Miner Client
class MinerClient extends EventEmitter {
  constructor() {
    super();
    this.state = MINER_STATE.IDLE;
    this.wallet = new WalletManager();
    this.stratum = null;
    this.config = {
      poolHost: 'ss.antpool.com',
      poolPort: 443,
      worker: 'gentlyos',
      password: 'x',
      nonceRange: 2000000,
      useHints: true,
      maxRotations: 0, // 0 = unlimited
    };
    this.stats = {
      totalHashes: 0,
      hashrate: 0,
      rotations: 0,
      bestZeros: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      blocksFound: 0,
      startTime: null,
      lastUpdate: null,
    };
    this.running = false;
    this.miningLoop = null;
    this.jobQueue = [];
    this.en2counter = 0;
    this.statsInterval = null;
  }

  // Configure miner
  configure(options = {}) {
    Object.assign(this.config, options);
    return { success: true, config: this.config };
  }

  // Set pool from preset
  setPool(presetName) {
    const preset = POOL_PRESETS[presetName];
    if (!preset) {
      return { success: false, error: 'Unknown pool preset' };
    }
    this.config.poolHost = preset.host;
    this.config.poolPort = preset.port;
    return { success: true, pool: preset };
  }

  // Get available pool presets
  getPoolPresets() {
    return { success: true, presets: POOL_PRESETS };
  }

  // Initialize wallet
  initWallet() {
    const wallet = this.wallet.getOrCreate();
    this.emit('wallet', wallet);
    return {
      success: true,
      wallet: {
        address: wallet.address,
        source: wallet.source,
        createdAt: wallet.createdAt,
      },
    };
  }

  // Get wallet info
  getWallet() {
    const wallet = this.wallet.export();
    if (!wallet) {
      return { success: false, error: 'No wallet loaded' };
    }
    return { success: true, wallet };
  }

  // Start mining
  async start() {
    if (this.running) {
      return { success: false, error: 'Already running' };
    }

    // Ensure wallet
    if (!this.wallet.wallet) {
      this.initWallet();
    }

    this.state = MINER_STATE.CONNECTING;
    this.emit('state', this.state);

    // Connect to pool
    this.stratum = new StratumClient(this.config.poolHost, this.config.poolPort);

    try {
      await this.stratum.connect();
    } catch (err) {
      this.state = MINER_STATE.ERROR;
      this.emit('state', this.state);
      this.emit('error', { type: 'connection', message: err.message });
      return { success: false, error: `Connection failed: ${err.message}` };
    }

    // Subscribe and authorize
    try {
      await this.stratum.subscribe();
      const user = `${this.wallet.getAddress()}.${this.config.worker}`;
      await this.stratum.authorize(user, this.config.password);
    } catch (err) {
      this.stratum.close();
      this.state = MINER_STATE.ERROR;
      this.emit('state', this.state);
      return { success: false, error: `Auth failed: ${err.message}` };
    }

    // Set up job handler
    this.stratum.on('job', (params) => {
      if (!params || params.length < 9) return;
      const job = {
        id: params[0],
        prevHash: params[1],
        coinbase1: params[2],
        coinbase2: params[3],
        merkleBranch: params[4],
        version: params[5],
        nbits: params[6],
        ntime: params[7],
        clean: params[8],
      };
      this.jobQueue.push(job);
      this.emit('job', { id: job.id, clean: job.clean });
    });

    this.stratum.on('difficulty', (diff) => {
      this.emit('difficulty', diff);
    });

    // Start mining loop
    this.running = true;
    this.state = MINER_STATE.MINING;
    this.stats.startTime = Date.now();
    this.emit('state', this.state);
    this.emit('started');

    // Stats updater
    this.statsInterval = setInterval(() => {
      this._updateStats();
      this.emit('stats', this.getStats().stats);
    }, 5000);

    // Run mining loop async
    this._mineLoop();

    return { success: true, message: 'Mining started' };
  }

  // Stop mining
  stop() {
    if (!this.running) {
      return { success: false, error: 'Not running' };
    }

    this.running = false;
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    if (this.stratum) {
      this.stratum.close();
      this.stratum = null;
    }
    this.state = MINER_STATE.STOPPED;
    this.emit('state', this.state);
    this.emit('stopped', this.getStats().stats);

    return { success: true, stats: this.getStats().stats };
  }

  // Pause mining
  pause() {
    if (this.state !== MINER_STATE.MINING) {
      return { success: false, error: 'Not mining' };
    }
    this.state = MINER_STATE.PAUSED;
    this.emit('state', this.state);
    return { success: true };
  }

  // Resume mining
  resume() {
    if (this.state !== MINER_STATE.PAUSED) {
      return { success: false, error: 'Not paused' };
    }
    this.state = MINER_STATE.MINING;
    this.emit('state', this.state);
    return { success: true };
  }

  // Get current state
  getState() {
    return {
      success: true,
      state: this.state,
      running: this.running,
      connected: this.stratum?.connected || false,
    };
  }

  // Get stats
  getStats() {
    this._updateStats();
    return {
      success: true,
      stats: { ...this.stats },
    };
  }

  // Reset stats
  resetStats() {
    this.stats = {
      totalHashes: 0,
      hashrate: 0,
      rotations: 0,
      bestZeros: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      blocksFound: 0,
      startTime: this.running ? Date.now() : null,
      lastUpdate: null,
    };
    return { success: true };
  }

  // Get config
  getConfig() {
    return { success: true, config: this.config };
  }

  // Update hashrate calculation
  _updateStats() {
    if (this.stats.startTime) {
      const elapsed = (Date.now() - this.stats.startTime) / 1000;
      this.stats.hashrate = elapsed > 0 ? Math.round(this.stats.totalHashes / elapsed) : 0;
    }
    this.stats.lastUpdate = Date.now();
  }

  // Mine nonce range
  _mineRange(header, target, start, end) {
    let best = 0;
    let count = 0;

    for (let nonce = start; nonce <= end; nonce++) {
      header.writeUInt32LE(nonce, 76);
      const hash = sha256d(header);
      count++;

      let zeros = 0;
      for (let i = 31; i >= 0; i--) {
        if (hash[i] === 0) zeros++; else break;
      }
      if (zeros > best) best = zeros;

      if (hashBeatsTarget(hash, target)) {
        return {
          found: true,
          nonce,
          nonceHex: nonce.toString(16).padStart(8, '0'),
          hash: Buffer.from(hash).reverse().toString('hex'),
          count,
          best,
        };
      }
    }

    return { found: false, count, best };
  }

  // Main mining loop
  async _mineLoop() {
    while (this.running) {
      // Wait for job
      if (this.jobQueue.length === 0 || this.state === MINER_STATE.PAUSED) {
        await this._sleep(100);
        continue;
      }

      // Get latest job
      const job = this.jobQueue.pop();
      if (job.clean) this.jobQueue.length = 0;
      this.jobQueue.length = 0;

      // Check rotation limit
      if (this.config.maxRotations > 0 && this.stats.rotations >= this.config.maxRotations) {
        this.emit('rotation-limit');
        this.stop();
        return;
      }

      const target = targetFromBits(job.nbits);

      // Generate extraNonce2
      this.en2counter++;
      const en2 = this.en2counter.toString(16).padStart(this.stratum.en2size * 2, '0');

      // Build coinbase + merkle
      const coinbase = buildCoinbase(job.coinbase1, this.stratum.en1, en2, job.coinbase2);
      const merkle = buildMerkle(coinbase, job.merkleBranch);

      const version = parseInt(job.version, 16);
      const bits = parseInt(job.nbits, 16);
      const timestamp = parseInt(job.ntime, 16);
      const header = buildHeader(version, job.prevHash, merkle.toString('hex'), timestamp, bits, 0);

      // Phase 1: Z3RO2Z hints
      if (this.config.useHints) {
        const hints = generateHints(job.prevHash, timestamp);
        for (const hint of hints) {
          if (!this.running || this.jobQueue.length > 0) break;

          const start = Math.max(0, hint - 500);
          const end = Math.min(0xFFFFFFFF, hint + 500);
          const r = this._mineRange(header, target, start, end);
          this.stats.totalHashes += r.count;
          if (r.best > this.stats.bestZeros) this.stats.bestZeros = r.best;

          if (r.found) {
            await this._onBlockFound(job, en2, r);
            if (!this.running) return;
            break;
          }
        }
      }

      // Phase 2: Standard sweep
      if (!this.running || this.jobQueue.length > 0) continue;

      const rangeStart = (this.stats.rotations * this.config.nonceRange) % 0xFFFFFFFF;
      const rangeEnd = Math.min(rangeStart + this.config.nonceRange, 0xFFFFFFFF);

      const CHUNK = 250000;
      for (let start = rangeStart; start < rangeEnd && this.running; start += CHUNK) {
        if (this.jobQueue.length > 0) break;

        const end = Math.min(start + CHUNK - 1, rangeEnd);
        const r = this._mineRange(header, target, start, end);
        this.stats.totalHashes += r.count;
        if (r.best > this.stats.bestZeros) this.stats.bestZeros = r.best;

        if (r.found) {
          await this._onBlockFound(job, en2, r);
          if (!this.running) return;
          break;
        }
      }

      this.stats.rotations++;
      this.emit('rotation', this.stats.rotations);
    }
  }

  // Handle block found
  async _onBlockFound(job, en2, result) {
    this.stats.blocksFound++;
    this.emit('block-found', {
      nonce: result.nonceHex,
      hash: result.hash,
      zeros: result.best,
    });

    const user = `${this.wallet.getAddress()}.${this.config.worker}`;
    try {
      const accepted = await this.stratum.submit(user, job.id, en2, job.ntime, result.nonceHex);
      if (accepted) {
        this.stats.sharesAccepted++;
        this.emit('share-accepted', { nonce: result.nonceHex });
      } else {
        this.stats.sharesRejected++;
        this.emit('share-rejected', { nonce: result.nonceHex });
      }
    } catch (err) {
      this.stats.sharesRejected++;
      this.emit('submit-error', { error: err.message });
    }

    // Auto-stop on block win
    this.emit('block-won');
    this.stop();
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Get Z3RO2Z constants
  getZ3RO2ZConstants() {
    return { success: true, constants: Z };
  }
}

module.exports = {
  MinerClient,
  WalletManager,
  StratumClient,
  MINER_STATE,
  POOL_PRESETS,
  Z3RO2Z: Z,
};
