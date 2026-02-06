// GentlyOS Controller Client - Full Steam Deck Controls
// Direct access to all Steam Deck inputs via evdev

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Steam Deck button codes (evdev)
const BUTTON = {
  // Face buttons
  A: 304,           // BTN_SOUTH
  B: 305,           // BTN_EAST
  X: 307,           // BTN_NORTH
  Y: 308,           // BTN_WEST

  // Shoulder buttons
  L1: 310,          // BTN_TL
  R1: 311,          // BTN_TR
  L2: 312,          // BTN_TL2 (digital)
  R2: 313,          // BTN_TR2 (digital)

  // Stick clicks
  L3: 317,          // BTN_THUMBL
  R3: 318,          // BTN_THUMBR

  // Menu buttons
  SELECT: 314,      // BTN_SELECT (View)
  START: 315,       // BTN_START (Menu)
  STEAM: 316,       // BTN_MODE (Steam button)
  QAM: 319,         // Quick Access Menu (...)

  // D-Pad (often as HAT, but can be buttons)
  DPAD_UP: 544,
  DPAD_DOWN: 545,
  DPAD_LEFT: 546,
  DPAD_RIGHT: 547,

  // Back grip buttons (Steam Deck specific)
  L4: 336,          // BTN_TRIGGER_HAPPY1
  R4: 337,          // BTN_TRIGGER_HAPPY2
  L5: 338,          // BTN_TRIGGER_HAPPY3
  R5: 339,          // BTN_TRIGGER_HAPPY4

  // Trackpad clicks
  TRACKPAD_LEFT: 320,
  TRACKPAD_RIGHT: 321,
};

// Axis codes
const AXIS = {
  // Left stick
  LEFT_X: 0,        // ABS_X
  LEFT_Y: 1,        // ABS_Y

  // Right stick
  RIGHT_X: 3,       // ABS_RX
  RIGHT_Y: 4,       // ABS_RY

  // Triggers (analog)
  L2: 2,            // ABS_Z
  R2: 5,            // ABS_RZ

  // D-Pad as HAT
  DPAD_X: 16,       // ABS_HAT0X
  DPAD_Y: 17,       // ABS_HAT0Y

  // Left trackpad
  TRACKPAD_LEFT_X: 20,
  TRACKPAD_LEFT_Y: 21,

  // Right trackpad
  TRACKPAD_RIGHT_X: 22,
  TRACKPAD_RIGHT_Y: 23,

  // Gyro/Accel (if exposed)
  GYRO_X: 24,
  GYRO_Y: 25,
  GYRO_Z: 26,
  ACCEL_X: 27,
  ACCEL_Y: 28,
  ACCEL_Z: 29,
};

// Event types
const EV_TYPE = {
  SYN: 0,
  KEY: 1,
  REL: 2,
  ABS: 3,
  MSC: 4,
  SW: 5,
  FF: 21,
};

// Input event struct size (16 bytes on 32-bit, 24 on 64-bit)
const INPUT_EVENT_SIZE = 24;

// Controller state
class ControllerState {
  constructor() {
    this.buttons = {};
    this.axes = {};
    this.trackpads = {
      left: { x: 0, y: 0, touched: false, pressed: false },
      right: { x: 0, y: 0, touched: false, pressed: false },
    };
    this.sticks = {
      left: { x: 0, y: 0, pressed: false },
      right: { x: 0, y: 0, pressed: false },
    };
    this.triggers = {
      left: 0,
      right: 0,
    };
    this.dpad = {
      up: false,
      down: false,
      left: false,
      right: false,
    };
    this.gyro = { x: 0, y: 0, z: 0 };
    this.accel = { x: 0, y: 0, z: 0 };

    // Initialize all buttons as released
    Object.values(BUTTON).forEach(code => {
      this.buttons[code] = false;
    });
  }

  clone() {
    const s = new ControllerState();
    s.buttons = { ...this.buttons };
    s.axes = { ...this.axes };
    s.trackpads = JSON.parse(JSON.stringify(this.trackpads));
    s.sticks = JSON.parse(JSON.stringify(this.sticks));
    s.triggers = { ...this.triggers };
    s.dpad = { ...this.dpad };
    s.gyro = { ...this.gyro };
    s.accel = { ...this.accel };
    return s;
  }

