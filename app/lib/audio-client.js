// GentlyOS Audio Client - Dual-Mode Audio Engine
// Encode/decode data via audible (200-4000 Hz) and ultrasonic (18000-22000 Hz) frequencies

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'aud') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Audio modes
const AUDIO_MODE = {
  AUDIBLE: 'audible',         // Human-hearable 200-4000 Hz
  ULTRASONIC: 'ultrasonic',   // Above hearing 18000-22000 Hz
  DUAL: 'dual',               // Both channels
};

// Default sample rate
const DEFAULT_SAMPLE_RATE = 48000;

// Frequency band configuration
class FrequencyBand {
  constructor(base, spacing, symbols = 16) {
    this.base = base;           // Base frequency
    this.spacing = spacing;     // Hz between symbols
    this.symbols = symbols;     // Number of symbols (default 16 for hex nibble)
  }

  // Get frequency for a symbol (0-15)
  frequencyFor(symbol) {
    return this.base + (symbol * this.spacing);
  }

  // Get symbol for a frequency
  symbolFor(freq) {
    const symbol = Math.round((freq - this.base) / this.spacing);
    if (symbol >= 0 && symbol < this.symbols) {
      return symbol;
    }
    return null;
  }

  // Audible band preset
  static audible() {
    return new FrequencyBand(200, 200, 16); // 200-3200 Hz
  }

  // Ultrasonic band preset
  static ultrasonic() {
    return new FrequencyBand(18000, 200, 16); // 18000-21200 Hz
  }

  toJSON() {
    return {
      base: this.base,
      spacing: this.spacing,
      symbols: this.symbols,
      range: [this.base, this.base + (this.symbols - 1) * this.spacing],
    };
  }
}

// Audio instruction (single encoded value)
class AudioInstruction {
  constructor(value, frequency) {
    this.value = value;
    this.frequency = frequency;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      value: this.value,
      frequency: this.frequency,
      timestamp: this.timestamp,
    };
  }
}

// Audio Engine - Main encoder/decoder
class AudioEngine {
  constructor(mode = AUDIO_MODE.AUDIBLE) {
    this.mode = mode;
    this.sampleRate = DEFAULT_SAMPLE_RATE;
    this.toneDuration = 0.1; // 100ms per tone
    this.gapDuration = 0.02; // 20ms gap between tones

    // Configure bands based on mode
    if (mode === AUDIO_MODE.AUDIBLE || mode === AUDIO_MODE.DUAL) {
      this.audibleBand = FrequencyBand.audible();
    }
    if (mode === AUDIO_MODE.ULTRASONIC || mode === AUDIO_MODE.DUAL) {
      this.ultrasonicBand = FrequencyBand.ultrasonic();
    }

    this.activeBand = mode === AUDIO_MODE.ULTRASONIC ?
      this.ultrasonicBand : this.audibleBand;
  }

  // Set custom sample rate
  withSampleRate(sampleRate) {
    this.sampleRate = sampleRate;
    return this;
  }

  // Generate pure sine wave tone
  generateTone(frequency, duration) {
    const samples = Math.floor(this.sampleRate * duration);
    const buffer = new Float32Array(samples);
    const omega = 2 * Math.PI * frequency / this.sampleRate;

    for (let i = 0; i < samples; i++) {
      // Sine wave with fade in/out envelope
      const envelope = this.envelope(i, samples);
      buffer[i] = Math.sin(omega * i) * envelope;
    }

    return buffer;
  }

  // Envelope to prevent clicks (fade in/out)
  envelope(sample, total) {
    const fadeLength = Math.min(total * 0.1, 100);
    if (sample < fadeLength) {
      return sample / fadeLength;
    }
    if (sample > total - fadeLength) {
      return (total - sample) / fadeLength;
    }
    return 1.0;
  }

  // Generate silence (gap)
  generateGap() {
    const samples = Math.floor(this.sampleRate * this.gapDuration);
    return new Float32Array(samples);
  }

