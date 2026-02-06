// GentlyOS Dance Client - Device Pairing Protocol
// Two-device pairing with visual/audio call-and-response for XOR secret reconstruction

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'dnc') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Dance session states
const DANCE_STATE = {
  DORMANT: 'dormant',        // Not started
  READY: 'ready',            // Waiting to begin
  INIT: 'init',              // Initial handshake
  CHALLENGE: 'challenge',    // Challenge sent
  EXCHANGE: 'exchange',      // Key fragment exchange
  VERIFY: 'verify',          // Verification step
  AUDIT: 'audit',            // Contract audit
  COMPLETE: 'complete',      // Successfully completed
  FAILED: 'failed',          // Failed/aborted
};

// Dance roles
const DANCE_ROLE = {
  LOCK: 'lock',              // Device holding the lock fragment
  KEY: 'key',                // Device holding the key fragment
};

// Condition types for contracts
const CONDITION_TYPE = {
  TOKEN_BALANCE: 'token_balance',    // Must hold X tokens
  TIME_WINDOW: 'time_window',        // Must be within time range
  DEVICE_PRESENT: 'device_present',  // Specific device must be present
  NFT_HOLDER: 'nft_holder',          // Must hold specific NFT
  LOCATION: 'location',              // Geographic restriction
  CUSTOM: 'custom',                  // Custom condition
};

// Audit results
const AUDIT_RESULT = {
  PASS: 'pass',
  INVALID_SIGNATURE: 'invalid_signature',
  EXPIRED: 'expired',
  CONDITION_FAILED: 'condition_failed',
  MISMATCH: 'mismatch',
};

// Contract condition
class Condition {
  constructor(type, params = {}) {
    this.id = generateId('cond');
    this.type = type;
    this.params = params;
    this.verified = false;
    this.verifiedAt = null;
  }

  // Check if condition is met (simulated)
  check(context = {}) {
    switch (this.type) {
      case CONDITION_TYPE.TOKEN_BALANCE:
        return (context.balance || 0) >= (this.params.minBalance || 0);

      case CONDITION_TYPE.TIME_WINDOW:
        const now = Date.now();
        const start = this.params.start || 0;
        const end = this.params.end || Infinity;
        return now >= start && now <= end;

      case CONDITION_TYPE.DEVICE_PRESENT:
        return context.deviceId === this.params.deviceId;

      case CONDITION_TYPE.LOCATION:
        // Simplified - just check region
        return context.region === this.params.region;

      case CONDITION_TYPE.CUSTOM:
        // Custom conditions would need external verification
        return this.params.result === true;

      default:
        return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      params: this.params,
      verified: this.verified,
      verifiedAt: this.verifiedAt,
    };
  }

  static fromJSON(json) {
    const cond = new Condition(json.type, json.params);
    cond.id = json.id;
    cond.verified = json.verified;
    cond.verifiedAt = json.verifiedAt;
    return cond;
  }
}

// Dance contract (access control with conditions)
class Contract {
  constructor(creator, description = '') {
    this.id = generateId('contract');
    this.creator = creator;
    this.description = description;
    this.conditions = [];
    this.expiryBlock = null;       // Block height expiry
    this.expiryTime = null;        // Timestamp expiry
    this.signature = null;
    this.signedBy = null;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
    this.metadata = {};
  }

  // Add condition
  addCondition(condition) {
    this.conditions.push(condition);
    this.modifiedAt = Date.now();
    return this;
  }

  // Set expiry
  setExpiry(blockHeight = null, timestamp = null) {
    this.expiryBlock = blockHeight;
    this.expiryTime = timestamp;
    this.modifiedAt = Date.now();
    return this;
  }

  // Check if contract is expired
  isExpired() {
    if (this.expiryTime && Date.now() > this.expiryTime) {
      return true;
    }
    // Block height check would need chain connection
    return false;
  }

  // Sign contract
  sign(secret) {
    const data = JSON.stringify({
      id: this.id,
      creator: this.creator,
      conditions: this.conditions.map(c => c.toJSON()),
      expiry: { block: this.expiryBlock, time: this.expiryTime },
    });
    this.signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    this.signedBy = this.creator;
    this.modifiedAt = Date.now();
    return this;
  }

