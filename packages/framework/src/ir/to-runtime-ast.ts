/**
 * SemanticNode → Runtime AST Converter
 *
 * Converts framework SemanticNode (LSE IR) to a structural AST format
 * that the core runtime can execute directly. Uses structural typing
 * to avoid a dependency on the core package.
 *
 * This is the canonical converter — AOT compiler delegates to it.
 *
 * The output matches the core runtime's expected node shapes:
 * - `{ type: 'command', name, args, roles }` → processCommand()
 * - `{ type: 'event', event, modifiers, body }` → adapted to executeEventHandler()
 */

import type {
  SemanticNode,
  SemanticValue,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  LoopSemanticNode,
} from '../core/types';

// =============================================================================
// Structural output types (no core package dependency)
// =============================================================================

/** Minimal AST node that the core runtime can execute. */
export interface RuntimeASTNode {
  readonly type: string;
  readonly [key: string]: unknown;
}

/** Command node shape expected by runtime's processCommand(). */
export interface RuntimeCommandNode extends RuntimeASTNode {
  readonly type: 'command';
  readonly name: string;
  readonly args: RuntimeASTNode[];
  readonly roles?: Readonly<Record<string, RuntimeASTNode>>;
  readonly modifiers?: Record<string, unknown>;
}

/** Event node shape expected by runtime's event adapter. */
export interface RuntimeEventNode extends RuntimeASTNode {
  readonly type: 'event';
  readonly event: string;
  readonly modifiers: Record<string, unknown>;
  readonly body: RuntimeASTNode[];
}

// =============================================================================
// Converter
// =============================================================================

/**
 * Convert a SemanticNode to a RuntimeASTNode that the core runtime can execute.
 *
 * @example
 * ```typescript
 * import { parseExplicit } from '@lokascript/framework/ir';
 * import { semanticNodeToRuntimeAST } from '@lokascript/framework/ir';
 *
 * const node = parseExplicit('[toggle patient:.active]');
 * const ast = semanticNodeToRuntimeAST(node);
 * // { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }], roles: { patient: ... } }
 * ```
 */
export function semanticNodeToRuntimeAST(node: SemanticNode): RuntimeASTNode {
  switch (node.kind) {
    case 'event-handler':
      return convertEventHandler(node as EventHandlerSemanticNode);

    case 'conditional':
      return convertConditional(node as ConditionalSemanticNode);

    case 'loop':
      return convertLoop(node as LoopSemanticNode);

    case 'compound': {
      const compound = node as SemanticNode & { statements?: SemanticNode[]; chainType?: string };
      const commands = (compound.statements ?? []).map(semanticNodeToRuntimeAST);
      return {
        type: 'CommandSequence',
        commands,
      };
    }

    case 'command':
    default:
      return convertCommand(node);
  }
}

function convertEventHandler(eh: EventHandlerSemanticNode): RuntimeEventNode {
  const eventValue = eh.roles.get('event');
  const eventName = eventValue && 'value' in eventValue ? String(eventValue.value) : 'click';

  const modifiers: Record<string, unknown> = {};
  if (eh.eventModifiers) {
    if (eh.eventModifiers.once) modifiers.once = true;
    if (eh.eventModifiers.debounce) modifiers.debounce = eh.eventModifiers.debounce;
    if (eh.eventModifiers.throttle) modifiers.throttle = eh.eventModifiers.throttle;
    if (eh.eventModifiers.queue) modifiers.queue = eh.eventModifiers.queue;
  }

  return {
    type: 'event',
    event: eventName,
    modifiers,
    body: (eh.body ?? []).map(semanticNodeToRuntimeAST),
  };
}

function convertCommand(node: SemanticNode): RuntimeCommandNode {
  const roles: Record<string, RuntimeASTNode> = {};
  const args: RuntimeASTNode[] = [];

  for (const [roleName, value] of node.roles) {
    const astValue = semanticValueToAST(value);
    roles[roleName] = astValue;
    args.push(astValue);
  }

  return {
    type: 'command',
    name: node.action,
    args,
    roles,
  };
}

