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
  /**
   * The pattern reads a form the renderer does not write by choosing it
   * (hyperscript's wait `esperar evento {event}`: the renderer writes the event
   * word itself, before a name no table knows). The renderer skips it.
   */
  readonly parseOnly?: boolean;
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
  /**
   * Parse-only marker: the matcher still consumes this literal, but the
   * renderer skips it. Set when a role declares `renderOverride: { <lang>: '' }`
   * (hyperscript's fetch `from`: required to PARSE `fetch from /api`, absent from
   * the render, since `fetch from "/api"` is not canonical _hyperscript).
   */
  readonly renderSuppress?: boolean;
}

export interface RolePatternToken {
  readonly type: 'role';
  readonly role: SemanticRole;
  readonly optional?: boolean;
  readonly expectedTypes?: Array<ExpectedType>;
  readonly greedy?: boolean;
  /**
   * Mirrors the schema's `RoleSpec.valueShape`: the slot's surface form is
   * unambiguous on its own. Carried onto the pattern token because the value
   * reader needs it too, not just the confidence model (hyperscript's
   * `'keyword'` slots hold a fixed keyword phrase and are exempt from the
   * trailing-slot verb guard).
   */
  readonly valueShape?: 'time' | 'reference' | 'keyword' | 'object' | 'clause' | 'list';
}

export interface GroupPatternToken {
  readonly type: 'group';
  readonly tokens: PatternToken[];
  readonly optional?: boolean;
  /**
   * The group is optional for PARSING but belongs in canonical output: the
   * marker-only groups a profile's optional case markers produce (Turkish case
   * suffixes may be dropped colloquially, so the parse accepts both forms).
   * The matcher's skeleton also requires such a group's marker after a role it
   * captures (`MatchSkeleton`).
   */
  readonly renderRequired?: boolean;
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
  /**
   * The static `value` is an expression, as the English parse types the word
   * (hyperscript's `go back` destination), not a literal.
   */
  readonly valueIsExpression?: true;
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
  /**
   * Stream index at which each captured role's value STARTED, for callers that
   * need to re-read a slot's own span rather than the tail after it. Populated
   * on the same success path as `captured` (`MatchSkeleton`), so a role left
   * behind by a rolled-back group survives in both maps or in neither.
   */
  readonly roleStarts?: ReadonlyMap<SemanticRole, number>;
  /**
   * A source phrase hyperscript's reader found in an event HEAD (`from #btn`
   * right after the event) rather than in a pattern slot: kept out of
   * `captured`, so a fused pattern's own source group can neither overwrite it
   * nor be overwritten (`ValueReader.resultFields`).
   */
  readonly eventSource?: SemanticValue;
}

export interface PatternMatchError {
  readonly message: string;
  readonly position: SourcePosition;
  readonly expectedPatterns?: string[];
  readonly partialMatch?: Partial<PatternMatchResult>;
}