  // Verify signature
  verifySignature(secret) {
    if (!this.signature) return false;
    const data = JSON.stringify({
      id: this.id,
      creator: this.creator,
      conditions: this.conditions.map(c => c.toJSON()),
      expiry: { block: this.expiryBlock, time: this.expiryTime },
    });
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return this.signature === expected;
  }

  // Check all conditions
  checkConditions(context = {}) {
    const results = [];
    for (const cond of this.conditions) {
      const passed = cond.check(context);
      if (passed) {
        cond.verified = true;
        cond.verifiedAt = Date.now();
      }
      results.push({
        conditionId: cond.id,
        type: cond.type,
        passed,
      });
    }
    return {
      allPassed: results.every(r => r.passed),
      results,
    };
  }

  toJSON() {
    return {
      id: this.id,
      creator: this.creator,
      description: this.description,
      conditions: this.conditions.map(c => c.toJSON()),
      expiryBlock: this.expiryBlock,
      expiryTime: this.expiryTime,
      signature: this.signature,
      signedBy: this.signedBy,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      metadata: this.metadata,
      expired: this.isExpired(),
    };
  }

  static fromJSON(json) {
    const contract = new Contract(json.creator, json.description);
    contract.id = json.id;
    contract.conditions = (json.conditions || []).map(c => Condition.fromJSON(c));
    contract.expiryBlock = json.expiryBlock;
    contract.expiryTime = json.expiryTime;
    contract.signature = json.signature;
    contract.signedBy = json.signedBy;
    contract.createdAt = json.createdAt;
    contract.modifiedAt = json.modifiedAt;
    contract.metadata = json.metadata || {};
    return contract;
  }
}

// Dance session (orchestrates the handshake)
class DanceSession {
  constructor(role) {
    this.id = generateId('sess');
    this.role = role;
    this.state = DANCE_STATE.DORMANT;
    this.contract = null;
    this.localFragment = null;     // This device's secret fragment
    this.remoteFragment = null;    // Received from peer
    this.reconstructedSecret = null;
    this.challenge = null;
    this.response = null;
    this.auditResult = null;
    this.peerDeviceId = null;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
    this.history = [];             // State transition history
  }

  // Record state transition
  transition(newState, data = {}) {
    this.history.push({
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      data,
    });
    this.state = newState;
    this.modifiedAt = Date.now();
  }

  // Wake session (ready to begin)
  wake() {
    if (this.state !== DANCE_STATE.DORMANT) {
      return { success: false, error: 'Session already active' };
    }
    this.transition(DANCE_STATE.READY);
    return { success: true, state: this.state };
  }

  // Initialize handshake
  init(peerDeviceId) {
    if (this.state !== DANCE_STATE.READY) {
      return { success: false, error: 'Session not ready' };
    }
    this.peerDeviceId = peerDeviceId;
    this.transition(DANCE_STATE.INIT, { peerDeviceId });
    return { success: true, state: this.state };
  }

  // Generate challenge
  generateChallenge() {
    if (this.state !== DANCE_STATE.INIT) {
      return { success: false, error: 'Not in init state' };
    }
    this.challenge = crypto.randomBytes(32).toString('hex');
    this.transition(DANCE_STATE.CHALLENGE);
    return { success: true, challenge: this.challenge, state: this.state };
  }

  // Respond to challenge
  respondToChallenge(challenge, localFragment) {
    if (this.state !== DANCE_STATE.INIT && this.state !== DANCE_STATE.CHALLENGE) {
      return { success: false, error: 'Not in valid state for challenge response' };
    }
    this.localFragment = localFragment;
    this.response = crypto.createHmac('sha256', localFragment)
      .update(challenge)
      .digest('hex');
    this.transition(DANCE_STATE.EXCHANGE);
    return { success: true, response: this.response, state: this.state };
  }

  // Exchange fragment
  exchange(remoteFragment) {
    if (this.state !== DANCE_STATE.EXCHANGE) {
      return { success: false, error: 'Not in exchange state' };
    }
    this.remoteFragment = remoteFragment;

    // XOR reconstruction
    if (this.localFragment && this.remoteFragment) {
      const localBuf = Buffer.from(this.localFragment, 'hex');
      const remoteBuf = Buffer.from(this.remoteFragment, 'hex');
      const minLen = Math.min(localBuf.length, remoteBuf.length);
      const result = Buffer.alloc(minLen);
      for (let i = 0; i < minLen; i++) {
        result[i] = localBuf[i] ^ remoteBuf[i];
      }
      this.reconstructedSecret = result.toString('hex');
    }

    this.transition(DANCE_STATE.VERIFY);
    return { success: true, state: this.state };
  }