function convertConditional(node: ConditionalSemanticNode): RuntimeASTNode {
  const conditionValue = node.roles.get('condition');
  return {
    type: 'command',
    name: 'if',
    args: conditionValue ? [semanticValueToAST(conditionValue)] : [],
    condition: conditionValue ? semanticValueToAST(conditionValue) : undefined,
    thenBranch: (node.thenBranch ?? []).map(semanticNodeToRuntimeAST),
    elseBranch: (node.elseBranch ?? []).map(semanticNodeToRuntimeAST),
  };
}

/** The loop forms core's `repeat` runs: its parser's `loopType`. */
const LOOP_FORMS = new Set(['for', 'times', 'while', 'until', 'until-event', 'forever']);

/** The text of a name-like value: a loop form, an event name. */
function valueText(value: SemanticValue | undefined): string | undefined {
  if (!value) return undefined;
  if (value.type === 'literal') return String(value.value);
  if (value.type === 'expression') return value.raw;
  if (value.type === 'reference' || value.type === 'selector') return value.value;
  return undefined;
}

/**
 * A loop as core's parser builds it (Arc 3 step 3): the form in
 * `modifiers.loopType`, the operands in `for`/`in`, `times`, `while`/`until`,
 * `event`/`from` and `index`, the body the one positional block.
 *
 * This emitted `args: [count]` with the variant and body beside it, a shape
 * `repeat` has not read since the slot migration, so every loop through
 * `evalLSE` / `compileLSE` threw "repeat command requires a loop type". The
 * form comes from a `loopType` role when it names one, since it keeps the
 * exact form (`until-event`) that `loopVariant` folds into `until`.
 */
function convertLoop(node: LoopSemanticNode): RuntimeASTNode {
  const text = (value: string): RuntimeASTNode => ({ type: 'string', value });
  const operand = (role: string): RuntimeASTNode | undefined => {
    const value = node.roles.get(role);
    return value ? semanticValueToAST(value) : undefined;
  };
  const declared = valueText(node.roles.get('loopType'));
  const form =
    node.action === 'for'
      ? 'for'
      : declared && LOOP_FORMS.has(declared)
        ? declared
        : (node.loopVariant ?? 'forever');

  const modifiers: Record<string, RuntimeASTNode> = { loopType: text(form) };
  const slot = (name: string, value: RuntimeASTNode | undefined) => {
    if (value) modifiers[name] = value;
  };
  switch (form) {
    case 'for':
      if (node.loopVariable) slot('for', text(node.loopVariable));
      slot('in', operand('source'));
      break;
    case 'times':
      // `patient` and `count` are what this read before the slot shape.
      slot('times', operand('quantity') ?? operand('patient') ?? operand('count'));
      break;
    case 'while':
    case 'until':
      slot(form, operand('condition'));
      break;
    case 'until-event': {
      const event = valueText(node.roles.get('event'));
      if (event) slot('event', text(event));
      slot('from', operand('source'));
      break;
    }
  }
  if (node.indexVariable) slot('index', text(node.indexVariable));

  return {
    type: 'command',
    name: 'repeat',
    args: [{ type: 'block', commands: (node.body ?? []).map(semanticNodeToRuntimeAST) }],
    modifiers,
  };
}

/**
 * Convert a SemanticValue to a RuntimeASTNode.
 */
export function semanticValueToAST(value: SemanticValue): RuntimeASTNode {
  switch (value.type) {
    case 'selector':
      return { type: 'selector', value: value.value as string };

    case 'reference':
      return { type: 'identifier', value: value.value as string };

    case 'literal': {
      const lit = value as { value: unknown; dataType?: string };
      if (lit.dataType === 'duration') {
        const str = String(lit.value);
        const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(str);
        if (match) {
          const ms = match[2] === 's' ? parseFloat(match[1]) * 1000 : parseFloat(match[1]);
          return { type: 'literal', value: ms };
        }
      }
      return { type: 'literal', value: lit.value as string | number | boolean | null };
    }

    case 'property-path': {
      const pp = value as import('../core/types').PropertyPathValue;
      const objectAST = semanticValueToAST(pp.object);
      return {
        type: 'member',
        object: objectAST,
        property: pp.property,
      };
    }

    case 'expression': {
      const expr = value as { raw: string };
      return { type: 'expression', value: expr.raw };
    }

    case 'flag': {
      const flag = value as { name: string; enabled: boolean };
      return { type: 'literal', value: flag.enabled };
    }

    default:
      return { type: 'literal', value: String((value as { value?: unknown }).value ?? '') };
  }
}
