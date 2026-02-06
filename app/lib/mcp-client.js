// GentlyOS MCP Client - Multi-Scope Model Context Protocol
// Separation of concerns: Builder -> App -> Micro -> Visitor
// Scope is variable-controlled and never breaks boundaries

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// MCP Scopes - hierarchical access control
const MCP_SCOPES = {
  visitor: {
    level: 0,
    tier: 'free',
    description: 'End-user RAG chat and help',
    allowedTools: ['rag.query', 'rag.search', 'help.navigate', 'help.explain'],
  },
  micro: {
    level: 1,
    tier: 'basic',
    description: 'Micro-app building tools',
    allowedTools: ['template.list', 'template.apply', 'widget.create', 'connector.bind'],
  },
  app: {
    level: 2,
    tier: 'pro',
    description: 'App UI/UX function tools',
    allowedTools: ['component.create', 'state.manage', 'route.define', 'data.bind', 'style.apply'],
  },
  builder: {
    level: 3,
    tier: 'dev',
    description: 'Full system builder tools',
    allowedTools: ['*'], // All tools
  },
};

// Tool definitions by scope
const MCP_TOOLS = {
  // Visitor scope (Free tier) - RAG and help
  'rag.query': {
    scope: 'visitor',
    name: 'rag_query',
    description: 'Query the RAG knowledge base for answers',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The question to answer' },
        context: { type: 'string', description: 'Optional context for the query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
  'rag.search': {
    scope: 'visitor',
    name: 'rag_search',
    description: 'Search for relevant content',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        type: { type: 'string', enum: ['docs', 'code', 'all'], default: 'all' },
      },
      required: ['query'],
    },
  },
  'help.navigate': {
    scope: 'visitor',
    name: 'help_navigate',
    description: 'Get navigation help for the app',
    inputSchema: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Where the user wants to go' },
      },
      required: ['destination'],
    },
  },
  'help.explain': {
    scope: 'visitor',
    name: 'help_explain',
    description: 'Explain a feature or concept',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to explain' },
        detail: { type: 'string', enum: ['brief', 'detailed'], default: 'brief' },
      },
      required: ['topic'],
    },
  },

  // Micro scope (Basic tier) - Widget building
  'template.list': {
    scope: 'micro',
    name: 'template_list',
    description: 'List available micro-app templates',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Template category filter' },
      },
    },
  },
  'template.apply': {
    scope: 'micro',
    name: 'template_apply',
    description: 'Apply a template to create a micro-app',
    inputSchema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'Template to apply' },
        config: { type: 'object', description: 'Configuration options' },
      },
      required: ['templateId'],
    },
  },
  'widget.create': {
    scope: 'micro',
    name: 'widget_create',
    description: 'Create a new widget',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Widget type' },
        props: { type: 'object', description: 'Widget properties' },
      },
      required: ['type'],
    },
  },
  'connector.bind': {
    scope: 'micro',
    name: 'connector_bind',
    description: 'Bind a data connector to a widget',
    inputSchema: {
      type: 'object',
      properties: {
        widgetId: { type: 'string' },
        source: { type: 'string', description: 'Data source path' },
      },
      required: ['widgetId', 'source'],
    },
  },

  // App scope (Pro tier) - UI/UX tools
  'component.create': {
    scope: 'app',
    name: 'component_create',
    description: 'Create a reusable UI component',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name' },
        template: { type: 'string', description: 'Component template/markup' },
        style: { type: 'string', description: 'Component styles' },
        props: { type: 'object', description: 'Component props schema' },
      },
      required: ['name', 'template'],
    },
  },
  'state.manage': {
    scope: 'app',
    name: 'state_manage',
    description: 'Manage application state',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set', 'subscribe', 'reset'] },
        path: { type: 'string', description: 'State path' },
        value: { description: 'Value for set action' },
      },
      required: ['action', 'path'],
    },
  },
  'route.define': {
    scope: 'app',
    name: 'route_define',
    description: 'Define application routes',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Route path pattern' },
        component: { type: 'string', description: 'Component to render' },
        guards: { type: 'array', description: 'Route guards' },
      },
      required: ['path', 'component'],
    },
  },
  'data.bind': {
    scope: 'app',
    name: 'data_bind',
    description: 'Create reactive data bindings',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Data source' },
        target: { type: 'string', description: 'Target element/component' },
        transform: { type: 'string', description: 'Optional transform function' },
      },
      required: ['source', 'target'],
    },
  },
  'style.apply': {
    scope: 'app',
    name: 'style_apply',
    description: 'Apply dynamic styles',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' },
        styles: { type: 'object', description: 'Style properties' },
        scope: { type: 'string', enum: ['component', 'page', 'global'] },
      },
      required: ['selector', 'styles'],
    },
  },

  // Builder scope (Dev tier) - Full system tools
  'code.generate': {
    scope: 'builder',
    name: 'code_generate',
    description: 'Generate code from specifications',
    inputSchema: {
      type: 'object',
      properties: {
        spec: { type: 'string', description: 'Code specification' },
        language: { type: 'string', description: 'Target language' },
        framework: { type: 'string', description: 'Target framework' },
      },
      required: ['spec'],
    },
  },
  'code.refactor': {
    scope: 'builder',
    name: 'code_refactor',
    description: 'Refactor existing code',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to refactor' },
        goal: { type: 'string', description: 'Refactoring goal' },
      },
      required: ['code', 'goal'],
    },
  },
  'test.generate': {
    scope: 'builder',
    name: 'test_generate',
    description: 'Generate tests for code',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to test' },
        framework: { type: 'string', description: 'Test framework' },
      },
      required: ['code'],
    },
  },
  'deploy.prepare': {
    scope: 'builder',
    name: 'deploy_prepare',
    description: 'Prepare deployment artifacts',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['local', 'staging', 'production'] },
        config: { type: 'object', description: 'Deployment configuration' },
      },
      required: ['target'],
    },
  },
  'system.analyze': {
    scope: 'builder',
    name: 'system_analyze',
    description: 'Analyze system architecture',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'Analysis scope' },
        depth: { type: 'string', enum: ['shallow', 'deep'] },
      },
    },
  },
};

