/**
 * InterchangeNode → SemanticNode Converter
 *
 * Converts the expression-level InterchangeNode AST (from core/semantic parsers)
 * into the command-level SemanticNode IR used by LSE, MCP tools, and domain DSLs.
 *
 * This bridges the two IR pipelines in the monorepo:
 * - Pipeline A (InterchangeNode): full expression trees, 16 node types
 * - Pipeline B (SemanticNode): command-level semantics, opaque expression values
 *
 * Expression subtrees are intentionally collapsed to ExpressionValue { raw: string }
 * — LSE deliberately abstracts away expression-level detail.
 *
 * Uses structural typing for the input to avoid a dependency on the core package.
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  LoopVariant,
  EventModifiers as SemanticEventModifiers,
} from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createLoopNode,
  createLiteral,
  createSelector,
  createReference,
  createExpression,
  createPropertyPath,
} from '../core/types';
import { DEFAULT_REFERENCES } from './references';

// =============================================================================
// Structural Input Types (no core package dependency)
// =============================================================================

/**
 * Minimal interface matching InterchangeNode's structural shape.
 * Uses the `type` discriminant for dispatch. Additional fields are
 * accessed dynamically — this keeps the framework free of core imports.
 */
interface INode {
  readonly type: string;
  readonly [key: string]: unknown;
}

// =============================================================================
// Main Converter
// =============================================================================

/**
 * Convert an InterchangeNode (expression-level AST) to a SemanticNode (command-level IR).
 *
 * Handles all 16 InterchangeNode types:
 * - Command/event nodes map to corresponding SemanticNode kinds
 * - Control flow nodes (if, repeat, foreach, while) map to conditional/loop kinds
 * - Expression nodes are wrapped as `get` commands with the value as patient role
 *
 * @param node - An InterchangeNode (or structurally compatible object)
 * @returns A SemanticNode suitable for LSE rendering, protocol JSON, or MCP tools
 */
export function fromInterchangeNode(node: INode): SemanticNode {
  if (!node || typeof node !== 'object') {
    return createCommandNode('unknown', {});
  }

  switch (node.type) {
    case 'event':
      return convertEvent(node);

    case 'command':
      return convertCommand(node);

    case 'if':
      return convertIf(node);

    case 'repeat':
      return convertRepeat(node);

    case 'foreach':
      return convertForEach(node);

    case 'while':
      return convertWhile(node);

    // Expression nodes — wrap as `get` command with patient role
    default:
      return createCommandNode('get', { patient: convertValue(node) });
  }
}

// =============================================================================
// Node Converters
// =============================================================================

function convertEvent(node: INode): SemanticNode {
  const event = String(node.event ?? 'click');
  const bodyNodes = Array.isArray(node.body) ? (node.body as INode[]) : [];
  const body = bodyNodes.map(fromInterchangeNode);

  const roles: Record<SemanticRole, SemanticValue> = {
    event: createLiteral(event),
  };

  // Preserve event target if present
  if (node.target && typeof node.target === 'object') {
    roles.source = convertValue(node.target as INode);
  }

  // Bridge event modifiers
  const modifiers = node.modifiers as Record<string, unknown> | undefined;
  let eventModifiers: SemanticEventModifiers | undefined;

  if (modifiers) {
    eventModifiers = bridgeEventModifiers(modifiers);

    // InterchangeNode-only modifiers → encode as roles
    if (modifiers.prevent) roles.prevent = createLiteral(true);
    if (modifiers.stop) roles.stop = createLiteral(true);
    if (modifiers.passive) roles.passive = createLiteral(true);
    if (modifiers.capture) roles.capture = createLiteral(true);
  }

  return createEventHandlerNode('on', roles, body, undefined, eventModifiers);
}

