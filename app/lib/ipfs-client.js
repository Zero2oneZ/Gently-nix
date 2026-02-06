// GentlyOS IPFS Client
// Publish feed items to IPFS via Bridge or local node
// Pro tier feature (feed.ipfs)

const http = require('http');

// Default IPFS API endpoints
const IPFS_API_DEFAULT = {
  host: 'localhost',
  port: 5001,
  protocol: 'http',
};

// IPFS Gateway for retrieval
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

class IPFSClient {
  constructor() {
    this.host = IPFS_API_DEFAULT.host;
    this.port = IPFS_API_DEFAULT.port;
    this.protocol = IPFS_API_DEFAULT.protocol;
    this.configured = false;
    this.nodeOnline = false;
  }

  // Configure IPFS connection
  configure(host = 'localhost', port = 5001, protocol = 'http') {
    this.host = host;
    this.port = port;
    this.protocol = protocol;
    this.configured = true;
    return { success: true, host, port, protocol };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Make API request to IPFS node
  async request(endpoint, method = 'POST', body = null, isMultipart = false) {
    return new Promise((resolve) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: `/api/v0${endpoint}`,
        method,
        headers: {},
      };

      if (body && !isMultipart) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = http.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => {
          try {
            // Handle newline-delimited JSON (IPFS sometimes returns this)
            if (responseBody.includes('\n')) {
              const lines = responseBody.trim().split('\n');
              const results = lines.map(line => {
                try { return JSON.parse(line); }
                catch { return null; }
              }).filter(Boolean);
              if (results.length === 1) {
                resolve({ success: true, ...results[0] });
              } else {
                resolve({ success: true, results });
              }
            } else {
              const result = JSON.parse(responseBody);
              resolve({ success: true, ...result });
            }
          } catch (e) {
            // Plain text response
            resolve({ success: true, data: responseBody });
          }
        });
      });

      req.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          resolve({ success: false, error: 'IPFS daemon not running' });
        } else {
          resolve({ success: false, error: err.message });
        }
      });

      req.setTimeout(60000, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      if (body && !isMultipart) {
        req.write(body);
      }

      req.end();
    });
  }

  // ===== NODE STATUS =====

  // Check if IPFS node is running
  async ping() {
    try {
      const result = await this.request('/id', 'POST');
      this.nodeOnline = result.success;
      return {
        success: result.success,
        online: result.success,
        peerId: result.ID,
        agentVersion: result.AgentVersion,
      };
    } catch {
      this.nodeOnline = false;
      return { success: false, online: false };
    }
  }

  // Get node version
  async version() {
    return await this.request('/version', 'POST');
  }

  // Get node stats
  async stats() {
    const bandwidth = await this.request('/stats/bw', 'POST');
    const repo = await this.request('/stats/repo', 'POST');
    return {
      success: true,
      bandwidth: bandwidth.success ? bandwidth : null,
      repo: repo.success ? repo : null,
    };
  }

  // ===== CONTENT OPERATIONS =====

  // Add content to IPFS (returns CID)
  async add(content, options = {}) {
    // For simple text content, use the add endpoint with query params
    const params = new URLSearchParams();
    if (options.pin !== false) params.append('pin', 'true');
    if (options.cidVersion) params.append('cid-version', options.cidVersion.toString());
    if (options.wrapWithDirectory) params.append('wrap-with-directory', 'true');

    // Create multipart form data manually
    const boundary = '----IPFSBoundary' + Date.now();
    const contentBuffer = Buffer.from(content);

    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="content"`,
      'Content-Type: application/octet-stream',
      '',
      '',
    ].join('\r\n');

    const footer = `\r\n--${boundary}--\r\n`;

    return new Promise((resolve) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: `/api/v0/add?${params.toString()}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve({
              success: true,
              cid: result.Hash,
              name: result.Name,
              size: parseInt(result.Size),
              url: IPFS_GATEWAY + result.Hash,
            });
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse response' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(header);
      req.write(contentBuffer);
      req.write(footer);
      req.end();
    });
  }

  // Add JSON object to IPFS
  async addJSON(obj) {
    const content = JSON.stringify(obj, null, 2);
    return await this.add(content);
  }

  // Get content from IPFS by CID
  async cat(cid) {
    return await this.request(`/cat?arg=${cid}`, 'POST');
  }

  // Get content via gateway (no local node needed)
  async getViaGateway(cid, gatewayIndex = 0) {
    const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
    const url = gateway + cid;

    return new Promise((resolve) => {
      const https = require('https');
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Handle redirect
          resolve({ success: true, redirect: res.headers.location });
          return;
        }

        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, content: body, gateway });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  // ===== PIN OPERATIONS =====

  // Pin content
  async pin(cid) {
    return await this.request(`/pin/add?arg=${cid}`, 'POST');
  }

  // Unpin content
  async unpin(cid) {
    return await this.request(`/pin/rm?arg=${cid}`, 'POST');
  }

  // List pins
  async listPins() {
    const result = await this.request('/pin/ls', 'POST');
    if (result.success && result.Keys) {
      return {
        success: true,
        pins: Object.entries(result.Keys).map(([cid, info]) => ({
          cid,
          type: info.Type,
        })),
      };
    }
    return result;
  }

  // ===== FEED PUBLISHING =====

  // Publish a feed item to IPFS
  async publishFeedItem(feedItem) {
    // Validate feed item structure
    if (!feedItem.name || !feedItem.content) {
      return { success: false, error: 'Feed item must have name and content' };
    }

    // Create IPFS-ready feed item
    const ipfsItem = {
      version: '1.0',
      type: 'gently-feed-item',
      timestamp: Date.now(),
      ...feedItem,
    };

    // Add to IPFS
    const result = await this.addJSON(ipfsItem);

    if (result.success) {
      return {
        success: true,
        cid: result.cid,
        url: result.url,
        gateways: IPFS_GATEWAYS.map(g => g + result.cid),
        item: ipfsItem,
      };
    }

    return result;
  }

  // Publish a feed collection
  async publishFeedCollection(items, metadata = {}) {
    const collection = {
      version: '1.0',
      type: 'gently-feed-collection',
      timestamp: Date.now(),
      metadata: {
        title: metadata.title || 'GentlyOS Feed',
        description: metadata.description || '',
        author: metadata.author || '',
        ...metadata,
      },
      items: items.map((item, index) => ({
        index,
        ...item,
      })),
    };

    return await this.addJSON(collection);
  }

  // ===== HELPER METHODS =====

  // Get gateway URLs for a CID
  getGatewayUrls(cid) {
    return IPFS_GATEWAYS.map(g => g + cid);
  }

  // Validate CID format
  isValidCID(cid) {
    // Basic CID validation (v0 and v1)
    if (!cid) return false;
    // CIDv0 starts with Qm
    if (cid.startsWith('Qm') && cid.length === 46) return true;
    // CIDv1 starts with b (base32) or z (base58btc) or f (base16)
    if (/^[bzf][a-zA-Z0-9]+$/.test(cid) && cid.length >= 50) return true;
    return false;
  }

  // Get public IPFS gateway list
  getGateways() {
    return [...IPFS_GATEWAYS];
  }
}

module.exports = {
  IPFSClient,
  IPFS_GATEWAY,
  IPFS_GATEWAYS,
};
