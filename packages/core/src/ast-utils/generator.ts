/**
 * AST Code Generator
 * Converts hyperscript AST nodes back to hyperscript source code.
 *
 * Extracted from @lokascript/ast-toolkit during consolidation.
 */

import type { ASTNode, GeneratorOptions, GeneratorResult } from './types.js';

export type { GeneratorOptions, GeneratorResult };

/**
 * What the generator actually accepts: any object, `type` or not.
 *
 * Deliberately WIDER than {@link ASTNode}. The old code's only gate was
 * `typeof node !== 'object'`, so an object with no `type` reached
 * `generateFallback` and rendered its `value`/`name` — and
 * `generator.test.ts` pins that ("should handle node without type"). A guard
 * that demanded a string `type` here was the one behaviour change the Arc 2
 * step 4 retype introduced, and that test caught it.
 */
type Nodeish = { readonly [key: string]: unknown };

function isObject(value: unknown): value is Nodeish {
  return value !== null && typeof value === 'object';
}

/** `value` as an array of whatever it holds, or `[]` — the `x || []` of the old code. */
function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

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

/**
 * Takes `unknown` on purpose. Every caller below hands it a field read off a
 * node (`node.condition`, `node.then`, an `args` element), and the old code's
 * first line already rejected anything that was not an object — so the wide
 * parameter is the honest one, and {@link isObject} is that same check with a
 * type attached.
 */
