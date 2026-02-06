// GentlyOS SVG Visual Client
// Pattern generation and SVG manipulation

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Shape types
const Shape = {
  CIRCLE: 'Circle',
  HEXAGON: 'Hexagon',
  TRIANGLE: 'Triangle',
  SQUARE: 'Square',
  DIAMOND: 'Diamond',
  STAR: 'Star',
  WAVE: 'Wave',
  SPIRAL: 'Spiral',
};

// Motion types
const Motion = {
  STATIC: 'Static',
  PULSE: 'Pulse',
  ROTATE: 'Rotate',
  MORPH: 'Morph',
  ORBIT: 'Orbit',
  BREATHE: 'Breathe',
  GLITCH: 'Glitch',
  FLOW: 'Flow',
};

// Predefined color palettes
const Palettes = {
  FOCUS: ['#00e5a0', '#00c896', '#00aa82'],
  PROCESS: ['#4d9fff', '#3d8fef', '#2d7fdf'],
  BUILD: ['#ff6b9d', '#ff5b8d', '#ff4b7d'],
  DOC: ['#4ecdc4', '#3ebdb4', '#2eada4'],
  WARN: ['#ffd93d', '#efc92d', '#dfb91d'],
  DEAD: ['#ff4444', '#ef3434', '#df2424'],
};

class SvgClient {
  constructor() {
    this.width = 400;
    this.height = 400;
    this.background = '#0a0a0a';
    this.useBridge = false;
  }

  // Set canvas dimensions
  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  // Generate a visual pattern
  async generatePattern(config) {
    const {
      shape = Shape.CIRCLE,
      motion = Motion.PULSE,
      color = '#4d9fff',
      size = 100,
      centerX = this.width / 2,
      centerY = this.height / 2,
    } = config;

    try {
      if (this.useBridge) {
        const result = await bridgeRPC('visual.render', {
          pattern: { visual: { color, shape, motion } },
          width: this.width,
          height: this.height,
        });
        return { success: true, svg: result.result };
      }
    } catch (err) {
      // Fall through to local generation
    }

    // Generate locally
    return {
      success: true,
      svg: this.renderPatternLocal({ shape, motion, color, size, centerX, centerY }),
      local: true,
    };
  }

  // Render pattern locally
  renderPatternLocal({ shape, motion, color, size, centerX, centerY }) {
    const animations = this.getAnimationAttrs(motion);
    const shapeElement = this.getShapeElement(shape, centerX, centerY, size, color, animations);

    return `<svg viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pattern-glow">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="${color}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <filter id="pattern-blur">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>
  <rect width="${this.width}" height="${this.height}" fill="${this.background}"/>
  <g filter="url(#pattern-blur)" opacity="0.5">
    ${shapeElement}
  </g>
  ${shapeElement}
</svg>`;
  }

  // Get shape SVG element
  getShapeElement(shape, cx, cy, size, color, animations) {
    const halfSize = size / 2;

    switch (shape) {
      case Shape.CIRCLE:
        return `<circle cx="${cx}" cy="${cy}" r="${halfSize}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </circle>`;

      case Shape.HEXAGON:
        const hexPoints = this.regularPolygonPoints(cx, cy, halfSize, 6);
        return `<polygon points="${hexPoints}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </polygon>`;

      case Shape.TRIANGLE:
        const triPoints = this.regularPolygonPoints(cx, cy, halfSize, 3);
        return `<polygon points="${triPoints}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </polygon>`;

      case Shape.SQUARE:
        return `<rect x="${cx - halfSize}" y="${cy - halfSize}" width="${size}" height="${size}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </rect>`;

      case Shape.DIAMOND:
        const diamondPoints = `${cx},${cy - halfSize} ${cx + halfSize},${cy} ${cx},${cy + halfSize} ${cx - halfSize},${cy}`;
        return `<polygon points="${diamondPoints}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </polygon>`;

      case Shape.STAR:
        const starPoints = this.starPoints(cx, cy, halfSize, halfSize * 0.5, 5);
        return `<polygon points="${starPoints}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </polygon>`;

      case Shape.WAVE:
        const wavePath = this.wavePath(cx, cy, size, size / 4);
        return `<path d="${wavePath}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round">
    ${animations}
  </path>`;

      case Shape.SPIRAL:
        const spiralPath = this.spiralPath(cx, cy, halfSize, 3);
        return `<path d="${spiralPath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
    ${animations}
  </path>`;

      default:
        return `<circle cx="${cx}" cy="${cy}" r="${halfSize}" fill="url(#pattern-glow)" stroke="${color}" stroke-width="2">
    ${animations}
  </circle>`;
    }
  }

