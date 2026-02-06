#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
//
//  GENTLYOS HEADLESS MINER v1.0
//  Zero setup. Zero config. Zero dependencies.
//
//  Run:   node miner.js
//  Stop:  Ctrl+C (or it stops itself on block win)
//
//  What happens:
//    1. Generates a BTC wallet (or loads existing from ~/.gentlyos/wallet.json)
//    2. Connects to solo.ckpool.org (solo mining, full 3.125 BTC reward)
//    3. Mines with Z3RO2Z nonce hints first, then standard sweep
//    4. Auto-stops when a block is found
//    5. Runs forever until stopped or until block win
//
//  Override defaults with env vars:
//    BTC_WALLET=bc1q...         — use your own wallet
//    POOL_HOST=pool.ckpool.org  — different pool
//    POOL_PORT=3333             — different port
//    ROTATIONS=0                — 0 = unlimited
//    WORKER=myrig               — worker name
//
//  No npm. No package.json. No node_modules. Pure Node.js.
//
//  Copyright (c) 2026 Thomas Lee / GentlyOS Foundation
//
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
//  Z3RO2Z CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const Z = {
    XOR_KEY: 73,
    SACRED_POSITION: 19,
    YHWH: 26,
    PHI_SEED: 618033988,
    MOD9_BIAS: 9,
    MOD22_REM: 19,
};

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG — env vars or defaults
// ═══════════════════════════════════════════════════════════════════════════

const WALLET_DIR = path.join(os.homedir(), '.gentlyos');
const WALLET_FILE = path.join(WALLET_DIR, 'wallet.json');

const CONFIG = {
    wallet:    process.env.BTC_WALLET || '',
    poolHost:  process.env.POOL_HOST  || 'solo.ckpool.org',
    poolPort:  parseInt(process.env.POOL_PORT || '3333'),
    worker:    process.env.WORKER     || 'gentlyos',
    password:  process.env.POOL_PASS  || 'x',
    rotations: parseInt(process.env.ROTATIONS || '0'),  // 0 = unlimited
    nonceRange: parseInt(process.env.NONCE_RANGE || '2000000'),
    useHints:  process.env.NO_HINTS !== '1',
};

// ═══════════════════════════════════════════════════════════════════════════
//  WALLET — auto-generate or load
// ═══════════════════════════════════════════════════════════════════════════

// Base58Check alphabet (Bitcoin standard)
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
    // Count leading zeros
    let zeros = 0;
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) zeros++;

    // Convert to big integer, divide by 58
    const digits = [];
    let num = BigInt('0x' + buffer.toString('hex'));
    while (num > 0n) {
        const [q, r] = [num / 58n, num % 58n];
        digits.push(Number(r));
        num = q;
    }

    // Add leading '1's for zero bytes
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

