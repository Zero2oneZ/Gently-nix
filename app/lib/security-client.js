// GentlyOS Security Client - Multi-Layer Defense System
// Integrates with GuardDog for IO protection, threat detection, and security policies

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'sec') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Threat levels
const THREAT_LEVEL = {
  CLEAN: 0,       // No threats detected
  INFO: 1,        // Informational
  LOW: 2,         // Low risk
  MEDIUM: 3,      // Medium risk
  HIGH: 4,        // High risk
  SEVERE: 5,      // Severe risk
  CRITICAL: 6,    // Critical - block action
  EMERGENCY: 7,   // Emergency - system-wide alert
};

// Security domains
const SECURITY_DOMAIN = {
  INPUT: 'input',           // User input validation
  OUTPUT: 'output',         // Output sanitization
  NETWORK: 'network',       // Network security
  FILESYSTEM: 'filesystem', // File system access
  PROCESS: 'process',       // Process execution
  CRYPTO: 'crypto',         // Cryptographic operations
  AUTH: 'auth',             // Authentication/authorization
  INJECTION: 'injection',   // Injection attack prevention
};

// Threat detection result
class ThreatResult {
  constructor(domain, level, findings = []) {
    this.id = generateId('threat');
    this.domain = domain;
    this.level = level;
    this.findings = findings;
    this.timestamp = Date.now();
    this.blocked = level >= THREAT_LEVEL.CRITICAL;
  }

  addFinding(type, detail, severity = THREAT_LEVEL.LOW) {
    this.findings.push({ type, detail, severity, ts: Date.now() });
    if (severity > this.level) {
      this.level = severity;
      this.blocked = severity >= THREAT_LEVEL.CRITICAL;
    }
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      domain: this.domain,
      level: this.level,
      levelName: Object.keys(THREAT_LEVEL).find(k => THREAT_LEVEL[k] === this.level),
      findings: this.findings,
      blocked: this.blocked,
      timestamp: this.timestamp,
    };
  }
}

// Homoglyph detection (invisible/lookalike characters)
class HomoglyphDetector {
  constructor() {
    // Common confusables
    this.confusables = new Map([
      ['\u200B', 'ZERO_WIDTH_SPACE'],
      ['\u200C', 'ZERO_WIDTH_NON_JOINER'],
      ['\u200D', 'ZERO_WIDTH_JOINER'],
      ['\u2060', 'WORD_JOINER'],
      ['\uFEFF', 'BYTE_ORDER_MARK'],
      ['\u00A0', 'NON_BREAKING_SPACE'],
      ['\u2028', 'LINE_SEPARATOR'],
      ['\u2029', 'PARAGRAPH_SEPARATOR'],
      ['\u202A', 'LTR_EMBEDDING'],
      ['\u202B', 'RTL_EMBEDDING'],
      ['\u202C', 'POP_DIRECTION'],
      ['\u202D', 'LTR_OVERRIDE'],
      ['\u202E', 'RTL_OVERRIDE'],
      ['\u2066', 'LTR_ISOLATE'],
      ['\u2067', 'RTL_ISOLATE'],
      ['\u2068', 'FIRST_STRONG_ISOLATE'],
      ['\u2069', 'POP_DIRECTIONAL_ISOLATE'],
    ]);

    // Lookalike Latin characters
    this.latinLookalikes = new Map([
      ['\u0430', 'a'], // Cyrillic
      ['\u0435', 'e'],
      ['\u043E', 'o'],
      ['\u0440', 'p'],
      ['\u0441', 'c'],
      ['\u0443', 'y'],
      ['\u0445', 'x'],
      ['\u0410', 'A'],
      ['\u0412', 'B'],
      ['\u0415', 'E'],
      ['\u041A', 'K'],
      ['\u041C', 'M'],
      ['\u041D', 'H'],
      ['\u041E', 'O'],
      ['\u0420', 'P'],
      ['\u0421', 'C'],
      ['\u0422', 'T'],
      ['\u0425', 'X'],
    ]);
  }

  // Scan text for threats
  scan(text) {
    const result = new ThreatResult(SECURITY_DOMAIN.INPUT, THREAT_LEVEL.CLEAN);

    // Check invisible characters
    for (const [char, name] of this.confusables) {
      if (text.includes(char)) {
        result.addFinding('invisible_char', {
          char: name,
          codepoint: char.codePointAt(0).toString(16),
          count: (text.match(new RegExp(char, 'g')) || []).length,
        }, THREAT_LEVEL.HIGH);
      }
    }

    // Check lookalikes
    for (const [char, looks_like] of this.latinLookalikes) {
      if (text.includes(char)) {
        result.addFinding('lookalike_char', {
          char,
          looksLike: looks_like,
          codepoint: char.codePointAt(0).toString(16),
        }, THREAT_LEVEL.MEDIUM);
      }
    }

    return result;
  }

