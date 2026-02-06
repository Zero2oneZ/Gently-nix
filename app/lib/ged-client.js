// GentlyOS G.E.D. Client
// Generative Educational Device - Domain translation for learning

const { invokeGently } = require('./cli-bridge');
const { bridgeRPC } = require('./bridge-client');

// Available domains for translation
const Domains = {
  GAMING: 'gaming',
  COOKING: 'cooking',
  MUSIC: 'music',
  SPORTS: 'sports',
  ART: 'art',
  MOVIES: 'movies',
  NATURE: 'nature',
  BUILDING: 'building',
  FINANCE: 'finance',
  SOCIAL: 'social',
};

// Mastery levels
const MasteryLevel = {
  NOVICE: 'Novice',           // 0-30%
  INTERMEDIATE: 'Intermediate', // 30-60%
  ADVANCED: 'Advanced',       // 60-85%
  EXPERT: 'Expert',           // 85-100%
  MASTER: 'Master',           // 100% (all pathways)
};

// Get mastery level from score
function getMasteryLevel(score) {
  if (score >= 1.0) return MasteryLevel.MASTER;
  if (score >= 0.85) return MasteryLevel.EXPERT;
  if (score >= 0.6) return MasteryLevel.ADVANCED;
  if (score >= 0.3) return MasteryLevel.INTERMEDIATE;
  return MasteryLevel.NOVICE;
}

// Get mastery color
function getMasteryColor(level) {
  switch (level) {
    case MasteryLevel.MASTER: return 'var(--focus)';
    case MasteryLevel.EXPERT: return 'var(--warn)';
    case MasteryLevel.ADVANCED: return 'var(--feed)';
    case MasteryLevel.INTERMEDIATE: return 'var(--doc)';
    default: return 'var(--dim)';
  }
}

class GedClient {
  constructor() {
    this.translations = new Map(); // Cache translations
    this.useBridge = false;
  }

  // Translate a concept to user's domain
  async translate(concept, targetDomain) {
    const cacheKey = `${concept}:${targetDomain}`;

    // Check cache
    if (this.translations.has(cacheKey)) {
      return { success: true, translation: this.translations.get(cacheKey), cached: true };
    }

    try {
      let result;
      if (this.useBridge) {
        const bridgeResult = await bridgeRPC('ged.translate', {
          text: concept,
          mode: targetDomain
        });
        result = bridgeResult.result;
      } else {
        result = await invokeGently('ged', ['translate', concept, '--domain', targetDomain, '--json']);
      }

      const translation = this.normalizeTranslation(result, concept, targetDomain);
      this.translations.set(cacheKey, translation);
      return { success: true, translation };
    } catch (err) {
      console.error('[GedClient] Translate failed:', err);
      // Return mock translation
      const mock = this.getMockTranslation(concept, targetDomain);
      return { success: true, translation: mock, mock: true };
    }
  }