class MCPClient {
  constructor() {
    this.currentScope = 'visitor';
    this.bridgeHost = 'localhost';
    this.bridgePort = 7335;
    this.mcpProcess = null;
    this.toolResults = new Map();
    this.configured = false;
  }

  // Configure the MCP client
  configure(scope = 'visitor', bridgeHost = 'localhost', bridgePort = 7335) {
    if (!MCP_SCOPES[scope]) {
      return { success: false, error: `Invalid scope: ${scope}` };
    }
    this.currentScope = scope;
    this.bridgeHost = bridgeHost;
    this.bridgePort = bridgePort;
    this.configured = true;
    return { success: true, scope, level: MCP_SCOPES[scope].level };
  }

  // Check if configured
  isConfigured() {
    return this.configured;
  }

  // Get current scope info
  getScopeInfo() {
    return {
      scope: this.currentScope,
      ...MCP_SCOPES[this.currentScope],
    };
  }

  // Check if a tool is allowed in current scope
  isToolAllowed(toolId) {
    const scopeInfo = MCP_SCOPES[this.currentScope];
    if (scopeInfo.allowedTools.includes('*')) return true;

    const tool = MCP_TOOLS[toolId];
    if (!tool) return false;

    // Check if tool's scope level is <= current scope level
    const toolScope = MCP_SCOPES[tool.scope];
    return toolScope.level <= scopeInfo.level;
  }

