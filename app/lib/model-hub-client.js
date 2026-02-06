// GentlyOS Model Hub Client - Centralized Local Model Management
// One place for all ML models, available via MCP or local connection

const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// Model types
const MODEL_TYPE = {
  LLM: 'llm',                    // Large language models (GGUF, GGML, etc.)
  EMBEDDING: 'embedding',        // Text embedding models
  IMAGE_GEN: 'image-gen',        // Image generation (Stable Diffusion, etc.)
  IMAGE_CLASS: 'image-class',    // Image classification
  OBJECT_DETECT: 'object-detect', // Object detection (YOLO, etc.)
  SPEECH_TO_TEXT: 'speech-to-text', // Whisper, etc.
  TEXT_TO_SPEECH: 'text-to-speech', // TTS models
  AUDIO: 'audio',                // Audio processing
  VIDEO: 'video',                // Video models
  MULTIMODAL: 'multimodal',      // Vision-language models
  CUSTOM: 'custom',              // Custom/other models
};

// Model format
const MODEL_FORMAT = {
  GGUF: 'gguf',           // llama.cpp format
  GGML: 'ggml',           // Legacy llama.cpp
  SAFETENSORS: 'safetensors', // Hugging Face safe format
  PYTORCH: 'pytorch',     // PyTorch .pt/.pth
  ONNX: 'onnx',           // ONNX format
  TENSORFLOW: 'tensorflow', // TensorFlow SavedModel
  TFLITE: 'tflite',       // TensorFlow Lite
  COREML: 'coreml',       // Apple CoreML
  OPENVINO: 'openvino',   // Intel OpenVINO
  TENSORRT: 'tensorrt',   // NVIDIA TensorRT
  BIN: 'bin',             // Generic binary
  UNKNOWN: 'unknown',
};

// Model source
const MODEL_SOURCE = {
  HUGGINGFACE: 'huggingface',
  OLLAMA: 'ollama',
  CIVITAI: 'civitai',
  LOCAL: 'local',
  CUSTOM: 'custom',
};

// Model status
const MODEL_STATUS = {
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  MISSING: 'missing',
};

// Default model directory
const DEFAULT_MODEL_DIR = path.join(process.env.HOME || '/home/deck', '.gently', 'models');

// Model definition
class ModelDefinition {
  constructor(id, config = {}) {
    this.id = id;
    this.name = config.name || id;
    this.type = config.type || MODEL_TYPE.CUSTOM;
    this.format = config.format || MODEL_FORMAT.UNKNOWN;
    this.source = config.source || MODEL_SOURCE.LOCAL;
    this.path = config.path || null;
    this.size = config.size || null;
    this.hash = config.hash || null;
    this.status = config.status || MODEL_STATUS.AVAILABLE;
    this.metadata = config.metadata || {};
    this.tags = config.tags || [];
    this.createdAt = config.createdAt || Date.now();
    this.lastUsed = config.lastUsed || null;
    this.useCount = config.useCount || 0;

    // Model-specific config
    this.contextLength = config.contextLength || null;
    this.quantization = config.quantization || null;
    this.parameterCount = config.parameterCount || null;
    this.license = config.license || null;
    this.url = config.url || null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      format: this.format,
      source: this.source,
      path: this.path,
      size: this.size,
      hash: this.hash,
      status: this.status,
      metadata: this.metadata,
      tags: this.tags,
      createdAt: this.createdAt,
      lastUsed: this.lastUsed,
      useCount: this.useCount,
      contextLength: this.contextLength,
      quantization: this.quantization,
      parameterCount: this.parameterCount,
      license: this.license,
      url: this.url,
    };
  }
}

// Model collection/group
class ModelCollection {
  constructor(id, config = {}) {
    this.id = id;
    this.name = config.name || id;
    this.description = config.description || '';
    this.models = new Set(config.models || []);
    this.createdAt = Date.now();
  }

  addModel(modelId) {
    this.models.add(modelId);
  }

  removeModel(modelId) {
    this.models.delete(modelId);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      models: Array.from(this.models),
      createdAt: this.createdAt,
    };
  }
}

// MCP Tool definition for models
class MCPModelTool {
  constructor(modelId, config = {}) {
    this.name = config.name || `model_${modelId}`;
    this.description = config.description || `Invoke model ${modelId}`;
    this.modelId = modelId;
    this.inputSchema = config.inputSchema || {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Input prompt' },
      },
      required: ['prompt'],
    };
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      modelId: this.modelId,
      inputSchema: this.inputSchema,
    };
  }
}

class ModelHubClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.modelDir = config.modelDir || DEFAULT_MODEL_DIR;
    this.models = new Map();
    this.collections = new Map();
    this.mcpTools = new Map();
    this.loadedModels = new Map();  // Currently loaded model instances
    this.initialized = false;
    this.mcpPort = config.mcpPort || 7336;
    this.mcpServer = null;

    // Index file for persistence
    this.indexPath = path.join(this.modelDir, 'index.json');

    // Scanner config
    this.scanPaths = config.scanPaths || [
      this.modelDir,
      path.join(process.env.HOME || '/home/deck', '.ollama', 'models'),
      path.join(process.env.HOME || '/home/deck', '.cache', 'huggingface'),
      path.join(process.env.HOME || '/home/deck', '.cache', 'lm-studio', 'models'),
    ];
  }

  // Initialize hub
  async initialize() {
    if (this.initialized) return { success: true };

    // Create model directory
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }

    // Create subdirectories by type
    for (const type of Object.values(MODEL_TYPE)) {
      const typeDir = path.join(this.modelDir, type);
      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
      }
    }

    // Load index if exists
    await this._loadIndex();

    // Scan for models
    await this.scanModels();

    this.initialized = true;
    this.emit('initialized', { modelCount: this.models.size });
    return { success: true, modelCount: this.models.size };
  }

  // Load index from disk
  async _loadIndex() {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
        for (const modelData of data.models || []) {
          const model = new ModelDefinition(modelData.id, modelData);
          this.models.set(model.id, model);
        }
        for (const collData of data.collections || []) {
          const coll = new ModelCollection(collData.id, collData);
          this.collections.set(coll.id, coll);
        }
      } catch (error) {
        this.emit('error', { message: `Failed to load index: ${error.message}` });
      }
    }
  }

  // Save index to disk
  async _saveIndex() {
    const data = {
      version: 1,
      updatedAt: Date.now(),
      models: Array.from(this.models.values()).map(m => m.toJSON()),
      collections: Array.from(this.collections.values()).map(c => c.toJSON()),
    };
    fs.writeFileSync(this.indexPath, JSON.stringify(data, null, 2));
  }

  // Detect model format from file
  _detectFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const formatMap = {
      '.gguf': MODEL_FORMAT.GGUF,
      '.ggml': MODEL_FORMAT.GGML,
      '.safetensors': MODEL_FORMAT.SAFETENSORS,
      '.pt': MODEL_FORMAT.PYTORCH,
      '.pth': MODEL_FORMAT.PYTORCH,
      '.onnx': MODEL_FORMAT.ONNX,
      '.tflite': MODEL_FORMAT.TFLITE,
      '.mlmodel': MODEL_FORMAT.COREML,
      '.bin': MODEL_FORMAT.BIN,
    };
    return formatMap[ext] || MODEL_FORMAT.UNKNOWN;
  }

  // Detect model type from path/name
  _detectType(filePath, name) {
    const lower = (filePath + name).toLowerCase();

    if (lower.includes('llama') || lower.includes('mistral') || lower.includes('phi') ||
        lower.includes('gemma') || lower.includes('qwen') || lower.includes('codellama') ||
        lower.includes('deepseek') || lower.includes('wizard') || lower.includes('vicuna')) {
      return MODEL_TYPE.LLM;
    }
    if (lower.includes('embed') || lower.includes('bge') || lower.includes('e5') ||
        lower.includes('sentence') || lower.includes('gte')) {
      return MODEL_TYPE.EMBEDDING;
    }
    if (lower.includes('stable-diffusion') || lower.includes('sdxl') || lower.includes('flux') ||
        lower.includes('dalle') || lower.includes('midjourney')) {
      return MODEL_TYPE.IMAGE_GEN;
    }
    if (lower.includes('yolo') || lower.includes('detr') || lower.includes('rcnn')) {
      return MODEL_TYPE.OBJECT_DETECT;
    }
    if (lower.includes('whisper') || lower.includes('speech-to-text') || lower.includes('stt')) {
      return MODEL_TYPE.SPEECH_TO_TEXT;
    }
    if (lower.includes('tts') || lower.includes('text-to-speech') || lower.includes('bark') ||
        lower.includes('xtts') || lower.includes('coqui')) {
      return MODEL_TYPE.TEXT_TO_SPEECH;
    }
    if (lower.includes('clip') || lower.includes('blip') || lower.includes('llava') ||
        lower.includes('vision') || lower.includes('multimodal')) {
      return MODEL_TYPE.MULTIMODAL;
    }
    if (lower.includes('resnet') || lower.includes('vit') || lower.includes('convnext') ||
        lower.includes('classifier') || lower.includes('imagenet')) {
      return MODEL_TYPE.IMAGE_CLASS;
    }

    return MODEL_TYPE.CUSTOM;
  }

  // Scan for models in configured paths
  async scanModels() {
    const found = [];

    for (const scanPath of this.scanPaths) {
      if (!fs.existsSync(scanPath)) continue;

      try {
        await this._scanDirectory(scanPath, found);
      } catch (error) {
        this.emit('scan:error', { path: scanPath, error: error.message });
      }
    }

    // Update index
    for (const modelInfo of found) {
      if (!this.models.has(modelInfo.id)) {
        const model = new ModelDefinition(modelInfo.id, modelInfo);
        this.models.set(model.id, model);
      }
    }

    await this._saveIndex();
    this.emit('scan:complete', { found: found.length, total: this.models.size });
    return { found: found.length, total: this.models.size };
  }

  // Recursive directory scan
  async _scanDirectory(dirPath, found, depth = 0) {
    if (depth > 5) return;  // Limit recursion

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this._scanDirectory(fullPath, found, depth + 1);
      } else if (entry.isFile()) {
        const format = this._detectFormat(fullPath);
        if (format !== MODEL_FORMAT.UNKNOWN) {
          const stats = fs.statSync(fullPath);
          const id = this._generateModelId(fullPath);

          found.push({
            id,
            name: path.basename(entry.name, path.extname(entry.name)),
            path: fullPath,
            format,
            type: this._detectType(fullPath, entry.name),
            size: stats.size,
            source: this._detectSource(fullPath),
            status: MODEL_STATUS.AVAILABLE,
          });
        }
      }
    }
  }

  // Generate unique model ID from path
  _generateModelId(filePath) {
    const hash = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 8);
    const name = path.basename(filePath, path.extname(filePath))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 32);
    return `${name}-${hash}`;
  }

  // Detect source from path
  _detectSource(filePath) {
    if (filePath.includes('.ollama')) return MODEL_SOURCE.OLLAMA;
    if (filePath.includes('huggingface')) return MODEL_SOURCE.HUGGINGFACE;
    if (filePath.includes('civitai')) return MODEL_SOURCE.CIVITAI;
    return MODEL_SOURCE.LOCAL;
  }

  // =============================================
  // Model Management
  // =============================================

  // Register a model manually
  async registerModel(config) {
    const id = config.id || this._generateModelId(config.path || config.name);

    if (config.path && !fs.existsSync(config.path)) {
      throw new Error(`Model file not found: ${config.path}`);
    }

    const model = new ModelDefinition(id, {
      ...config,
      format: config.format || this._detectFormat(config.path || ''),
      type: config.type || this._detectType(config.path || '', config.name || ''),
      status: MODEL_STATUS.AVAILABLE,
    });

    this.models.set(id, model);
    await this._saveIndex();

    this.emit('model:registered', model.toJSON());
    return model.toJSON();
  }

  // Unregister a model
  async unregisterModel(modelId) {
    if (!this.models.has(modelId)) {
      throw new Error(`Model not found: ${modelId}`);
    }

    this.models.delete(modelId);
    this.mcpTools.delete(modelId);
    await this._saveIndex();

    this.emit('model:unregistered', { id: modelId });
    return { success: true };
  }

  // Get model by ID
  getModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);
    return model.toJSON();
  }

  // List all models
  listModels(filter = {}) {
    let models = Array.from(this.models.values());

    if (filter.type) {
      models = models.filter(m => m.type === filter.type);
    }
    if (filter.format) {
      models = models.filter(m => m.format === filter.format);
    }
    if (filter.source) {
      models = models.filter(m => m.source === filter.source);
    }
    if (filter.status) {
      models = models.filter(m => m.status === filter.status);
    }
    if (filter.tags && filter.tags.length > 0) {
      models = models.filter(m => filter.tags.some(t => m.tags.includes(t)));
    }
    if (filter.search) {
      const search = filter.search.toLowerCase();
      models = models.filter(m =>
        m.name.toLowerCase().includes(search) ||
        m.id.toLowerCase().includes(search)
      );
    }

    return models.map(m => m.toJSON());
  }

  // List models by type
  listModelsByType(type) {
    return this.listModels({ type });
  }

  // Update model metadata
  async updateModel(modelId, updates) {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    Object.assign(model, updates);
    await this._saveIndex();

    this.emit('model:updated', model.toJSON());
    return model.toJSON();
  }

  // Add tags to model
  async addModelTags(modelId, tags) {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    for (const tag of tags) {
      if (!model.tags.includes(tag)) {
        model.tags.push(tag);
      }
    }
    await this._saveIndex();

    return model.toJSON();
  }

  // =============================================
  // Model Collections
  // =============================================

  // Create collection
  createCollection(id, config = {}) {
    const collection = new ModelCollection(id, config);
    this.collections.set(id, collection);
    this._saveIndex();

    this.emit('collection:created', collection.toJSON());
    return collection.toJSON();
  }

  // Add model to collection
  addToCollection(collectionId, modelId) {
    const collection = this.collections.get(collectionId);
    if (!collection) throw new Error(`Collection not found: ${collectionId}`);

    collection.addModel(modelId);
    this._saveIndex();

    return collection.toJSON();
  }

  // List collections
  listCollections() {
    return Array.from(this.collections.values()).map(c => c.toJSON());
  }

  // =============================================
  // MCP Tool Integration
  // =============================================

  // Register model as MCP tool
  registerMCPTool(modelId, config = {}) {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const tool = new MCPModelTool(modelId, {
      name: config.name || `invoke_${model.name.replace(/[^a-z0-9]/gi, '_')}`,
      description: config.description || `Run inference with ${model.name}`,
      inputSchema: config.inputSchema || this._getDefaultSchema(model.type),
    });

    this.mcpTools.set(modelId, tool);
    this.emit('mcp:tool-registered', tool.toJSON());
    return tool.toJSON();
  }

  // Get default input schema for model type
  _getDefaultSchema(type) {
    const schemas = {
      [MODEL_TYPE.LLM]: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Input prompt' },
          max_tokens: { type: 'number', description: 'Maximum tokens to generate', default: 256 },
          temperature: { type: 'number', description: 'Sampling temperature', default: 0.7 },
        },
        required: ['prompt'],
      },
      [MODEL_TYPE.EMBEDDING]: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to embed' },
        },
        required: ['text'],
      },
      [MODEL_TYPE.IMAGE_GEN]: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image generation prompt' },
          negative_prompt: { type: 'string', description: 'Negative prompt' },
          width: { type: 'number', default: 512 },
          height: { type: 'number', default: 512 },
          steps: { type: 'number', default: 20 },
        },
        required: ['prompt'],
      },
      [MODEL_TYPE.SPEECH_TO_TEXT]: {
        type: 'object',
        properties: {
          audio_path: { type: 'string', description: 'Path to audio file' },
          language: { type: 'string', description: 'Language code', default: 'en' },
        },
        required: ['audio_path'],
      },
      [MODEL_TYPE.OBJECT_DETECT]: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Path to image file' },
          threshold: { type: 'number', description: 'Detection threshold', default: 0.5 },
        },
        required: ['image_path'],
      },
    };

    return schemas[type] || {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Model input' },
      },
      required: ['input'],
    };
  }

  // List MCP tools
  listMCPTools() {
    return Array.from(this.mcpTools.values()).map(t => t.toJSON());
  }

  // Get MCP tool manifest (for MCP server)
  getMCPToolManifest() {
    return {
      tools: this.listMCPTools().map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  // Start MCP server for model access
  async startMCPServer() {
    if (this.mcpServer) {
      return { success: true, message: 'MCP server already running', port: this.mcpPort };
    }

    this.mcpServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          const response = await this._handleMCPRequest(request);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    });

    return new Promise((resolve, reject) => {
      this.mcpServer.listen(this.mcpPort, () => {
        this.emit('mcp:server-started', { port: this.mcpPort });
        resolve({ success: true, port: this.mcpPort });
      });
      this.mcpServer.on('error', reject);
    });
  }

  // Handle MCP JSON-RPC request
  async _handleMCPRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: this.getMCPToolManifest(),
        };

      case 'tools/call': {
        const { name, arguments: args } = params;
        const tool = Array.from(this.mcpTools.values()).find(t => t.name === name);
        if (!tool) {
          return { jsonrpc: '2.0', id, error: { code: -32602, message: `Tool not found: ${name}` } };
        }
        const result = await this.invokeModel(tool.modelId, args);
        return { jsonrpc: '2.0', id, result };
      }

      case 'models/list':
        return { jsonrpc: '2.0', id, result: this.listModels(params || {}) };

      case 'models/invoke': {
        const result = await this.invokeModel(params.modelId, params.input);
        return { jsonrpc: '2.0', id, result };
      }

      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  }

  // Stop MCP server
  async stopMCPServer() {
    if (!this.mcpServer) {
      return { success: true, message: 'MCP server not running' };
    }

    return new Promise((resolve) => {
      this.mcpServer.close(() => {
        this.mcpServer = null;
        this.emit('mcp:server-stopped');
        resolve({ success: true });
      });
    });
  }

  // =============================================
  // Model Invocation
  // =============================================

  // Invoke a model
  async invokeModel(modelId, input) {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    // Update usage stats
    model.lastUsed = Date.now();
    model.useCount++;

    // Route to appropriate backend
    switch (model.format) {
      case MODEL_FORMAT.GGUF:
      case MODEL_FORMAT.GGML:
        return this._invokeWithLlamaCpp(model, input);

      case MODEL_FORMAT.ONNX:
        return this._invokeWithOnnx(model, input);

      case MODEL_FORMAT.SAFETENSORS:
      case MODEL_FORMAT.PYTORCH:
        return this._invokeWithTransformers(model, input);

      default:
        throw new Error(`Unsupported model format: ${model.format}`);
    }
  }

  // Invoke with llama.cpp
  async _invokeWithLlamaCpp(model, input) {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', model.path,
        '-p', input.prompt || input.input || '',
        '-n', String(input.max_tokens || 256),
        '--temp', String(input.temperature || 0.7),
      ];

      // Try llama-cli first, then llama.cpp
      let binary = 'llama-cli';
      try {
        execSync('which llama-cli', { encoding: 'utf-8' });
      } catch {
        binary = 'llama.cpp';
      }

      const proc = spawn(binary, args);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ output: output.trim(), model: model.id });
        } else {
          reject(new Error(error || `llama.cpp failed with code ${code}`));
        }
      });
    });
  }

  // Invoke with ONNX Runtime
  async _invokeWithOnnx(model, input) {
    // Requires onnxruntime-node or Python bridge
    return new Promise((resolve, reject) => {
      const script = `
import onnxruntime as ort
import json
import sys

session = ort.InferenceSession("${model.path}")
# Simplified - actual implementation needs proper input handling
result = {"status": "onnx_invoked", "model": "${model.id}"}
print(json.dumps(result))
`;
      const proc = spawn('python3', ['-c', script]);
      let output = '';

      proc.stdout.on('data', (data) => output += data);
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch {
            resolve({ output });
          }
        } else {
          reject(new Error(`ONNX inference failed`));
        }
      });
    });
  }

  // Invoke with transformers (via Python)
  async _invokeWithTransformers(model, input) {
    return new Promise((resolve, reject) => {
      const script = `
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import json

model = AutoModelForCausalLM.from_pretrained("${path.dirname(model.path)}")
tokenizer = AutoTokenizer.from_pretrained("${path.dirname(model.path)}")

prompt = """${(input.prompt || input.input || '').replace(/"/g, '\\"')}"""
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=${input.max_tokens || 256})
result = tokenizer.decode(outputs[0], skip_special_tokens=True)

print(json.dumps({"output": result, "model": "${model.id}"}))
`;
      const proc = spawn('python3', ['-c', script]);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => output += data);
      proc.stderr.on('data', (data) => error += data);

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch {
            resolve({ output });
          }
        } else {
          reject(new Error(error || `Transformers inference failed`));
        }
      });
    });
  }

  // =============================================
  // Model Download
  // =============================================

  // Download from Hugging Face
  async downloadFromHuggingFace(repoId, filename = null, config = {}) {
    const downloadDir = path.join(this.modelDir, MODEL_TYPE.LLM);
    const targetName = filename || `${repoId.replace('/', '_')}.gguf`;
    const targetPath = path.join(downloadDir, targetName);

    this.emit('download:start', { source: 'huggingface', repoId, filename });

    return new Promise((resolve, reject) => {
      const args = ['download', repoId];
      if (filename) {
        args.push('--include', filename);
      }
      args.push('--local-dir', downloadDir);

      const proc = spawn('huggingface-cli', args);
      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
        this.emit('download:progress', { output: data.toString() });
      });

      proc.stderr.on('data', (data) => {
        this.emit('download:progress', { output: data.toString() });
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          // Register the model
          const model = await this.registerModel({
            name: targetName.replace('.gguf', ''),
            path: targetPath,
            source: MODEL_SOURCE.HUGGINGFACE,
            url: `https://huggingface.co/${repoId}`,
          });
          this.emit('download:complete', model);
          resolve(model);
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });
    });
  }

  // Download from Ollama
  async downloadFromOllama(modelName) {
    this.emit('download:start', { source: 'ollama', modelName });

    return new Promise((resolve, reject) => {
      const proc = spawn('ollama', ['pull', modelName]);

      proc.stdout.on('data', (data) => {
        this.emit('download:progress', { output: data.toString() });
      });

      proc.stderr.on('data', (data) => {
        this.emit('download:progress', { output: data.toString() });
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          // Scan for the new model
          await this.scanModels();
          const model = Array.from(this.models.values())
            .find(m => m.name.includes(modelName));
          this.emit('download:complete', model ? model.toJSON() : null);
          resolve(model ? model.toJSON() : { success: true, name: modelName });
        } else {
          reject(new Error(`Ollama pull failed with code ${code}`));
        }
      });
    });
  }

  // =============================================
  // Ollama Integration
  // =============================================

  // List Ollama models
  async listOllamaModels() {
    return new Promise((resolve, reject) => {
      const proc = spawn('ollama', ['list']);
      let output = '';

      proc.stdout.on('data', (data) => output += data);
      proc.on('close', (code) => {
        if (code === 0) {
          const lines = output.trim().split('\n').slice(1);  // Skip header
          const models = lines.map(line => {
            const parts = line.split(/\s+/);
            return {
              name: parts[0],
              id: parts[1],
              size: parts[2],
              modified: parts.slice(3).join(' '),
            };
          });
          resolve(models);
        } else {
          reject(new Error('Failed to list Ollama models'));
        }
      });
    });
  }

  // Run Ollama model
  async runOllama(modelName, prompt, config = {}) {
    return new Promise((resolve, reject) => {
      const args = ['run', modelName];

      const proc = spawn('ollama', args);
      let output = '';

      proc.stdin.write(prompt);
      proc.stdin.end();

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ output: output.trim(), model: modelName });
        } else {
          reject(new Error(`Ollama run failed`));
        }
      });
    });
  }

  // =============================================
  // Status and Info
  // =============================================

  // Get hub status
  getStatus() {
    return {
      initialized: this.initialized,
      modelDir: this.modelDir,
      modelCount: this.models.size,
      collectionCount: this.collections.size,
      mcpToolCount: this.mcpTools.size,
      mcpServerRunning: !!this.mcpServer,
      mcpPort: this.mcpPort,
      loadedModels: Array.from(this.loadedModels.keys()),
    };
  }

  // Get disk usage
  getDiskUsage() {
    let totalSize = 0;
    const byType = {};

    for (const model of this.models.values()) {
      if (model.size) {
        totalSize += model.size;
        byType[model.type] = (byType[model.type] || 0) + model.size;
      }
    }

    return {
      totalSize,
      totalSizeHuman: this._formatBytes(totalSize),
      byType: Object.entries(byType).map(([type, size]) => ({
        type,
        size,
        sizeHuman: this._formatBytes(size),
      })),
    };
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cleanup
  async cleanup() {
    await this.stopMCPServer();
    this.loadedModels.clear();
  }
}

module.exports = {
  ModelHubClient,
  ModelDefinition,
  ModelCollection,
  MCPModelTool,
  MODEL_TYPE,
  MODEL_FORMAT,
  MODEL_SOURCE,
  MODEL_STATUS,
  DEFAULT_MODEL_DIR,
};
