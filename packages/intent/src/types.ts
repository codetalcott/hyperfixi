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
  | LiteralValue
  | SelectorValue
  | ReferenceValue
  | PropertyPathValue
  | ExpressionValue
  | FlagValue;

/** Expected value types for role tokens. */
export type ExpectedType = SemanticValue['type'];

export interface LiteralValue {
  readonly type: 'literal';
  readonly value: string | number | boolean;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
}

export interface SelectorValue {
  readonly type: 'selector';
  readonly value: string;
  readonly selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex' | 'identifier';
}

export interface ReferenceValue {
  readonly type: 'reference';
  readonly value: string;
}

export interface PropertyPathValue {
  readonly type: 'property-path';
  readonly object: SemanticValue;
  readonly property: string;
}

export interface ExpressionValue {
  readonly type: 'expression';
  readonly raw: string;
}

export interface FlagValue {
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

/** Async coordination variant (v1.2). */
export type AsyncVariant = 'all' | 'race';

/** A single arm in a match command (v1.2). */
export interface MatchArm {
  readonly pattern: SemanticValue;
  readonly body: SemanticNode[];
}

// =============================================================================
// Semantic Nodes (5 kinds)
// =============================================================================

/** Base interface for all semantic nodes. */
export interface SemanticNode {
  readonly kind: 'command' | 'event-handler' | 'conditional' | 'compound' | 'loop';
  readonly action: ActionType;
  readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  readonly metadata?: SemanticMetadata;
  readonly annotations?: readonly Annotation[];
  readonly diagnostics?: readonly Diagnostic[];
}

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

/** A single DSL command. */
export interface CommandSemanticNode extends SemanticNode {
  readonly kind: 'command';
  readonly body?: readonly SemanticNode[];
  readonly catchBranch?: readonly SemanticNode[];
  readonly finallyBranch?: readonly SemanticNode[];
  readonly asyncVariant?: AsyncVariant;
  readonly asyncBody?: readonly SemanticNode[];
  readonly arms?: readonly MatchArm[];
  readonly defaultArm?: readonly SemanticNode[];
}

/** Trigger-based commands (e.g., "on click"). */
export interface EventHandlerSemanticNode extends SemanticNode {
  readonly kind: 'event-handler';
  readonly body: SemanticNode[];
  readonly eventModifiers?: EventModifiers;
  readonly additionalEvents?: readonly SemanticValue[];
  readonly parameterNames?: readonly string[];
}

export interface EventModifiers {
  readonly once?: boolean;
  readonly debounce?: number;
  readonly throttle?: number;
  readonly queue?: 'first' | 'last' | 'all' | 'none';
  readonly from?: SemanticValue;
}

/** Conditional: "if [condition] then [body] else [body]". */
export interface ConditionalSemanticNode extends SemanticNode {
  readonly kind: 'conditional';
  readonly thenBranch: SemanticNode[];
  readonly elseBranch?: SemanticNode[];
}

/** Multiple chained statements. */
export interface CompoundSemanticNode extends SemanticNode {
  readonly kind: 'compound';
  readonly statements: SemanticNode[];
  readonly chainType: 'then' | 'and' | 'async' | 'sequential' | 'pipe';
}

/** Loop variant discriminant. */
export type LoopVariant = 'forever' | 'times' | 'for' | 'while' | 'until';

/** Repeat/for/while loops. */
export interface LoopSemanticNode extends SemanticNode {
  readonly kind: 'loop';
  readonly loopVariant: LoopVariant;
  readonly body: SemanticNode[];
  readonly loopVariable?: string;
  readonly indexVariable?: string;
}

/** Versioned envelope for multi-node LSE documents (v1.2). */
export interface LSEEnvelope {
  readonly lseVersion: string;
  readonly features?: readonly string[];
  readonly nodes: readonly SemanticNode[];
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

export function createTryNode(
  body: SemanticNode[],
  catchBranch?: SemanticNode[],
  finallyBranch?: SemanticNode[],
  metadata?: SemanticMetadata
): CommandSemanticNode {
  return {
    kind: 'command',
    action: 'try',
    roles: new Map(),
    body,
    ...(catchBranch && catchBranch.length > 0 ? { catchBranch } : {}),
    ...(finallyBranch && finallyBranch.length > 0 ? { finallyBranch } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function createAsyncNode(
  variant: AsyncVariant,
  asyncBody: SemanticNode[],
  metadata?: SemanticMetadata
): CommandSemanticNode {
  return {
    kind: 'command',
    action: variant,
    roles: new Map(),
    asyncVariant: variant,
    asyncBody,
    ...(metadata ? { metadata } : {}),
  };
}

export function createMatchNode(
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  arms: MatchArm[],
  defaultArm?: SemanticNode[],
  metadata?: SemanticMetadata
): CommandSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  return {
    kind: 'command',
    action: 'match',
    roles: rolesMap,
    arms,
    ...(defaultArm && defaultArm.length > 0 ? { defaultArm } : {}),
    ...(metadata ? { metadata } : {}),
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
 * Prefer this over `extractRoleValue` when you need the structured value
 * (e.g. to branch on `value.type`, read `value.selectorKind`, etc.).
 */
export function getRoleValue(node: SemanticNode, role: string): SemanticValue | undefined {
  return node.roles.get(role);
}

/**
 * Extract a string representation from a named role on a SemanticNode.
 * Returns empty string if the role is missing.
 *
 * @deprecated Use {@link getRoleValue} when you need the typed `SemanticValue`
 * object. Use `getRoleValue` + `extractValue` if you still need a string.
 */
export function extractRoleValue(node: SemanticNode, role: string): string {
  const value = node.roles.get(role);
  if (!value) return '';
  return extractValue(value);
}
