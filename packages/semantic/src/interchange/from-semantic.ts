/**
 * Semantic AST → Interchange Format Converter
 *
 * Converts the semantic package's AST builder output (types like 'eventHandler',
 * 'binaryExpression', 'possessiveExpression') into the shared interchange format
 * (types like 'event', 'binary', 'possessive').
 *
 * Also handles event modifier normalization — the semantic parser may store
 * modifiers in a nested `eventModifiers` object, which is flattened here.
 *
 * This replaces the 586-line semantic-adapter.ts in the AOT compiler.
 */

// Import types from local copy (structurally identical to core's interchange types).
// The semantic package has no dependency on @lokascript/core — types are duplicated here.
// TypeScript structural typing ensures compatibility when both are used by a consumer.
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

// Re-export the types so consumers can get everything from one place.
export type { InterchangeNode, EventModifiers } from './types';

// The semantic AST builder output is untyped from our perspective.
interface SemanticASTNode {
  type: string;
  [key: string]: unknown;
}

/**
 * Extract position fields from a source node. Returns only fields that exist,
 * so spreading the result adds nothing when positions are absent.
 */
function pos(node: SemanticASTNode): Record<string, number> {
  const p: Record<string, number> = {};
  if (typeof node.start === 'number') p.start = node.start;
  if (typeof node.end === 'number') p.end = node.end;
  if (typeof node.line === 'number') p.line = node.line;
  if (typeof node.column === 'number') p.column = node.column;
  return p;
}

/**
 * Convert a semantic AST builder node to an interchange node.
 */
export function fromSemanticAST(node: SemanticASTNode): InterchangeNode {
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
    case 'if':
      return convertIfNode(node);

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
      return convertPropertyAccess(node);
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
        operand: fromSemanticAST(node.operand as SemanticASTNode),
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

function convertEventHandler(node: SemanticASTNode): EventNode {
  const event = (node.event ?? 'click') as string;
  const commands = (node.commands ?? []) as SemanticASTNode[];
  const body = commands.map(cmd => fromSemanticAST(cmd));

  const modifiers = buildEventModifiers(node);

  return { type: 'event', event, modifiers, body, ...pos(node) };
}

function convertCommand(node: SemanticASTNode): InterchangeNode {
  const name = node.name as string;

  if (name === 'if' || name === 'unless') return convertIfCommand(node);
  if (name === 'repeat') return convertRepeatCommand(node);

  const args = ((node.args ?? []) as SemanticASTNode[]).map(arg => fromSemanticAST(arg));
  const target = node.target ? fromSemanticAST(node.target as SemanticASTNode) : undefined;
  const modifiers = node.modifiers
    ? convertModifiers(node.modifiers as Record<string, SemanticASTNode>)
    : undefined;

  return {
    type: 'command',
    name,
    args,
    ...(target ? { target } : {}),
    ...(modifiers && Object.keys(modifiers).length > 0 ? { modifiers } : {}),
    ...pos(node),
  } as CommandNode;
}

function convertIfCommand(node: SemanticASTNode): IfNode {
  const args = (node.args ?? []) as SemanticASTNode[];
  let condition: InterchangeNode = args[0]
    ? fromSemanticAST(args[0])
    : { type: 'literal', value: true };
  const thenBranch = extractBlockCommands(args[1]);
  const elseBranch = args[2] ? extractBlockCommands(args[2]) : undefined;

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

function convertRepeatCommand(node: SemanticASTNode): InterchangeNode {
  const args = (node.args ?? []) as SemanticASTNode[];
  if (args.length === 0) {
    return { type: 'repeat', body: [], ...pos(node) } as RepeatNode;
  }

  const loopTypeNode = args[0];
  const loopType = (loopTypeNode?.name ?? loopTypeNode?.value ?? 'forever') as string;
  const bodyBlock = args[args.length - 1];

  switch (loopType) {
    case 'times': {
      const count = args[1] ? fromSemanticAST(args[1]) : undefined;
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
        ? fromSemanticAST(args[2])
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
        ? fromSemanticAST(args[1])
        : ({ type: 'literal', value: true } as const);
      return {
        type: 'while',
        condition,
        body: extractBlockCommands(bodyBlock),
        ...pos(node),
      } as WhileNode;
    }
    case 'until': {
      const condition = args[1]
        ? fromSemanticAST(args[1])
        : ({ type: 'literal', value: false } as const);
      return {
        type: 'while',
        condition: { type: 'unary', operator: 'not', operand: condition },
        body: extractBlockCommands(bodyBlock),
        ...pos(node),
      } as WhileNode;
    }
    default:
      return { type: 'repeat', body: extractBlockCommands(bodyBlock), ...pos(node) } as RepeatNode;
  }
}

function convertCommandSequence(node: SemanticASTNode): InterchangeNode {
  const commands = (node.commands ?? []) as SemanticASTNode[];
  if (commands.length === 1) return fromSemanticAST(commands[0]);
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => fromSemanticAST(cmd)),
    ...pos(node),
  } as EventNode;
}

