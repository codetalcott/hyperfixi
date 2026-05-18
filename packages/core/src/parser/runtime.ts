/**
 * Hyperscript Runtime Expression Evaluator
 *
 * Canonical AST evaluator. Dispatches each AST node type to a focused helper
 * and delegates operator/reference semantics to the per-category expression
 * registries. Behavior mirrors upstream `_hyperscript/src/core/runtime.js`.
 */

import type { ASTNode, ExecutionContext, ExpressionImplementation } from '../types/core';
import { getRegisteredNodeEvaluator, notifyGlobalRead } from './extensions';
// Re-export setGlobal for backward-compatible access via the runtime module.
export { setGlobal } from './extensions';

// Static imports limited to plain utilities + lazy-evaluating collection helpers,
// which aren't registered as ExpressionImplementations. Named-expression dispatch
// (logical operators, references, conversions, positional, properties, math) goes
// through `context.registry` so bundle entries control which categories ship.
import { isElement, getElementProperty } from '../expressions/property-access-utils';
import {
  evaluateWhere,
  evaluateSortedBy,
  evaluateMappedTo,
  evaluateSplitBy,
  evaluateJoinedBy,
} from '../expressions/collection/index';
import { parse } from './parser';

/**
 * Look up a named expression on the runtime context's registry. Throws a clear,
 * actionable error when missing — the registry is constructed by the bundle
 * entry, and a miss means the bundle didn't include that expression's category.
 */
function getExpr(context: ExecutionContext, name: string): ExpressionImplementation {
  const impl = context.registry?.get(name);
  if (!impl) {
    throw new Error(
      `Expression '${name}' not in ExecutionContext.registry. ` +
        `The bundle's ExpressionRegistry must include this expression's category. ` +
        `Use createExpressionRegistry() with the relevant category objects ` +
        `(referencesExpressions, logicalExpressions, conversionExpressions, ` +
        `positionalExpressions, propertiesExpressions, specialExpressions, ` +
        `mathematicalExpressions).`
    );
  }
  return impl;
}

// ============================================================================
// Node shapes — minimal per-helper interfaces over ASTNode.
// Each shape lists only the fields that helper reads. These narrow the
// `(node: any)` parameters and catch typos at the call site without
// committing to a full discriminated-union of every parser output.
// ============================================================================

type LiteralNode = ASTNode & { value: unknown };
type IdentifierNode = ASTNode & { name: string };
type BinaryNode = ASTNode & {
  operator: string;
  left: ASTNode;
  right: ASTNode;
  ignoringCase?: boolean;
};
type AsNode = ASTNode & { expression: ASTNode; targetType: unknown };
type BetweenNode = ASTNode & {
  value: ASTNode;
  min: ASTNode;
  max: ASTNode;
  ignoringCase?: boolean;
  negated?: boolean;
};
type TypeCheckNode = ASTNode & {
  value: ASTNode;
  typeName: string;
  nullOk?: boolean;
  negated?: boolean;
};
type ArrayLiteralNode = ASTNode & { elements: ASTNode[] };
type ObjectLiteralNode = ASTNode & {
  properties: Array<{ key: ASTNode & { valueType?: string }; value: ASTNode }>;
};
type AttributeAccessNode = ASTNode & { attributeName: string };
type PropertyOfNode = ASTNode & { property: ASTNode; target: ASTNode };
type TemplateLiteralNode = ASTNode & { value: string };
type CollectionNode = ASTNode & {
  operator: string;
  collection: ASTNode;
  right: ASTNode;
  order?: 'asc' | 'desc';
};
type UnaryNode = ASTNode & { operator: string; operand?: ASTNode; argument?: ASTNode };
type MemberNode = ASTNode & {
  object: ASTNode;
  property: ASTNode & { name?: string };
  computed?: boolean;
};
type CallNode = ASTNode & {
  callee: ASTNode & { type: string; name?: string; object?: ASTNode };
  arguments: ASTNode[];
  isConstructor?: boolean;
};
type SelectorNode = ASTNode & { value: unknown; fromQuery?: boolean };
type PossessiveNode = ASTNode & { object: ASTNode; property: { name: string } };
type EventHandlerNode = ASTNode & { event?: unknown; selector?: unknown; commands: ASTNode[] };
type ConditionalNode = ASTNode & { test: ASTNode; consequent: ASTNode; alternate?: ASTNode };

