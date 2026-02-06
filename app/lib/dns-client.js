// GentlyOS DNS Client - Quick Domain/DNS Management
// Porkbun, Cloudflare, and Namecheap API integration

const https = require('https');
const EventEmitter = require('events');

// DNS Record Types
const RECORD_TYPE = {
  A: 'A',
  AAAA: 'AAAA',
  CNAME: 'CNAME',
  MX: 'MX',
  TXT: 'TXT',
  NS: 'NS',
  SRV: 'SRV',
  CAA: 'CAA',
  ALIAS: 'ALIAS',
  TLSA: 'TLSA',
};

// DNS Providers
const DNS_PROVIDER = {
  PORKBUN: 'porkbun',
  CLOUDFLARE: 'cloudflare',
  NAMECHEAP: 'namecheap',
};

// Common hosting presets
const HOSTING_PRESET = {
  GITHUB_PAGES: {
    name: 'GitHub Pages',
    records: [
      { type: 'A', name: '@', content: '185.199.108.153' },
      { type: 'A', name: '@', content: '185.199.109.153' },
      { type: 'A', name: '@', content: '185.199.110.153' },
      { type: 'A', name: '@', content: '185.199.111.153' },
      { type: 'CNAME', name: 'www', content: '{username}.github.io' },
    ],
  },
  VERCEL: {
    name: 'Vercel',
    records: [
      { type: 'A', name: '@', content: '76.76.21.21' },
      { type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com' },
    ],
  },
  NETLIFY: {
    name: 'Netlify',
    records: [
      { type: 'A', name: '@', content: '75.2.60.5' },
      { type: 'CNAME', name: 'www', content: '{site}.netlify.app' },
    ],
  },
  CLOUDFLARE_PAGES: {
    name: 'Cloudflare Pages',
    records: [
      { type: 'CNAME', name: '@', content: '{project}.pages.dev' },
      { type: 'CNAME', name: 'www', content: '{project}.pages.dev' },
    ],
  },
  RAILWAY: {
    name: 'Railway',
    records: [
      { type: 'CNAME', name: '@', content: '{project}.up.railway.app' },
    ],
  },
  RENDER: {
    name: 'Render',
    records: [
      { type: 'A', name: '@', content: '216.24.57.1' },
      { type: 'CNAME', name: 'www', content: '{service}.onrender.com' },
    ],
  },
  PROTONMAIL: {
    name: 'ProtonMail',
    records: [
      { type: 'MX', name: '@', content: 'mail.protonmail.ch', priority: 10 },
      { type: 'MX', name: '@', content: 'mailsec.protonmail.ch', priority: 20 },
      { type: 'TXT', name: '@', content: 'v=spf1 include:_spf.protonmail.ch mx ~all' },
    ],
  },
  GOOGLE_WORKSPACE: {
    name: 'Google Workspace',
    records: [
      { type: 'MX', name: '@', content: 'aspmx.l.google.com', priority: 1 },
      { type: 'MX', name: '@', content: 'alt1.aspmx.l.google.com', priority: 5 },
      { type: 'MX', name: '@', content: 'alt2.aspmx.l.google.com', priority: 5 },
      { type: 'TXT', name: '@', content: 'v=spf1 include:_spf.google.com ~all' },
    ],
  },
  FASTMAIL: {
    name: 'Fastmail',
    records: [
      { type: 'MX', name: '@', content: 'in1-smtp.messagingengine.com', priority: 10 },
      { type: 'MX', name: '@', content: 'in2-smtp.messagingengine.com', priority: 20 },
      { type: 'TXT', name: '@', content: 'v=spf1 include:spf.messagingengine.com ~all' },
    ],
  },
};

// DNS Record class
class DNSRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.type = data.type || RECORD_TYPE.A;
    this.name = data.name || '@';
    this.content = data.content || '';
    this.ttl = data.ttl || 600;
    this.priority = data.priority || null;
    this.proxied = data.proxied || false;  // Cloudflare-specific
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      content: this.content,
      ttl: this.ttl,
      priority: this.priority,
      proxied: this.proxied,
    };
  }
}

// Domain class
class Domain {
  constructor(data = {}) {
    this.name = data.name || '';
    this.provider = data.provider || null;
    this.status = data.status || 'active';
    this.expiry = data.expiry || null;
    this.autoRenew = data.autoRenew || false;
    this.locked = data.locked || false;
    this.nameservers = data.nameservers || [];
    this.records = (data.records || []).map(r => new DNSRecord(r));
  }

