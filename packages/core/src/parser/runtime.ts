/**
 * Hyperscript Runtime Expression Evaluator
 * Connects AST parser with Phase 3 expression evaluation system
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import { getRegisteredNodeEvaluator, notifyGlobalRead } from './extensions';
// Re-export setGlobal for backward-compatible access via the runtime module.
export { setGlobal } from './extensions';

// Import Phase 3 expression system
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { conversionExpressions } from '../expressions/conversion/index';
import { positionalExpressions } from '../expressions/positional/index';
import { propertiesExpressions } from '../expressions/properties/index';
import { specialExpressions as importedSpecialExpressions } from '../expressions/special/index';
import { mathematicalExpressions } from '../expressions/mathematical/index';
import { isElement, getElementProperty } from '../expressions/property-access-utils';
import {
  evaluateWhere,
  evaluateSortedBy,
  evaluateMappedTo,
  evaluateSplitBy,
  evaluateJoinedBy,
} from '../expressions/collection/index';
import { parse } from './parser';

// Create alias for backward compatibility - combine special and mathematical expressions
const specialExpressions = {
  ...importedSpecialExpressions,
  ...mathematicalExpressions,
};

/**
 * Helper to extract value from TypedResult objects
 * Mathematical expressions return { success: true, value: X } format
 */
async function extractValue(result: any): Promise<any> {
  // If it's a Promise, await it first
  if (result && typeof result.then === 'function') {
    result = await result;
  }

  // If it's a TypedResult object, extract the value
  if (result && typeof result === 'object' && 'success' in result && 'value' in result) {
    if (result.success) {
      return result.value;
    } else {
      // If the result failed, throw an error
      const errors = result.errors || [];
      const errorMessage = errors.length > 0 ? errors[0].message : 'Expression evaluation failed';
      throw new Error(errorMessage);
    }
  }

  // Otherwise, return the result as-is
  return result;
}

// ============================================================================
// Performance Optimizations
// ============================================================================

/**
 * Identifier cache for frequently accessed values
 * Reduces redundant context lookups during high-frequency operations
 * Cache is frame-based (~16ms TTL) to balance performance with memory
 */
interface IdentifierCacheEntry {
  value: any;
  timestamp: number;
}

const identifierCache = new Map<string, IdentifierCacheEntry>();
const CACHE_TTL = 16; // ~1 frame at 60fps

/**
 * Clear expired cache entries periodically
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of identifierCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      identifierCache.delete(key);
    }
  }
}

// Clear cache every 100ms to prevent memory buildup
setInterval(clearExpiredCache, 100);

/**
 * Evaluates an AST node using the Phase 3 expression system
 * Optimized with fast paths for common node types
 */
export async function evaluateAST(node: ASTNode, context: ExecutionContext): Promise<any> {
  if (!node) {
    throw new Error('Cannot evaluate null or undefined AST node');
  }

  // ============================================================================
  // Fast Paths - Inline common cases for 20-30% performance improvement
  // ============================================================================

  // Fast path for literals (most common after identifiers)
  if (node.type === 'literal') {
    return (node as any).value;
  }

  // Fast path for identifiers (extremely common in expressions)
  if (node.type === 'identifier') {
    return evaluateIdentifier(node, context);
  }

  // Fall through to switch for complex node types
  switch (node.type) {
    case 'literal':
      return evaluateLiteral(node);

    case 'identifier':
      return evaluateIdentifier(node, context);

    case 'binaryExpression':
      return evaluateBinaryExpression(node, context);

    case 'asExpression':
      return evaluateAsExpressionNode(node, context);

    case 'betweenExpression':
      return evaluateBetweenExpression(node, context);

    case 'typeCheckExpression':
      return evaluateTypeCheckExpression(node, context);

    case 'collectionExpression':
      return evaluateCollectionExpression(node, context);

    case 'unaryExpression':
      return evaluateUnaryExpression(node, context);

    case 'memberExpression':
      return evaluateMemberExpression(node, context);

    case 'callExpression':
      return evaluateCallExpression(node, context);

    case 'selector':
      return evaluateSelector(node, context);

    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);

    case 'eventHandler':
      return evaluateEventHandler(node, context);

    case 'command':
      return evaluateCommand(node, context);

    case 'conditionalExpression':
      return evaluateConditionalExpression(node, context);

    // Node types ported from expression-parser.ts evaluator (the older path).
    // These are produced by the canonical parser (parser.ts) but were previously
    // only handled by the legacy `evaluateASTNode` switch — calling them via
    // the canonical Pratt path would throw `Unknown AST node type`.
    case 'arrayLiteral':
      return evaluateArrayLiteralNode(node, context);
    case 'objectLiteral':
      return evaluateObjectLiteralNode(node, context);
    case 'attributeAccess':
      return evaluateAttributeAccessNode(node, context);
    case 'propertyOfExpression':
      return evaluatePropertyOfExpressionNode(node, context);
    case 'templateLiteral':
      return evaluateTemplateLiteralNode(node, context);

    default: {
      // Phase 5b: plugin-registered evaluators for custom AST node types.
      const pluginEvaluator = getRegisteredNodeEvaluator((node as any).type);
      if (pluginEvaluator) {
        return pluginEvaluator(node, context);
      }
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }
}

