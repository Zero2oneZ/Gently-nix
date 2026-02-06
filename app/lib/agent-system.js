// GentlyOS Agent System
// Multi-agent orchestration for Dev tier (minScore: 100)
// Agents can be composed, chained, and run in parallel

const { EventEmitter } = require('events');

// Agent Types
const AGENT_TYPES = {
  // Core agents
  coordinator: {
    name: 'Coordinator',
    description: 'Orchestrates other agents and manages workflows',
    capabilities: ['delegate', 'chain', 'parallel', 'wait'],
    tier: 'dev',
    minScore: 100,
  },
  researcher: {
    name: 'Researcher',
    description: 'Searches, reads, and synthesizes information',
    capabilities: ['search', 'read', 'summarize', 'cite'],
    tier: 'dev',
    minScore: 50,
  },
  coder: {
    name: 'Coder',
    description: 'Writes, reviews, and refactors code',
    capabilities: ['generate', 'review', 'refactor', 'test'],
    tier: 'dev',
    minScore: 75,
  },
  designer: {
    name: 'Designer',
    description: 'Creates UI/UX designs and visual assets',
    capabilities: ['layout', 'style', 'component', 'animate'],
    tier: 'pro',
    minScore: 50,
  },
  analyst: {
    name: 'Analyst',
    description: 'Analyzes data and generates insights',
    capabilities: ['query', 'aggregate', 'visualize', 'report'],
    tier: 'pro',
    minScore: 25,
  },
  writer: {
    name: 'Writer',
    description: 'Creates content, documentation, and copy',
    capabilities: ['draft', 'edit', 'format', 'localize'],
    tier: 'basic',
    minScore: 0,
  },
};

// Agent States
const AGENT_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

// Workflow types
const WORKFLOW_TYPES = {
  SEQUENTIAL: 'sequential',  // A -> B -> C
  PARALLEL: 'parallel',      // A, B, C simultaneously
  BRANCHING: 'branching',    // A -> (B || C) based on condition
  LOOP: 'loop',              // A -> B -> A (until condition)
};

class Agent extends EventEmitter {
  constructor(id, type, config = {}) {
    super();
    this.id = id;
    this.type = type;
    this.typeInfo = AGENT_TYPES[type];
    this.config = config;
    this.state = AGENT_STATES.IDLE;
    this.context = {};
    this.history = [];
    this.startTime = null;
    this.endTime = null;
  }

