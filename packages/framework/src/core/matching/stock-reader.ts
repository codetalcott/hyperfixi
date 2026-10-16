/**
 * The stock value reader: what a domain grammar's matcher reads at each role
 * slot, on the matcher's skeleton (domains rethink Phase 4.7,
 * `docs-internal/DOMAINS_RETHINK.md`). Hyperscript's reader is semantic's
 * `HyperscriptValueReader`; a domain takes this one.
 *
 * - A **greedy** slot (`RoleSpec.greedy`: a SQL condition, a column list) reads
 *   every token up to the next marker the pattern still owes, or the end, as
 *   one expression (`readGreedy`).
 * - Any other slot reads one value (`readRoleValue`, the old matcher's reading):
 *   a selector, a quoted string, a number, a boolean, a duration, a URL, an
 *   identifier, or one of the multi-token forms it knows (`user.name`,
 *   `#dialog.showModal()`), checked against the slot's expected types.
 * - A **required** slot reads nothing where the stream is at the marker the
 *   pattern wants next (the old matcher's guard against an SOV marker taken as
 *   a value). Where a required slot finds nothing to read, and the optional,
 *   marker-less slot just before it read a value with nothing read since, that
 *   value is given back and the required slot reads again (the old matcher's
 *   backtrack: behaviorspec `when clicks`, where the optional actor took
 *   `clicks`; flow `orders として 取得変数`, where the optional patient took
 *   `orders`).
 * - An **optional** slot may be skipped for a token the pattern wants next, the
 *   skip kept only when the rest of the pattern then reads to the end.
 */

import type {
  StreamMark,
  LanguagePattern,
  LanguageToken,
  PatternToken,
  SemanticRole,
  SemanticValue,
  TokenStream,
} from '../types';
import type { MatchView, RoleSlot, ValueReader } from './value-reader';
import { readRoleValue, type ReadingProfile } from './stock-reading';

/**
 * The markers a greedy value stops at, from the pattern tokens still owed after
 * it: the next literal (with its alternatives), and each optional group's
 * leading literal up to and including the first required token.
 */
export function greedyStopMarkers(rest: readonly PatternToken[]): Set<string> {
  const markers = new Set<string>();
  const add = (pt: PatternToken & { type: 'literal' }): void => {
    markers.add(pt.value.toLowerCase());
    for (const alt of pt.alternatives ?? []) markers.add(alt.toLowerCase());
  };
  for (const pt of rest) {
    if (pt.type === 'literal') {
      add(pt);
      break;
    }
    if (pt.type === 'group') {
      const lead = pt.tokens.find(t => t.type === 'literal');
      if (lead?.type === 'literal') add(lead);
      // For optional groups, continue scanning past them so the greedy capture
      // also sees subsequent required literals (the SOV verb after an optional
      // WHERE group).
      if (!pt.optional) break;
    }
  }
  return markers;
}

/** Whether `token` is one of the stop markers, by its value or its normalized form. */
function isStopMarker(token: LanguageToken, stopMarkers: ReadonlySet<string>): boolean {
  if (stopMarkers.size === 0) return false;
  if (stopMarkers.has(token.value.toLowerCase())) return true;
  return !!token.normalized && stopMarkers.has(token.normalized.toLowerCase());
}

/**
 * Read every token up to a stop marker (or the end) as one expression value,
 * advancing past them; null (consuming nothing) when the first token stops it.
 */
export function readGreedy(
  tokens: TokenStream,
  stopMarkers: ReadonlySet<string>
): SemanticValue | null {
  const values: string[] = [];
  while (!tokens.isAtEnd()) {
    const next = tokens.peek();
    if (!next || isStopMarker(next, stopMarkers)) break;
    values.push(next.value);
    tokens.advance();
  }
  return values.length > 0 ? { type: 'expression', raw: values.join(' ') } : null;
}

/** The stock reader, for a matcher whose profiles it may consult (possessive words). */
export class StockValueReader implements ValueReader {
  private profile: ReadingProfile | undefined;
  /** The last optional, marker-less slot that read a value: what a failing required slot may take back. */
  private lastOptional: { role: SemanticRole; start: StreamMark; end: number } | undefined;

  constructor(
    private readonly view: MatchView,
    private readonly profiles: Readonly<Record<string, ReadingProfile>> = {}
  ) {}

  beginPattern(pattern: LanguagePattern): void {
    this.profile = this.profiles[pattern.language] ?? { code: pattern.language };
    this.lastOptional = undefined;
  }

  readRole(
    tokens: TokenStream,
    slot: RoleSlot,
    captured: Map<SemanticRole, SemanticValue>,
    next: PatternToken | undefined
  ): boolean {
    const start = tokens.mark();
    if (this.readOnce(tokens, slot, captured, next, true)) {
      if (!slot.optional) {
        this.lastOptional = undefined;
      } else if (
        captured.has(slot.role) &&
        tokens.position() > start.position &&
        !this.view.slotAfterLiteral() &&
        next?.type !== 'literal'
      ) {
        this.lastOptional = { role: slot.role, start, end: tokens.position() };
      }
      return true;
    }
    const before = this.lastOptional;
    if (slot.optional || !before || before.end !== tokens.position()) return false;
    // Give the optional slot's value back and read this one from there.
    this.lastOptional = undefined;
    tokens.reset(before.start);
    captured.delete(before.role);
    return this.readOnce(tokens, slot, captured, next, false);
  }

  /** One read of `slot`; `guard` refuses a required slot the marker the pattern wants next. */
  private readOnce(
    tokens: TokenStream,
    slot: RoleSlot,
    captured: Map<SemanticRole, SemanticValue>,
    next: PatternToken | undefined,
    guard: boolean
  ): boolean {
    // A required slot never takes the marker the pattern wants next as its
    // value (`v0x を 実行`: `を` is the marker, not the patient).
    if (guard && !slot.optional && next?.type === 'literal') {
      const token = tokens.peek();
      if (token && this.view.wouldMatch(next, token)) return false;
    }
    if (slot.greedy) {
      const value = readGreedy(tokens, greedyStopMarkers(this.view.patternRest()));
      if (value) {
        captured.set(slot.role, value);
        return true;
      }
      return slot.optional ?? false;
    }
    return readRoleValue(tokens, slot, captured, this.profile);
  }

  maySkipSlot(
    patternToken: PatternToken,
    token: LanguageToken | null,
    next: PatternToken | undefined
  ): boolean {
    const slot =
      patternToken.type === 'group' && patternToken.optional
        ? patternToken.tokens.every(t => t.type === 'role')
          ? patternToken.tokens[0]
          : undefined
        : patternToken;
    if (!slot || slot.type !== 'role' || !slot.optional) return false;
    return !!token && this.view.wouldMatch(next, token);
  }

  atClauseEnd(tokens: TokenStream): boolean {
    return tokens.isAtEnd();
  }
}

/** A reader factory for `MatchSkeleton`, reading with the given profiles. */
export function createStockReader(
  profiles: Readonly<Record<string, ReadingProfile>> = {}
): (view: MatchView) => ValueReader {
  return view => new StockValueReader(view, profiles);
}
