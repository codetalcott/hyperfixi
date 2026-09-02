/**
 * Hyperscript Runtime Expression Evaluator
 *
 * Canonical AST evaluator. Dispatches each AST node type to a focused helper
 * and delegates operator/reference semantics to the per-category expression
 * registries. Behavior mirrors upstream `_hyperscript/src/core/runtime.js`.
 */

import type { ASTNode, ExecutionContext, ExpressionImplementation } from '../types/core';
import type { ExecutionResult, ExecutionSignal } from '../types/result';
import { ok, err } from '../types/result';
import {
  getRegisteredNodeEvaluator,
  notifyGlobalRead,
  notifyLocalRead,
  setGlobal,
} from './extensions';
// Re-export setGlobal for backward-compatible access via the runtime module.
export { setGlobal };
import { getElementVar, setElementVar } from '../core/context';
import { convertToNumber } from '../commands/helpers/variable-access';
import { resolveTargetElements } from '../commands/helpers/target-elements';

// Static imports limited to plain utilities + lazy-evaluating collection helpers,
// which aren't registered as ExpressionImplementations. Named-expression dispatch
// (logical operators, references, conversions, positional, properties, math) goes
// through `context.registry` so bundle entries control which categories ship.
import { isElement, getElementProperty } from '../expressions/property-access-utils';
import { convertValue } from '../expressions/conversion/index';
import { isMappableCollection } from '../expressions/properties/index';
import {
  evaluateWhere,
  evaluateSortedBy,
  evaluateMappedTo,
  evaluateSplitBy,
  evaluateJoinedBy,
} from '../expressions/collection/index';
import { parse } from './parser';
import type {
  Expr,
  ArrayLiteralNode,
  AsExpressionNode,
  AttributeAccessNode,
  BetweenExpressionNode,
  BinaryExpressionNode,
  BlockLiteralNode,
  CallExpressionNode,
  CollectionExpressionNode,
  ConditionalExpressionNode,
  ContextReferenceNode,
  EventHandlerNode,
  IdentifierNode,
  LiteralNode,
  MemberExpressionNode,
  ObjectLiteralNode,
  PossessiveExpressionNode,
  PropertyAccessNode,
  PropertyOfExpressionNode,
  SelectorNode,
  StringNode,
  StringPostfixNode,
  TemplateLiteralNode,
  TypeCheckExpressionNode,
  UnaryExpressionNode,
} from '../ast/nodes';
import { isIdentifierNode } from '../ast/guards';
import { toLegacyNode, type AnyNode } from '../ast/legacy';

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

/**
 * Unwrap a `{ success, value, errors }` TypedResult returned by the
 * arithmetic registry. Non-TypedResult values pass through unchanged. Callers
 * are responsible for awaiting any wrapping Promise first.
 */
function unwrapTypedResult(result: any): any {
  if (result && typeof result === 'object' && 'success' in result) {
    if (result.success) return 'value' in result ? result.value : undefined;
    const errors = result.errors || [];
    const errorMessage = errors.length > 0 ? errors[0].message : 'Expression evaluation failed';
    throw new Error(errorMessage);
  }
  return result;
}

/**
 * The kinds {@link evaluateKnown} dispatches: every {@link Expr} member EXCEPT
 * the three below, plus the one statement kind the evaluator handles.
 *
 * `eventHandler` is a statement, not an `Expr`, and it is here because the
 * evaluator genuinely evaluates it (`evaluateEventHandler` installs the
 * listener and returns). The other eight statement kinds are EXECUTED by
 * `runtime-base.ts` and never evaluated — see the routing table below.
 *
 * The three excluded `Expr` kinds are not oversights. Each is consumed
 * structurally by its one reader and never reaches an evaluator:
 *
 *   - `cssProperty`   — built by `semantic-integration.createPropertyNode` for
 *                       a `set` destination, read by
 *                       `commands/helpers/selector-type-detection.ts`, which
 *                       destructures it. (Measured 2026-09-01: that reader
 *                       cannot match the shape the emitter builds. A behaviour
 *                       bug, filed in `PARSER_NEXT_STEPS.md`; a types-only arc
 *                       must not fix it here.)
 *   - `functionCall`  — built by `command-parsers/event-commands.ts` for a
 *                       `send`/`trigger` event name, destructured by
 *                       `commands/events/trigger.ts` (`.name` / `.args`). Its
 *                       sibling arms in that function evaluate; this one does
 *                       not.
 *   - `expression`    — the generic wrapper, read structurally by
 *                       `commands/async/fetch.ts` and `semantic-integration.ts`.
 *
 * Excluding them is what keeps `evaluateKnown`'s `never` default honest: listed,
 * the switch would need three arms nothing can reach. If one ever DOES arrive at
 * {@link evaluateAST}, it falls through to the plugin registry and then to the
 * same `Unknown AST node type` throw it gets today — this typing changes no
 * behaviour.
 */
type EvaluableNode =
  | Exclude<Expr, { type: 'cssProperty' } | { type: 'functionCall' } | { type: 'expression' }>
  | EventHandlerNode;

/**
 * The runtime mirror of {@link EvaluableNode}, and the reason it cannot drift.
 *
 * `satisfies` proves every string here is a real kind (no ghosts); the
 * `MissingEvaluableKind` line below proves every kind is listed (none missing).
 * One direction alone is not enough — a plain `readonly EvaluableNode['type'][]`
 * annotation accepts a SHORT array happily, and a short array here would route
 * a real parser kind to the plugin registry by accident.
 */
const EVALUABLE_KINDS = [
  'literal',
  'string',
  'identifier',
  'selector',
  'attributeAccess',
  'binaryExpression',
  'unaryExpression',
  'callExpression',
  'memberExpression',
  'possessiveExpression',
  'propertyOfExpression',
  'arrayLiteral',
  'objectLiteral',
  'templateLiteral',
  'asExpression',
  'betweenExpression',
  'typeCheckExpression',
  'collectionExpression',
  'conditionalExpression',
  'stringPostfix',
  'blockLiteral',
  'propertyAccess',
  'contextReference',
  'eventHandler',
] as const satisfies readonly EvaluableNode['type'][];

/** `never` iff the array above lists every {@link EvaluableNode} kind. */
type MissingEvaluableKind = Exclude<EvaluableNode['type'], (typeof EVALUABLE_KINDS)[number]>;
const _evaluableKindsAreComplete: MissingEvaluableKind extends never
  ? true
  : ['EVALUABLE_KINDS is missing these kinds', MissingEvaluableKind] = true;
void _evaluableKindsAreComplete;

const EVALUABLE_KIND_SET: ReadonlySet<string> = new Set<string>(EVALUABLE_KINDS);

/**
 * Evaluate a node of a kind the core parser emits.
 *
 * Exhaustive over {@link EvaluableNode}: the `default` arm assigns to `never`,
 * so adding a member to `Expr` without adding an arm here is a compile error.
 * That gate is the whole point of the split — {@link evaluateAST} keeps the
 * wide parameter and the plugin registry, so neither can weaken it.
 *
 * ## Where the other 11 union kinds go
 *
 * `evaluateAST`'s arms cover 24 of the union's 35 kinds (measured 2026-09-01).
 * The 11 that never arrive here:
 *
 * | kind | handled by |
 * | --- | --- |
 * | `command`, `block`, `CommandSequence`, `Program` | `runtime-base.ts` EXECUTES them — statements, not values |
 * | `behavior`, `def`, `initBlock` | `runtime-base.ts` installs them at registration time |
 * | `error` | the interchange converter's unconvertible-node marker; never executed |
 * | `cssProperty`, `functionCall`, `expression` | structural readers — see {@link EvaluableNode} |
 */
