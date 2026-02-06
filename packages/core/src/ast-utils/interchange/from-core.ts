/**
 * Core AST → Interchange Format Converter
 *
 * Converts the core parser's AST (types like 'eventHandler', 'binaryExpression',
 * 'possessiveExpression') into the shared interchange format (types like 'event',
 * 'binary', 'possessive').
 *
 * This replaces the 444-line core-parser-adapter.ts in the AOT compiler.
 */

import type {
  InterchangeNode,
  EventNode,
  CommandNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
  EventModifiers,
} from './types';

// The core parser AST is untyped from our perspective — we only need
// the structural shape, not the exact imports (avoiding circular deps).
interface CoreNode {
  type: string;
  [key: string]: unknown;
}

/**
 * Extract position fields from a source node. Returns only fields that exist,
 * so spreading the result adds nothing when positions are absent.
 */
function pos(node: CoreNode): Record<string, number> {
  const p: Record<string, number> = {};
  if (typeof node.start === 'number') p.start = node.start;
  if (typeof node.end === 'number') p.end = node.end;
  if (typeof node.line === 'number') p.line = node.line;
  if (typeof node.column === 'number') p.column = node.column;
  return p;
}

/**
 * Convert a core parser AST node to an interchange node.
 */
export function fromCoreAST(node: CoreNode): InterchangeNode {
  if (!node) return { type: 'literal', value: null };

  switch (node.type) {
    case 'eventHandler':
      return convertEventHandler(node);
    case 'command':
      return convertCommand(node);
    case 'CommandSequence':
      return convertCommandSequence(node);
    case 'block':
      return convertBlock(node);

    // Expression types
    case 'literal':
      return {
        type: 'literal',
        value: node.value as string | number | boolean | null,
        ...pos(node),
      };
    case 'string':
      return { type: 'literal', value: node.value as string, ...pos(node) };
    case 'selector':
      return {
        type: 'selector',
        value: (node.value ?? node.selector ?? '') as string,
        ...pos(node),
      };
    case 'contextReference':
      return {
        type: 'identifier',
        value: (node.name ?? node.contextType ?? '') as string,
        ...pos(node),
      };
    case 'identifier':
      return {
        type: 'identifier',
        value: (node.name ?? node.value ?? '') as string,
        name: (node.name ?? '') as string,
        ...pos(node),
      };
    case 'propertyAccess':
    case 'possessiveExpression':
      return convertPossessive(node);
    case 'memberExpression':
      return convertMember(node);
    case 'binaryExpression':
      return convertBinary(node);
    case 'callExpression':
      return convertCall(node);
    case 'unaryExpression':
      return {
        type: 'unary',
        operator: node.operator as string,
        operand: fromCoreAST((node.argument as CoreNode) ?? (node.operand as CoreNode)),
        ...pos(node),
      };
    case 'timeExpression':
      return { type: 'literal', value: node.value as number, ...pos(node) };
    case 'templateLiteral':
      return { type: 'literal', value: (node.raw ?? '') as string, ...pos(node) };
    case 'variable':
      return {
        type: 'variable',
        name: (node.name ?? '') as string,
        scope: (node.scope ?? 'local') as 'local' | 'global' | 'element',
        ...pos(node),
      };
    case 'htmlSelector':
      return {
        type: 'selector',
        value: (node.value ?? node.selector ?? '') as string,
        ...pos(node),
      };
    case 'positional':
      return {
        type: 'positional',
        position: node.position as
          | 'first'
          | 'last'
          | 'next'
          | 'previous'
          | 'closest'
          | 'parent'
          | 'random',
        ...(node.target ? { target: fromCoreAST(node.target as CoreNode) } : {}),
        ...pos(node),
      };
    case 'positionalExpression':
      return {
        type: 'positional',
        position: node.operator as
          | 'first'
          | 'last'
          | 'next'
          | 'previous'
          | 'closest'
          | 'parent'
          | 'random',
        ...(node.argument ? { target: fromCoreAST(node.argument as CoreNode) } : {}),
        ...pos(node),
      };

    default:
      return {
        type: 'literal',
        value: (node.value as string | number | boolean | null) ?? null,
        ...pos(node),
      };
  }
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

function convertEventHandler(node: CoreNode): EventNode {
  const event = (node.event ?? 'click') as string;
  const commands = (node.commands ?? node.body ?? []) as CoreNode[];
  const body = commands.map(cmd => fromCoreAST(cmd));

  const modifiers = buildEventModifiers(node);

  return { type: 'event', event, modifiers, body, ...pos(node) };
}

function convertCommand(node: CoreNode): InterchangeNode {
  const name = node.name as string;

  if (name === 'if' || name === 'unless') {
    return convertIfCommand(node);
  }
  if (name === 'repeat') {
    return convertRepeatCommand(node);
  }

  const args = ((node.args ?? []) as CoreNode[]).map(arg => fromCoreAST(arg));
  const target = node.target ? fromCoreAST(node.target as CoreNode) : undefined;
  const modifiers = node.modifiers
    ? convertModifiers(node.modifiers as Record<string, CoreNode>)
    : undefined;

  const roles = inferRoles(name, args, modifiers, target);

  return {
    type: 'command',
    name,
    args,
    ...(target ? { target } : {}),
    ...(modifiers && Object.keys(modifiers).length > 0 ? { modifiers } : {}),
    ...(roles ? { roles } : {}),
    ...pos(node),
  } as CommandNode;
}

function convertIfCommand(node: CoreNode): IfNode {
  const args = (node.args ?? []) as CoreNode[];
  let condition: InterchangeNode;
  let thenBranch: InterchangeNode[];
  let elseBranch: InterchangeNode[] | undefined;

  if (node.condition) {
    condition = fromCoreAST(node.condition as CoreNode);
    thenBranch = ((node.thenBranch ?? node.then ?? []) as CoreNode[]).map(n => fromCoreAST(n));
    elseBranch = node.elseBranch
      ? (node.elseBranch as CoreNode[]).map(n => fromCoreAST(n))
      : node.else
        ? (node.else as CoreNode[]).map(n => fromCoreAST(n))
        : undefined;
  } else {
    condition = args[0] ? fromCoreAST(args[0]) : { type: 'literal', value: true };
    thenBranch = extractBlockCommands(args[1]);
    elseBranch = args[2] ? extractBlockCommands(args[2]) : undefined;
  }

  // 'unless' → negated condition
  if ((node.name as string) === 'unless') {
    condition = { type: 'unary', operator: 'not', operand: condition };
  }

  return {
    type: 'if',
    condition,
    thenBranch,
    ...(elseBranch ? { elseBranch } : {}),
    ...pos(node),
  } as IfNode;
}

function convertRepeatCommand(node: CoreNode): InterchangeNode {
  const args = (node.args ?? []) as CoreNode[];
  if (args.length === 0) {
    return { type: 'repeat', body: [], ...pos(node) } as RepeatNode;
  }

  const loopTypeNode = args[0];
  const loopType = (loopTypeNode?.name ?? loopTypeNode?.value ?? 'forever') as string;
  const bodyBlock = args[args.length - 1];

  switch (loopType) {
    case 'times': {
      const count = args[1] ? fromCoreAST(args[1]) : undefined;
      return {
        type: 'repeat',
        count,
        body: extractBlockCommands(bodyBlock),
        ...pos(node),
      } as RepeatNode;
    }
    case 'for': {
      const itemName = (args[1]?.value ?? 'item') as string;
      const collection = args[2]
        ? fromCoreAST(args[2])
        : ({ type: 'identifier', value: '[]' } as const);
      return {
        type: 'foreach',
        itemName,
        collection,
        body: extractBlockCommands(bodyBlock),
        ...pos(node),
      } as ForEachNode;
    }
    case 'while': {
      const condition = args[1]
        ? fromCoreAST(args[1])
        : ({ type: 'literal', value: true } as const);
      return {
        type: 'while',
        condition,
        body: extractBlockCommands(bodyBlock),
        ...pos(node),
      } as WhileNode;
    }
    default:
      return { type: 'repeat', body: extractBlockCommands(bodyBlock), ...pos(node) } as RepeatNode;
  }
}

function convertCommandSequence(node: CoreNode): InterchangeNode {
  const commands = (node.commands ?? []) as CoreNode[];
  if (commands.length === 1) {
    return fromCoreAST(commands[0]);
  }
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => fromCoreAST(cmd)),
    ...pos(node),
  } as EventNode;
}

