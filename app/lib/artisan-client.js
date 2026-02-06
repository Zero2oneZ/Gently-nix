// GentlyOS Artisan Client - Toroidal Knowledge Storage System
// Torus, Foam, BARF (Bark And Retrieve Foam) implementation
// Foundation for all knowledge storage in GentlyOS

const crypto = require('crypto');

// Winding levels (refinement stages)
const WINDING_LEVELS = {
  RAW_IDEA: 1,
  STRUCTURED: 2,
  REFINED: 3,
  TESTED: 4,
  DOCUMENTED: 5,
  PRODUCTION: 6,
};

// Convert tokens to minor radius (r = tokens / 2pi)
function tokensToRadius(tokens) {
  return tokens / (2 * Math.PI);
}

// Convert radius back to tokens
function radiusToTokens(radius) {
  return radius * 2 * Math.PI;
}

// Generate blake3-style hash (using sha256 as fallback)
function computeHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 64);
}

// Torus coordinate (angular position on surface)
class TorusCoordinate {
  constructor(theta = 0, phi = 0) {
    // theta: major angle (0 to 2pi)
    // phi: minor angle (0 to 2pi)
    this.theta = this.normalizeAngle(theta);
    this.phi = this.normalizeAngle(phi);
  }

  normalizeAngle(angle) {
    const twoPi = 2 * Math.PI;
    return ((angle % twoPi) + twoPi) % twoPi;
  }

  toJSON() {
    return { theta: this.theta, phi: this.phi };
  }

  static fromJSON(json) {
    return new TorusCoordinate(json.theta, json.phi);
  }

  static default() {
    return new TorusCoordinate(0, 0);
  }
}

// Point on torus surface
class TorusPoint {
  constructor(majorAngle, minorAngle, contentHash = null) {
    this.coord = new TorusCoordinate(majorAngle, minorAngle);
    this.contentHash = contentHash || computeHash(Date.now().toString());
  }

  distanceTo(other) {
    // Angular distance on torus surface
    const dTheta = Math.abs(this.coord.theta - other.coord.theta);
    const dPhi = Math.abs(this.coord.phi - other.coord.phi);
    // Wrap-around distance
    const thetaDist = Math.min(dTheta, 2 * Math.PI - dTheta);
    const phiDist = Math.min(dPhi, 2 * Math.PI - dPhi);
    return Math.sqrt(thetaDist * thetaDist + phiDist * phiDist);
  }

  toJSON() {
    return {
      coord: this.coord.toJSON(),
      contentHash: this.contentHash,
    };
  }

  static fromJSON(json) {
    const point = new TorusPoint(json.coord.theta, json.coord.phi, json.contentHash);
    return point;
  }
}

// Knowledge Torus - topological surface for storing knowledge
class Torus {
  constructor(label, majorRadius = 1.0, tokensSpent = 0) {
    this.label = label;
    this.majorRadius = majorRadius;
    this.minorRadius = tokensToRadius(tokensSpent);
    this.tokensSpent = tokensSpent;
    this.winding = WINDING_LEVELS.RAW_IDEA;
    this.bs = 1.0; // Bullshit score (1.0 = unvalidated, 0.0 = fully validated)
    this.parent = null;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
    this.points = []; // TorusPoint[]
    this.metadata = {};

    // Compute ID from content
    this.id = this.computeId();
  }

  computeId() {
    const data = {
      label: this.label,
      majorRadius: this.majorRadius,
      createdAt: this.createdAt,
    };
    return computeHash(data);
  }

  // Add tokens (increases minor radius)
  addTokens(tokens) {
    this.tokensSpent += tokens;
    this.minorRadius = tokensToRadius(this.tokensSpent);
    this.modifiedAt = Date.now();
    return this;
  }

  // Refine (increase winding level)
  refine() {
    if (this.winding < WINDING_LEVELS.PRODUCTION) {
      this.winding += 1;
      this.modifiedAt = Date.now();
    }
    return this;
  }

  // Validate (update BS score)
  validate(score) {
    this.bs = Math.max(0, Math.min(1, score));
    this.modifiedAt = Date.now();
    return this;
  }

