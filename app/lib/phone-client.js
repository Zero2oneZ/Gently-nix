// GentlyOS Phone Emulator Client - Android/iOS Emulation Control
// Manage phone emulators for testing and development

const { EventEmitter } = require('events');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Emulator types
const EMULATOR_TYPE = {
  ANDROID_AVD: 'android-avd',      // Android Studio AVD
  ANDROID_GENYMOTION: 'genymotion', // Genymotion
  ANDROID_WAYDROID: 'waydroid',    // Waydroid (Linux native)
  IOS_SIMULATOR: 'ios-simulator',   // Xcode Simulator
  ANBOX: 'anbox',                   // Anbox
};

// Emulator state
const EMULATOR_STATE = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
};

// Device types
const DEVICE_TYPE = {
  PHONE: 'phone',
  TABLET: 'tablet',
  TV: 'tv',
  WATCH: 'watch',
  AUTO: 'auto',
};

// Generate ID
function generateId(prefix = 'emu') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// Emulator instance
class EmulatorInstance {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Untitled Emulator';
    this.type = data.type || EMULATOR_TYPE.ANDROID_WAYDROID;
    this.deviceType = data.deviceType || DEVICE_TYPE.PHONE;
    this.state = EMULATOR_STATE.STOPPED;
    this.process = null;
    this.pid = null;
    this.port = data.port || 5554;
    this.adbPort = data.adbPort || 5555;
    this.resolution = data.resolution || { width: 1080, height: 2340 };
    this.dpi = data.dpi || 420;
    this.apiLevel = data.apiLevel || 33;
    this.osVersion = data.osVersion || '13';
    this.cpuCores = data.cpuCores || 4;
    this.ramMB = data.ramMB || 4096;
    this.storageGB = data.storageGB || 64;
    this.gpu = data.gpu || 'auto'; // auto, host, swiftshader, angle
    this.skin = data.skin || null;
    this.snapshot = data.snapshot || null;
    this.networkDelay = data.networkDelay || 'none'; // none, gprs, edge, umts, etc
    this.networkSpeed = data.networkSpeed || 'full'; // gsm, hscsd, gprs, edge, umts, hsdpa, lte, full
    this.startTime = null;
    this.consoleSocket = null;
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      deviceType: this.deviceType,
      state: this.state,
      pid: this.pid,
      port: this.port,
      adbPort: this.adbPort,
      resolution: this.resolution,
      dpi: this.dpi,
      apiLevel: this.apiLevel,
      osVersion: this.osVersion,
      cpuCores: this.cpuCores,
      ramMB: this.ramMB,
      storageGB: this.storageGB,
      gpu: this.gpu,
      networkDelay: this.networkDelay,
      networkSpeed: this.networkSpeed,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : null,
    };
  }
}

// AVD (Android Virtual Device) definition
class AVDDefinition {
  constructor(data = {}) {
    this.name = data.name || '';
    this.device = data.device || 'pixel_6';
    this.systemImage = data.systemImage || 'system-images;android-33;google_apis;x86_64';
    this.abi = data.abi || 'x86_64';
    this.sdkPath = data.sdkPath || process.env.ANDROID_SDK_ROOT || '~/.android-sdk';
    this.avdPath = data.avdPath || path.join(process.env.HOME || '/home/deck', '.android', 'avd');
    this.tag = data.tag || 'google_apis';
  }

  toJSON() {
    return {
      name: this.name,
      device: this.device,
      systemImage: this.systemImage,
      abi: this.abi,
    };
  }
}