  // Get agent info
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      name: this.typeInfo.name,
      description: this.typeInfo.description,
      capabilities: this.typeInfo.capabilities,
      state: this.state,
      config: this.config,
    };
  }

  // Set context
  setContext(key, value) {
    this.context[key] = value;
    this.emit('context-update', { key, value });
  }

  // Get context
  getContext(key) {
    return key ? this.context[key] : this.context;
  }

  // Execute a capability
  async execute(capability, params = {}) {
    if (!this.typeInfo.capabilities.includes(capability)) {
      return {
        success: false,
        error: `Agent '${this.type}' does not have capability '${capability}'`,
      };
    }

    this.state = AGENT_STATES.RUNNING;
    this.startTime = Date.now();
    this.emit('state-change', { state: this.state, capability });

    try {
      const result = await this.runCapability(capability, params);

      this.history.push({
        capability,
        params,
        result,
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
      });

      this.state = AGENT_STATES.COMPLETED;
      this.endTime = Date.now();
      this.emit('complete', { capability, result });

      return { success: true, result };
    } catch (err) {
      this.state = AGENT_STATES.FAILED;
      this.endTime = Date.now();
      this.emit('error', { capability, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // Run specific capability (override in subclasses)
  async runCapability(capability, params) {
    // Default implementations
    switch (capability) {
      // Coordinator capabilities
      case 'delegate':
        return { delegated: params.task, to: params.agent };
      case 'chain':
        return { chained: params.agents };
      case 'parallel':
        return { parallel: params.agents };
      case 'wait':
        await new Promise(r => setTimeout(r, params.ms || 1000));
        return { waited: params.ms || 1000 };

      // Researcher capabilities
      case 'search':
        return { query: params.query, results: [] };
      case 'read':
        return { source: params.source, content: 'Content...' };
      case 'summarize':
        return { text: params.text, summary: 'Summary...' };
      case 'cite':
        return { sources: params.sources, citations: [] };

      // Coder capabilities
      case 'generate':
        return { spec: params.spec, code: '// Generated code' };
      case 'review':
        return { code: params.code, issues: [], suggestions: [] };
      case 'refactor':
        return { code: params.code, refactored: params.code };
      case 'test':
        return { code: params.code, tests: '// Tests' };

      // Designer capabilities
      case 'layout':
        return { spec: params.spec, layout: '<div>Layout</div>' };
      case 'style':
        return { element: params.element, css: '/* Styles */' };
      case 'component':
        return { name: params.name, component: '<Component/>' };
      case 'animate':
        return { target: params.target, animation: '@keyframes {}' };

      // Analyst capabilities
      case 'query':
        return { query: params.query, data: [] };
      case 'aggregate':
        return { data: params.data, aggregated: {} };
      case 'visualize':
        return { data: params.data, chart: 'Chart config' };
      case 'report':
        return { data: params.data, report: 'Report...' };

      // Writer capabilities
      case 'draft':
        return { topic: params.topic, draft: 'Draft content...' };
      case 'edit':
        return { text: params.text, edited: params.text };
      case 'format':
        return { text: params.text, formatted: params.text };
      case 'localize':
        return { text: params.text, locale: params.locale, localized: params.text };

      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  // Pause agent
  pause() {
    if (this.state === AGENT_STATES.RUNNING) {
      this.state = AGENT_STATES.PAUSED;
      this.emit('state-change', { state: this.state });
    }
  }

  // Resume agent
  resume() {
    if (this.state === AGENT_STATES.PAUSED) {
      this.state = AGENT_STATES.RUNNING;
      this.emit('state-change', { state: this.state });
    }
  }

  // Reset agent
  reset() {
    this.state = AGENT_STATES.IDLE;
    this.context = {};
    this.history = [];
    this.startTime = null;
    this.endTime = null;
    this.emit('reset');
  }

  // Get execution history
  getHistory() {
    return this.history;
  }
}

class AgentSystem extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.workflows = new Map();
    this.activeWorkflow = null;
    this.hardwareScore = 0;
    this.userTier = 'free';
  }

  // Configure system
  configure(hardwareScore, userTier) {
    this.hardwareScore = hardwareScore;
    this.userTier = userTier;
    return { success: true, hardwareScore, userTier };
  }

  // Check if agent type is available
  isAgentTypeAvailable(type) {
    const typeInfo = AGENT_TYPES[type];
    if (!typeInfo) return false;

    // Check tier
    const tierLevels = { free: 0, basic: 1, pro: 2, dev: 3 };
    if (tierLevels[this.userTier] < tierLevels[typeInfo.tier]) return false;

    // Check hardware score
    if (this.hardwareScore < typeInfo.minScore) return false;

    return true;
  }

  // Get available agent types
  getAvailableTypes() {
    return Object.entries(AGENT_TYPES)
      .filter(([type, _]) => this.isAgentTypeAvailable(type))
      .map(([type, info]) => ({
        type,
        ...info,
        available: true,
      }));
  }

  // Get all agent types with availability
  getAllTypes() {
    return Object.entries(AGENT_TYPES).map(([type, info]) => ({
      type,
      ...info,
      available: this.isAgentTypeAvailable(type),
      reason: !this.isAgentTypeAvailable(type)
        ? this.getUnavailableReason(type)
        : null,
    }));
  }

  // Get reason why agent is unavailable
  getUnavailableReason(type) {
    const typeInfo = AGENT_TYPES[type];
    if (!typeInfo) return 'Unknown agent type';

    const tierLevels = { free: 0, basic: 1, pro: 2, dev: 3 };
    if (tierLevels[this.userTier] < tierLevels[typeInfo.tier]) {
      return `Requires ${typeInfo.tier} tier`;
    }

    if (this.hardwareScore < typeInfo.minScore) {
      return `Requires HW score ${typeInfo.minScore}+`;
    }

    return null;
  }

  // Create an agent
  createAgent(type, config = {}) {
    if (!this.isAgentTypeAvailable(type)) {
      return {
        success: false,
        error: this.getUnavailableReason(type),
      };
    }

    const id = `agent_${type}_${Date.now()}`;
    const agent = new Agent(id, type, config);

    // Forward agent events
    agent.on('state-change', (data) => this.emit('agent-state', { id, ...data }));
    agent.on('complete', (data) => this.emit('agent-complete', { id, ...data }));
    agent.on('error', (data) => this.emit('agent-error', { id, ...data }));

    this.agents.set(id, agent);
    this.emit('agent-created', { id, type });

    return { success: true, id, agent: agent.getInfo() };
  }

  // Get agent by ID
  getAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) return { success: false, error: 'Agent not found' };
    return { success: true, agent: agent.getInfo() };
  }

  // Execute agent capability
  async executeAgent(id, capability, params = {}) {
    const agent = this.agents.get(id);
    if (!agent) return { success: false, error: 'Agent not found' };
    return await agent.execute(capability, params);
  }

  // Remove agent
  removeAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) return { success: false, error: 'Agent not found' };

    agent.removeAllListeners();
    this.agents.delete(id);
    this.emit('agent-removed', { id });

    return { success: true };
  }

  // List all agents
  listAgents() {
    return Array.from(this.agents.values()).map(a => a.getInfo());
  }

  // ===== WORKFLOW MANAGEMENT =====

  // Create a workflow
  createWorkflow(name, type, steps) {
    const id = `workflow_${Date.now()}`;
    const workflow = {
      id,
      name,
      type,
      steps,
      state: 'idle',
      currentStep: 0,
      results: [],
      createdAt: Date.now(),
    };

    this.workflows.set(id, workflow);
    this.emit('workflow-created', { id, name, type });

    return { success: true, id, workflow };
  }

  // Run a workflow
  async runWorkflow(id) {
    const workflow = this.workflows.get(id);
    if (!workflow) return { success: false, error: 'Workflow not found' };

    workflow.state = 'running';
    this.activeWorkflow = id;
    this.emit('workflow-start', { id });

    try {
      switch (workflow.type) {
        case WORKFLOW_TYPES.SEQUENTIAL:
          await this.runSequential(workflow);
          break;
        case WORKFLOW_TYPES.PARALLEL:
          await this.runParallel(workflow);
          break;
        case WORKFLOW_TYPES.BRANCHING:
          await this.runBranching(workflow);
          break;
        case WORKFLOW_TYPES.LOOP:
          await this.runLoop(workflow);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflow.type}`);
      }

      workflow.state = 'completed';
      this.emit('workflow-complete', { id, results: workflow.results });

      return { success: true, results: workflow.results };
    } catch (err) {
      workflow.state = 'failed';
      this.emit('workflow-error', { id, error: err.message });
      return { success: false, error: err.message };
    } finally {
      this.activeWorkflow = null;
    }
  }

  // Run sequential workflow
  async runSequential(workflow) {
    for (let i = 0; i < workflow.steps.length; i++) {
      workflow.currentStep = i;
      const step = workflow.steps[i];
      this.emit('workflow-step', { id: workflow.id, step: i, total: workflow.steps.length });

      const result = await this.executeStep(step, workflow.results);
      workflow.results.push({ step: i, ...result });

      if (!result.success) {
        throw new Error(`Step ${i} failed: ${result.error}`);
      }
    }
  }

  // Run parallel workflow
  async runParallel(workflow) {
    const promises = workflow.steps.map((step, i) => {
      this.emit('workflow-step', { id: workflow.id, step: i, total: workflow.steps.length });
      return this.executeStep(step, []).then(result => ({ step: i, ...result }));
    });

    workflow.results = await Promise.all(promises);

    const failures = workflow.results.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`${failures.length} steps failed`);
    }
  }

  // Run branching workflow
  async runBranching(workflow) {
    // First step is the condition
    const conditionStep = workflow.steps[0];
    const conditionResult = await this.executeStep(conditionStep, []);

    workflow.results.push({ step: 0, type: 'condition', ...conditionResult });

    if (!conditionResult.success) {
      throw new Error('Condition step failed');
    }

    // Branch based on condition result
    const branchIndex = conditionResult.result?.branch === 'b' ? 2 : 1;
    const branchStep = workflow.steps[branchIndex];

    if (branchStep) {
      const branchResult = await this.executeStep(branchStep, workflow.results);
      workflow.results.push({ step: branchIndex, type: 'branch', ...branchResult });
    }
  }

  // Run loop workflow
  async runLoop(workflow) {
    const maxIterations = workflow.steps[0]?.maxIterations || 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const result = await this.executeStep(step, workflow.results);

        workflow.results.push({ iteration, step: i, ...result });

        // Check for loop termination
        if (step.isTerminator && result.result?.terminate) {
          return;
        }
      }
      iteration++;
    }
  }

  // Execute a workflow step
  async executeStep(step, previousResults) {
    // Get or create agent
    let agent = this.agents.get(step.agentId);
    if (!agent && step.agentType) {
      const createResult = this.createAgent(step.agentType);
      if (!createResult.success) return createResult;
      agent = this.agents.get(createResult.id);
    }

    if (!agent) {
      return { success: false, error: 'No agent for step' };
    }

    // Inject previous results into params if needed
    const params = { ...step.params };
    if (step.usePreviousResult && previousResults.length > 0) {
      params.previousResult = previousResults[previousResults.length - 1].result;
    }

    return await agent.execute(step.capability, params);
  }

  // Get workflow by ID
  getWorkflow(id) {
    const workflow = this.workflows.get(id);
    if (!workflow) return { success: false, error: 'Workflow not found' };
    return { success: true, workflow };
  }

  // List all workflows
  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  // Remove workflow
  removeWorkflow(id) {
    if (!this.workflows.has(id)) return { success: false, error: 'Workflow not found' };
    this.workflows.delete(id);
    return { success: true };
  }
}

module.exports = {
  Agent,
  AgentSystem,
  AGENT_TYPES,
  AGENT_STATES,
  WORKFLOW_TYPES,
};
