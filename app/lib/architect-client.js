// GentlyOS Architect Client - Idea Crystallization Engine
// Track ideas from spoken to crystallized, link to project tree, flow through recall

const crypto = require('crypto');

// Idea states (progression from vague to concrete)
const IDEA_STATES = {
  SPOKEN: 'spoken',         // Initial capture, raw
  EMBEDDED: 'embedded',     // Has embedding/context
  CONFIRMED: 'confirmed',   // Validated/reviewed
  CRYSTALLIZED: 'crystallized', // Linked to code/files
};

// Generate ID
function generateId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Compute hash
function computeHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
}

// Idea score components
class IdeaScore {
  constructor() {
    this.clarity = 0;       // How clear is the idea (0-100)
    this.feasibility = 0;   // How feasible to implement (0-100)
    this.impact = 0;        // Potential impact (0-100)
    this.completeness = 0;  // How complete is the specification (0-100)
  }

  // Compute overall score
  overall() {
    return (this.clarity + this.feasibility + this.impact + this.completeness) / 4;
  }

  toJSON() {
    return {
      clarity: this.clarity,
      feasibility: this.feasibility,
      impact: this.impact,
      completeness: this.completeness,
      overall: this.overall(),
    };
  }

  static fromJSON(json) {
    const score = new IdeaScore();
    score.clarity = json.clarity || 0;
    score.feasibility = json.feasibility || 0;
    score.impact = json.impact || 0;
    score.completeness = json.completeness || 0;
    return score;
  }
}

// Idea Crystal - core idea representation
class IdeaCrystal {
  constructor(content) {
    this.id = generateId('idea');
    this.content = content;
    this.state = IDEA_STATES.SPOKEN;
    this.embedding = null;       // Vector embedding if available
    this.chain = [];             // Doc chain IDs this idea participates in
    this.sourceFile = null;      // Crystallized location
    this.parent = null;          // Parent idea (for branches)
    this.children = [];          // Child ideas (branches)
    this.connections = [];       // Connected idea IDs
    this.score = new IdeaScore();
    this.tags = [];
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
    this.metadata = {};
  }

  // Embed the idea (add context/vector)
  embed(embedding, chain = []) {
    this.embedding = embedding;
    this.chain = chain;
    this.state = IDEA_STATES.EMBEDDED;
    this.modifiedAt = Date.now();
    return this;
  }

  // Confirm the idea (validated/reviewed)
  confirm() {
    if (this.state === IDEA_STATES.EMBEDDED || this.state === IDEA_STATES.SPOKEN) {
      this.state = IDEA_STATES.CONFIRMED;
      this.modifiedAt = Date.now();
    }
    return this;
  }

  // Crystallize the idea (link to code)
  crystallize(sourceFile) {
    this.sourceFile = sourceFile;
    this.state = IDEA_STATES.CRYSTALLIZED;
    this.modifiedAt = Date.now();
    return this;
  }

  // Branch from this idea
  branch(newContent) {
    const child = new IdeaCrystal(newContent);
    child.parent = this.id;
    child.tags = [...this.tags];
    this.children.push(child.id);
    this.modifiedAt = Date.now();
    return child;
  }

  // Connect to another idea
  connect(otherId) {
    if (!this.connections.includes(otherId)) {
      this.connections.push(otherId);
      this.modifiedAt = Date.now();
    }
    return this;
  }

  // Set score
  setScore(clarity, feasibility, impact, completeness) {
    this.score.clarity = Math.max(0, Math.min(100, clarity));
    this.score.feasibility = Math.max(0, Math.min(100, feasibility));
    this.score.impact = Math.max(0, Math.min(100, impact));
    this.score.completeness = Math.max(0, Math.min(100, completeness));
    this.modifiedAt = Date.now();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      state: this.state,
      embedding: this.embedding,
      chain: this.chain,
      sourceFile: this.sourceFile,
      parent: this.parent,
      children: this.children,
      connections: this.connections,
      score: this.score.toJSON(),
      tags: this.tags,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const idea = new IdeaCrystal(json.content);
    idea.id = json.id;
    idea.state = json.state;
    idea.embedding = json.embedding;
    idea.chain = json.chain || [];
    idea.sourceFile = json.sourceFile;
    idea.parent = json.parent;
    idea.children = json.children || [];
    idea.connections = json.connections || [];
    idea.score = IdeaScore.fromJSON(json.score || {});
    idea.tags = json.tags || [];
    idea.createdAt = json.createdAt;
    idea.modifiedAt = json.modifiedAt;
    idea.metadata = json.metadata || {};
    return idea;
  }
}

