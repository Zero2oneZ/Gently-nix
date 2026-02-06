// GentlyOS Huggingface Client
// AI inference for Dev tier
// API Documentation: https://huggingface.co/docs/huggingface_hub/guides/inference

const https = require('https');

const API_HOST = 'api-inference.huggingface.co';

// Popular models for different tasks
const RECOMMENDED_MODELS = {
  chat: [
    'meta-llama/Meta-Llama-3-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'google/gemma-7b-it',
    'microsoft/Phi-3-mini-4k-instruct',
  ],
  text: [
    'gpt2',
    'EleutherAI/gpt-neo-2.7B',
    'bigscience/bloom-560m',
  ],
  summarization: [
    'facebook/bart-large-cnn',
    'google/pegasus-xsum',
  ],
  translation: [
    'Helsinki-NLP/opus-mt-en-de',
    'Helsinki-NLP/opus-mt-en-fr',
    'Helsinki-NLP/opus-mt-en-es',
  ],
  classification: [
    'distilbert-base-uncased-finetuned-sst-2-english',
    'facebook/bart-large-mnli',
  ],
  embedding: [
    'sentence-transformers/all-MiniLM-L6-v2',
    'BAAI/bge-small-en-v1.5',
  ],
};

class HuggingFaceClient {
  constructor() {
    this.apiKey = null;
    this.configured = false;
  }

  // Configure API credentials
  configure(apiKey) {
    this.apiKey = apiKey;
    this.configured = !!apiKey;
    return { success: true, configured: this.configured };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Make API request
  async request(model, data, options = {}) {
    if (!this.configured) {
      return { success: false, error: 'Huggingface API not configured. Set API key first.' };
    }

    const payload = JSON.stringify(data);

    return new Promise((resolve) => {
      const reqOptions = {
        hostname: API_HOST,
        port: 443,
        path: `/models/${model}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.error) {
              resolve({ success: false, error: result.error });
            } else {
              resolve({ success: true, result });
            }
          } catch (e) {
            // Some endpoints return plain text
            resolve({ success: true, result: body });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(options.timeout || 60000, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(payload);
      req.end();
    });
  }

  // ===== CHAT / TEXT GENERATION =====

  // Chat with a model (conversational)
  async chat(model, messages, options = {}) {
    const data = {
      messages,
      max_tokens: options.maxTokens || 256,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
    };

    if (options.stream) {
      data.stream = true;
    }

    return await this.request(model, data, options);
  }

  // Simple text generation
  async generate(model, prompt, options = {}) {
    const data = {
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 256,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.95,
        return_full_text: options.returnFullText || false,
      },
    };

    return await this.request(model, data, options);
  }

  // ===== SUMMARIZATION =====

  async summarize(model, text, options = {}) {
    const data = {
      inputs: text,
      parameters: {
        max_length: options.maxLength || 150,
        min_length: options.minLength || 30,
        do_sample: false,
      },
    };

    return await this.request(model, data, options);
  }

  // ===== TRANSLATION =====

  async translate(model, text) {
    const data = {
      inputs: text,
    };

    return await this.request(model, data);
  }

  // ===== CLASSIFICATION =====

  async classify(model, text, labels = null) {
    const data = {
      inputs: text,
    };

    if (labels) {
      data.parameters = {
        candidate_labels: labels,
      };
    }

    return await this.request(model, data);
  }

  // Zero-shot classification
  async zeroShotClassify(text, labels) {
    return await this.classify('facebook/bart-large-mnli', text, labels);
  }

  // ===== EMBEDDINGS =====

  async embed(model, texts) {
    const data = {
      inputs: Array.isArray(texts) ? texts : [texts],
    };

    return await this.request(model, data);
  }

  // ===== QUESTION ANSWERING =====

  async questionAnswer(model, question, context) {
    const data = {
      inputs: {
        question,
        context,
      },
    };

    return await this.request(model, data);
  }

  // ===== HELPER METHODS =====

  // Get recommended models for a task
  getRecommendedModels(task) {
    return RECOMMENDED_MODELS[task] || [];
  }

  // List all available tasks
  getAvailableTasks() {
    return Object.keys(RECOMMENDED_MODELS);
  }

  // Quick inference with default model
  async quickChat(message) {
    const messages = [{ role: 'user', content: message }];
    return await this.chat(RECOMMENDED_MODELS.chat[0], messages);
  }

  async quickSummarize(text) {
    return await this.summarize(RECOMMENDED_MODELS.summarization[0], text);
  }

  async quickClassify(text, labels) {
    return await this.zeroShotClassify(text, labels);
  }

  async quickEmbed(text) {
    return await this.embed(RECOMMENDED_MODELS.embedding[0], text);
  }
}

module.exports = {
  HuggingFaceClient,
  RECOMMENDED_MODELS,
};