  // Add a point to the torus
  addPoint(majorAngle, minorAngle, contentHash = null) {
    const point = new TorusPoint(majorAngle, minorAngle, contentHash);
    this.points.push(point);
    this.modifiedAt = Date.now();
    return point;
  }

  // Get winding level name
  getWindingName() {
    const names = ['', 'RawIdea', 'Structured', 'Refined', 'Tested', 'Documented', 'Production'];
    return names[this.winding] || 'Unknown';
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      majorRadius: this.majorRadius,
      minorRadius: this.minorRadius,
      tokensSpent: this.tokensSpent,
      winding: this.winding,
      windingName: this.getWindingName(),
      bs: this.bs,
      parent: this.parent,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      points: this.points.map(p => p.toJSON()),
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const torus = new Torus(json.label, json.majorRadius, json.tokensSpent);
    torus.id = json.id;
    torus.winding = json.winding;
    torus.bs = json.bs;
    torus.parent = json.parent;
    torus.createdAt = json.createdAt;
    torus.modifiedAt = json.modifiedAt;
    torus.points = (json.points || []).map(p => TorusPoint.fromJSON(p));
    torus.metadata = json.metadata || {};
    return torus;
  }
}

// Connection between two tori
class TorusBlend {
  constructor(torusA, torusB, pointA = null, pointB = null, strength = 0.5) {
    this.id = computeHash({ a: torusA, b: torusB, t: Date.now() });
    this.torusA = torusA; // torus ID
    this.torusB = torusB; // torus ID
    this.pointA = pointA || TorusCoordinate.default();
    this.pointB = pointB || TorusCoordinate.default();
    this.strength = Math.max(0, Math.min(1, strength));
    this.createdAt = Date.now();
    this.lastUsed = Date.now();
  }

  // Check if blend connects a specific torus
  connects(torusId) {
    return this.torusA === torusId || this.torusB === torusId;
  }

  // Get the other torus in the blend
  other(torusId) {
    if (this.torusA === torusId) return this.torusB;
    if (this.torusB === torusId) return this.torusA;
    return null;
  }

  // Decay strength over time
  decay(factor = 0.95) {
    this.strength *= factor;
    this.strength = Math.max(0, Math.min(1, this.strength));
    return this;
  }

  // Boost strength (usage reinforcement)
  boost(amount = 0.1) {
    this.strength += amount * (1.0 - this.strength);
    this.strength = Math.max(0, Math.min(1, this.strength));
    this.lastUsed = Date.now();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      torusA: this.torusA,
      torusB: this.torusB,
      pointA: this.pointA instanceof TorusCoordinate ? this.pointA.toJSON() : this.pointA,
      pointB: this.pointB instanceof TorusCoordinate ? this.pointB.toJSON() : this.pointB,
      strength: this.strength,
      createdAt: this.createdAt,
      lastUsed: this.lastUsed,
    };
  }

  static fromJSON(json) {
    const blend = new TorusBlend(json.torusA, json.torusB, null, null, json.strength);
    blend.id = json.id;
    blend.pointA = json.pointA;
    blend.pointB = json.pointB;
    blend.createdAt = json.createdAt;
    blend.lastUsed = json.lastUsed;
    return blend;
  }

  // Create simple blend (default coordinates)
  static simple(torusA, torusB, strength = 0.5) {
    return new TorusBlend(torusA, torusB, null, null, strength);
  }
}