/**
 * Parse and evaluate a hyperscript expression source string using the
 * canonical evaluator (upstream-faithful semantics: silent-null member
 * access, late-binding `this` on method extraction).
 *
 * Preferred over legacy `parseAndEvaluateExpression` (expression-parser.ts).
 * See ~/.claude/plans/evaluator-consolidation-design.md for the full
 * consolidation plan.
 */
export async function evaluateExpressionFromSource(
  source: string,
  context: ExecutionContext
): Promise<any> {
  const result = parse(source);
  if (!result.success || !result.node) {
    const err = result.error ?? result.errors?.[0];
    throw new Error(`Failed to parse expression: ${err?.message ?? 'unknown error'}`);
  }
  // `parse()` returns a single AST node for bare expressions (verified for
  // literal/identifier/binary/member/call/selector/array/object/possessive
  // shapes — see Phase α.1 spike).
  return evaluateAST(result.node as ASTNode, context);
}

/**
 * Evaluates literal nodes (numbers, strings, booleans)
 */
function evaluateLiteral(node: any): any {
  return node.value;
}

/**
 * Evaluates identifier nodes using Phase 3 reference expressions
 * Optimized with caching for frequently accessed identifiers
 */
async function evaluateIdentifier(node: any, context: ExecutionContext): Promise<any> {
  const name = node.name;

  // Generate cache key based on context and identifier
  // Use context.me as unique identifier for the execution context
  const contextId = context.me ? `${(context.me as any)._hscriptId || 'default'}` : 'global';
  const cacheKey = `${contextId}:${name}`;

  // `it` is loop-volatile: collection expressions (`where`, `sorted by`,
  // `mapped to`) re-bind `it` per element, often within the same cache TTL
  // window. Caching would return the same `it` value for every iteration.
  // Similarly, `result` can change across command boundaries.
  const skipCache = name === 'it' || name === 'its' || name === 'result';

  // Check cache first for frequently accessed identifiers
  const cached = skipCache ? undefined : identifierCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  // Evaluate identifier
  let value: any;
  // Locals and globals are context-bound, so caching them across calls (when
  // the cache key collapses contexts) returns stale values. Track whether
  // the resolution came from per-context state so we can skip caching.
  let fromMutableContext = false;

  // Handle context variables using Phase 3 reference expressions.
  // Upstream aliases: `my`/`I` → me, `your`/`yourself` → you, `its` → it.
  // Matches `_hyperscript/src/core/runtime/runtime.js:255` resolveSymbol.
  if (name === 'me' || name === 'my' || name === 'I') {
    value = await referencesExpressions.me.evaluate(context);
    fromMutableContext = true;
  } else if (name === 'you' || name === 'your' || name === 'yourself') {
    value = await referencesExpressions.you.evaluate(context);
    fromMutableContext = true;
  } else if (name === 'it' || name === 'its') {
    value = await referencesExpressions.it.evaluate(context);
  } else if (name === 'window') {
    value = await referencesExpressions.window.evaluate(context);
  } else if (name === 'document') {
    value = await referencesExpressions.document.evaluate(context);
  } else if (context.locals && context.locals.has(name)) {
    // Check if identifier exists in context scope
    value = context.locals.get(name);
    fromMutableContext = true;
  } else if (context.globals && context.globals.has(name)) {
    value = context.globals.get(name);
    if (name.startsWith('$')) notifyGlobalRead(name.slice(1), context);
    fromMutableContext = true;
  } else if (name.startsWith('$') && context.globals && context.globals.has(name.slice(1))) {
    // Hyperscript convention: `$name` identifiers look up `name` in globals
    // (matches how setVariableValue stores them). Covers both legacy parse
    // paths (identifier with `$` prefix) and the newer `globalVariable` path.
    value = context.globals.get(name.slice(1));
    notifyGlobalRead(name.slice(1), context);
    fromMutableContext = true;
  } else if ((context as any)[name] !== undefined) {
    // Check if it's a property on the context object (for backward compatibility)
    value = (context as any)[name];
    fromMutableContext = true;
  } else {
    // Default to undefined for unknown identifiers
    value = undefined;
  }

  // Cache the result for future lookups. Only cache values that aren't
  // context-bound — locals/globals/me/you change per execution context and
  // the cache key doesn't disambiguate fully (multiple tests with
  // context.me === null collapse to `global:<name>`).
  const shouldCache =
    !skipCache && !fromMutableContext && typeof value !== 'function' && !(value instanceof Element);
  if (shouldCache) {
    identifierCache.set(cacheKey, { value, timestamp: now });
  }

  return value;
}

