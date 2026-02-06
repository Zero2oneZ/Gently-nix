// GentlyOS Face Tracking Client - MediaPipe Face Mesh Integration
// Real-time face landmark detection for avatar control and motion capture

const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// Face landmark indices (MediaPipe 468 points)
const LANDMARK = {
  // Face oval
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],

  // Eyes
  LEFT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  RIGHT_EYE: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  LEFT_EYEBROW: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
  RIGHT_EYEBROW: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
  LEFT_IRIS: [474, 475, 476, 477],
  RIGHT_IRIS: [469, 470, 471, 472],

  // Nose
  NOSE_TIP: 4,
  NOSE_BRIDGE: [6, 197, 195, 5, 4],

  // Lips
  LIPS_OUTER: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
  LIPS_INNER: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191],

  // Key points for expressions
  LEFT_EYE_CENTER: 468,
  RIGHT_EYE_CENTER: 473,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
};

// Expression types
const EXPRESSION = {
  NEUTRAL: 'neutral',
  SMILE: 'smile',
  FROWN: 'frown',
  SURPRISE: 'surprise',
  ANGRY: 'angry',
  SAD: 'sad',
  WINK_LEFT: 'wink_left',
  WINK_RIGHT: 'wink_right',
  MOUTH_OPEN: 'mouth_open',
  EYEBROW_RAISE: 'eyebrow_raise',
};

// Tracking state
const TRACKING_STATE = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  TRACKING: 'tracking',
  LOST: 'lost',
  ERROR: 'error',
};

// Face data class
class FaceData {
  constructor(data = {}) {
    this.landmarks = data.landmarks || [];  // 468 points [x, y, z]
    this.boundingBox = data.boundingBox || null;
    this.rotation = data.rotation || { pitch: 0, yaw: 0, roll: 0 };
    this.expressions = data.expressions || {};
    this.blendShapes = data.blendShapes || {};
    this.timestamp = data.timestamp || Date.now();
    this.confidence = data.confidence || 0;
  }

  // Get specific landmark
  getLandmark(index) {
    return this.landmarks[index] || null;
  }

  // Get landmark group
  getLandmarkGroup(indices) {
    return indices.map(i => this.landmarks[i]).filter(Boolean);
  }

  // Calculate eye aspect ratio (for blink detection)
  getEyeAspectRatio(eye) {
    const indices = eye === 'left' ? LANDMARK.LEFT_EYE : LANDMARK.RIGHT_EYE;
    const points = this.getLandmarkGroup(indices);
    if (points.length < 6) return 0;

    // Vertical distances
    const v1 = this._distance(points[1], points[5]);
    const v2 = this._distance(points[2], points[4]);
    // Horizontal distance
    const h = this._distance(points[0], points[3]);

    return (v1 + v2) / (2 * h);
  }

  // Calculate mouth aspect ratio
  getMouthAspectRatio() {
    const outer = this.getLandmarkGroup(LANDMARK.LIPS_OUTER);
    if (outer.length < 8) return 0;

    const v = this._distance(outer[3], outer[9]);
    const h = this._distance(outer[0], outer[6]);

    return v / h;
  }

  _distance(p1, p2) {
    if (!p1 || !p2) return 0;
    return Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2) +
      Math.pow((p2[2] || 0) - (p1[2] || 0), 2)
    );
  }

  toJSON() {
    return {
      landmarks: this.landmarks,
      boundingBox: this.boundingBox,
      rotation: this.rotation,
      expressions: this.expressions,
      blendShapes: this.blendShapes,
      timestamp: this.timestamp,
      confidence: this.confidence,
    };
  }
}

// Calibration data
class CalibrationData {
  constructor() {
    this.neutralFace = null;
    this.eyeOpenThreshold = 0.25;
    this.mouthOpenThreshold = 0.5;
    this.smileThreshold = 0.3;
    this.calibrated = false;
  }

  calibrate(faceData) {
    this.neutralFace = faceData;
    this.calibrated = true;
    return this;
  }

  toJSON() {
    return {
      eyeOpenThreshold: this.eyeOpenThreshold,
      mouthOpenThreshold: this.mouthOpenThreshold,
      smileThreshold: this.smileThreshold,
      calibrated: this.calibrated,
    };
  }
}

class FaceTrackingClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.state = TRACKING_STATE.IDLE;
    this.currentFace = null;
    this.calibration = new CalibrationData();
    this.trackingProcess = null;
    this.frameRate = config.frameRate || 30;
    this.smoothing = config.smoothing || 0.5;
    this.history = [];
    this.historySize = config.historySize || 5;
    this.initialized = false;

    // Camera config
    this.cameraId = config.cameraId || 0;
    this.resolution = config.resolution || { width: 640, height: 480 };

    // Python script path for MediaPipe
    this.scriptPath = path.join(__dirname, '..', 'scripts', 'face_tracking.py');
  }

  // Initialize tracking
  async initialize() {
    if (this.initialized) return { success: true };

    this.state = TRACKING_STATE.INITIALIZING;
    this.emit('state', this.state);

    // Check for Python and MediaPipe
    try {
      const { execSync } = require('child_process');
      execSync('python3 -c "import mediapipe"', { encoding: 'utf-8' });
    } catch {
      // MediaPipe not installed - provide fallback or instructions
      this.emit('warning', { message: 'MediaPipe not installed. Run: pip install mediapipe' });
    }

    this.initialized = true;
    this.state = TRACKING_STATE.IDLE;
    this.emit('initialized');
    return { success: true };
  }

  // Start tracking
  async startTracking() {
    if (this.state === TRACKING_STATE.TRACKING) {
      return { success: true, message: 'Already tracking' };
    }

    this.state = TRACKING_STATE.TRACKING;
    this.emit('state', this.state);

    // Start Python MediaPipe process
    this._startMediaPipeProcess();

    return { success: true };
  }

  // Start MediaPipe Python process
  _startMediaPipeProcess() {
    const pythonScript = `
import cv2
import mediapipe as mp
import json
import sys

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

cap = cv2.VideoCapture(${this.cameraId})
cap.set(cv2.CAP_PROP_FRAME_WIDTH, ${this.resolution.width})
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ${this.resolution.height})

while cap.isOpened():
    success, image = cap.read()
    if not success:
        continue

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image)

    if results.multi_face_landmarks:
        face = results.multi_face_landmarks[0]
        landmarks = [[lm.x, lm.y, lm.z] for lm in face.landmark]

        # Calculate bounding box
        xs = [lm.x for lm in face.landmark]
        ys = [lm.y for lm in face.landmark]
        bbox = {
            'x': min(xs), 'y': min(ys),
            'width': max(xs) - min(xs),
            'height': max(ys) - min(ys)
        }

        # Estimate head rotation from key points
        nose = face.landmark[4]
        left_eye = face.landmark[468]
        right_eye = face.landmark[473]

        # Simple rotation estimation
        yaw = (left_eye.x - right_eye.x) * 90
        pitch = (nose.y - 0.5) * 60
        roll = 0  # Would need more calculation

        output = {
            'landmarks': landmarks,
            'boundingBox': bbox,
            'rotation': {'pitch': pitch, 'yaw': yaw, 'roll': roll},
            'confidence': 0.9
        }
        print(json.dumps(output), flush=True)
    else:
        print(json.dumps({'lost': True}), flush=True)

cap.release()
`;

    this.trackingProcess = spawn('python3', ['-c', pythonScript]);

    this.trackingProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.lost) {
            this.state = TRACKING_STATE.LOST;
            this.emit('lost');
          } else {
            this._processFaceData(parsed);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    this.trackingProcess.stderr.on('data', (data) => {
      this.emit('error', { message: data.toString() });
    });

    this.trackingProcess.on('close', (code) => {
      this.state = TRACKING_STATE.IDLE;
      this.emit('stopped', { code });
    });
  }

  // Process incoming face data
  _processFaceData(data) {
    const faceData = new FaceData(data);

    // Apply smoothing
    if (this.currentFace && this.smoothing > 0) {
      faceData.landmarks = this._smoothLandmarks(
        this.currentFace.landmarks,
        faceData.landmarks
      );
    }

    // Calculate expressions
    faceData.expressions = this._calculateExpressions(faceData);
    faceData.blendShapes = this._calculateBlendShapes(faceData);

    // Update history
    this.history.push(faceData);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    this.currentFace = faceData;
    this.state = TRACKING_STATE.TRACKING;
    this.emit('face', faceData.toJSON());
  }

  // Smooth landmarks between frames
  _smoothLandmarks(prev, curr) {
    if (!prev || !curr) return curr;
    const alpha = 1 - this.smoothing;
    return curr.map((point, i) => {
      if (!prev[i]) return point;
      return [
        prev[i][0] * this.smoothing + point[0] * alpha,
        prev[i][1] * this.smoothing + point[1] * alpha,
        (prev[i][2] || 0) * this.smoothing + (point[2] || 0) * alpha,
      ];
    });
  }

  // Calculate expressions from landmarks
  _calculateExpressions(faceData) {
    const expressions = {};

    const leftEAR = faceData.getEyeAspectRatio('left');
    const rightEAR = faceData.getEyeAspectRatio('right');
    const mar = faceData.getMouthAspectRatio();

    // Blink detection
    expressions.leftEyeOpen = leftEAR > this.calibration.eyeOpenThreshold ? 1 : 0;
    expressions.rightEyeOpen = rightEAR > this.calibration.eyeOpenThreshold ? 1 : 0;
    expressions.blink = (leftEAR + rightEAR) / 2 < this.calibration.eyeOpenThreshold;

    // Mouth
    expressions.mouthOpen = mar > this.calibration.mouthOpenThreshold ?
      Math.min((mar - this.calibration.mouthOpenThreshold) * 2, 1) : 0;

    // Smile detection (lip corner distance)
    const lips = faceData.getLandmarkGroup(LANDMARK.LIPS_OUTER);
    if (lips.length >= 12) {
      const mouthWidth = faceData._distance(lips[0], lips[6]);
      const neutralWidth = 0.15;  // Approximate neutral mouth width
      expressions.smile = Math.max(0, (mouthWidth - neutralWidth) / 0.05);
    }

    return expressions;
  }

  // Calculate blend shapes for avatar control
  _calculateBlendShapes(faceData) {
    const blendShapes = {};
    const expr = faceData.expressions;

    // Eye blend shapes
    blendShapes.eyeBlinkLeft = 1 - (expr.leftEyeOpen || 1);
    blendShapes.eyeBlinkRight = 1 - (expr.rightEyeOpen || 1);

    // Mouth blend shapes
    blendShapes.jawOpen = expr.mouthOpen || 0;
    blendShapes.mouthSmileLeft = (expr.smile || 0) * 0.5;
    blendShapes.mouthSmileRight = (expr.smile || 0) * 0.5;

    // Head rotation
    const rot = faceData.rotation;
    blendShapes.headYaw = rot.yaw / 45;  // Normalize to -1 to 1
    blendShapes.headPitch = rot.pitch / 30;
    blendShapes.headRoll = rot.roll / 30;

    return blendShapes;
  }

  // Stop tracking
  async stopTracking() {
    if (this.trackingProcess) {
      this.trackingProcess.kill('SIGTERM');
      this.trackingProcess = null;
    }
    this.state = TRACKING_STATE.IDLE;
    this.emit('state', this.state);
    return { success: true };
  }

  // Calibrate with current face as neutral
  calibrate() {
    if (!this.currentFace) {
      throw new Error('No face detected for calibration');
    }
    this.calibration.calibrate(this.currentFace);
    this.emit('calibrated', this.calibration.toJSON());
    return this.calibration.toJSON();
  }

  // Get current face data
  getCurrentFace() {
    return this.currentFace ? this.currentFace.toJSON() : null;
  }

  // Get tracking history
  getHistory() {
    return this.history.map(f => f.toJSON());
  }

  // Set smoothing factor
  setSmoothing(value) {
    this.smoothing = Math.max(0, Math.min(1, value));
  }

  // Get available cameras
  async getCameras() {
    // This would need native module or system call
    return [
      { id: 0, name: 'Default Camera' },
      { id: 1, name: 'Camera 1' },
    ];
  }

  // Set camera
  setCamera(cameraId) {
    this.cameraId = cameraId;
    if (this.state === TRACKING_STATE.TRACKING) {
      this.stopTracking();
      this.startTracking();
    }
  }

  // Get status
  getStatus() {
    return {
      initialized: this.initialized,
      state: this.state,
      hasFace: !!this.currentFace,
      calibrated: this.calibration.calibrated,
      cameraId: this.cameraId,
      frameRate: this.frameRate,
      smoothing: this.smoothing,
    };
  }

  // Get constants
  getConstants() {
    return {
      LANDMARK,
      EXPRESSION,
      TRACKING_STATE,
    };
  }

  // Cleanup
  async cleanup() {
    await this.stopTracking();
    this.history = [];
    this.currentFace = null;
  }
}

module.exports = {
  FaceTrackingClient,
  FaceData,
  CalibrationData,
  LANDMARK,
  EXPRESSION,
  TRACKING_STATE,
};