async function evaluateKnown(node: EvaluableNode, context: ExecutionContext): Promise<any> {
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

    // LEGACY: flat property paths (string `property`, possibly dotted). No
    // parser emits these any more — Thread B item 5 converged the semantic
    // builder on the core parser's nested `memberExpression`. MEASURED
    // 2026-09-01: zero in-repo non-test producers remain (grep + kind
    // classifier); the arm now serves only EXTERNAL hand-built ASTs
    // (buildAST is public API). Delete with the next minor version bump.
    case 'propertyAccess':
      return evaluatePropertyAccess(node, context);

    case 'callExpression':
      return evaluateCallExpression(node, context);

    case 'selector':
      return evaluateSelector(node, context);

    // LEGACY: dedicated context-reference nodes (`me`/`you`/`it`/`target`/
    // `event`). No parser emits these any more — Thread B item 5 converged
    // every reference on the core parser's `identifier` spelling (handled
    // above). MEASURED 2026-09-01: zero in-repo non-test producers remain;
    // the arm now serves only EXTERNAL hand-built ASTs (buildAST is public
    // API). Delete with the next minor version bump.
    case 'contextReference':
      return evaluateContextReference(node, context);

    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);

    case 'eventHandler':
      return evaluateEventHandler(node, context);

    case 'conditionalExpression':
      return evaluateConditionalExpression(node, context);

    // Raw string AST node (loop variables, event names, command args parsed
    // as bare strings — e.g. transition's "*background-color" property arg).
    case 'string':
      return node.value;

    // Composite expression nodes produced by the canonical parser.
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
    case 'stringPostfix':
      return evaluateStringPostfixNode(node, context);
    case 'blockLiteral':
      return makeBlockLiteralClosure(node, context);

    default: {
      const unreachable: never = node;
      throw new Error(
        `Unhandled evaluable AST node type: ${String((unreachable as { type?: unknown }).type)}`
      );
    }
  }
}

/**
 * Evaluate any AST node. Inlines fast paths for the two most common shapes
 * (literal, identifier) before dispatching to {@link evaluateKnown}.
 *
 * The parameter stays WIDE on purpose. Callers hand this nodes from the
 * interchange converter, from `buildAST` (public API) and from plugins, none of
 * which the union describes; narrowing here would push a cast to every one of
 * those call sites and prove nothing. The exhaustiveness gate lives one level
 * down, where the input really is a union member — which is also why
 * `PluginNode` is a registry payload type and NOT a union member: a
 * `type: string` member widens every narrow in that switch and makes its
 * `never` default impossible (compiler-probed, #1051).
 */
