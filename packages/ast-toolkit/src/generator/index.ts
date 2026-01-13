/**
 * AST Code Generator
 * Converts hyperscript AST nodes back to hyperscript source code
 */

import type { ASTNode } from '../types.js';

// ============================================================================
// Generator Options & Types
// ============================================================================

export interface GeneratorOptions {
  /** Minimize output (no extra whitespace) */
  minify?: boolean;
  /** Indentation string (default: '  ') */
  indentation?: string;
  /** Use node.raw when available for exact preservation */
  preserveRaw?: boolean;
  /** Current indentation level (internal) */
  _indentLevel?: number;
}

export interface GeneratorResult {
  code: string;
  /** Number of nodes processed */
  nodeCount: number;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate hyperscript source code from an AST
 */
export function generate(ast: ASTNode, options: GeneratorOptions = {}): string {
  const opts: GeneratorOptions = {
    minify: false,
    indentation: '  ',
    preserveRaw: true,
    _indentLevel: 0,
    ...options,
  };

  return generateNode(ast, opts);
}

/**
 * Generate with result metadata
 */
export function generateWithMetadata(
  ast: ASTNode,
  options: GeneratorOptions = {}
): GeneratorResult {
  let nodeCount = 0;
  const opts: GeneratorOptions = {
    minify: false,
    indentation: '  ',
    preserveRaw: true,
    _indentLevel: 0,
    ...options,
  };

  const countingOpts = { ...opts };
  const code = generateNode(ast, countingOpts);

  // Count nodes
  countNodes(ast, () => nodeCount++);

  return { code, nodeCount };
}

// ============================================================================
// Node Type Generators
// ============================================================================

function generateNode(node: ASTNode, opts: GeneratorOptions): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  // Use raw if available and preserveRaw is enabled
  if (opts.preserveRaw && (node as any).raw && typeof (node as any).raw === 'string') {
    return (node as any).raw;
  }

  switch (node.type) {
    case 'program':
      return generateProgram(node, opts);
    case 'eventHandler':
      return generateEventHandler(node, opts);
    case 'command':
      return generateCommand(node, opts);
    case 'conditional':
      return generateConditional(node, opts);
    case 'behavior':
      return generateBehavior(node, opts);
    case 'function':
    case 'def':
      return generateFunction(node, opts);
    case 'selector':
      return generateSelector(node, opts);
    case 'literal':
      return generateLiteral(node, opts);
    case 'identifier':
      return generateIdentifier(node, opts);
    case 'binaryExpression':
      return generateBinaryExpression(node, opts);
    case 'logicalExpression':
      return generateLogicalExpression(node, opts);
    case 'unaryExpression':
      return generateUnaryExpression(node, opts);
    case 'memberExpression':
      return generateMemberExpression(node, opts);
    case 'possessiveExpression':
      return generatePossessiveExpression(node, opts);
    case 'callExpression':
      return generateCallExpression(node, opts);
    case 'returnStatement':
      return generateReturnStatement(node, opts);
    default:
      // Fallback: try to generate something sensible
      return generateFallback(node, opts);
  }
}

// ============================================================================
// Top-Level Structures
// ============================================================================

function generateProgram(node: ASTNode, opts: GeneratorOptions): string {
  const features = (node as any).features || [];
  const separator = opts.minify ? ' ' : '\n\n';

  return features
    .map((feature: ASTNode) => generateNode(feature, opts))
    .filter(Boolean)
    .join(separator);
}

function generateEventHandler(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['on'];

  // Event name(s)
  if (data.events && data.events.length > 1) {
    parts.push(data.events.join(' or '));
  } else {
    parts.push(data.event || 'click');
  }

  // Event source (from selector)
  if (data.selector && data.selector !== 'me') {
    parts.push('from', data.selector);
  }

  // Event condition [condition]
  if (data.condition) {
    parts.push(`[${generateNode(data.condition, opts)}]`);
  }

  // Commands
  const commands = data.commands || [];
  if (commands.length > 0) {
    const cmdSeparator = opts.minify ? ' then ' : '\n' + indent(opts);
    const commandsStr = commands
      .map((cmd: ASTNode) =>
        generateNode(cmd, { ...opts, _indentLevel: (opts._indentLevel || 0) + 1 })
      )
      .join(cmdSeparator);

    if (opts.minify) {
      parts.push(commandsStr);
    } else {
      parts.push('\n' + indent(opts) + commandsStr);
    }
  }

  return parts.join(' ');
}

function generateBehavior(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['behavior'];

  // Name and parameters
  const params = data.parameters || [];
  if (params.length > 0) {
    parts.push(`${data.name || 'unnamed'}(${params.join(', ')})`);
  } else {
    parts.push(data.name || 'unnamed');
  }

  // Body (event handlers)
  const body = data.body || data.eventHandlers || [];
  if (body.length > 0) {
    const bodyStr = body
      .map((item: ASTNode) =>
        generateNode(item, { ...opts, _indentLevel: (opts._indentLevel || 0) + 1 })
      )
      .join(opts.minify ? ' ' : '\n' + indent(opts));

    if (opts.minify) {
      parts.push(bodyStr, 'end');
    } else {
      parts.push('\n' + indent(opts) + bodyStr + '\n' + 'end');
    }
  } else {
    parts.push('end');
  }

  return parts.join(' ');
}