function convertBlock(node: CoreNode): InterchangeNode {
  const commands = (node.commands ?? []) as CoreNode[];
  if (commands.length === 1) {
    return fromCoreAST(commands[0]);
  }
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => fromCoreAST(cmd)),
    ...pos(node),
  } as EventNode;
}

function convertPossessive(node: CoreNode): InterchangeNode {
  const object = node.object
    ? fromCoreAST(node.object as CoreNode)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : (((node.property as CoreNode)?.name ?? (node.property as CoreNode)?.value ?? '') as string);

  return { type: 'possessive', object, property, ...pos(node) };
}

function convertMember(node: CoreNode): InterchangeNode {
  const object = node.object
    ? fromCoreAST(node.object as CoreNode)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : node.property
        ? fromCoreAST(node.property as CoreNode)
        : ({ type: 'literal', value: '' } as const);

  return {
    type: 'member',
    object,
    property,
    computed: (node.computed ?? false) as boolean,
    ...pos(node),
  };
}

function convertBinary(node: CoreNode): InterchangeNode {
  return {
    type: 'binary',
    operator: (node.operator ?? '') as string,
    left: fromCoreAST(node.left as CoreNode),
    right: fromCoreAST(node.right as CoreNode),
    ...pos(node),
  };
}

function convertCall(node: CoreNode): InterchangeNode {
  const callee =
    typeof node.callee === 'string'
      ? ({ type: 'identifier', value: node.callee, name: node.callee } as const)
      : fromCoreAST(node.callee as CoreNode);
  const args = ((node.arguments ?? node.args ?? []) as CoreNode[]).map(a => fromCoreAST(a));

  return { type: 'call', callee, args, ...pos(node) };
}

