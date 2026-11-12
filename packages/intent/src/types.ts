/**
 * Universal UI Intent Types
 *
 * Canonical semantic representation for DSL commands. Language-neutral —
 * captures the MEANING of commands independent of surface syntax.
 *
 * These types are domain-agnostic and work for any DSL (hyperscript, SQL,
 * voice commands, animations, etc.) and any target framework (React, Vue,
 * Alpine, vanilla JS).
 */

import type { Diagnostic } from './diagnostics';

// =============================================================================
// Action & Role
// =============================================================================

/**
 * The command/operation in a DSL (e.g., 'toggle', 'fetch', 'select').
 */
export type ActionType = string;

/**
 * The grammatical function of a part of a command (e.g., 'patient', 'destination').
 */
export type SemanticRole = string;

// =============================================================================
// Semantic Values (7 types)
// =============================================================================

export type SemanticValue =
  LiteralValue | SelectorValue | ReferenceValue | PropertyPathValue | ExpressionValue | FlagValue;

/** Expected value types for role tokens. */
export type ExpectedType = SemanticValue['type'];

/**
 * What any value may carry: `implicit` marks a value the parser supplied from a
 * command's default (`toggle .active` acts on `me`) and the author did not
 * write. A renderer leaves an implicit value out, so an encoding that dropped
 * the mark would write `remove #x` back as `remove #x from me`.
 */
interface ValueMarks {
  readonly implicit?: true;
}

export interface LiteralValue extends ValueMarks {
  readonly type: 'literal';
  readonly value: string | number | boolean;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
  /** Written in quotes where a bare word was possible (`send "a-b"`): written back so. */
  readonly quoted?: true;
  /** A naked `${…}` URL: written back naked, as quoted it would not interpolate. */
  readonly interpolates?: true;
}

export interface SelectorValue extends ValueMarks {
  readonly type: 'selector';
  readonly value: string;
  readonly selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex' | 'identifier';
}

export interface ReferenceValue extends ValueMarks {
  readonly type: 'reference';
  readonly value: string;
}

export interface PropertyPathValue extends ValueMarks {
  readonly type: 'property-path';
  readonly object: SemanticValue;
  readonly property: string;
  /** Which spelling was read: `#input.value` or `#input's value`. */
  readonly access?: 'dot' | 'possessive';
}

export interface ExpressionValue extends ValueMarks {
  readonly type: 'expression';
  readonly raw: string;
}

export interface FlagValue extends ValueMarks {
  readonly type: 'flag';
  readonly name: string;
  readonly enabled: boolean;
}

// =============================================================================
// Annotations & Protocol Diagnostics (v1.2)
// =============================================================================

/** A metadata annotation on a node (v1.2). */
export interface Annotation {
  readonly name: string;
  readonly value?: string;
}

/**
 * A type constraint diagnostic attached to a node (v1.2).
 * Named `ProtocolDiagnostic` to avoid collision with the `Diagnostic` type.
 *
 * Uses `severity` (not `level`) to match the `Diagnostic` type convention.
 * The wire-format equivalent, `ProtocolDiagnosticJSON`, uses `level` per the
 * LSE protocol spec — this is intentional and kept separate.
 */
export interface ProtocolDiagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly role: string;
  readonly message: string;
  readonly code: string;
}

// =============================================================================
// Semantic Nodes
// =============================================================================
//
// One node model. A parser built on this package has its own node type: more
// kinds (`behavior`, `def`), narrower actions and roles, values with more
// fields. That type is an INSTANCE of {@link BaseNode}, and its node kinds
// EXTEND the field sets below, so the two cannot drift apart. They used to be
// two hand-written copies (this file and `@lokascript/semantic`'s), joined by
// casts, and a field one had and the other did not was dropped by the writers
// with no type error.

/**
 * The shape every node has, whatever parser built it.
 *
 * @typeParam Kind   the node kinds (`'command' | 'event-handler' | …`)
 * @typeParam Action the command names
 * @typeParam Role   the role names
 * @typeParam Value  the value type; it must be a {@link SemanticValue}
 */
