// GentlyOS GOO Client
// Unified Distance Field Engine - smooth_min IS softmax IS attention

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Region shapes
const RegionShape = {
  CIRCLE: 'Circle',
  RECTANGLE: 'Rectangle',
  ROUNDED_RECT: 'RoundedRect',
};

// Render modes
const RenderMode = {
  DISTANCE: 'distance',       // Grayscale distance field
  BLENDED: 'blended',         // Color-blended regions
  HARD_EDGE: 'hard_edge',     // Binary inside/outside
  CONTOURS: 'contours',       // Contour lines
};

// Claude emotional states
const EmotionalState = {
  CURIOUS: 'curious',
  FOCUSED: 'focused',
  THINKING: 'thinking',
  UNCERTAIN: 'uncertain',
  ENGAGED: 'engaged',
  WARM: 'warm',
};

class GooClient {
  constructor() {
    this.field = null;
    this.useBridge = false;
    this.defaultBlend = 0.3;
  }

  // Create a new GOO field
  createField(k = 0.3) {
    this.field = {
      k,
      regions: [],
      bounds: { min: [0, 0], max: [1, 1] },
    };
    return this.field;
  }

  // Add a region to the field
  addRegion(region) {
    if (!this.field) this.createField();
    const id = this.field.regions.length;
    this.field.regions.push({
      id,
      center: region.center || [0.5, 0.5],
      shape: region.shape || { type: RegionShape.CIRCLE, radius: 0.1 },
      properties: {
        attention_weight: region.attentionWeight || 1.0,
        learning_rate: region.learningRate || 0.01,
        visual_color: region.color || [0.3, 0.7, 1.0, 0.8],
        audio_frequency: region.frequency || 440,
        label: region.label || null,
        metadata: region.metadata || {},
      },
      enabled: true,
    });
    return id;
  }

