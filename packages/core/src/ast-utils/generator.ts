/**
 * AST Code Generator
 * Converts hyperscript AST nodes back to hyperscript source code.
 *
 * Extracted from @lokascript/ast-toolkit during consolidation.
 */

import type { ASTNode, GeneratorOptions, GeneratorResult } from './types.js';

export type { GeneratorOptions, GeneratorResult };

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
  const code = generateNode(ast, opts);
  countNodes(ast, () => nodeCount++);
  return { code, nodeCount };
}

function generateNode(node: ASTNode, opts: GeneratorOptions): string {
  if (!node || typeof node !== 'object') return '';

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
      return generateSelector(node);
    case 'literal':
      return generateLiteral(node);
    case 'identifier':
      return generateIdentifier(node);
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
      return generateFallback(node);
  }
}

function generateProgram(node: ASTNode, opts: GeneratorOptions): string {
  const features = (node as any).features || [];
  const separator = opts.minify ? ' ' : '\n\n';
  return features
    .map((f: ASTNode) => generateNode(f, opts))
    .filter(Boolean)
    .join(separator);
}

function generateEventHandler(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['on'];
  if (data.events && data.events.length > 1) {
    parts.push(data.events.join(' or '));
  } else {
    parts.push(data.event || 'click');
  }
  if (data.selector && data.selector !== 'me') parts.push('from', data.selector);
  if (data.condition) parts.push(`[${generateNode(data.condition, opts)}]`);

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
  const params = data.parameters || [];
  parts.push(
    params.length > 0 ? `${data.name || 'unnamed'}(${params.join(', ')})` : data.name || 'unnamed'
  );

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
  const params = data.parameters || data.params || [];
  parts.push(
    params.length > 0 ? `${data.name || 'unnamed'}(${params.join(', ')})` : data.name || 'unnamed'
  );

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

export function generateCommand(node: ASTNode, opts: GeneratorOptions = {}): string {
  const data = node as any;
  const parts: string[] = [data.name || 'unknown'];
  const args = data.args || [];
  for (const arg of args) parts.push(generateNode(arg, opts));
  if (data.modifiers) {
    for (const [key, value] of Object.entries(data.modifiers)) {
      if (value) parts.push(key, generateNode(value as ASTNode, opts));
    }
  }
  if (data.target) {
    parts.push(getTargetPreposition(data.name), generateNode(data.target, opts));
  }
  if (data.implicitTarget) parts.push(generateNode(data.implicitTarget, opts));
  return parts.join(' ');
}

function generateConditional(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const parts: string[] = ['if'];
  if (data.condition) parts.push(generateNode(data.condition, opts));
  parts.push('then');
  if (data.then) parts.push(generateNode(data.then, opts));
  if (data.else) parts.push('else', generateNode(data.else, opts));
  parts.push('end');
  return parts.join(' ');
}

function generateReturnStatement(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return data.argument ? `return ${generateNode(data.argument, opts)}` : 'return';
}

export function generateExpression(node: ASTNode, opts: GeneratorOptions = {}): string {
  return generateNode(node, opts);
}

function generateSelector(node: ASTNode): string {
  return (node as any).value || '';
}

function generateLiteral(node: ASTNode): string {
  const value = (node as any).value;
  if (typeof value === 'string') return `'${escapeString(value)}'`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
}

function generateIdentifier(node: ASTNode): string {
  return (node as any).name || '';
}

function generateBinaryExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return `${generateNode(data.left, opts)} ${data.operator || '+'} ${generateNode(data.right, opts)}`;
}

function generateLogicalExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return `${generateNode(data.left, opts)} ${data.operator || 'and'} ${generateNode(data.right, opts)}`;
}

function generateUnaryExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const argument = generateNode(data.argument, opts);
  const operator = data.operator || 'not';
  return data.prefix !== false ? `${operator} ${argument}` : `${argument} ${operator}`;
}

function generateMemberExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const object = data.object ? generateNode(data.object, opts) : '';
  const property = data.property ? generateNode(data.property, opts) : '';
  if (data.computed) return `${object}[${property}]`;
  return object ? `${object}.${property}` : property;
}

function generatePossessiveExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  return `${generateNode(data.object, opts)}'s ${generateNode(data.property, opts)}`;
}

function generateCallExpression(node: ASTNode, opts: GeneratorOptions): string {
  const data = node as any;
  const callee = data.callee ? generateNode(data.callee, opts) : 'call';
  const args = (data.arguments || data.args || [])
    .map((arg: ASTNode) => generateNode(arg, opts))
    .join(', ');
  return `${callee}(${args})`;
}

function generateFallback(node: ASTNode): string {
  const data = node as any;
  if (data.value !== undefined) return String(data.value);
  if (data.name) return data.name;
  return '';
}

function indent(opts: GeneratorOptions): string {
  if (opts.minify) return '';
  return (opts.indentation || '  ').repeat(opts._indentLevel || 0);
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
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && item.type) countNodes(item, callback);
      }
    } else if (value && typeof value === 'object' && (value as any).type) {
      countNodes(value as ASTNode, callback);
    }
  }
}

export function minify(ast: ASTNode): string {
  return generate(ast, { minify: true });
}

export function format(ast: ASTNode, indentation: string = '  '): string {
  return generate(ast, { minify: false, indentation });
}
