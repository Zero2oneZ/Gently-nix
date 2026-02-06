// GentlyOS SIM Client - SIM Card Security and Management
// Manages SIM card information, IMSI/IMEI tracking, and cellular security

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'sim') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// SIM card types
const SIM_TYPE = {
  UNKNOWN: 'unknown',
  STANDARD: 'standard',   // 25x15mm
  MICRO: 'micro',         // 15x12mm
  NANO: 'nano',           // 12.3x8.8mm
  ESIM: 'esim',           // Embedded
  ISIM: 'isim',           // IP Multimedia SIM
};

// Network types
const NETWORK_TYPE = {
  GSM: 'gsm',
  CDMA: 'cdma',
  UMTS: 'umts',
  LTE: 'lte',
  NR: 'nr',  // 5G
};

// Security levels
const SECURITY_LEVEL = {
  NONE: 0,
  PIN: 1,
  PUK: 2,
  PIN2: 3,
  PUK2: 4,
  NETWORK: 5,
};

// SIM card profile
class SIMProfile {
  constructor(data = {}) {
    this.id = generateId('sim');
    this.iccid = data.iccid || this.generateICCID();
    this.imsi = data.imsi || null;
    this.msisdn = data.msisdn || null; // Phone number
    this.type = data.type || SIM_TYPE.UNKNOWN;
    this.carrier = data.carrier || null;
    this.mcc = data.mcc || null; // Mobile Country Code
    this.mnc = data.mnc || null; // Mobile Network Code
    this.active = data.active || false;
    this.locked = data.locked || false;
    this.pinEnabled = data.pinEnabled || false;
    this.pinRetries = data.pinRetries || 3;
    this.createdAt = Date.now();
  }

  // Generate random ICCID (19-20 digits)
  generateICCID() {
    let iccid = '89'; // Major industry identifier
    iccid += '1'; // Country code (US)
    for (let i = 0; i < 16; i++) {
      iccid += Math.floor(Math.random() * 10);
    }
    return iccid;
  }

  // Validate IMSI format
  validateIMSI(imsi) {
    // IMSI is 15 digits: MCC (3) + MNC (2-3) + MSIN (9-10)
    return /^\d{15}$/.test(imsi);
  }

  // Validate MSISDN format
  validateMSISDN(msisdn) {
    // E.164 format
    return /^\+?[1-9]\d{6,14}$/.test(msisdn);
  }

  // Set IMSI
  setIMSI(imsi) {
    if (!this.validateIMSI(imsi)) {
      throw new Error('Invalid IMSI format');
    }
    this.imsi = imsi;
    this.mcc = imsi.substring(0, 3);
    this.mnc = imsi.substring(3, 5); // Assuming 2-digit MNC
    return this;
  }

  // Set MSISDN
  setMSISDN(msisdn) {
    if (!this.validateMSISDN(msisdn)) {
      throw new Error('Invalid MSISDN format');
    }
    this.msisdn = msisdn;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      iccid: this.iccid,
      imsi: this.imsi ? `${this.imsi.substring(0, 6)}*****` : null, // Partially masked
      msisdn: this.msisdn,
      type: this.type,
      carrier: this.carrier,
      mcc: this.mcc,
      mnc: this.mnc,
      active: this.active,
      locked: this.locked,
      pinEnabled: this.pinEnabled,
      pinRetries: this.pinRetries,
      createdAt: this.createdAt,
    };
  }
}

// IMEI information
class IMEIInfo {
  constructor(imei) {
    this.imei = imei;
    this.valid = this.validate();
    this.tac = imei.substring(0, 8); // Type Allocation Code
    this.serial = imei.substring(8, 14);
    this.checkDigit = imei.substring(14, 15);
    this.parsedAt = Date.now();
  }

