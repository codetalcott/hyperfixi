/**
 * Core Types — re-exported from @lokascript/intent + framework-specific extensions
 *
 * The universal semantic types (SemanticNode, SemanticValue, etc.) now live in
 * @lokascript/intent and are re-exported here for backward compatibility.
 *
 * Framework-specific types (tokenization, pattern matching) are defined below.
 */

// =============================================================================
// Re-export everything from @lokascript/intent
// =============================================================================

export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  ExpectedType,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
  FlagValue,
  Annotation,
  ProtocolDiagnostic,
  AsyncVariant,
  MatchArm,
  SemanticNode,
  SemanticMetadata,
  SourcePosition,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  EventModifiers,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopVariant,
  LoopSemanticNode,
  LSEEnvelope,
} from '@lokascript/intent';

export {
  createLiteral,
  createSelector,
  createReference,
  createPropertyPath,
  createExpression,
  createFlag,
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createLoopNode,
  createTryNode,
  createAsyncNode,
  createMatchNode,
  extractValue,
  extractRoleValue,
  getRoleValue,
} from '@lokascript/intent';

// =============================================================================
// Framework-specific types (multilingual DSL infrastructure)
// =============================================================================

import type {
  ActionType,
  SemanticRole,
  SemanticValue,
  SelectorValue,
  ExpectedType,
  SourcePosition,
} from '@lokascript/intent';

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
  readonly normalized?: string;
  readonly stem?: string;
  readonly stemConfidence?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Token stream - provides sequential access to tokens with backtracking.
 */
export interface TokenStream {
  readonly tokens: readonly LanguageToken[];
  readonly language: string;
  peek(offset?: number): LanguageToken | null;
  advance(): LanguageToken;
  isAtEnd(): boolean;
  mark(): StreamMark;
  reset(mark: StreamMark): void;
  position(): number;
}

export interface StreamMark {
  readonly position: number;
}

/**
 * Language tokenizer interface - converts text to tokens.
 */
export interface LanguageTokenizer {
  readonly language: string;
  readonly direction: 'ltr' | 'rtl';
  tokenize(input: string): TokenStream;
  classifyToken(token: string): TokenKind;
}

// =============================================================================
// Pattern Matching Types
// =============================================================================

export interface LanguagePattern {
  readonly id: string;
  readonly language: string;
  readonly command: ActionType;
  readonly priority: number;
  readonly template: PatternTemplate;
  readonly extraction: ExtractionRules;
  readonly constraints?: PatternConstraints;
}

export interface PatternTemplate {
  readonly format: string;
  readonly tokens: PatternToken[];
}

export type PatternToken = LiteralPatternToken | RolePatternToken | GroupPatternToken;

export interface LiteralPatternToken {
  readonly type: 'literal';
  readonly value: string;
  readonly alternatives?: string[];
}

export interface RolePatternToken {
  readonly type: 'role';
  readonly role: SemanticRole;
  readonly optional?: boolean;
  readonly expectedTypes?: Array<ExpectedType>;
  readonly greedy?: boolean;
}

export interface GroupPatternToken {
  readonly type: 'group';
  readonly tokens: PatternToken[];
  readonly optional?: boolean;
}

export interface ExtractionRules {
  readonly [role: string]: ExtractionRule;
}

export interface ExtractionRule {
  readonly position?: number;
  readonly marker?: string;
  readonly markerAlternatives?: string[];
  readonly transform?: (raw: string) => SemanticValue;
  readonly default?: SemanticValue;
  readonly value?: string;
  readonly fromRole?: string;
}

export interface PatternConstraints {
  readonly requiredRoles?: SemanticRole[];
  readonly forbiddenRoles?: SemanticRole[];
  readonly validPatientTypes?: Array<SelectorValue['selectorKind']>;
  readonly conflictsWith?: string[];
}

export interface PatternMatchResult {
  readonly pattern: LanguagePattern;
  readonly captured: ReadonlyMap<SemanticRole, SemanticValue>;
  readonly consumedTokens: number;
  readonly confidence: number;
}

export interface PatternMatchError {
  readonly message: string;
  readonly position: SourcePosition;
  readonly expectedPatterns?: string[];
  readonly partialMatch?: Partial<PatternMatchResult>;
}