// Project tree node (file or directory)
class TreeNode {
  constructor(name, type = 'file', language = null) {
    this.id = generateId('node');
    this.name = name;
    this.type = type; // 'file' or 'directory'
    this.language = language;
    this.children = []; // Child node IDs (for directories)
    this.linkedIdeas = []; // Idea IDs linked to this node
    this.metadata = {};
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      language: this.language,
      children: this.children,
      linkedIdeas: this.linkedIdeas,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const node = new TreeNode(json.name, json.type, json.language);
    node.id = json.id;
    node.children = json.children || [];
    node.linkedIdeas = json.linkedIdeas || [];
    node.metadata = json.metadata || {};
    return node;
  }
}

// Project tree
class ProjectTree {
  constructor(name, rootPath = '/') {
    this.id = generateId('tree');
    this.name = name;
    this.rootPath = rootPath;
    this.nodes = new Map(); // id -> TreeNode
    this.root = null;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
  }

  // Create root directory
  createRoot() {
    const root = new TreeNode(this.name, 'directory');
    this.nodes.set(root.id, root);
    this.root = root.id;
    this.modifiedAt = Date.now();
    return root;
  }

  // Add directory
  addDirectory(name, parentId = null) {
    const dir = new TreeNode(name, 'directory');
    this.nodes.set(dir.id, dir);

    const parent = parentId ? this.nodes.get(parentId) : this.nodes.get(this.root);
    if (parent && parent.type === 'directory') {
      parent.children.push(dir.id);
    }

    this.modifiedAt = Date.now();
    return dir;
  }

  // Add file
  addFile(name, parentId = null, language = null) {
    const file = new TreeNode(name, 'file', language);
    this.nodes.set(file.id, file);

    const parent = parentId ? this.nodes.get(parentId) : this.nodes.get(this.root);
    if (parent && parent.type === 'directory') {
      parent.children.push(file.id);
    }

    this.modifiedAt = Date.now();
    return file;
  }

  // Get node
  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  // Link idea to node
  linkIdea(nodeId, ideaId) {
    const node = this.nodes.get(nodeId);
    if (node && !node.linkedIdeas.includes(ideaId)) {
      node.linkedIdeas.push(ideaId);
      this.modifiedAt = Date.now();
    }
    return node;
  }

  // Get all files
  listFiles() {
    return Array.from(this.nodes.values())
      .filter(n => n.type === 'file')
      .map(n => n.toJSON());
  }

  // Render tree structure
  render(nodeId = null, depth = 0) {
    const id = nodeId || this.root;
    const node = this.nodes.get(id);
    if (!node) return [];

    const lines = [];
    const indent = '  '.repeat(depth);
    const prefix = node.type === 'directory' ? '/' : '';
    lines.push({
      depth,
      id: node.id,
      name: prefix + node.name,
      type: node.type,
      language: node.language,
      linkedIdeas: node.linkedIdeas.length,
    });

    if (node.type === 'directory') {
      for (const childId of node.children) {
        lines.push(...this.render(childId, depth + 1));
      }
    }

    return lines;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rootPath: this.rootPath,
      root: this.root,
      nodes: Array.from(this.nodes.entries()).map(([id, n]) => [id, n.toJSON()]),
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    };
  }

  static fromJSON(json) {
    const tree = new ProjectTree(json.name, json.rootPath);
    tree.id = json.id;
    tree.root = json.root;
    tree.createdAt = json.createdAt;
    tree.modifiedAt = json.modifiedAt;

    for (const [id, nodeJson] of json.nodes || []) {
      tree.nodes.set(id, TreeNode.fromJSON(nodeJson));
    }

    return tree;
  }
}

