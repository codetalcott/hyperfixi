/**
 * Semantic-First Multilingual Hyperscript Types
 *
 * This module defines the canonical semantic representation that all languages
 * parse to and render from. The semantic layer is language-neutral - it captures
 * the MEANING of hyperscript commands independent of surface syntax.
 */

// Re-export the SemanticRole type from local grammar-types for consistency
export type {
  SemanticRole,
  WordOrder,
  AdpositionType,
  MorphologyType,
  GrammaticalMarker,
  LanguageProfile,
} from './types/grammar-types';

import type { SemanticRole } from './types/grammar-types';

// =============================================================================
// Action Types
// =============================================================================

/**
 * Canonical action names (English-based internally, but not visible to users)
 * These map to hyperscript commands and are used in the semantic AST.
 */
export type ActionType =
  // Class/Attribute operations
  | 'toggle'
  | 'add'
  | 'remove'
  // Content operations
  | 'put'
  | 'append'
  | 'prepend'
  | 'take'
  | 'make'
  | 'clone'
  | 'swap'
  | 'morph'
  // Variable operations
  | 'set'
  | 'get'
  | 'increment'
  | 'decrement'
  | 'log'
  // Visibility
  | 'show'
  | 'hide'
  | 'transition'
  // Events
  | 'on'
  | 'trigger'
  | 'send'
  // DOM focus
  | 'focus'
  | 'blur'
  // Navigation
  | 'go'
  // Async
  | 'wait'
  | 'fetch'
  | 'settle'
  // Animation/Measurement
  | 'measure'
  // Behavior system
  | 'install'
  // Control flow
  | 'if'
  | 'unless'
  | 'else'
  | 'repeat'
  | 'for'
  | 'while'
  | 'continue'
  | 'halt'
  | 'throw'
  | 'call'
  | 'return'
  // Advanced
  | 'js'
  | 'async'
  | 'tell'
  | 'default'
  | 'init'
  | 'behavior'
  // Meta (for compound nodes)
  | 'compound';

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

export interface LiteralValue {
  readonly type: 'literal';
  readonly value: string | number | boolean;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
}

export interface SelectorValue {
  readonly type: 'selector';
  readonly value: string; // The CSS selector: #id, .class, [attr], etc.
  readonly selectorKind: 'id' | 'class' | 'attribute' | 'element' | 'complex';
}

export interface ReferenceValue {
  readonly type: 'reference';
  readonly value: 'me' | 'you' | 'it' | 'result' | 'event' | 'target' | 'body';
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
 * Semantic nodes capture the MEANING of hyperscript constructs.
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
}

export interface SourcePosition {
  readonly start: number;
  readonly end: number;
  readonly line?: number;
  readonly column?: number;
}

/**
 * A command semantic node - represents a single hyperscript command.
 */
export interface CommandSemanticNode extends SemanticNode {
  readonly kind: 'command';
}

/**
 * An event handler semantic node - represents "on [event] [commands]".
 */
export interface EventHandlerSemanticNode extends SemanticNode {
  readonly kind: 'event-handler';
  readonly action: 'on';
  readonly body: SemanticNode[];
  readonly eventModifiers?: EventModifiers;
  /**
   * Event parameter names for destructuring.
   * E.g., for "on click(clientX, clientY)", this would be ['clientX', 'clientY']
   */
  readonly parameterNames?: readonly string[];
}

export interface EventModifiers {
  readonly once?: boolean;
  readonly debounce?: number;
  readonly throttle?: number;
  readonly queue?: 'first' | 'last' | 'all' | 'none';
  readonly from?: SemanticValue; // Event source filter
}

/**
 * A conditional semantic node - represents "if [condition] then [body] else [body]".
 */
export interface ConditionalSemanticNode extends SemanticNode {
  readonly kind: 'conditional';
  readonly action: 'if';
  readonly thenBranch: SemanticNode[];
  readonly elseBranch?: SemanticNode[];
}

/**
 * A compound semantic node - represents multiple chained statements.
 */
export interface CompoundSemanticNode extends SemanticNode {
  readonly kind: 'compound';
  readonly statements: SemanticNode[];
  readonly chainType: 'then' | 'and' | 'async';
}

/**
 * Loop variant discriminant for different loop types.
 */
export type LoopVariant =
  | 'forever'      // repeat forever
  | 'times'        // repeat 5 times
  | 'for'          // for item in collection
  | 'while'        // while condition
  | 'until';       // until condition

/**
 * A loop semantic node - represents repeat/for/while loops.
 */
