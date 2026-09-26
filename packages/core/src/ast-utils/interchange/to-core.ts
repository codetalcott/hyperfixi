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

    case 'error':
      // Error nodes don't roundtrip — produce a placeholder
      return { type: 'literal', value: null, raw: 'null', ...POS };

    default: {
      // Exhaustive check — all types should be handled above
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

/** A body as core's parser holds one: a block of commands. */
function block(nodes: readonly InterchangeNode[]): CoreNode {
  return { type: 'block', commands: nodes.map(n => toCoreAST(n)), ...POS };
}

/**
 * An `if` as core's parser builds it: `args: [condition, then-block,
 * else-block?]`. This wrote `condition`, `thenBranch` and `elseBranch` beside
 * empty args, so every `if` it converted threw "if command requires a
 * condition to evaluate". `else if` branches nest in the else block, as they
 * do in the parse.
 */
function convertIf(node: InterchangeNode & { type: 'if' }): CoreNode {
  const [elseIf, ...laterElseIfs] = node.elseIfBranches ?? [];
  const elseBranch: readonly InterchangeNode[] | undefined = elseIf
    ? [
        {
          type: 'if',
          condition: elseIf.condition,
          thenBranch: elseIf.body,
          elseIfBranches: laterElseIfs,
          ...(node.elseBranch ? { elseBranch: node.elseBranch } : {}),
        },
      ]
    : node.elseBranch;
  return {
    type: 'command',
    name: 'if',
    isBlocking: true,
    args: [
      toCoreAST(node.condition),
      block(node.thenBranch),
      ...(elseBranch ? [block(elseBranch)] : []),
    ],
    ...nodePos(node),
  };
}

type LoopNode = InterchangeNode & { type: 'repeat' | 'foreach' | 'while' };

/**
 * A loop as core's parser builds it (Arc 3 step 3): the form and operands in
 * `modifiers` (`loopType`, `for`/`in`, `times`, `while`/`until`,
 * `event`/`from`, `index`, `bottomTested`), and only the body block and an
 * `else` block positional.
 *
 * This wrote `loopVariant`, `count`, `condition` and `body` beside empty args,
 * which `repeat` has not read since the slot migration: every loop it
 * converted threw "repeat command requires a loop type".
 */
function loopCommand(
  node: LoopNode,
  form: string,
  operands: Record<string, CoreNode | undefined>
): CoreNode {
  const modifiers: Record<string, CoreNode> = { loopType: slotString(form) };
  for (const [slot, value] of Object.entries(operands)) {
    if (value) modifiers[slot] = value;
  }
  if (node.indexName) modifiers.index = slotString(node.indexName);
  return {
    type: 'command',
    name: 'repeat',
    isBlocking: true,
    args: [block(node.body), ...(node.elseBody ? [block(node.elseBody)] : [])],
    modifiers,
    ...nodePos(node),
  };
}

/** A text slot (`loopType`, `for`, `event`, `index`), as core's parser writes one. */
function slotString(value: string): CoreNode {
  return { type: 'string', value, ...POS };
}

function convertRepeat(node: InterchangeNode & { type: 'repeat' }): CoreNode {
  if (node.count !== undefined) {
    const times =
      typeof node.count === 'number'
        ? { type: 'literal', value: node.count, raw: String(node.count), ...POS }
        : toCoreAST(node.count);
    return loopCommand(node, 'times', { times });
  }
  if (node.whileCondition !== undefined) {
    return loopCommand(node, 'while', { while: toCoreAST(node.whileCondition) });
  }
  if (node.untilEvent !== undefined) {
    return loopCommand(node, 'until-event', {
      event: slotString(node.untilEvent),
      from: node.untilEventTarget ? toCoreAST(node.untilEventTarget) : undefined,
    });
  }
  return loopCommand(node, 'forever', {});
}

function convertForEach(node: InterchangeNode & { type: 'foreach' }): CoreNode {
  return loopCommand(node, 'for', {
    for: slotString(node.itemName),
    in: toCoreAST(node.collection),
  });
}

/** `until <cond>` arrives as `while not <cond>`, which runs the same. */
function convertWhile(node: InterchangeNode & { type: 'while' }): CoreNode {
  return loopCommand(node, 'while', {
    while: toCoreAST(node.condition),
    bottomTested: node.bottomTested
      ? { type: 'literal', value: true, raw: 'true', ...POS }
      : undefined,
  });
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