  // Normalize text (remove threats)
  normalize(text) {
    let normalized = text;

    // Remove invisible characters
    for (const char of this.confusables.keys()) {
      normalized = normalized.split(char).join('');
    }

    // Replace lookalikes with ASCII
    for (const [char, ascii] of this.latinLookalikes) {
      normalized = normalized.split(char).join(ascii);
    }

    return normalized;
  }
}

// Injection attack detector
class InjectionDetector {
  constructor() {
    // SQL injection patterns
    this.sqlPatterns = [
      /(\b)(select|insert|update|delete|drop|union|exec|execute)(\s)/i,
      /(\-\-|\/\*|\*\/)/,
      /(\bor\b|\band\b)\s*\d+\s*=\s*\d+/i,
      /('\s*or\s*'|"\s*or\s*")/i,
      /(\bunion\s+select\b)/i,
    ];

    // XSS patterns
    this.xssPatterns = [
      /<script[\s>]/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:/i,
      /vbscript:/i,
    ];

    // Command injection patterns
    this.cmdPatterns = [
      /[;&|`$]|\$\(/,
      /\b(bash|sh|cmd|powershell|python|perl|ruby|node)\b/i,
      /(\.\.\/)|(\.\.\\)/,
      /\bnull\b.*\bdevice\b/i,
    ];

    // Path traversal patterns
    this.pathPatterns = [
      /\.\.[\/\\]/,
      /%2e%2e[\/\\]/i,
      /\.\.\%2f/i,
      /\%2e\%2e\//i,
    ];
  }

  // Check for SQL injection
  checkSQL(input) {
    const result = new ThreatResult(SECURITY_DOMAIN.INJECTION, THREAT_LEVEL.CLEAN);
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(input)) {
        result.addFinding('sql_injection', {
          pattern: pattern.toString(),
          match: input.match(pattern)?.[0],
        }, THREAT_LEVEL.SEVERE);
      }
    }
    return result;
  }

  // Check for XSS
  checkXSS(input) {
    const result = new ThreatResult(SECURITY_DOMAIN.INJECTION, THREAT_LEVEL.CLEAN);
    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        result.addFinding('xss_injection', {
          pattern: pattern.toString(),
          match: input.match(pattern)?.[0],
        }, THREAT_LEVEL.SEVERE);
      }
    }
    return result;
  }

  // Check for command injection
  checkCommand(input) {
    const result = new ThreatResult(SECURITY_DOMAIN.INJECTION, THREAT_LEVEL.CLEAN);
    for (const pattern of this.cmdPatterns) {
      if (pattern.test(input)) {
        result.addFinding('command_injection', {
          pattern: pattern.toString(),
          match: input.match(pattern)?.[0],
        }, THREAT_LEVEL.CRITICAL);
      }
    }
    return result;
  }

  // Check for path traversal
  checkPath(input) {
    const result = new ThreatResult(SECURITY_DOMAIN.INJECTION, THREAT_LEVEL.CLEAN);
    for (const pattern of this.pathPatterns) {
      if (pattern.test(input)) {
        result.addFinding('path_traversal', {
          pattern: pattern.toString(),
          match: input.match(pattern)?.[0],
        }, THREAT_LEVEL.SEVERE);
      }
    }
    return result;
  }

  // Full scan
  scan(input, type = 'all') {
    const results = [];
    if (type === 'all' || type === 'sql') results.push(this.checkSQL(input));
    if (type === 'all' || type === 'xss') results.push(this.checkXSS(input));
    if (type === 'all' || type === 'cmd') results.push(this.checkCommand(input));
    if (type === 'all' || type === 'path') results.push(this.checkPath(input));

    // Merge results
    const merged = new ThreatResult(SECURITY_DOMAIN.INJECTION, THREAT_LEVEL.CLEAN);
    for (const r of results) {
      for (const f of r.findings) {
        merged.addFinding(f.type, f.detail, f.severity);
      }
    }
    return merged;
  }
}

// Security policy
class SecurityPolicy {
  constructor(name, rules = []) {
    this.id = generateId('policy');
    this.name = name;
    this.rules = rules;
    this.enabled = true;
    this.createdAt = Date.now();
  }

  // Add rule
  addRule(domain, action, condition) {
    this.rules.push({
      id: generateId('rule'),
      domain,
      action,
      condition,
      enabled: true,
    });
    return this;
  }

  // Check if action is allowed
  check(domain, context) {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.domain !== domain && rule.domain !== '*') continue;

      // Evaluate condition
      if (typeof rule.condition === 'function') {
        if (!rule.condition(context)) {
          return { allowed: false, rule: rule.id, action: rule.action };
        }
      }
    }
    return { allowed: true };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rules: this.rules,
      enabled: this.enabled,
      createdAt: this.createdAt,
    };
  }
}

// Audit log entry
class AuditEntry {
  constructor(domain, action, details, threatLevel = THREAT_LEVEL.CLEAN) {
    this.id = generateId('audit');
    this.domain = domain;
    this.action = action;
    this.details = details;
    this.threatLevel = threatLevel;
    this.timestamp = Date.now();
    this.hash = this.computeHash();
  }

  computeHash() {
    const data = JSON.stringify({
      domain: this.domain,
      action: this.action,
      details: this.details,
      timestamp: this.timestamp,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  toJSON() {
    return {
      id: this.id,
      domain: this.domain,
      action: this.action,
      details: this.details,
      threatLevel: this.threatLevel,
      timestamp: this.timestamp,
      hash: this.hash,
    };
  }
}

// Security vault (secure storage)
class SecurityVault {
  constructor(masterKey) {
    this.masterKey = masterKey ? Buffer.from(masterKey) : crypto.randomBytes(32);
    this.entries = new Map();
    this.salt = crypto.randomBytes(16);
  }

  // Derive key from master
  deriveKey(purpose) {
    return crypto.pbkdf2Sync(this.masterKey, this.salt, 100000, 32, 'sha256');
  }

  // Encrypt data
  encrypt(data) {
    const key = this.deriveKey('encrypt');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encrypted, iv, tag };
  }

  // Decrypt data
  decrypt(encrypted, iv, tag) {
    const key = this.deriveKey('encrypt');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // Store secret
  store(name, value) {
    const data = Buffer.from(value);
    const { encrypted, iv, tag } = this.encrypt(data);
    this.entries.set(name, {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      storedAt: Date.now(),
    });
    return { success: true };
  }

  // Retrieve secret
  retrieve(name) {
    const entry = this.entries.get(name);
    if (!entry) return null;
    const encrypted = Buffer.from(entry.encrypted, 'base64');
    const iv = Buffer.from(entry.iv, 'base64');
    const tag = Buffer.from(entry.tag, 'base64');
    return this.decrypt(encrypted, iv, tag).toString();
  }

  // List stored names
  list() {
    return Array.from(this.entries.keys());
  }

  // Delete secret
  delete(name) {
    return this.entries.delete(name);
  }
}

// Main Security Client
class SecurityClient {
  constructor() {
    this.homoglyphDetector = new HomoglyphDetector();
    this.injectionDetector = new InjectionDetector();
    this.policies = new Map();
    this.auditLog = [];
    this.vault = null;
    this.maxAuditEntries = 10000;
  }

  // Initialize vault
  initVault(masterKey = null) {
    this.vault = new SecurityVault(masterKey);
    return { success: true, hasKey: !!masterKey };
  }

  // Scan input for all threats
  scanInput(text) {
    const results = {
      homoglyph: this.homoglyphDetector.scan(text),
      injection: this.injectionDetector.scan(text),
    };

    // Determine overall threat level
    const maxLevel = Math.max(
      results.homoglyph.level,
      results.injection.level
    );

    const overall = new ThreatResult(SECURITY_DOMAIN.INPUT, maxLevel);
    for (const r of Object.values(results)) {
      for (const f of r.findings) {
        overall.addFinding(f.type, f.detail, f.severity);
      }
    }

    // Audit log
    this.audit(SECURITY_DOMAIN.INPUT, 'scan', { length: text.length }, maxLevel);

    return {
      success: true,
      overall: overall.toJSON(),
      details: {
        homoglyph: results.homoglyph.toJSON(),
        injection: results.injection.toJSON(),
      },
      clean: maxLevel === THREAT_LEVEL.CLEAN,
      blocked: maxLevel >= THREAT_LEVEL.CRITICAL,
    };
  }

  // Normalize input (remove threats)
  normalizeInput(text) {
    const normalized = this.homoglyphDetector.normalize(text);
    const scan = this.scanInput(normalized);
    return {
      success: true,
      original: text,
      normalized,
      changed: text !== normalized,
      remainingThreats: scan.overall.level > THREAT_LEVEL.CLEAN,
    };
  }

  // Check injection type
  checkInjection(input, type = 'all') {
    const result = this.injectionDetector.scan(input, type);
    return {
      success: true,
      result: result.toJSON(),
      clean: result.level === THREAT_LEVEL.CLEAN,
    };
  }

  // Create security policy
  createPolicy(name) {
    if (this.policies.has(name)) {
      return { success: false, error: 'Policy already exists' };
    }
    const policy = new SecurityPolicy(name);
    this.policies.set(name, policy);
    return { success: true, policy: policy.toJSON() };
  }

  // Add rule to policy
  addPolicyRule(policyName, domain, action, condition) {
    const policy = this.policies.get(policyName);
    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }
    policy.addRule(domain, action, condition);
    return { success: true, policy: policy.toJSON() };
  }

  // Check policy
  checkPolicy(policyName, domain, context) {
    const policy = this.policies.get(policyName);
    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }
    const result = policy.check(domain, context);
    return { success: true, ...result };
  }

  // Vault operations
  storeSecret(name, value) {
    if (!this.vault) {
      return { success: false, error: 'Vault not initialized' };
    }
    this.vault.store(name, value);
    this.audit(SECURITY_DOMAIN.CRYPTO, 'store_secret', { name });
    return { success: true };
  }

  retrieveSecret(name) {
    if (!this.vault) {
      return { success: false, error: 'Vault not initialized' };
    }
    const value = this.vault.retrieve(name);
    if (value === null) {
      return { success: false, error: 'Secret not found' };
    }
    this.audit(SECURITY_DOMAIN.CRYPTO, 'retrieve_secret', { name });
    return { success: true, value };
  }

  listSecrets() {
    if (!this.vault) {
      return { success: false, error: 'Vault not initialized' };
    }
    return { success: true, secrets: this.vault.list() };
  }

  deleteSecret(name) {
    if (!this.vault) {
      return { success: false, error: 'Vault not initialized' };
    }
    const deleted = this.vault.delete(name);
    if (deleted) {
      this.audit(SECURITY_DOMAIN.CRYPTO, 'delete_secret', { name });
    }
    return { success: true, deleted };
  }

  // Audit logging
  audit(domain, action, details, threatLevel = THREAT_LEVEL.CLEAN) {
    const entry = new AuditEntry(domain, action, details, threatLevel);
    this.auditLog.push(entry);

    // Trim log if too long
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }

    return entry;
  }

  // Get audit log
  getAuditLog(options = {}) {
    let entries = [...this.auditLog];

    if (options.domain) {
      entries = entries.filter(e => e.domain === options.domain);
    }
    if (options.minLevel !== undefined) {
      entries = entries.filter(e => e.threatLevel >= options.minLevel);
    }
    if (options.since) {
      entries = entries.filter(e => e.timestamp >= options.since);
    }
    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    return {
      success: true,
      entries: entries.map(e => e.toJSON()),
      total: entries.length,
    };
  }

  // Get threat level name
  getThreatLevelName(level) {
    return Object.keys(THREAT_LEVEL).find(k => THREAT_LEVEL[k] === level) || 'UNKNOWN';
  }

  // Get security summary
  getSummary() {
    const recentThreats = this.auditLog
      .filter(e => e.threatLevel >= THREAT_LEVEL.MEDIUM)
      .slice(-10);

    return {
      success: true,
      policies: this.policies.size,
      auditLogSize: this.auditLog.length,
      vaultInitialized: !!this.vault,
      secretCount: this.vault ? this.vault.list().length : 0,
      recentThreats: recentThreats.map(e => e.toJSON()),
    };
  }

  // List policies
  listPolicies() {
    return {
      success: true,
      policies: Array.from(this.policies.values()).map(p => p.toJSON()),
    };
  }

  // Delete policy
  deletePolicy(name) {
    if (!this.policies.has(name)) {
      return { success: false, error: 'Policy not found' };
    }
    this.policies.delete(name);
    return { success: true };
  }
}

module.exports = {
  SecurityClient,
  HomoglyphDetector,
  InjectionDetector,
  SecurityPolicy,
  SecurityVault,
  AuditEntry,
  ThreatResult,
  THREAT_LEVEL,
  SECURITY_DOMAIN,
};