// Recall engine - memory recall and suggestion
class RecallEngine {
  constructor() {
    this.history = []; // Query history
    this.cache = new Map(); // Query -> results cache
  }

  // Simple text similarity (Jaccard)
  similarity(textA, textB) {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }

  // Recall ideas matching query
  recall(ideas, query, limit = 10) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const idea of ideas) {
      let score = 0;

      // Content match
      if (idea.content.toLowerCase().includes(queryLower)) {
        score += 0.5;
      }

      // Similarity score
      score += this.similarity(idea.content, query) * 0.3;

      // Tag match
      for (const tag of idea.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 0.1;
        }
      }

      // State bonus (crystallized > confirmed > embedded > spoken)
      const stateBonus = {
        [IDEA_STATES.CRYSTALLIZED]: 0.1,
        [IDEA_STATES.CONFIRMED]: 0.07,
        [IDEA_STATES.EMBEDDED]: 0.04,
        [IDEA_STATES.SPOKEN]: 0,
      };
      score += stateBonus[idea.state] || 0;

      // Score bonus
      score += (idea.score.overall() / 100) * 0.1;

      if (score > 0.1) {
        results.push({
          ideaId: idea.id,
          idea: idea.toJSON(),
          score: Math.min(1, score),
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Cache and track
    this.history.push({ query, timestamp: Date.now(), resultCount: results.length });
    this.cache.set(query, results.slice(0, limit));

    return {
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
    };
  }

  // Suggest connections between ideas
  suggestConnections(ideas, limit = 5) {
    const suggestions = [];

    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const ideaA = ideas[i];
        const ideaB = ideas[j];

        // Skip if already connected
        if (ideaA.connections.includes(ideaB.id)) continue;

        const sim = this.similarity(ideaA.content, ideaB.content);
        if (sim > 0.2) {
          suggestions.push({
            ideaA: ideaA.id,
            ideaB: ideaB.id,
            similarity: sim,
            reason: 'Content similarity',
          });
        }

        // Tag overlap
        const tagOverlap = ideaA.tags.filter(t => ideaB.tags.includes(t)).length;
        if (tagOverlap > 0 && sim < 0.2) {
          suggestions.push({
            ideaA: ideaA.id,
            ideaB: ideaB.id,
            similarity: tagOverlap / Math.max(ideaA.tags.length, ideaB.tags.length),
            reason: 'Shared tags',
          });
        }
      }
    }

    // Sort by similarity
    suggestions.sort((a, b) => b.similarity - a.similarity);

    return suggestions.slice(0, limit);
  }

  // Rank ideas by overall quality
  rankIdeas(ideas, limit = 10) {
    const ranked = ideas.map(idea => ({
      ideaId: idea.id,
      idea: idea.toJSON(),
      rank: idea.score.overall() +
            (idea.state === IDEA_STATES.CRYSTALLIZED ? 20 : 0) +
            (idea.state === IDEA_STATES.CONFIRMED ? 10 : 0) +
            (idea.connections.length * 2) +
            (idea.children.length * 3),
    }));

    ranked.sort((a, b) => b.rank - a.rank);

    return ranked.slice(0, limit);
  }
}

// Main Architect Client
class ArchitectClient {
  constructor() {
    this.ideas = new Map(); // id -> IdeaCrystal
    this.trees = new Map(); // id -> ProjectTree
    this.activeTree = null;
    this.recall = new RecallEngine();
  }

  // Initialize
  init() {
    return { success: true, ideaCount: this.ideas.size, treeCount: this.trees.size };
  }

  // === IDEA OPERATIONS ===

  // Create a new idea
  createIdea(content, tags = []) {
    const idea = new IdeaCrystal(content);
    idea.tags = tags;
    this.ideas.set(idea.id, idea);
    return { success: true, idea: idea.toJSON() };
  }

