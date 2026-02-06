// GentlyOS Porkbun Client
// Domain management and DNS for Pro tier
// API Documentation: https://porkbun.com/api/json/v3/documentation

const https = require('https');

const API_HOST = 'api.porkbun.com';
const API_BASE = '/api/json/v3';

// DNS Record Types
const RecordType = {
  A: 'A',
  AAAA: 'AAAA',
  CNAME: 'CNAME',
  ALIAS: 'ALIAS',
  MX: 'MX',
  TXT: 'TXT',
  NS: 'NS',
  SRV: 'SRV',
  TLSA: 'TLSA',
  CAA: 'CAA',
  HTTPS: 'HTTPS',
  SVCB: 'SVCB',
  SSHFP: 'SSHFP',
};

// URL Forward Types
const ForwardType = {
  TEMPORARY: 'temporary',
  PERMANENT: 'permanent',
};

class PorkbunClient {
  constructor() {
    this.apiKey = null;
    this.secretApiKey = null;
    this.configured = false;
  }

  // Configure API credentials
  configure(apiKey, secretApiKey) {
    this.apiKey = apiKey;
    this.secretApiKey = secretApiKey;
    this.configured = !!(apiKey && secretApiKey);
    return { success: true, configured: this.configured };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Make API request
  async request(endpoint, data = {}) {
    if (!this.configured) {
      return { success: false, error: 'Porkbun API not configured. Set API keys first.' };
    }

    const payload = JSON.stringify({
      apikey: this.apiKey,
      secretapikey: this.secretApiKey,
      ...data,
    });

    return new Promise((resolve) => {
      const options = {
        hostname: API_HOST,
        port: 443,
        path: API_BASE + endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.status === 'SUCCESS') {
              resolve({ success: true, ...result });
            } else {
              resolve({ success: false, error: result.message || 'API request failed' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse API response' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(payload);
      req.end();
    });
  }

  // ===== AUTHENTICATION =====

  // Test API connectivity and credentials
  async ping() {
    const result = await this.request('/ping');
    return result;
  }

  // ===== DOMAIN MANAGEMENT =====

  // List all domains
  async listDomains(start = 0, includeLabels = false) {
    const result = await this.request('/domain/listAll', {
      start: start.toString(),
      includeLabels: includeLabels ? 'yes' : 'no',
    });

    if (result.success && result.domains) {
      return {
        success: true,
        domains: result.domains.map(d => this.normalizeDomain(d)),
      };
    }
    return result;
  }

  // Normalize domain data
  normalizeDomain(domain) {
    return {
      domain: domain.domain,
      status: domain.status,
      tld: domain.tld,
      createDate: domain.createDate,
      expireDate: domain.expireDate,
      securityLock: domain.securityLock === '1',
      whoisPrivacy: domain.whoisPrivacy === '1',
      autoRenew: domain.autoRenew === '1',
      notLocal: domain.notLocal === '1',
      labels: domain.labels || [],
    };
  }

  // Check domain availability
  async checkDomain(domain) {
    const result = await this.request(`/domain/checkDomain/${domain}`);
    return result;
  }

  // Get domain pricing
  async getPricing() {
    // This endpoint doesn't require authentication
    return new Promise((resolve) => {
      const options = {
        hostname: API_HOST,
        port: 443,
        path: API_BASE + '/pricing/get',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.status === 'SUCCESS') {
              resolve({ success: true, pricing: result.pricing });
            } else {
              resolve({ success: false, error: result.message || 'Failed to get pricing' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse pricing response' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write('{}');
      req.end();
    });
  }

  // Get nameservers for domain
  async getNameservers(domain) {
    const result = await this.request(`/domain/getNs/${domain}`);
    return result;
  }

  // Update nameservers for domain
  async updateNameservers(domain, nameservers) {
    const result = await this.request(`/domain/updateNs/${domain}`, {
      ns: nameservers,
    });
    return result;
  }

  // Get/Set auto-renewal status
  async setAutoRenew(domain, status) {
    const result = await this.request(`/domain/updateAutoRenew/${domain}`, {
      status: status ? 'on' : 'off',
    });
    return result;
  }

  // ===== DNS RECORDS =====

  // Create DNS record
  async createRecord(domain, record) {
    const { name, type, content, ttl, priority, notes } = record;

    const data = {
      type,
      content,
    };

    if (name) data.name = name;
    if (ttl) data.ttl = ttl.toString();
    if (priority !== undefined) data.prio = priority.toString();
    if (notes) data.notes = notes;

    const result = await this.request(`/dns/create/${domain}`, data);

    if (result.success) {
      return { success: true, id: result.id };
    }
    return result;
  }

  // Retrieve all DNS records for domain
  async getRecords(domain, recordId = null) {
    const endpoint = recordId
      ? `/dns/retrieve/${domain}/${recordId}`
      : `/dns/retrieve/${domain}`;

    const result = await this.request(endpoint);

    if (result.success && result.records) {
      return {
        success: true,
        records: result.records.map(r => this.normalizeRecord(r)),
      };
    }
    return result;
  }

  // Normalize DNS record
  normalizeRecord(record) {
    return {
      id: record.id,
      name: record.name || '@',
      type: record.type,
      content: record.content,
      ttl: parseInt(record.ttl) || 600,
      priority: record.prio ? parseInt(record.prio) : null,
      notes: record.notes || '',
    };
  }

  // Retrieve records by subdomain and type
  async getRecordsByNameType(domain, type, subdomain = '') {
    const endpoint = subdomain
      ? `/dns/retrieveByNameType/${domain}/${type}/${subdomain}`
      : `/dns/retrieveByNameType/${domain}/${type}`;

    const result = await this.request(endpoint);

    if (result.success && result.records) {
      return {
        success: true,
        records: result.records.map(r => this.normalizeRecord(r)),
      };
    }
    return result;
  }

  // Edit DNS record by ID
  async editRecord(domain, recordId, record) {
    const { name, type, content, ttl, priority, notes } = record;

    const data = {};
    if (name !== undefined) data.name = name;
    if (type) data.type = type;
    if (content) data.content = content;
    if (ttl) data.ttl = ttl.toString();
    if (priority !== undefined) data.prio = priority.toString();
    if (notes !== undefined) data.notes = notes;

    const result = await this.request(`/dns/edit/${domain}/${recordId}`, data);
    return result;
  }

  // Edit records by subdomain and type
  async editRecordByNameType(domain, type, subdomain, record) {
    const { content, ttl, priority, notes } = record;

    const data = { content };
    if (ttl) data.ttl = ttl.toString();
    if (priority !== undefined) data.prio = priority.toString();
    if (notes !== undefined) data.notes = notes;

    const endpoint = subdomain
      ? `/dns/editByNameType/${domain}/${type}/${subdomain}`
      : `/dns/editByNameType/${domain}/${type}`;

    const result = await this.request(endpoint, data);
    return result;
  }

  // Delete DNS record by ID
  async deleteRecord(domain, recordId) {
    const result = await this.request(`/dns/delete/${domain}/${recordId}`);
    return result;
  }

  // Delete records by subdomain and type
  async deleteRecordByNameType(domain, type, subdomain = '') {
    const endpoint = subdomain
      ? `/dns/deleteByNameType/${domain}/${type}/${subdomain}`
      : `/dns/deleteByNameType/${domain}/${type}`;

    const result = await this.request(endpoint);
    return result;
  }

  // ===== SSL CERTIFICATES =====

  // Retrieve SSL certificate bundle
  async getSSLBundle(domain) {
    const result = await this.request(`/ssl/retrieve/${domain}`);

    if (result.success) {
      return {
        success: true,
        ssl: {
          certificateChain: result.certificatechain,
          privateKey: result.privatekey,
          publicKey: result.publickey,
        },
      };
    }
    return result;
  }

  // ===== URL FORWARDING =====

  // Add URL forward
  async addUrlForward(domain, config) {
    const { subdomain, location, type, includePath, wildcard } = config;

    const data = {
      subdomain: subdomain || '',
      location,
      type: type || ForwardType.TEMPORARY,
      includePath: includePath ? 'yes' : 'no',
      wildcard: wildcard ? 'yes' : 'no',
    };

    const result = await this.request(`/domain/addUrlForward/${domain}`, data);
    return result;
  }

  // Get URL forwarding rules
  async getUrlForwarding(domain) {
    const result = await this.request(`/domain/getUrlForwarding/${domain}`);
    return result;
  }

  // Delete URL forward
  async deleteUrlForward(domain, recordId) {
    const result = await this.request(`/domain/deleteUrlForward/${domain}/${recordId}`);
    return result;
  }

  // ===== DNSSEC =====

  // Get DNSSEC records
  async getDnssecRecords(domain) {
    const result = await this.request(`/dns/getDnssecRecords/${domain}`);
    return result;
  }

  // ===== HELPER METHODS =====

  // Quick A record update (useful for dynamic DNS)
  async updateARecord(domain, subdomain, ip) {
    // First, try to edit existing record
    const editResult = await this.editRecordByNameType(domain, RecordType.A, subdomain, {
      content: ip,
    });

    if (editResult.success) {
      return editResult;
    }

    // If no existing record, create one
    return await this.createRecord(domain, {
      name: subdomain,
      type: RecordType.A,
      content: ip,
      ttl: 600,
    });
  }

  // Quick AAAA record update (IPv6 dynamic DNS)
  async updateAAAARecord(domain, subdomain, ip) {
    const editResult = await this.editRecordByNameType(domain, RecordType.AAAA, subdomain, {
      content: ip,
    });

    if (editResult.success) {
      return editResult;
    }

    return await this.createRecord(domain, {
      name: subdomain,
      type: RecordType.AAAA,
      content: ip,
      ttl: 600,
    });
  }

  // Get current public IP (from ping response)
  async getPublicIP() {
    const result = await this.ping();
    if (result.success && result.yourIp) {
      return { success: true, ip: result.yourIp };
    }
    return { success: false, error: 'Could not determine public IP' };
  }
}

module.exports = {
  PorkbunClient,
  RecordType,
  ForwardType,
};