  // Generate chord (multiple frequencies)
  generateChord(frequencies, duration) {
    const samples = Math.floor(this.sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (const freq of frequencies) {
      const omega = 2 * Math.PI * freq / this.sampleRate;
      for (let i = 0; i < samples; i++) {
        const envelope = this.envelope(i, samples);
        buffer[i] += Math.sin(omega * i) * envelope / frequencies.length;
      }
    }

    return buffer;
  }

  // Encode single nibble (0-15) to audio
  encodeNibble(nibble) {
    const freq = this.activeBand.frequencyFor(nibble & 0x0F);
    return this.generateTone(freq, this.toneDuration);
  }

  // Encode single byte to audio (two tones: high nibble, low nibble)
  encodeByte(byte) {
    const highNibble = (byte >> 4) & 0x0F;
    const lowNibble = byte & 0x0F;

    const highTone = this.encodeNibble(highNibble);
    const gap = this.generateGap();
    const lowTone = this.encodeNibble(lowNibble);

    return this.concatenate([highTone, gap, lowTone]);
  }

  // Encode multiple bytes to audio
  encodeBytes(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const parts = [];

    for (let i = 0; i < buffer.length; i++) {
      parts.push(this.encodeByte(buffer[i]));
      if (i < buffer.length - 1) {
        parts.push(this.generateGap());
      }
    }

    return this.concatenate(parts);
  }

  // Encode string to audio
  encodeString(text) {
    return this.encodeBytes(Buffer.from(text, 'utf8'));
  }

  // Concatenate Float32Arrays
  concatenate(arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  // Detect dominant frequency in samples using autocorrelation
  detectFrequency(samples) {
    // Simplified frequency detection using autocorrelation
    const minPeriod = Math.floor(this.sampleRate / 22000); // Max freq
    const maxPeriod = Math.floor(this.sampleRate / 100);    // Min freq

    let bestPeriod = minPeriod;
    let bestCorr = -Infinity;

    for (let period = minPeriod; period < maxPeriod; period++) {
      let corr = 0;
      for (let i = 0; i < samples.length - period; i++) {
        corr += samples[i] * samples[i + period];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }

    return this.sampleRate / bestPeriod;
  }

  // Decode single tone to nibble
  decodeNibble(samples) {
    const freq = this.detectFrequency(samples);
    const symbol = this.activeBand.symbolFor(freq);
    return symbol !== null ? symbol : 0;
  }

  // Decode audio to byte
  decodeByte(samples) {
    const toneLength = Math.floor(this.sampleRate * this.toneDuration);
    const gapLength = Math.floor(this.sampleRate * this.gapDuration);

    // Extract high nibble
    const highSamples = samples.slice(0, toneLength);
    const highNibble = this.decodeNibble(highSamples);

    // Extract low nibble
    const lowStart = toneLength + gapLength;
    const lowSamples = samples.slice(lowStart, lowStart + toneLength);
    const lowNibble = this.decodeNibble(lowSamples);

    return (highNibble << 4) | lowNibble;
  }

  // Decode audio to bytes
  decodeBytes(samples, expectedCount) {
    const byteLength = Math.floor(this.sampleRate * (this.toneDuration * 2 + this.gapDuration * 2));
    const result = [];

    for (let i = 0; i < expectedCount; i++) {
      const start = i * byteLength;
      const byteSamples = samples.slice(start, start + byteLength);
      result.push(this.decodeByte(byteSamples));
    }

    return Buffer.from(result);
  }

  // Get audio info
  getInfo() {
    return {
      mode: this.mode,
      sampleRate: this.sampleRate,
      toneDuration: this.toneDuration,
      gapDuration: this.gapDuration,
      activeBand: this.activeBand.toJSON(),
      byteDuration: this.toneDuration * 2 + this.gapDuration * 2,
    };
  }
}

// Audio Session - Manages transmission/reception
class AudioSession {
  constructor(mode = AUDIO_MODE.AUDIBLE) {
    this.id = generateId('sess');
    this.engine = new AudioEngine(mode);
    this.state = 'idle';
    this.buffer = [];
    this.createdAt = Date.now();
  }

  // Prepare transmission
  prepareTransmit(data) {
    this.state = 'transmitting';
    const samples = this.engine.encodeBytes(data);
    return {
      id: this.id,
      samples: Array.from(samples),
      sampleRate: this.engine.sampleRate,
      duration: samples.length / this.engine.sampleRate,
      info: this.engine.getInfo(),
    };
  }

  // Start receiving
  startReceive(expectedBytes) {
    this.state = 'receiving';
    this.expectedBytes = expectedBytes;
    this.buffer = [];
    return { id: this.id, state: this.state };
  }

  // Process received samples
  processReceived(samples) {
    if (this.state !== 'receiving') {
      return { success: false, error: 'Not in receiving state' };
    }

    const data = this.engine.decodeBytes(
      Float32Array.from(samples),
      this.expectedBytes
    );

    this.state = 'complete';
    return {
      success: true,
      data: data.toString('utf8'),
      hex: data.toString('hex'),
      bytes: Array.from(data),
    };
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state,
      mode: this.engine.mode,
      createdAt: this.createdAt,
    };
  }
}

// Main Audio Client
class AudioClient {
  constructor() {
    this.sessions = new Map();
    this.defaultMode = AUDIO_MODE.AUDIBLE;
  }

  // Set default mode
  setMode(mode) {
    this.defaultMode = mode;
    return { success: true, mode };
  }

  // Create new session
  createSession(mode = null) {
    const session = new AudioSession(mode || this.defaultMode);
    this.sessions.set(session.id, session);
    return { success: true, session: session.toJSON() };
  }

  // Get session
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    return { success: true, session: session.toJSON() };
  }

  // Encode data to audio samples
  encode(data, mode = null) {
    const engine = new AudioEngine(mode || this.defaultMode);
    const input = typeof data === 'string' ? data : Buffer.from(data).toString();
    const samples = engine.encodeString(input);

    return {
      success: true,
      samples: Array.from(samples),
      sampleRate: engine.sampleRate,
      duration: samples.length / engine.sampleRate,
      byteCount: Buffer.from(input).length,
      info: engine.getInfo(),
    };
  }

  // Decode audio samples to data
  decode(samples, expectedBytes, mode = null) {
    const engine = new AudioEngine(mode || this.defaultMode);
    const data = engine.decodeBytes(Float32Array.from(samples), expectedBytes);

    return {
      success: true,
      data: data.toString('utf8'),
      hex: data.toString('hex'),
      bytes: Array.from(data),
    };
  }

  // Prepare transmission via session
  prepareTransmit(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    return { success: true, ...session.prepareTransmit(data) };
  }

  // Start receiving via session
  startReceive(sessionId, expectedBytes) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    return { success: true, ...session.startReceive(expectedBytes) };
  }

