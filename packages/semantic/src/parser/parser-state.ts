/**
 * The state of a parse in progress, which `SemanticParserImpl` holds and the
 * functions moved out of it take as their first parameter (M3 (d),
 * docs-internal/MULTILINGUAL_NEXT_STEPS.md). Each field was a field of the class.
 */
import type { Diagnostic, LanguageToken, SemanticNode } from '../types';
import type { ParseFn } from './parse-fn';

export interface ParserState {
  /** Source text the current token stream's positions index into. */
  positionSource: string | undefined;
  /** Re-entrancy depth of {@link parse} — see boundIdentifiers scoping. */
  parseDepth: number;
  /**
   * Input-coverage frames (Arc C), one per active {@link parse} /
   * {@link parseStatements} invocation. The per-segment body parsers record a
   * dropped token run into the CURRENT frame; the frame owner attaches the
   * records to the node(s) it returns. Speculative parse attempts roll back to
   * a mark when their result is discarded, so only committed parses fire.
   */
  coverageFrames: Diagnostic[][];
  /**
   * Identifiers BOUND earlier in the current top-level parse: a loop binding
   * variable (`repeat for item in .items` — repeat.patient) or a set variable
   * (`set item to …` — set.destination). The strict trailing-`destination`
   * reclaim (see {@link tryAttachTrailingRole}) rejects arbitrary bare
   * identifiers by design, but an identifier the SAME input just bound is a
   * legitimate destination (`add .processed to item` inside the loop body —
   * the en reference captures it as destination:expression since the schema
   * admits expression; without this the SOV trailing `item に` reclaim
   * defaulted the destination to `me`).
   */
  readonly boundIdentifiers: Set<string>;
  /**
   * The words of each `until` test taken by {@link takeBottomUntil}: one that
   * closes no loop gives them back as unread (foldLoopBlocks).
   */
  readonly bottomTestTokens: WeakMap<SemanticNode, LanguageToken[]>;
  /** The parser's own `parse`, for a moved function that re-parses part of its input. */
  readonly parse: ParseFn;
}

/** A parser's state before its first parse. */
export function createParserState(parse: ParseFn): ParserState {
  return {
    positionSource: undefined,
    parseDepth: 0,
    coverageFrames: [],
    boundIdentifiers: new Set<string>(),
    bottomTestTokens: new WeakMap<SemanticNode, LanguageToken[]>(),
    parse,
  };
}