/**
 * Evaluates binary expressions using Phase 3 logical expressions
 */
async function evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const operator = node.operator;

  // Handle 'has'/'have' operator for CSS class checking (e.g., "me has .active" or "I have .active")
  if (operator === 'has' || operator === 'have') {
    const left = await evaluateAST(node.left, context);
    if (
      left instanceof Element &&
      node.right.type === 'selector' &&
      typeof node.right.value === 'string' &&
      node.right.value.startsWith('.')
    ) {
      return left.classList.contains(node.right.value.slice(1));
    }
    return false;
  }

  const left = await evaluateAST(node.left, context);

  // Handle short-circuit evaluation for logical operators
  if (operator === 'and') {
    if (!left) return false;
    const right = await evaluateAST(node.right, context);
    return logicalExpressions.and.evaluate(context, left, right);
  }

  if (operator === 'or') {
    if (left) return true;
    const right = await evaluateAST(node.right, context);
    return logicalExpressions.or.evaluate(context, left, right);
  }

  // Evaluate right side for other operators
  const right = await evaluateAST(node.right, context);

  // `ignoring case` postfix modifier: lowercase string operands before dispatching
  // to comparators. Non-string operands pass through unchanged.
  const applyCI = (v: unknown): unknown => (typeof v === 'string' ? v.toLowerCase() : v);
  const L = node.ignoringCase ? applyCI(left) : left;
  const R = node.ignoringCase ? applyCI(right) : right;

  // Delegate to Phase 3 expression system based on operator
  switch (operator) {
    case '+':
      // JS-native: `+` concatenates if either operand is a string.
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left ?? '') + String(right ?? '');
      }
      return extractValue(specialExpressions.addition.evaluate(context as any, { left, right }));
    case '-':
      return extractValue(specialExpressions.subtraction.evaluate(context as any, { left, right }));
    case '*':
      return extractValue(
        specialExpressions.multiplication.evaluate(context as any, { left, right })
      );
    case '/':
      return extractValue(specialExpressions.division.evaluate(context as any, { left, right }));
    case '%':
    case 'mod':
      return extractValue(specialExpressions.modulo.evaluate(context as any, { left, right }));
    case '^':
    case '**':
      return Math.pow(Number(left), Number(right));

    case '>':
    case 'is greater than':
      return logicalExpressions.greaterThan.evaluate(context, left, right);
    case '<':
    case 'is less than':
      return logicalExpressions.lessThan.evaluate(context, left, right);
    case '>=':
    case 'is greater than or equal to':
      return logicalExpressions.greaterThanOrEqual.evaluate(context, left, right);
    case '<=':
    case 'is less than or equal to':
      return logicalExpressions.lessThanOrEqual.evaluate(context, left, right);
    case '==':
    case 'is':
    case 'am': // upstream alias for `is` (e.g., `if I am .active`)
    case 'equals':
    case 'is equal to':
      return logicalExpressions.equals.evaluate(context, L, R);
    case '!=':
    case 'is not':
    case 'is not equal to':
      return logicalExpressions.notEquals.evaluate(context, L, R);
    case '===':
    case 'really equals':
    case 'is really equal to':
      return logicalExpressions.strictEquals.evaluate(context, L, R);
    case '!==':
    case 'is not really equal to':
      return logicalExpressions.strictNotEquals.evaluate(context, L, R);

    case 'as':
      // For 'as' conversion, right operand should be a string type name
      return conversionExpressions.as.evaluate(context, left, normalizeAsTargetType(right));

    case 'contains':
      return logicalExpressions.contains.evaluate(context, L, R);

    case 'does not contain':
    case 'does not include':
      return logicalExpressions.doesNotContain.evaluate(context, L, R);

    case 'starts with':
      return logicalExpressions.startsWith.evaluate(context, L, R);

    case 'ends with':
      return logicalExpressions.endsWith.evaluate(context, L, R);

    case 'does not start with': {
      const r = await logicalExpressions.startsWith.evaluate(context, L, R);
      return !r;
    }

    case 'does not end with': {
      const r = await logicalExpressions.endsWith.evaluate(context, L, R);
      return !r;
    }

    case 'match':
    case 'matches':
      return logicalExpressions.matches.evaluate(context, L, R);

    case 'in':
    case 'is in':
      return isIn(left, right);

    case 'is not in':
      return !isIn(left, right);

    case 'of':
      // Simple 'of' operator - get property/index of object/array
      return right && typeof right === 'object' ? right[left] : undefined;

    // DOM ordering (upstream _hyperscript): precedes/follows via compareDocumentPosition.
    // null/undefined or non-Node operands → false (true for the negated forms).
    case 'precedes':
      return docPosMatches(left, right, Node.DOCUMENT_POSITION_FOLLOWING);
    case 'does not precede':
      return !docPosMatches(left, right, Node.DOCUMENT_POSITION_FOLLOWING);
    case 'follows':
      return docPosMatches(left, right, Node.DOCUMENT_POSITION_PRECEDING);
    case 'does not follow':
      return !docPosMatches(left, right, Node.DOCUMENT_POSITION_PRECEDING);

    default:
      throw new Error(`Unknown binary operator: ${operator}`);
  }
}