  // Process received samples via session
  processReceived(sessionId, samples) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    return session.processReceived(samples);
  }

  // Generate single tone
  generateTone(frequency, duration = 0.1, mode = null) {
    const engine = new AudioEngine(mode || this.defaultMode);
    const samples = engine.generateTone(frequency, duration);
    return {
      success: true,
      samples: Array.from(samples),
      sampleRate: engine.sampleRate,
      duration,
      frequency,
    };
  }

  // Generate chord
  generateChord(frequencies, duration = 0.5, mode = null) {
    const engine = new AudioEngine(mode || this.defaultMode);
    const samples = engine.generateChord(frequencies, duration);
    return {
      success: true,
      samples: Array.from(samples),
      sampleRate: engine.sampleRate,
      duration,
      frequencies,
    };
  }

  // Get frequency bands info
  getBands() {
    return {
      success: true,
      audible: FrequencyBand.audible().toJSON(),
      ultrasonic: FrequencyBand.ultrasonic().toJSON(),
    };
  }

  // Get modes
  getModes() {
    return { success: true, modes: AUDIO_MODE };
  }

  // List sessions
  listSessions() {
    return {
      success: true,
      sessions: Array.from(this.sessions.values()).map(s => s.toJSON()),
    };
  }

  // Delete session
  deleteSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return { success: false, error: 'Session not found' };
    }
    this.sessions.delete(sessionId);
    return { success: true };
  }

  // Calculate transmission time for data
  calculateDuration(dataLength, mode = null) {
    const engine = new AudioEngine(mode || this.defaultMode);
    const info = engine.getInfo();
    const duration = dataLength * info.byteDuration;
    return {
      success: true,
      bytes: dataLength,
      duration,
      durationMs: Math.round(duration * 1000),
    };
  }
}

module.exports = {
  AudioClient,
  AudioEngine,
  AudioSession,
  AudioInstruction,
  FrequencyBand,
  AUDIO_MODE,
  DEFAULT_SAMPLE_RATE,
};