export interface LoopSemanticNode extends SemanticNode {
  readonly kind: 'loop';
  readonly action: 'repeat' | 'for' | 'while';
  /** The type of loop (forever, times, for, while, until) */
  readonly loopVariant: LoopVariant;
  /** Commands to execute in each iteration */
  readonly body: SemanticNode[];
  /** Loop variable name for 'for' loops (e.g., 'item' in 'for item in list') */
  readonly loopVariable?: string;
  /** Index variable name if specified (e.g., 'i' in 'for item with index i') */
  readonly indexVariable?: string;
}

// =============================================================================
// Language Patterns
// =============================================================================

/**
 * A pattern defines how a semantic structure appears in a specific language.
 * Patterns enable bidirectional conversion: parse (natural → semantic) and
 * render (semantic → natural).
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
 * A pattern template defines the expected token sequence.
 *
 * Template syntax:
 * - Literal tokens: "toggle", "を", "على"
 * - Role placeholders: {patient}, {target}, {destination}
 * - Optional groups: [on {target}]
 * - Alternatives in extraction (not in template string)
 *
 * Example templates:
 * - English: "toggle {patient} [on {target}]"
 * - Japanese: "{target} の {patient} を 切り替え"
 * - Arabic: "بدّل {patient} [على {target}]"
 */
export interface PatternTemplate {
  /** Human-readable template string */
  readonly format: string;

  /** Parsed token sequence for matching */
  readonly tokens: PatternToken[];
}

export type PatternToken =
  | LiteralPatternToken
  | RolePatternToken
  | GroupPatternToken;

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
  readonly expectedTypes?: Array<SemanticValue['type']>;
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

// =============================================================================
// Token Stream (for pattern matching)
// =============================================================================

/**
 * A token from language-specific tokenization.
 */
export interface LanguageToken {
  readonly value: string;
  readonly kind: TokenKind;
  readonly position: SourcePosition;
  /** Normalized form from explicit keyword map (e.g., 切り替え → toggle) */
  readonly normalized?: string;
  /** Morphologically normalized stem (e.g., 切り替えた → 切り替え) */
  readonly stem?: string;
  /** Confidence in the morphological stem (0.0-1.0) */
  readonly stemConfidence?: number;
}

export type TokenKind =
  | 'keyword' // Command or modifier keyword
  | 'selector' // CSS selector (#id, .class, [attr])
  | 'literal' // String or number literal
  | 'particle' // Grammatical particle (を, に, من)
  | 'conjunction' // Grammatical conjunction (Arabic و/ف proclitics)
  | 'identifier' // Variable or property name
  | 'operator' // Comparison or logical operator
  | 'punctuation' // Brackets, quotes, etc.
  | 'url'; // URL/path (/path, https://...)

/**
 * A stream of tokens with navigation capabilities.
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

export interface StreamMark {
  readonly position: number;
}

// =============================================================================
// Pattern Matching Results
// =============================================================================

/**
 * Result of successfully matching a pattern.
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
// Tokenizer Interface
// =============================================================================

/**
 * Language-specific tokenizer interface.
 * Each language implements its own tokenizer to handle:
 * - Word boundaries (spaces for English, particles for Japanese)
 * - Character sets (ASCII, CJK, Arabic, etc.)
 * - Special markers (particles, prefixes, suffixes)
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
// Semantic Parser Interface
// =============================================================================

/**
 * Main parser interface - converts natural language to semantic nodes.
 */
export interface SemanticParser {
  /** Parse input in specified language to semantic node */
  parse(input: string, language: string): SemanticNode;

  /** Check if input can be parsed in the specified language */
  canParse(input: string, language: string): boolean;

  /** Get all supported languages */
  supportedLanguages(): string[];
}

// =============================================================================
// Semantic Renderer Interface
// =============================================================================

/**
 * Renderer interface - converts semantic nodes to natural language.
 */
export interface SemanticRenderer {
  /** Render semantic node in specified language */
  render(node: SemanticNode, language: string): string;

  /** Render semantic node in explicit mode */
  renderExplicit(node: SemanticNode): string;