  toJSON() {
    return {
      name: this.name,
      provider: this.provider,
      status: this.status,
      expiry: this.expiry,
      autoRenew: this.autoRenew,
      locked: this.locked,
      nameservers: this.nameservers,
      records: this.records.map(r => r.toJSON()),
    };
  }
}

class DNSClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.providers = new Map();
    this.domains = new Map();
    this.initialized = false;

    // Configure providers from config or env
    if (config.porkbun || process.env.PORKBUN_API_KEY) {
      this.providers.set(DNS_PROVIDER.PORKBUN, {
        apiKey: config.porkbun?.apiKey || process.env.PORKBUN_API_KEY,
        secretKey: config.porkbun?.secretKey || process.env.PORKBUN_SECRET_KEY,
        baseUrl: 'https://porkbun.com/api/json/v3',
      });
    }

    if (config.cloudflare || process.env.CLOUDFLARE_API_TOKEN) {
      this.providers.set(DNS_PROVIDER.CLOUDFLARE, {
        apiToken: config.cloudflare?.apiToken || process.env.CLOUDFLARE_API_TOKEN,
        baseUrl: 'https://api.cloudflare.com/client/v4',
      });
    }

    if (config.namecheap || process.env.NAMECHEAP_API_KEY) {
      this.providers.set(DNS_PROVIDER.NAMECHEAP, {
        apiKey: config.namecheap?.apiKey || process.env.NAMECHEAP_API_KEY,
        username: config.namecheap?.username || process.env.NAMECHEAP_USERNAME,
        clientIp: config.namecheap?.clientIp || process.env.NAMECHEAP_CLIENT_IP,
        baseUrl: 'https://api.namecheap.com/xml.response',
      });
    }
  }

  // HTTP request helper
  async _request(url, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Initialize and list domains
  async initialize() {
    if (this.initialized) return { success: true };

    // Fetch domains from each provider
    for (const [provider, config] of this.providers) {
      try {
        const domains = await this._fetchDomains(provider);
        for (const domain of domains) {
          this.domains.set(domain.name, domain);
        }
      } catch (error) {
        this.emit('error', { provider, error: error.message });
      }
    }

    this.initialized = true;
    this.emit('initialized', { domainCount: this.domains.size });
    return { success: true, domainCount: this.domains.size, providers: Array.from(this.providers.keys()) };
  }

  // Fetch domains from provider
  async _fetchDomains(provider) {
    switch (provider) {
      case DNS_PROVIDER.PORKBUN:
        return this._porkbunListDomains();
      case DNS_PROVIDER.CLOUDFLARE:
        return this._cloudflareListZones();
      default:
        return [];
    }
  }

  // =============================================
  // PORKBUN API
  // =============================================

  async _porkbunRequest(endpoint, body = {}) {
    const config = this.providers.get(DNS_PROVIDER.PORKBUN);
    if (!config) throw new Error('Porkbun not configured');

    const fullBody = {
      apikey: config.apiKey,
      secretapikey: config.secretKey,
      ...body,
    };

    const response = await this._request(
      `${config.baseUrl}${endpoint}`,
      'POST',
      fullBody
    );

    if (response.data.status !== 'SUCCESS') {
      throw new Error(response.data.message || 'Porkbun API error');
    }

    return response.data;
  }

  async _porkbunListDomains() {
    const data = await this._porkbunRequest('/domain/listAll');
    return (data.domains || []).map(d => new Domain({
      name: d.domain,
      provider: DNS_PROVIDER.PORKBUN,
      status: d.status,
      expiry: d.expireDate,
      autoRenew: d.autoRenew === 1,
      locked: d.locked === 1,
    }));
  }

  async porkbunGetRecords(domain) {
    const data = await this._porkbunRequest(`/dns/retrieve/${domain}`);
    return (data.records || []).map(r => new DNSRecord({
      id: r.id,
      type: r.type,
      name: r.name === domain ? '@' : r.name.replace(`.${domain}`, ''),
      content: r.content,
      ttl: parseInt(r.ttl),
      priority: r.prio ? parseInt(r.prio) : null,
    }));
  }

  async porkbunCreateRecord(domain, record) {
    const data = await this._porkbunRequest(`/dns/create/${domain}`, {
      type: record.type,
      name: record.name === '@' ? '' : record.name,
      content: record.content,
      ttl: String(record.ttl || 600),
      prio: record.priority ? String(record.priority) : undefined,
    });
    return { success: true, id: data.id };
  }

  async porkbunUpdateRecord(domain, recordId, record) {
    await this._porkbunRequest(`/dns/edit/${domain}/${recordId}`, {
      type: record.type,
      name: record.name === '@' ? '' : record.name,
      content: record.content,
      ttl: String(record.ttl || 600),
      prio: record.priority ? String(record.priority) : undefined,
    });
    return { success: true };
  }

  async porkbunDeleteRecord(domain, recordId) {
    await this._porkbunRequest(`/dns/delete/${domain}/${recordId}`);
    return { success: true };
  }

  async porkbunGetNameservers(domain) {
    const data = await this._porkbunRequest(`/domain/getNs/${domain}`);
    return data.ns || [];
  }

  async porkbunUpdateNameservers(domain, nameservers) {
    await this._porkbunRequest(`/domain/updateNs/${domain}`, { ns: nameservers });
    return { success: true };
  }

  // =============================================
  // CLOUDFLARE API
  // =============================================

  async _cloudflareRequest(endpoint, method = 'GET', body = null) {
    const config = this.providers.get(DNS_PROVIDER.CLOUDFLARE);
    if (!config) throw new Error('Cloudflare not configured');

    const response = await this._request(
      `${config.baseUrl}${endpoint}`,
      method,
      body,
      { 'Authorization': `Bearer ${config.apiToken}` }
    );

    if (!response.data.success) {
      const errors = response.data.errors?.map(e => e.message).join(', ');
      throw new Error(errors || 'Cloudflare API error');
    }

    return response.data;
  }

  async _cloudflareListZones() {
    const data = await this._cloudflareRequest('/zones');
    return (data.result || []).map(z => new Domain({
      name: z.name,
      provider: DNS_PROVIDER.CLOUDFLARE,
      status: z.status,
      nameservers: z.name_servers,
    }));
  }

  async cloudflareGetZoneId(domain) {
    const data = await this._cloudflareRequest(`/zones?name=${domain}`);
    if (!data.result?.length) throw new Error(`Zone not found: ${domain}`);
    return data.result[0].id;
  }

  async cloudflareGetRecords(domain) {
    const zoneId = await this.cloudflareGetZoneId(domain);
    const data = await this._cloudflareRequest(`/zones/${zoneId}/dns_records`);
    return (data.result || []).map(r => new DNSRecord({
      id: r.id,
      type: r.type,
      name: r.name === domain ? '@' : r.name.replace(`.${domain}`, ''),
      content: r.content,
      ttl: r.ttl,
      priority: r.priority,
      proxied: r.proxied,
    }));
  }

  async cloudflareCreateRecord(domain, record) {
    const zoneId = await this.cloudflareGetZoneId(domain);
    const data = await this._cloudflareRequest(`/zones/${zoneId}/dns_records`, 'POST', {
      type: record.type,
      name: record.name === '@' ? domain : `${record.name}.${domain}`,
      content: record.content,
      ttl: record.ttl || 1,  // 1 = auto
      priority: record.priority,
      proxied: record.proxied || false,
    });
    return { success: true, id: data.result.id };
  }

  async cloudflareUpdateRecord(domain, recordId, record) {
    const zoneId = await this.cloudflareGetZoneId(domain);
    await this._cloudflareRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'PATCH', {
      type: record.type,
      name: record.name === '@' ? domain : `${record.name}.${domain}`,
      content: record.content,
      ttl: record.ttl || 1,
      priority: record.priority,
      proxied: record.proxied,
    });
    return { success: true };
  }

  async cloudflareDeleteRecord(domain, recordId) {
    const zoneId = await this.cloudflareGetZoneId(domain);
    await this._cloudflareRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'DELETE');
    return { success: true };
  }

  async cloudflareEnableProxy(domain, recordId, enabled = true) {
    const zoneId = await this.cloudflareGetZoneId(domain);
    await this._cloudflareRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'PATCH', {
      proxied: enabled,
    });
    return { success: true };
  }

  // =============================================
  // UNIFIED API
  // =============================================

  // List all domains across providers
  listDomains() {
    return Array.from(this.domains.values()).map(d => d.toJSON());
  }

  // Get domain info
  getDomain(domainName) {
    const domain = this.domains.get(domainName);
    if (!domain) throw new Error(`Domain not found: ${domainName}`);
    return domain.toJSON();
  }

  // Get DNS records
  async getRecords(domain) {
    const domainInfo = this.domains.get(domain);
    if (!domainInfo) throw new Error(`Domain not found: ${domain}`);

    switch (domainInfo.provider) {
      case DNS_PROVIDER.PORKBUN:
        return (await this.porkbunGetRecords(domain)).map(r => r.toJSON());
      case DNS_PROVIDER.CLOUDFLARE:
        return (await this.cloudflareGetRecords(domain)).map(r => r.toJSON());
      default:
        throw new Error(`Unsupported provider: ${domainInfo.provider}`);
    }
  }

  // Create DNS record
  async createRecord(domain, record) {
    const domainInfo = this.domains.get(domain);
    if (!domainInfo) throw new Error(`Domain not found: ${domain}`);

    const dnsRecord = new DNSRecord(record);

    switch (domainInfo.provider) {
      case DNS_PROVIDER.PORKBUN:
        return this.porkbunCreateRecord(domain, dnsRecord);
      case DNS_PROVIDER.CLOUDFLARE:
        return this.cloudflareCreateRecord(domain, dnsRecord);
      default:
        throw new Error(`Unsupported provider: ${domainInfo.provider}`);
    }
  }

  // Update DNS record
  async updateRecord(domain, recordId, record) {
    const domainInfo = this.domains.get(domain);
    if (!domainInfo) throw new Error(`Domain not found: ${domain}`);

    const dnsRecord = new DNSRecord(record);

    switch (domainInfo.provider) {
      case DNS_PROVIDER.PORKBUN:
        return this.porkbunUpdateRecord(domain, recordId, dnsRecord);
      case DNS_PROVIDER.CLOUDFLARE:
        return this.cloudflareUpdateRecord(domain, recordId, dnsRecord);
      default:
        throw new Error(`Unsupported provider: ${domainInfo.provider}`);
    }
  }

  // Delete DNS record
  async deleteRecord(domain, recordId) {
    const domainInfo = this.domains.get(domain);
    if (!domainInfo) throw new Error(`Domain not found: ${domain}`);

    switch (domainInfo.provider) {
      case DNS_PROVIDER.PORKBUN:
        return this.porkbunDeleteRecord(domain, recordId);
      case DNS_PROVIDER.CLOUDFLARE:
        return this.cloudflareDeleteRecord(domain, recordId);
      default:
        throw new Error(`Unsupported provider: ${domainInfo.provider}`);
    }
  }

  // =============================================
  // QUICK SETUP PRESETS
  // =============================================

  // Apply hosting preset
  async applyPreset(domain, presetName, variables = {}) {
    const preset = HOSTING_PRESET[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}`);

    const results = [];
    for (const record of preset.records) {
      // Replace variables in content
      let content = record.content;
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(`{${key}}`, value);
      }

      try {
        const result = await this.createRecord(domain, {
          ...record,
          content,
        });
        results.push({ ...record, content, result });
      } catch (error) {
        results.push({ ...record, content, error: error.message });
      }
    }

    this.emit('preset:applied', { domain, preset: presetName, results });
    return { preset: presetName, results };
  }

  // Quick A record
  async setARecord(domain, subdomain, ip) {
    return this.createRecord(domain, {
      type: RECORD_TYPE.A,
      name: subdomain,
      content: ip,
    });
  }

  // Quick CNAME record
  async setCNAME(domain, subdomain, target) {
    return this.createRecord(domain, {
      type: RECORD_TYPE.CNAME,
      name: subdomain,
      content: target,
    });
  }

  // Quick TXT record (for verification)
  async setTXT(domain, subdomain, value) {
    return this.createRecord(domain, {
      type: RECORD_TYPE.TXT,
      name: subdomain,
      content: value,
    });
  }

  // Set MX records
  async setMX(domain, records) {
    const results = [];
    for (const mx of records) {
      try {
        const result = await this.createRecord(domain, {
          type: RECORD_TYPE.MX,
          name: '@',
          content: mx.server,
          priority: mx.priority,
        });
        results.push({ ...mx, result });
      } catch (error) {
        results.push({ ...mx, error: error.message });
      }
    }
    return results;
  }

  // List available presets
  listPresets() {
    return Object.entries(HOSTING_PRESET).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      recordCount: preset.records.length,
    }));
  }

  // Get preset details
  getPreset(presetName) {
    const preset = HOSTING_PRESET[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}`);
    return { name: preset.name, records: preset.records };
  }

  // Get configured providers
  getProviders() {
    return Array.from(this.providers.keys());
  }

  // Get status
  getStatus() {
    return {
      initialized: this.initialized,
      providers: Array.from(this.providers.keys()),
      domainCount: this.domains.size,
    };
  }
}

module.exports = {
  DNSClient,
  DNSRecord,
  Domain,
  RECORD_TYPE,
  DNS_PROVIDER,
  HOSTING_PRESET,
};