export async function evaluateAST(node: AnyNode, context: ExecutionContext): Promise<any> {
  if (!node) {
    throw new Error('Cannot evaluate null or undefined AST node');
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

  if (EVALUABLE_KIND_SET.has(node.type)) {
    return evaluateKnown(node as EvaluableNode, context);
  }

  // Allow plugins to register evaluators for custom AST node types. Checked
  // AFTER the core kinds, exactly as the old `default` arm did, so a plugin
  // cannot shadow a kind the parser emits.
  const pluginEvaluator = getRegisteredNodeEvaluator(node.type);
  if (pluginEvaluator) {
    return pluginEvaluator(toLegacyNode(node), context);
  }
  throw new Error(`Unknown AST node type: ${node.type}`);
}

/**
 * Result-based wrapper around `evaluateAST` that captures hyperscript control-flow
 * signals (halt/exit/break/continue/return) as `err()` values instead of letting
 * them propagate as exceptions. Used by the runtime's command-execution loop
 * where these signals are expected and need to be dispatched to enclosing
 * blocks rather than logged as errors. Re-throws any non-signal error.
 */
export async function evaluateASTWithResult(
  node: AnyNode,
  context: ExecutionContext
): Promise<ExecutionResult<unknown>> {
  try {
    const value = await evaluateAST(node, context);
    return ok(value);
  } catch (e) {
    if (e instanceof Error) {
      const error = e as any;
      if (error.isHalt) {
        return err({ type: 'halt' } as ExecutionSignal);
      }
      if (error.isExit) {
        return err({ type: 'exit', returnValue: error.returnValue } as ExecutionSignal);
      }
      if (error.isBreak) {
        return err({ type: 'break' } as ExecutionSignal);
      }
      if (error.isContinue) {
        return err({ type: 'continue' } as ExecutionSignal);
      }
      if (error.isReturn) {
        return err({ type: 'return', returnValue: error.returnValue } as ExecutionSignal);
      }
    }
    throw e;
  }
}

/**
 * Parse and evaluate a hyperscript expression source string using the
 * canonical evaluator. Upstream-faithful semantics: silent-null member
 * access, late-binding `this` on method extraction.
 */
/**
 * Thrown by `evaluateExpressionSync` when a node can't be evaluated without the
 * async pipeline. Callers (the upstream-parity harness shim) catch this and fall
 * back to the async `evaluateAST`.
 */
export class NotSyncEvaluable extends Error {
  constructor(nodeType: string) {
    super(`Expression node "${nodeType}" is not synchronously evaluable`);
    this.name = 'NotSyncEvaluable';
  }
}

/**
 * The pure-expression subset {@link evaluateKnownSync} can prove synchronous.
 *
 * Derived FROM the kind array rather than the other way round, which is the
 * opposite of {@link EvaluableNode} above and deliberate. That one is "every
 * `Expr` except three", so the exclusions are the thing worth naming and a
 * separate completeness check earns its keep. This one is an opt-in subset with
 * no principle behind its membership beyond "provably needs no `await`", so the
 * array IS the definition: deriving the type from it makes a missing entry
 * impossible by construction, and `satisfies` still rejects a ghost kind.
 */
const SYNC_EVALUABLE_KINDS = [
  'literal',
  'string',
  'selector',
  'identifier',
  'contextReference',
  'arrayLiteral',
  'objectLiteral',
  'asExpression',
  'stringPostfix',
  'blockLiteral',
  'memberExpression',
] as const satisfies readonly Expr['type'][];

type SyncEvaluableNode = Extract<Expr, { type: (typeof SYNC_EVALUABLE_KINDS)[number] }>;

const SYNC_EVALUABLE_KIND_SET: ReadonlySet<string> = new Set<string>(SYNC_EVALUABLE_KINDS);

/**
 * Synchronous fast-path for the *pure-expression* subset, used only by the
 * upstream-parity harness so `_hyperscript("expr")` can return a value (not a
 * Promise) — matching upstream's synchronous `_hyperscript()`. Production keeps
 * using the canonical async `evaluateAST`; anything this can't prove is
 * synchronous throws `NotSyncEvaluable` so the caller falls back to async.
 *
 * Currently covers bare selector references (`.c1`, `#id`, `<.c1/>`), which is
 * what the classRef/queryRef parity tests need.
 *
 * Split into an outer router and {@link evaluateKnownSync} for the same reason
 * {@link evaluateAST} is: the parameter must stay wide (callers pass arbitrary
 * `ASTNode`s, and the function recurses on children), but the switch must be
 * exhaustive. The router is also where a null/undefined node becomes
 * `NotSyncEvaluable('unknown')`, preserving the old `switch (n?.type)`.
 */
export function evaluateExpressionSync(node: AnyNode, context: ExecutionContext): unknown {
  const kind: unknown = node?.type;
  if (typeof kind === 'string' && SYNC_EVALUABLE_KIND_SET.has(kind)) {
    return evaluateKnownSync(node as SyncEvaluableNode, context);
  }
  throw new NotSyncEvaluable(typeof kind === 'string' ? kind : 'unknown');
}

/**
 * Exhaustive over {@link SyncEvaluableNode}. Adding a kind to
 * {@link SYNC_EVALUABLE_KINDS} without an arm here is a compile error, and an
 * arm for a kind that is not in the array is one too (the label is not
 * comparable to the narrowed type) — so the array and the switch cannot drift
 * apart in either direction.
 */
function evaluateKnownSync(node: SyncEvaluableNode, context: ExecutionContext): unknown {
  switch (node.type) {
    case 'literal':
    case 'string':
      return node.value;
    case 'selector':
      return evaluateSelectorSync(node, context);
    case 'identifier':
      return resolveIdentifierSync(node.name, context, node.scope);
    case 'contextReference':
      return resolveContextReferenceSync(node.contextType, context);
    case 'arrayLiteral':
      return node.elements.map(el => evaluateExpressionSync(el, context));
    case 'objectLiteral':
      return evaluateObjectLiteralSync(node, context);
    case 'asExpression': {
      const value = evaluateExpressionSync(node.expression, context);
      return convertValue(value, normalizeAsTargetType(node.targetType), context);
    }
    case 'stringPostfix':
      return `${evaluateExpressionSync(node.expression, context)}${node.unit}`;
    case 'blockLiteral':
      return makeBlockLiteralClosure(node, context);
    case 'memberExpression': {
      // Plain property reads only. DOM/collection targets defer to the async
      // path, which has styleRef/classref special-casing this naive read would
      // get wrong.
      const obj = evaluateExpressionSync(node.object, context);
      if (obj == null) return undefined;
      if (
        obj instanceof Element ||
        Array.isArray(obj) ||
        (typeof Node !== 'undefined' && obj instanceof Node)
      ) {
        throw new NotSyncEvaluable('memberExpression');
      }
      // `property` is an `Expr`, so `name` is only present on some members.
      // Read it structurally rather than narrowing to `identifier`: the old
      // code accepted a `name` on ANY property node, and a types-only change
      // must not shrink that.
      const prop = node.computed
        ? String(evaluateExpressionSync(node.property, context))
        : ((node.property as { name?: string }).name as string);
      const value = (obj as Record<string, unknown>)[prop];
      return typeof value === 'function'
        ? (value as (...a: unknown[]) => unknown).bind(obj)
        : value;
    }
    default: {
      const unreachable: never = node;
      throw new NotSyncEvaluable(String((unreachable as { type?: unknown }).type ?? 'unknown'));
    }
  }
}

/** Sync identifier resolution mirroring `evaluateIdentifier` (sans the async
 *  registry / reactivity hooks, which yield the same values for these reads). */
function resolveIdentifierSync(name: string, context: ExecutionContext, scope?: string): unknown {
  if (name === 'me' || name === 'my' || name === 'I') return context.me;
  if (name === 'you' || name === 'your' || name === 'yourself') return context.you;
  if (name === 'it' || name === 'its') return context.it ?? context.result;
  // `result` is the same slot under its canonical name — mirrors resultExpression.
  if (name === 'result') return context.result ?? context.it;
  if (name === 'window') return typeof window !== 'undefined' ? window : globalThis;
  if (name === 'document') return typeof document !== 'undefined' ? document : undefined;
  // Element-scoped `:name` — read from the owner element's store, no fallthrough.
  if (scope === 'element') return getElementVar(context, name);
  if (context.locals?.has(name)) return context.locals.get(name);
  if (context.globals?.has(name)) return context.globals.get(name);
  if (name.startsWith('$') && context.globals?.has(name.slice(1)))
    return context.globals.get(name.slice(1));
  // Unbound `body`/`detail`/`sender`, mirroring evaluateIdentifier (see the
  // comments there); placed after locals/globals so a user binding shadows.
  if (name === 'body' && typeof document !== 'undefined') return document.body;
  if (name === 'detail') return (context as { event?: { detail?: unknown } }).event?.detail ?? null;
  if (name === 'sender')
    return (context as { event?: { detail?: { sender?: unknown } } }).event?.detail?.sender ?? null;
  if ((context as any)[name] !== undefined) return (context as any)[name];
  if (typeof globalThis !== 'undefined' && name in globalThis)
    return (globalThis as Record<string, unknown>)[name];
  return undefined;
}

/** Sync `me`/`you`/`it`/`event`/`target` resolution mirroring `evaluateContextReference`. */
function resolveContextReferenceSync(contextType: string, context: ExecutionContext): unknown {
  switch (contextType) {
    case 'me':
      return context.me;
    case 'you':
      return context.you;
    case 'it':
      return context.it ?? context.result;
    case 'event':
      return (context as any).event;
    case 'target':
      return (context as any).target ?? (context as any).event?.target ?? context.me;
    default:
      throw new NotSyncEvaluable('contextReference');
  }
}

/** Sync object-literal evaluation mirroring `evaluateObjectLiteralNode`. */
function evaluateObjectLiteralSync(
  node: ObjectLiteralNode,
  context: ExecutionContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const property of node.properties) {
    const keyNode = property.key;
    let key: string;
    if (keyNode.type === 'identifier') {
      key = keyNode.name;
    } else if (keyNode.type === 'literal' && keyNode.valueType === 'string') {
      // `LiteralNode.value` is `unknown`; the `valueType` guard says it is a
      // string here. `String()` is a no-op on one, and object keys are
      // stringified on assignment anyway, so this cannot change behaviour.
      key = String(keyNode.value);
    } else {
      key = String(evaluateExpressionSync(keyNode, context));
    }
    result[key] = evaluateExpressionSync(property.value, context);
  }
  return result;
}

/**
 * Synchronous mirror of `evaluateSelector` for plain CSS/query selectors.
 * Style references (`*color`) and anything needing the async pipeline throw
 * `NotSyncEvaluable` to defer to the async path.
 */
