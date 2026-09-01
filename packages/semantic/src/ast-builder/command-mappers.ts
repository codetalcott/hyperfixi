/**
 * Command-specific AST Mappers
 *
 * Each command can have a custom mapper that knows how to convert
 * its semantic roles to the appropriate AST structure.
 */

import type { CommandSemanticNode, ActionType, SemanticValue, SemanticRole } from '../types';
import { convertValue, isImplicitValue } from './value-converters';
import type { ASTBuilder, CommandNode } from './index';
import type { ExpressionNode, LiteralNode } from './expression-parser';
import { getSchema, type AstShape } from '../generators/command-schemas';

// =============================================================================
// Command Mapper Interface
// =============================================================================

/**
 * Result from command mapping, including the AST and any warnings.
 */
export interface CommandMapperResult {
  ast: CommandNode;
  warnings: string[];
}

/**
 * Interface for command-specific AST mappers.
 */
export interface CommandMapper {
  /**
   * The action type this mapper handles.
   */
  readonly action: ActionType;

  /**
   * Convert a CommandSemanticNode to a CommandNode.
   *
   * @param node - The semantic command node
   * @param builder - The AST builder (for recursive building if needed)
   * @returns The AST command node with any warnings, or just the AST node for backward compatibility
   */
  toAST(node: CommandSemanticNode, builder: ASTBuilder): CommandMapperResult | CommandNode;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a semantic value from a node's roles, returning undefined if not present
 * OR if it is a materialized default rather than authored text.
 *
 * `args` and `modifiers` are the SYNTAX surface — they record what the author
 * wrote. A schema default the matcher filled in (`focus` -> patient `me`,
 * `increment :x` -> quantity `1`) is tagged `implicit` and is deliberately NOT
 * reproduced here: the runtime already applies every one of those defaults at
 * execution, and forging them into `args` makes the AST claim `focus me` was
 * typed when `focus` was.
 *
 * The value is not lost — `ASTBuilder.buildCommand` attaches the FULL role map,
 * implicit values included, as `semanticRoles`. A consumer that wants the
 * resolved target reads it there. See {@link isImplicitValue}.
 */
function getRole(node: CommandSemanticNode, role: SemanticRole): SemanticValue | undefined {
  const value = node.roles.get(role);
  return isImplicitValue(value) ? undefined : value;
}

/**
 * Convert a semantic value to an AST expression, or return undefined.
 *
 * @param node - The semantic node containing roles
 * @param role - The semantic role to extract
 * @param warnings - Optional array to collect warnings
 */
function convertRoleValue(
  node: CommandSemanticNode,
  role: SemanticRole,
  warnings?: string[]
): ExpressionNode | undefined {
  const value = getRole(node, role);
  return value ? convertValue(value, warnings) : undefined;
}

/**
 * Create a basic command node with standard structure.
 * Handles exactOptionalPropertyTypes by not including undefined properties.
 */
function createCommandNode(
  name: string,
  args: ExpressionNode[] = [],
  modifiers?: Record<string, ExpressionNode>,
  options: {
    isBlocking?: boolean;
    implicitTarget?: ExpressionNode;
    semanticRoles?: Record<string, ExpressionNode>;
  } = {}
): CommandNode {
  const result: CommandNode = {
    type: 'command',
    name,
    args,
  };

  // Only add optional properties if they have values (exactOptionalPropertyTypes)
  if (modifiers && Object.keys(modifiers).length > 0) {
    (result as { modifiers: Record<string, ExpressionNode> }).modifiers = modifiers;
  }

  if (options.isBlocking) {
    (result as { isBlocking: boolean }).isBlocking = options.isBlocking;
  }

  if (options.implicitTarget) {
    (result as { implicitTarget: ExpressionNode }).implicitTarget = options.implicitTarget;
  }

  if (options.semanticRoles && Object.keys(options.semanticRoles).length > 0) {
    (result as unknown as Record<string, unknown>)['semanticRoles'] = options.semanticRoles;
  }

  return result;
}

// =============================================================================
// Command Mappers
// =============================================================================

/**
 * Wait command mapper.
 */
const waitMapper: CommandMapper = {
  action: 'wait',
  toAST(node, _builder) {
    // Event wait (`wait for transitionend [from document]`) — the runtime's
    // WaitCommand reads the event from `modifiers.for` and the listen target
    // from `modifiers.from`. The event role is set by the en
    // `wait-en-for-event` head, the known-event duration→event relabel
    // (normalizeCommandRoles), or the trailing event-name reclaim
    // (buildEventHandler).
    const event = convertRoleValue(node, 'event');
    if (event) {
      const modifiers: Record<string, ExpressionNode> = { for: event };
      const source = convertRoleValue(node, 'source');
      if (source) modifiers.from = source;
      return createCommandNode('wait', [], modifiers, { isBlocking: true });
    }

    const duration = convertRoleValue(node, 'duration');

    const args: ExpressionNode[] = duration ? [duration] : [];

    return createCommandNode('wait', args, undefined, { isBlocking: true });
  },
};

/**
 * Put command mapper.
 *
 * Semantic: put patient:"hello" destination:#output manner:into
 * AST: { name: 'put', args: ["hello"], modifiers: { into: #output } }
 */
const putMapper: CommandMapper = {
  action: 'put',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');
    // The handcrafted put patterns record the position phrase in `manner`
    // (before / after / at end of / at start of). `method` is kept as a
    // fallback for any older producer. Reading only `method` was a latent
    // bug: `put X before Y` silently built a put-INTO AST.
    const position = getRole(node, 'manner') ?? getRole(node, 'method');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) {
      const prep = position?.type === 'literal' ? String(position.value) : 'into';
      modifiers[prep] = destination;
    }

