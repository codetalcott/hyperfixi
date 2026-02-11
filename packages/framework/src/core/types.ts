/**
 * Generic Semantic Types for Multilingual DSLs
 *
 * This module defines the canonical semantic representation that all languages
 * parse to and render from. The semantic layer is language-neutral - it captures
 * the MEANING of DSL commands independent of surface syntax.
 *
 * These types are domain-agnostic - they work for any DSL (SQL, animations, etc.)
 */

// =============================================================================
// Action Types (Generic)
// =============================================================================

/**
 * Action type represents the command/operation in a DSL.
 * This is generic - each DSL defines its own set of actions.
 *
 * Examples:
 * - Hyperscript: 'toggle', 'add', 'remove', 'fetch'
 * - SQL: 'select', 'insert', 'update', 'delete'
 * - Animation: 'animate', 'fade', 'slide', 'rotate'
 */
export type ActionType = string;

/**
 * Semantic role represents the grammatical function of a part of a command.
 * This is generic - each DSL can define its own roles, though common ones include:
 *
 * Common roles across DSLs:
 * - action: The verb/command
 * - patient: What is being acted upon
 * - destination: Where something goes
 * - source: Where something comes from
 * - condition: Boolean expressions
 * - quantity: Numeric amounts
 * - duration: Time spans
 *
 * Examples:
 * - Hyperscript: 'patient', 'destination', 'source', 'event', 'style'
 * - SQL: 'columns', 'table', 'condition', 'orderBy', 'limit'
 * - Animation: 'target', 'duration', 'easing', 'delay'
 */
export type SemanticRole = string;

// =============================================================================
// Semantic Values
// =============================================================================

/**
 * A semantic value represents a typed piece of data in a semantic node.
 * Values are language-neutral - they capture what something IS, not how it's written.
 */
export type SemanticValue =
  | LiteralValue
  | SelectorValue
  | ReferenceValue
  | PropertyPathValue
  | ExpressionValue;

/**
 * Expected value types for role tokens.
 * Shared between RoleSpec (command-schemas) and RolePatternToken.
 */
export type ExpectedType = SemanticValue['type'];

export interface LiteralValue {
  readonly type: 'literal';
  readonly value: string | number | boolean;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
}

export interface SelectorValue {
  readonly type: 'selector';
  readonly value: string; // The selector: #id, .class, [attr], table-name, etc.
  readonly selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex' | 'identifier';
}

export interface ReferenceValue {
  readonly type: 'reference';
  readonly value: string; // Generic reference name (DSL-specific)
}

export interface PropertyPathValue {
  readonly type: 'property-path';
  readonly object: SemanticValue;
  readonly property: string;
}

export interface ExpressionValue {
  readonly type: 'expression';
  /** Raw expression string for complex expressions that need further parsing */
  readonly raw: string;
}

// =============================================================================
// Semantic Nodes
// =============================================================================

/**
 * Base interface for all semantic nodes.
 * Semantic nodes capture the MEANING of DSL constructs.
 */
export interface SemanticNode {
  readonly kind: 'command' | 'event-handler' | 'conditional' | 'compound' | 'loop';
  readonly action: ActionType;
  readonly roles: ReadonlyMap<SemanticRole, SemanticValue>;
  readonly metadata?: SemanticMetadata;
}

/**
 * Metadata about the source of a semantic node.
 * Useful for debugging, error messages, and round-trip conversion.
 */
export interface SemanticMetadata {
  readonly sourceLanguage?: string;
  readonly sourceText?: string;
  readonly sourcePosition?: SourcePosition;
  readonly patternId?: string;
  /**
   * Confidence score for the parse (0-1).
   * Higher values indicate more certain matches.
   * - 1.0: Exact match with all roles captured
   * - 0.8-0.99: High confidence with minor uncertainty
   * - 0.6-0.8: Medium confidence (normalization, defaults applied)
   * - <0.6: Low confidence (may need fallback)
   */
  readonly confidence?: number;
}

export interface SourcePosition {
  readonly start: number;
  readonly end: number;
  readonly line?: number;
  readonly column?: number;
}

/**
 * A command semantic node - represents a single DSL command.
 */
export interface CommandSemanticNode extends SemanticNode {
  readonly kind: 'command';
}

/**
 * An event handler semantic node - represents trigger-based commands.
 * E.g., "on click [commands]" in hyperscript, or "when condition [commands]" in other DSLs.
 */
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

/**
 * A conditional semantic node - represents "if [condition] then [body] else [body]".
 */