function generateNode(node: unknown, opts: GeneratorOptions): string {
  if (!isObject(node)) return '';

  if (opts.preserveRaw && typeof node.raw === 'string' && node.raw) {
    return node.raw;
  }

  switch (node.type) {
    case 'program':
      return generateProgram(node, opts);
    case 'eventHandler':
      return generateEventHandler(node, opts);
    case 'command':
      return emitCommand(node, opts);
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

function generateProgram(node: Nodeish, opts: GeneratorOptions): string {
  const features = listOf(node.features);
  const separator = opts.minify ? ' ' : '\n\n';
  return features
    .map(f => generateNode(f, opts))
    .filter(Boolean)
    .join(separator);
}

function generateEventHandler(node: Nodeish, opts: GeneratorOptions): string {
  const parts: string[] = ['on'];
  const events = node.events;
  if (Array.isArray(events) && events.length > 1) {
    parts.push(events.join(' or '));
  } else {
    parts.push(String(node.event || 'click'));
  }
  if (node.selector && node.selector !== 'me') parts.push('from', String(node.selector));
  if (node.condition) parts.push(`[${generateNode(node.condition, opts)}]`);

  const commands = listOf(node.commands);
  if (commands.length > 0) {
    const cmdSeparator = opts.minify ? ' then ' : '\n' + indent(opts);
    const commandsStr = commands
      .map(cmd => generateNode(cmd, { ...opts, _indentLevel: (opts._indentLevel || 0) + 1 }))
      .join(cmdSeparator);
    if (opts.minify) {
      parts.push(commandsStr);
    } else {
      parts.push('\n' + indent(opts) + commandsStr);
    }
  }
  return parts.join(' ');
}

function generateBehavior(node: Nodeish, opts: GeneratorOptions): string {
  const parts: string[] = ['behavior'];
  const params = listOf(node.parameters);
  const name = String(node.name || 'unnamed');
  parts.push(params.length > 0 ? `${name}(${params.join(', ')})` : name);

  const body = listOf(node.body || node.eventHandlers);
  if (body.length > 0) {
    const bodyStr = body
      .map(item => generateNode(item, { ...opts, _indentLevel: (opts._indentLevel || 0) + 1 }))
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

function generateFunction(node: Nodeish, opts: GeneratorOptions): string {
  const parts: string[] = ['def'];
  const params = listOf(node.parameters || node.params);
  const name = String(node.name || 'unnamed');
  parts.push(params.length > 0 ? `${name}(${params.join(', ')})` : name);

  if (node.body) {
    const bodyStr = generateNode(node.body, {
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

/** Public entry keeps the {@link ASTNode} signature; the switch above calls the wide form. */
export function generateCommand(node: ASTNode, opts: GeneratorOptions = {}): string {
  return emitCommand(node, opts);
}

function emitCommand(node: Nodeish, opts: GeneratorOptions): string {
  const name = String(node.name || 'unknown');
  const parts: string[] = [name];
  for (const arg of listOf(node.args)) parts.push(generateNode(arg, opts));
  const modifiers = node.modifiers;
  if (isObject(modifiers)) {
    for (const [key, value] of Object.entries(modifiers)) {
      if (value) parts.push(key, generateNode(value, opts));
    }
  }
  if (node.target) {
    parts.push(getTargetPreposition(name), generateNode(node.target, opts));
  }
  if (node.implicitTarget) parts.push(generateNode(node.implicitTarget, opts));
  return parts.join(' ');
}

function generateConditional(node: Nodeish, opts: GeneratorOptions): string {
  const parts: string[] = ['if'];
  if (node.condition) parts.push(generateNode(node.condition, opts));
  parts.push('then');
  if (node.then) parts.push(generateNode(node.then, opts));
  if (node.else) parts.push('else', generateNode(node.else, opts));
  parts.push('end');
  return parts.join(' ');
}

function generateReturnStatement(node: Nodeish, opts: GeneratorOptions): string {
  return node.argument ? `return ${generateNode(node.argument, opts)}` : 'return';
}

export function generateExpression(node: ASTNode, opts: GeneratorOptions = {}): string {
  return generateNode(node, opts);
}

function generateSelector(node: Nodeish): string {
  return String(node.value || '');
}

function generateLiteral(node: Nodeish): string {
  const value = node.value;
  if (typeof value === 'string') return `'${escapeString(value)}'`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
}

function generateIdentifier(node: Nodeish): string {
  return String(node.name || '');
}

function generateBinaryExpression(node: Nodeish, opts: GeneratorOptions): string {
  return `${generateNode(node.left, opts)} ${node.operator || '+'} ${generateNode(node.right, opts)}`;
}

function generateLogicalExpression(node: Nodeish, opts: GeneratorOptions): string {
  return `${generateNode(node.left, opts)} ${node.operator || 'and'} ${generateNode(node.right, opts)}`;
}

function generateUnaryExpression(node: Nodeish, opts: GeneratorOptions): string {
  const argument = generateNode(node.argument, opts);
  const operator = node.operator || 'not';
  return node.prefix !== false ? `${operator} ${argument}` : `${argument} ${operator}`;
}

function generateMemberExpression(node: Nodeish, opts: GeneratorOptions): string {
  const object = node.object ? generateNode(node.object, opts) : '';
  const property = node.property ? generateNode(node.property, opts) : '';
  if (node.computed) return `${object}[${property}]`;
  return object ? `${object}.${property}` : property;
}

function generatePossessiveExpression(node: Nodeish, opts: GeneratorOptions): string {
  return `${generateNode(node.object, opts)}'s ${generateNode(node.property, opts)}`;
}

function generateCallExpression(node: Nodeish, opts: GeneratorOptions): string {
  const callee = node.callee ? generateNode(node.callee, opts) : 'call';
  const args = listOf(node.arguments || node.args)
    .map(arg => generateNode(arg, opts))
    .join(', ');
  return `${callee}(${args})`;
}

function generateFallback(node: Nodeish): string {
  if (node.value !== undefined) return String(node.value);
  if (node.name) return String(node.name);
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

/**
 * The ROOT is counted whether or not it has a `type`; CHILDREN are counted only
 * when they carry a truthy one. Asymmetric, and preserved exactly — it is what
 * the untyped version did.
 */
function countNodes(node: unknown, callback: () => void): void {
  if (!isObject(node)) return;
  callback();
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value as unknown[]) {
        if (isObject(item) && item.type) countNodes(item, callback);
      }
    } else if (isObject(value) && value.type) {
      countNodes(value, callback);
    }
  }
}

export function minify(ast: ASTNode): string {
  return generate(ast, { minify: true });
}

export function format(ast: ASTNode, indentation: string = '  '): string {
  return generate(ast, { minify: false, indentation });
}