export interface BaseNode<
  Kind extends string = string,
  Action extends string = string,
  Role extends string = string,
  Value extends SemanticValue = SemanticValue,
> {
  readonly kind: Kind;
  readonly action: Action;
  readonly roles: ReadonlyMap<Role, Value>;
  readonly metadata?: SemanticMetadata;
  readonly annotations?: readonly Annotation[];
  readonly diagnostics?: readonly Diagnostic[];
}

/**
 * Any node, from any parser: what `toProtocolJSON`, `renderExplicit` and
 * `findUnencodable` accept. They read a node's kind and fields at run time and
 * refuse what they cannot carry, so they do not need a narrower type.
 */
export type AnyNode = BaseNode;

/** The node kinds this package builds and LSE has a place for. */
export type NodeKind = 'command' | 'event-handler' | 'conditional' | 'compound' | 'loop';

/** This package's node: any action, any role. */
export interface SemanticNode extends BaseNode<NodeKind, ActionType, SemanticRole, SemanticValue> {}

export interface SemanticMetadata {
  readonly sourceLanguage?: string;
  readonly sourceText?: string;
  readonly sourcePosition?: SourcePosition;
  readonly patternId?: string;
  readonly confidence?: number;
}

export interface SourcePosition {
  readonly start: number;
  readonly end: number;
  readonly line?: number;
  readonly column?: number;
}

// --- The fields of each kind, over a parser's own node type `N` and value type `V` ---

/** A command's own fields. */
export interface CommandFields<N> {
  /** A block command's commands (`tell #x … end`). */
  readonly body?: readonly N[];
}

/** An event handler's own fields. */
export interface EventHandlerFields<N, V = SemanticValue> {
  readonly body: N[];
  readonly eventModifiers?: EventModifiers<V>;
  readonly additionalEvents?: readonly V[];
  readonly parameterNames?: readonly string[];
}

export interface EventModifiers<V = SemanticValue> {
  readonly once?: boolean;
  readonly debounce?: number;
  readonly throttle?: number;
  readonly queue?: 'first' | 'last' | 'all' | 'none';
  readonly from?: V;
}

/** A conditional's own fields. */
export interface ConditionalFields<N> {
  readonly thenBranch: N[];
  readonly elseBranch?: N[];
}

export type ChainType = 'then' | 'and' | 'async' | 'sequential';

/** A chain's own fields. */
export interface CompoundFields<N> {
  readonly statements: N[];
  readonly chainType: ChainType;
}

/** Loop variant discriminant. */
export type LoopVariant = 'forever' | 'times' | 'for' | 'while' | 'until';

/** A loop's own fields. */
export interface LoopFields<N> {
  readonly loopVariant: LoopVariant;
  readonly body: N[];
  readonly loopVariable?: string;
  readonly indexVariable?: string;
}

// --- This package's nodes ---

/** A single DSL command. */
export interface CommandSemanticNode extends SemanticNode, CommandFields<SemanticNode> {
  readonly kind: 'command';
}

/** Trigger-based commands (e.g., "on click"). */
export interface EventHandlerSemanticNode extends SemanticNode, EventHandlerFields<SemanticNode> {
  readonly kind: 'event-handler';
}

/** Conditional: "if [condition] then [body] else [body]". */
export interface ConditionalSemanticNode extends SemanticNode, ConditionalFields<SemanticNode> {
  readonly kind: 'conditional';
}

/** Multiple chained statements. */
export interface CompoundSemanticNode extends SemanticNode, CompoundFields<SemanticNode> {
  readonly kind: 'compound';
}