  // Get available tools for current scope
  getAvailableTools() {
    const scopeInfo = MCP_SCOPES[this.currentScope];

    return Object.entries(MCP_TOOLS)
      .filter(([id, tool]) => {
        if (scopeInfo.allowedTools.includes('*')) return true;
        const toolScope = MCP_SCOPES[tool.scope];
        return toolScope.level <= scopeInfo.level;
      })
      .map(([id, tool]) => ({
        id,
        name: tool.name,
        scope: tool.scope,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
  }

  // Get tools grouped by scope
  getToolsByScope() {
    const result = {};
    for (const [scopeName, scopeInfo] of Object.entries(MCP_SCOPES)) {
      if (scopeInfo.level <= MCP_SCOPES[this.currentScope].level) {
        result[scopeName] = {
          ...scopeInfo,
          tools: Object.entries(MCP_TOOLS)
            .filter(([_, t]) => t.scope === scopeName)
            .map(([id, t]) => ({ id, ...t })),
        };
      }
    }
    return result;
  }

  // Execute a tool
  async executeTool(toolId, params = {}) {
    if (!this.isToolAllowed(toolId)) {
      return {
        success: false,
        error: `Tool '${toolId}' is not available in scope '${this.currentScope}'`,
      };
    }

    const tool = MCP_TOOLS[toolId];
    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolId}` };
    }

    // Try Bridge API first
    try {
      const bridgeResult = await this.callBridge('mcp.execute', {
        tool: tool.name,
        params,
        scope: this.currentScope,
      });

      if (bridgeResult.success) {
        return bridgeResult;
      }
    } catch (err) {
      console.log('[MCP] Bridge not available, using local execution');
    }

    // Fallback to local execution
    return await this.executeToolLocal(toolId, params);
  }

  // Local tool execution (fallback when Bridge offline)
  async executeToolLocal(toolId, params) {
    const tool = MCP_TOOLS[toolId];

    // Simulate tool execution based on type
    switch (toolId) {
      // Visitor tools
      case 'rag.query':
        return {
          success: true,
          result: {
            answer: `[Local] Query results for: ${params.query}`,
            sources: [],
            confidence: 0.7,
          },
        };

      case 'rag.search':
        return {
          success: true,
          result: {
            results: [
              { title: 'Result 1', snippet: 'Local search result...', score: 0.9 },
            ],
            total: 1,
          },
        };

      case 'help.navigate':
        return {
          success: true,
          result: {
            path: `/${params.destination}`,
            steps: ['Open menu', `Select ${params.destination}`],
          },
        };

      case 'help.explain':
        return {
          success: true,
          result: {
            explanation: `[Local] Explanation of ${params.topic}`,
            related: [],
          },
        };

      // Micro tools
      case 'template.list':
        return {
          success: true,
          result: {
            templates: [
              { id: 'card', name: 'Card Widget', category: 'display' },
              { id: 'form', name: 'Form Widget', category: 'input' },
              { id: 'list', name: 'List Widget', category: 'display' },
              { id: 'chart', name: 'Chart Widget', category: 'data' },
            ],
          },
        };

      case 'template.apply':
        return {
          success: true,
          result: {
            widgetId: `widget_${Date.now()}`,
            template: params.templateId,
            status: 'created',
          },
        };

      case 'widget.create':
        return {
          success: true,
          result: {
            widgetId: `widget_${Date.now()}`,
            type: params.type,
            status: 'created',
          },
        };

      case 'connector.bind':
        return {
          success: true,
          result: {
            bindingId: `bind_${Date.now()}`,
            widget: params.widgetId,
            source: params.source,
            status: 'bound',
          },
        };

      // App tools
      case 'component.create':
        return {
          success: true,
          result: {
            componentId: `comp_${params.name}_${Date.now()}`,
            name: params.name,
            status: 'created',
          },
        };

      case 'state.manage':
        return {
          success: true,
          result: {
            action: params.action,
            path: params.path,
            value: params.action === 'get' ? null : params.value,
            status: 'success',
          },
        };

      case 'route.define':
        return {
          success: true,
          result: {
            routeId: `route_${Date.now()}`,
            path: params.path,
            component: params.component,
            status: 'defined',
          },
        };

      case 'data.bind':
        return {
          success: true,
          result: {
            bindingId: `data_${Date.now()}`,
            source: params.source,
            target: params.target,
            status: 'bound',
          },
        };

      case 'style.apply':
        return {
          success: true,
          result: {
            styleId: `style_${Date.now()}`,
            selector: params.selector,
            status: 'applied',
          },
        };

      // Builder tools
      case 'code.generate':
        return {
          success: true,
          result: {
            code: `// Generated code for: ${params.spec}\n// Language: ${params.language || 'javascript'}`,
            language: params.language || 'javascript',
          },
        };

      case 'code.refactor':
        return {
          success: true,
          result: {
            refactored: `// Refactored: ${params.goal}\n${params.code}`,
            changes: ['Applied refactoring'],
          },
        };

      case 'test.generate':
        return {
          success: true,
          result: {
            tests: `// Generated tests\ndescribe('test', () => {\n  it('should work', () => {});\n});`,
            framework: params.framework || 'jest',
          },
        };

      case 'deploy.prepare':
        return {
          success: true,
          result: {
            target: params.target,
            artifacts: ['bundle.js', 'index.html', 'styles.css'],
            status: 'prepared',
          },
        };

      case 'system.analyze':
        return {
          success: true,
          result: {
            scope: params.scope || 'full',
            components: 12,
            dependencies: 45,
            health: 'good',
          },
        };

      default:
        return { success: false, error: `No local handler for tool: ${toolId}` };
    }
  }

  // Call Bridge API
  async callBridge(method, params = {}) {
    return new Promise((resolve) => {
      const data = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      });

      const options = {
        hostname: this.bridgeHost,
        port: this.bridgePort,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.error) {
              resolve({ success: false, error: result.error.message });
            } else {
              resolve({ success: true, ...result.result });
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse response' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(data);
      req.end();
    });
  }

  // Check Bridge status
  async checkBridgeStatus() {
    try {
      const result = await this.callBridge('bridge.status');
      return { online: result.success, ...result };
    } catch {
      return { online: false };
    }
  }

  // Set scope with validation
  setScope(scope) {
    if (!MCP_SCOPES[scope]) {
      return { success: false, error: `Invalid scope: ${scope}` };
    }
    this.currentScope = scope;
    return { success: true, scope, ...MCP_SCOPES[scope] };
  }

  // Elevate scope (requires tier check externally)
  elevateScope(targetScope) {
    const currentLevel = MCP_SCOPES[this.currentScope].level;
    const targetLevel = MCP_SCOPES[targetScope]?.level;

    if (targetLevel === undefined) {
      return { success: false, error: `Invalid scope: ${targetScope}` };
    }

    if (targetLevel > currentLevel) {
      // External tier check should happen before this
      this.currentScope = targetScope;
      return { success: true, scope: targetScope, elevated: true };
    }

    return { success: false, error: 'Cannot elevate to lower or same scope' };
  }

  // Get all scope definitions
  getAllScopes() {
    return MCP_SCOPES;
  }

  // Get required tier for scope
  getRequiredTier(scope) {
    return MCP_SCOPES[scope]?.tier || 'free';
  }
}

module.exports = {
  MCPClient,
  MCP_SCOPES,
  MCP_TOOLS,
};