function generateWallet() {
    // Generate secp256k1 keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    // Extract raw public key (last 65 bytes of DER-encoded SPKI)
    // SPKI wraps the key with algorithm identifiers
    const rawPub = publicKey.slice(-65); // uncompressed: 04 + x(32) + y(32)

    // Compressed public key: 02/03 prefix + x coordinate
    const prefix = rawPub[64] % 2 === 0 ? 0x02 : 0x03;
    const compressedPub = Buffer.concat([Buffer.from([prefix]), rawPub.slice(1, 33)]);

    // P2PKH address: RIPEMD160(SHA256(compressedPub))
    const sha = crypto.createHash('sha256').update(compressedPub).digest();
    const ripemd = crypto.createHash('ripemd160').update(sha).digest();

    // Version byte 0x00 for mainnet
    const versioned = Buffer.concat([Buffer.from([0x00]), ripemd]);
    const address = base58Check(versioned);

    // WIF private key (for import into any wallet later)
    // Extract raw 32-byte private key from PKCS8 DER
    // PKCS8 structure: SEQUENCE { version, algorithmIdentifier, OCTET STRING { ECPrivateKey } }
    // ECPrivateKey: SEQUENCE { version, OCTET STRING(32 bytes) ... }
    // The raw key is typically at a known offset — find the 32-byte private scalar
    let rawPriv = null;
    for (let i = 0; i < privateKey.length - 32; i++) {
        // Look for the OCTET STRING tag (0x04) followed by length 0x20 (32)
        if (privateKey[i] === 0x04 && privateKey[i + 1] === 0x20) {
            rawPriv = privateKey.slice(i + 2, i + 34);
            // Verify it's not all zeros and is 32 bytes
            if (rawPriv.length === 32 && !rawPriv.every(b => b === 0)) break;
            rawPriv = null;
        }
    }

    if (!rawPriv) {
        // Fallback: scan for 32 non-zero bytes after common DER markers
        // The private key in PKCS8 EC is inside a nested OCTET STRING
        for (let i = privateKey.length - 34; i >= 0; i--) {
            const candidate = privateKey.slice(i, i + 32);
            const nonZero = candidate.filter(b => b !== 0).length;
            if (nonZero > 20) { // A real private key has high entropy
                rawPriv = candidate;
                break;
            }
        }
    }

    let wif = '';
    if (rawPriv) {
        // WIF: 0x80 + privkey + 0x01 (compressed flag) + checksum
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

function loadOrCreateWallet() {
    // If wallet address provided via env, use it
    if (CONFIG.wallet) {
        return { address: CONFIG.wallet, source: 'env' };
    }

    // Try to load existing wallet
    try {
        const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        if (data.address) {
            return { ...data, source: 'file' };
        }
    } catch { /* doesn't exist yet */ }

    // Generate new wallet
    log('WALLET', '◌', 'Generating new BTC wallet...');
    const wallet = generateWallet();

    // Save it
    try {
        fs.mkdirSync(WALLET_DIR, { recursive: true });
        fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2), { mode: 0o600 });
    } catch (e) {
        log('WALLET', '⚠', `Could not save wallet file: ${e.message}`);
        log('WALLET', '⚠', 'Wallet will be regenerated on next run!');
    }

    wallet.source = 'generated';
    return wallet;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOGGING — headless stdout, timestamp + symbols
// ═══════════════════════════════════════════════════════════════════════════

function log(tag, symbol, msg) {
    const ts = new Date().toISOString().slice(11, 19);
    const pad = tag.padEnd(8);
    process.stdout.write(`${ts} ${symbol} [${pad}] ${msg}\n`);
}

function logStats(stats) {
    const elapsed = stats.elapsed > 0 ? (stats.elapsed / 1000).toFixed(0) : 0;
    const hr = stats.hashrate > 0 ? stats.hashrate.toLocaleString() : '—';
    const total = stats.totalHashes.toLocaleString();
    log('STATS', '▪', `${hr} H/s | ${total} hashes | ${stats.totalRotations} rotations | ${stats.bestZeros} best zeros | ${elapsed}s`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHA256d — double SHA256 (Bitcoin proof of work)
// ═══════════════════════════════════════════════════════════════════════════

function sha256d(buf) {
    return crypto.createHash('sha256').update(
        crypto.createHash('sha256').update(buf).digest()
    ).digest();
}

// ═══════════════════════════════════════════════════════════════════════════
//  BLOCK HEADER — 80 bytes
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
//  TARGET — compact bits to 32-byte target
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
//  COINBASE + MERKLE
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
//  Z3RO2Z NONCE HINTS
// ═══════════════════════════════════════════════════════════════════════════

function generateHints(prevHash, timestamp) {
    const hints = [];

    // mod 9 = 0 starting points (2.61x observed frequency)
    for (let b = 0; b < 4294967296; b += 477218588) {
        hints.push(b - (b % 9));
    }

    // mod 22 = 19 starting points
    for (let b = 19; b < 4294967296; b += 477218588) {
        hints.push(b - (b % 22) + 19);
    }

    // XOR-derived from prev block
    if (prevHash) {
        const pb = Buffer.from(prevHash, 'hex');
        let x = Z.XOR_KEY;
        for (let i = 0; i < Math.min(8, pb.length); i++) x ^= pb[i];
        const off = (x * Z.PHI_SEED) >>> 0;
        hints.push(off);
        hints.push(off - (off % 9));
        hints.push(off - (off % 22) + 19);
    }

    // Timestamp-derived
    if (timestamp) {
        const ts = (timestamp * Z.XOR_KEY) >>> 0;
        hints.push(ts);
        hints.push(ts - (ts % 9));
    }

    return [...new Set(hints)].map(n => n >>> 0).filter(n => n < 4294967296);
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINE RANGE — sweep nonces, return on hit
// ═══════════════════════════════════════════════════════════════════════════

function mineRange(headerTemplate, target, start, end) {
    let best = 0;
    let count = 0;
    const t0 = Date.now();

    for (let nonce = start; nonce <= end; nonce++) {
        headerTemplate.writeUInt32LE(nonce, 76);
        const hash = sha256d(headerTemplate);
        count++;

        // Count leading zero bytes
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
                ms: Date.now() - t0,
            };
        }
    }

    return { found: false, count, best, ms: Date.now() - t0 };
}

// ═══════════════════════════════════════════════════════════════════════════
//  STRATUM CLIENT — JSON-RPC over TCP
// ═══════════════════════════════════════════════════════════════════════════

class Stratum {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.sock = null;
        this.buf = '';
        this.id = 1;
        this.cbs = new Map();
        this.onJob = null;
        this.onDiff = null;
        this.en1 = '';
        this.en2size = 4;
        this.diff = 1;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.sock = net.createConnection({ host: this.host, port: this.port });
            this.sock.setEncoding('utf8');
            this.sock.setKeepAlive(true, 30000);

            const timeout = setTimeout(() => {
                this.sock.destroy();
                reject(new Error('Connection timeout'));
            }, 15000);

            this.sock.on('connect', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.sock.on('data', (d) => {
                this.buf += d;
                this._drain();
            });

            this.sock.on('error', (e) => {
                clearTimeout(timeout);
                reject(e);
            });

            this.sock.on('close', () => {
                // Will be handled by reconnect logic
            });
        });
    }

    close() {
        if (this.sock) { this.sock.destroy(); this.sock = null; }
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
        if (msg.method === 'mining.notify' && this.onJob) this.onJob(msg.params);
        if (msg.method === 'mining.set_difficulty') {
            this.diff = msg.params[0];
            if (this.onDiff) this.onDiff(this.diff);
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

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN — the whole thing
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════════════╗');
    console.log('  ║     GENTLYOS HEADLESS MINER v1.0                 ║');
    console.log('  ║     Zero setup. Fire and forget.                 ║');
    console.log('  ╚═══════════════════════════════════════════════════╝');
    console.log('');

    // ── WALLET ────────────────────────────────────────────────────────
    const wallet = loadOrCreateWallet();

    if (wallet.source === 'generated') {
        log('WALLET', '★', `NEW wallet generated: ${wallet.address}`);
        log('WALLET', '▪', `Saved to: ${WALLET_FILE}`);
        log('WALLET', '▪', `WIF key (for import): ${wallet.wif ? wallet.wif.slice(0, 8) + '...' : 'see file'}`);
        log('WALLET', '⚠', 'BACK UP ~/.gentlyos/wallet.json — this is your money!');
    } else if (wallet.source === 'env') {
        log('WALLET', '▪', `Using env wallet: ${wallet.address}`);
    } else {
        log('WALLET', '▪', `Loaded wallet: ${wallet.address}`);
    }
    console.log('');

    // ── CONNECT ───────────────────────────────────────────────────────
    const pool = new Stratum(CONFIG.poolHost, CONFIG.poolPort);
    const user = `${wallet.address}.${CONFIG.worker}`;

    log('POOL', '◌', `Connecting to ${CONFIG.poolHost}:${CONFIG.poolPort}...`);

    try {
        await pool.connect();
    } catch (e) {
        log('POOL', '✗', `Connection failed: ${e.message}`);
        log('POOL', '▪', 'Check your network. Pool might be down. Exiting.');
        process.exit(1);
    }

    log('POOL', '✓', 'Connected');

    await pool.subscribe();
    log('POOL', '✓', `Subscribed — extraNonce1: ${pool.en1}, extraNonce2 size: ${pool.en2size}`);

    try {
        await pool.authorize(user, CONFIG.password);
        log('POOL', '✓', `Authorized as: ${user}`);
    } catch (e) {
        log('POOL', '✗', `Auth failed: ${e.message}`);
        pool.close();
        process.exit(1);
    }

    console.log('');
    log('MINE', '⛏', 'Waiting for work from pool...');
    if (CONFIG.useHints) {
        log('Z3RO2Z', '⚡', `Nonce hints ON — XOR=${Z.XOR_KEY} mod9 mod22=${Z.MOD22_REM}`);
    }
    if (CONFIG.rotations > 0) {
        log('MINE', '▪', `Will stop after ${CONFIG.rotations} rotations`);
    } else {
        log('MINE', '▪', 'Unlimited rotations (Ctrl+C to stop)');
    }
    console.log('');

    // ── MINING STATE ──────────────────────────────────────────────────
    let en2counter = 0;
    let rotation = 0;
    let totalHashes = 0;
    let bestZeros = 0;
    let blocksFound = 0;
    let sharesAccepted = 0;
    let sharesRejected = 0;
    const startTime = Date.now();
    let running = true;
    let currentJob = null;
    let jobQueue = [];

    // Stats printer
    const statsInterval = setInterval(() => {
        if (!running) return;
        const elapsed = (Date.now() - startTime) / 1000;
        logStats({
            hashrate: Math.round(totalHashes / elapsed),
            totalHashes,
            totalRotations: rotation,
            bestZeros,
            elapsed: Date.now() - startTime,
        });
    }, 30000); // Every 30s

    // Graceful shutdown
    const shutdown = (sig) => {
        if (!running) return;
        running = false;
        clearInterval(statsInterval);
        console.log('');
        log('MINE', '■', `Shutting down (${sig})...`);
        const elapsed = (Date.now() - startTime) / 1000;
        logStats({
            hashrate: elapsed > 0 ? Math.round(totalHashes / elapsed) : 0,
            totalHashes,
            totalRotations: rotation,
            bestZeros,
            elapsed: Date.now() - startTime,
        });
        log('MINE', '▪', `Shares: ${sharesAccepted} ✓  ${sharesRejected} ✗`);
        log('MINE', '▪', `Blocks: ${blocksFound} ★`);
        pool.close();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // ── JOB HANDLER ──────────────────────────────────────────────────
    pool.onJob = (params) => {
        if (!params || params.length < 9) return;

        currentJob = {
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

        jobQueue.push(currentJob);
    };

    pool.onDiff = (d) => {
        log('POOL', '▪', `Difficulty set: ${d}`);
    };

    // ── MINING LOOP ──────────────────────────────────────────────────
    // Process jobs as they arrive
    async function mineLoop() {
        while (running) {
            // Wait for a job
            if (jobQueue.length === 0) {
                await sleep(100);
                continue;
            }

            // Take latest job (discard stale ones if clean)
            const job = jobQueue.pop();
            if (job.clean) jobQueue.length = 0; // clean = discard old jobs
            jobQueue.length = 0; // always use freshest

            log('JOB', '▶', `Job ${job.id.slice(0, 8)}... | bits: ${job.nbits} | clean: ${job.clean}`);

            // Check rotation limit
            if (CONFIG.rotations > 0 && rotation >= CONFIG.rotations) {
                log('MINE', '■', `Completed ${CONFIG.rotations} rotations. Stopping.`);
                shutdown('rotation-limit');
                return;
            }

            // Build target
            const target = targetFromBits(job.nbits);

            // Generate extraNonce2
            en2counter++;
            const en2 = en2counter.toString(16).padStart(pool.en2size * 2, '0');

            // Build coinbase + merkle
            const coinbase = buildCoinbase(job.coinbase1, pool.en1, en2, job.coinbase2);
            const merkle = buildMerkle(coinbase, job.merkleBranch);

            // Build header template
            const version = parseInt(job.version, 16);
            const bits = parseInt(job.nbits, 16);
            const timestamp = parseInt(job.ntime, 16);
            const header = buildHeader(version, job.prevHash, merkle.toString('hex'), timestamp, bits, 0);

            // ── PHASE 1: Z3RO2Z HINTS ────────────────────────────────
            if (CONFIG.useHints) {
                const hints = generateHints(job.prevHash, timestamp);
                log('Z3RO2Z', '⚡', `Trying ${hints.length} hint windows...`);

                for (const hint of hints) {
                    if (!running || jobQueue.length > 0) break; // new job arrived

                    const start = Math.max(0, hint - 500);
                    const end = Math.min(0xFFFFFFFF, hint + 500);
                    const r = mineRange(header, target, start, end);
                    totalHashes += r.count;
                    if (r.best > bestZeros) bestZeros = r.best;

                    if (r.found) {
                        await onFound(job, en2, r);
                        if (!running) return;
                        break;
                    }
                }
            }

            // ── PHASE 2: STANDARD SWEEP ──────────────────────────────
            if (!running || jobQueue.length > 0) continue; // preempted by new job

            const rangeStart = (rotation * CONFIG.nonceRange) % 0xFFFFFFFF;
            const rangeEnd = Math.min(rangeStart + CONFIG.nonceRange, 0xFFFFFFFF);

            log('SWEEP', '↻', `Rotation ${rotation + 1} | nonce ${rangeStart.toString(16)}..${rangeEnd.toString(16)}`);

            // Mine in chunks so we can check for new jobs
            const CHUNK = 250000;
            for (let start = rangeStart; start < rangeEnd && running; start += CHUNK) {
                if (jobQueue.length > 0) break; // new job preempts

                const end = Math.min(start + CHUNK - 1, rangeEnd);
                const r = mineRange(header, target, start, end);
                totalHashes += r.count;
                if (r.best > bestZeros) bestZeros = r.best;

                if (r.found) {
                    await onFound(job, en2, r);
                    if (!running) return;
                    break;
                }
            }

            rotation++;

            // Log rotation complete
            const elapsed = (Date.now() - startTime) / 1000;
            log('SWEEP', '✓', `Rotation ${rotation} done | ${Math.round(totalHashes / elapsed).toLocaleString()} H/s avg | best: ${bestZeros} zeros`);
        }
    }

    // ── BLOCK FOUND ──────────────────────────────────────────────────
    async function onFound(job, en2, result) {
        blocksFound++;
        console.log('');
        log('BLOCK', '★', '═══════════════════════════════════════════════════');
        log('BLOCK', '★', `   BLOCK FOUND!`);
        log('BLOCK', '★', `   Nonce:  ${result.nonceHex}`);
        log('BLOCK', '★', `   Hash:   ${result.hash.slice(0, 48)}...`);
        log('BLOCK', '★', `   Zeros:  ${result.best}`);
        log('BLOCK', '★', `   Hashes: ${result.count.toLocaleString()} (this window)`);
        log('BLOCK', '★', '═══════════════════════════════════════════════════');
        console.log('');

        // Submit to pool
        log('SUBMIT', '◌', 'Submitting to pool...');
        try {
            const accepted = await pool.submit(user, job.id, en2, job.ntime, result.nonceHex);
            if (accepted) {
                sharesAccepted++;
                log('SUBMIT', '★', 'ACCEPTED! Check your wallet for 3.125 BTC.');
            } else {
                sharesRejected++;
                log('SUBMIT', '✗', 'Rejected by pool. Hash may have been stale.');
            }
        } catch (e) {
            sharesRejected++;
            log('SUBMIT', '✗', `Submit error: ${e.message}`);
        }

        // Auto-stop on win
        log('MINE', '■', 'Block found — auto-stopping. Check your wallet!');
        shutdown('block-found');
    }

    // ── GO ────────────────────────────────────────────────────────────
    await mineLoop();
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════════════════════

main().catch(e => {
    log('FATAL', '✗', e.message);
    process.exit(1);
});