/**
 * Shared `in` / `is in` containment check. Mirrors the inline behavior previously
 * coded into the `'in'` case: array.includes, string.includes, or `key in object`.
 */
function isIn(item: unknown, container: unknown): boolean {
  if (Array.isArray(container)) return container.includes(item);
  if (typeof container === 'string') return container.includes(String(item));
  // Identity / DOM containment — `<elem> is in <elem>` is true for the same
  // node, and an element is in another that contains it.
  if (item instanceof Node && container instanceof Node) {
    return item === container || container.contains(item);
  }
  return container != null && typeof container === 'object' && (item as any) in (container as any);
}

/**
 * Shared bitmask check for `precedes`/`follows` and their negations. Non-Node
 * operands (including null/undefined) yield false; callers negate as needed.
 */
function docPosMatches(a: unknown, b: unknown, mask: number): boolean {
  return a instanceof Node && b instanceof Node && (a.compareDocumentPosition(b) & mask) !== 0;
}

/**
 * Normalize an `as` target type to a string. The Pratt parser emits `targetType`
 * as an AST node ({ type: 'identifier', name: 'Int' }); the standalone
 * expression-parser fragment emits a raw string ('Int', 'Fixed:2'). The downstream
 * conversion evaluator requires a string. See feedback memory for details.
 */
function normalizeAsTargetType(target: unknown): string {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    const t = target as { name?: unknown; value?: unknown };
    if (typeof t.name === 'string') return t.name;
    if (typeof t.value === 'string') return t.value;
  }
  return String(target);
}

/**
 * Evaluates the `asExpression` AST node ({ expression, targetType }) emitted by
 * the Pratt parser. Mirrors the runtime path in expression-parser.ts and
 * base-expression-evaluator.ts for the same node shape.
 */
async function evaluateAsExpressionNode(node: any, context: ExecutionContext): Promise<unknown> {
  const value = await evaluateAST(node.expression, context);
  const typeName = normalizeAsTargetType(node.targetType);
  return conversionExpressions.as.evaluate(context, value, typeName);
}

/**
 * Evaluates `X is between A and B` / `X is not between A and B` ternary comparisons.
 */