    return createCommandNode('put', args, modifiers);
  },
};

/**
 * Go command mapper (navigation).
 *
 * The runtime's GoCommand reads ONLY positional args (never modifiers):
 *   args[0] === 'back'          → history back
 *   args includes 'url'         → next arg is the URL (go [to] url "/page")
 *   arg starts with '/'/scheme  → bare-URL navigation
 *   otherwise                   → scroll (go to top of #header)
 *
 * Semantic: go destination:/page [method:url]
 * AST: { name: 'go', args: ['url', '/page'] } | { args: ['back'] } | { args: [<dest>] }
 */
const goMapper: CommandMapper = {
  action: 'go',
  toAST(node, _builder) {
    const dest = getRole(node, 'destination');
    const method = getRole(node, 'method');

    const args: ExpressionNode[] = [];

    const rawDest =
      dest && 'value' in dest ? dest.value : (dest as { raw?: unknown } | undefined)?.raw;
    if (dest && String(rawDest) === 'back') {
      // The runtime keys on the string 'back'; an expression-typed capture
      // would evaluate as a variable lookup instead. `string`, not `literal`:
      // that is the node the traditional parser's parseGoCommand emits for
      // structural keywords (Thread B item 5 — one spelling per meaning).
      args.push({ type: 'string', value: 'back' } as ExpressionNode);
    } else if (dest) {
      if (method && String('value' in method ? method.value : undefined) === 'url') {
        args.push({ type: 'string', value: 'url' } as ExpressionNode);
      }
      const destExpr = convertRoleValue(node, 'destination');
      if (destExpr) args.push(destExpr);
    }

    return createCommandNode('go', args, {});
  },
};

// =============================================================================
// Tier 3: Advanced Commands
// =============================================================================

/**
 * Pick command mapper.
 *
 * Bridges the semantic `pick` node (roles method/patient/source, produced by the
 * handcrafted `pick-en-variant` pattern) to the core PickCommand contract
 * (`packages/core/src/commands/utility/pick.ts` parseInput), which reads
 * `modifiers.variant` + `count`/`rangeStart`/`rangeEnd`/`rangeMode`/`regex` and
 * `args[0]` as the source root:
 *
 *   method 'first'|'last'          → variant same,   count = patient
 *   method 'random'               → variant random, count = patient (optional)
 *   method 'item(s)'|'character(s)'→ variant 'range', patient split into
 *                                    rangeStart/rangeEnd/rangeMode
 *   method 'match'|'matches'       → variant same,   regex = patient (defensive;
 *                                    the match pattern is deferred at parse time)
 *   no/unknown method             → legacy generic shape (patient/source as args)
 *
 * The range patient is ONE expression value whose raw is the canonical surface
 * (`0 to 5`, `0 to 5 inclusive`). It must be split HERE into plain literal nodes:
 * feeding the joint raw to convertValue would route it through the expression
 * parser (`convertExpression` → parseExpression), which cannot parse `0 to 5`.
 */