  // Verify exchange
  verify() {
    if (this.state !== DANCE_STATE.VERIFY) {
      return { success: false, error: 'Not in verify state' };
    }

    // Simple verification - check if we have a reconstructed secret
    const verified = this.reconstructedSecret !== null && this.reconstructedSecret.length > 0;

    if (verified) {
      this.transition(DANCE_STATE.AUDIT);
    } else {
      this.transition(DANCE_STATE.FAILED, { reason: 'Verification failed' });
    }

    return { success: verified, state: this.state };
  }

  // Audit contract
  audit(context = {}) {
    if (this.state !== DANCE_STATE.AUDIT) {
      return { success: false, error: 'Not in audit state' };
    }

    let result = AUDIT_RESULT.PASS;

    // Check contract if present
    if (this.contract) {
      // Check signature
      if (this.contract.signature && !this.contract.verifySignature(this.reconstructedSecret)) {
        result = AUDIT_RESULT.INVALID_SIGNATURE;
      }
      // Check expiry
      else if (this.contract.isExpired()) {
        result = AUDIT_RESULT.EXPIRED;
      }
      // Check conditions
      else {
        const condCheck = this.contract.checkConditions(context);
        if (!condCheck.allPassed) {
          result = AUDIT_RESULT.CONDITION_FAILED;
        }
      }
    }

    this.auditResult = result;

    if (result === AUDIT_RESULT.PASS) {
      this.transition(DANCE_STATE.COMPLETE);
    } else {
      this.transition(DANCE_STATE.FAILED, { auditResult: result });
    }

    return { success: result === AUDIT_RESULT.PASS, auditResult: result, state: this.state };
  }

  // Abort session
  abort(reason = 'Aborted by user') {
    this.transition(DANCE_STATE.FAILED, { reason });
    return { success: true, state: this.state, reason };
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      state: this.state,
      contract: this.contract?.toJSON() || null,
      peerDeviceId: this.peerDeviceId,
      auditResult: this.auditResult,
      hasSecret: this.reconstructedSecret !== null,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      history: this.history,
    };
  }
}

// Main Dance Client
class DanceClient {
  constructor() {
    this.session = null;
    this.deviceId = generateId('device');
    this.contracts = new Map();
    this.completedSessions = [];
  }

  // === SESSION OPERATIONS ===

  // Initialize as lock holder
  initiateLockHolder(lockFragment, contract = null) {
    if (this.session && this.session.state !== DANCE_STATE.FAILED && this.session.state !== DANCE_STATE.COMPLETE) {
      return { success: false, error: 'Active session exists' };
    }

    this.session = new DanceSession(DANCE_ROLE.LOCK);
    this.session.localFragment = lockFragment;
    this.session.contract = contract;

    return { success: true, session: this.session.toJSON() };
  }

  // Initialize as key holder
  initiateKeyHolder(keyFragment, contract = null) {
    if (this.session && this.session.state !== DANCE_STATE.FAILED && this.session.state !== DANCE_STATE.COMPLETE) {
      return { success: false, error: 'Active session exists' };
    }

    this.session = new DanceSession(DANCE_ROLE.KEY);
    this.session.localFragment = keyFragment;
    this.session.contract = contract;

    return { success: true, session: this.session.toJSON() };
  }

  // Wake session
  wake() {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.wake();
  }

  // Get current state
  getCurrentState() {
    if (!this.session) {
      return { success: true, state: null, hasSession: false };
    }
    return { success: true, session: this.session.toJSON() };
  }

  // Initialize handshake
  init(peerDeviceId) {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.init(peerDeviceId);
  }

  // Generate challenge
  challenge() {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.generateChallenge();
  }

  // Respond to challenge
  respondChallenge(challenge) {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.respondToChallenge(challenge, this.session.localFragment);
  }

  // Exchange fragment
  exchange(remoteFragment) {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.exchange(remoteFragment);
  }

  // Verify
  verify() {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.verify();
  }

  // Audit
  audit(context = {}) {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    const result = this.session.audit(context);

    // Archive completed session
    if (this.session.state === DANCE_STATE.COMPLETE || this.session.state === DANCE_STATE.FAILED) {
      this.completedSessions.push({
        session: this.session.toJSON(),
        completedAt: Date.now(),
      });
    }

    return result;
  }