async function evaluateBetweenExpression(node: any, context: ExecutionContext): Promise<boolean> {
  const value = await evaluateAST(node.value, context);
  const min = await evaluateAST(node.min, context);
  const max = await evaluateAST(node.max, context);
  // `ignoring case` applies when bounds are string (lexicographic) ranges
  const ci = (v: unknown): unknown => (typeof v === 'string' ? v.toLowerCase() : v);
  const [V, lo, hi] = node.ignoringCase ? [ci(value), ci(min), ci(max)] : [value, min, max];
  const inRange = (await logicalExpressions.between.evaluate(context, V, lo, hi)) as boolean;
  return node.negated ? !inRange : inRange;
}

/**
 * Evaluates `X is a Type` / `X is an Type` / `X is not a Type` / `X is not an Type`
 * with optional `!` modifier disallowing null.
 *
 * Mirrors upstream `_hyperscript`'s `runtime.typeCheck`: compares against the
 * `Object.prototype.toString` tag, then falls back to `instanceof` against the
 * named global constructor (`globalThis[typeName]`).
 */
async function evaluateTypeCheckExpression(node: any, context: ExecutionContext): Promise<boolean> {
  const value = await evaluateAST(node.value, context);
  const typeName = String(node.typeName);
  const nullOk = node.nullOk !== false;

  const matches = typeCheck(value, typeName, nullOk);
  return node.negated ? !matches : matches;
}

function typeCheck(value: unknown, typeName: string, nullOk: boolean): boolean {
  // Match upstream _hyperscript exactly: nullOk short-circuits, but
  // a falsy nullOk still falls through to the toString tag check so
  // `null is a Null!` correctly returns true.
  if (value == null && nullOk) return true;
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  if (tag === typeName) return true;
  const ctor = (globalThis as any)[typeName];
  return typeof ctor === 'function' && value instanceof ctor;
}

// ===========================================================================
// Node-type evaluators ported from expression-parser.ts
//
// Each helper has the same shape as its `evaluateXxx` counterpart in
// expression-parser.ts, with `evaluateASTNode` → `evaluateAST` rewired. Keep
// in sync until the two evaluator paths are consolidated; cite the source
// line for traceability.
// ===========================================================================

/** Mirrors expression-parser.ts:evaluateArrayLiteral (L2066). */
async function evaluateArrayLiteralNode(node: any, context: ExecutionContext): Promise<unknown[]> {
  const elements: unknown[] = [];
  for (const el of node.elements) {
    elements.push(await evaluateAST(el, context));
  }
  return elements;
}

/** Mirrors expression-parser.ts:evaluateObjectLiteral (L2119). */
async function evaluateObjectLiteralNode(
  node: any,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const property of node.properties) {
    let key: string;
    if (property.key.type === 'identifier') {
      key = property.key.name;
    } else if (property.key.type === 'literal' && property.key.valueType === 'string') {
      key = property.key.value;
    } else {
      key = String(await evaluateAST(property.key, context));
    }
    result[key] = await evaluateAST(property.value, context);
  }
  return result;
}

/** Mirrors expression-parser.ts:evaluateAttributeAccess (L1975). */
async function evaluateAttributeAccessNode(node: any, context: ExecutionContext): Promise<unknown> {
  const attributeName = node.attributeName;
  if (context.me && context.me instanceof Element) {
    return context.me.getAttribute(attributeName);
  }
  return `@${attributeName}`;
}

/**
 * Mirrors expression-parser.ts:evaluatePropertyOfExpression (L1719). Handles the
 * `the X of Y` and `values of Y` patterns. For DOM elements, uses the
 * `getElementProperty` helper that backs the `its` expression.
 */
async function evaluatePropertyOfExpressionNode(
  node: any,
  context: ExecutionContext
): Promise<unknown> {
  const propertyNode = node.property;
  if (propertyNode?.type !== 'identifier') {
    throw new Error('Property name must be an identifier in "the X of Y" pattern');
  }
  const propertyName: string = propertyNode.name;

  const target = await evaluateAST(node.target, context);
  if (target == null) {
    throw new Error(`Cannot access property "${propertyName}" of ${target}`);
  }

  if (isElement(target)) {
    return getElementProperty(target, propertyName);
  }

  const value = (target as any)[propertyName];
  return typeof value === 'function' ? value.bind(target) : value;
}