function convertCommand(node: INode): SemanticNode {
  const name = String(node.name ?? 'unknown');
  const args = Array.isArray(node.args) ? (node.args as INode[]) : [];
  const target =
    node.target && typeof node.target === 'object' ? (node.target as INode) : undefined;
  const existingRoles = node.roles as Record<string, INode> | undefined;
  const modifiers = node.modifiers as Record<string, unknown> | undefined;

  let roles: Record<SemanticRole, SemanticValue>;

  if (existingRoles && typeof existingRoles === 'object' && Object.keys(existingRoles).length > 0) {
    // Semantic parser path: roles already present
    roles = {};
    for (const [role, value] of Object.entries(existingRoles)) {
      if (value && typeof value === 'object' && 'type' in value) {
        roles[role] = convertValue(value as INode);
      }
    }
  } else {
    // Core parser path: infer roles from command name
    roles = inferRoles(name, args, modifiers, target);
  }

  return createCommandNode(name, roles);
}

function convertIf(node: INode): SemanticNode {
  const condition =
    node.condition && typeof node.condition === 'object'
      ? convertValue(node.condition as INode)
      : createExpression('true');

  const thenBody = Array.isArray(node.thenBranch) ? (node.thenBranch as INode[]) : [];
  const thenBranch = thenBody.map(fromInterchangeNode);

  // Handle else branch — may include chained else-if
  let elseBranch: SemanticNode[] | undefined;

  const elseIfBranches = node.elseIfBranches as
    | ReadonlyArray<{ condition: INode; body: INode[] }>
    | undefined;

  if (elseIfBranches && elseIfBranches.length > 0) {
    // Chain else-if branches as nested conditionals
    elseBranch = [chainElseIfs(elseIfBranches, node.elseBranch as INode[] | undefined)];
  } else if (Array.isArray(node.elseBranch) && (node.elseBranch as INode[]).length > 0) {
    elseBranch = (node.elseBranch as INode[]).map(fromInterchangeNode);
  }

  const roles: Record<SemanticRole, SemanticValue> = { condition };
  return createConditionalNode('if', roles, thenBranch, elseBranch);
}

function chainElseIfs(
  branches: ReadonlyArray<{ condition: INode; body: INode[] }>,
  finalElse: INode[] | undefined
): SemanticNode {
  const [first, ...rest] = branches;
  const condition = convertValue(first.condition as INode);
  const thenBranch = first.body.map(fromInterchangeNode);

  let elseBranch: SemanticNode[] | undefined;
  if (rest.length > 0) {
    elseBranch = [chainElseIfs(rest, finalElse)];
  } else if (finalElse && finalElse.length > 0) {
    elseBranch = finalElse.map(fromInterchangeNode);
  }

  return createConditionalNode('if', { condition }, thenBranch, elseBranch);
}

function convertRepeat(node: INode): SemanticNode {
  const bodyNodes = Array.isArray(node.body) ? (node.body as INode[]) : [];
  const body = bodyNodes.map(fromInterchangeNode);
  const roles: Record<SemanticRole, SemanticValue> = {};

  let variant: LoopVariant;

  if (node.count !== undefined && node.count !== null) {
    variant = 'times';
    if (typeof node.count === 'number') {
      roles.quantity = createLiteral(node.count, 'number');
    } else if (typeof node.count === 'object') {
      roles.quantity = convertValue(node.count as INode);
    }
  } else if (node.whileCondition && typeof node.whileCondition === 'object') {
    variant = 'while';
    roles.condition = convertValue(node.whileCondition as INode);
  } else if (typeof node.untilEvent === 'string') {
    variant = 'until';
    roles.condition = createLiteral(node.untilEvent);
  } else {
    variant = 'forever';
  }

  return createLoopNode('repeat', roles, variant, body);
}

function convertForEach(node: INode): SemanticNode {
  const bodyNodes = Array.isArray(node.body) ? (node.body as INode[]) : [];
  const body = bodyNodes.map(fromInterchangeNode);
  const roles: Record<SemanticRole, SemanticValue> = {};

  if (node.collection && typeof node.collection === 'object') {
    roles.source = convertValue(node.collection as INode);
  }

  const itemName = typeof node.itemName === 'string' ? node.itemName : undefined;
  const indexName = typeof node.indexName === 'string' ? node.indexName : undefined;

  return createLoopNode('repeat', roles, 'for', body, itemName, indexName);
}

