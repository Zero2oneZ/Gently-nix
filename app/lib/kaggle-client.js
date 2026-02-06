// GentlyOS Kaggle Client
// Dataset and model access for Dev tier
// API Documentation: https://www.kaggle.com/docs/api

const https = require('https');

const API_HOST = 'www.kaggle.com';
const API_BASE = '/api/v1';

class KaggleClient {
  constructor() {
    this.username = null;
    this.apiKey = null;
    this.configured = false;
  }

  // Configure API credentials
  configure(username, apiKey) {
    this.username = username;
    this.apiKey = apiKey;
    this.configured = !!(username && apiKey);
    return { success: true, configured: this.configured };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Get auth header
  getAuthHeader() {
    const credentials = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  // Make API request
  async request(endpoint, method = 'GET', params = {}) {
    if (!this.configured) {
      return { success: false, error: 'Kaggle API not configured. Set credentials first.' };
    }

    // Build query string for GET requests
    let path = API_BASE + endpoint;
    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      path += '?' + queryString;
    }

    return new Promise((resolve) => {
      const options = {
        hostname: API_HOST,
        port: 443,
        path,
        method,
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (Array.isArray(result)) {
              resolve({ success: true, items: result });
            } else if (result.error || result.message) {
              resolve({ success: false, error: result.error || result.message });
            } else {
              resolve({ success: true, ...result });
            }
          } catch (e) {
            // Binary response (download)
            resolve({ success: true, data: body, binary: true });
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

      req.end();
    });
  }

  // ===== DATASETS =====

  // List datasets
  async listDatasets(options = {}) {
    const params = {
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      sortBy: options.sortBy || 'hottest', // hottest, votes, updated, active
    };

    if (options.search) {
      params.search = options.search;
    }

    if (options.user) {
      params.user = options.user;
    }

    if (options.filetype) {
      params.filetype = options.filetype;
    }

    const result = await this.request('/datasets/list', 'GET', params);

    if (result.success && result.items) {
      return {
        success: true,
        datasets: result.items.map(d => this.normalizeDataset(d)),
      };
    }
    return result;
  }

  // Normalize dataset data
  normalizeDataset(dataset) {
    return {
      ref: dataset.ref,
      slug: dataset.datasetSlug,
      owner: dataset.ownerSlug,
      title: dataset.title,
      subtitle: dataset.subtitle || '',
      description: dataset.description || '',
      size: dataset.datasetSize || 0,
      sizeHuman: this.formatBytes(dataset.datasetSize || 0),
      version: dataset.currentDatasetVersionNumber || 1,
      created: dataset.createdDate,
      updated: dataset.lastUpdated,
      downloads: dataset.downloadCount || 0,
      votes: dataset.voteCount || 0,
      usability: dataset.usabilityScore || 0,
      tags: dataset.tags || [],
    };
  }

  // Format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Get dataset metadata
  async getDataset(owner, slug) {
    return await this.request(`/datasets/${owner}/${slug}`, 'GET');
  }

  // List dataset files
  async listDatasetFiles(owner, slug) {
    return await this.request(`/datasets/files/${owner}/${slug}`, 'GET');
  }

  // Search datasets
  async searchDatasets(query, options = {}) {
    return await this.listDatasets({ ...options, search: query });
  }

  // Get download URL (note: actual download requires streaming)
  getDownloadUrl(owner, slug, version = null) {
    let url = `https://${API_HOST}${API_BASE}/datasets/download/${owner}/${slug}`;
    if (version) {
      url += `?datasetVersionNumber=${version}`;
    }
    return url;
  }

  // ===== MODELS =====

  // List models
  async listModels(options = {}) {
    const params = {
      page: options.page || 1,
      pageSize: options.pageSize || 20,
    };

    if (options.search) {
      params.search = options.search;
    }

    if (options.owner) {
      params.owner = options.owner;
    }

    const result = await this.request('/models/list', 'GET', params);

    if (result.success && result.items) {
      return {
        success: true,
        models: result.items.map(m => this.normalizeModel(m)),
      };
    }
    return result;
  }

  // Normalize model data
  normalizeModel(model) {
    return {
      ref: model.ref,
      owner: model.ownerSlug,
      slug: model.modelSlug,
      framework: model.framework,
      version: model.modelVersionNumber,
      created: model.createdDate,
      description: model.shortDescription || '',
      fullDescription: model.fullDescription || '',
      tags: model.tags || [],
    };
  }

  // Search models
  async searchModels(query, options = {}) {
    return await this.listModels({ ...options, search: query });
  }

  // ===== COMPETITIONS =====

  // List competitions
  async listCompetitions(options = {}) {
    const params = {
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      sortBy: options.sortBy || 'latestDeadline',
    };

    if (options.search) {
      params.search = options.search;
    }

    if (options.category) {
      params.category = options.category;
    }

    return await this.request('/competitions/list', 'GET', params);
  }

  // ===== USER =====

  // Get current user info (validate credentials)
  async whoami() {
    // Kaggle doesn't have a direct whoami endpoint, so we verify by listing datasets
    const result = await this.listDatasets({ pageSize: 1 });
    if (result.success) {
      return { success: true, username: this.username, verified: true };
    }
    return { success: false, error: 'Invalid credentials' };
  }

  // ===== HELPER METHODS =====

  // Quick search for ML datasets
  async searchMLDatasets(topic) {
    return await this.searchDatasets(topic, { sortBy: 'votes', pageSize: 10 });
  }

  // Get popular datasets
  async getPopularDatasets(count = 10) {
    return await this.listDatasets({ sortBy: 'hottest', pageSize: count });
  }

  // Get trending models
  async getTrendingModels(count = 10) {
    return await this.listModels({ pageSize: count });
  }

  // Categories for filtering
  getDatasetCategories() {
    return [
      'all',
      'featured',
      'research',
      'playground',
      'getting-started',
    ];
  }

  // Popular file types
  getFileTypes() {
    return [
      'csv',
      'json',
      'sqlite',
      'bigQuery',
    ];
  }
}

module.exports = {
  KaggleClient,
};