/**
 * Mirrors expression-parser.ts:evaluateTemplateLiteral (L2385). Interpolates
 * `$var`, `${expr}`, and `$(expr)` patterns. Recursive `${expr}` evaluation
 * delegates to the canonical `evaluateExpressionFromSource` (same module).
 */
async function evaluateTemplateLiteralNode(node: any, context: ExecutionContext): Promise<string> {
  let template: string = node.value;

  // First pass: $variable / $1 / $window.foo
  template = await replaceAsync(
    template,
    /\$([a-zA-Z_$][a-zA-Z0-9_.$]*|\d+)/g,
    async (_match, varName) => {
      try {
        if (/^\d+$/.test(varName)) return varName;
        if (varName.includes('.')) {
          const parts = varName.split('.');
          let value: any = resolveTemplateVariable(parts[0], context);
          for (let i = 1; i < parts.length; i++) {
            if (value == null) break;
            value = value[parts[i]];
          }
          return String(value ?? '');
        }
        const value = resolveTemplateVariable(varName, context);
        return String(value ?? '');
      } catch {
        return '';
      }
    }
  );

  // Second pass: ${expr} / $(expr)
  template = await replaceAsync(
    template,
    /\$(?:\{([^}]+)\}|\(([^)]+)\))/g,
    async (_match, braceExpr, parenExpr) => {
      const expr = braceExpr || parenExpr;
      try {
        const result = await evaluateExpressionFromSource(expr, context);
        return String(result);
      } catch {
        return 'undefined';
      }
    }
  );

  return template;
}

/** Mirrors expression-parser.ts:resolveVariable (L2471). */
function resolveTemplateVariable(varName: string, context: ExecutionContext): unknown {
  if (context.locals?.has(varName)) return context.locals.get(varName);
  if (varName === 'me' && context.me) return context.me;
  if (varName === 'you' && context.you) return context.you;
  if (varName === 'it' && context.it) return context.it;
  if (varName === 'result' && context.result) return context.result;
  if (typeof window !== 'undefined' && varName === 'window') return window;
  if (context.globals?.has(varName)) return context.globals.get(varName);
  return undefined;
}

/** Mirrors expression-parser.ts:replaceAsyncBatch (L2498). */
async function replaceAsync(
  str: string,
  regex: RegExp,
  replacer: (match: string, ...args: any[]) => Promise<string>
): Promise<string> {
  const matches: Array<{ index: number; length: number; replacement: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      replacement: await replacer(m[0], ...m.slice(1)),
    });
  }
  let result = str;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, length, replacement } = matches[i];
    result = result.substring(0, index) + replacement + result.substring(index + length);
  }
  return result;
}

/** Mirrors expression-parser.ts:toTypedContext (L77). */
function toTypedContext(context: ExecutionContext): any {
  return {
    ...context,
    evaluationHistory: (context as unknown as Record<string, unknown>).evaluationHistory ?? [],
  };
}

/**
 * Evaluates collection expressions: `where`, `sorted by`, `mapped to`,
 * `split by`, `joined by` (upstream _hyperscript 0.9.90).
 *
 * For `where` / `sorted by` / `mapped to` the RHS is an unevaluated AST node
 * that must run per-element with `it` bound to the current element. We use
 * context cloning rather than mutation so sibling expressions in the same
 * execution don't see each other's `it` values.
 */
async function evaluateCollectionExpression(node: any, context: ExecutionContext): Promise<any> {
  const collection = await evaluateAST(node.collection, context);

  // Helper: evaluate the RHS AST with `it` bound to the given element.
  const evalWithIt = async (astNode: any, it: unknown): Promise<unknown> => {
    const elementContext = { ...context, it } as ExecutionContext;
    return evaluateAST(astNode, elementContext);
  };

  switch (node.operator) {
    case 'where':
      return evaluateWhere(collection, node.right, evalWithIt);

    case 'sorted by':
      return evaluateSortedBy(collection, node.right, node.order ?? 'asc', evalWithIt);

    case 'mapped to':
      return evaluateMappedTo(collection, node.right, evalWithIt);

    case 'split by': {
      const sep = await evaluateAST(node.right, context);
      return evaluateSplitBy(collection, sep);
    }

    case 'joined by': {
      const sep = await evaluateAST(node.right, context);
      return evaluateJoinedBy(collection, sep);
    }

    default:
      throw new Error(`Unknown collection operator: ${node.operator}`);
  }
}