  // Abort session
  abort(reason) {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    return this.session.abort(reason);
  }

  // Get reconstructed secret
  getReconstructedSecret() {
    if (!this.session) {
      return { success: false, error: 'No session' };
    }
    if (this.session.state !== DANCE_STATE.COMPLETE) {
      return { success: false, error: 'Session not complete' };
    }
    return { success: true, secret: this.session.reconstructedSecret };
  }

  // === CONTRACT OPERATIONS ===

  // Create contract
  createContract(description = '') {
    const contract = new Contract(this.deviceId, description);
    this.contracts.set(contract.id, contract);
    return { success: true, contract: contract.toJSON() };
  }

  // Get contract
  getContract(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    return { success: true, contract: contract.toJSON() };
  }

  // Add condition to contract
  addCondition(contractId, type, params) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    const condition = new Condition(type, params);
    contract.addCondition(condition);
    return { success: true, contract: contract.toJSON() };
  }

  // Set contract expiry
  setExpiry(contractId, blockHeight, timestamp) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    contract.setExpiry(blockHeight, timestamp);
    return { success: true, contract: contract.toJSON() };
  }

  // Sign contract
  signContract(contractId, secret) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    contract.sign(secret);
    return { success: true, contract: contract.toJSON() };
  }

  // Verify contract signature
  verifyContract(contractId, secret) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    const valid = contract.verifySignature(secret);
    return { success: true, valid };
  }

  // List contracts
  listContracts() {
    return {
      success: true,
      contracts: Array.from(this.contracts.values()).map(c => c.toJSON()),
      total: this.contracts.size,
    };
  }

  // Delete contract
  deleteContract(contractId) {
    if (!this.contracts.has(contractId)) {
      return { success: false, error: 'Contract not found' };
    }
    this.contracts.delete(contractId);
    return { success: true };
  }

  // Use contract in session
  useContract(contractId) {
    if (!this.session) {
      return { success: false, error: 'No active session' };
    }
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    this.session.contract = contract;
    return { success: true, session: this.session.toJSON() };
  }

  // === VISUAL PATTERNS (for call-and-response) ===

  // Generate visual pattern for fragment
  generatePattern(fragment) {
    // Create a visual representation of the fragment for display
    const hash = crypto.createHash('sha256').update(fragment).digest('hex');
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const byte = parseInt(hash.substr(i * 2, 2), 16);
      const hue = Math.round(byte * 360 / 255);
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }

    return {
      success: true,
      pattern: {
        type: 'color_grid',
        size: 4,
        colors,
        hash: hash.slice(0, 8),
      },
    };
  }

  // Verify pattern match
  verifyPattern(pattern, fragment) {
    const generated = this.generatePattern(fragment);
    const matches = generated.pattern.hash === pattern.hash;
    return { success: true, matches };
  }

  // === STATS ===

  // Get stats
  getStats() {
    return {
      success: true,
      stats: {
        deviceId: this.deviceId,
        hasActiveSession: this.session !== null,
        sessionState: this.session?.state || null,
        contractCount: this.contracts.size,
        completedSessionCount: this.completedSessions.length,
      },
    };
  }

  // Get completed sessions
  getCompletedSessions(limit = 10) {
    return {
      success: true,
      sessions: this.completedSessions.slice(-limit),
      total: this.completedSessions.length,
    };
  }

  // Reset
  reset() {
    this.session = null;
    this.contracts.clear();
    this.completedSessions = [];
    return { success: true, message: 'Dance client reset' };
  }

  // Export
  export() {
    return {
      success: true,
      data: {
        deviceId: this.deviceId,
        contracts: Array.from(this.contracts.entries()).map(([id, c]) => [id, c.toJSON()]),
        completedSessions: this.completedSessions,
      },
    };
  }

  // Import
  import(data) {
    try {
      if (data.deviceId) {
        this.deviceId = data.deviceId;
      }
      if (data.contracts) {
        this.contracts.clear();
        for (const [id, contractJson] of data.contracts) {
          this.contracts.set(id, Contract.fromJSON(contractJson));
        }
      }
      if (data.completedSessions) {
        this.completedSessions = data.completedSessions;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = {
  DanceClient,
  DanceSession,
  Contract,
  Condition,
  DANCE_STATE,
  DANCE_ROLE,
  CONDITION_TYPE,
  AUDIT_RESULT,
};
