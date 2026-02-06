/**
 * Interchange Format → Core Parser AST Converter
 *
 * Converts the shared interchange AST nodes back to core parser AST format,
 * enabling an "AOT compile → runtime fallback" pattern where interchange ASTs
 * can be fed directly to the core runtime for execution.
 *
 * Position handling: When interchange nodes carry source positions (from
 * `fromCoreAST`/`fromSemanticAST`), those are preserved in the output.
 * When positions are absent, synthetic positions (start: 0, end: 0, line: 1,
 * column: 0) are used. The runtime executes based on node structure, not
 * positions — positions are only used for error messages.
 */

import type { InterchangeNode, EventModifiers } from './types';

// Core AST nodes use an index signature, so we can construct them as plain objects.
interface CoreNode {
  type: string;
  [key: string]: unknown;
}

/** Synthetic position for nodes without source positions. */
const POS = { start: 0, end: 0, line: 1, column: 0 } as const;

/**
 * Get position fields from an interchange node, falling back to synthetic POS.
 */
function nodePos(node: InterchangeNode): {
  start: number;
  end: number;
  line: number;
  column: number;
} {
  return {
    start: node.start ?? POS.start,
    end: node.end ?? POS.end,
    line: node.line ?? POS.line,
    column: node.column ?? POS.column,
  };
}

/**
 * Convert an interchange node to a core parser AST node.
 */
export function toCoreAST(node: InterchangeNode): CoreNode {
  if (!node) return { type: 'literal', value: null, raw: 'null', ...POS };

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

    // Expression types
    case 'literal':
      return {
        type: 'literal',
        value: node.value,
        raw: node.value === null ? 'null' : node.value === undefined ? '' : String(node.value),
        ...nodePos(node),
      };
    case 'identifier':
      return { type: 'identifier', name: node.name ?? node.value, ...nodePos(node) };
    case 'selector':
      return { type: 'selector', value: node.value, ...nodePos(node) };
    case 'variable':
      return { type: 'identifier', name: node.name, scope: node.scope, ...nodePos(node) };
    case 'binary':
      return {
        type: 'binaryExpression',
        operator: node.operator,
        left: toCoreAST(node.left),
        right: toCoreAST(node.right),
        ...nodePos(node),
      };
    case 'unary':
      return {
        type: 'unaryExpression',
        operator: node.operator,
        argument: toCoreAST(node.operand),
        prefix: true,
        ...nodePos(node),
      };
    case 'member':
      return {
        type: 'memberExpression',
        object: toCoreAST(node.object),
        property:
          typeof node.property === 'string'
            ? { type: 'identifier', name: node.property, ...POS }
            : toCoreAST(node.property),
        computed: node.computed ?? false,
        ...nodePos(node),
      };
    case 'possessive':
      return {
        type: 'possessiveExpression',
        object: toCoreAST(node.object),
        property: { type: 'identifier', name: node.property, ...POS },
        ...nodePos(node),
      };
    case 'call':
      return {
        type: 'callExpression',
        callee: toCoreAST(node.callee),
        arguments: (node.args ?? []).map(a => toCoreAST(a)),
        ...nodePos(node),
      };
    case 'positional':
      // Wrap as a call to a positional function (e.g., first(.items))
      return {
        type: 'callExpression',
        callee: { type: 'identifier', name: node.position, ...POS },
        arguments: node.target ? [toCoreAST(node.target)] : [],
        ...nodePos(node),
      };

    default: {
      // Exhaustive check — all 16 types should be handled above
      const _exhaustive: never = node;
      return { type: 'literal', value: null, raw: 'null', ...POS };
    }
  }
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

function convertEvent(node: InterchangeNode & { type: 'event' }): CoreNode {
  const commands = (node.body ?? []).map(cmd => toCoreAST(cmd));
  const modifiers = flattenEventModifiers(node.modifiers);

  return {
    type: 'eventHandler',
    event: node.event,
    commands,
    ...modifiers,
    ...nodePos(node),
  };
}

function convertCommand(node: InterchangeNode & { type: 'command' }): CoreNode {
  const result: CoreNode = {
    type: 'command',
    name: node.name,
    args: (node.args ?? []).map(a => toCoreAST(a)),
    isBlocking: false,
    ...nodePos(node),
  };

  if (node.target) {
    result.target = toCoreAST(node.target);
  }
  if (node.modifiers && Object.keys(node.modifiers).length > 0) {
    const convertedModifiers: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node.modifiers)) {
      // Modifiers may be interchange nodes or primitives
      convertedModifiers[key] =
        value && typeof value === 'object' && 'type' in value
          ? toCoreAST(value as InterchangeNode)
          : value;
    }
    result.modifiers = convertedModifiers;
  }

  return result;
}

function convertIf(node: InterchangeNode & { type: 'if' }): CoreNode {
  const result: CoreNode = {
    type: 'command',
    name: 'if',
    isBlocking: true,
    condition: toCoreAST(node.condition),
    thenBranch: node.thenBranch.map(n => toCoreAST(n)),
    args: [],
    ...nodePos(node),
  };

  if (node.elseBranch) {
    result.elseBranch = node.elseBranch.map(n => toCoreAST(n));
  }

  return result;
}

function convertRepeat(node: InterchangeNode & { type: 'repeat' }): CoreNode {
  const result: CoreNode = {
    type: 'command',
    name: 'repeat',
    isBlocking: true,
    body: node.body.map(n => toCoreAST(n)),
    args: [],
    ...nodePos(node),
  };

  if (node.count !== undefined) {
    result.count =
      typeof node.count === 'number'
        ? { type: 'literal', value: node.count, raw: String(node.count), ...POS }
        : toCoreAST(node.count);
    result.loopVariant = 'times';
  }

  return result;
}

function convertForEach(node: InterchangeNode & { type: 'foreach' }): CoreNode {
  return {
    type: 'command',
    name: 'repeat',
    isBlocking: true,
    loopVariant: 'for',
    itemName: node.itemName,
    ...(node.indexName ? { indexName: node.indexName } : {}),
    collection: toCoreAST(node.collection),
    body: node.body.map(n => toCoreAST(n)),
    args: [],
    ...nodePos(node),
  };
}

function convertWhile(node: InterchangeNode & { type: 'while' }): CoreNode {
  return {
    type: 'command',
    name: 'repeat',
    isBlocking: true,
    loopVariant: 'while',
    condition: toCoreAST(node.condition),
    body: node.body.map(n => toCoreAST(n)),
    args: [],
    ...nodePos(node),
  };
}

/**
 * Flatten EventModifiers into flat props for eventHandler nodes.
 * Core parser stores modifiers as flat props on the eventHandler node.
 */
function flattenEventModifiers(modifiers: EventModifiers | undefined): Record<string, unknown> {
  if (!modifiers) return {};
  const flat: Record<string, unknown> = {};

  if (modifiers.once) flat.once = true;
  if (modifiers.prevent) flat.prevent = true;
  if (modifiers.stop) flat.stop = true;
  if (modifiers.capture) flat.capture = true;
  if (modifiers.passive) flat.passive = true;
  if (modifiers.debounce) flat.debounce = modifiers.debounce;
  if (modifiers.throttle) flat.throttle = modifiers.throttle;
  if (modifiers.from) flat.from = modifiers.from;

  return flat;
}
