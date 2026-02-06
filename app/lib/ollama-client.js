// GentlyOS Ollama Client
// Local LLM inference for Dev tier (minScore: 50)
// API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md

const http = require('http');

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 11434;

class OllamaClient {
  constructor() {
    this.host = DEFAULT_HOST;
    this.port = DEFAULT_PORT;
    this.configured = false;
  }

  // Configure connection
  configure(host = DEFAULT_HOST, port = DEFAULT_PORT) {
    this.host = host;
    this.port = port;
    this.configured = true;
    return { success: true, configured: true, host, port };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Make API request
  async request(endpoint, method = 'GET', data = null, options = {}) {
    return new Promise((resolve) => {
      const reqOptions = {
        hostname: this.host,
        port: this.port,
        path: `/api${endpoint}`,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            // Handle streaming responses (newline-delimited JSON)
            if (body.includes('\n') && options.streaming) {
              const lines = body.trim().split('\n');
              const results = lines.map(line => {
                try { return JSON.parse(line); }
                catch { return null; }
              }).filter(Boolean);
              resolve({ success: true, results, streaming: true });
            } else {
              const result = JSON.parse(body);
              if (result.error) {
                resolve({ success: false, error: result.error });
              } else {
                resolve({ success: true, ...result });
              }
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse response: ' + e.message });
          }
        });
      });

      req.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          resolve({ success: false, error: 'Ollama not running. Start with: ollama serve' });
        } else {
          resolve({ success: false, error: err.message });
        }
      });

      req.setTimeout(options.timeout || 120000, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      if (data) {
        const payload = JSON.stringify(data);
        req.setHeader('Content-Length', Buffer.byteLength(payload));
        req.write(payload);
      }

      req.end();
    });
  }

  // ===== STATUS =====

  // Check if Ollama is running
  async ping() {
    try {
      const result = await this.request('/tags', 'GET');
      return { success: true, online: result.success };
    } catch {
      return { success: false, online: false };
    }
  }

  // Get running models
  async getRunningModels() {
    return await this.request('/ps', 'GET');
  }

  // ===== MODEL MANAGEMENT =====

  // List all local models
  async listModels() {
    const result = await this.request('/tags', 'GET');
    if (result.success && result.models) {
      return {
        success: true,
        models: result.models.map(m => this.normalizeModel(m)),
      };
    }
    return result;
  }

  // Normalize model data
  normalizeModel(model) {
    return {
      name: model.name,
      size: model.size,
      sizeHuman: this.formatBytes(model.size),
      modified: model.modified_at,
      digest: model.digest,
      family: model.details?.family || 'unknown',
      parameterSize: model.details?.parameter_size || 'unknown',
      quantization: model.details?.quantization_level || 'unknown',
    };
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Show model info
  async showModel(name) {
    return await this.request('/show', 'POST', { name });
  }

  // Pull model from registry
  async pullModel(name, onProgress = null) {
    // Note: This is a long-running operation
    // In production, you'd want to handle streaming progress updates
    return await this.request('/pull', 'POST', { name, stream: false }, { timeout: 600000 });
  }

  // Delete model
  async deleteModel(name) {
    return await this.request('/delete', 'DELETE', { name });
  }

  // Copy model
  async copyModel(source, destination) {
    return await this.request('/copy', 'POST', { source, destination });
  }

  // ===== GENERATION =====

  // Generate text completion
  async generate(model, prompt, options = {}) {
    const data = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        num_predict: options.maxTokens || 256,
      },
    };

    if (options.system) {
      data.system = options.system;
    }

    if (options.context) {
      data.context = options.context;
    }

    const result = await this.request('/generate', 'POST', data, { timeout: options.timeout || 120000 });

    if (result.success) {
      return {
        success: true,
        response: result.response,
        context: result.context,
        totalDuration: result.total_duration,
        loadDuration: result.load_duration,
        promptEvalCount: result.prompt_eval_count,
        evalCount: result.eval_count,
      };
    }
    return result;
  }

  // Chat with conversation history
  async chat(model, messages, options = {}) {
    const data = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        num_predict: options.maxTokens || 256,
      },
    };

    const result = await this.request('/chat', 'POST', data, { timeout: options.timeout || 120000 });

    if (result.success && result.message) {
      return {
        success: true,
        message: result.message,
        totalDuration: result.total_duration,
        loadDuration: result.load_duration,
        promptEvalCount: result.prompt_eval_count,
        evalCount: result.eval_count,
      };
    }
    return result;
  }

  // ===== EMBEDDINGS =====

  // Generate embeddings
  async embed(model, input) {
    const data = {
      model,
      input: Array.isArray(input) ? input : [input],
    };

    return await this.request('/embed', 'POST', data);
  }

  // ===== HELPER METHODS =====

  // Quick chat with first available model
  async quickChat(message) {
    const models = await this.listModels();
    if (!models.success || !models.models || models.models.length === 0) {
      return { success: false, error: 'No models available. Pull a model first.' };
    }

    const model = models.models[0].name;
    return await this.chat(model, [{ role: 'user', content: message }]);
  }

  // Quick generate with first available model
  async quickGenerate(prompt) {
    const models = await this.listModels();
    if (!models.success || !models.models || models.models.length === 0) {
      return { success: false, error: 'No models available. Pull a model first.' };
    }

    const model = models.models[0].name;
    return await this.generate(model, prompt);
  }

  // Recommended models to pull
  getRecommendedModels() {
    return [
      { name: 'llama3.2:3b', size: '2.0GB', description: 'Fast, good for chat' },
      { name: 'llama3.2:1b', size: '1.3GB', description: 'Smallest, fastest' },
      { name: 'mistral:7b', size: '4.1GB', description: 'Strong general purpose' },
      { name: 'codellama:7b', size: '3.8GB', description: 'Code generation' },
      { name: 'phi3:mini', size: '2.2GB', description: 'Microsoft, efficient' },
      { name: 'gemma2:2b', size: '1.6GB', description: 'Google, compact' },
      { name: 'qwen2:1.5b', size: '934MB', description: 'Alibaba, multilingual' },
      { name: 'deepseek-coder:1.3b', size: '776MB', description: 'Code specialist' },
    ];
  }
}

module.exports = {
  OllamaClient,
  DEFAULT_HOST,
  DEFAULT_PORT,
};