/**
 * Evaluates unary expressions.
 *
 * Handles both shapes:
 *   - Pratt-parser: `{ operator, operand, prefix }` ([pratt-parser.ts:248-260])
 *   - Legacy parser: `{ operator, argument }`
 *
 * Postfix unaries (`exists`, `does not exist`, `is empty`, `is not empty`) are
 * produced as `unaryExpression` nodes by PARSER_COMPARISON_FRAGMENT
 * ([pratt-parser.ts:715-770]).
 */
async function evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const operandNode = node.operand ?? node.argument;
  const value = await evaluateAST(operandNode, context);

  switch (node.operator) {
    case 'not':
    case '!':
      return logicalExpressions.not.evaluate(context, value);

    case 'no':
      return logicalExpressions.no.evaluate(context, value);

    case '-':
      return -value;

    case '+':
      return +value;

    case 'exists':
    case 'some':
      // `some` is upstream's truthy-non-empty check — same semantics as `exists`.
      return logicalExpressions.exists.evaluate(context, value);

    case 'does not exist':
      return logicalExpressions.doesNotExist.evaluate(context, value);

    case 'is empty':
      return logicalExpressions.isEmpty.evaluate(context, value);

    case 'is not empty':
      return logicalExpressions.isNotEmpty.evaluate(context, value);

    default:
      throw new Error(`Unknown unary operator: ${node.operator}`);
  }
}

/**
 * Evaluates `obj.prop` and `obj?.prop` (memberExpression nodes).
 *
 * Behavior matches upstream `_hyperscript` (`runtime.js:resolveProperty` /
 * `#flatGet`):
 *   - null/undefined object → returns `undefined` (does NOT throw)
 *   - method extraction (e.g. `obj.method`) returns the unbound function.
 *     `this` is bound at call time by `evaluateCallExpression` via `.apply()`.
 *     Extracting a method and calling it later as a bare function loses `this`
 *     — JavaScript-standard behavior.
 *
 * The `?.` form sets `node.optional = true` ([parser.ts:parseCall]); the
 * runtime is already lenient on null so no extra check is needed today. The
 * flag preserves intent if `.` is ever tightened to throw on null.
 *
 * NOTE: The legacy `expression-parser.ts:evaluatePropertyAccess` diverges — it
 * throws on null and binds methods at access time. The canonical path here is
 * correct per upstream; the legacy divergence is a known issue to be resolved
 * by the planned evaluator-consolidation refactor.
 */
async function evaluateMemberExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateAST(node.object, context);

  if (node.computed) {
    // Computed access: object[property]
    const property = await evaluateAST(node.property, context);
    return object?.[property];
  } else {
    // Non-computed access: object.property
    const propertyName = node.property.name;

    // Handle attribute access (@attr → getAttribute)
    if (typeof propertyName === 'string' && propertyName.startsWith('@')) {
      const attrName = propertyName.substring(1);
      if (object && typeof object.getAttribute === 'function') {
        return object.getAttribute(attrName);
      }
      return undefined;
    }

    return object?.[propertyName];
  }
}

/**
 * Evaluates call expressions using Phase 3 reference expressions
 */