function convertWhile(node: INode): SemanticNode {
  const bodyNodes = Array.isArray(node.body) ? (node.body as INode[]) : [];
  const body = bodyNodes.map(fromInterchangeNode);
  const roles: Record<SemanticRole, SemanticValue> = {};

  if (node.condition && typeof node.condition === 'object') {
    roles.condition = convertValue(node.condition as INode);
  }

  return createLoopNode('repeat', roles, 'while', body);
}

// =============================================================================
// Value Conversion
// =============================================================================

/**
 * Convert an InterchangeNode to a SemanticValue.
 *
 * Simple nodes map directly to typed SemanticValue variants.
 * Complex expression nodes are collapsed to ExpressionValue { raw: string }.
 */
export function convertValue(node: INode): SemanticValue {
  switch (node.type) {
    case 'literal':
      return convertLiteral(node);

    case 'selector':
      return createSelector(String(node.value ?? ''), inferSelectorKind(String(node.value ?? '')));

    case 'identifier':
      return convertIdentifier(node);

    case 'variable':
      return convertVariable(node);

    case 'possessive':
      return createPropertyPath(
        node.object && typeof node.object === 'object'
          ? convertValue(node.object as INode)
          : createReference('me'),
        String(node.property ?? '')
      );

    // Complex expressions → collapse to raw string
    case 'binary':
    case 'unary':
    case 'member':
    case 'call':
    case 'positional':
      return createExpression(renderExpr(node));

    default:
      // Unknown type — render as expression
      if ('value' in node) return createLiteral(String(node.value ?? ''));
      return createExpression(renderExpr(node));
  }
}

function convertLiteral(node: INode): SemanticValue {
  const value = node.value;
  if (value === null || value === undefined) return createLiteral('null');

  const dataType =
    typeof value === 'number'
      ? ('number' as const)
      : typeof value === 'boolean'
        ? ('boolean' as const)
        : undefined;

  return createLiteral(value as string | number | boolean, dataType);
}

function convertIdentifier(node: INode): SemanticValue {
  const value = String(node.value ?? '');
  if (DEFAULT_REFERENCES.has(value)) {
    return createReference(value);
  }
  return createLiteral(value);
}

function convertVariable(node: INode): SemanticValue {
  const name = String(node.name ?? '');
  const scope = String(node.scope ?? 'local');

  switch (scope) {
    case 'element':
      return createExpression(`:${name}`);
    case 'global':
      return createExpression(`$${name}`);
    default:
      return createExpression(name);
  }
}

// =============================================================================
// Expression Renderer
// =============================================================================

/**
 * Recursively render an InterchangeNode expression tree to a string.
 * Used to collapse complex expressions into ExpressionValue.raw.
 */
