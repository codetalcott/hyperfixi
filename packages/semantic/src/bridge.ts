/**
 * Runtime Bridge
 *
 * Connects the semantic parser to the HyperFixi core runtime.
 * Converts SemanticNodes to the CommandNode format expected by the runtime.
 */

import type { SemanticNode, EventHandlerSemanticNode, SemanticValue } from './types';

// =============================================================================
// CommandNode Interface (from @hyperfixi/core)
// =============================================================================

/**
 * Simplified CommandNode interface matching core runtime expectations.
 * In production, this would import from @hyperfixi/core.
 */
interface CommandNode {
  type: 'command';
  name: string;
  args: ExpressionNode[];
  modifiers?: Record<string, ExpressionNode>;
  body?: StatementNode[];
  implicitTarget?: ExpressionNode;
  isBlocking: boolean;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
}

interface EventHandlerNode {
  type: 'eventHandler';
  eventName: string;
  body: StatementNode[];
  filter?: ExpressionNode;
  modifiers?: {
    once?: boolean;
    debounce?: number;
    throttle?: number;
  };
}

type ExpressionNode = {
  type: string;
  [key: string]: unknown;
};

type StatementNode = CommandNode | EventHandlerNode | ExpressionNode;

// =============================================================================
// Semantic to Runtime Bridge
// =============================================================================

/**
 * Convert a SemanticNode to a CommandNode for runtime execution.
 */
export function toCommandNode(semantic: SemanticNode): CommandNode {
  const args: ExpressionNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  // Map semantic roles to CommandNode structure
  for (const [role, value] of semantic.roles) {
    const expr = valueToExpression(value);

    switch (role) {
      // Primary arguments (go into args array)
      case 'patient':
        args.push(expr);
        break;

      // Modifiers (go into modifiers object with preposition keys)
      case 'destination':
        // Determine appropriate preposition based on command
        if (semantic.action === 'put') {
          modifiers['into'] = expr;
        } else {
          modifiers['on'] = expr;
        }
        break;

      case 'source':
        modifiers['from'] = expr;
        break;

      case 'style':
      case 'quantity':
        modifiers['by'] = expr;
        break;

      case 'method':
        modifiers['as'] = expr;
        break;

      case 'condition':
        modifiers['if'] = expr;
        break;

      case 'event':
        // For event handlers, this becomes the event name
        args.push(expr);
        break;

      default:
        // Unknown role - add as modifier
        modifiers[role] = expr;
    }
  }

  const result: CommandNode = {
    type: 'command',
    name: semantic.action,
    args,
    isBlocking: false,
    start: semantic.metadata?.sourcePosition?.start ?? 0,
    end: semantic.metadata?.sourcePosition?.end ?? 0,
  };

  if (Object.keys(modifiers).length > 0) {
    result.modifiers = modifiers;
  }

  return result;
}

/**
 * Convert a SemanticNode to an EventHandlerNode for runtime execution.
 */
export function toEventHandlerNode(semantic: EventHandlerSemanticNode): EventHandlerNode {
  const eventValue = semantic.roles.get('event');
  const eventName = eventValue ? valueToString(eventValue) : 'click';

  const body: StatementNode[] = semantic.body.map(node => {
    if (node.kind === 'event-handler') {
      return toEventHandlerNode(node as EventHandlerSemanticNode);
    }
    return toCommandNode(node);
  });

  const result: EventHandlerNode = {
    type: 'eventHandler',
    eventName,
    body,
  };

  if (semantic.eventModifiers) {
    const mods: { once?: boolean; debounce?: number; throttle?: number } = {};
    if (semantic.eventModifiers.once !== undefined) mods.once = semantic.eventModifiers.once;
    if (semantic.eventModifiers.debounce !== undefined)
      mods.debounce = semantic.eventModifiers.debounce;
    if (semantic.eventModifiers.throttle !== undefined)
      mods.throttle = semantic.eventModifiers.throttle;
    if (Object.keys(mods).length > 0) {
      result.modifiers = mods;
    }
  }

  return result;
}

/**
 * Convert a SemanticNode to the appropriate runtime node type.
 */
export function toRuntimeNode(semantic: SemanticNode): StatementNode {
  if (semantic.kind === 'event-handler') {
    return toEventHandlerNode(semantic as EventHandlerSemanticNode);
  }
  return toCommandNode(semantic);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a SemanticValue to an ExpressionNode.
 */
function valueToExpression(value: SemanticValue): ExpressionNode {
  switch (value.type) {
    case 'literal':
      return {
        type: 'literal',
        value: value.value,
        dataType: value.dataType,
      };

    case 'selector':
      return {
        type: 'selector',
        value: value.value,
        selectorType: value.selectorKind,
      };

    case 'reference':
      return {
        type: 'identifier',
        name: value.value,
      };

    case 'property-path':
      return {
        type: 'memberExpression',
        object: valueToExpression(value.object),
        property: {
          type: 'identifier',
          name: value.property,
        },
      };

    case 'expression':
      return {
        type: 'raw',
        value: value.raw,
      };
  }
}

/**
 * Convert a SemanticValue to a string.
 */
function valueToString(value: SemanticValue): string {
  switch (value.type) {
    case 'literal':
      return String(value.value);
    case 'selector':
      return value.value;
    case 'reference':
      return value.value;
    case 'property-path':
      return `${valueToString(value.object)}'s ${value.property}`;
    case 'expression':
      return value.raw;
  }
}

// =============================================================================
// Integration API
// =============================================================================

/**
 * Parse multilingual hyperscript and return a runtime-compatible node.
 *
 * @param input Hyperscript input (any supported language)
 * @param language Source language code
 * @returns Runtime-compatible node
 */
export function parseToRuntime(input: string, language: string): StatementNode {
  // Import here to avoid circular dependency
  const { parse } = require('./parser');
  const semantic = parse(input, language);
  return toRuntimeNode(semantic);
}

/**
 * Parse multilingual hyperscript and execute it.
 * This is a placeholder - actual execution requires the core runtime.
 *
 * @param input Hyperscript input
 * @param language Source language code
 * @param context Execution context (from core runtime)
 */
export async function parseAndExecute(
  input: string,
  language: string,
  _context: unknown
): Promise<void> {
  const node = parseToRuntime(input, language);

  // In production, this would call the core runtime's execute function
  console.log('Would execute:', JSON.stringify(node, null, 2));

  // Placeholder for actual execution
  // const runtime = context.runtime;
  // await runtime.processCommand(node, context);
}