const RANGE_METHODS = new Set(['item', 'items', 'character', 'characters']);
const COUNT_METHODS = new Set(['first', 'last', 'random']);
const REGEX_METHODS = new Set(['match', 'matches']);

/** Read a role's surface text (literal value or expression raw). */
function roleText(value: SemanticValue | undefined): string | undefined {
  if (!value) return undefined;
  if (value.type === 'literal') return String(value.value);
  if (value.type === 'expression') return value.raw;
  if ('value' in value && typeof value.value === 'string') return value.value;
  return undefined;
}

/** Build a plain literal endpoint node: `start`/`end` stay strings, else numeric. */
function endpointNode(raw: string): LiteralNode {
  const trimmed = raw.trim();
  if (trimmed === 'start' || trimmed === 'end') {
    return { type: 'literal', value: trimmed };
  }
  const n = Number(trimmed);
  return { type: 'literal', value: Number.isNaN(n) ? trimmed : n };
}

const pickMapper: CommandMapper = {
  action: 'pick',
  toAST(node, _builder) {
    const methodText = roleText(getRole(node, 'method'))?.trim().toLowerCase();
    const patientValue = getRole(node, 'patient');
    const source = convertRoleValue(node, 'source');

    // Legacy / unrecognized: reproduce the generic arg/modifier shape so the
    // pre-existing `pick colors` / `pick from …` forms are unaffected.
    if (
      !methodText ||
      !(
        RANGE_METHODS.has(methodText) ||
        COUNT_METHODS.has(methodText) ||
        REGEX_METHODS.has(methodText)
      )
    ) {
      const patient = patientValue ? convertValue(patientValue) : undefined;
      const args: ExpressionNode[] = [];
      if (patient) args.push(patient);
      if (source) args.push(source);
      return createCommandNode('pick', args);
    }

    const args: ExpressionNode[] = source ? [source] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (COUNT_METHODS.has(methodText)) {
      modifiers['variant'] = { type: 'literal', value: methodText } as LiteralNode;
      // `random` count is optional; first/last require one.
      if (patientValue) modifiers['count'] = convertValue(patientValue);
    } else if (REGEX_METHODS.has(methodText)) {
      modifiers['variant'] = { type: 'literal', value: methodText } as LiteralNode;
      if (patientValue) modifiers['regex'] = convertValue(patientValue);
    } else {
      // Range variant (`item(s)`/`character(s)`). Split the canonical surface.
      modifiers['variant'] = { type: 'literal', value: 'range' } as LiteralNode;
      const rangeRaw = roleText(patientValue) ?? '';
      let mode = 'default';
      let body = rangeRaw.trim();
      const modeMatch = body.match(/\s+(inclusive|exclusive)\s*$/i);
      if (modeMatch) {
        mode = modeMatch[1].toLowerCase();
        body = body.slice(0, body.length - modeMatch[0].length).trim();
      }
      const parts = body.split(/\s+to\s+/i);
      const startText = parts[0]?.trim();
      const endText = parts[1]?.trim();
      if (startText) modifiers['rangeStart'] = endpointNode(startText);
      if (endText) modifiers['rangeEnd'] = endpointNode(endText);
      modifiers['rangeMode'] = { type: 'literal', value: mode } as LiteralNode;
    }

    return createCommandNode('pick', args, modifiers);
  },
};

// =============================================================================
// Mapper Registry
// =============================================================================