export interface ConditionalSemanticNode extends SemanticNode {
  readonly kind: 'conditional';
  readonly thenBranch: SemanticNode[];
  readonly elseBranch?: SemanticNode[];
}

/**
 * A compound semantic node - represents multiple chained statements.
 */
export interface CompoundSemanticNode extends SemanticNode {
  readonly kind: 'compound';
  readonly statements: SemanticNode[];
  readonly chainType: 'then' | 'and' | 'async' | 'sequential';
}

/**
 * Loop variant discriminant for different loop types.
 */
export type LoopVariant = 'forever' | 'times' | 'for' | 'while' | 'until';

/**
 * A loop semantic node - represents repeat/for/while loops.
 */
export interface LoopSemanticNode extends SemanticNode {
  readonly kind: 'loop';
  readonly loopVariant: LoopVariant;
  readonly body: SemanticNode[];
  readonly loopVariable?: string;
  readonly indexVariable?: string;
}

// =============================================================================
// Tokenization Types
// =============================================================================

/**
 * Token kind - categorizes what type of token this is.
 */
export type TokenKind =
  | 'keyword' // Command or modifier keyword
  | 'selector' // CSS selector or identifier (#id, .class, table-name)
  | 'literal' // String or number literal
  | 'particle' // Grammatical particle (を, に, من)
  | 'conjunction' // Grammatical conjunction
  | 'event-modifier' // Event modifier (.once, .debounce(300))
  | 'identifier' // Generic identifier
  | 'operator' // Operators (., +, -, etc.)
  | 'punctuation' // Punctuation (parentheses, etc.)
  | 'url'; // URL or path

/**
 * A language token - the result of tokenization.
 */
export interface LanguageToken {
  readonly value: string;
  readonly kind: TokenKind;
  readonly position: SourcePosition;
  /** Normalized form from explicit keyword map */
  readonly normalized?: string;
  /** Morphologically normalized stem */
  readonly stem?: string;
  /** Confidence in the morphological stem (0.0-1.0) */
  readonly stemConfidence?: number;
  /** Additional metadata for specific token types */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Token stream - provides sequential access to tokens with backtracking.
 */
export interface TokenStream {
  readonly tokens: readonly LanguageToken[];
  readonly language: string;

  /** Look at token at current position + offset without consuming */
  peek(offset?: number): LanguageToken | null;

  /** Consume and return current token, advance position */
  advance(): LanguageToken;

  /** Check if we've consumed all tokens */
  isAtEnd(): boolean;

  /** Save current position for backtracking */
  mark(): StreamMark;

  /** Restore to a saved position */
  reset(mark: StreamMark): void;

  /** Get current position */
  position(): number;
}

/**
 * Stream mark for backtracking during parsing.
 */
export interface StreamMark {
  readonly position: number;
}

/**
 * Language tokenizer interface - converts text to tokens.
 */
export interface LanguageTokenizer {
  readonly language: string;
  readonly direction: 'ltr' | 'rtl';

  /** Convert input string to token stream */
  tokenize(input: string): TokenStream;