function generateFunction(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['def'];

  // Name and parameters
  const params = data.parameters || data.params || [];
  if (params.length > 0) {
    parts.push(`${data.name || 'unnamed'}(${params.join(', ')})`);
  } else {
    parts.push(data.name || 'unnamed');
  }

  // Body
  if (data.body) {
    const bodyStr = generateNode(data.body, {
      ...opts,
      _indentLevel: (opts._indentLevel || 0) + 1,
    });
    if (opts.minify) {
      parts.push(bodyStr, 'end');
    } else {
      parts.push('\n' + indent(opts) + bodyStr + '\n' + 'end');
    }
  } else {
    parts.push('end');
  }

  return parts.join(' ');
}

// ============================================================================
// Commands & Control Flow
// ============================================================================

/**
 * Generate a command node
 */
export function generateCommand(node: ASTNode, opts: GeneratorOptions = {}): string {
  const data = node as any;
  const parts: string[] = [data.name || 'unknown'];

  // Arguments
  const args = data.args || [];
  for (const arg of args) {
    parts.push(generateNode(arg, opts));
  }

  // Modifiers (to, into, from, etc.)
  if (data.modifiers) {
    for (const [key, value] of Object.entries(data.modifiers)) {
      if (value) {
        parts.push(key, generateNode(value as ASTNode, opts));
      }
    }
  }

  // Explicit target
  if (data.target) {
    const targetStr = generateNode(data.target, opts);
    // Determine the right preposition based on command
    const preposition = getTargetPreposition(data.name);
    parts.push(preposition, targetStr);
  }

  // Implicit target
  if (data.implicitTarget) {
    parts.push(generateNode(data.implicitTarget, opts));
  }

  return parts.join(' ');
}

function generateConditional(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['if'];

  // Condition
  if (data.condition) {
    parts.push(generateNode(data.condition, opts));
  }

  // Then branch
  parts.push('then');
  if (data.then) {
    parts.push(generateNode(data.then, opts));
  }

  // Else branch
  if (data.else) {
    parts.push('else', generateNode(data.else, opts));
  }

  parts.push('end');

  return parts.join(' ');
}

function generateReturnStatement(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  if (data.argument) {
    return `return ${generateNode(data.argument, opts)}`;
  }
  return 'return';
}

// ============================================================================
// Expressions
// ============================================================================

/**
 * Generate an expression node
 */
export function generateExpression(node: ASTNode, opts: GeneratorOptions = {}): string {
  return generateNode(node, opts);
}

function generateSelector(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return data.value || '';
}

function generateLiteral(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const value = data.value;

  if (typeof value === 'string') {
    // Use single quotes for strings
    return `'${escapeString(value)}'`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  return String(value);
}

function generateIdentifier(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return data.name || '';
}

function generateBinaryExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const left = generateNode(data.left, opts);
  const right = generateNode(data.right, opts);
  const operator = data.operator || '+';

  return `${left} ${operator} ${right}`;
}

function generateLogicalExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const left = generateNode(data.left, opts);
  const right = generateNode(data.right, opts);
  const operator = data.operator || 'and';

  return `${left} ${operator} ${right}`;
}

function generateUnaryExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const argument = generateNode(data.argument, opts);
  const operator = data.operator || 'not';

  if (data.prefix !== false) {
    return `${operator} ${argument}`;
  }
  return `${argument} ${operator}`;
}

function generateMemberExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const object = data.object ? generateNode(data.object, opts) : '';
  const property = data.property ? generateNode(data.property, opts) : '';

  if (data.computed) {
    return `${object}[${property}]`;
  }
  return object ? `${object}.${property}` : property;
}

function generatePossessiveExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const object = generateNode(data.object, opts);
  const property = generateNode(data.property, opts);

  return `${object}'s ${property}`;
}

function generateCallExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const callee = data.callee ? generateNode(data.callee, opts) : 'call';
  const args = (data.arguments || data.args || [])
    .map((arg: ASTNode) => generateNode(arg, opts))
    .join(', ');

  return `${callee}(${args})`;
}

// ============================================================================
// Helpers
// ============================================================================

function generateFallback(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;

  // Try common patterns
  if (data.value !== undefined) {
    return String(data.value);
  }
  if (data.name) {
    return data.name;
  }

  return '';
}

function indent(opts: GeneratorOptions): string {
  if (opts.minify) return '';
  const level = opts._indentLevel || 0;
  return (opts.indentation || '  ').repeat(level);
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function getTargetPreposition(commandName: string): string {
  switch (commandName) {
    case 'put':
      return 'into';
    case 'add':
    case 'remove':
      return 'from';
    case 'toggle':
    case 'set':
      return 'on';
    default:
      return 'to';
  }
}

function countNodes(node: ASTNode, callback: () => void): void {
  if (!node || typeof node !== 'object') return;

  callback();

  // Traverse child nodes
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && item.type) {
          countNodes(item, callback);
        }
      }
    } else if (value && typeof value === 'object' && (value as any).type) {
      countNodes(value as ASTNode, callback);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate code with minification
 */
export function minify(ast: ASTNode): string {
  return generate(ast, { minify: true });
}

/**
 * Generate formatted code
 */
export function format(ast: ASTNode, indentation: string = '  '): string {
  return generate(ast, { minify: false, indentation });
}