  // Sample the field at a point
  async sample(x, y) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('goo.sample', { x, y, field: this.field });
        return { success: true, ...result.result };
      } else {
        const result = await invokeGently('goo', ['sample', x.toString(), y.toString()]);
        return { success: true, distance: parseFloat(result) };
      }
    } catch (err) {
      // Calculate locally using smooth_min
      return { success: true, distance: this.sampleLocal(x, y), local: true };
    }
  }

  // Local sampling (fallback)
  sampleLocal(x, y) {
    if (!this.field || this.field.regions.length === 0) return 1.0;

    let minDist = Infinity;
    for (const region of this.field.regions) {
      if (!region.enabled) continue;
      const dist = this.sdfRegion([x, y], region);
      minDist = this.smoothMin(minDist, dist, this.field.k);
    }
    return minDist;
  }

  // SDF for a region
  sdfRegion(point, region) {
    const [px, py] = point;
    const [cx, cy] = region.center;
    const dx = px - cx;
    const dy = py - cy;

    if (region.shape.type === RegionShape.CIRCLE) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist - (region.shape.radius || 0.1);
    } else if (region.shape.type === RegionShape.RECTANGLE) {
      const [hx, hy] = region.shape.half_size || [0.1, 0.1];
      const qx = Math.abs(dx) - hx;
      const qy = Math.abs(dy) - hy;
      const outside = Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2);
      const inside = Math.min(Math.max(qx, qy), 0);
      return outside + inside;
    }
    return 1.0;
  }

  // The fundamental equation: smooth_min IS softmax IS attention
  smoothMin(a, b, k) {
    if (k <= 0) return Math.min(a, b);
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  // Get attention weights at a point
  async attend(x, y) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('goo.attend', { x, y, field: this.field });
        return { success: true, attention: result.result };
      }
    } catch (err) {
      // Calculate locally
    }

    // Local attention calculation
    const distances = [];
    for (const region of this.field.regions) {
      if (!region.enabled) continue;
      const dist = this.sdfRegion([x, y], region);
      distances.push({ id: region.id, distance: dist });
    }

    // Convert distances to attention weights (softmax)
    const temperature = 1.0 / this.field.k;
    const weights = this.distancesToAttention(distances.map(d => d.distance), temperature);

    return {
      success: true,
      attention: {
        weights: distances.map((d, i) => ({ regionId: d.id, weight: weights[i] })),
        queryPoint: [x, y],
      },
      local: true,
    };
  }

  // Convert distances to attention (softmax)
  distancesToAttention(distances, temperature = 3.0) {
    // Negate distances (closer = higher attention)
    const negDists = distances.map(d => -d * temperature);
    const maxNeg = Math.max(...negDists);
    const exps = negDists.map(d => Math.exp(d - maxNeg));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  // Get blended color at a point
  async colorAt(x, y) {
    const attention = await this.attend(x, y);
    if (!attention.success) return [0, 0, 0, 1];

    // Blend colors by attention weight
    let r = 0, g = 0, b = 0, a = 0;
    for (const { regionId, weight } of attention.attention.weights) {
      const region = this.field.regions.find(r => r.id === regionId);
      if (region) {
        const [cr, cg, cb, ca] = region.properties.visual_color;
        r += cr * weight;
        g += cg * weight;
        b += cb * weight;
        a += ca * weight;
      }
    }
    return [r, g, b, a];
  }

  // Generate demo field via CLI
  async generateDemo(regions = 5, blend = 0.3) {
    try {
      const result = await invokeGently('goo', [
        'demo',
        '--regions', regions.toString(),
        '--blend', blend.toString(),
      ]);
      return { success: true, svg: result };
    } catch (err) {
      // Generate mock SVG locally
      return { success: true, svg: this.generateMockSvg(regions, blend), mock: true };
    }
  }

  // Generate SVG rendering of current field
  async renderToSvg(width = 400, height = 400) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('goo.render_svg', {
          field: this.field,
          width,
          height,
        });
        return { success: true, svg: result.result };
      }
    } catch (err) {
      // Fall through to local render
    }

    // Local SVG generation
    return { success: true, svg: this.renderSvgLocal(width, height), local: true };
  }

  // Local SVG rendering
  renderSvgLocal(width, height) {
    const regions = this.field?.regions || [];
    const k = this.field?.k || 0.3;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="goo-blur">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${k * 20}"/>
    </filter>
    <radialGradient id="goo-glow">
      <stop offset="0%" stop-color="#4af" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#4af" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#0a0a0a"/>
  <g filter="url(#goo-blur)">`;

    for (const region of regions) {
      if (!region.enabled) continue;
      const [cx, cy] = region.center;
      const px = cx * width;
      const py = cy * height;
      const [r, g, b, a] = region.properties.visual_color;
      const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;

      if (region.shape.type === RegionShape.CIRCLE) {
        const radius = (region.shape.radius || 0.1) * Math.min(width, height);
        svg += `
    <circle cx="${px}" cy="${py}" r="${radius}" fill="${color}" stroke="#4af" stroke-width="2"/>`;
      } else if (region.shape.type === RegionShape.RECTANGLE) {
        const [hx, hy] = region.shape.half_size || [0.1, 0.1];
        const w = hx * 2 * width;
        const h = hy * 2 * height;
        svg += `
    <rect x="${px - w / 2}" y="${py - h / 2}" width="${w}" height="${h}" fill="${color}" stroke="#4af" stroke-width="2"/>`;
      }
    }

    svg += `
  </g>
</svg>`;

    return svg;
  }

  // Generate mock SVG
  generateMockSvg(regions, blend) {
    this.createField(blend);

    // Add random regions
    for (let i = 0; i < regions; i++) {
      this.addRegion({
        center: [0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6],
        shape: { type: RegionShape.CIRCLE, radius: 0.05 + Math.random() * 0.1 },
        color: [
          0.2 + Math.random() * 0.8,
          0.2 + Math.random() * 0.8,
          0.8 + Math.random() * 0.2,
          0.6 + Math.random() * 0.4,
        ],
        label: `Region ${i + 1}`,
      });
    }

    return this.renderSvgLocal(400, 400).svg || this.renderSvgLocal(400, 400);
  }

  // Create Claude embodiment
  async createClaudeEmbodiment(emotion = EmotionalState.CURIOUS) {
    try {
      const result = await invokeGently('goo', ['claude', '--emotion', emotion]);
      return { success: true, svg: result };
    } catch (err) {
      // Generate locally
      return { success: true, svg: this.generateClaudeSvgLocal(emotion), mock: true };
    }
  }

  // Local Claude SVG
  generateClaudeSvgLocal(emotion) {
    const emotionColors = {
      curious: [0.4, 0.8, 1.0, 0.9],
      focused: [0.2, 0.6, 1.0, 0.95],
      thinking: [0.6, 0.4, 1.0, 0.8],
      uncertain: [0.8, 0.6, 0.4, 0.7],
      engaged: [0.4, 1.0, 0.8, 0.9],
      warm: [1.0, 0.6, 0.4, 0.85],
    };

    const color = emotionColors[emotion] || emotionColors.curious;
    const [r, g, b, a] = color;

    return `<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="claude-glow">
      <stop offset="0%" stop-color="rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})"/>
      <stop offset="100%" stop-color="rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0)"/>
    </radialGradient>
    <filter id="claude-blur">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>
  <rect width="200" height="200" fill="#0a0a0a"/>
  <circle cx="100" cy="100" r="60" fill="url(#claude-glow)" filter="url(#claude-blur)"/>
  <circle cx="100" cy="100" r="40" fill="rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0.6)" stroke="#4af" stroke-width="2">
    <animate attributeName="r" values="38;42;38" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="100" y="180" text-anchor="middle" fill="#4af" font-family="monospace" font-size="10">${emotion}</text>
</svg>`;
  }

  // Get field statistics
  getStats() {
    if (!this.field) return null;
    return {
      regionCount: this.field.regions.length,
      enabledCount: this.field.regions.filter(r => r.enabled).length,
      blendFactor: this.field.k,
      bounds: this.field.bounds,
    };
  }

  // Serialize field to JSON
  toJSON() {
    return JSON.stringify(this.field, null, 2);
  }

  // Load field from JSON
  fromJSON(json) {
    try {
      this.field = typeof json === 'string' ? JSON.parse(json) : json;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = {
  GooClient,
  RegionShape,
  RenderMode,
  EmotionalState,
};