  /** Classify a single token */
  classifyToken(token: string): TokenKind;
}

// =============================================================================
// Pattern Matching Types
// =============================================================================

/**
 * A language pattern defines how a semantic structure appears in a specific language.
 */
export interface LanguagePattern {
  /** Unique identifier for this pattern */
  readonly id: string;
  /** ISO 639-1 language code */
  readonly language: string;
  /** Which command this pattern matches */
  readonly command: ActionType;
  /** Priority for disambiguation (higher = checked first) */
  readonly priority: number;
  /** The pattern template with role placeholders */
  readonly template: PatternTemplate;
  /** Rules for extracting semantic roles from matched tokens */
  readonly extraction: ExtractionRules;
  /** Optional constraints on when this pattern applies */
  readonly constraints?: PatternConstraints;
}

/**
 * Pattern template - defines expected token sequence.
 */
export interface PatternTemplate {
  /** Human-readable template string */
  readonly format: string;
  /** Parsed token sequence for matching */
  readonly tokens: PatternToken[];
}

/**
 * Pattern token - literal, role placeholder, or group.
 */
export type PatternToken = LiteralPatternToken | RolePatternToken | GroupPatternToken;

export interface LiteralPatternToken {
  readonly type: 'literal';
  readonly value: string;
  /** Alternative spellings/forms that also match */
  readonly alternatives?: string[];
}

export interface RolePatternToken {
  readonly type: 'role';
  readonly role: SemanticRole;
  readonly optional?: boolean;
  /** Expected value types (for validation) */
  readonly expectedTypes?: Array<ExpectedType>;
}

export interface GroupPatternToken {
  readonly type: 'group';
  readonly tokens: PatternToken[];
  readonly optional?: boolean;
}

/**
 * Rules for extracting semantic values from matched tokens.
 */
export interface ExtractionRules {
  readonly [role: string]: ExtractionRule;
}

export interface ExtractionRule {
  /** Position-based extraction (0-indexed from pattern start) */
  readonly position?: number;
  /** Marker-based extraction (find value after this marker) */
  readonly marker?: string;
  /** Alternative markers that also work */
  readonly markerAlternatives?: string[];
  /** Transform the extracted value */
  readonly transform?: (raw: string) => SemanticValue;
  /** Default value if not found (for optional roles) */
  readonly default?: SemanticValue;
  /** Static value extraction */
  readonly value?: string;
  /** Extract value from a pattern role by name */
  readonly fromRole?: string;
}

/**
 * Additional constraints on pattern applicability.
 */
export interface PatternConstraints {
  /** Required roles that must be present */
  readonly requiredRoles?: SemanticRole[];
  /** Roles that must NOT be present */
  readonly forbiddenRoles?: SemanticRole[];
  /** Valid selector types for the patient role */
  readonly validPatientTypes?: Array<SelectorValue['selectorKind']>;
  /** Pattern IDs this conflicts with */
  readonly conflictsWith?: string[];
}

/**
 * Result of matching a pattern against tokens.
 */
export interface PatternMatchResult {
  readonly pattern: LanguagePattern;
  readonly captured: ReadonlyMap<SemanticRole, SemanticValue>;
  readonly consumedTokens: number;
  readonly confidence: number; // 0-1, how well the pattern matched
}

/**
 * Error when pattern matching fails.
 */
export interface PatternMatchError {
  readonly message: string;
  readonly position: SourcePosition;
  readonly expectedPatterns?: string[];
  readonly partialMatch?: Partial<PatternMatchResult>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a literal value
 */
export function createLiteral(
  value: string | number | boolean,
  dataType?: 'string' | 'number' | 'boolean' | 'duration'
): LiteralValue {
  return dataType ? { type: 'literal', value, dataType } : { type: 'literal', value };
}

/**
 * Create a selector value
 */
export function createSelector(
  value: string,
  selectorKind?: SelectorValue['selectorKind']
): SelectorValue {
  return selectorKind ? { type: 'selector', value, selectorKind } : { type: 'selector', value };
}

/**
 * Create a reference value
 */
export function createReference(value: string): ReferenceValue {
  return { type: 'reference', value };
}

/**
 * Create a property path value
 */
export function createPropertyPath(object: SemanticValue, property: string): PropertyPathValue {
  return { type: 'property-path', object, property };
}

/**
 * Create an expression value
 */
export function createExpression(raw: string): ExpressionValue {
  return { type: 'expression', raw };
}

/**
 * Create a command semantic node
 */
export function createCommandNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  metadata?: SemanticMetadata
): CommandSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const node: CommandSemanticNode = {
    kind: 'command',
    action,
    roles: rolesMap,
  };
  if (metadata) {
    return { ...node, metadata };
  }
  return node;
}

/**
 * Create an event handler semantic node
 */
export function createEventHandlerNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  body: SemanticNode[],
  metadata?: SemanticMetadata,
  eventModifiers?: EventModifiers
): EventHandlerSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const base = {
    kind: 'event-handler' as const,
    action,
    roles: rolesMap,
    body,
  };
  return {
    ...base,
    ...(eventModifiers && { eventModifiers }),
    ...(metadata && { metadata }),
  };
}

/**
 * Create a conditional semantic node
 */
export function createConditionalNode(
  action: ActionType,
  roles: Record<SemanticRole, SemanticValue> | Map<SemanticRole, SemanticValue>,
  thenBranch: SemanticNode[],
  elseBranch?: SemanticNode[],
  metadata?: SemanticMetadata
): ConditionalSemanticNode {
  const rolesMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const base = {
    kind: 'conditional' as const,
    action,
    roles: rolesMap,
    thenBranch,
  };
  return {
    ...base,
    ...(elseBranch && { elseBranch }),
    ...(metadata && { metadata }),
  };
}

/**
 * Create a compound semantic node
 */
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

/**
 * Create a loop semantic node
 */
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
  const base = {
    kind: 'loop' as const,
    action,
    roles: rolesMap,
    loopVariant,
    body,
  };
  return {
    ...base,
    ...(loopVariable && { loopVariable }),
    ...(indexVariable && { indexVariable }),
    ...(metadata && { metadata }),
  };
}
