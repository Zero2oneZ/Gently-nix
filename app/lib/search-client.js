// GentlyOS Search Client
// Alexandria knowledge graph with 72-domain routing

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Search types
const SearchType = {
  SEMANTIC: 'semantic',
  EXACT: 'exact',
  PREFIX: 'prefix',
  FUZZY: 'fuzzy',
};

// Navigation modes (Alexandria)
const NavMode = {
  FORWARD: 'forward',       // Normal inference: X is Y
  REWIND: 'rewind',         // Who asked this before?
  ORTHOGONAL: 'orthogonal', // Surprising connections
  REROUTE: 'reroute',       // Alternate proofs
};

// Thought shapes
const ThoughtShape = {
  QUESTION: 'question',
  ANSWER: 'answer',
  CONCEPT: 'concept',
  REFERENCE: 'reference',
  BRIDGE: 'bridge',
};

class SearchClient {
  constructor() {
    this.results = [];
    this.useBridge = false;
  }

  // Search thoughts/concepts
  async query(queryText, options = {}) {
    const { limit = 20, domain = null, searchType = SearchType.SEMANTIC } = options;

    try {
      let result;
      if (this.useBridge) {
        const bridgeResult = await bridgeRPC('search.query', {
          query: queryText,
          limit,
          domain,
          search_type: searchType,
        });
        result = bridgeResult.result;
      } else {
        const args = ['query', queryText, '--json'];
        if (limit) args.push('--limit', limit.toString());
        if (domain) args.push('--domain', domain);
        result = await invokeGently('search', args);
      }

      this.results = this.normalizeResults(result);
      return { success: true, results: this.results };
    } catch (err) {
      console.error('[SearchClient] Query failed:', err);
      // Return mock results
      this.results = this.getMockResults(queryText);
      return { success: true, results: this.results, mock: true };
    }
  }

  // Alexandria 5W query (Who, What, Where, When, Why)
  async query5W(params) {
    const { who, what, where, when, why, limit = 20 } = params;

    try {
      if (this.useBridge) {
        const result = await bridgeRPC('alexandria.5w_query', {
          who, what, where, when, why, limit
        });
        return { success: true, results: this.normalizeResults(result.result) };
      } else {
        const args = ['alexandria', 'query'];
        if (who) args.push('--who', who);
        if (what) args.push('--what', what);
        if (where) args.push('--where', where);
        if (when) args.push('--when', when);
        if (why) args.push('--why', why);
        args.push('--json');
        const result = await invokeGently(...args);
        return { success: true, results: this.normalizeResults(this.parseResult(result)) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Alexandria collapse to table
  async collapse(pin, collapseFields, enumerateFields, limit = 100) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('alexandria.collapse', {
          pin,
          collapse: collapseFields,
          enumerate: enumerateFields,
          limit,
        });
        return { success: true, table: result.result };
      } else {
        const result = await invokeGently('alexandria', ['collapse', '--json',
          '--pin', JSON.stringify(pin),
          '--collapse', collapseFields.join(','),
          '--enumerate', enumerateFields.join(','),
        ]);
        return { success: true, table: this.parseResult(result) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Navigate Alexandria graph
  async navigate(conceptId, mode = NavMode.FORWARD) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('alexandria.navigate', {
          concept_id: conceptId,
          mode,
        });
        return { success: true, results: this.normalizeResults(result.result) };
      } else {
        const result = await invokeGently('alexandria', ['navigate', conceptId, '--mode', mode, '--json']);
        return { success: true, results: this.normalizeResults(this.parseResult(result)) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Add thought to index
  async addThought(content, shape = ThoughtShape.CONCEPT, metadata = {}) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('thought.add', { content, shape, metadata });
        return { success: true, thought: result.result };
      } else {
        const result = await invokeGently('search', ['add', content, '--shape', shape, '--json']);
        return { success: true, thought: this.parseResult(result) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Get wormholes (semantic jumps) for a concept
  async getWormholes(conceptId) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('alexandria.wormholes', { concept_id: conceptId });
        return { success: true, wormholes: result.result };
      } else {
        const result = await invokeGently('alexandria', ['wormholes', conceptId, '--json']);
        return { success: true, wormholes: this.parseResult(result) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Parse result
  parseResult(result) {
    if (typeof result === 'object') return result;
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  // Normalize search results
  normalizeResults(results) {
    if (!results) return [];
    if (!Array.isArray(results)) {
      results = results.results || results.thoughts || [results];
    }
    return results.map(r => this.normalizeThought(r));
  }

  // Normalize single thought
  normalizeThought(thought) {
    return {
      id: thought.id || thought.thought_id || `thought-${Date.now()}`,
      content: thought.content || thought.text || '',
      shape: thought.shape || ThoughtShape.CONCEPT,
      score: thought.score || thought.relevance || 0,
      bridges: thought.bridges || [],
      wormholes: thought.wormholes || [],
      metadata: thought.metadata || {},
      createdAt: thought.created_at || thought.createdAt,
    };
  }

  // Get mock results
  getMockResults(query) {
    const mockThoughts = [
      {
        id: 'thought-1',
        content: `Understanding "${query}" requires examining its core principles and how they connect to broader concepts in the knowledge graph.`,
        shape: ThoughtShape.CONCEPT,
        score: 0.95,
        bridges: ['related-concept-1', 'related-concept-2'],
        wormholes: [{ target: 'distant-concept', similarity: 0.7 }],
      },
      {
        id: 'thought-2',
        content: `The question "What is ${query}?" has been explored through multiple lenses, each revealing different aspects of its nature.`,
        shape: ThoughtShape.QUESTION,
        score: 0.88,
        bridges: ['approach-1', 'approach-2'],
        wormholes: [],
      },
      {
        id: 'thought-3',
        content: `Historical context: "${query}" emerged from earlier work on foundational principles and has evolved significantly.`,
        shape: ThoughtShape.REFERENCE,
        score: 0.75,
        bridges: ['history-1'],
        wormholes: [{ target: 'evolution', similarity: 0.6 }],
      },
    ];

    return mockThoughts;
  }
}

module.exports = {
  SearchClient,
  SearchType,
  NavMode,
  ThoughtShape,
};