export function renderExpr(node: INode): string {
  if (!node || typeof node !== 'object') return '';

  switch (node.type) {
    case 'literal': {
      const v = node.value;
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'string') return /\s/.test(v) ? `"${v}"` : v;
      return String(v);
    }

    case 'identifier':
      return String(node.value ?? '');

    case 'selector':
      return String(node.value ?? '');

    case 'variable': {
      const name = String(node.name ?? '');
      const scope = String(node.scope ?? 'local');
      if (scope === 'element') return `:${name}`;
      if (scope === 'global') return `$${name}`;
      return name;
    }

    case 'binary': {
      const left = node.left && typeof node.left === 'object' ? renderExpr(node.left as INode) : '';
      const right =
        node.right && typeof node.right === 'object' ? renderExpr(node.right as INode) : '';
      return `${left} ${node.operator ?? ''} ${right}`;
    }

    case 'unary': {
      const operand =
        node.operand && typeof node.operand === 'object' ? renderExpr(node.operand as INode) : '';
      return `${node.operator ?? ''} ${operand}`;
    }

    case 'member': {
      const obj =
        node.object && typeof node.object === 'object' ? renderExpr(node.object as INode) : '';
      if (node.computed && node.property && typeof node.property === 'object') {
        return `${obj}[${renderExpr(node.property as INode)}]`;
      }
      const prop =
        typeof node.property === 'string'
          ? node.property
          : node.property && typeof node.property === 'object'
            ? renderExpr(node.property as INode)
            : '';
      return `${obj}.${prop}`;
    }

    case 'possessive': {
      const obj =
        node.object && typeof node.object === 'object' ? renderExpr(node.object as INode) : '';
      return `${obj}'s ${node.property ?? ''}`;
    }

    case 'call': {
      const callee =
        node.callee && typeof node.callee === 'object' ? renderExpr(node.callee as INode) : '';
      const args = Array.isArray(node.args)
        ? (node.args as INode[]).map(a => renderExpr(a)).join(', ')
        : '';
      return `${callee}(${args})`;
    }

    case 'positional': {
      const target =
        node.target && typeof node.target === 'object' ? renderExpr(node.target as INode) : '';
      return target ? `${node.position ?? ''} ${target}` : String(node.position ?? '');
    }

    default:
      if ('value' in node) return String(node.value ?? '');
      return '';
  }
}

// =============================================================================
// Role Inference
// =============================================================================

/**
 * Marker-keyword sets — mirror the runtime command parsers' skip lists so the
 * inferred roles point at the real value, not the literal marker word.
 */
const SCROLL_MARKERS: ReadonlySet<string> = new Set([
  'to',
  'of',
  'the',
  'top',
  'bottom',
  'middle',
  'center',
  'nearest',
  'left',
  'right',
  'smoothly',
  'instantly',
]);
const URL_MARKERS: ReadonlySet<string> = new Set(['url']);
const PARTIALS_IN_MARKERS: ReadonlySet<string> = new Set(['partials', 'in']);

/**
 * Return the first arg that isn't a marker identifier from the given set.
 * Identifier args carry the marker word in `name` (or `value` as a fallback).
 */
function firstNonMarkerArg(args: INode[], markers: ReadonlySet<string>): INode | undefined {
  for (const a of args) {
    if (a.type === 'identifier') {
      const ident = a as { name?: unknown; value?: unknown };
      const word = typeof ident.name === 'string' ? ident.name : ident.value;
      if (typeof word === 'string' && markers.has(word)) continue;
    }
    return a;
  }
  return undefined;
}

/**
 * Infer semantic roles from command name, positional args, modifiers, and target.
 * Mirrors the heuristics in core's from-core.ts inferRoles() function.
 */
