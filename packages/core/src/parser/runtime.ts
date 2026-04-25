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
import {
  evaluateWhere,
  evaluateSortedBy,
  evaluateMappedTo,
  evaluateSplitBy,
  evaluateJoinedBy,
} from '../expressions/collection/index';

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

    case 'betweenExpression':
      return evaluateBetweenExpression(node, context);

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

  // Handle context variables using Phase 3 reference expressions
  // Note: 'I' is a _hyperscript alias for 'me' (case-sensitive to avoid conflict with loop var 'i')
  if (name === 'me' || name === 'I') {
    value = await referencesExpressions.me.evaluate(context);
  } else if (name === 'you') {
    value = await referencesExpressions.you.evaluate(context);
  } else if (name === 'it') {
    value = await referencesExpressions.it.evaluate(context);
  } else if (name === 'window') {
    value = await referencesExpressions.window.evaluate(context);
  } else if (name === 'document') {
    value = await referencesExpressions.document.evaluate(context);
  } else if (context.locals && context.locals.has(name)) {
    // Check if identifier exists in context scope
    value = context.locals.get(name);
  } else if (context.globals && context.globals.has(name)) {
    value = context.globals.get(name);
    if (name.startsWith('$')) notifyGlobalRead(name.slice(1), context);
  } else if (name.startsWith('$') && context.globals && context.globals.has(name.slice(1))) {
    // Hyperscript convention: `$name` identifiers look up `name` in globals
    // (matches how setVariableValue stores them). Covers both legacy parse
    // paths (identifier with `$` prefix) and the newer `globalVariable` path.
    value = context.globals.get(name.slice(1));
    notifyGlobalRead(name.slice(1), context);
  } else if ((context as any)[name] !== undefined) {
    // Check if it's a property on the context object (for backward compatibility)
    value = (context as any)[name];
  } else {
    // Default to undefined for unknown identifiers
    value = undefined;
  }

  // Cache the result for future lookups
  // Only cache primitive values and stable objects (not DOM elements which may change)
  const shouldCache = !skipCache && typeof value !== 'function' && !(value instanceof Element);
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

    case '>':
      return logicalExpressions.greaterThan.evaluate(context, left, right);
    case '<':
      return logicalExpressions.lessThan.evaluate(context, left, right);
    case '>=':
      return logicalExpressions.greaterThanOrEqual.evaluate(context, left, right);
    case '<=':
      return logicalExpressions.lessThanOrEqual.evaluate(context, left, right);
    case '==':
    case 'is':
      return logicalExpressions.equals.evaluate(context, L, R);
    case '!=':
    case 'is not':
      return logicalExpressions.notEquals.evaluate(context, L, R);
    case '===':
      return logicalExpressions.strictEquals.evaluate(context, L, R);
    case '!==':
      return logicalExpressions.strictNotEquals.evaluate(context, L, R);

    case 'as':
      // For 'as' conversion, right operand should be a string type name
      const typeName =
        typeof right === 'string'
          ? right
          : right?.type === 'identifier'
            ? right.name
            : right?.type === 'literal'
              ? right.value
              : String(right);
      return conversionExpressions.as.evaluate(context, left, typeName);

    case 'contains':
      return logicalExpressions.contains.evaluate(context, L, R);

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
      // Simple 'in' operator - check if left exists in right
      return Array.isArray(right) ? right.includes(left) : left in right;

    case 'of':
      // Simple 'of' operator - get property/index of object/array
      return right && typeof right === 'object' ? right[left] : undefined;

    default:
      throw new Error(`Unknown binary operator: ${operator}`);
  }
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
 * Evaluates unary expressions
 */
async function evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const argument = await evaluateAST(node.argument, context);
  const operator = node.operator;

  switch (operator) {
    case 'not':
      return logicalExpressions.not.evaluate(context, argument);

    case '-':
      return -argument;

    case '+':
      return +argument;

    default:
      throw new Error(`Unknown unary operator: ${operator}`);
  }
}

/**
 * Evaluates member expressions using Phase 3 property expressions
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
 * Evaluates CSS selector expressions using Phase 3 reference expressions
 */
async function evaluateSelector(node: any, context: ExecutionContext): Promise<any> {
  const selector = node.value;
  const result = await referencesExpressions.elementWithSelector.evaluate(context, selector);

  // If result is array, return first element to match hyperscript behavior
  if (Array.isArray(result) && result.length > 0) {
    return result[0];
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