  // Get idea by ID
  getIdea(ideaId) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    return { success: true, idea: idea.toJSON() };
  }

  // List all ideas
  listIdeas(state = null) {
    let ideas = Array.from(this.ideas.values());
    if (state) {
      ideas = ideas.filter(i => i.state === state);
    }
    return {
      success: true,
      ideas: ideas.map(i => i.toJSON()),
      total: ideas.length,
    };
  }

  // Embed idea
  embedIdea(ideaId, embedding, chain = []) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    idea.embed(embedding, chain);
    return { success: true, idea: idea.toJSON() };
  }

  // Confirm idea
  confirmIdea(ideaId) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    idea.confirm();
    return { success: true, idea: idea.toJSON() };
  }

  // Crystallize idea
  crystallizeIdea(ideaId, sourceFile) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    idea.crystallize(sourceFile);
    return { success: true, idea: idea.toJSON() };
  }

  // Branch idea
  branchIdea(ideaId, newContent) {
    const parent = this.ideas.get(ideaId);
    if (!parent) {
      return { success: false, error: 'Parent idea not found' };
    }
    const child = parent.branch(newContent);
    this.ideas.set(child.id, child);
    return { success: true, child: child.toJSON(), parent: parent.toJSON() };
  }

  // Connect ideas
  connectIdeas(ideaA, ideaB) {
    const a = this.ideas.get(ideaA);
    const b = this.ideas.get(ideaB);
    if (!a || !b) {
      return { success: false, error: 'One or both ideas not found' };
    }
    a.connect(ideaB);
    b.connect(ideaA);
    return { success: true, ideaA: a.toJSON(), ideaB: b.toJSON() };
  }

  // Score idea
  scoreIdea(ideaId, clarity, feasibility, impact, completeness) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    idea.setScore(clarity, feasibility, impact, completeness);
    return { success: true, idea: idea.toJSON() };
  }

  // Tag idea
  tagIdea(ideaId, tags) {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }
    idea.tags = [...new Set([...idea.tags, ...tags])];
    idea.modifiedAt = Date.now();
    return { success: true, idea: idea.toJSON() };
  }

  // === TREE OPERATIONS ===

  // Create project tree
  createTree(name, rootPath = '/') {
    const tree = new ProjectTree(name, rootPath);
    tree.createRoot();
    this.trees.set(tree.id, tree);
    this.activeTree = tree;
    return { success: true, tree: tree.toJSON() };
  }

  // Set active tree
  setActiveTree(treeId) {
    const tree = this.trees.get(treeId);
    if (!tree) {
      return { success: false, error: 'Tree not found' };
    }
    this.activeTree = tree;
    return { success: true, tree: tree.toJSON() };
  }

  // Get active tree
  getActiveTree() {
    if (!this.activeTree) {
      return { success: false, error: 'No active tree' };
    }
    return { success: true, tree: this.activeTree.toJSON() };
  }

  // List trees
  listTrees() {
    return {
      success: true,
      trees: Array.from(this.trees.values()).map(t => ({
        id: t.id,
        name: t.name,
        rootPath: t.rootPath,
        nodeCount: t.nodes.size,
      })),
    };
  }

  // Add directory to active tree
  addDirectory(name, parentId = null) {
    if (!this.activeTree) {
      return { success: false, error: 'No active tree' };
    }
    const dir = this.activeTree.addDirectory(name, parentId);
    return { success: true, node: dir.toJSON() };
  }

  // Add file to active tree
  addFile(name, parentId = null, language = null) {
    if (!this.activeTree) {
      return { success: false, error: 'No active tree' };
    }
    const file = this.activeTree.addFile(name, parentId, language);
    return { success: true, node: file.toJSON() };
  }

  // Link idea to tree node
  linkIdeaToNode(nodeId, ideaId) {
    if (!this.activeTree) {
      return { success: false, error: 'No active tree' };
    }
    const node = this.activeTree.linkIdea(nodeId, ideaId);
    if (!node) {
      return { success: false, error: 'Node not found' };
    }

    // Also update idea if it exists
    const idea = this.ideas.get(ideaId);
    if (idea && !idea.sourceFile) {
      idea.crystallize(node.name);
    }

    return { success: true, node: node.toJSON() };
  }

  // Render tree
  renderTree(treeId = null) {
    const tree = treeId ? this.trees.get(treeId) : this.activeTree;
    if (!tree) {
      return { success: false, error: 'Tree not found' };
    }
    return { success: true, structure: tree.render(), tree: tree.toJSON() };
  }

  // === RECALL OPERATIONS ===

  // Recall ideas
  recallIdeas(query, limit = 10) {
    const ideas = Array.from(this.ideas.values());
    const results = this.recall.recall(ideas, query, limit);
    return { success: true, ...results };
  }

  // Suggest connections
  suggestConnections(limit = 5) {
    const ideas = Array.from(this.ideas.values());
    const suggestions = this.recall.suggestConnections(ideas, limit);
    return { success: true, suggestions };
  }

  // Rank ideas
  rankIdeas(limit = 10) {
    const ideas = Array.from(this.ideas.values());
    const ranked = this.recall.rankIdeas(ideas, limit);
    return { success: true, ranked };
  }

  // === FLOWCHART ===

  // Generate flowchart data from ideas
  flowchart(rootIdeaId = null) {
    const nodes = [];
    const edges = [];

    for (const [id, idea] of this.ideas) {
      nodes.push({
        id: idea.id,
        label: idea.content.slice(0, 50) + (idea.content.length > 50 ? '...' : ''),
        state: idea.state,
        score: idea.score.overall(),
      });

      // Parent -> child edges
      for (const childId of idea.children) {
        edges.push({
          source: idea.id,
          target: childId,
          type: 'branch',
        });
      }

      // Connection edges
      for (const connId of idea.connections) {
        // Only add edge once (when source < target alphabetically)
        if (idea.id < connId) {
          edges.push({
            source: idea.id,
            target: connId,
            type: 'connection',
          });
        }
      }
    }

    return { success: true, nodes, edges };
  }

  // === EXPORT/IMPORT ===

  // Export all data
  exportAll() {
    return {
      success: true,
      data: {
        ideas: Array.from(this.ideas.entries()).map(([id, i]) => [id, i.toJSON()]),
        trees: Array.from(this.trees.entries()).map(([id, t]) => [id, t.toJSON()]),
        activeTreeId: this.activeTree?.id || null,
      },
    };
  }

  // Import data
  importAll(data) {
    try {
      // Import ideas
      this.ideas.clear();
      for (const [id, ideaJson] of data.ideas || []) {
        this.ideas.set(id, IdeaCrystal.fromJSON(ideaJson));
      }

      // Import trees
      this.trees.clear();
      for (const [id, treeJson] of data.trees || []) {
        this.trees.set(id, ProjectTree.fromJSON(treeJson));
      }

      // Set active tree
      if (data.activeTreeId && this.trees.has(data.activeTreeId)) {
        this.activeTree = this.trees.get(data.activeTreeId);
      } else {
        this.activeTree = null;
      }

      return {
        success: true,
        imported: {
          ideas: this.ideas.size,
          trees: this.trees.size,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Get stats
  stats() {
    const ideaStates = {};
    for (const state of Object.values(IDEA_STATES)) {
      ideaStates[state] = 0;
    }
    for (const idea of this.ideas.values()) {
      ideaStates[idea.state]++;
    }

    return {
      success: true,
      stats: {
        totalIdeas: this.ideas.size,
        totalTrees: this.trees.size,
        ideaStates,
        averageScore: this.ideas.size > 0
          ? Array.from(this.ideas.values()).reduce((sum, i) => sum + i.score.overall(), 0) / this.ideas.size
          : 0,
        totalConnections: Array.from(this.ideas.values()).reduce((sum, i) => sum + i.connections.length, 0) / 2,
      },
    };
  }
}

module.exports = {
  ArchitectClient,
  IdeaCrystal,
  IdeaScore,
  ProjectTree,
  TreeNode,
  RecallEngine,
  IDEA_STATES,
};