function inferRoles(
  name: string,
  args: INode[],
  modifiers: Record<string, unknown> | undefined,
  target: INode | undefined
): Record<SemanticRole, SemanticValue> {
  const roles: Record<SemanticRole, SemanticValue> = {};

  switch (name) {
    case 'set': {
      if (args[0]) roles.destination = convertValue(args[0]);
      const toVal = modifiers?.to;
      if (toVal && typeof toVal === 'object' && 'type' in (toVal as object)) {
        roles.patient = convertValue(toVal as INode);
      } else if (args[1]) {
        roles.patient = convertValue(args[1]);
      }
      break;
    }

    case 'put': {
      if (args[0]) roles.patient = convertValue(args[0]);
      if (modifiers) {
        for (const key of ['into', 'before', 'after'] as const) {
          const val = modifiers[key];
          if (val && typeof val === 'object' && 'type' in (val as object)) {
            roles.destination = convertValue(val as INode);
            roles.method = createLiteral(key);
            break;
          }
        }
      }
      if (!roles.destination && target) {
        roles.destination = convertValue(target);
      }
      break;
    }

    case 'increment':
    case 'decrement': {
      if (args[0]) roles.destination = convertValue(args[0]);
      const byVal = modifiers?.by;
      if (byVal && typeof byVal === 'object' && 'type' in (byVal as object)) {
        roles.quantity = convertValue(byVal as INode);
      } else if (args[1]) {
        roles.quantity = convertValue(args[1]);
      }
      break;
    }

    case 'fetch': {
      if (args[0]) roles.source = convertValue(args[0]);
      const asVal = modifiers?.as;
      if (asVal && typeof asVal === 'object' && 'type' in (asVal as object)) {
        roles.responseType = convertValue(asVal as INode);
      } else if (typeof asVal === 'string') {
        roles.responseType = createLiteral(asVal);
      }
      break;
    }

    case 'wait':
    case 'settle': {
      if (args[0]) roles.duration = convertValue(args[0]);
      break;
    }

    case 'toggle':
    case 'add':
    case 'show':
    case 'hide': {
      if (args[0]) roles.patient = convertValue(args[0]);
      if (target) roles.destination = convertValue(target);
      break;
    }

    case 'remove': {
      if (args[0]) roles.patient = convertValue(args[0]);
      if (target) roles.source = convertValue(target);
      break;
    }

    case 'send':
    case 'trigger': {
      if (args[0]) roles.patient = convertValue(args[0]);
      if (target) roles.destination = convertValue(target);
      break;
    }

    case 'log': {
      if (args[0]) roles.patient = convertValue(args[0]);
      break;
    }

    // scroll [to] [position] target [smoothly|instantly]  →  destination=target
    case 'scroll': {
      const t = firstNonMarkerArg(args, SCROLL_MARKERS);
      if (t) roles.destination = convertValue(t);
      break;
    }

    // push|replace url <X>  →  patient=X
    case 'push':
    case 'replace': {
      const t = firstNonMarkerArg(args, URL_MARKERS);
      if (t) roles.patient = convertValue(t);
      break;
    }

    // process partials in <X>  →  patient=X
    case 'process': {
      const t = firstNonMarkerArg(args, PARTIALS_IN_MARKERS);
      if (t) roles.patient = convertValue(t);
      break;
    }

    default: {
      // Generic fallback: first arg as patient, target as destination
      if (args[0]) roles.patient = convertValue(args[0]);
      if (target) roles.destination = convertValue(target);
      break;
    }
  }

  return roles;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Infer selectorKind from a CSS selector string.
 */
function inferSelectorKind(
  value: string
): 'id' | 'class' | 'attribute' | 'element' | 'complex' | undefined {
  if (!value) return undefined;
  if (value.startsWith('#')) return 'id';
  if (value.startsWith('.')) return 'class';
  if (value.startsWith('[')) return 'attribute';
  if (value.startsWith('<') || value.startsWith('*')) return 'element';
  // Check for combinators indicating complex selectors
  if (/[>\+~ ]/.test(value) && value.length > 1) return 'complex';
  return undefined;
}

/**
 * Infer a SemanticValue from a string (for event modifier `from` bridging).
 */
function inferValueFromString(value: string): SemanticValue {
  if (DEFAULT_REFERENCES.has(value)) return createReference(value);
  const kind = inferSelectorKind(value);
  if (kind) return createSelector(value, kind);
  return createLiteral(value);
}

/**
 * Bridge InterchangeNode EventModifiers to SemanticNode EventModifiers.
 */
function bridgeEventModifiers(mods: Record<string, unknown>): SemanticEventModifiers | undefined {
  const once = mods.once === true ? true : undefined;
  const debounce = typeof mods.debounce === 'number' ? mods.debounce : undefined;
  const throttle = typeof mods.throttle === 'number' ? mods.throttle : undefined;
  const from = typeof mods.from === 'string' ? inferValueFromString(mods.from) : undefined;

  if (
    once === undefined &&
    debounce === undefined &&
    throttle === undefined &&
    from === undefined
  ) {
    return undefined;
  }

  return {
    ...(once !== undefined ? { once } : {}),
    ...(debounce !== undefined ? { debounce } : {}),
    ...(throttle !== undefined ? { throttle } : {}),
    ...(from !== undefined ? { from } : {}),
  };
}