const mappers: Map<ActionType, CommandMapper> = new Map([
  // Tier 1: Core commands
  ['wait', waitMapper],
  ['put', putMapper],
  // Tier 2: Content manipulation
  // Tier 2: Events
  // Tier 2: Navigation & DOM
  ['go', goMapper],
  // Tier 2: Control flow
  // Tier 3: Advanced DOM
  ['pick', pickMapper],
  // Tier 3: Object/Types
  // Tier 3: JavaScript integration
  // Tier 3: Conditionals
  // Tier 3: Loops
  // Tier 3: Behaviors
]);

// =============================================================================
// Schema-Driven Generic Mapper
// =============================================================================

/**
 * Resolve a first-present-of role chain to its converted expression.
 *
 * A bare role is a one-element chain. Returns the first role the parse actually
 * produced — the declarative form of the `destination ?? patient` fallbacks the
 * hand-written mappers used.
 */
function resolveRoleChain(
  node: CommandSemanticNode,
  spec: SemanticRole | ReadonlyArray<SemanticRole>
): ExpressionNode | undefined {
  const roles: ReadonlyArray<SemanticRole> = Array.isArray(spec) ? spec : [spec as SemanticRole];
  for (const role of roles) {
    const converted = convertRoleValue(node, role);
    if (converted !== undefined) return converted;
  }
  return undefined;
}

/**
 * Build a CommandNode from a declarative {@link AstShape}.
 *
 * Deliberately shares `createCommandNode` with the hand-written mappers so a
 * migrated command emits a byte-identical node — including modifier key order,
 * which follows the descriptor's authoring order.
 */
export function buildFromAstShape(
  node: CommandSemanticNode,
  action: ActionType,
  shape: AstShape
): CommandNode {
  const args: ExpressionNode[] = [];
  for (const spec of shape.args ?? []) {
    const value = resolveRoleChain(node, spec);
    // Absent roles are skipped rather than leaving a hole, matching the
    // original mappers' `if (x) args.push(x)`.
    if (value !== undefined) args.push(value);
  }

  const modifiers: Record<string, ExpressionNode> = {};
  for (const [key, spec] of Object.entries(shape.modifiers ?? {})) {
    const value = resolveRoleChain(node, spec);
    if (value !== undefined) modifiers[key] = value;
  }

  return createCommandNode(action, args, modifiers, shape.isBlocking ? { isBlocking: true } : {});
}

/**
 * Build a mapper from an action's schema `ast` descriptor, if it declares one.
 */
export function getSchemaMapper(action: ActionType): CommandMapper | undefined {
  const shape = getSchema(action)?.ast;
  if (!shape) return undefined;
  return {
    action,
    toAST(node) {
      return buildFromAstShape(node, action, shape);
    },
  };
}

/**
 * Resolve the mapper the AST builder should use for an action.
 *
 * Resolution order — an explicitly registered mapper always wins, so
 * {@link registerCommandMapper} remains the override:
 *
 * 1. a mapper in the registry (the four with real branching logic — `wait`,
 *    `put`, `go`, `pick` — plus anything registered at runtime)
 * 2. the schema's declarative {@link AstShape}
 * 3. undefined → the caller falls back to `ASTBuilder.buildGenericCommand`
 */
export function resolveCommandMapper(action: ActionType): CommandMapper | undefined {
  return mappers.get(action) ?? getSchemaMapper(action);
}

/**
 * Get the EXPLICITLY REGISTERED command mapper for an action type.
 *
 * Does not consult schema `ast` descriptors — use {@link resolveCommandMapper}
 * for the mapper the AST builder actually applies. Kept narrow so callers can
 * still ask "does this action override the declarative shape?".
 *
 * @param action - The action type
 * @returns The mapper, or undefined if no specific mapper is registered
 */
export function getCommandMapper(action: ActionType): CommandMapper | undefined {
  return mappers.get(action);
}

/**
 * Register a custom command mapper.
 *
 * @param mapper - The command mapper to register
 */
export function registerCommandMapper(mapper: CommandMapper): void {
  mappers.set(mapper.action, mapper);
}

/**
 * Get all registered command mappers.
 */
export function getRegisteredMappers(): Map<ActionType, CommandMapper> {
  return new Map(mappers);
}