// Phone emulator client
class PhoneClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.emulators = new Map();
    this.avds = new Map();
    this.activeEmulator = null;
    this.sdkPath = config.sdkPath || process.env.ANDROID_SDK_ROOT || '~/.android-sdk';
    this.waydroidPath = config.waydroidPath || '/usr/bin/waydroid';
    this.adbPath = config.adbPath || 'adb';
    this.emulatorPath = config.emulatorPath || path.join(this.sdkPath, 'emulator', 'emulator');

    // Detect available emulator backends
    this.availableBackends = [];
    this._detectBackends();
  }

  async _detectBackends() {
    // Check for Waydroid
    exec('which waydroid', (err) => {
      if (!err) this.availableBackends.push(EMULATOR_TYPE.ANDROID_WAYDROID);
    });

    // Check for Android emulator
    exec('which emulator', (err) => {
      if (!err) this.availableBackends.push(EMULATOR_TYPE.ANDROID_AVD);
    });

    // Check for Anbox
    exec('which anbox', (err) => {
      if (!err) this.availableBackends.push(EMULATOR_TYPE.ANBOX);
    });
  }

  // List available AVDs
  async listAVDs() {
    return new Promise((resolve, reject) => {
      exec(`${this.emulatorPath} -list-avds 2>/dev/null`, (error, stdout) => {
        if (error) {
          return resolve({ success: true, avds: [] });
        }

        const avds = stdout.trim().split('\n').filter(a => a).map(name => ({
          name,
          type: EMULATOR_TYPE.ANDROID_AVD,
        }));

        resolve({ success: true, avds });
      });
    });
  }

  // Create AVD
  async createAVD(config) {
    const avd = new AVDDefinition(config);

    return new Promise((resolve, reject) => {
      const cmd = `avdmanager create avd -n "${avd.name}" -k "${avd.systemImage}" -d "${avd.device}" --force`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }

        this.avds.set(avd.name, avd);
        resolve({ success: true, avd: avd.toJSON() });
      });
    });
  }

  // Delete AVD
  async deleteAVD(avdName) {
    return new Promise((resolve, reject) => {
      exec(`avdmanager delete avd -n "${avdName}"`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }

        this.avds.delete(avdName);
        resolve({ success: true });
      });
    });
  }

  // Create emulator instance
  createEmulator(data) {
    const emulator = new EmulatorInstance(data);
    this.emulators.set(emulator.id, emulator);
    this.emit('emulator-created', { emulator: emulator.toJSON() });
    return { success: true, emulator: emulator.toJSON() };
  }

  // Start emulator (AVD)
  async startAVD(avdName, options = {}) {
    const emulator = new EmulatorInstance({
      name: avdName,
      type: EMULATOR_TYPE.ANDROID_AVD,
      ...options,
    });

    const args = [
      `-avd`, avdName,
      `-gpu`, emulator.gpu,
      `-port`, emulator.port.toString(),
    ];

    if (options.noWindow) args.push('-no-window');
    if (options.noAudio) args.push('-no-audio');
    if (options.noSnapshot) args.push('-no-snapshot');
    if (options.wipeData) args.push('-wipe-data');
    if (options.memory) args.push('-memory', options.memory.toString());

    try {
      emulator.state = EMULATOR_STATE.STARTING;
      emulator.process = spawn(this.emulatorPath, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      emulator.pid = emulator.process.pid;
      emulator.startTime = Date.now();

      emulator.process.on('error', (err) => {
        emulator.state = EMULATOR_STATE.ERROR;
        this.emit('emulator-error', { emulator: emulator.id, error: err.message });
      });

      emulator.process.on('exit', (code) => {
        emulator.state = EMULATOR_STATE.STOPPED;
        emulator.process = null;
        this.emit('emulator-stopped', { emulator: emulator.id, exitCode: code });
      });

      // Wait for boot
      await this._waitForBoot(emulator);

      this.emulators.set(emulator.id, emulator);
      this.activeEmulator = emulator;

      this.emit('emulator-started', { emulator: emulator.toJSON() });
      return { success: true, emulator: emulator.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Start Waydroid
  async startWaydroid(options = {}) {
    const emulator = new EmulatorInstance({
      name: 'Waydroid',
      type: EMULATOR_TYPE.ANDROID_WAYDROID,
      ...options,
    });

    try {
      emulator.state = EMULATOR_STATE.STARTING;

      // Initialize Waydroid if needed
      await this._execAsync('waydroid init 2>/dev/null || true');

      // Start Waydroid session
      emulator.process = spawn('waydroid', ['session', 'start'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      emulator.pid = emulator.process.pid;
      emulator.startTime = Date.now();

      emulator.process.on('exit', () => {
        emulator.state = EMULATOR_STATE.STOPPED;
      });

      // Show UI
      spawn('waydroid', ['show-full-ui'], { detached: true, stdio: 'ignore' });

      emulator.state = EMULATOR_STATE.RUNNING;
      this.emulators.set(emulator.id, emulator);
      this.activeEmulator = emulator;

      this.emit('emulator-started', { emulator: emulator.toJSON() });
      return { success: true, emulator: emulator.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Stop emulator
  async stopEmulator(emulatorId) {
    const emulator = this.emulators.get(emulatorId);
    if (!emulator) return { success: false, error: 'Emulator not found' };

    try {
      if (emulator.type === EMULATOR_TYPE.ANDROID_WAYDROID) {
        await this._execAsync('waydroid session stop');
      } else if (emulator.process) {
        emulator.process.kill('SIGTERM');
      } else if (emulator.pid) {
        process.kill(emulator.pid, 'SIGTERM');
      }

      emulator.state = EMULATOR_STATE.STOPPED;
      emulator.process = null;
      emulator.pid = null;

      if (this.activeEmulator?.id === emulatorId) {
        this.activeEmulator = null;
      }

      this.emit('emulator-stopped', { emulator: emulatorId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Kill all emulators
  async killAll() {
    for (const emulator of this.emulators.values()) {
      await this.stopEmulator(emulator.id);
    }
    return { success: true };
  }

  // List running emulators
  listEmulators() {
    return {
      success: true,
      emulators: Array.from(this.emulators.values()).map(e => e.toJSON()),
      active: this.activeEmulator?.toJSON() || null,
    };
  }

  // Get emulator status
  getEmulatorStatus(emulatorId) {
    const emulator = this.emulators.get(emulatorId);
    if (!emulator) return { success: false, error: 'Emulator not found' };
    return { success: true, emulator: emulator.toJSON() };
  }

  // Install APK
  async installAPK(apkPath, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    return new Promise((resolve) => {
      const cmd = emulator.type === EMULATOR_TYPE.ANDROID_WAYDROID
        ? `waydroid app install "${apkPath}"`
        : `${this.adbPath} -s emulator-${emulator.port} install "${apkPath}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        resolve({ success: true, output: stdout });
      });
    });
  }

  // Uninstall app
  async uninstallApp(packageName, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    return new Promise((resolve) => {
      const cmd = emulator.type === EMULATOR_TYPE.ANDROID_WAYDROID
        ? `waydroid app remove "${packageName}"`
        : `${this.adbPath} -s emulator-${emulator.port} uninstall "${packageName}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        resolve({ success: true });
      });
    });
  }

  // Launch app
  async launchApp(packageName, activity = null, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    return new Promise((resolve) => {
      const activityStr = activity || `${packageName}/.MainActivity`;
      const cmd = emulator.type === EMULATOR_TYPE.ANDROID_WAYDROID
        ? `waydroid app launch "${packageName}"`
        : `${this.adbPath} -s emulator-${emulator.port} shell am start -n "${activityStr}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        resolve({ success: true });
      });
    });
  }

  // List installed apps
  async listApps(emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    return new Promise((resolve) => {
      const cmd = emulator.type === EMULATOR_TYPE.ANDROID_WAYDROID
        ? `waydroid app list`
        : `${this.adbPath} -s emulator-${emulator.port} shell pm list packages`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }

        const apps = stdout.split('\n')
          .map(line => line.replace('package:', '').trim())
          .filter(p => p);

        resolve({ success: true, apps });
      });
    });
  }

  // Take screenshot
  async screenshot(emulatorId = null, outputPath = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    const filename = outputPath || `/tmp/emulator_screenshot_${Date.now()}.png`;

    return new Promise((resolve) => {
      const cmd = `${this.adbPath} -s emulator-${emulator.port} exec-out screencap -p > "${filename}"`;

      exec(cmd, (error) => {
        if (error) {
          return resolve({ success: false, error: error.message });
        }
        resolve({ success: true, path: filename });
      });
    });
  }

  // Record screen
  async recordScreen(emulatorId = null, duration = 30) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    const remotePath = `/sdcard/screen_${Date.now()}.mp4`;
    const localPath = `/tmp/emulator_recording_${Date.now()}.mp4`;

    return new Promise((resolve) => {
      const startCmd = `${this.adbPath} -s emulator-${emulator.port} shell screenrecord --time-limit ${duration} "${remotePath}"`;

      exec(startCmd, (error) => {
        if (error) {
          return resolve({ success: false, error: error.message });
        }

        // Pull recording
        setTimeout(() => {
          exec(`${this.adbPath} -s emulator-${emulator.port} pull "${remotePath}" "${localPath}"`, (pullErr) => {
            if (pullErr) {
              return resolve({ success: false, error: pullErr.message });
            }
            resolve({ success: true, path: localPath });
          });
        }, (duration + 2) * 1000);
      });
    });
  }

  // Send input event
  async sendInput(inputType, ...args) {
    const emulator = this.activeEmulator;
    if (!emulator) return { success: false, error: 'No emulator available' };

    return new Promise((resolve) => {
      let cmd;
      switch (inputType) {
        case 'tap':
          cmd = `${this.adbPath} -s emulator-${emulator.port} shell input tap ${args[0]} ${args[1]}`;
          break;
        case 'swipe':
          cmd = `${this.adbPath} -s emulator-${emulator.port} shell input swipe ${args.join(' ')}`;
          break;
        case 'text':
          cmd = `${this.adbPath} -s emulator-${emulator.port} shell input text "${args[0]}"`;
          break;
        case 'keyevent':
          cmd = `${this.adbPath} -s emulator-${emulator.port} shell input keyevent ${args[0]}`;
          break;
        default:
          return resolve({ success: false, error: 'Unknown input type' });
      }

      exec(cmd, (error) => {
        if (error) {
          return resolve({ success: false, error: error.message });
        }
        resolve({ success: true });
      });
    });
  }

  // Set GPS location
  async setLocation(latitude, longitude, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    // For AVD, use telnet console
    if (emulator.type === EMULATOR_TYPE.ANDROID_AVD) {
      return this._sendConsoleCommand(emulator.port, `geo fix ${longitude} ${latitude}`);
    }

    return { success: false, error: 'Location setting not supported for this emulator type' };
  }

  // Set network conditions
  async setNetwork(delay, speed, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    if (emulator.type === EMULATOR_TYPE.ANDROID_AVD) {
      const delayResult = await this._sendConsoleCommand(emulator.port, `network delay ${delay}`);
      const speedResult = await this._sendConsoleCommand(emulator.port, `network speed ${speed}`);
      return { success: delayResult.success && speedResult.success };
    }

    return { success: false, error: 'Network setting not supported for this emulator type' };
  }

  // Set battery level
  async setBattery(level, charging = true, emulatorId = null) {
    const emulator = emulatorId
      ? this.emulators.get(emulatorId)
      : this.activeEmulator;

    if (!emulator) return { success: false, error: 'No emulator available' };

    if (emulator.type === EMULATOR_TYPE.ANDROID_AVD) {
      await this._sendConsoleCommand(emulator.port, `power capacity ${level}`);
      await this._sendConsoleCommand(emulator.port, `power status ${charging ? 'charging' : 'discharging'}`);
      return { success: true };
    }

    return { success: false, error: 'Battery setting not supported for this emulator type' };
  }

  // Send console command (telnet)
  _sendConsoleCommand(port, command) {
    return new Promise((resolve) => {
      const client = net.createConnection({ port }, () => {
        client.write(`${command}\n`);
        setTimeout(() => {
          client.write('quit\n');
          client.end();
        }, 100);
      });

      client.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      client.on('close', () => {
        resolve({ success: true });
      });
    });
  }

  // Wait for emulator boot
  async _waitForBoot(emulator, timeout = 120000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this._execAsync(
          `${this.adbPath} -s emulator-${emulator.port} shell getprop sys.boot_completed`
        );
        if (result.trim() === '1') {
          emulator.state = EMULATOR_STATE.RUNNING;
          return true;
        }
      } catch (e) {
        // Emulator not ready yet
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    throw new Error('Emulator boot timeout');
  }

  // Execute async command
  _execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout);
      });
    });
  }

  // Get available backends
  getBackends() {
    return {
      success: true,
      backends: this.availableBackends,
    };
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      EMULATOR_TYPE,
      EMULATOR_STATE,
      DEVICE_TYPE,
    };
  }
}

module.exports = {
  PhoneClient,
  EmulatorInstance,
  AVDDefinition,
  EMULATOR_TYPE,
  EMULATOR_STATE,
  DEVICE_TYPE,
};
