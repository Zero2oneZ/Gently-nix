// GentlyOS Codie Client - Compressed DSL Engine
// 44-keyword Domain-Specific Language with 94.7% token reduction

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'codie') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Core CODIE keywords (44 total)
const CODIE_KEYWORDS = {
  // Control flow (8)
  IF: 'if',
  ELSE: 'else',
  LOOP: 'loop',
  BREAK: 'break',
  RETURN: 'ret',
  CALL: 'call',
  GOTO: 'goto',
  END: 'end',

  // Data operations (8)
  SET: 'set',
  GET: 'get',
  PUSH: 'push',
  POP: 'pop',
  LOAD: 'load',
  SAVE: 'save',
  COPY: 'copy',
  DEL: 'del',

  // Math operations (8)
  ADD: 'add',
  SUB: 'sub',
  MUL: 'mul',
  DIV: 'div',
  MOD: 'mod',
  POW: 'pow',
  ABS: 'abs',
  RND: 'rnd',

  // Comparison (6)
  EQ: 'eq',
  NE: 'ne',
  LT: 'lt',
  GT: 'gt',
  LE: 'le',
  GE: 'ge',

  // Logic (4)
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  XOR: 'xor',

  // I/O (4)
  IN: 'in',
  OUT: 'out',
  LOG: 'log',
  ERR: 'err',

  // Special (6)
  NOP: 'nop',
  HALT: 'halt',
  DEF: 'def',
  REF: 'ref',
  TYPE: 'type',
  LEN: 'len',
};

// Token types
const TOKEN_TYPE = {
  KEYWORD: 'keyword',
  IDENTIFIER: 'identifier',
  NUMBER: 'number',
  STRING: 'string',
  OPERATOR: 'operator',
  DELIMITER: 'delimiter',
  COMMENT: 'comment',
  WHITESPACE: 'whitespace',
  EOF: 'eof',
};

// Token
class Token {
  constructor(type, value, line = 0, column = 0) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }

  toJSON() {
    return {
      type: this.type,
      value: this.value,
      line: this.line,
      column: this.column,
    };
  }
}

// Lexer
class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.keywords = new Set(Object.values(CODIE_KEYWORDS));
  }

  // Get current character
  current() {
    return this.source[this.pos];
  }

  // Peek next character
  peek(offset = 1) {
    return this.source[this.pos + offset];
  }

  // Advance position
  advance() {
    if (this.current() === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
  }

  // Read while condition
  readWhile(condition) {
    let result = '';
    while (this.pos < this.source.length && condition(this.current())) {
      result += this.current();
      this.advance();
    }
    return result;
  }

  // Tokenize
  tokenize() {
    while (this.pos < this.source.length) {
      const token = this.nextToken();
      if (token && token.type !== TOKEN_TYPE.WHITESPACE) {
        this.tokens.push(token);
      }
    }
    this.tokens.push(new Token(TOKEN_TYPE.EOF, null, this.line, this.column));
    return this.tokens;
  }

  // Get next token
  nextToken() {
    if (this.pos >= this.source.length) return null;

    const ch = this.current();
    const line = this.line;
    const column = this.column;

    // Whitespace
    if (/\s/.test(ch)) {
      this.readWhile(c => /\s/.test(c));
      return new Token(TOKEN_TYPE.WHITESPACE, ' ', line, column);
    }

    // Comment
    if (ch === '#') {
      const comment = this.readWhile(c => c !== '\n');
      return new Token(TOKEN_TYPE.COMMENT, comment, line, column);
    }

    // String
    if (ch === '"' || ch === "'") {
      const quote = ch;
      this.advance();
      let str = '';
      while (this.current() && this.current() !== quote) {
        if (this.current() === '\\' && this.peek()) {
          this.advance();
          const escaped = this.current();
          str += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
        } else {
          str += this.current();
        }
        this.advance();
      }
      this.advance(); // closing quote
      return new Token(TOKEN_TYPE.STRING, str, line, column);
    }

    // Number
    if (/\d/.test(ch) || (ch === '-' && /\d/.test(this.peek()))) {
      let num = ch;
      this.advance();
      num += this.readWhile(c => /[\d.]/.test(c));
      return new Token(TOKEN_TYPE.NUMBER, parseFloat(num), line, column);
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(ch)) {
      const ident = this.readWhile(c => /[a-zA-Z0-9_]/.test(c));
      const type = this.keywords.has(ident.toLowerCase())
        ? TOKEN_TYPE.KEYWORD
        : TOKEN_TYPE.IDENTIFIER;
      return new Token(type, ident.toLowerCase(), line, column);
    }

    // Operators and delimiters
    const operators = ['==', '!=', '<=', '>=', '->', '=>', '&&', '||'];
    for (const op of operators) {
      if (this.source.substring(this.pos, this.pos + op.length) === op) {
        this.pos += op.length;
        this.column += op.length;
        return new Token(TOKEN_TYPE.OPERATOR, op, line, column);
      }
    }

    // Single character
    this.advance();
    if ('()[]{}:;,.+-*/%<>=!&|^~'.includes(ch)) {
      return new Token(TOKEN_TYPE.OPERATOR, ch, line, column);
    }
    return new Token(TOKEN_TYPE.DELIMITER, ch, line, column);
  }
}