function evaluateSelectorSync(node: SelectorNode, context: ExecutionContext): unknown {
  const raw = node.value;
  if (typeof raw !== 'string') throw new NotSyncEvaluable('selector');
  // Style references go through the async styleRef expression — defer.
  if (!node.fromQuery && /^\*[a-zA-Z][\w-]*$/.test(raw)) {
    throw new NotSyncEvaluable('selector');
  }
  // Query-ref `$var` / `${expr}` interpolation — mirror of `evaluateSelector`.
  // `$=` (attribute ends-with) stays literal via the `/\$[^=]/` gate.
  if (node.fromQuery && /\$[^=]/.test(raw)) {
    const { selector: built, elements } = interpolateQueryRefTemplateSync(raw, context);
    const escaped = escapeSelectorForQuery(node, built);
    const doc =
      (context?.me as { ownerDocument?: Document } | null)?.ownerDocument ??
      (typeof document !== 'undefined' ? document : null);
    if (!doc) throw new NotSyncEvaluable('selector');
    elements.forEach((el, i) => el.setAttribute('data-hs-query-id', String(i)));
    try {
      return Array.from(doc.querySelectorAll(escaped));
    } finally {
      elements.forEach(el => el.removeAttribute('data-hs-query-id'));
    }
  }
  // `.{expr}` / `#{expr}` template refs — interpolate before querying.
  const selector =
    !node.fromQuery && raw.includes('{') ? interpolateSelectorTemplateSync(raw, context) : raw;
  const escaped = escapeSelectorForQuery(node, selector);
  const doc =
    (context?.me as { ownerDocument?: Document } | null)?.ownerDocument ??
    (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new NotSyncEvaluable('selector');
  const elements = Array.from(doc.querySelectorAll(escaped));
  return resolveTargetElements(elements, selector, node.fromQuery);
}

/**
 * Synchronous counterpart to `evaluateExpressionFromSource`, used by the parity
 * harness. Parses (sync) then evaluates via `evaluateExpressionSync`, throwing
 * `NotSyncEvaluable` for anything outside the sync subset.
 */
export function evaluateExpressionFromSourceSync(
  source: string,
  context: ExecutionContext
): unknown {
  const result = parse(source);
  if (!result.success || !result.node) {
    const err = result.error ?? result.errors?.[0];
    throw new Error(`Failed to parse expression: ${err?.message ?? 'unknown error'}`);
  }
  return evaluateExpressionSync(result.node as ASTNode, context);
}

export async function evaluateExpressionFromSource(
  source: string,
  context: ExecutionContext
): Promise<any> {
  const result = parse(source);
  if (!result.success || !result.node) {
    const err = result.error ?? result.errors?.[0];
    throw new Error(`Failed to parse expression: ${err?.message ?? 'unknown error'}`);
  }
  // Standalone-eval callers (Hyperscript.eval, hyperscript-adapter,
  // features/def) are full-bundle-only paths. If the caller didn't supply
  // a registry, lazy-load the kitchen-sink one. The dynamic import here is
  // *only* reachable from full bundles — minimal/standard never call
  // `evaluateExpressionFromSource`, so rollup's `inlineDynamicImports` on
  // those configs doesn't drag the expression categories in.
  const ctx = context.registry ? context : { ...context, registry: await loadFullRegistry() };
  // `parse()` returns a single AST node for bare expressions (literal,
  // identifier, binary, member, call, selector, array, object, possessive).
  return evaluateAST(result.node as ASTNode, ctx);
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

  // Reactive dependency tracking for global reads happens HERE, before any
  // presence check, because a read of an *unset* global is still a read: an
  // effect that renders `$count` must re-run when `$count` is first assigned.
  // Firing only inside the `globals.has(name)` branches below made a `live`
  // block subscribe to nothing on its first pass (the common case — the var
  // usually doesn't exist yet), so the block never re-rendered, or re-rendered
  // one write late once some other path created the variable.
  //
  // Only unambiguously-global forms qualify: `$name` and the explicit-global
  // `::name` (scope: 'global'). A bare identifier may resolve to a local, a
  // context property or a JS built-in, and must not register a global dep.
  if (name.startsWith('$')) {
    notifyGlobalRead(name.slice(1), context);
  } else if ((node as { scope?: string }).scope === 'global') {
    notifyGlobalRead(name, context);
  }

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
  if (name === 'result') {
    return getExpr(context, 'result').evaluate(context);
  }
  if (name === 'window') {
    return getExpr(context, 'window').evaluate(context);
  }
  if (name === 'document') {
    return getExpr(context, 'document').evaluate(context);
  }
  // Explicit-global reference (`::name`). The parser tags these with
  // scope: 'global' and a bare name. They target context.globals directly
  // (ignoring any local of the same name) and must fire the global-read hook —
  // symmetric with the `::name` write path (setVariableValue('global') →
  // notifyGlobalWrite). Unlike the `$name` branch below, the name is already
  // bare, so we pass it through unchanged. Falls through to the normal lookups
  // (incl. globalThis) when the global isn't present in context.
  if ((node as { scope?: string }).scope === 'global' && context.globals?.has(name)) {
    // read hook already fired at the top of this function
    return context.globals.get(name);
  }
  // Element-scoped `:name` (parser tags these `scope: 'element'`). Reads from the
  // owner element's store and does NOT fall through to locals/globals/window —
  // unset element vars are `undefined`, matching upstream and preventing leaks.
  if ((node as { scope?: string }).scope === 'element') {
    return getElementVar(context, name);
  }
  if (context.locals && context.locals.has(name)) {
    notifyLocalRead(name, context);
    return context.locals.get(name);
  }
  if (context.globals && context.globals.has(name)) {
    return context.globals.get(name);
  }
  if (name.startsWith('$') && context.globals && context.globals.has(name.slice(1))) {
    // Hyperscript convention: `$name` identifiers look up `name` in globals
    // (matches how setVariableValue stores them). Covers both legacy parse
    // paths (identifier with `$` prefix) and the newer `globalVariable` path.
    return context.globals.get(name.slice(1));
  }
  // Bare `body` → document.body. Upstream RESERVES `body` and resolves it
  // from its Context (`this.body = document.body`); hyperfixi used to reach
  // that resolution only through the semantic path's dedicated
  // `contextReference` node, so the traditional path resolved `body` to
  // undefined and callers fell back to implicit `me` — `add .x to body`
  // classed the BUTTON. With every reference converged on `identifier`
  // (Thread B item 5) the resolution lives here, on the one spelling, placed
  // AFTER the locals/globals lookups so a user binding named `body` still
  // shadows it (hyperfixi is lenient where upstream reserves the word).
  if (name === 'body' && typeof document !== 'undefined') {
    return document.body;
  }
  // Bare `detail` / `sender` — the same class as `body`, found by auditing
  // upstream's reserved-word list after the body fix. Upstream's Context
  // derives both from the event (`this.detail = event?.detail ?? null;
  // this.sender = event?.detail?.sender ?? null`); hyperfixi resolved
  // NEITHER (`on custom log detail.num` logged undefined while
  // `event.detail.num` worked). Derived at read time from `context.event`
  // rather than stamped into the per-event context, so every hydration site
  // — DOM listener, custom-event path, and any future one — gets it for
  // free; after locals/globals, so a user binding still shadows.
  if (name === 'detail') {
    return (context as { event?: { detail?: unknown } }).event?.detail ?? null;
  }
  if (name === 'sender') {
    return (context as { event?: { detail?: { sender?: unknown } } }).event?.detail?.sender ?? null;
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
async function evaluateBinaryExpression(
  node: BinaryExpressionNode,
  context: ExecutionContext
): Promise<any> {
  const operator = node.operator;
  const rightNode = node.right as any;
  const leftNode = node.left as any;

  // Assignment (`x = value`): the LEFT operand is a target, not a value to read.
  // `=` reaches the runtime only via the assignment fragment in the pratt table
  // (comparisons use `==`/`is`), so binaryExpression('=') is unambiguously an
  // assignment. Write to the matching scope and return the assigned value.
  if (operator === '=') {
    const value = await evaluateAST(node.right, context);
    if (leftNode?.type === 'identifier' && typeof leftNode.name === 'string') {
      const name: string = leftNode.name;
      if (name.startsWith('$')) {
        setGlobal(context, name.slice(1), value);
      } else if (leftNode.scope === 'global') {
        setGlobal(context, name, value);
      } else if (leftNode.scope === 'element') {
        setElementVar(context, name, value);
      } else {
        if (!context.locals) (context as { locals?: Map<string, unknown> }).locals = new Map();
        context.locals!.set(name, value);
      }
      return value;
    }
    throw new Error(
      `Assignment target must be a variable identifier (got '${leftNode?.type ?? 'undefined'}')`
    );
  }

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

    // Scoped query selector: `<X/> in <root>` returns all descendants of <root>
    // matching X — i.e. tell <p/> in me / tell <details/> in #article2.
    // Without this, the bare `in` branch below treats the array of pre-resolved
    // <X> elements as a containment-check against <root>, returning a boolean.
    if (leftNode?.type === 'selector' && leftNode.fromQuery && typeof leftNode.value === 'string') {
      const root = await evaluateAST(node.right, context);
      const scope = root && typeof (root as any).querySelectorAll === 'function' ? root : null;
      if (scope) {
        return Array.from((scope as Element).querySelectorAll(leftNode.value));
      }
    }
  }

  // Style reference with `of`: `*color of me`, `*computed-height of it`. The left
  // operand is a `*prop` selector — read that style off the RIGHT element rather
  // than indexing it (`me["red"]`, which the generic `of` branch would do).
  if (
    operator === 'of' &&
    leftNode?.type === 'selector' &&
    typeof leftNode.value === 'string' &&
    /^\*[a-zA-Z][\w-]*$/.test(leftNode.value)
  ) {
    const el = await evaluateAST(node.right, context);
    return getExpr(context, 'styleRef').evaluate(
      context,
      leftNode.value.slice(1),
      el as HTMLElement
    );
  }

  // `X of Y` property access (upstream `_hyperscript`): the LEFT operand is a
  // property *path* applied to the RIGHT object — NOT a value to resolve in the
  // current scope. `foo of obj` → obj.foo; `a.b of obj` → obj.a.b. `of` is
  // right-associative (see pratt-parser), so `c of b of a` parses as
  // `c of (b of a)`. When the left side isn't a static path (e.g. a computed
  // member or literal index) we fall through to the generic `case 'of'` below.
  if (operator === 'of') {
    const path = propertyPathOf(node.left);
    if (path) {
      const target = await evaluateAST(node.right, context);
      let cur: unknown = target;
      for (const seg of path) {
        if (cur == null) return undefined;
        cur = isElement(cur) ? getElementProperty(cur, seg) : (cur as any)[seg];
      }
      return typeof cur === 'function' ? (cur as any).bind(target) : cur;
    }
  }

  const left = await evaluateAST(node.left, context);

  // Handle short-circuit evaluation for logical operators.
  // Return the operand (not a boolean) so chained arithmetic like
  // `($price or 0) * ($quantity or 0)` produces the expected numeric result.
  // Matches JS `||`/`&&` and upstream _hyperscript semantics; the non-short-circuit
  // branch already returns operands via `orExpression.evaluate`.
  if (operator === 'and') {
    if (!left) return left;
    const right = await evaluateAST(node.right, context);
    return getExpr(context, 'and').evaluate(context, left, right);
  }

  if (operator === 'or') {
    if (left) return left;
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
    case '+': {
      // Numeric-coerced `+` (flagged on binaries synthesized by the
      // increment/decrement → `set X to (X ± n)` rewrite). Attribute reads
      // (`@data-n`) return strings, so a plain `+` would concatenate
      // ("1" + 1 → "11"). Coerce only STRING operands so `increment @data-n`
      // counts numerically — non-strings are left to the `addition` evaluator
      // below, which already handles them (element → numeric textContent for
      // `increment #count`, undefined → 0 for an unset `:count`).
      let addLeft = left;
      let addRight = right;
      if ((node as { coerceNumeric?: boolean }).coerceNumeric) {
        if (typeof addLeft === 'string') addLeft = convertToNumber(addLeft);
        if (typeof addRight === 'string') addRight = convertToNumber(addRight);
      }
      // JS-native: `+` concatenates if either operand is a string.
      if (typeof addLeft === 'string' || typeof addRight === 'string') {
        return String(addLeft ?? '') + String(addRight ?? '');
      }
      // Upstream `_hyperscript` array semantics: when the left operand is an
      // array, `+` concatenates rather than coerces. `[1,2] + [3,4]` →
      // [1,2,3,4]; `[1,2] + 3` → [1,2,3]. Always returns a fresh array so the
      // original is never mutated.
      if (Array.isArray(addLeft)) {
        return Array.isArray(addRight) ? [...addLeft, ...addRight] : [...addLeft, addRight];
      }
      return unwrapTypedResult(
        await getExpr(context, 'addition').evaluate(context as any, {
          left: addLeft,
          right: addRight,
        })
      );
    }
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
      return getExpr(context, 'equals').evaluate(context, L, R);
    case 'is':
    case 'am': // upstream alias for `is` (e.g., `if I am .active`)
    case 'equals':
    case 'is equal': // shortened `is equal to`
    case 'is equal to': {
      // `#el is checked` / `#el is disabled`: when the RHS is a bare identifier
      // that resolved to undefined but names a boolean property on the left
      // element, upstream reads that property rather than comparing values.
      const bp = booleanPropertyFallback(node, left, right);
      return bp !== undefined ? bp : getExpr(context, 'equals').evaluate(context, L, R);
    }
    case '!=':
      return getExpr(context, 'notEquals').evaluate(context, L, R);
    case 'is not':
    case 'is not equal': // shortened `is not equal to`
    case 'is not equal to': {
      const bp = booleanPropertyFallback(node, left, right);
      return bp !== undefined ? !bp : getExpr(context, 'notEquals').evaluate(context, L, R);
    }
    case '===':
    case 'really equals':
    case 'is really': // strict equality without `equal to`
    case 'is really equal to':
      return getExpr(context, 'strictEquals').evaluate(context, L, R);
    case '!==':
    case 'is not really': // strict inequality without `equal to`
    case 'is not really equal to':
      return getExpr(context, 'strictNotEquals').evaluate(context, L, R);

    case 'as':
      // For 'as' conversion, right operand should be a string type name
      return getExpr(context, 'as').evaluate(context, left, normalizeAsTargetType(right));

    case 'contains':
    case 'contain': // singular subject — `I contain that`
    case 'includes':
    case 'include':
      return getExpr(context, 'contains').evaluate(context, L, R);

    case 'does not contain':
    case 'do not contain': // first-person negation
    case 'does not contains': // third-person + plural verb
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
      return getExpr(context, 'matches').evaluate(context, L, matchTargetOf(node.right, R));

    case 'does not match':
    case 'do not match': {
      const r = await getExpr(context, 'matches').evaluate(
        context,
        L,
        matchTargetOf(node.right, R)
      );
      return !r;
    }

    case 'in':
    case 'is in':
    case 'am in': // first-person — `I am in [1, 2]`
      return isIn(left, right);

    case 'is not in':
    case 'am not in':
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
 * Extract a static property path from an expression node for `X of Y` access.
 * `foo` → ['foo']; `a.b.c` → ['a','b','c']. Returns null when the node isn't a
 * plain identifier / dotted member chain (e.g. computed member, call, literal),
 * so the caller can fall back to generic evaluation.
 */
function propertyPathOf(node: unknown): string[] | null {
  const n = node as {
    type?: string;
    name?: string;
    object?: unknown;
    property?: { type?: string; name?: string; value?: unknown };
    computed?: boolean;
  } | null;
  if (!n) return null;
  if (n.type === 'identifier' && typeof n.name === 'string') return [n.name];
  if (n.type === 'memberExpression' && !n.computed) {
    const objPath = propertyPathOf(n.object);
    if (!objPath) return null;
    const prop = n.property;
    const propName =
      prop?.type === 'identifier' && typeof prop.name === 'string'
        ? prop.name
        : typeof prop?.value === 'string'
          ? prop.value
          : null;
    if (propName == null) return null;
    return [...objPath, propName];
  }
  return null;
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
 * `match`/`matches` semantics: a CSS-selector literal on the right
 * (`I match .foo`) tests the LEFT element against the selector *string*, not
 * against the elements that selector resolves to. So when the right operand is
 * a selector node, use its raw text; otherwise use the already-evaluated value.
 */
function matchTargetOf(rightNode: unknown, evaluated: unknown): unknown {
  const n = rightNode as { type?: string; value?: unknown } | null;
  if (n && n.type === 'selector' && typeof n.value === 'string') return n.value;
  return evaluated;
}

/**
 * Upstream `is`/`is not` fallback: `#checkbox is checked` / `#button is
 * disabled`. When the right operand is a bare identifier that resolved to
 * `undefined` and names a boolean property of the left (DOM) element, read that
 * property instead of comparing values. Returns the boolean property value, or
 * `undefined` when the fallback does not apply (callers then compare normally).
 */
function booleanPropertyFallback(
  node: { right?: unknown },
  left: unknown,
  right: unknown
): boolean | undefined {
  if (right !== undefined) return undefined; // RHS resolved → normal comparison
  const rn = node.right as { type?: string; name?: string } | null;
  if (!rn || rn.type !== 'identifier' || typeof rn.name !== 'string') return undefined;
  if (left == null || typeof left !== 'object') return undefined;
  const prop = (left as Record<string, unknown>)[rn.name];
  return typeof prop === 'boolean' ? prop === true : undefined;
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
async function evaluateAsExpressionNode(
  node: AsExpressionNode,
  context: ExecutionContext
): Promise<unknown> {
  const value = await evaluateAST(node.expression, context);
  const typeName = normalizeAsTargetType(node.targetType);
  return getExpr(context, 'as').evaluate(context, value, typeName);
}

/**
 * Evaluates `X is between A and B` / `X is not between A and B` ternary comparisons.
 */
async function evaluateBetweenExpression(
  node: BetweenExpressionNode,
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
  node: TypeCheckExpressionNode,
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
/**
 * Build the closure for a block-literal (lambda) node: `\ x, y -> body`.
 * Binds positional arguments to the declared parameters in a child scope and
 * evaluates the body. The body is evaluated synchronously when possible (so the
 * closure can be used as a synchronous JS callback, e.g. `arr.map(\ s -> …)`),
 * falling back to async evaluation for bodies the sync path can't handle.
 */
function makeBlockLiteralClosure(
  node: BlockLiteralNode,
  context: ExecutionContext
): (...args: unknown[]) => unknown {
  const params = node.parameters ?? [];
  return (...args: unknown[]) => {
    const locals = new Map(context.locals ?? new Map());
    params.forEach((name, i) => locals.set(name, args[i]));
    const childContext = { ...context, locals } as ExecutionContext;
    try {
      return evaluateExpressionSync(node.body, childContext);
    } catch (e) {
      if (e instanceof NotSyncEvaluable) {
        return evaluateAST(node.body, childContext);
      }
      throw e;
    }
  };
}

/**
 * Evaluate a string-postfix measurement expression (`1em`, `100%`, `(0 + 1) px`).
 * Mirrors upstream `_hyperscript`: `"" + value + unit`.
 */
async function evaluateStringPostfixNode(
  node: StringPostfixNode,
  context: ExecutionContext
): Promise<string> {
  const value = await evaluateAST(node.expression, context);
  return `${value}${node.unit}`;
}

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
  node: PropertyOfExpressionNode,
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

  // `the X of Y` and `Y's X` are the same access — delegate to the possessive
  // expression so a collection target maps the read over every member
  // (`the display of .foo's style` → ["inline"]) while a single element/object
  // reads identically (readPossessiveValue uses getElementProperty for
  // Elements, the same as the old single-element branch here).
  return getExpr(context, 'possessive').evaluate(context, target, propertyName);
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
  if (context.locals?.has(varName)) {
    notifyLocalRead(varName, context);
    return context.locals.get(varName);
  }
  if (varName === 'me' && context.me) return context.me;
  if (varName === 'you' && context.you) return context.you;
  // `it` and `result` are the SAME slot, as upstream (`result` is canonical,
  // `it` its alias) — so each falls back to the other. Commands self-assign
  // `it`; before the Arc C step-3 deletion, the handler-body propagation loop
  // was the only thing that also wrote `result`, which is why `put result
  // into …` worked inside a handler and nowhere else. Resolving through both
  // makes the two agree on every execution path without asking ~20 commands
  // to write the slot twice. Symmetric with the same fallback at :386/:409.
  if (varName === 'it') {
    const v = context.it ?? context.result;
    if (v) return v;
  }
  if (varName === 'result') {
    const v = context.result ?? context.it;
    if (v) return v;
  }
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
  node: CollectionExpressionNode,
  context: ExecutionContext
): Promise<any> {
  const collection = await evaluateAST(node.collection, context);

  // Null-safety (upstream _hyperscript): every collection operator passes a
  // null/undefined collection through unchanged rather than coercing it.
  // `null where it > 1` → null; `null joined by ','` → null;
  // `undefined mapped to ...` → undefined.
  if (collection == null) {
    return collection;
  }

  // Helper: evaluate the RHS AST with `it` bound to the given element.
  const evalWithIt = async (astNode: AnyNode, it: unknown): Promise<unknown> => {
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
async function evaluateUnaryExpression(
  node: UnaryExpressionNode,
  context: ExecutionContext
): Promise<any> {
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
async function evaluateMemberExpression(
  node: MemberExpressionNode,
  context: ExecutionContext
): Promise<any> {
  const object = await evaluateAST(node.object, context);

  if (node.computed) {
    // Computed access: object[property]
    const property = await evaluateAST(node.property, context);
    // Negative array indices count from the end (`arr[-1]` → last element),
    // matching common scripting conventions. Plain JS would return undefined.
    if (Array.isArray(object) && typeof property === 'number' && property < 0) {
      return object[object.length + property];
    }
    return object?.[property];
  } else {
    // Non-computed access: object.property. `property` is an `Expr`, so `name`
    // is only present on some members — read it structurally, exactly as the
    // sync twin above does, because the old code accepted a `name` on ANY
    // property node and a types-only change must not shrink that.
    const name = (node.property as { name?: string }).name as string;
    return resolveNamedProperty(object, name, context);
  }
}

/**
 * Resolve a named (non-computed) property off an already-evaluated object,
 * with hyperscript's DOM-aware semantics: `@attr` → getAttribute, Element
 * properties through getElementProperty (so `me.*background-color` and special
 * DOM props resolve), and collection mapping (`.cb.checked` → [true, false]).
 * Shared by the `memberExpression` (parser-produced) and `propertyAccess`
 * (semantic→AST-builder-produced) evaluators so both behave identically.
 */
function resolveNamedProperty(object: any, propertyName: string, context: ExecutionContext): any {
  // Handle attribute access (@attr → getAttribute)
  if (typeof propertyName === 'string' && propertyName.startsWith('@')) {
    const attrName = propertyName.substring(1);
    if (object && typeof object.getAttribute === 'function') {
      return object.getAttribute(attrName);
    }
    return undefined;
  }

  // Element property access routes through getElementProperty so that
  // `me.*background-color` (parsed as property "computed-background-color")
  // and special DOM properties resolve correctly. Plain object access
  // falls back to a direct lookup.
  if (object instanceof Element && typeof propertyName === 'string') {
    return getElementProperty(object, propertyName);
  }

  // A classRef/queryRef collection maps `.prop` over every member, so the dot
  // form matches the possessive form: `.cb.checked` === `.cb's checked` →
  // [true, false]. Same guard as the possessive evaluator (element/host
  // collections only; skips collection-own props so `.items.length` is still
  // the count) — delegate to it for one source of truth.
  if (isMappableCollection(object) && !(propertyName in (object as object))) {
    return getExpr(context, 'possessive').evaluate(context, object, propertyName);
  }

  return object?.[propertyName];
}

/**
 * Evaluate a `propertyAccess` node. The canonical core parser emits
 * `memberExpression` for dotted access, so this node type is never produced by
 * `parse()` — but the semantic→AST builder (`@lokascript/semantic`) emits
 * `propertyAccess` for property paths (e.g. `item.name`) it feeds straight into
 * this runtime. Without this case the runtime threw `Unknown AST node type:
 * propertyAccess` on otherwise-valid semantic ASTs. Resolves `object.property`
 * with the same DOM-aware semantics as non-computed member access.
 */
async function evaluatePropertyAccess(
  node: PropertyAccessNode,
  context: ExecutionContext
): Promise<any> {
  let object = await evaluateAST(node.object, context);
  // The semantic→AST builder FLATTENS a multi-segment chain
  // (`event.detail.message`) into a single dotted `property` string
  // ("detail.message") rather than nesting `propertyAccess` nodes — so a naive
  // `object["detail.message"]` lookup misses. Traverse each dot segment. A
  // single-segment property (the common case) splits to `[property]`, i.e. one
  // hop — unchanged behavior. (The core parser emits nested `memberExpression`
  // for dotted access, so only semantic-sourced nodes reach here; DOM/CSS
  // property names never contain a literal dot, so splitting is safe.)
  for (const segment of String(node.property).split('.')) {
    if (object == null) return undefined;
    object = await resolveNamedProperty(object, segment, context);
  }
  return object;
}

/**
 * `closest`/`previous`/`next` treat identifier and selector args as raw tag
 * or selector strings (`closest section` → `closest('section')`). All other
 * callees evaluate args normally.
 */
const RAW_ARG_BUILTINS = new Set(['closest', 'previous', 'next']);

async function resolveCallArgs(
  argNodes: Expr[],
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
/** Parser-attached modifiers for `next`/`previous` relative positional calls. */
interface RelativePositionalModifiers {
  from?: ASTNode;
  within?: ASTNode;
  inElt?: ASTNode;
  inSearch: boolean;
  wrapping: boolean;
}

/** Unwrap a selector result (array/collection) to a single Element, or undefined. */
function unwrapElement(value: unknown): Element | undefined {
  if (value instanceof Element) return value;
  if (Array.isArray(value)) return value[0] instanceof Element ? value[0] : undefined;
  return undefined;
}

async function evaluateCallExpression(
  node: CallExpressionNode,
  context: ExecutionContext
): Promise<any> {
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
      case 'next': {
        // Relative positional: `next <sel> from <el> [within <el>|in <coll>]
        // [with wrapping]`. The parser attaches the modifier nodes; evaluate
        // them here and pass an options object as the 3rd arg. The bare
        // `next <sel>` form (no modifiers) keeps the legacy 1-arg call.
        const relPos = (node as unknown as { relativePositional?: RelativePositionalModifiers })
          .relativePositional;
        if (relPos) {
          const from = relPos.from
            ? unwrapElement(await evaluateAST(relPos.from, context))
            : (context.me as Element | undefined);
          const within = relPos.within
            ? unwrapElement(await evaluateAST(relPos.within, context))
            : undefined;
          const inElt = relPos.inElt ? await evaluateAST(relPos.inElt, context) : undefined;
          return getExpr(context, funcName).evaluate(context, args[0], from, {
            within,
            inElt,
            inSearch: relPos.inSearch,
            wrapping: relPos.wrapping,
          });
        }
        return getExpr(context, funcName).evaluate(context, ...args);
      }
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
 *
 * The shape rule itself lives in `resolveTargetElements`
 * (`commands/helpers/target-elements.ts`), shared with the sync mirror
 * `evaluateSelectorSync` so the two halves cannot drift.
 */
async function evaluateSelector(node: SelectorNode, context: ExecutionContext): Promise<any> {
  let selector = node.value;

  // Style reference: `*color`, `*text-align`, `*computed-color`. The leading `*`
  // here is NOT the universal CSS selector — it reads a style property off the
  // context element (upstream styleRef). Route to the styleRef expression rather
  // than querySelectorAll, which would throw on `*color`.
  if (typeof selector === 'string' && !node.fromQuery && /^\*[a-zA-Z][\w-]*$/.test(selector)) {
    return getExpr(context, 'styleRef').evaluate(context, selector.slice(1));
  }

  // Query-ref `$var` / `${expr}` interpolation (upstream queryRef template form).
  // Gated to fromQuery + a `$` NOT followed by `=`, so `<[attr$='x']/>` stays
  // literal. Elements are tagged `data-hs-query-id` for the query, then untagged.
  if (typeof selector === 'string' && node.fromQuery && /\$[^=]/.test(selector)) {
    const { selector: built, elements } = await interpolateQueryRefTemplate(selector, context);
    const escaped = escapeSelectorForQuery(node, built);
    elements.forEach((el, i) => el.setAttribute('data-hs-query-id', String(i)));
    try {
      // `elementWithSelector` runs querySelectorAll synchronously inside
      // `.evaluate()`; markers stay set until the awaited result resolves, then
      // `finally` removes them — never leaking `data-hs-query-id` onto the DOM.
      return await getExpr(context, 'elementWithSelector').evaluate(context, escaped);
    } finally {
      elements.forEach(el => el.removeAttribute('data-hs-query-id'));
    }
  }

  // `.{expr}` / `#{expr}` template refs — interpolate before querying.
  if (typeof selector === 'string' && !node.fromQuery && selector.includes('{')) {
    selector = await interpolateSelectorTemplate(selector, context);
  }

  const escaped = typeof selector === 'string' ? escapeSelectorForQuery(node, selector) : selector;
  const result = await getExpr(context, 'elementWithSelector').evaluate(context, escaped);

  return resolveTargetElements(result, selector, node.fromQuery);
}

/**
 * Resolve a `contextReference` node (`me`/`you`/`it`/`target`/`event`) emitted
 * by the semantic→AST builder. `me`/`you`/`it` go through the registered
 * reference expressions (same as the identifier path); `event`/`target` read
 * the corresponding context fields, with `target` falling back to the event's
 * target and then `me`.
 */
async function evaluateContextReference(
  node: ContextReferenceNode,
  context: ExecutionContext
): Promise<any> {
  switch (node.contextType) {
    case 'me':
    case 'you':
    case 'it':
      return getExpr(context, node.contextType).evaluate(context);
    // Possessive/reflexive aliases (same set as the identifier path's Q1.6
    // aliasing): the semantic→AST builder emits the surface form as the
    // contextType (`my value` → contextReference 'my'), so resolve these to
    // their base reference instead of falling through to undefined.
    case 'my':
    case 'myself':
    case 'I':
      return getExpr(context, 'me').evaluate(context);
    case 'your':
    case 'yourself':
      return getExpr(context, 'you').evaluate(context);
    case 'its':
      return getExpr(context, 'it').evaluate(context);
    case 'event':
      return (context as any).event;
    case 'target':
      return (
        (context as any).target ??
        (context as any).event?.target ??
        getExpr(context, 'me').evaluate(context)
      );
    // Document references. The identifier path now resolves an UNBOUND
    // `body` too (after the locals/globals lookups, so a user binding still
    // shadows) — this arm's exclusivity ended with Thread B item 5, when the
    // builder stopped emitting contextReference; kept for hand-built ASTs.
    case 'body':
      return typeof document !== 'undefined' ? document.body : undefined;
    case 'document':
      return getExpr(context, 'document').evaluate(context);
    case 'window':
      return getExpr(context, 'window').evaluate(context);
    default:
      return undefined;
  }
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

// Upstream `_hyperscript` runtime.escapeSelector: a *bare* class ref (`.foo`)
// captures the LITERAL class name (the tokenizer strips author backslashes), so
// the CSS-special chars must be re-escaped before querySelectorAll. This is how
// modern utility-class names match — `.c1:foo:bar` → `.c1\:foo\:bar` (class
// literally named `c1:foo:bar`), `.group-[…]:block` likewise.
//
// NOTE (intentional, upstream-faithful): inside a *bare class ref* a colon is a
// LITERAL class char, NOT a pseudo-class — `.btn:hover` matches a class named
// `btn:hover`, not hovered `.btn`. Pseudo-class selection lives on QUERY refs
// (`<button:hover/>`), which keep the pseudo-preserving escapeClassColons path.
// Do not "fix" this back to pseudo semantics for bare refs.
const BARE_REF_ESCAPE_RE = /[:&()[\]/]/g;
function escapeBareRefSelector(selector: string): string {
  const prefix = selector[0]; // '.' (only bare class refs route here)
  return prefix + selector.slice(1).replace(BARE_REF_ESCAPE_RE, '\\$&');
}

/**
 * Choose the right escaping for a selector node before querySelectorAll:
 *   - bare class ref (`.foo`, not a `<…/>` query, no `{…}` template) → upstream
 *     escapeSelector (literal class name).
 *   - everything else (query refs, id refs, templates) → the pseudo-preserving
 *     escapeClassColons, so `<button:hover/>` etc. keep working.
 */
function escapeSelectorForQuery(node: SelectorNode, selector: string): string {
  if (!node.fromQuery && selector.startsWith('.') && !selector.includes('{')) {
    return escapeBareRefSelector(selector);
  }
  return escapeClassColons(selector);
}

// Non-query `.{expr}` / `#{expr}` template refs (upstream classRef/idRef template
// form): each `{…}` is evaluated as an EXPRESSION against the context and
// substituted — `.{'c1'}` → `.c1`, `#{id}` → `#<value-of-id>`. Gated to non-query
// refs; query refs use the `$`/`${}` interpolation syntax on a separate path, so
// their braces (inside `${…}`) are left untouched here.
function interpolateSelectorTemplateSync(selector: string, context: ExecutionContext): string {
  return selector.replace(/\{([^}]*)\}/g, (_m, inner: string) =>
    String(evaluateExpressionFromSourceSync(inner.trim(), context) ?? '')
  );
}
function interpolateSelectorTemplate(selector: string, context: ExecutionContext): Promise<string> {
  return replaceAsync(selector, /\{([^}]*)\}/g, async (_m: string, inner: string) =>
    String((await evaluateExpressionFromSource(inner.trim(), context)) ?? '')
  );
}

// Query-ref (`<…/>`) template interpolation: `$var` / `${expr}` substitute a
// local/expression (or DOM element) into the selector — upstream's queryRef
// template form (`QueryRef.parse` + `TemplatedQueryElementCollection`). Upstream
// `parseStringTemplate` reads an EXPRESSION after `$` whether or not braces are
// present, so bare `$var` and `${expr}` are the same operation (evaluate the
// inner expression); we treat them identically, which also yields element
// resolution for free. Distinct from the `.{expr}` brace form above, which is
// gated to non-query refs.
//
// `$=` (CSS attribute ends-with, `<[attr$='x']/>`) must stay literal — the regex
// only matches `$` followed by `{` or an identifier-start char, never `=`.
const QUERY_REF_INTERP_RE = /\$\{([^}]+)\}|\$([a-zA-Z_$][a-zA-Z0-9_.$]*)/g;

/** Split a fromQuery selector into literal-string and inner-expression segments. */
function scanQueryRefTemplate(selector: string): Array<{ lit: string } | { expr: string }> {
  const segs: Array<{ lit: string } | { expr: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  QUERY_REF_INTERP_RE.lastIndex = 0;
  while ((m = QUERY_REF_INTERP_RE.exec(selector)) !== null) {
    if (m.index > last) segs.push({ lit: selector.slice(last, m.index) });
    segs.push({ expr: m[1] ?? m[2] });
    last = m.index + m[0].length;
  }
  if (last < selector.length) segs.push({ lit: selector.slice(last) });
  return segs;
}

/**
 * Assemble the final selector + element list from a scan and its evaluated
 * values (one per `{ expr }` segment, in order). Interpolated Elements get the
 * upstream `[data-hs-query-id='<i>']` marker; everything else stringifies.
 */
function assembleQueryRef(
  segs: Array<{ lit: string } | { expr: string }>,
  values: unknown[]
): { selector: string; elements: Element[] } {
  let out = '';
  const elements: Element[] = [];
  let vi = 0;
  for (const s of segs) {
    if ('lit' in s) {
      out += s.lit;
      continue;
    }
    const v = values[vi++];
    if (isElement(v)) {
      out += `[data-hs-query-id='${elements.length}']`;
      elements.push(v);
    } else {
      out += String(v ?? '');
    }
  }
  return { selector: out, elements };
}

async function interpolateQueryRefTemplate(
  selector: string,
  context: ExecutionContext
): Promise<{ selector: string; elements: Element[] }> {
  const segs = scanQueryRefTemplate(selector);
  const values = await Promise.all(
    segs
      .filter((s): s is { expr: string } => 'expr' in s)
      .map(s => evaluateExpressionFromSource(s.expr, context))
  );
  return assembleQueryRef(segs, values);
}

function interpolateQueryRefTemplateSync(
  selector: string,
  context: ExecutionContext
): { selector: string; elements: Element[] } {
  const segs = scanQueryRefTemplate(selector);
  // `evaluateExpressionFromSourceSync` throws `NotSyncEvaluable` for non-sync
  // inner exprs — let it propagate so the caller falls back to the async path.
  const values = segs
    .filter((s): s is { expr: string } => 'expr' in s)
    .map(s => evaluateExpressionFromSourceSync(s.expr, context));
  return assembleQueryRef(segs, values);
}

/**
 * Evaluate possessive expressions (`element's property`).
 */
async function evaluatePossessiveExpression(
  node: PossessiveExpressionNode,
  context: ExecutionContext
): Promise<any> {
  const object = await evaluateAST(node.object, context);
  // Structural read for the same reason as `evaluateMemberExpression`: the
  // union's `property` is an `Expr` and only some members carry `name`.
  const propertyName = (node.property as { name?: string }).name;

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
  node: ConditionalExpressionNode,
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