function convertModifiers(modifiers: Record<string, CoreNode>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modifiers)) {
    result[key] = fromCoreAST(value);
  }
  return result;
}

function buildEventModifiers(node: CoreNode): EventModifiers {
  return {
    ...(node.once ? { once: true } : {}),
    ...(node.debounce ? { debounce: node.debounce as number } : {}),
    ...(node.throttle ? { throttle: node.throttle as number } : {}),
    ...(node.prevent ? { prevent: true } : {}),
    ...(node.stop ? { stop: true } : {}),
    ...(node.capture ? { capture: true } : {}),
    ...(node.passive ? { passive: true } : {}),
    ...(node.from ? { from: node.from as string } : {}),
    ...(node.selector && !node.from ? { from: node.selector as string } : {}),
  };
}

function extractBlockCommands(block: CoreNode | undefined): InterchangeNode[] {
  if (!block) return [];
  if (block.type === 'block') {
    return ((block.commands ?? []) as CoreNode[]).map(cmd => fromCoreAST(cmd));
  }
  return [fromCoreAST(block)];
}

// =============================================================================
// ROLE INFERENCE
// =============================================================================

/**
 * Infer semantic roles from the core parser's positional args and modifiers.
 *
 * The core parser produces commands with positional args and modifier objects
 * but no named roles. This heuristic maps them based on command name conventions.
 *
 * Returns null if no roles can be inferred (unknown command or insufficient args).
 */
function inferRoles(
  name: string,
  args: InterchangeNode[],
  modifiers: Record<string, unknown> | undefined,
  target: InterchangeNode | undefined
): Readonly<Record<string, InterchangeNode>> | null {
  const roles: Record<string, InterchangeNode> = {};

  switch (name) {
    // set :var to value  →  destination=:var, patient=value
    case 'set': {
      if (args[0]) roles.destination = args[0];
      const toVal = modifiers?.to;
      if (toVal && typeof toVal === 'object' && 'type' in (toVal as object)) {
        roles.patient = toVal as InterchangeNode;
      } else if (args[1]) {
        roles.patient = args[1];
      }
      break;
    }

    // put value into/before/after target  →  patient=value, destination=target
    case 'put': {
      if (args[0]) roles.patient = args[0];
      // Find the modifier that indicates position (into, before, after)
      if (modifiers) {
        for (const key of ['into', 'before', 'after'] as const) {
          const val = modifiers[key];
          if (val && typeof val === 'object' && 'type' in (val as object)) {
            roles.destination = val as InterchangeNode;
            roles.method = { type: 'literal', value: key };
            break;
          }
        }
        if (typeof modifiers.position === 'string') {
          roles.method = { type: 'literal', value: modifiers.position };
        }
      }
      if (!roles.destination && target) {
        roles.destination = target;
      }
      break;
    }

    // increment/decrement :var [by amount]  →  destination=:var, quantity=amount
    case 'increment':
    case 'decrement': {
      if (args[0]) roles.destination = args[0];
      const byVal = modifiers?.by;
      if (byVal && typeof byVal === 'object' && 'type' in (byVal as object)) {
        roles.quantity = byVal as InterchangeNode;
      } else if (args[1]) {
        roles.quantity = args[1];
      }
      break;
    }

    // fetch url [as format]  →  source=url, responseType=format
    case 'fetch': {
      if (args[0]) roles.source = args[0];
      const asVal = modifiers?.as;
      if (asVal && typeof asVal === 'object' && 'type' in (asVal as object)) {
        roles.responseType = asVal as InterchangeNode;
      } else if (typeof asVal === 'string') {
        roles.responseType = { type: 'identifier', value: asVal, name: asVal };
      }
      break;
    }

    // wait duration  →  duration=arg
    case 'wait':
    case 'settle': {
      if (args[0]) roles.duration = args[0];
      break;
    }

    // toggle .class [on target]  →  patient=.class, destination=target
    case 'toggle': {
      if (args[0]) roles.patient = args[0];
      if (target) roles.destination = target;
      break;
    }

    // add .class [to target]  →  patient=.class, destination=target
    case 'add': {
      if (args[0]) roles.patient = args[0];
      if (target) roles.destination = target;
      break;
    }

    // remove .class [from target]  →  patient=.class, source=target
    case 'remove': {
      if (args[0]) roles.patient = args[0];
      if (target) roles.source = target;
      break;
    }

    // send eventName [to target]  →  patient=eventName, destination=target
    case 'send':
    case 'trigger': {
      if (args[0]) roles.patient = args[0];
      if (target) roles.destination = target;
      break;
    }

    default:
      return null;
  }

  return Object.keys(roles).length > 0 ? roles : null;
}