// Foam - Multi-torus interconnected memory
class Foam {
  constructor(name = 'default') {
    this.name = name;
    this.tori = new Map(); // id -> Torus
    this.blends = []; // TorusBlend[]
    this.metadata = {
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  // Add a torus to the foam
  addTorus(torus) {
    this.tori.set(torus.id, torus);
    this.metadata.modifiedAt = Date.now();
    return torus;
  }

  // Get a torus by ID
  getTorus(id) {
    return this.tori.get(id) || null;
  }

  // Remove a torus
  removeTorus(id) {
    const removed = this.tori.delete(id);
    if (removed) {
      // Remove related blends
      this.blends = this.blends.filter(b => !b.connects(id));
      this.metadata.modifiedAt = Date.now();
    }
    return removed;
  }

  // List all tori
  listTori() {
    return Array.from(this.tori.values()).map(t => t.toJSON());
  }

  // Add a blend between two tori
  addBlend(blend) {
    // Verify both tori exist
    if (!this.tori.has(blend.torusA) || !this.tori.has(blend.torusB)) {
      throw new Error('Both tori must exist in foam to create blend');
    }
    this.blends.push(blend);
    this.metadata.modifiedAt = Date.now();
    return blend;
  }

  // Create and add a simple blend
  blend(torusIdA, torusIdB, strength = 0.5) {
    const blend = TorusBlend.simple(torusIdA, torusIdB, strength);
    return this.addBlend(blend);
  }

  // Get blends for a torus
  getBlendsFor(torusId) {
    return this.blends.filter(b => b.connects(torusId));
  }

  // Get connected tori (neighbors)
  getNeighbors(torusId) {
    return this.getBlendsFor(torusId)
      .map(b => b.other(torusId))
      .filter(id => id !== null)
      .map(id => this.getTorus(id))
      .filter(t => t !== null);
  }

  // Traverse from start to end (pathfinding)
  traverse(startId, endId, maxDepth = 10) {
    if (startId === endId) return [startId];
    if (!this.tori.has(startId) || !this.tori.has(endId)) return null;

    // BFS for shortest path
    const visited = new Set([startId]);
    const queue = [[startId]];

    while (queue.length > 0 && queue[0].length <= maxDepth) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const neighbors = this.getBlendsFor(current)
        .map(b => b.other(current))
        .filter(id => id && !visited.has(id));

      for (const neighbor of neighbors) {
        const newPath = [...path, neighbor];
        if (neighbor === endId) {
          return newPath;
        }
        visited.add(neighbor);
        queue.push(newPath);
      }
    }

    return null; // No path found
  }

  // Decay all blends
  decayAll(factor = 0.95) {
    this.blends.forEach(b => b.decay(factor));
    // Remove very weak blends
    this.blends = this.blends.filter(b => b.strength > 0.01);
    this.metadata.modifiedAt = Date.now();
  }

  // Statistics
  stats() {
    const toriCount = this.tori.size;
    const blendCount = this.blends.length;
    const avgStrength = blendCount > 0
      ? this.blends.reduce((sum, b) => sum + b.strength, 0) / blendCount
      : 0;
    const avgWinding = toriCount > 0
      ? Array.from(this.tori.values()).reduce((sum, t) => sum + t.winding, 0) / toriCount
      : 0;
    const totalTokens = Array.from(this.tori.values()).reduce((sum, t) => sum + t.tokensSpent, 0);

    return {
      name: this.name,
      toriCount,
      blendCount,
      avgStrength: avgStrength.toFixed(3),
      avgWinding: avgWinding.toFixed(2),
      totalTokens,
      createdAt: this.metadata.createdAt,
      modifiedAt: this.metadata.modifiedAt,
    };
  }

  toJSON() {
    return {
      name: this.name,
      tori: Array.from(this.tori.entries()).map(([id, t]) => [id, t.toJSON()]),
      blends: this.blends.map(b => b.toJSON()),
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const foam = new Foam(json.name);
    foam.metadata = json.metadata || foam.metadata;

    // Restore tori
    for (const [id, torusJson] of json.tori || []) {
      const torus = Torus.fromJSON(torusJson);
      foam.tori.set(id, torus);
    }

    // Restore blends
    foam.blends = (json.blends || []).map(b => TorusBlend.fromJSON(b));

    return foam;
  }
}

// BARF Query - Bark And Retrieve Foam (XOR-based search)
class BarfQuery {
  constructor(queryVector, xorKey = null) {
    this.queryVector = queryVector; // search term or embedding
    this.xorKey = xorKey; // optional XOR key for encrypted search
    this.timestamp = Date.now();
  }

  // Execute search against foam
  execute(foam) {
    const results = [];
    const queryHash = computeHash(this.queryVector);

    for (const [id, torus] of foam.tori) {
      // Score based on label similarity and metadata
      let score = 0;

      // Label matching
      const labelLower = torus.label.toLowerCase();
      const queryLower = String(this.queryVector).toLowerCase();
      if (labelLower.includes(queryLower)) {
        score += 0.5;
      }
      if (labelLower === queryLower) {
        score += 0.3;
      }

      // Metadata matching
      const metaStr = JSON.stringify(torus.metadata).toLowerCase();
      if (metaStr.includes(queryLower)) {
        score += 0.2;
      }

      // Winding level bonus (more refined = more relevant)
      score += torus.winding * 0.05;

      // BS penalty (higher BS = less reliable)
      score -= torus.bs * 0.1;

      // Token investment bonus
      score += Math.min(torus.tokensSpent / 1000, 0.1);

      if (score > 0) {
        results.push({
          torusId: id,
          torus: torus.toJSON(),
          score: Math.max(0, Math.min(1, score)),
          matchType: labelLower.includes(queryLower) ? 'label' : 'metadata',
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return {
      query: this.queryVector,
      timestamp: this.timestamp,
      resultCount: results.length,
      results: results.slice(0, 20), // Top 20
    };
  }

  // Get best match
  static bestMatch(results) {
    if (results.results && results.results.length > 0) {
      return results.results[0];
    }
    return null;
  }
}

// Flux Line - Traversal path through torus
class FluxLine {
  constructor(startPoint, endPoint) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.pathPoints = [startPoint];
    this.loopType = 'major'; // 'major' or 'minor'
  }

  addPoint(point) {
    this.pathPoints.push(point);
    return this;
  }

  // Trace path between two points
  static trace(startPoint, endPoint, steps = 10) {
    const flux = new FluxLine(startPoint, endPoint);

    // Interpolate between points
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const theta = startPoint.coord.theta + t * (endPoint.coord.theta - startPoint.coord.theta);
      const phi = startPoint.coord.phi + t * (endPoint.coord.phi - startPoint.coord.phi);
      flux.addPoint(new TorusPoint(theta, phi));
    }

    flux.addPoint(endPoint);
    return flux;
  }

  toJSON() {
    return {
      startPoint: this.startPoint.toJSON(),
      endPoint: this.endPoint.toJSON(),
      pathPoints: this.pathPoints.map(p => p.toJSON()),
      loopType: this.loopType,
    };
  }
}

// Main Artisan Client
class ArtisanClient {
  constructor() {
    this.foams = new Map(); // name -> Foam
    this.activeFoam = null;
    this.defaultFoamName = 'knowledge';
  }

  // Initialize with default foam
  init() {
    if (!this.foams.has(this.defaultFoamName)) {
      const foam = new Foam(this.defaultFoamName);
      this.foams.set(this.defaultFoamName, foam);
      this.activeFoam = foam;
    }
    return { success: true, foam: this.activeFoam.name };
  }

  // Create a new foam
  createFoam(name) {
    if (this.foams.has(name)) {
      return { success: false, error: 'Foam already exists' };
    }
    const foam = new Foam(name);
    this.foams.set(name, foam);
    return { success: true, foam: foam.stats() };
  }

  // Switch active foam
  setActiveFoam(name) {
    const foam = this.foams.get(name);
    if (!foam) {
      return { success: false, error: 'Foam not found' };
    }
    this.activeFoam = foam;
    return { success: true, foam: foam.name };
  }

  // Get active foam
  getActiveFoam() {
    if (!this.activeFoam) {
      this.init();
    }
    return this.activeFoam;
  }

  // Create a torus
  createTorus(label, majorRadius = 1.0, tokensSpent = 0) {
    const foam = this.getActiveFoam();
    const torus = new Torus(label, majorRadius, tokensSpent);
    foam.addTorus(torus);
    return { success: true, torus: torus.toJSON() };
  }

  // Get torus by ID
  getTorus(torusId) {
    const foam = this.getActiveFoam();
    const torus = foam.getTorus(torusId);
    if (!torus) {
      return { success: false, error: 'Torus not found' };
    }
    return { success: true, torus: torus.toJSON() };
  }

  // List all tori
  listTori() {
    const foam = this.getActiveFoam();
    return { success: true, tori: foam.listTori() };
  }

  // Add tokens to torus
  addTokens(torusId, tokens) {
    const foam = this.getActiveFoam();
    const torus = foam.getTorus(torusId);
    if (!torus) {
      return { success: false, error: 'Torus not found' };
    }
    torus.addTokens(tokens);
    return { success: true, torus: torus.toJSON() };
  }

  // Refine torus
  refineTorus(torusId) {
    const foam = this.getActiveFoam();
    const torus = foam.getTorus(torusId);
    if (!torus) {
      return { success: false, error: 'Torus not found' };
    }
    torus.refine();
    return { success: true, torus: torus.toJSON() };
  }

  // Validate torus (update BS score)
  validateTorus(torusId, bsScore) {
    const foam = this.getActiveFoam();
    const torus = foam.getTorus(torusId);
    if (!torus) {
      return { success: false, error: 'Torus not found' };
    }
    torus.validate(bsScore);
    return { success: true, torus: torus.toJSON() };
  }

  // Add point to torus
  addPoint(torusId, majorAngle, minorAngle, contentHash = null) {
    const foam = this.getActiveFoam();
    const torus = foam.getTorus(torusId);
    if (!torus) {
      return { success: false, error: 'Torus not found' };
    }
    const point = torus.addPoint(majorAngle, minorAngle, contentHash);
    return { success: true, point: point.toJSON() };
  }

  // Create blend between tori
  blendTori(torusIdA, torusIdB, strength = 0.5) {
    const foam = this.getActiveFoam();
    try {
      const blend = foam.blend(torusIdA, torusIdB, strength);
      return { success: true, blend: blend.toJSON() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Get neighbors of a torus
  getNeighbors(torusId) {
    const foam = this.getActiveFoam();
    const neighbors = foam.getNeighbors(torusId);
    return { success: true, neighbors: neighbors.map(t => t.toJSON()) };
  }

  // Traverse path between tori
  traverse(startId, endId, maxDepth = 10) {
    const foam = this.getActiveFoam();
    const path = foam.traverse(startId, endId, maxDepth);
    if (!path) {
      return { success: false, error: 'No path found' };
    }
    return {
      success: true,
      path,
      pathTori: path.map(id => foam.getTorus(id)?.toJSON()).filter(Boolean),
    };
  }

  // BARF query
  query(queryVector, xorKey = null) {
    const foam = this.getActiveFoam();
    const barf = new BarfQuery(queryVector, xorKey);
    const results = barf.execute(foam);
    return { success: true, ...results };
  }

  // Decay all blends
  decayBlends(factor = 0.95) {
    const foam = this.getActiveFoam();
    foam.decayAll(factor);
    return { success: true, stats: foam.stats() };
  }

  // Boost a specific blend
  boostBlend(blendId, amount = 0.1) {
    const foam = this.getActiveFoam();
    const blend = foam.blends.find(b => b.id === blendId);
    if (!blend) {
      return { success: false, error: 'Blend not found' };
    }
    blend.boost(amount);
    return { success: true, blend: blend.toJSON() };
  }

  // Get foam statistics
  stats() {
    const foam = this.getActiveFoam();
    return { success: true, stats: foam.stats() };
  }

  // Export foam to JSON
  exportFoam() {
    const foam = this.getActiveFoam();
    return { success: true, data: foam.toJSON() };
  }

  // Import foam from JSON
  importFoam(data) {
    try {
      const foam = Foam.fromJSON(data);
      this.foams.set(foam.name, foam);
      this.activeFoam = foam;
      return { success: true, foam: foam.stats() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Render foam as simple visualization data
  renderFoam() {
    const foam = this.getActiveFoam();
    const nodes = [];
    const edges = [];

    for (const [id, torus] of foam.tori) {
      nodes.push({
        id,
        label: torus.label,
        radius: torus.majorRadius,
        winding: torus.winding,
        bs: torus.bs,
        tokens: torus.tokensSpent,
      });
    }

    for (const blend of foam.blends) {
      edges.push({
        id: blend.id,
        source: blend.torusA,
        target: blend.torusB,
        strength: blend.strength,
      });
    }

    return { success: true, nodes, edges, stats: foam.stats() };
  }
}

module.exports = {
  ArtisanClient,
  Torus,
  TorusPoint,
  TorusCoordinate,
  TorusBlend,
  Foam,
  FluxLine,
  BarfQuery,
  WINDING_LEVELS,
  tokensToRadius,
  radiusToTokens,
};