  // Get animation attributes
  getAnimationAttrs(motion) {
    switch (motion) {
      case Motion.PULSE:
        return `<animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>`;

      case Motion.ROTATE:
        return `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite"/>`;

      case Motion.BREATHE:
        return `<animate attributeName="r" values="90%;100%;90%" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>`;

      case Motion.ORBIT:
        return `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3s" repeatCount="indefinite"/>`;

      case Motion.GLITCH:
        return `<animate attributeName="opacity" values="1;0.3;1;0.7;1" dur="0.5s" repeatCount="indefinite" calcMode="discrete"/>`;

      case Motion.FLOW:
        return `<animate attributeName="stroke-dashoffset" values="0;100" dur="2s" repeatCount="indefinite"/>`;

      case Motion.MORPH:
        return `<animate attributeName="d" dur="3s" repeatCount="indefinite"/>`;

      case Motion.STATIC:
      default:
        return '';
    }
  }

  // Generate regular polygon points
  regularPolygonPoints(cx, cy, radius, sides) {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return points.join(' ');
  }

  // Generate star points
  starPoints(cx, cy, outerRadius, innerRadius, points) {
    const coords = [];
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      coords.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return coords.join(' ');
  }

  // Generate wave path
  wavePath(cx, cy, width, amplitude) {
    const startX = cx - width / 2;
    const endX = cx + width / 2;
    let path = `M ${startX} ${cy}`;

    const segments = 4;
    const segmentWidth = width / segments;

    for (let i = 0; i < segments; i++) {
      const x1 = startX + i * segmentWidth + segmentWidth / 2;
      const y1 = cy + (i % 2 === 0 ? -amplitude : amplitude);
      const x2 = startX + (i + 1) * segmentWidth;
      const y2 = cy;
      path += ` Q ${x1} ${y1}, ${x2} ${y2}`;
    }

    return path;
  }

  // Generate spiral path
  spiralPath(cx, cy, maxRadius, turns) {
    let path = `M ${cx} ${cy}`;
    const points = turns * 36;

    for (let i = 1; i <= points; i++) {
      const angle = (i * 10 * Math.PI) / 180;
      const radius = (i / points) * maxRadius;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      path += ` L ${x} ${y}`;
    }

    return path;
  }

  // Create a component (for Gooey app builder)
  createComponent(type, props = {}) {
    const { x = 0, y = 0, width = 100, height = 40, label = '', color = '#4af' } = props;

    switch (type) {
      case 'button':
        return `<g transform="translate(${x},${y})">
  <rect width="${width}" height="${height}" rx="4" fill="#1a1a2e" stroke="${color}" stroke-width="1"/>
  <text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="${color}" font-family="monospace" font-size="10">${label}</text>
</g>`;

      case 'label':
        return `<text x="${x}" y="${y}" fill="${color}" font-family="monospace" font-size="10">${label}</text>`;

      case 'input':
        return `<g transform="translate(${x},${y})">
  <rect width="${width}" height="${height}" rx="2" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  <text x="8" y="${height / 2 + 4}" fill="#666" font-family="monospace" font-size="9">${label || 'Enter text...'}</text>
</g>`;

      case 'panel':
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#12121c" stroke="#1a1a2e" stroke-width="1"/>`;

      case 'divider':
        return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="#1a1a2e" stroke-width="1"/>`;

      default:
        return '';
    }
  }

  // Compose multiple elements into an SVG
  compose(elements, config = {}) {
    const { width = this.width, height = this.height, background = this.background } = config;

    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${elements.join('\n  ')}
</svg>`;
  }

  // Generate decoys for Dance protocol
  async generateDecoys(realPattern, count = 3) {
    const decoys = [];

    for (let i = 0; i < count; i++) {
      const randomShape = Object.values(Shape)[Math.floor(Math.random() * Object.values(Shape).length)];
      const randomMotion = Object.values(Motion)[Math.floor(Math.random() * Object.values(Motion).length)];
      const randomColor = Object.values(Palettes)[Math.floor(Math.random() * Object.values(Palettes).length)][0];

      const result = await this.generatePattern({
        shape: randomShape,
        motion: randomMotion,
        color: randomColor,
      });

      decoys.push(result.svg);
    }

    return { success: true, decoys };
  }

  // Parse SVG string to extract viewBox and elements
  parseSvg(svgString) {
    const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1].split(' ').map(Number) : [0, 0, this.width, this.height];

    return {
      viewBox,
      width: viewBox[2],
      height: viewBox[3],
      raw: svgString,
    };
  }

  // Optimize SVG (basic minification)
  optimizeSvg(svgString) {
    return svgString
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+\/>/g, '/>')
      .trim();
  }
}

module.exports = {
  SvgClient,
  Shape,
  Motion,
  Palettes,
};