  // Luhn check for IMEI validation
  validate() {
    if (!/^\d{15}$/.test(this.imei)) return false;

    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(this.imei[i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(this.imei[14], 10);
  }

  toJSON() {
    return {
      imei: `${this.imei.substring(0, 8)}******${this.imei.substring(14)}`, // Masked
      valid: this.valid,
      tac: this.tac,
      parsedAt: this.parsedAt,
    };
  }
}

// Cell tower information
class CellInfo {
  constructor(data = {}) {
    this.id = generateId('cell');
    this.mcc = data.mcc || null;
    this.mnc = data.mnc || null;
    this.lac = data.lac || null; // Location Area Code
    this.cellId = data.cellId || null;
    this.signalStrength = data.signalStrength || 0; // dBm
    this.networkType = data.networkType || NETWORK_TYPE.LTE;
    this.timestamp = Date.now();
  }

  // Calculate approximate signal quality
  getSignalQuality() {
    // Signal strength typically -50 to -110 dBm
    if (this.signalStrength >= -50) return 'excellent';
    if (this.signalStrength >= -70) return 'good';
    if (this.signalStrength >= -85) return 'fair';
    if (this.signalStrength >= -100) return 'poor';
    return 'none';
  }

  toJSON() {
    return {
      id: this.id,
      mcc: this.mcc,
      mnc: this.mnc,
      lac: this.lac,
      cellId: this.cellId,
      signalStrength: this.signalStrength,
      signalQuality: this.getSignalQuality(),
      networkType: this.networkType,
      timestamp: this.timestamp,
    };
  }
}

// PIN manager
class PINManager {
  constructor() {
    this.pins = new Map(); // simId -> { pin, puk, attempts, locked }
    this.maxAttempts = 3;
    this.maxPukAttempts = 10;
  }

  // Set PIN for SIM
  setPin(simId, pin) {
    if (!/^\d{4,8}$/.test(pin)) {
      throw new Error('PIN must be 4-8 digits');
    }
    const hash = crypto.createHash('sha256').update(pin).digest('hex');
    const entry = this.pins.get(simId) || { attempts: 0, pukAttempts: 0, locked: false };
    entry.pinHash = hash;
    this.pins.set(simId, entry);
    return true;
  }

  // Set PUK for SIM
  setPuk(simId, puk) {
    if (!/^\d{8}$/.test(puk)) {
      throw new Error('PUK must be 8 digits');
    }
    const hash = crypto.createHash('sha256').update(puk).digest('hex');
    const entry = this.pins.get(simId) || { attempts: 0, pukAttempts: 0, locked: false };
    entry.pukHash = hash;
    this.pins.set(simId, entry);
    return true;
  }

  // Verify PIN
  verifyPin(simId, pin) {
    const entry = this.pins.get(simId);
    if (!entry) {
      return { valid: false, error: 'No PIN set' };
    }
    if (entry.locked) {
      return { valid: false, error: 'SIM locked, use PUK' };
    }

    const hash = crypto.createHash('sha256').update(pin).digest('hex');
    if (hash === entry.pinHash) {
      entry.attempts = 0;
      return { valid: true, remaining: this.maxAttempts };
    }

    entry.attempts++;
    if (entry.attempts >= this.maxAttempts) {
      entry.locked = true;
      return { valid: false, locked: true, error: 'SIM locked' };
    }

    return {
      valid: false,
      remaining: this.maxAttempts - entry.attempts,
    };
  }

  // Unlock with PUK
  unlockWithPuk(simId, puk, newPin) {
    const entry = this.pins.get(simId);
    if (!entry || !entry.pukHash) {
      return { success: false, error: 'No PUK set' };
    }

    const hash = crypto.createHash('sha256').update(puk).digest('hex');
    if (hash !== entry.pukHash) {
      entry.pukAttempts++;
      if (entry.pukAttempts >= this.maxPukAttempts) {
        return { success: false, error: 'SIM permanently locked' };
      }
      return {
        success: false,
        remaining: this.maxPukAttempts - entry.pukAttempts,
      };
    }

    // PUK correct, set new PIN
    this.setPin(simId, newPin);
    entry.locked = false;
    entry.attempts = 0;
    entry.pukAttempts = 0;

    return { success: true };
  }

  // Get status
  getStatus(simId) {
    const entry = this.pins.get(simId);
    if (!entry) {
      return { hasPin: false, locked: false };
    }
    return {
      hasPin: !!entry.pinHash,
      hasPuk: !!entry.pukHash,
      locked: entry.locked,
      attempts: entry.attempts,
      pukAttempts: entry.pukAttempts,
    };
  }
}

// Security monitor
class SecurityMonitor {
  constructor() {
    this.events = [];
    this.alerts = [];
    this.maxEvents = 1000;
  }

  // Log security event
  logEvent(type, data, severity = 'info') {
    const event = {
      id: generateId('evt'),
      type,
      data,
      severity,
      timestamp: Date.now(),
    };
    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Check for alerts
    if (severity === 'critical' || severity === 'warning') {
      this.alerts.push(event);
    }

    return event;
  }

  // Detect IMSI catcher (simplified heuristics)
  detectIMSICatcher(cellInfo, history) {
    const suspicious = [];

    // Check for sudden downgrade to 2G
    if (cellInfo.networkType === NETWORK_TYPE.GSM && history.length > 0) {
      const lastType = history[history.length - 1].networkType;
      if (lastType !== NETWORK_TYPE.GSM) {
        suspicious.push({
          type: 'downgrade',
          detail: `Network downgraded from ${lastType} to GSM`,
        });
      }
    }

    // Check for unusual signal strength
    if (cellInfo.signalStrength > -40) {
      suspicious.push({
        type: 'strong_signal',
        detail: `Unusually strong signal: ${cellInfo.signalStrength} dBm`,
      });
    }

    // Check for unknown cell
    if (!cellInfo.mcc || !cellInfo.mnc) {
      suspicious.push({
        type: 'unknown_cell',
        detail: 'Cell tower has no MCC/MNC',
      });
    }

    if (suspicious.length > 0) {
      this.logEvent('imsi_catcher_suspected', { suspicious, cellInfo }, 'warning');
    }

    return {
      detected: suspicious.length > 0,
      suspicious,
    };
  }

  // Get events
  getEvents(options = {}) {
    let events = [...this.events];

    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }
    if (options.severity) {
      events = events.filter(e => e.severity === options.severity);
    }
    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since);
    }