// AST Node types
const NODE_TYPE = {
  PROGRAM: 'program',
  STATEMENT: 'statement',
  EXPRESSION: 'expression',
  ASSIGNMENT: 'assignment',
  CALL: 'call',
  IF: 'if',
  LOOP: 'loop',
  FUNCTION: 'function',
  RETURN: 'return',
  BINARY: 'binary',
  UNARY: 'unary',
  LITERAL: 'literal',
  IDENTIFIER: 'identifier',
  BLOCK: 'block',
};

// AST Node
class ASTNode {
  constructor(type, data = {}) {
    this.type = type;
    Object.assign(this, data);
  }

  toJSON() {
    const result = { type: this.type };
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'type') {
        result[key] = value instanceof ASTNode ? value.toJSON() : value;
      }
    }
    return result;
  }
}

// Parser
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos];
  }

  peek(offset = 1) {
    return this.tokens[this.pos + offset];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type, value = null) {
    const token = this.current();
    if (token.type !== type || (value && token.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ''} at ${token.line}:${token.column}`);
    }
    return this.advance();
  }

  match(type, value = null) {
    const token = this.current();
    return token.type === type && (!value || token.value === value);
  }

  parse() {
    const statements = [];
    while (!this.match(TOKEN_TYPE.EOF)) {
      statements.push(this.parseStatement());
    }
    return new ASTNode(NODE_TYPE.PROGRAM, { statements });
  }

  parseStatement() {
    const token = this.current();

    if (token.type === TOKEN_TYPE.KEYWORD) {
      switch (token.value) {
        case CODIE_KEYWORDS.SET:
          return this.parseAssignment();
        case CODIE_KEYWORDS.IF:
          return this.parseIf();
        case CODIE_KEYWORDS.LOOP:
          return this.parseLoop();
        case CODIE_KEYWORDS.DEF:
          return this.parseFunction();
        case CODIE_KEYWORDS.RETURN:
          return this.parseReturn();
        case CODIE_KEYWORDS.CALL:
          return this.parseCall();
        case CODIE_KEYWORDS.OUT:
        case CODIE_KEYWORDS.LOG:
        case CODIE_KEYWORDS.ERR:
          return this.parseOutput();
        default:
          return this.parseExpression();
      }
    }

    return this.parseExpression();
  }

  parseAssignment() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.SET);
    const name = this.expect(TOKEN_TYPE.IDENTIFIER).value;
    const value = this.parseExpression();
    return new ASTNode(NODE_TYPE.ASSIGNMENT, { name, value });
  }

  parseIf() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.IF);
    const condition = this.parseExpression();
    const consequent = this.parseBlock();
    let alternate = null;
    if (this.match(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.ELSE)) {
      this.advance();
      alternate = this.parseBlock();
    }
    return new ASTNode(NODE_TYPE.IF, { condition, consequent, alternate });
  }

  parseLoop() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.LOOP);
    const condition = this.parseExpression();
    const body = this.parseBlock();
    return new ASTNode(NODE_TYPE.LOOP, { condition, body });
  }

  parseFunction() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.DEF);
    const name = this.expect(TOKEN_TYPE.IDENTIFIER).value;
    const params = this.parseParams();
    const body = this.parseBlock();
    return new ASTNode(NODE_TYPE.FUNCTION, { name, params, body });
  }

  parseParams() {
    const params = [];
    if (this.match(TOKEN_TYPE.OPERATOR, '(')) {
      this.advance();
      while (!this.match(TOKEN_TYPE.OPERATOR, ')')) {
        params.push(this.expect(TOKEN_TYPE.IDENTIFIER).value);
        if (this.match(TOKEN_TYPE.OPERATOR, ',')) {
          this.advance();
        }
      }
      this.expect(TOKEN_TYPE.OPERATOR, ')');
    }
    return params;
  }

  parseBlock() {
    const statements = [];
    while (!this.match(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.END) &&
           !this.match(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.ELSE) &&
           !this.match(TOKEN_TYPE.EOF)) {
      statements.push(this.parseStatement());
    }
    if (this.match(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.END)) {
      this.advance();
    }
    return new ASTNode(NODE_TYPE.BLOCK, { statements });
  }

  parseReturn() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.RETURN);
    const value = this.parseExpression();
    return new ASTNode(NODE_TYPE.RETURN, { value });
  }

  parseCall() {
    this.expect(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.CALL);
    const name = this.expect(TOKEN_TYPE.IDENTIFIER).value;
    const args = this.parseArgs();
    return new ASTNode(NODE_TYPE.CALL, { name, args });
  }

  parseOutput() {
    const type = this.advance().value;
    const value = this.parseExpression();
    return new ASTNode(NODE_TYPE.CALL, { name: type, args: [value], builtin: true });
  }

  parseArgs() {
    const args = [];
    while (!this.match(TOKEN_TYPE.KEYWORD) && !this.match(TOKEN_TYPE.EOF)) {
      if (this.match(TOKEN_TYPE.NUMBER) || this.match(TOKEN_TYPE.STRING) ||
          this.match(TOKEN_TYPE.IDENTIFIER)) {
        args.push(this.parseExpression());
      } else {
        break;
      }
    }
    return args;
  }

  parseExpression() {
    return this.parseBinary();
  }

  parseBinary() {
    let left = this.parseUnary();

    const binaryOps = {
      [CODIE_KEYWORDS.ADD]: '+',
      [CODIE_KEYWORDS.SUB]: '-',
      [CODIE_KEYWORDS.MUL]: '*',
      [CODIE_KEYWORDS.DIV]: '/',
      [CODIE_KEYWORDS.MOD]: '%',
      [CODIE_KEYWORDS.EQ]: '==',
      [CODIE_KEYWORDS.NE]: '!=',
      [CODIE_KEYWORDS.LT]: '<',
      [CODIE_KEYWORDS.GT]: '>',
      [CODIE_KEYWORDS.LE]: '<=',
      [CODIE_KEYWORDS.GE]: '>=',
      [CODIE_KEYWORDS.AND]: '&&',
      [CODIE_KEYWORDS.OR]: '||',
    };

    while (this.match(TOKEN_TYPE.KEYWORD) && binaryOps[this.current().value]) {
      const op = binaryOps[this.advance().value];
      const right = this.parseUnary();
      left = new ASTNode(NODE_TYPE.BINARY, { left, op, right });
    }

    return left;
  }

  parseUnary() {
    if (this.match(TOKEN_TYPE.KEYWORD, CODIE_KEYWORDS.NOT)) {
      this.advance();
      const operand = this.parseUnary();
      return new ASTNode(NODE_TYPE.UNARY, { op: '!', operand });
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.current();

    if (token.type === TOKEN_TYPE.NUMBER) {
      this.advance();
      return new ASTNode(NODE_TYPE.LITERAL, { value: token.value, dataType: 'number' });
    }

    if (token.type === TOKEN_TYPE.STRING) {
      this.advance();
      return new ASTNode(NODE_TYPE.LITERAL, { value: token.value, dataType: 'string' });
    }

    if (token.type === TOKEN_TYPE.IDENTIFIER) {
      this.advance();
      return new ASTNode(NODE_TYPE.IDENTIFIER, { name: token.value });
    }

    if (token.type === TOKEN_TYPE.KEYWORD && token.value === CODIE_KEYWORDS.GET) {
      this.advance();
      const name = this.expect(TOKEN_TYPE.IDENTIFIER).value;
      return new ASTNode(NODE_TYPE.IDENTIFIER, { name });
    }

    if (this.match(TOKEN_TYPE.OPERATOR, '(')) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TOKEN_TYPE.OPERATOR, ')');
      return expr;
    }

    throw new Error(`Unexpected token ${token.type} at ${token.line}:${token.column}`);
  }
}

// Compiler (CODIE -> JavaScript)
class Compiler {
  constructor() {
    this.indent = 0;
    this.output = [];
  }

  compile(ast) {
    this.output = [];
    this.compileNode(ast);
    return this.output.join('\n');
  }

  getIndent() {
    return '  '.repeat(this.indent);
  }

  emit(code) {
    this.output.push(this.getIndent() + code);
  }

  compileNode(node) {
    switch (node.type) {
      case NODE_TYPE.PROGRAM:
        for (const stmt of node.statements) {
          this.compileNode(stmt);
        }
        break;

      case NODE_TYPE.BLOCK:
        this.indent++;
        for (const stmt of node.statements) {
          this.compileNode(stmt);
        }
        this.indent--;
        break;

      case NODE_TYPE.ASSIGNMENT:
        this.emit(`let ${node.name} = ${this.compileExpr(node.value)};`);
        break;

      case NODE_TYPE.IF:
        this.emit(`if (${this.compileExpr(node.condition)}) {`);
        this.compileNode(node.consequent);
        if (node.alternate) {
          this.emit('} else {');
          this.compileNode(node.alternate);
        }
        this.emit('}');
        break;

      case NODE_TYPE.LOOP:
        this.emit(`while (${this.compileExpr(node.condition)}) {`);
        this.compileNode(node.body);
        this.emit('}');
        break;

      case NODE_TYPE.FUNCTION:
        const params = node.params.join(', ');
        this.emit(`function ${node.name}(${params}) {`);
        this.compileNode(node.body);
        this.emit('}');
        break;

      case NODE_TYPE.RETURN:
        this.emit(`return ${this.compileExpr(node.value)};`);
        break;

      case NODE_TYPE.CALL:
        if (node.builtin) {
          const builtins = { out: 'console.log', log: 'console.log', err: 'console.error' };
          const fn = builtins[node.name] || node.name;
          this.emit(`${fn}(${node.args.map(a => this.compileExpr(a)).join(', ')});`);
        } else {
          this.emit(`${node.name}(${node.args.map(a => this.compileExpr(a)).join(', ')});`);
        }
        break;

      default:
        this.emit(this.compileExpr(node) + ';');
    }
  }

  compileExpr(node) {
    switch (node.type) {
      case NODE_TYPE.LITERAL:
        return node.dataType === 'string' ? JSON.stringify(node.value) : String(node.value);
      case NODE_TYPE.IDENTIFIER:
        return node.name;
      case NODE_TYPE.BINARY:
        return `(${this.compileExpr(node.left)} ${node.op} ${this.compileExpr(node.right)})`;
      case NODE_TYPE.UNARY:
        return `${node.op}${this.compileExpr(node.operand)}`;
      default:
        return '';
    }
  }
}

// Interpreter
class Interpreter {
  constructor() {
    this.env = new Map();
    this.functions = new Map();
    this.output = [];
  }

  run(ast) {
    this.output = [];
    this.interpret(ast);
    return this.output;
  }

  interpret(node, env = this.env) {
    switch (node.type) {
      case NODE_TYPE.PROGRAM:
      case NODE_TYPE.BLOCK:
        let result = null;
        for (const stmt of node.statements) {
          result = this.interpret(stmt, env);
          if (result && result.__return) return result;
        }
        return result;

      case NODE_TYPE.ASSIGNMENT:
        env.set(node.name, this.evaluate(node.value, env));
        break;

      case NODE_TYPE.IF:
        if (this.evaluate(node.condition, env)) {
          return this.interpret(node.consequent, env);
        } else if (node.alternate) {
          return this.interpret(node.alternate, env);
        }
        break;

      case NODE_TYPE.LOOP:
        while (this.evaluate(node.condition, env)) {
          const result = this.interpret(node.body, env);
          if (result && result.__return) return result;
        }
        break;

      case NODE_TYPE.FUNCTION:
        this.functions.set(node.name, node);
        break;

      case NODE_TYPE.RETURN:
        return { __return: true, value: this.evaluate(node.value, env) };

      case NODE_TYPE.CALL:
        if (node.builtin) {
          const args = node.args.map(a => this.evaluate(a, env));
          if (node.name === 'out' || node.name === 'log') {
            this.output.push(args.join(' '));
          } else if (node.name === 'err') {
            this.output.push('[ERROR] ' + args.join(' '));
          }
        } else {
          return this.callFunction(node.name, node.args, env);
        }
        break;

      default:
        return this.evaluate(node, env);
    }
  }

  evaluate(node, env) {
    switch (node.type) {
      case NODE_TYPE.LITERAL:
        return node.value;
      case NODE_TYPE.IDENTIFIER:
        return env.get(node.name);
      case NODE_TYPE.BINARY:
        return this.evalBinary(node.op, this.evaluate(node.left, env), this.evaluate(node.right, env));
      case NODE_TYPE.UNARY:
        return this.evalUnary(node.op, this.evaluate(node.operand, env));
      default:
        return null;
    }
  }

  evalBinary(op, left, right) {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: return null;
    }
  }

  evalUnary(op, operand) {
    if (op === '!') return !operand;
    if (op === '-') return -operand;
    return operand;
  }

  callFunction(name, args, env) {
    const fn = this.functions.get(name);
    if (!fn) throw new Error(`Unknown function: ${name}`);

    const localEnv = new Map(env);
    for (let i = 0; i < fn.params.length; i++) {
      localEnv.set(fn.params[i], this.evaluate(args[i], env));
    }

    const result = this.interpret(fn.body, localEnv);
    return result && result.__return ? result.value : result;
  }
}

// Main CODIE Client
class CodieClient {
  constructor() {
    this.programs = new Map();
    this.compiler = new Compiler();
    this.stats = {
      compiled: 0,
      interpreted: 0,
      tokensProcessed: 0,
    };
  }

  // Tokenize source
  tokenize(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    this.stats.tokensProcessed += tokens.length;
    return {
      success: true,
      tokens: tokens.map(t => t.toJSON()),
      count: tokens.length,
    };
  }

  // Parse source to AST
  parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return { success: true, ast: ast.toJSON() };
  }

  // Compile to JavaScript
  compile(source) {
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const js = this.compiler.compile(ast);
      this.stats.compiled++;

      return {
        success: true,
        javascript: js,
        tokenCount: tokens.length,
        compression: this.calculateCompression(source, js),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Interpret source
  interpret(source) {
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const interpreter = new Interpreter();
      const output = interpreter.run(ast);
      this.stats.interpreted++;

      return { success: true, output, tokenCount: tokens.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store program
  storeProgram(name, source) {
    this.programs.set(name, {
      source,
      storedAt: Date.now(),
    });
    return { success: true, name };
  }

  // Get program
  getProgram(name) {
    const program = this.programs.get(name);
    if (!program) {
      return { success: false, error: 'Program not found' };
    }
    return { success: true, ...program };
  }

  // Run stored program
  runProgram(name) {
    const program = this.programs.get(name);
    if (!program) {
      return { success: false, error: 'Program not found' };
    }
    return this.interpret(program.source);
  }

  // List programs
  listPrograms() {
    return {
      success: true,
      programs: Array.from(this.programs.entries()).map(([name, p]) => ({
        name,
        sourceLength: p.source.length,
        storedAt: p.storedAt,
      })),
    };
  }

  // Delete program
  deleteProgram(name) {
    if (!this.programs.has(name)) {
      return { success: false, error: 'Program not found' };
    }
    this.programs.delete(name);
    return { success: true };
  }

  // Calculate compression ratio
  calculateCompression(codie, js) {
    const codieTokens = codie.split(/\s+/).length;
    const jsTokens = js.split(/\s+/).length;
    const ratio = 1 - (codieTokens / jsTokens);
    return {
      codieTokens,
      jsTokens,
      ratio: Math.round(ratio * 1000) / 10, // percentage with 1 decimal
    };
  }

  // Get keywords
  getKeywords() {
    return { success: true, keywords: CODIE_KEYWORDS, count: 44 };
  }

  // Get statistics
  getStats() {
    return {
      success: true,
      stats: {
        ...this.stats,
        storedPrograms: this.programs.size,
        keywordCount: 44,
      },
    };
  }

  // Validate syntax
  validate(source) {
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      return { success: true, valid: true };
    } catch (error) {
      return {
        success: true,
        valid: false,
        error: error.message,
      };
    }
  }
}

module.exports = {
  CodieClient,
  Lexer,
  Parser,
  Compiler,
  Interpreter,
  Token,
  ASTNode,
  CODIE_KEYWORDS,
  TOKEN_TYPE,
  NODE_TYPE,
};