  toJSON() {
    return {
      buttons: this.buttons,
      sticks: this.sticks,
      triggers: this.triggers,
      dpad: this.dpad,
      trackpads: this.trackpads,
      gyro: this.gyro,
      accel: this.accel,
    };
  }
}

// Action binding
class ActionBinding {
  constructor(data = {}) {
    this.id = data.id || `bind_${Date.now()}`;
    this.name = data.name || 'Unnamed';
    this.inputs = data.inputs || []; // Array of input conditions
    this.action = data.action || null;
    this.type = data.type || 'press'; // press, release, hold, repeat
    this.holdTime = data.holdTime || 500; // ms for hold
    this.repeatRate = data.repeatRate || 100; // ms for repeat
    this.enabled = data.enabled !== false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      inputs: this.inputs,
      action: this.action,
      type: this.type,
      holdTime: this.holdTime,
      repeatRate: this.repeatRate,
      enabled: this.enabled,
    };
  }
}

// Main Controller Client
class ControllerClient extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.state = new ControllerState();
    this.prevState = new ControllerState();
    this.bindings = new Map();
    this.profiles = new Map();
    this.activeProfile = 'default';
    this.connected = false;
    this.polling = false;
    this.pollInterval = null;
    this.deviceFds = new Map();
    this.holdTimers = new Map();
    this.repeatTimers = new Map();

    // Axis calibration
    this.calibration = {
      stickDeadzone: 0.1,
      triggerDeadzone: 0.02,
      trackpadDeadzone: 0.0,
    };

    // Initialize default profile
    this._initDefaultProfile();
  }

  // Initialize default control profile
  _initDefaultProfile() {
    const profile = {
      name: 'default',
      bindings: [
        { name: 'confirm', inputs: [{ button: 'A' }], action: 'ui:confirm' },
        { name: 'cancel', inputs: [{ button: 'B' }], action: 'ui:cancel' },
        { name: 'menu', inputs: [{ button: 'START' }], action: 'ui:menu' },
        { name: 'back', inputs: [{ button: 'SELECT' }], action: 'ui:back' },
        { name: 'quick-menu', inputs: [{ button: 'QAM' }], action: 'ui:quick-menu' },
        { name: 'scroll-up', inputs: [{ button: 'DPAD_UP' }], action: 'ui:scroll-up', type: 'repeat' },
        { name: 'scroll-down', inputs: [{ button: 'DPAD_DOWN' }], action: 'ui:scroll-down', type: 'repeat' },
        { name: 'tab-left', inputs: [{ button: 'L1' }], action: 'ui:tab-left' },
        { name: 'tab-right', inputs: [{ button: 'R1' }], action: 'ui:tab-right' },
        { name: 'zoom-in', inputs: [{ button: 'R2' }], action: 'ui:zoom-in' },
        { name: 'zoom-out', inputs: [{ button: 'L2' }], action: 'ui:zoom-out' },
        { name: 'screenshot', inputs: [{ button: 'STEAM' }, { button: 'R1' }], action: 'system:screenshot' },
      ],
    };
    this.profiles.set('default', profile);
    this._loadProfileBindings('default');
  }

  // Load bindings from profile
  _loadProfileBindings(profileName) {
    const profile = this.profiles.get(profileName);
    if (!profile) return;

    this.bindings.clear();
    for (const b of profile.bindings) {
      const binding = new ActionBinding(b);
      this.bindings.set(binding.id, binding);
    }
    this.activeProfile = profileName;
  }

  // Scan for input devices
  scanDevices() {
    const inputDir = '/dev/input';
    const devices = [];

    try {
      const entries = fs.readdirSync(inputDir);
      for (const entry of entries) {
        if (entry.startsWith('event')) {
          const devicePath = path.join(inputDir, entry);
          const info = this._getDeviceInfo(devicePath);
          if (info) {
            devices.push({
              path: devicePath,
              ...info,
            });
          }
        }
      }
    } catch (err) {
      // Permission denied or dir not found
    }

    // Also check by-id for named devices
    try {
      const byIdDir = '/dev/input/by-id';
      const entries = fs.readdirSync(byIdDir);
      for (const entry of entries) {
        if (entry.includes('Valve') || entry.includes('Steam') || entry.includes('Deck')) {
          const realPath = fs.realpathSync(path.join(byIdDir, entry));
          if (!devices.find(d => d.path === realPath)) {
            devices.push({
              path: realPath,
              name: entry,
              type: 'steam-deck',
            });
          }
        }
      }
    } catch (err) {
      // No by-id dir
    }

    return { success: true, devices };
  }

  // Get device info via ioctl (simplified)
  _getDeviceInfo(devicePath) {
    try {
      // Check if readable
      fs.accessSync(devicePath, fs.constants.R_OK);

      // Try to identify by path patterns
      const name = path.basename(devicePath);

      return {
        name: name,
        type: 'evdev',
        readable: true,
      };
    } catch {
      return null;
    }
  }

  // Connect to controller
  connect(devicePath = null) {
    // Auto-detect Steam Deck controller if no path given
    if (!devicePath) {
      const scan = this.scanDevices();
      const deckDevice = scan.devices.find(d =>
        d.name?.includes('Valve') ||
        d.name?.includes('Steam') ||
        d.type === 'steam-deck'
      );

      if (deckDevice) {
        devicePath = deckDevice.path;
      } else if (scan.devices.length > 0) {
        // Use first available event device
        devicePath = scan.devices[0].path;
      } else {
        return { success: false, error: 'No controller found' };
      }
    }

    try {
      const fd = fs.openSync(devicePath, 'r');
      this.deviceFds.set(devicePath, fd);
      this.connected = true;
      this.emit('connected', { device: devicePath });

      // Start reading
      this._startReading(devicePath, fd);

      return { success: true, device: devicePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Disconnect
  disconnect() {
    for (const [path, fd] of this.deviceFds) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    this.deviceFds.clear();
    this.connected = false;
    this.stopPolling();
    this.emit('disconnected');
    return { success: true };
  }

  // Start reading input events
  _startReading(devicePath, fd) {
    const buffer = Buffer.alloc(INPUT_EVENT_SIZE);

    const readLoop = () => {
      if (!this.connected) return;

      try {
        const bytesRead = fs.readSync(fd, buffer, 0, INPUT_EVENT_SIZE, null);
        if (bytesRead === INPUT_EVENT_SIZE) {
          this._processEvent(buffer);
        }
      } catch (err) {
        if (err.code !== 'EAGAIN' && err.code !== 'EWOULDBLOCK') {
          this.emit('error', { error: err.message });
        }
      }

      // Continue reading
      setImmediate(readLoop);
    };

    // Use non-blocking async read in practice
    // For now, use polling approach
    this.pollInterval = setInterval(() => {
      try {
        const bytesRead = fs.readSync(fd, buffer, 0, INPUT_EVENT_SIZE, null);
        if (bytesRead === INPUT_EVENT_SIZE) {
          this._processEvent(buffer);
        }
      } catch {}
    }, 1); // 1ms poll rate
  }

  // Process input event
  _processEvent(buffer) {
    // Parse input_event struct (64-bit)
    // struct input_event {
    //   struct timeval time; // 16 bytes (tv_sec: 8, tv_usec: 8)
    //   __u16 type;
    //   __u16 code;
    //   __s32 value;
    // }

    const type = buffer.readUInt16LE(16);
    const code = buffer.readUInt16LE(18);
    const value = buffer.readInt32LE(20);

    this.prevState = this.state.clone();

    switch (type) {
      case EV_TYPE.KEY:
        this._handleButton(code, value);
        break;
      case EV_TYPE.ABS:
        this._handleAxis(code, value);
        break;
      case EV_TYPE.SYN:
        // Sync event - emit state update
        this._checkBindings();
        this.emit('state', this.state.toJSON());
        break;
    }
  }

  // Handle button event
  _handleButton(code, value) {
    const pressed = value === 1;
    const wasPressed = this.state.buttons[code];
    this.state.buttons[code] = pressed;

    // Find button name
    const buttonName = Object.keys(BUTTON).find(k => BUTTON[k] === code);

    if (pressed && !wasPressed) {
      this.emit('button:press', { button: buttonName, code });
    } else if (!pressed && wasPressed) {
      this.emit('button:release', { button: buttonName, code });
    }

    // Update specific state objects
    switch (code) {
      case BUTTON.L3:
        this.state.sticks.left.pressed = pressed;
        break;
      case BUTTON.R3:
        this.state.sticks.right.pressed = pressed;
        break;
      case BUTTON.TRACKPAD_LEFT:
        this.state.trackpads.left.pressed = pressed;
        break;
      case BUTTON.TRACKPAD_RIGHT:
        this.state.trackpads.right.pressed = pressed;
        break;
      case BUTTON.DPAD_UP:
        this.state.dpad.up = pressed;
        break;
      case BUTTON.DPAD_DOWN:
        this.state.dpad.down = pressed;
        break;
      case BUTTON.DPAD_LEFT:
        this.state.dpad.left = pressed;
        break;
      case BUTTON.DPAD_RIGHT:
        this.state.dpad.right = pressed;
        break;
    }
  }

  // Handle axis event
  _handleAxis(code, value) {
    this.state.axes[code] = value;

    // Normalize and apply deadzone
    const normalize = (v, min, max, deadzone) => {
      const range = max - min;
      const centered = (v - min) / range * 2 - 1; // -1 to 1
      if (Math.abs(centered) < deadzone) return 0;
      return centered;
    };

    const normalizeTrigger = (v, max, deadzone) => {
      const normalized = v / max;
      if (normalized < deadzone) return 0;
      return normalized;
    };

    switch (code) {
      case AXIS.LEFT_X:
        this.state.sticks.left.x = normalize(value, -32768, 32767, this.calibration.stickDeadzone);
        this.emit('stick:left', this.state.sticks.left);
        break;
      case AXIS.LEFT_Y:
        this.state.sticks.left.y = normalize(value, -32768, 32767, this.calibration.stickDeadzone);
        this.emit('stick:left', this.state.sticks.left);
        break;
      case AXIS.RIGHT_X:
        this.state.sticks.right.x = normalize(value, -32768, 32767, this.calibration.stickDeadzone);
        this.emit('stick:right', this.state.sticks.right);
        break;
      case AXIS.RIGHT_Y:
        this.state.sticks.right.y = normalize(value, -32768, 32767, this.calibration.stickDeadzone);
        this.emit('stick:right', this.state.sticks.right);
        break;
      case AXIS.L2:
        this.state.triggers.left = normalizeTrigger(value, 255, this.calibration.triggerDeadzone);
        this.emit('trigger:left', this.state.triggers.left);
        break;
      case AXIS.R2:
        this.state.triggers.right = normalizeTrigger(value, 255, this.calibration.triggerDeadzone);
        this.emit('trigger:right', this.state.triggers.right);
        break;
      case AXIS.DPAD_X:
        this.state.dpad.left = value < 0;
        this.state.dpad.right = value > 0;
        this.emit('dpad', this.state.dpad);
        break;
      case AXIS.DPAD_Y:
        this.state.dpad.up = value < 0;
        this.state.dpad.down = value > 0;
        this.emit('dpad', this.state.dpad);
        break;
      case AXIS.TRACKPAD_LEFT_X:
        this.state.trackpads.left.x = normalize(value, 0, 65535, 0);
        this.state.trackpads.left.touched = true;
        this.emit('trackpad:left', this.state.trackpads.left);
        break;
      case AXIS.TRACKPAD_LEFT_Y:
        this.state.trackpads.left.y = normalize(value, 0, 65535, 0);
        this.emit('trackpad:left', this.state.trackpads.left);
        break;
      case AXIS.TRACKPAD_RIGHT_X:
        this.state.trackpads.right.x = normalize(value, 0, 65535, 0);
        this.state.trackpads.right.touched = true;
        this.emit('trackpad:right', this.state.trackpads.right);
        break;
      case AXIS.TRACKPAD_RIGHT_Y:
        this.state.trackpads.right.y = normalize(value, 0, 65535, 0);
        this.emit('trackpad:right', this.state.trackpads.right);
        break;
      case AXIS.GYRO_X:
        this.state.gyro.x = value;
        this.emit('gyro', this.state.gyro);
        break;
      case AXIS.GYRO_Y:
        this.state.gyro.y = value;
        break;
      case AXIS.GYRO_Z:
        this.state.gyro.z = value;
        break;
      case AXIS.ACCEL_X:
        this.state.accel.x = value;
        this.emit('accel', this.state.accel);
        break;
      case AXIS.ACCEL_Y:
        this.state.accel.y = value;
        break;
      case AXIS.ACCEL_Z:
        this.state.accel.z = value;
        break;
    }
  }

  // Check bindings for triggered actions
  _checkBindings() {
    for (const [id, binding] of this.bindings) {
      if (!binding.enabled) continue;

      const triggered = this._checkBinding(binding);
      const wasTriggered = this._checkBindingPrev(binding);

      switch (binding.type) {
        case 'press':
          if (triggered && !wasTriggered) {
            this.emit('action', { action: binding.action, binding: binding.toJSON() });
          }
          break;
        case 'release':
          if (!triggered && wasTriggered) {
            this.emit('action', { action: binding.action, binding: binding.toJSON() });
          }
          break;
        case 'hold':
          if (triggered && !wasTriggered) {
            // Start hold timer
            this.holdTimers.set(id, setTimeout(() => {
              if (this._checkBinding(binding)) {
                this.emit('action', { action: binding.action, binding: binding.toJSON(), type: 'hold' });
              }
              this.holdTimers.delete(id);
            }, binding.holdTime));
          } else if (!triggered && this.holdTimers.has(id)) {
            clearTimeout(this.holdTimers.get(id));
            this.holdTimers.delete(id);
          }
          break;
        case 'repeat':
          if (triggered && !wasTriggered) {
            this.emit('action', { action: binding.action, binding: binding.toJSON() });
            // Start repeat
            this.repeatTimers.set(id, setInterval(() => {
              if (this._checkBinding(binding)) {
                this.emit('action', { action: binding.action, binding: binding.toJSON(), type: 'repeat' });
              } else {
                clearInterval(this.repeatTimers.get(id));
                this.repeatTimers.delete(id);
              }
            }, binding.repeatRate));
          } else if (!triggered && this.repeatTimers.has(id)) {
            clearInterval(this.repeatTimers.get(id));
            this.repeatTimers.delete(id);
          }
          break;
      }
    }
  }

  // Check if binding inputs are satisfied
  _checkBinding(binding) {
    for (const input of binding.inputs) {
      if (input.button) {
        const code = BUTTON[input.button];
        if (!this.state.buttons[code]) return false;
      }
      if (input.axis) {
        // Axis threshold check
        const code = AXIS[input.axis];
        const value = this.state.axes[code] || 0;
        if (input.threshold && Math.abs(value) < input.threshold) return false;
      }
    }
    return binding.inputs.length > 0;
  }

  _checkBindingPrev(binding) {
    for (const input of binding.inputs) {
      if (input.button) {
        const code = BUTTON[input.button];
        if (!this.prevState.buttons[code]) return false;
      }
    }
    return binding.inputs.length > 0;
  }

  // Start polling (alternative to async read)
  startPolling(intervalMs = 16) {
    if (this.polling) return { success: false, error: 'Already polling' };
    this.polling = true;
    this.emit('polling:start');
    return { success: true };
  }

  // Stop polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.polling = false;
    this.emit('polling:stop');
    return { success: true };
  }

  // Get current state
  getState() {
    return { success: true, state: this.state.toJSON() };
  }

  // Get specific input
  getButton(name) {
    const code = BUTTON[name];
    if (code === undefined) return { success: false, error: 'Unknown button' };
    return { success: true, button: name, pressed: this.state.buttons[code] || false };
  }

  getStick(name) {
    const stick = this.state.sticks[name];
    if (!stick) return { success: false, error: 'Unknown stick' };
    return { success: true, stick: name, ...stick };
  }

  getTrigger(name) {
    const value = this.state.triggers[name];
    if (value === undefined) return { success: false, error: 'Unknown trigger' };
    return { success: true, trigger: name, value };
  }

  getTrackpad(name) {
    const pad = this.state.trackpads[name];
    if (!pad) return { success: false, error: 'Unknown trackpad' };
    return { success: true, trackpad: name, ...pad };
  }

  getDpad() {
    return { success: true, dpad: this.state.dpad };
  }

  getGyro() {
    return { success: true, gyro: this.state.gyro };
  }

  getAccel() {
    return { success: true, accel: this.state.accel };
  }

  // Binding management
  addBinding(data) {
    const binding = new ActionBinding(data);
    this.bindings.set(binding.id, binding);
    return { success: true, binding: binding.toJSON() };
  }

  removeBinding(id) {
    if (!this.bindings.has(id)) return { success: false, error: 'Binding not found' };
    this.bindings.delete(id);
    return { success: true };
  }

  updateBinding(id, updates) {
    const binding = this.bindings.get(id);
    if (!binding) return { success: false, error: 'Binding not found' };
    Object.assign(binding, updates);
    return { success: true, binding: binding.toJSON() };
  }

  listBindings() {
    return {
      success: true,
      bindings: Array.from(this.bindings.values()).map(b => b.toJSON()),
    };
  }

  // Profile management
  createProfile(name, bindings = []) {
    this.profiles.set(name, { name, bindings });
    return { success: true, profile: name };
  }

  loadProfile(name) {
    if (!this.profiles.has(name)) return { success: false, error: 'Profile not found' };
    this._loadProfileBindings(name);
    return { success: true, profile: name };
  }

  saveProfile(name = null) {
    const profileName = name || this.activeProfile;
    this.profiles.set(profileName, {
      name: profileName,
      bindings: Array.from(this.bindings.values()).map(b => b.toJSON()),
    });
    return { success: true, profile: profileName };
  }

  listProfiles() {
    return {
      success: true,
      profiles: Array.from(this.profiles.keys()),
      active: this.activeProfile,
    };
  }

  deleteProfile(name) {
    if (name === 'default') return { success: false, error: 'Cannot delete default profile' };
    if (!this.profiles.has(name)) return { success: false, error: 'Profile not found' };
    this.profiles.delete(name);
    if (this.activeProfile === name) {
      this.loadProfile('default');
    }
    return { success: true };
  }

  // Calibration
  setDeadzone(type, value) {
    if (type === 'stick') this.calibration.stickDeadzone = value;
    else if (type === 'trigger') this.calibration.triggerDeadzone = value;
    else if (type === 'trackpad') this.calibration.trackpadDeadzone = value;
    else return { success: false, error: 'Unknown deadzone type' };
    return { success: true, calibration: this.calibration };
  }

  getCalibration() {
    return { success: true, calibration: this.calibration };
  }

  // Vibration/Haptics (requires write access)
  vibrate(intensity = 1.0, duration = 200) {
    // Would require write to force feedback device
    // Placeholder for now
    this.emit('vibrate', { intensity, duration });
    return { success: true, note: 'Haptics require additional setup' };
  }

  // Get button/axis constants
  getConstants() {
    return {
      success: true,
      BUTTON,
      AXIS,
      EV_TYPE,
    };
  }

  // Status
  getStatus() {
    return {
      success: true,
      connected: this.connected,
      polling: this.polling,
      devices: this.deviceFds.size,
      bindings: this.bindings.size,
      activeProfile: this.activeProfile,
    };
  }
}

module.exports = {
  ControllerClient,
  ControllerState,
  ActionBinding,
  BUTTON,
  AXIS,
  EV_TYPE,
};