  // Analyze a concept (get metadata, related concepts)
  async analyze(concept) {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('ged.analyze', { text: concept });
        return { success: true, analysis: result.result };
      } else {
        const result = await invokeGently('ged', ['analyze', concept, '--json']);
        return { success: true, analysis: this.parseResult(result) };
      }
    } catch (err) {
      console.error('[GedClient] Analyze failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Get mastery score for a concept
  async getMastery(conceptId, userId = 'default') {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('ged.mastery', { concept_id: conceptId, user_id: userId });
        return { success: true, mastery: this.normalizeMastery(result.result) };
      } else {
        const result = await invokeGently('ged', ['mastery', conceptId, '--user', userId, '--json']);
        return { success: true, mastery: this.normalizeMastery(this.parseResult(result)) };
      }
    } catch (err) {
      // Return mock mastery
      return { success: true, mastery: this.getMockMastery(conceptId), mock: true };
    }
  }

  // Get living badge for a concept
  async getBadge(conceptId, userId = 'default') {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('ged.badge', { concept_id: conceptId, user_id: userId });
        return { success: true, badge: result.result };
      } else {
        const result = await invokeGently('ged', ['badge', conceptId, '--user', userId, '--json']);
        return { success: true, badge: this.parseResult(result) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Record exercise completion
  async recordExercise(conceptId, score, evidence = '') {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('ged.record_exercise', {
          concept_id: conceptId,
          score,
          evidence
        });
        return { success: true, result: result.result };
      } else {
        const result = await invokeGently('ged', ['record', conceptId, '--type', 'exercise', '--score', score.toString()]);
        return { success: true, result: this.parseResult(result) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Record explanation (teaching)
  async recordExplanation(conceptId, score, evidence = '') {
    try {
      if (this.useBridge) {
        const result = await bridgeRPC('ged.record_explain', {
          concept_id: conceptId,
          score,
          evidence
        });
        return { success: true, result: result.result };
      } else {
        const result = await invokeGently('ged', ['record', conceptId, '--type', 'explain', '--score', score.toString()]);
        return { success: true, result: this.parseResult(result) };
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

  // Normalize translation result
  normalizeTranslation(result, concept, domain) {
    if (typeof result === 'string') {
      return {
        sourceConcept: concept,
        targetDomain: domain,
        translatedContent: result,
        fidelityScore: 0.8,
        confidence: 0.85,
        metaphors: [],
        examples: [],
      };
    }
    return {
      sourceConcept: result.source_concept || result.sourceConcept || concept,
      targetDomain: result.target_domain || result.targetDomain || domain,
      translatedContent: result.translated_content || result.translatedContent || result.translation || '',
      fidelityScore: result.fidelity_score || result.fidelityScore || 0.8,
      confidence: result.confidence || 0.85,
      metaphors: result.metaphors || [],
      examples: result.examples || [],
    };
  }

  // Normalize mastery result
  normalizeMastery(result) {
    const exerciseScore = result.exercise_score || result.exerciseScore || 0;
    const explainScore = result.explain_score || result.explainScore || 0;
    const applyScore = result.apply_score || result.applyScore || 0;
    const overall = exerciseScore * 0.3 + explainScore * 0.4 + applyScore * 0.3;

    return {
      conceptId: result.concept_id || result.conceptId,
      exerciseScore,
      explainScore,
      applyScore,
      overall,
      level: getMasteryLevel(overall),
    };
  }

  // Get mock translation
  getMockTranslation(concept, domain) {
    const translations = {
      'recursion': {
        gaming: 'Recursion is like a game level that contains a smaller version of itself. Imagine a dungeon where each room has a mini-dungeon inside it, and you have to clear all the nested dungeons to complete the main one.',
        cooking: 'Recursion is like making a dish that requires making a smaller version of itself first. Like Russian nesting dolls of soup - you need to make a small batch to flavor the bigger batch.',
        music: 'Recursion is like a song that contains a smaller melody within it, and that melody contains an even smaller tune. Think of a musical canon where each voice echoes the previous one.',
        sports: 'Recursion is like a tournament bracket where each match is decided by the results of smaller preliminary matches, going all the way down to individual player rankings.',
      },
      'algorithm': {
        gaming: 'An algorithm is like a walkthrough guide - a step-by-step strategy to beat a level or boss. Follow the steps in order and you will reach the goal.',
        cooking: 'An algorithm is exactly like a recipe - a precise sequence of steps that, if followed correctly, produces the desired dish every time.',
        music: 'An algorithm is like sheet music - specific instructions in a specific order that produce a consistent result when performed.',
        sports: 'An algorithm is like a playbook - a set of predetermined moves and responses that the team executes to achieve a tactical advantage.',
      },
    };

    const domainTranslations = translations[concept.toLowerCase()];
    if (domainTranslations && domainTranslations[domain]) {
      return {
        sourceConcept: concept,
        targetDomain: domain,
        translatedContent: domainTranslations[domain],
        fidelityScore: 0.9,
        confidence: 0.95,
        metaphors: ['nested structure', 'self-reference'],
        examples: ['Game levels', 'Folder structures'],
      };
    }

    // Generic fallback
    return {
      sourceConcept: concept,
      targetDomain: domain,
      translatedContent: `In ${domain} terms, "${concept}" can be understood as a fundamental pattern that appears in many ${domain} contexts. Just as ${domain} has its own rules and structures, ${concept} follows similar principles of organization and flow.`,
      fidelityScore: 0.7,
      confidence: 0.6,
      metaphors: [],
      examples: [],
    };
  }

  // Get mock mastery
  getMockMastery(conceptId) {
    return {
      conceptId,
      exerciseScore: 0.65,
      explainScore: 0.45,
      applyScore: 0.55,
      overall: 0.54,
      level: MasteryLevel.INTERMEDIATE,
    };
  }
}

module.exports = {
  GedClient,
  Domains,
  MasteryLevel,
  getMasteryLevel,
  getMasteryColor,
};