async function evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
  const callee = await evaluateAST(node.callee, context);

  // Handle special hyperscript functions that need raw identifiers as selectors
  if (node.callee.type === 'identifier') {
    const funcName = node.callee.name;

    // For closest/previous/next, identifier args should be treated as tag selectors
    if (['closest', 'previous', 'next'].includes(funcName)) {
      const args = await Promise.all(
        node.arguments.map((arg: ASTNode) => {
          // If arg is an identifier, use the name as a tag selector
          if (arg.type === 'identifier' && (arg as any).name) {
            return (arg as any).name;
          }
          // If arg is a selector, use the value
          if (arg.type === 'selector' && (arg as any).value) {
            return (arg as any).value;
          }
          return evaluateAST(arg, context);
        })
      );

      switch (funcName) {
        case 'closest':
          return referencesExpressions.closest.evaluate(context, ...args);
        case 'previous':
          return positionalExpressions.previous.evaluate(context, ...args);
        case 'next':
          return positionalExpressions.next.evaluate(context, ...args);
      }
    }

    const args2 = await Promise.all(
      node.arguments.map((arg: ASTNode) => evaluateAST(arg, context))
    );

    switch (funcName) {
      case 'closest':
        return referencesExpressions.closest.evaluate(context, ...args2);

      case 'first':
        return positionalExpressions.first.evaluate(context, ...args2);

      case 'last':
        return positionalExpressions.last.evaluate(context, ...args2);

      case 'next':
        return positionalExpressions.next.evaluate(context, ...args2);

      case 'previous':
        return positionalExpressions.previous.evaluate(context, ...args2);

      default:
        // Regular function call
        if (typeof callee === 'function') {
          return callee(...args2);
        }
        throw new Error(`Cannot call non-function: ${funcName}`);
    }
  }

  // Method calls — preserve `this` when the callee is a member expression.
  // Without this, `it.toUpperCase()` evaluates callee to the unbound
  // String.prototype.toUpperCase function and calling it throws.
  if (typeof callee === 'function') {
    const evaluatedArgs = await Promise.all(
      node.arguments.map((arg: ASTNode) => evaluateAST(arg, context))
    );
    if (node.callee?.type === 'memberExpression' || node.callee?.type === 'propertyAccess') {
      const thisArg = await evaluateAST(node.callee.object, context);
      return callee.apply(thisArg, evaluatedArgs);
    }
    return callee(...evaluatedArgs);
  }

  throw new Error('Cannot call non-function');
}

/**
 * Evaluates CSS selector expressions using Phase 3 reference expressions.
 *
 * Upstream contract (`_hyperscript/src/parsetree/expressions/webliterals.js`):
 * - `#id`  → IdRef.resolve returns single element (getElementById).
 * - `.cls` → ClassRef.resolve returns iterable ElementCollection.
 * - `<q/>` → QueryRef.resolve returns iterable ElementCollection.
 * - `[attr]` → AttributeRef-based selector returns collection.
 *
 * Canonical previously unwrapped all array results to first element, which
 * broke `.class` callers asserting iterability. Aligning with upstream:
 * only `#id` selectors yield a single element.
 */
async function evaluateSelector(node: any, context: ExecutionContext): Promise<any> {
  const selector = node.value;
  const result = await referencesExpressions.elementWithSelector.evaluate(context, selector);

  // Bare `#id` unwraps to single element. `<#id/>` (query-form, marked by
  // parser with `fromQuery: true`) always returns the collection — matches
  // upstream's QueryRef → ElementCollection vs IdRef → getElementById.
  if (!node.fromQuery && typeof selector === 'string' && selector.startsWith('#')) {
    if (Array.isArray(result)) return result[0] ?? null;
    return result;
  }

  return result;
}

/**
 * Evaluates possessive expressions (element's property)
 */
async function evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateAST(node.object, context);
  const propertyName = node.property.name;

  // Use Phase 3 property expression system
  return propertiesExpressions.possessive.evaluate(context, object, propertyName);
}

/**
 * Evaluates event handler expressions
 */
async function evaluateEventHandler(node: any, context: ExecutionContext): Promise<any> {
  // Event handlers return a handler function
  return {
    event: node.event,
    selector: node.selector,
    commands: node.commands,
    handler: async (event: Event) => {
      // Set up event context
      const eventContext = {
        ...context,
        event,
        target: event.target,
        currentTarget: event.currentTarget,
      };

      // Execute commands in sequence
      for (const command of node.commands) {
        await evaluateAST(command, eventContext);
      }
    },
  };
}

/**
 * Evaluates command expressions
 */
async function evaluateCommand(node: any, context: ExecutionContext): Promise<any> {
  const commandName = node.name;
  const args = await Promise.all(
    (node.args || []).map((arg: ASTNode) => evaluateAST(arg, context))
  );

  // Use Phase 3 command system when available
  // For now, return command descriptor
  return {
    type: 'command',
    name: commandName,
    args,
    execute: async () => {
      // Command execution logic will be implemented in Phase 4 command system
      console.log(`Executing command: ${commandName}`, args);
    },
  };
}

/**
 * Evaluates conditional expressions (if-then-else)
 */
async function evaluateConditionalExpression(node: any, context: ExecutionContext): Promise<any> {
  const test = await evaluateAST(node.test, context);

  if (test) {
    return evaluateAST(node.consequent, context);
  } else if (node.alternate) {
    return evaluateAST(node.alternate, context);
  }

  return undefined;
}
