// GentlyOS LivePeer Client - Decentralized Video Streaming
// Video transcoding, streaming, and AI video processing via LivePeer network

const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Stream states
const STREAM_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  PROCESSING: 'processing',
  ERROR: 'error',
  ENDED: 'ended',
};

// Transcode profiles
const TRANSCODE_PROFILE = {
  P144P30FPS: { name: '144p', width: 256, height: 144, bitrate: 400000, fps: 30 },
  P240P30FPS: { name: '240p', width: 426, height: 240, bitrate: 600000, fps: 30 },
  P360P30FPS: { name: '360p', width: 640, height: 360, bitrate: 1200000, fps: 30 },
  P480P30FPS: { name: '480p', width: 854, height: 480, bitrate: 2000000, fps: 30 },
  P720P30FPS: { name: '720p', width: 1280, height: 720, bitrate: 4000000, fps: 30 },
  P720P60FPS: { name: '720p60', width: 1280, height: 720, bitrate: 6000000, fps: 60 },
  P1080P30FPS: { name: '1080p', width: 1920, height: 1080, bitrate: 6000000, fps: 30 },
  P1080P60FPS: { name: '1080p60', width: 1920, height: 1080, bitrate: 9000000, fps: 60 },
  P1440P30FPS: { name: '1440p', width: 2560, height: 1440, bitrate: 12000000, fps: 30 },
  P4K30FPS: { name: '4k', width: 3840, height: 2160, bitrate: 20000000, fps: 30 },
};

// AI pipeline types
const AI_PIPELINE = {
  TEXT_TO_IMAGE: 'text-to-image',
  IMAGE_TO_IMAGE: 'image-to-image',
  IMAGE_TO_VIDEO: 'image-to-video',
  UPSCALE: 'upscale',
  AUDIO_TO_TEXT: 'audio-to-text',
  SEGMENT_ANYTHING: 'segment-anything-2',
  LLM: 'llm',
};

// Stream class
class LiveStream {
  constructor(id, config = {}) {
    this.id = id;
    this.name = config.name || `stream-${id}`;
    this.state = STREAM_STATE.IDLE;
    this.rtmpUrl = null;
    this.playbackUrl = null;
    this.profiles = config.profiles || [TRANSCODE_PROFILE.P720P30FPS];
    this.record = config.record || false;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.viewers = 0;
    this.metadata = config.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      rtmpUrl: this.rtmpUrl,
      playbackUrl: this.playbackUrl,
      profiles: this.profiles,
      record: this.record,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      viewers: this.viewers,
      metadata: this.metadata,
    };
  }
}

// Asset class for VOD
class VideoAsset {
  constructor(id, config = {}) {
    this.id = id;
    this.name = config.name || `asset-${id}`;
    this.source = config.source || null;
    this.status = 'pending';
    this.playbackUrl = null;
    this.downloadUrl = null;
    this.duration = null;
    this.size = null;
    this.createdAt = Date.now();
    this.metadata = config.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      source: this.source,
      status: this.status,
      playbackUrl: this.playbackUrl,
      downloadUrl: this.downloadUrl,
      duration: this.duration,
      size: this.size,
      createdAt: this.createdAt,
      metadata: this.metadata,
    };
  }
}

// AI Task class
class AITask {
  constructor(id, pipeline, config = {}) {
    this.id = id;
    this.pipeline = pipeline;
    this.status = 'pending';
    this.input = config.input || {};
    this.output = null;
    this.model = config.model || null;
    this.createdAt = Date.now();
    this.completedAt = null;
    this.error = null;
  }

  toJSON() {
    return {
      id: this.id,
      pipeline: this.pipeline,
      status: this.status,
      input: this.input,
      output: this.output,
      model: this.model,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      error: this.error,
    };
  }
}

class LivePeerClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.LIVEPEER_API_KEY || null;
    this.apiUrl = config.apiUrl || 'https://livepeer.studio/api';
    this.gatewayUrl = config.gatewayUrl || 'https://dream-gateway.livepeer.cloud';
    this.streams = new Map();
    this.assets = new Map();
    this.aiTasks = new Map();
    this.localRtmpPort = config.localRtmpPort || 1935;
    this.localHttpPort = config.localHttpPort || 8935;
    this.localProcess = null;
    this.initialized = false;
  }

  // Initialize client
  async initialize() {
    if (this.initialized) return { success: true };

    // Check for livepeer binary
    try {
      execSync('which livepeer', { encoding: 'utf-8' });
    } catch {
      // Livepeer not installed locally, will use API
    }

    this.initialized = true;
    this.emit('initialized');
    return { success: true, hasApiKey: !!this.apiKey };
  }

  // API request helper
  async _apiRequest(endpoint, method = 'GET', body = null) {
    if (!this.apiKey) {
      throw new Error('LivePeer API key not configured');
    }

    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.apiUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(parsed.error || `API error: ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Gateway request for AI
  async _gatewayRequest(pipeline, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(`/${pipeline}`, this.gatewayUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });
  }

  // =============================================
  // Stream Management
  // =============================================

  // Create a new stream
  async createStream(config = {}) {
    const id = `str_${Date.now().toString(36)}`;

    if (this.apiKey) {
      // Use LivePeer Studio API
      try {
        const response = await this._apiRequest('/stream', 'POST', {
          name: config.name || id,
          profiles: config.profiles || [
            { name: '720p', bitrate: 4000000, fps: 30, width: 1280, height: 720 },
            { name: '480p', bitrate: 2000000, fps: 30, width: 854, height: 480 },
            { name: '360p', bitrate: 1200000, fps: 30, width: 640, height: 360 },
          ],
          record: config.record || false,
        });

        const stream = new LiveStream(response.id, {
          name: response.name,
          profiles: response.profiles,
          record: response.record,
        });
        stream.rtmpUrl = `rtmp://rtmp.livepeer.com/live/${response.streamKey}`;
        stream.playbackUrl = `https://livepeercdn.studio/hls/${response.playbackId}/index.m3u8`;
        this.streams.set(stream.id, stream);

        this.emit('stream:created', stream.toJSON());
        return stream.toJSON();
      } catch (error) {
        throw new Error(`Failed to create stream: ${error.message}`);
      }
    }

    // Local mode - create stream definition
    const stream = new LiveStream(id, config);
    stream.rtmpUrl = `rtmp://localhost:${this.localRtmpPort}/live/${id}`;
    stream.playbackUrl = `http://localhost:${this.localHttpPort}/stream/${id}.m3u8`;
    this.streams.set(id, stream);

    this.emit('stream:created', stream.toJSON());
    return stream.toJSON();
  }

  // List all streams
  async listStreams() {
    if (this.apiKey) {
      try {
        const response = await this._apiRequest('/stream');
        return response.map(s => ({
          id: s.id,
          name: s.name,
          state: s.isActive ? STREAM_STATE.LIVE : STREAM_STATE.IDLE,
          playbackUrl: s.playbackId ? `https://livepeercdn.studio/hls/${s.playbackId}/index.m3u8` : null,
          createdAt: new Date(s.createdAt).getTime(),
        }));
      } catch (error) {
        throw new Error(`Failed to list streams: ${error.message}`);
      }
    }

    return Array.from(this.streams.values()).map(s => s.toJSON());
  }

  // Get stream by ID
  async getStream(streamId) {
    if (this.apiKey) {
      try {
        const response = await this._apiRequest(`/stream/${streamId}`);
        return {
          id: response.id,
          name: response.name,
          state: response.isActive ? STREAM_STATE.LIVE : STREAM_STATE.IDLE,
          rtmpUrl: response.streamKey ? `rtmp://rtmp.livepeer.com/live/${response.streamKey}` : null,
          playbackUrl: response.playbackId ? `https://livepeercdn.studio/hls/${response.playbackId}/index.m3u8` : null,
          profiles: response.profiles,
          record: response.record,
        };
      } catch (error) {
        throw new Error(`Failed to get stream: ${error.message}`);
      }
    }

    const stream = this.streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);
    return stream.toJSON();
  }

  // Delete stream
  async deleteStream(streamId) {
    if (this.apiKey) {
      try {
        await this._apiRequest(`/stream/${streamId}`, 'DELETE');
        this.streams.delete(streamId);
        this.emit('stream:deleted', { id: streamId });
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete stream: ${error.message}`);
      }
    }

    this.streams.delete(streamId);
    this.emit('stream:deleted', { id: streamId });
    return { success: true };
  }

  // Start local RTMP server
  async startLocalServer() {
    if (this.localProcess) {
      return { success: true, message: 'Server already running' };
    }

    // Try to use livepeer binary
    try {
      this.localProcess = spawn('livepeer', [
        '-broadcaster',
        '-rtmpAddr', `0.0.0.0:${this.localRtmpPort}`,
        '-httpAddr', `0.0.0.0:${this.localHttpPort}`,
      ]);

      this.localProcess.stdout.on('data', (data) => {
        this.emit('server:log', { type: 'stdout', data: data.toString() });
      });

      this.localProcess.stderr.on('data', (data) => {
        this.emit('server:log', { type: 'stderr', data: data.toString() });
      });

      this.localProcess.on('close', (code) => {
        this.localProcess = null;
        this.emit('server:stopped', { code });
      });

      return { success: true, rtmpPort: this.localRtmpPort, httpPort: this.localHttpPort };
    } catch (error) {
      // Fall back to FFmpeg-based RTMP server
      return { success: false, error: 'LivePeer binary not found. Install with: go install github.com/livepeer/go-livepeer/cmd/livepeer@latest' };
    }
  }

  // Stop local server
  async stopLocalServer() {
    if (!this.localProcess) {
      return { success: true, message: 'Server not running' };
    }

    this.localProcess.kill('SIGTERM');
    this.localProcess = null;
    return { success: true };
  }

  // =============================================
  // Video Assets (VOD)
  // =============================================

  // Upload video asset
  async uploadAsset(filePath, config = {}) {
    const id = `ast_${Date.now().toString(36)}`;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const asset = new VideoAsset(id, {
      name: config.name || path.basename(filePath),
      source: filePath,
      metadata: config.metadata,
    });

    if (this.apiKey) {
      try {
        // Request upload URL
        const uploadReq = await this._apiRequest('/asset/request-upload', 'POST', {
          name: asset.name,
        });

        // Upload file using tus protocol would go here
        // For now, store locally and mark as pending
        asset.status = 'processing';
        this.assets.set(id, asset);

        this.emit('asset:created', asset.toJSON());
        return asset.toJSON();
      } catch (error) {
        throw new Error(`Failed to upload asset: ${error.message}`);
      }
    }

    asset.status = 'ready';
    asset.playbackUrl = `file://${filePath}`;
    this.assets.set(id, asset);

    this.emit('asset:created', asset.toJSON());
    return asset.toJSON();
  }

  // List assets
  async listAssets() {
    if (this.apiKey) {
      try {
        const response = await this._apiRequest('/asset');
        return response.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status?.phase || 'unknown',
          playbackUrl: a.playbackId ? `https://livepeercdn.studio/hls/${a.playbackId}/index.m3u8` : null,
          duration: a.videoSpec?.duration,
          size: a.size,
          createdAt: new Date(a.createdAt).getTime(),
        }));
      } catch (error) {
        throw new Error(`Failed to list assets: ${error.message}`);
      }
    }

    return Array.from(this.assets.values()).map(a => a.toJSON());
  }

  // Transcode video locally with FFmpeg
  async transcodeLocal(inputPath, outputPath, profile = TRANSCODE_PROFILE.P720P30FPS) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-vf', `scale=${profile.width}:${profile.height}`,
        '-b:v', profile.bitrate.toString(),
        '-r', profile.fps.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputPath,
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        this.emit('transcode:progress', { output: data.toString() });
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: outputPath, profile: profile.name });
        } else {
          reject(new Error(`FFmpeg failed: ${stderr}`));
        }
      });
    });
  }

  // =============================================
  // AI Video Pipeline (LivePeer AI Gateway)
  // =============================================

  // Text to Image
  async textToImage(prompt, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.TEXT_TO_IMAGE, {
      input: { prompt, ...config },
      model: config.model || 'SG161222/RealVisXL_V4.0_Lightning',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey) {
      try {
        const response = await this._gatewayRequest('text-to-image', {
          prompt,
          model_id: task.model,
          width: config.width || 1024,
          height: config.height || 1024,
          guidance_scale: config.guidanceScale || 7.5,
          num_inference_steps: config.steps || 50,
          num_images_per_prompt: config.count || 1,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required for AI pipeline';
    return task.toJSON();
  }

  // Image to Image
  async imageToImage(imagePath, prompt, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.IMAGE_TO_IMAGE, {
      input: { imagePath, prompt, ...config },
      model: config.model || 'timbrooks/instruct-pix2pix',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey && fs.existsSync(imagePath)) {
      try {
        const imageData = fs.readFileSync(imagePath).toString('base64');
        const response = await this._gatewayRequest('image-to-image', {
          prompt,
          image: { data: imageData },
          model_id: task.model,
          strength: config.strength || 0.8,
          guidance_scale: config.guidanceScale || 7.5,
          num_inference_steps: config.steps || 50,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required or image not found';
    return task.toJSON();
  }

  // Image to Video
  async imageToVideo(imagePath, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.IMAGE_TO_VIDEO, {
      input: { imagePath, ...config },
      model: config.model || 'stabilityai/stable-video-diffusion-img2vid-xt-1-1',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey && fs.existsSync(imagePath)) {
      try {
        const imageData = fs.readFileSync(imagePath).toString('base64');
        const response = await this._gatewayRequest('image-to-video', {
          image: { data: imageData },
          model_id: task.model,
          fps: config.fps || 6,
          motion_bucket_id: config.motionBucket || 127,
          noise_aug_strength: config.noiseStrength || 0.02,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required or image not found';
    return task.toJSON();
  }

  // Upscale image
  async upscale(imagePath, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.UPSCALE, {
      input: { imagePath, ...config },
      model: config.model || 'stabilityai/stable-diffusion-x4-upscaler',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey && fs.existsSync(imagePath)) {
      try {
        const imageData = fs.readFileSync(imagePath).toString('base64');
        const response = await this._gatewayRequest('upscale', {
          image: { data: imageData },
          model_id: task.model,
          prompt: config.prompt || '',
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required or image not found';
    return task.toJSON();
  }

  // Audio to Text (Whisper)
  async audioToText(audioPath, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.AUDIO_TO_TEXT, {
      input: { audioPath, ...config },
      model: config.model || 'openai/whisper-large-v3',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey && fs.existsSync(audioPath)) {
      try {
        const audioData = fs.readFileSync(audioPath).toString('base64');
        const response = await this._gatewayRequest('audio-to-text', {
          audio: { data: audioData },
          model_id: task.model,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required or audio not found';
    return task.toJSON();
  }

  // Segment Anything 2
  async segmentAnything(imagePath, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.SEGMENT_ANYTHING, {
      input: { imagePath, ...config },
      model: config.model || 'facebook/sam2-hiera-large',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey && fs.existsSync(imagePath)) {
      try {
        const imageData = fs.readFileSync(imagePath).toString('base64');
        const response = await this._gatewayRequest('segment-anything-2', {
          image: { data: imageData },
          model_id: task.model,
          point_coords: config.pointCoords || null,
          point_labels: config.pointLabels || null,
          box: config.box || null,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required or image not found';
    return task.toJSON();
  }

  // LLM inference
  async llmInference(messages, config = {}) {
    const id = `ai_${Date.now().toString(36)}`;
    const task = new AITask(id, AI_PIPELINE.LLM, {
      input: { messages, ...config },
      model: config.model || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    });

    this.aiTasks.set(id, task);

    if (this.apiKey) {
      try {
        const response = await this._gatewayRequest('llm', {
          messages,
          model_id: task.model,
          max_tokens: config.maxTokens || 256,
          temperature: config.temperature || 0.7,
        });

        task.status = 'completed';
        task.output = response;
        task.completedAt = Date.now();

        this.emit('ai:completed', task.toJSON());
        return task.toJSON();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        throw error;
      }
    }

    task.status = 'failed';
    task.error = 'API key required';
    return task.toJSON();
  }

  // List AI tasks
  listAITasks() {
    return Array.from(this.aiTasks.values()).map(t => t.toJSON());
  }

  // Get AI task
  getAITask(taskId) {
    const task = this.aiTasks.get(taskId);
    if (!task) throw new Error(`AI task not found: ${taskId}`);
    return task.toJSON();
  }

  // Get supported models for a pipeline
  getSupportedModels(pipeline) {
    const models = {
      [AI_PIPELINE.TEXT_TO_IMAGE]: [
        'SG161222/RealVisXL_V4.0_Lightning',
        'stabilityai/stable-diffusion-xl-base-1.0',
        'runwayml/stable-diffusion-v1-5',
        'ByteDance/SDXL-Lightning',
      ],
      [AI_PIPELINE.IMAGE_TO_IMAGE]: [
        'timbrooks/instruct-pix2pix',
        'stabilityai/sd-turbo',
      ],
      [AI_PIPELINE.IMAGE_TO_VIDEO]: [
        'stabilityai/stable-video-diffusion-img2vid-xt-1-1',
      ],
      [AI_PIPELINE.UPSCALE]: [
        'stabilityai/stable-diffusion-x4-upscaler',
      ],
      [AI_PIPELINE.AUDIO_TO_TEXT]: [
        'openai/whisper-large-v3',
      ],
      [AI_PIPELINE.SEGMENT_ANYTHING]: [
        'facebook/sam2-hiera-large',
      ],
      [AI_PIPELINE.LLM]: [
        'meta-llama/Meta-Llama-3.1-8B-Instruct',
        'meta-llama/Meta-Llama-3.1-70B-Instruct',
      ],
    };

    return models[pipeline] || [];
  }

  // Get status
  getStatus() {
    return {
      initialized: this.initialized,
      hasApiKey: !!this.apiKey,
      localServerRunning: !!this.localProcess,
      streams: this.streams.size,
      assets: this.assets.size,
      aiTasks: this.aiTasks.size,
    };
  }

  // Cleanup
  async cleanup() {
    await this.stopLocalServer();
    this.streams.clear();
    this.assets.clear();
    this.aiTasks.clear();
  }
}

module.exports = {
  LivePeerClient,
  LiveStream,
  VideoAsset,
  AITask,
  STREAM_STATE,
  TRANSCODE_PROFILE,
  AI_PIPELINE,
};
