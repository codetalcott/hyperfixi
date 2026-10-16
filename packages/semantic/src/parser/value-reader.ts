/**
 * The seam between the pattern matcher's skeleton and a grammar's value
 * reading (domains rethink Phase 4.2, `docs-internal/DOMAINS_RETHINK.md`).
 *
 * The skeleton (`match-skeleton.ts`) walks a pattern: its literals, groups and
 * role slots, with rollback, ranking, spans, memoization and the confidence
 * model. It knows nothing of what a VALUE is in the grammar, nor of the
 * grammar's language profiles: each role slot is read through `readRole`, and
 * the few places the walk needs a grammar fact go through the hooks below.
 * Hyperscript's reader is `HyperscriptValueReader` (`pattern-matcher.ts`).
 */

import type {
  LanguagePattern,
  LanguageToken,
  PatternMatchResult,
  PatternToken,
  SemanticRole,
  SemanticValue,
  TokenStream,
} from '../types';

/** A role slot of a pattern. */
export type RoleSlot = PatternToken & { type: 'role' };

/** What the skeleton tells its reader about the match in progress. */
export interface MatchView {
  /**
   * The pattern tokens still to match after the slot being read, through every
   * enclosing group: a value stops at any marker the pattern still owes.
   */
  patternRest(): readonly PatternToken[];
  /**
   * Whether the slot being read directly follows a literal the pattern
   * matched: its marker (`[por {quantity}]`), or the command's verb.
   */
  slotAfterLiteral(): boolean;
  /** Whether a pattern token (a literal, or a group starting with one) would match the token. */
  wouldMatch(pt: PatternToken | undefined, token: LanguageToken): boolean;
}

/** A grammar's value reading, as the matcher's skeleton calls it. */
export interface ValueReader {
  /** A pattern is about to be matched: reset what the reader keeps per pattern. */
  beginPattern(pattern: LanguagePattern): void;
  /**
   * Read a value for `slot` at the stream's position into `captured`, and
   * advance past it. False when the slot does not match; an optional slot that
   * reads nothing returns true, captures nothing and consumes nothing.
   *
   * @param next - the pattern token after the slot (through an enclosing
   *   group's end), undefined where the pattern truly ends.
   */
  readRole(
    tokens: TokenStream,
    slot: RoleSlot,
    captured: Map<SemanticRole, SemanticValue>,
    next: PatternToken | undefined
  ): boolean;
  /**
   * Slot discipline: may the skeleton try skipping this optional pattern token
   * (a slot, or an optional group of slots) for the token at the stream's head?
   * The skeleton then matches the rest of the pattern without it, and keeps the
   * skip only when that reaches a clause end (`atClauseEnd`). For a marker-less
   * optional slot facing a verb it must not eat.
   */
  maySkipSlot(
    patternToken: PatternToken,
    token: LanguageToken | null,
    next: PatternToken | undefined
  ): boolean;
  /** Does a clause end at the stream's position (its end, or the next clause's first word)? */
  atClauseEnd(tokens: TokenStream): boolean;
  /** Skip what the grammar reads as nothing before a sequence (Arabic proclitics). */
  skipLeading?(tokens: TokenStream, sequence: readonly PatternToken[]): void;
  /** Before `sequence[index]` is matched (hyperscript: an event head's source clause). */
  beforePatternToken?(
    tokens: TokenStream,
    sequence: readonly PatternToken[],
    index: number,
    captured: Map<SemanticRole, SemanticValue>
  ): void;
  /** Fields the reader adds to the pattern's match result (hyperscript: `eventSource`). */
  resultFields?(): Partial<PatternMatchResult>;
}