    return events.slice(-options.limit || -100);
  }

  // Get alerts
  getAlerts() {
    return this.alerts.slice(-50);
  }

  // Clear alerts
  clearAlerts() {
    this.alerts = [];
  }
}

// Main SIM Client
class SIMClient {
  constructor() {
    this.sims = new Map();
    this.imeis = new Map();
    this.cellHistory = [];
    this.currentCell = null;
    this.pinManager = new PINManager();
    this.security = new SecurityMonitor();
  }

  // Register SIM
  registerSIM(data = {}) {
    const sim = new SIMProfile(data);
    this.sims.set(sim.id, sim);
    this.security.logEvent('sim_registered', { simId: sim.id });
    return { success: true, sim: sim.toJSON() };
  }

  // Get SIM
  getSIM(simId) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    return { success: true, sim: sim.toJSON() };
  }

  // Activate SIM
  activateSIM(simId) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    sim.active = true;
    this.security.logEvent('sim_activated', { simId });
    return { success: true, sim: sim.toJSON() };
  }

  // Deactivate SIM
  deactivateSIM(simId) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    sim.active = false;
    this.security.logEvent('sim_deactivated', { simId });
    return { success: true };
  }

  // Set IMSI
  setIMSI(simId, imsi) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    try {
      sim.setIMSI(imsi);
      return { success: true, sim: sim.toJSON() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Register IMEI
  registerIMEI(imei) {
    const info = new IMEIInfo(imei);
    if (!info.valid) {
      return { success: false, error: 'Invalid IMEI' };
    }
    this.imeis.set(imei, info);
    this.security.logEvent('imei_registered', { imei: info.toJSON() });
    return { success: true, imei: info.toJSON() };
  }

  // Validate IMEI
  validateIMEI(imei) {
    const info = new IMEIInfo(imei);
    return { success: true, valid: info.valid, info: info.toJSON() };
  }

  // Update cell info
  updateCellInfo(data) {
    const cell = new CellInfo(data);

    // Check for IMSI catcher
    const detection = this.security.detectIMSICatcher(cell, this.cellHistory);

    this.cellHistory.push(cell);
    if (this.cellHistory.length > 100) {
      this.cellHistory = this.cellHistory.slice(-100);
    }
    this.currentCell = cell;

    return {
      success: true,
      cell: cell.toJSON(),
      imsiCatcherDetection: detection,
    };
  }

  // Get current cell
  getCurrentCell() {
    if (!this.currentCell) {
      return { success: false, error: 'No cell info available' };
    }
    return { success: true, cell: this.currentCell.toJSON() };
  }

  // Get cell history
  getCellHistory(limit = 20) {
    return {
      success: true,
      cells: this.cellHistory.slice(-limit).map(c => c.toJSON()),
    };
  }

  // Set PIN
  setPin(simId, pin) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    try {
      this.pinManager.setPin(simId, pin);
      sim.pinEnabled = true;
      this.security.logEvent('pin_set', { simId });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify PIN
  verifyPin(simId, pin) {
    const result = this.pinManager.verifyPin(simId, pin);
    if (!result.valid) {
      this.security.logEvent('pin_failed', { simId }, result.locked ? 'critical' : 'warning');
    }
    return { success: result.valid, ...result };
  }

  // Set PUK
  setPuk(simId, puk) {
    const sim = this.sims.get(simId);
    if (!sim) {
      return { success: false, error: 'SIM not found' };
    }
    try {
      this.pinManager.setPuk(simId, puk);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Unlock with PUK
  unlockWithPuk(simId, puk, newPin) {
    const result = this.pinManager.unlockWithPuk(simId, puk, newPin);
    if (result.success) {
      const sim = this.sims.get(simId);
      if (sim) sim.locked = false;
      this.security.logEvent('sim_unlocked', { simId });
    }
    return result;
  }

  // Get PIN status
  getPinStatus(simId) {
    return { success: true, status: this.pinManager.getStatus(simId) };
  }

  // Get security events
  getSecurityEvents(options = {}) {
    return {
      success: true,
      events: this.security.getEvents(options),
    };
  }

  // Get security alerts
  getSecurityAlerts() {
    return {
      success: true,
      alerts: this.security.getAlerts(),
    };
  }

  // Clear security alerts
  clearSecurityAlerts() {
    this.security.clearAlerts();
    return { success: true };
  }

  // List SIMs
  listSIMs() {
    return {
      success: true,
      sims: Array.from(this.sims.values()).map(s => s.toJSON()),
    };
  }

  // Delete SIM
  deleteSIM(simId) {
    if (!this.sims.has(simId)) {
      return { success: false, error: 'SIM not found' };
    }
    this.sims.delete(simId);
    this.security.logEvent('sim_deleted', { simId });
    return { success: true };
  }

  // Get statistics
  getStats() {
    const activeSims = Array.from(this.sims.values()).filter(s => s.active).length;
    const lockedSims = Array.from(this.sims.values()).filter(s => s.locked).length;

    return {
      success: true,
      stats: {
        totalSims: this.sims.size,
        activeSims,
        lockedSims,
        registeredImeis: this.imeis.size,
        cellHistorySize: this.cellHistory.length,
        currentCell: this.currentCell ? this.currentCell.toJSON() : null,
        securityEventCount: this.security.events.length,
        alertCount: this.security.alerts.length,
      },
    };
  }
}

module.exports = {
  SIMClient,
  SIMProfile,
  IMEIInfo,
  CellInfo,
  PINManager,
  SecurityMonitor,
  SIM_TYPE,
  NETWORK_TYPE,
  SECURITY_LEVEL,
};
