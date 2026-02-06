// GentlyOS CLI Bridge - Spawn gently CLI commands from Electron
// Provides async interface to the GentlyOS command-line tools

const { spawn } = require('child_process');
const path = require('path');

// Default timeout for CLI commands (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Invoke a gently CLI command
function invokeGently(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const cwd = options.cwd || process.env.HOME;

    const proc = spawn('gently', [command, ...args], {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;

      if (code === 0) {
        // Try to parse as JSON if it looks like JSON
        const trimmed = stdout.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            resolve(JSON.parse(trimmed));
          } catch {
            resolve(trimmed);
          }
        } else {
          resolve(trimmed);
        }
      } else {
        reject(new Error(stderr || `gently ${command} exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn gently: ${err.message}`));
    });
  });
}

// Streaming version for long-running commands
function invokeGentlyStream(command, args = [], options = {}) {
  const cwd = options.cwd || process.env.HOME;

  const proc = spawn('gently', [command, ...args], {
    cwd,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return {
    process: proc,
    stdout: proc.stdout,
    stderr: proc.stderr,
    stdin: proc.stdin,
    kill: () => proc.kill('SIGTERM'),
  };
}

// Pre-defined CLI commands
const CLI = {
  // Feed commands
  feedShow: (opts = {}) => {
    const args = ['show'];
    if (opts.json) args.push('--json');
    if (opts.limit) args.push('--limit', opts.limit.toString());
    return invokeGently('feed', args);
  },
  feedFork: (id) => invokeGently('feed', ['fork', id]),
  feedPost: (content) => invokeGently('feed', ['post', content]),

  // Search commands
  search: (query, opts = {}) => {
    const args = ['query', query];
    if (opts.json) args.push('--json');
    if (opts.limit) args.push('--limit', opts.limit.toString());
    return invokeGently('search', args);
  },

  // Doc commands
  docNew: (name, docType) => invokeGently('doc', ['new', name, '--type', docType]),
  docStep: (docId, content) => invokeGently('doc', ['step', docId, content]),
  docList: () => invokeGently('doc', ['list', '--json']),

  // G.E.D. commands
  gedTranslate: (text, mode) => invokeGently('ged', ['translate', text, '--mode', mode]),

  // MCP commands
  mcpServe: (opts = {}) => {
    const args = ['serve'];
    if (opts.port) args.push('--port', opts.port.toString());
    return invokeGentlyStream('mcp', args, opts);
  },
  mcpTools: () => invokeGently('mcp', ['tools', '--json']),

  // Status/info commands
  version: () => invokeGently('version'),
  status: () => invokeGently('status', ['--json']),

  // GOO commands
  gooSample: (count = 10) => invokeGently('goo', ['sample', '--count', count.toString(), '--json']),
};

module.exports = {
  invokeGently,
  invokeGentlyStream,
  CLI,
  DEFAULT_TIMEOUT,
};