  /** Get all supported languages */
  supportedLanguages(): string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a selector semantic value from a CSS selector string.
 */
export function createSelector(value: string): SelectorValue {
  let selectorKind: SelectorValue['selectorKind'] = 'complex';

  if (value.startsWith('#') && !value.includes(' ')) {
    selectorKind = 'id';
  } else if (value.startsWith('.') && !value.includes(' ')) {
    selectorKind = 'class';
  } else if (value.startsWith('[') && value.endsWith(']')) {
    selectorKind = 'attribute';
  } else if (/^[a-z][a-z0-9]*$/i.test(value)) {
    selectorKind = 'element';
  }

  return { type: 'selector', value, selectorKind };
}

/**
 * Create a literal semantic value.
 */
export function createLiteral(
  value: string | number | boolean,
  dataType?: LiteralValue['dataType']
): LiteralValue {
  const result: LiteralValue = { type: 'literal', value };
  if (dataType !== undefined) {
    return { type: 'literal', value, dataType };
  }
  return result;
}

/**
 * Create a reference semantic value.
 */
export function createReference(value: ReferenceValue['value']): ReferenceValue {
  return { type: 'reference', value };
}

/**
 * Create a property path semantic value.
 */
export function createPropertyPath(
  object: SemanticValue,
  property: string
): PropertyPathValue {
  return { type: 'property-path', object, property };
}

/**
 * Create a semantic node with the given action and roles.
 */
export function createCommandNode(
  action: ActionType,
  roles: Record<string, SemanticValue>,
  metadata?: SemanticMetadata
): CommandSemanticNode {
  const node: CommandSemanticNode = {
    kind: 'command',
    action,
    roles: new Map(Object.entries(roles) as [SemanticRole, SemanticValue][]),
  };
  if (metadata !== undefined) {
    return { ...node, metadata };
  }
  return node;
}

/**
 * Create an event handler semantic node.
 */
export function createEventHandler(
  event: SemanticValue,
  body: SemanticNode[],
  modifiers?: EventModifiers,
  metadata?: SemanticMetadata,
  parameterNames?: string[]
): EventHandlerSemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>();
  roles.set('event', event);

  const node: EventHandlerSemanticNode = {
    kind: 'event-handler',
    action: 'on',
    roles,
    body,
  };

  if (modifiers !== undefined) {
    (node as { eventModifiers?: EventModifiers }).eventModifiers = modifiers;
  }
  if (metadata !== undefined) {
    (node as { metadata?: SemanticMetadata }).metadata = metadata;
  }
  if (parameterNames !== undefined && parameterNames.length > 0) {
    (node as { parameterNames?: readonly string[] }).parameterNames = parameterNames;
  }

  return node;
}

/**
 * Create a compound semantic node (for chained statements).
 */
export function createCompoundNode(
  statements: SemanticNode[],
  chainType: 'then' | 'and' | 'async' = 'then',
  metadata?: SemanticMetadata
): CompoundSemanticNode {
  const node: CompoundSemanticNode = {
    kind: 'compound',
    action: 'compound' as ActionType, // Compound doesn't have a specific action
    roles: new Map(),
    statements,
    chainType,
  };
  if (metadata !== undefined) {
    (node as { metadata?: SemanticMetadata }).metadata = metadata;
  }
  return node;
}

/**
 * Create a conditional semantic node (if/else).
 */
export function createConditionalNode(
  condition: SemanticValue,
  thenBranch: SemanticNode[],
  elseBranch?: SemanticNode[],
  metadata?: SemanticMetadata
): ConditionalSemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>();
  roles.set('condition' as SemanticRole, condition);

  const node: ConditionalSemanticNode = {
    kind: 'conditional',
    action: 'if',
    roles,
    thenBranch,
  };
  if (elseBranch !== undefined) {
    (node as { elseBranch?: SemanticNode[] }).elseBranch = elseBranch;
  }
  if (metadata !== undefined) {
    (node as { metadata?: SemanticMetadata }).metadata = metadata;
  }
  return node;
}

/**
 * Create a loop semantic node.
 */
export function createLoopNode(
  action: 'repeat' | 'for' | 'while',
  loopVariant: LoopVariant,
  roles: Record<string, SemanticValue>,
  body: SemanticNode[],
  options?: {
    loopVariable?: string;
    indexVariable?: string;
    metadata?: SemanticMetadata;
  }
): LoopSemanticNode {
  const node: LoopSemanticNode = {
    kind: 'loop',
    action,
    loopVariant,
    roles: new Map(Object.entries(roles) as [SemanticRole, SemanticValue][]),
    body,
  };

  if (options?.loopVariable) {
    (node as { loopVariable?: string }).loopVariable = options.loopVariable;
  }
  if (options?.indexVariable) {
    (node as { indexVariable?: string }).indexVariable = options.indexVariable;
  }
  if (options?.metadata) {
    (node as { metadata?: SemanticMetadata }).metadata = options.metadata;
  }

  return node;
}

// =============================================================================
// Semantic Parse Result (for validation)
// =============================================================================

/**
 * Argument with semantic role attached.
 */
export type SemanticArgument = SemanticValue & {
  role?: SemanticRole;
};

/**
 * Result of semantic parsing (used by command validator).
 */
export interface SemanticParseResult {
  /** The action/command type */
  readonly action: ActionType;
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** Source language code */
  readonly language: string;
  /** Parsed arguments with roles */
  readonly arguments: SemanticArgument[];
}