/**
 * Unwrap a `{ success, value, errors }` TypedResult returned by the
 * arithmetic registry. Non-TypedResult values pass through unchanged. Callers
 * are responsible for awaiting any wrapping Promise first.
 */
function unwrapTypedResult(result: any): any {
  if (result && typeof result === 'object' && 'success' in result && 'value' in result) {
    if (result.success) return result.value;
    const errors = result.errors || [];
    const errorMessage = errors.length > 0 ? errors[0].message : 'Expression evaluation failed';
    throw new Error(errorMessage);
  }
  return result;
}

/**
 * Evaluate any AST node. Inlines fast paths for the two most common shapes
 * (literal, identifier) before falling through to a per-type switch.
 */
export async function evaluateAST(node: ASTNode, context: ExecutionContext): Promise<any> {
  if (!node) {
    throw new Error('Cannot evaluate null or undefined AST node');
  }

  // Ensure a registry is available for named-expression dispatch. Callers that
  // care about tree-shaking always pass a context with `.registry` set, so this
  // fallback never triggers for size-sensitive bundles. Tests and standalone
  // eval paths that don't set one get the full registry on demand. The dynamic
  // import keeps the kitchen-sink category modules out of bundles that never
  // hit this branch.
  if (!context.registry) {
    context = { ...context, registry: await loadFullRegistry() };
  }

  // ============================================================================
  // Fast Paths - Inline common cases for 20-30% performance improvement
  // ============================================================================

  // Fast path for literals (most common after identifiers)
  if (node.type === 'literal') {
    return (node as LiteralNode).value;
  }

  // Fast path for identifiers (extremely common in expressions)
  if (node.type === 'identifier') {
    return evaluateIdentifier(node as IdentifierNode, context);
  }

  // Fall through to switch for complex node types. Each case casts to the
  // helper's input shape — `node.type` already narrows what's there, but TS
  // lacks a discriminated union over the full ASTNode set.
  const n = node as any;
  switch (node.type) {
    case 'literal':
      return evaluateLiteral(n);

    case 'identifier':
      return evaluateIdentifier(n, context);

    case 'binaryExpression':
      return evaluateBinaryExpression(n, context);

    case 'asExpression':
      return evaluateAsExpressionNode(n, context);

    case 'betweenExpression':
      return evaluateBetweenExpression(n, context);

    case 'typeCheckExpression':
      return evaluateTypeCheckExpression(n, context);

    case 'collectionExpression':
      return evaluateCollectionExpression(n, context);

    case 'unaryExpression':
      return evaluateUnaryExpression(n, context);

    case 'memberExpression':
      return evaluateMemberExpression(n, context);

    case 'callExpression':
      return evaluateCallExpression(n, context);

    case 'selector':
      return evaluateSelector(n, context);

    case 'possessiveExpression':
      return evaluatePossessiveExpression(n, context);

    case 'eventHandler':
      return evaluateEventHandler(n, context);

    case 'conditionalExpression':
      return evaluateConditionalExpression(n, context);

    // Composite expression nodes produced by the canonical parser.
    case 'arrayLiteral':
      return evaluateArrayLiteralNode(n, context);
    case 'objectLiteral':
      return evaluateObjectLiteralNode(n, context);
    case 'attributeAccess':
      return evaluateAttributeAccessNode(n, context);
    case 'propertyOfExpression':
      return evaluatePropertyOfExpressionNode(n, context);
    case 'templateLiteral':
      return evaluateTemplateLiteralNode(n, context);

    default: {
      // Allow plugins to register evaluators for custom AST node types.
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
 * canonical evaluator. Upstream-faithful semantics: silent-null member
 * access, late-binding `this` on method extraction.
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
  // `parse()` returns a single AST node for bare expressions (literal,
  // identifier, binary, member, call, selector, array, object, possessive).
  // evaluateAST handles registry fallback for callers that didn't set one.
  return evaluateAST(result.node as ASTNode, context);
}

let cachedFullRegistry: import('../core/expression-registry').ExpressionRegistry | null = null;
async function loadFullRegistry(): Promise<
  import('../core/expression-registry').ExpressionRegistry
> {
  if (!cachedFullRegistry) {
    const mod = await import('../expressions/index');
    cachedFullRegistry = mod.createFullExpressionRegistry();
  }
  return cachedFullRegistry;
}

/**
 * Evaluates literal nodes (numbers, strings, booleans)
 */
function evaluateLiteral(node: LiteralNode): unknown {
  return node.value;
}

/**
 * Resolve an identifier (`me`, `it`, locals, globals, JS built-ins, etc.) to
 * its value.
 */
async function evaluateIdentifier(node: IdentifierNode, context: ExecutionContext): Promise<any> {
  const name = node.name;

  // Context variables. Upstream aliases: `my`/`I` → me, `your`/`yourself` →
  // you, `its` → it. Matches `_hyperscript/src/core/runtime.js:resolveSymbol`.
  if (name === 'me' || name === 'my' || name === 'I') {
    return getExpr(context, 'me').evaluate(context);
  }
  if (name === 'you' || name === 'your' || name === 'yourself') {
    return getExpr(context, 'you').evaluate(context);
  }
  if (name === 'it' || name === 'its') {
    return getExpr(context, 'it').evaluate(context);
  }
  if (name === 'window') {
    return getExpr(context, 'window').evaluate(context);
  }
  if (name === 'document') {
    return getExpr(context, 'document').evaluate(context);
  }
  if (context.locals && context.locals.has(name)) {
    return context.locals.get(name);
  }
  if (context.globals && context.globals.has(name)) {
    if (name.startsWith('$')) notifyGlobalRead(name.slice(1), context);
    return context.globals.get(name);
  }
  if (name.startsWith('$') && context.globals && context.globals.has(name.slice(1))) {
    // Hyperscript convention: `$name` identifiers look up `name` in globals
    // (matches how setVariableValue stores them). Covers both legacy parse
    // paths (identifier with `$` prefix) and the newer `globalVariable` path.
    notifyGlobalRead(name.slice(1), context);
    return context.globals.get(name.slice(1));
  }
  if ((context as any)[name] !== undefined) {
    // Property on the context object (backward compatibility).
    return (context as any)[name];
  }
  if (typeof globalThis !== 'undefined' && name in globalThis) {
    // JS built-ins: `Date`, `Math`, `Object`, `JSON`, etc. Constructors are
    // picked up by `evaluateCallExpression`'s `node.isConstructor` branch.
    return (globalThis as Record<string, unknown>)[name];
  }
  return undefined;
}

/**
 * Evaluate a binary expression. Handles `has`/`have`, the scoped positional
 * pattern `first/last .X in <root>`, short-circuit `and`/`or`, and delegates
 * the remaining operators to the logical/arithmetic registries.
 */
async function evaluateBinaryExpression(node: BinaryNode, context: ExecutionContext): Promise<any> {
  const operator = node.operator;
  const rightNode = node.right as any;
  const leftNode = node.left as any;

  // Handle 'has'/'have' operator for CSS class checking (e.g., "me has .active" or "I have .active")
  if (operator === 'has' || operator === 'have') {
    const left = await evaluateAST(node.left, context);
    if (
      left instanceof Element &&
      rightNode.type === 'selector' &&
      typeof rightNode.value === 'string' &&
      rightNode.value.startsWith('.')
    ) {
      return left.classList.contains(rightNode.value.slice(1));
    }
    return false;
  }

  // Scoped positional: `first .X in <root>` / `last .X in <root>` scopes
  // `querySelectorAll` to <root> instead of `document`, then applies
  // first/last. Canonical emits
  // `binaryExpression('in', callExpression(first, [selector]), <root>)` for
  // `first .X in me`; the call-expression wraps a `selector` arg (bare `.X`)
  // or a `fromQuery:true` selector (`<.X/>`).
  if (operator === 'in' || operator === 'is in') {
    const posKind =
      leftNode?.type === 'callExpression' && leftNode.callee?.type === 'identifier'
        ? leftNode.callee.name
        : null;
    if ((posKind === 'first' || posKind === 'last') && Array.isArray(leftNode.arguments)) {
      const sourceArg = leftNode.arguments[0];
      if (sourceArg?.type === 'selector' && typeof sourceArg.value === 'string') {
        const root = await evaluateAST(node.right, context);
        if (root && typeof (root as any).querySelectorAll === 'function') {
          const all = Array.from((root as Element).querySelectorAll(sourceArg.value));
          if (all.length === 0) return null;
          return posKind === 'first' ? all[0] : all[all.length - 1];
        }
      }
    }
  }

  const left = await evaluateAST(node.left, context);

  // Handle short-circuit evaluation for logical operators
  if (operator === 'and') {
    if (!left) return false;
    const right = await evaluateAST(node.right, context);
    return getExpr(context, 'and').evaluate(context, left, right);
  }

  if (operator === 'or') {
    if (left) return true;
    const right = await evaluateAST(node.right, context);
    return getExpr(context, 'or').evaluate(context, left, right);
  }

  // Evaluate right side for other operators
  const right = await evaluateAST(node.right, context);

  // `ignoring case` postfix modifier: lowercase string operands before dispatching
  // to comparators. Non-string operands pass through unchanged.
  const applyCI = (v: unknown): unknown => (typeof v === 'string' ? v.toLowerCase() : v);
  const L = node.ignoringCase ? applyCI(left) : left;
  const R = node.ignoringCase ? applyCI(right) : right;

  // Dispatch the operator to the appropriate registry.
  switch (operator) {
    case '+':
      // JS-native: `+` concatenates if either operand is a string.
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left ?? '') + String(right ?? '');
      }
      return unwrapTypedResult(
        await getExpr(context, 'addition').evaluate(context as any, { left, right })
      );
    case '-':
      return unwrapTypedResult(
        await getExpr(context, 'subtraction').evaluate(context as any, { left, right })
      );
    case '*':
      return unwrapTypedResult(
        await getExpr(context, 'multiplication').evaluate(context as any, { left, right })
      );
    case '/':
      return unwrapTypedResult(
        await getExpr(context, 'division').evaluate(context as any, { left, right })
      );
    case '%':
    case 'mod':
      return unwrapTypedResult(
        await getExpr(context, 'modulo').evaluate(context as any, { left, right })
      );
    case '^':
    case '**':
      return unwrapTypedResult(
        await getExpr(context, 'power').evaluate(context as any, { left, right })
      );

    case '>':
    case 'is greater than':
      return getExpr(context, 'greaterThan').evaluate(context, left, right);
    case '<':
    case 'is less than':
      return getExpr(context, 'lessThan').evaluate(context, left, right);
    case '>=':
    case 'is greater than or equal to':
      return getExpr(context, 'greaterThanOrEqual').evaluate(context, left, right);
    case '<=':
    case 'is less than or equal to':
      return getExpr(context, 'lessThanOrEqual').evaluate(context, left, right);
    case '==':
    case 'is':
    case 'am': // upstream alias for `is` (e.g., `if I am .active`)
    case 'equals':
    case 'is equal to':
      return getExpr(context, 'equals').evaluate(context, L, R);
    case '!=':
    case 'is not':
    case 'is not equal to':
      return getExpr(context, 'notEquals').evaluate(context, L, R);
    case '===':
    case 'really equals':
    case 'is really equal to':
      return getExpr(context, 'strictEquals').evaluate(context, L, R);
    case '!==':
    case 'is not really equal to':
      return getExpr(context, 'strictNotEquals').evaluate(context, L, R);

    case 'as':
      // For 'as' conversion, right operand should be a string type name
      return getExpr(context, 'as').evaluate(context, left, normalizeAsTargetType(right));

    case 'contains':
      return getExpr(context, 'contains').evaluate(context, L, R);

    case 'does not contain':
    case 'does not include':
      return getExpr(context, 'doesNotContain').evaluate(context, L, R);

    case 'starts with':
      return getExpr(context, 'startsWith').evaluate(context, L, R);

    case 'ends with':
      return getExpr(context, 'endsWith').evaluate(context, L, R);

    case 'does not start with': {
      const r = await getExpr(context, 'startsWith').evaluate(context, L, R);
      return !r;
    }

    case 'does not end with': {
      const r = await getExpr(context, 'endsWith').evaluate(context, L, R);
      return !r;
    }

    case 'match':
    case 'matches':
      return getExpr(context, 'matches').evaluate(context, L, R);

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
 * Normalize an `as` target type to a string. The Pratt parser emits
 * `targetType` as an AST node (`{ type: 'identifier', name: 'Int' }`); other
 * paths emit a raw string (`'Int'`, `'Fixed:2'`). The downstream conversion
 * evaluator requires a string.
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
 * Evaluate the `asExpression` AST node (`{ expression, targetType }`) emitted
 * by the Pratt parser.
 */
async function evaluateAsExpressionNode(node: AsNode, context: ExecutionContext): Promise<unknown> {
  const value = await evaluateAST(node.expression, context);
  const typeName = normalizeAsTargetType(node.targetType);
  return getExpr(context, 'as').evaluate(context, value, typeName);
}

/**
 * Evaluates `X is between A and B` / `X is not between A and B` ternary comparisons.
 */
async function evaluateBetweenExpression(
  node: BetweenNode,
  context: ExecutionContext
): Promise<boolean> {
  const value = await evaluateAST(node.value, context);
  const min = await evaluateAST(node.min, context);
  const max = await evaluateAST(node.max, context);
  // `ignoring case` applies when bounds are string (lexicographic) ranges
  const ci = (v: unknown): unknown => (typeof v === 'string' ? v.toLowerCase() : v);
  const [V, lo, hi] = node.ignoringCase ? [ci(value), ci(min), ci(max)] : [value, min, max];
  const inRange = (await getExpr(context, 'between').evaluate(context, V, lo, hi)) as boolean;
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
async function evaluateTypeCheckExpression(
  node: TypeCheckNode,
  context: ExecutionContext
): Promise<boolean> {
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
// Composite-expression node evaluators (arrayLiteral, objectLiteral,
// attributeAccess, propertyOfExpression, templateLiteral).
// ===========================================================================

/** Evaluate `[a, b, c]` array-literal nodes. */
async function evaluateArrayLiteralNode(
  node: ArrayLiteralNode,
  context: ExecutionContext
): Promise<unknown[]> {
  const elements: unknown[] = [];
  for (const el of node.elements) {
    elements.push(await evaluateAST(el, context));
  }
  return elements;
}

/** Evaluate `{ k: v }` object-literal nodes. */
async function evaluateObjectLiteralNode(
  node: ObjectLiteralNode,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const property of node.properties) {
    const keyNode = property.key as any;
    let key: string;
    if (keyNode.type === 'identifier') {
      key = keyNode.name;
    } else if (keyNode.type === 'literal' && keyNode.valueType === 'string') {
      key = keyNode.value;
    } else {
      key = String(await evaluateAST(keyNode, context));
    }
    result[key] = await evaluateAST(property.value, context);
  }
  return result;
}

/** Resolve `@attr` on `me`. Returns `@attr` literal when there is no element. */
async function evaluateAttributeAccessNode(
  node: AttributeAccessNode,
  context: ExecutionContext
): Promise<unknown> {
  const attributeName = node.attributeName;
  if (context.me && context.me instanceof Element) {
    return context.me.getAttribute(attributeName);
  }
  return `@${attributeName}`;
}

/**
 * Handle the `the X of Y` and `values of Y` patterns. For DOM elements,
 * delegates to the `getElementProperty` helper that backs the `its`
 * expression.
 */
async function evaluatePropertyOfExpressionNode(
  node: PropertyOfNode,
  context: ExecutionContext
): Promise<unknown> {
  const propertyNode = node.property as any;
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
 * Interpolate `$var`, `${expr}`, and `$(expr)` patterns in a template literal.
 * Recursive `${expr}` / `$(expr)` evaluation delegates to
 * `evaluateExpressionFromSource`.
 */
async function evaluateTemplateLiteralNode(
  node: TemplateLiteralNode,
  context: ExecutionContext
): Promise<string> {
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

/** Resolve a `$var` reference inside a template literal. */
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

/** Async-aware `String.replace`: each match's replacement may be a Promise. */
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

/**
 * Evaluates collection expressions: `where`, `sorted by`, `mapped to`,
 * `split by`, `joined by` (upstream _hyperscript 0.9.90).
 *
 * For `where` / `sorted by` / `mapped to` the RHS is an unevaluated AST node
 * that must run per-element with `it` bound to the current element. We use
 * context cloning rather than mutation so sibling expressions in the same
 * execution don't see each other's `it` values.
 */
async function evaluateCollectionExpression(
  node: CollectionNode,
  context: ExecutionContext
): Promise<any> {
  const collection = await evaluateAST(node.collection, context);

  // Helper: evaluate the RHS AST with `it` bound to the given element.
  const evalWithIt = async (astNode: ASTNode, it: unknown): Promise<unknown> => {
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
async function evaluateUnaryExpression(node: UnaryNode, context: ExecutionContext): Promise<any> {
  const operandNode = node.operand ?? node.argument;
  if (!operandNode) {
    throw new Error(`Unary expression has no operand (operator: ${node.operator})`);
  }
  const value = await evaluateAST(operandNode, context);

  switch (node.operator) {
    case 'not':
    case '!':
      return getExpr(context, 'not').evaluate(context, value);

    case 'no':
      return getExpr(context, 'no').evaluate(context, value);

    case '-':
      return -value;

    case '+':
      return +value;

    case 'exists':
    case 'some':
      // `some` is upstream's truthy-non-empty check — same semantics as `exists`.
      return getExpr(context, 'exists').evaluate(context, value);

    case 'does not exist':
      return getExpr(context, 'doesNotExist').evaluate(context, value);

    case 'is empty':
      return getExpr(context, 'isEmpty').evaluate(context, value);

    case 'is not empty':
      return getExpr(context, 'isNotEmpty').evaluate(context, value);

    default:
      throw new Error(`Unknown unary operator: ${node.operator}`);
  }
}

/**
 * Evaluate `obj.prop` and `obj?.prop` (memberExpression nodes).
 *
 * Behavior matches upstream `_hyperscript` (`runtime.js:resolveProperty` /
 * `#flatGet`):
 *   - null/undefined object → returns `undefined` (does NOT throw)
 *   - method extraction (e.g. `obj.method`) returns the unbound function.
 *     `this` is bound at call time by `evaluateCallExpression` via `.apply()`.
 *     Extracting a method and calling it later as a bare function loses `this`
 *     — JavaScript-standard behavior.
 *
 * The `?.` form sets `node.optional = true`; the runtime is already lenient on
 * null so no extra check is needed today. The flag preserves intent if `.` is
 * ever tightened to throw on null.
 */
async function evaluateMemberExpression(node: MemberNode, context: ExecutionContext): Promise<any> {
  const object = await evaluateAST(node.object, context);

  if (node.computed) {
    // Computed access: object[property]
    const property = await evaluateAST(node.property, context);
    return object?.[property];
  } else {
    // Non-computed access: object.property
    const propertyName = node.property.name as string;

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
 * `closest`/`previous`/`next` treat identifier and selector args as raw tag
 * or selector strings (`closest section` → `closest('section')`). All other
 * callees evaluate args normally.
 */
const RAW_ARG_BUILTINS = new Set(['closest', 'previous', 'next']);

async function resolveCallArgs(
  argNodes: ASTNode[],
  funcName: string,
  context: ExecutionContext
): Promise<unknown[]> {
  if (!RAW_ARG_BUILTINS.has(funcName)) {
    return Promise.all(argNodes.map(arg => evaluateAST(arg, context)));
  }
  return Promise.all(
    argNodes.map(arg => {
      if (arg.type === 'identifier' && (arg as any).name) return (arg as any).name;
      if (arg.type === 'selector' && (arg as any).value) return (arg as any).value;
      return evaluateAST(arg, context);
    })
  );
}

/**
 * Evaluate a call expression. Special-cases positional builtins
 * (`closest`/`previous`/`next` accept raw identifier args as tag selectors),
 * constructor invocations (`new Foo(...)`), and member-expression callees
 * (preserves `this` via `.apply`).
 */
async function evaluateCallExpression(node: CallNode, context: ExecutionContext): Promise<any> {
  const callee = await evaluateAST(node.callee, context);

  // `new Foo(args)` — parser marks constructor invocations with
  // `isConstructor: true`. Handle before the per-function switch so JS
  // built-ins like `new Date()`, `new Map()`, `new Error()` work uniformly.
  if (node.isConstructor && typeof callee === 'function') {
    const evaluatedArgs = await Promise.all(node.arguments.map(arg => evaluateAST(arg, context)));
    return new (callee as new (...args: unknown[]) => unknown)(...evaluatedArgs);
  }

  // Identifier callees: positional builtins (which need raw-arg treatment for
  // closest/previous/next), then bare function references.
  if (node.callee.type === 'identifier') {
    const funcName = node.callee.name as string;
    const args = await resolveCallArgs(node.arguments, funcName, context);

    switch (funcName) {
      case 'closest':
        return getExpr(context, 'closest').evaluate(context, ...args);
      case 'previous':
        return getExpr(context, 'previous').evaluate(context, ...args);
      case 'next':
        return getExpr(context, 'next').evaluate(context, ...args);
      case 'first':
        return getExpr(context, 'first').evaluate(context, ...args);
      case 'last':
        return getExpr(context, 'last').evaluate(context, ...args);
      default:
        if (typeof callee === 'function') {
          return callee(...args);
        }
        throw new Error(`Cannot call non-function: ${funcName}`);
    }
  }

  // Method calls — preserve `this` when the callee is a member expression.
  // Without this, `it.toUpperCase()` evaluates callee to the unbound
  // String.prototype.toUpperCase function and calling it throws.
  if (typeof callee === 'function') {
    const evaluatedArgs = await Promise.all(node.arguments.map(arg => evaluateAST(arg, context)));
    if (node.callee.type === 'memberExpression' && node.callee.object) {
      const thisArg = await evaluateAST(node.callee.object, context);
      return callee.apply(thisArg, evaluatedArgs);
    }
    return callee(...evaluatedArgs);
  }

  throw new Error('Cannot call non-function');
}

/**
 * Evaluate CSS selector expressions.
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
async function evaluateSelector(node: SelectorNode, context: ExecutionContext): Promise<any> {
  const selector = node.value;
  const escaped = typeof selector === 'string' ? escapeClassColons(selector) : selector;
  const result = await getExpr(context, 'elementWithSelector').evaluate(context, escaped);

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
 * CSS Selector class names containing colons (e.g., Tailwind's `lg:hidden`)
 * need backslash-escaping to distinguish from pseudo-classes. Preserves
 * recognized pseudo-class names so `.btn:hover` still works.
 */
const CSS_PSEUDO_CLASSES =
  'hover|active|focus|visited|link|focus-within|focus-visible|' +
  'first-child|last-child|only-child|nth-child|nth-last-child|nth-of-type|nth-last-of-type|' +
  'first-of-type|last-of-type|only-of-type|empty|root|target|lang|dir|' +
  'not|has|is|where|matches|' +
  'before|after|first-letter|first-line|selection|placeholder|marker|backdrop|' +
  'enabled|disabled|checked|indeterminate|required|optional|valid|invalid|in-range|out-of-range|read-only|read-write|' +
  'default|defined|fullscreen|modal|picture-in-picture|autofill';
const PSEUDO_CLASS_COLON_RE = new RegExp(
  `(\\.[a-zA-Z0-9_-]+):(?!(${CSS_PSEUDO_CLASSES})(?![a-zA-Z0-9_-]))`,
  'g'
);
function escapeClassColons(selector: string): string {
  return selector.replace(PSEUDO_CLASS_COLON_RE, '$1\\:');
}

/**
 * Evaluate possessive expressions (`element's property`).
 */
async function evaluatePossessiveExpression(
  node: PossessiveNode,
  context: ExecutionContext
): Promise<any> {
  const object = await evaluateAST(node.object, context);
  const propertyName = node.property.name;

  return getExpr(context, 'possessive').evaluate(context, object, propertyName);
}

/**
 * Evaluates event handler expressions
 */
async function evaluateEventHandler(
  node: EventHandlerNode,
  context: ExecutionContext
): Promise<any> {
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
 * Evaluates conditional expressions (if-then-else)
 */
async function evaluateConditionalExpression(
  node: ConditionalNode,
  context: ExecutionContext
): Promise<any> {
  const test = await evaluateAST(node.test, context);

  if (test) {
    return evaluateAST(node.consequent, context);
  } else if (node.alternate) {
    return evaluateAST(node.alternate, context);
  }

  return undefined;
}