/** Repeat/for/while loops. */
export interface LoopSemanticNode extends SemanticNode, LoopFields<SemanticNode> {
  readonly kind: 'loop';
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createLiteral(
  value: string | number | boolean,
  dataType?: 'string' | 'number' | 'boolean' | 'duration'
): LiteralValue {
  return dataType ? { type: 'literal', value, dataType } : { type: 'literal', value };
}

export function createSelector(
  value: string,
  selectorKind?: SelectorValue['selectorKind']
): SelectorValue {
  return selectorKind ? { type: 'selector', value, selectorKind } : { type: 'selector', value };
}

export function createReference(value: string): ReferenceValue {
  return { type: 'reference', value };
}

export function createPropertyPath(object: SemanticValue, property: string): PropertyPathValue {
  return { type: 'property-path', object, property };
}

export function createExpression(raw: string): ExpressionValue {
  return { type: 'expression', raw };
}

export function createFlag(name: string, enabled: boolean = true): FlagValue {
  return { type: 'flag', name, enabled };
}

export function createCommandNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  metadata?: SemanticMetadata
): CommandSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const node: CommandSemanticNode = { kind: 'command', action, roles: rolesMap };
  return metadata ? { ...node, metadata } : node;
}

export function createEventHandlerNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  body: SemanticNode[],
  metadata?: SemanticMetadata,
  eventModifiers?: EventModifiers
): EventHandlerSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  return {
    kind: 'event-handler',
    action,
    roles: rolesMap,
    body,
    ...(eventModifiers && { eventModifiers }),
    ...(metadata && { metadata }),
  };
}

export function createConditionalNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  thenBranch: SemanticNode[],
  elseBranch?: SemanticNode[],
  metadata?: SemanticMetadata
): ConditionalSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  return {
    kind: 'conditional',
    action,
    roles: rolesMap,
    thenBranch,
    ...(elseBranch && { elseBranch }),
    ...(metadata && { metadata }),
  };
}

export function createCompoundNode(
  statements: SemanticNode[],
  chainType: CompoundSemanticNode['chainType'] = 'sequential',
  metadata?: SemanticMetadata
): CompoundSemanticNode {
  const base = {
    kind: 'compound' as const,
    action: 'compound' as const,
    roles: new Map(),
    statements,
    chainType,
  };
  return metadata ? { ...base, metadata } : base;
}

export function createLoopNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  loopVariant: LoopVariant,
  body: SemanticNode[],
  loopVariable?: string,
  indexVariable?: string,
  metadata?: SemanticMetadata
): LoopSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  return {
    kind: 'loop',
    action,
    roles: rolesMap,
    loopVariant,
    body,
    ...(loopVariable && { loopVariable }),
    ...(indexVariable && { indexVariable }),
    ...(metadata && { metadata }),
  };
}

// =============================================================================
// Value Extraction Helpers
// =============================================================================

/**
 * Extract a string representation from any SemanticValue.
 */
export function extractValue(value: SemanticValue): string {
  if (value.type === 'flag') return value.name;
  if ('raw' in value && value.raw !== undefined) return String(value.raw);
  if ('value' in value && value.value !== undefined) return String(value.value);
  if (value.type === 'property-path') return `${extractValue(value.object)}.${value.property}`;
  return '';
}

/**
 * Get the typed `SemanticValue` for a named role on a SemanticNode.
 * Returns `undefined` if the role is missing.
 *
 * Use this when you need the structured value (e.g. to branch on
 * `value.type`, read `value.selectorKind`, etc.). See {@link extractRoleValue}
 * for the string-convenience companion.
 */
export function getRoleValue(node: SemanticNode, role: string): SemanticValue | undefined {
  return node.roles.get(role);
}

/**
 * Extract a string representation from a named role on a SemanticNode.
 * Returns empty string if the role is missing.
 *
 * String-convenience companion to {@link getRoleValue}. Use this when you
 * just want a stringified role value; use `getRoleValue` when you need to
 * inspect the typed `SemanticValue` (e.g. to branch on `value.type`).
 */
export function extractRoleValue(node: SemanticNode, role: string): string {
  const value = node.roles.get(role);
  if (!value) return '';
  return extractValue(value);
}
