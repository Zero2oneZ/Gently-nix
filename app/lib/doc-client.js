// GentlyOS Document Client
// Three-chain document system: User Chain + Claude Chain = Result Chain

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Document actions
const DocAction = {
  DRAFT: 'Draft',
  EXPAND: 'Expand',
  SUMMARIZE: 'Summarize',
  FORMALIZE: 'Formalize',
  SIMPLIFY: 'Simplify',
  CITE: 'Cite',
  CHALLENGE: 'Challenge',
  VISUALIZE: 'Visualize',
  FINALIZE: 'Finalize',
};

// Document types
const DocType = {
  THREE_CHAIN: 'three-chain',
  STANDARD: 'standard',
  TEMPLATE: 'template',
};

class DocClient {
  constructor() {
    this.documents = [];
    this.currentDoc = null;
    this.useBridge = false;
  }

  // List all documents
  async list() {
    try {
      const result = await invokeGently('doc', ['list', '--json']);
      const docs = this.parseResult(result);
      this.documents = this.normalizeDocs(docs);
      return { success: true, documents: this.documents };
    } catch (cliErr) {
      try {
        const bridgeResult = await bridgeRPC('doc.list', {});
        if (bridgeResult.result) {
          this.documents = this.normalizeDocs(bridgeResult.result);
          this.useBridge = true;
          return { success: true, documents: this.documents };
        }
      } catch (bridgeErr) {
        // Return mock data
        this.documents = this.getMockDocs();
        return { success: true, documents: this.documents, mock: true };
      }
    }
    return { success: false, documents: [], error: 'Documents unavailable' };
  }

  // Get a single document by ID
  async get(docId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.get', { doc_id: docId });
        return { success: true, document: this.normalizeDoc(result.result) };
      } else {
        const result = await invokeGently('doc', ['get', docId, '--json']);
        return { success: true, document: this.normalizeDoc(this.parseResult(result)) };
      }
    } catch (err) {
      // Try to find in cached list
      const doc = this.documents.find(d => d.id === docId);
      if (doc) {
        return { success: true, document: doc, cached: true };
      }
      return { success: false, error: err.message };
    }
  }

  // Create a new document
  async create(name, docType = DocType.THREE_CHAIN) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.new', { name, doc_type: docType });
        return { success: true, document: this.normalizeDoc(result.result) };
      } else {
        const result = await invokeGently('doc', ['new', name, '--type', docType, '--json']);
        return { success: true, document: this.normalizeDoc(this.parseResult(result)) };
      }
    } catch (err) {
      console.error('[DocClient] Create failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Add content to user chain
  async addUserStep(docId, content) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.user_step', { doc_id: docId, content });
        return { success: true, step: result.result };
      } else {
        const result = await invokeGently('doc', ['step', docId, '--chain', 'user', content]);
        return { success: true, step: this.parseResult(result) };
      }
    } catch (err) {
      console.error('[DocClient] Add user step failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Add content to claude chain
  async addClaudeStep(docId, content) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.claude_step', { doc_id: docId, content });
        return { success: true, step: result.result };
      } else {
        const result = await invokeGently('doc', ['step', docId, '--chain', 'claude', content]);
        return { success: true, step: this.parseResult(result) };
      }
    } catch (err) {
      console.error('[DocClient] Add claude step failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Perform a document action
  async action(docId, action) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.action', { doc_id: docId, action });
        return { success: true, result: result.result };
      } else {
        const result = await invokeGently('doc', ['action', docId, action, '--json']);
        return { success: true, result: this.parseResult(result) };
      }
    } catch (err) {
      console.error('[DocClient] Action failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Verify document chain integrity
  async verify(docId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('doc.verify', { doc_id: docId });
        return { success: true, valid: result.result?.valid, hashes: result.result?.hashes };
      } else {
        const result = await invokeGently('doc', ['verify', docId, '--json']);
        const parsed = this.parseResult(result);
        return { success: true, valid: parsed.valid, hashes: parsed.hashes };
      }
    } catch (err) {
      console.error('[DocClient] Verify failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Finalize document (lock chains)
  async finalize(docId) {
    try {
      return await this.action(docId, DocAction.FINALIZE);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Parse CLI result
  parseResult(result) {
    if (typeof result === 'object') return result;
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  // Normalize documents array
  normalizeDocs(docs) {
    if (!Array.isArray(docs)) docs = docs.documents || [docs];
    return docs.map(d => this.normalizeDoc(d));
  }

  // Normalize single document
  normalizeDoc(doc) {
    return {
      id: doc.id || doc.doc_id || `doc-${Date.now()}`,
      name: doc.name || doc.title || 'Untitled',
      type: doc.type || doc.doc_type || DocType.THREE_CHAIN,
      userChain: this.normalizeChain(doc.user_chain || doc.userChain || {}),
      claudeChain: this.normalizeChain(doc.claude_chain || doc.claudeChain || {}),
      resultChain: this.normalizeChain(doc.result_chain || doc.resultChain || {}),
      finalized: doc.finalized || false,
      createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updated_at || doc.updatedAt,
    };
  }

  // Normalize chain
  normalizeChain(chain) {
    return {
      steps: (chain.steps || []).map((s, i) => ({
        id: s.id || i,
        content: s.content || s.text || '',
        hash: s.hash,
        timestamp: s.timestamp || s.created_at,
      })),
      hashChain: chain.hash_chain || chain.hashChain || [],
    };
  }

  // Get mock documents
  getMockDocs() {
    return [
      {
        id: 'mock-doc-1',
        name: 'GentlyOS Architecture',
        type: DocType.THREE_CHAIN,
        userChain: {
          steps: [
            { id: 1, content: 'Design a modular system with 6 tiers', hash: 'abc123' },
            { id: 2, content: 'Each tier handles a specific concern', hash: 'def456' },
          ],
          hashChain: ['abc123', 'def456'],
        },
        claudeChain: {
          steps: [
            { id: 1, content: 'Tier 0 (Foundation): Core crypto primitives', hash: 'ghi789' },
            { id: 2, content: 'Tier 1-2 (Knowledge): Feed and search systems', hash: 'jkl012' },
          ],
          hashChain: ['ghi789', 'jkl012'],
        },
        resultChain: {
          steps: [
            { id: 1, content: '6-tier architecture with clear separation of concerns', hash: 'mno345' },
          ],
          hashChain: ['mno345'],
        },
        finalized: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'mock-doc-2',
        name: 'API Integration Guide',
        type: DocType.STANDARD,
        userChain: { steps: [], hashChain: [] },
        claudeChain: { steps: [], hashChain: [] },
        resultChain: { steps: [], hashChain: [] },
        finalized: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

module.exports = {
  DocClient,
  DocAction,
  DocType,
};