function convertBlock(node: SemanticASTNode): InterchangeNode {
  const commands = (node.commands ?? []) as SemanticASTNode[];
  if (commands.length === 1) return fromSemanticAST(commands[0]);
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => fromSemanticAST(cmd)),
    ...pos(node),
  } as EventNode;
}

function convertIfNode(node: SemanticASTNode): IfNode {
  const condition = node.condition
    ? fromSemanticAST(node.condition as SemanticASTNode)
    : ({ type: 'literal', value: true } as const);
  const thenBranch = ((node.thenBranch ?? []) as SemanticASTNode[]).map(n => fromSemanticAST(n));
  const elseBranch = node.elseBranch
    ? (node.elseBranch as SemanticASTNode[]).map(n => fromSemanticAST(n))
    : undefined;

  return {
    type: 'if',
    condition,
    thenBranch,
    ...(elseBranch ? { elseBranch } : {}),
    ...pos(node),
  } as IfNode;
}

function convertPropertyAccess(node: SemanticASTNode): InterchangeNode {
  const object = node.object
    ? fromSemanticAST(node.object as SemanticASTNode)
    : ({ type: 'identifier', value: 'me' } as const);
  return { type: 'possessive', object, property: (node.property ?? '') as string, ...pos(node) };
}

function convertPossessive(node: SemanticASTNode): InterchangeNode {
  const object = node.object
    ? fromSemanticAST(node.object as SemanticASTNode)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : (((node.property as SemanticASTNode)?.name ??
          (node.property as SemanticASTNode)?.value ??
          '') as string);

  return { type: 'possessive', object, property, ...pos(node) };
}

function convertMember(node: SemanticASTNode): InterchangeNode {
  const object = node.object
    ? fromSemanticAST(node.object as SemanticASTNode)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : node.property
        ? fromSemanticAST(node.property as SemanticASTNode)
        : ({ type: 'literal', value: '' } as const);

  return {
    type: 'member',
    object,
    property,
    computed: (node.computed ?? false) as boolean,
    ...pos(node),
  };
}

function convertBinary(node: SemanticASTNode): InterchangeNode {
  return {
    type: 'binary',
    operator: (node.operator ?? '') as string,
    left: fromSemanticAST(node.left as SemanticASTNode),
    right: fromSemanticAST(node.right as SemanticASTNode),
    ...pos(node),
  };
}

function convertCall(node: SemanticASTNode): InterchangeNode {
  const callee =
    typeof node.callee === 'string'
      ? ({ type: 'identifier', value: node.callee, name: node.callee } as const)
      : fromSemanticAST(node.callee as SemanticASTNode);
  const args = ((node.arguments ?? node.args ?? []) as SemanticASTNode[]).map(a =>
    fromSemanticAST(a)
  );

  return { type: 'call', callee, args, ...pos(node) };
}

function convertModifiers(modifiers: Record<string, SemanticASTNode>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modifiers)) {
    result[key] = fromSemanticAST(value);
  }
  return result;
}

/** Build EventModifiers from flat and nested properties. */
function buildEventModifiers(node: SemanticASTNode): EventModifiers {
  const em = node.eventModifiers as Record<string, unknown> | undefined;
  return {
    ...(node.once || em?.once ? { once: true } : {}),
    ...(node.debounce || em?.debounce
      ? { debounce: (node.debounce ?? em?.debounce) as number }
      : {}),
    ...(node.throttle || em?.throttle
      ? { throttle: (node.throttle ?? em?.throttle) as number }
      : {}),
    ...(node.prevent || em?.prevent ? { prevent: true } : {}),
    ...(node.stop || em?.stop ? { stop: true } : {}),
    ...(node.capture || em?.capture ? { capture: true } : {}),
    ...(node.passive || em?.passive ? { passive: true } : {}),
    ...(node.from || em?.from
      ? { from: (node.from ?? em?.from) as string }
      : node.selector
        ? { from: node.selector as string }
        : {}),
  };
}

function extractBlockCommands(block: SemanticASTNode | undefined): InterchangeNode[] {
  if (!block) return [];
  if (block.type === 'block') {
    return ((block.commands ?? []) as SemanticASTNode[]).map(cmd => fromSemanticAST(cmd));
  }
  return [fromSemanticAST(block)];
}
