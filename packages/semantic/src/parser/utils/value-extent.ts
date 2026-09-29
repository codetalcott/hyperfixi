/**
 * Where a value ends
 * ==================
 * The value-extent rule (C13–C16 in docs-internal/MULTILINGUAL_NEXT_STEPS.md,
 * "Value reading"). The role capture (`PatternMatcher.absorbExpressionTail`)
 * supplies an ExtentContext and applies the result; everything else is here.
 *
 * A role capture takes one known SHAPE of value: a token, a possessive pair, a
 * property path, an operator run over known operands. When a value is longer
 * than the shape it recognized (`obj's v`, `length of arr`, `#a's
 * textContent's length`, `String(n) + 2`, `-n`), the capture stops short. The
 * leftover tokens then fail the pattern's next marker and the command drops
 * (`put obj's v into #out` parsed as a bare `on click`), or the pattern
 * completes and the tail is lost (`set x to v of obj` kept `v`). Every
 * translation is rendered from the English parse, so it inherited the loss in
 * all 24 languages (PR 53).
 *
 * So after a capture, while tokens remain before the value's boundary, take
 * the longest run from the capture's start that the expression parser reads
 * WHOLE, joined to English as every expression value is. The boundary is:
 *
 * - a marker the pattern still owes, or the clause's end;
 * - a marker of ANY role of the command, in this language, whether or not
 *   the matching variant has a slot for it. Otherwise a variant without that
 *   role wins by swallowing its marker (uk `з` is both swap's `with` and
 *   `of`), and fetch's responseType, whose marker a language may leave in
 *   English (es `como json` joins as `as json`);
 * - a `.class` across a space after an operand (`.active .active`, `null
 *   .error`): another value, which the English parser would read as a member;
 * - any keyword that is not expression vocabulary: a command verb (`set x to
 *   true and put 2 …`), an event name (tl `wait from document pointermove o
 *   pointerup`), a marker (continuesValue).
 *
 * And the run must read as ONE expression (readsAsOneExpression): no unclosed
 * quote (`'s v "Y"`, a split taken after an owner) and no word the English
 * parser cannot read.
 *
 * Each of these exists because the whole-corpus probe or the value matrix
 * caught its absence turning a failing variant or SOV clause split into a
 * winning one, or semantic's own suite caught it losing a command. A first cut
 * also refused identifiers outside ASCII, stopped at any word naming a
 * command, and refused a value that began at an operator word or a possessive
 * marker: dropped, since the value matrix measured them costing 437 fixed
 * pairs and nothing measured them protecting anything.
 *
 * Where a marker or the clause end bounds the value, that is all. A slot
 * followed directly by another role (it/pl/ru/uk `set`'s destination, then its
 * value; an increment's bare amount in the languages that write it without
 * `by`) has no marker to stop at: the parser would take both. There the value
 * runs on only through a possessive (possessiveLinkEnds, PR 83): `obj's v` and
 * `v of obj` are one written target, and nothing else continues it, so
 * `impostare in obj's v 5` keeps its `5`. Without it the target stopped at
 * `obj` and the next role took the rest: `increment obj by '`, `set v to of`.
 */

import { parseExpression } from '../../ast-builder/expression-parser/parser';
import { tokenize } from '../../ast-builder/expression-parser/tokenizer';
import type { LanguageProfile } from '../../generators/profiles/types';
import type { LanguageToken } from '../../types';
import { isCuratedEndKeyword } from '../end-keywords';
import { isParticleAfterOf } from '../value-reading';
import {
  expressionWordOf,
  isConnectiveOperand,
  isConversionTypeName,
  isCopulaIn,
  isOfPossessiveMarker,
  joinExpressionTokens,
} from './expression-lexicon';
import { RUN_OPERATORS } from './operators';

/**
 * The English words an expression may contain, as `expressionWordOf` reads a
 * keyword or particle. A value runs through these and through operands; any
 * other keyword (a marker, a command verb, an event name like `pointerup`)
 * ends it.
 */
export const EXPRESSION_WORDS: ReadonlySet<string> = new Set([
  "'s",
  'a',
  'am',
  'an',
  'and',
  'as',
  'closest',
  'contain',
  'contains',
  'do',
  'does',
  'empty',
  'equal',
  'equals',
  'exist',
  'exists',
  'false',
  'first',
  'greater',
  'has',
  'have',
  'in',
  'include',
  'includes',
  'is',
  'it',
  'its',
  'last',
  'less',
  'match',
  'matches',
  'me',
  'mod',
  'my',
  'next',
  'no',
  'not',
  'null',
  'of',
  'or',
  'previous',
  'really',
  'some',
  'than',
  'the',
  'true',
  'undefined',
  'you',
  'your',
  // The references a value may name after a possessive (`event's detail`,
  // `x's target`): without them the value ended at `x's`, and English `put
  // event's detail into #out` parsed as a bare `on click`. Not `event`, which
  // some languages' event marker normalizes to, nor `window` and `document`,
  // which a value never names as a property and an event source often
  // follows (`… or pointerup from document`).
  'result',
  'target',
  'body',
  'detail',
]);

/**
 * The expression words that join or qualify operands, as opposed to naming
 * one: a `.class` across a space continues a value only after one (`no .w`),
 * never after an operand (`null .error` is two values).
 */
export const OPERATOR_WORDS: ReadonlySet<string> = new Set([
  'am',
  'and',
  'as',
  'contain',
  'contains',
  'do',
  'does',
  'empty',
  'equal',
  'equals',
  'exist',
  'exists',
  'greater',
  'has',
  'have',
  'in',
  'include',
  'includes',
  'is',
  'less',
  'match',
  'matches',
  'mod',
  'no',
  'not',
  'of',
  'or',
  'really',
  'some',
  'than',
]);

const TRAILING_CONVERSION = /\s+as\s+([A-Za-z]\w*)!?\s*$/;

/**
 * Does the expression parser read ALL of `raw` as one expression?
 *
 * - A conversion (`… as Int`) is allowed when it names a known type:
 *   downstream reads it, as it reads the conversion fold's values. `fetch … as json` never gets here, since the matcher
 *   stops a value at the command's responseType marker.
 * - An unclosed quote is never whole: `'s v "Y"` is a split taken after an
 *   owner, not a string.
 * - Neither is a word outside ASCII, outside strings. This parser's tokenizer
 *   skips what it cannot read, so `আছে #modal` would parse as `#modal` alone.
 */
export function readsAsOneExpression(raw: string): boolean {
  let body = raw;
  for (let m = TRAILING_CONVERSION.exec(body); m; m = TRAILING_CONVERSION.exec(body)) {
    if (!isConversionTypeName(m[1] ?? '')) return false;
    body = body.slice(0, m.index);
  }
  const code = body.replace(/"[^"]*"|'[^']*'/g, '');
  if (/["']/.test(code.replace(/'s\b/g, ''))) return false;
  if (/[^\x00-\x7F]/.test(code)) return false;
  const result = parseExpression(body);
  if (!result.success || result.consumed === undefined) return false;
  // The tokenizer ends with an EOF token, which the parser never consumes.
  if (result.consumed !== tokenize(body).length - 1) return false;
  // A conversion inside the value must name a type too (`x as Int + 1`).
  return conversionTypes(result.node).every(isConversionTypeName);
}

/** The type names of every conversion in a parsed expression. */
function conversionTypes(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const record = n as { type?: unknown; targetType?: { name?: unknown } };
    if (record.type === 'asExpression') out.push(String(record.targetType?.name ?? ''));
    Object.values(n).forEach(walk);
  };
  walk(node);
  return out;
}

/** What the extent scan needs from the pattern it runs in. */
export interface ExtentContext {
  /** The language's profile: its of-markers, and the join's reading of each word. */
  readonly profile: LanguageProfile | undefined;
  /** Does a marker the pattern still owes want this token? */
  owes(token: LanguageToken): boolean;
  /** The markers of every role of the command being built, in this language, lowercased. */
  readonly commandMarkers: ReadonlySet<string>;
  /** The command has a `responseType` role, whose marker is `as` (fetch). */
  readonly hasResponseType: boolean;
}

/** Do these two tokens touch in the SOURCE (no whitespace between them)? */
export function tokensAdjacent(
  left: { position?: { start?: number; end?: number } } | null | undefined,
  right: { position?: { start?: number; end?: number } } | null | undefined
): boolean {
  return (
    left?.position?.end !== undefined &&
    right?.position?.start !== undefined &&
    left.position.end === right.position.start
  );
}

/** The words an `equal to` phrase follows: `is`, `not`, `really`, `am`, and `or equal to`. */
const EQUAL_TO_LEADS: ReadonlySet<string> = new Set(['is', 'not', 'really', 'am', 'or']);

/**
 * Does the token at `i` end an `equal to` phrase (`is equal to`, `is not equal
 * to`, `is really equal to`, `is greater than or equal to`)? That `to` is the
 * operator's, not a marker: without this `obj's v is equal to 6` stopped at
 * it, and `set` lost `is equal to 6` (`to` is its own marker) while `put`
 * dropped its whole value. Only after a comparison word, so a variable named
 * `equal` keeps its marker (`set equal to 5`).
 */
function endsEqualTo(all: readonly LanguageToken[], i: number, language: string): boolean {
  const word = (k: number): string => {
    const token = all[k];
    return token
      ? expressionWordOf(language, token, all[k - 1], all[k + 1], undefined).toLowerCase()
      : '';
  };
  return word(i) === 'to' && word(i - 1) === 'equal' && EQUAL_TO_LEADS.has(word(i - 2));
}

/**
 * Is the token the word `a`? The `a` of a type check (`is a Number`, `is not a
 * String`) is the operator's, not a marker: es, it and pt spell `to` `a` and
 * tr has a dative `a`, so after a value longer than one token (`obj's v`, `v
 * of obj`, `String(n)`, `{}`) `obj's v es a Number` stopped at it and lost the
 * check, or the whole command (a lone operand is the operator run's, which
 * reads the phrase). Where `a` is the marker (`establecer x a 5`), no run
 * through it reads as one expression, and the value ends before it
 * (longestWholeRun). `an` is no marker anywhere; a copula and a type-name guard
 * protected nothing the matrix, the corpus, the names oracle or the suite
 * measure (PR 102).
 */
function isWordA(token: LanguageToken): boolean {
  return token.value === 'a';
}

/** C13: the clause's end, or a marker the pattern still owes. */
export function isValueBoundary(token: LanguageToken, ctx: ExtentContext): boolean {
  if (token.kind === 'conjunction') return true;
  if (token.kind === 'keyword') {
    const norm = (token.normalized ?? token.value).toLowerCase();
    if (norm === 'then' || norm === 'end' || norm === 'else') return true;
    if (isCuratedEndKeyword(token.value, ctx.profile?.code ?? '')) return true;
  }
  return ctx.owes(token);
}

/**
 * Does the value stop at the token at `i`: a boundary, or a marker of the
 * command? Not at the `in` after a copula, the operator (C15, PR 69), nor at a
 * particle after `of`, its owner (C15, PR 74), nor at the `to` of `equal to`
 * (C15, PR 94), nor at the word `a`, a type check's (C15, PR 102).
 */
function stopsAt(all: readonly LanguageToken[], i: number, ctx: ExtentContext): boolean {
  const language = ctx.profile?.code ?? 'en';
  if (isCopulaIn(language, all, i) || isParticleAfterOf(all, i)) return false;
  if (endsEqualTo(all, i, language) || isWordA(all[i]!)) return false;
  const token = all[i]!;
  return isValueBoundary(token, ctx) || ctx.commandMarkers.has(token.value.toLowerCase());
}

/**
 * C13, C14, C15: may a value run on through the token at `i`? Operands
 * (literals, selectors, identifiers in any script), operators and punctuation,
 * possessive markers, and keywords whose English sense is expression
 * vocabulary. Not another keyword: a command verb (`true and put 2 …`), an
 * event name (tl `pointermove o pointerup`), a marker. Not a `.class` across a
 * space after an operand, and not the command's responseType marker in its
 * English sense (`fetch … as json`, es `como json`).
 */
export function continuesValue(
  all: readonly LanguageToken[],
  i: number,
  ctx: ExtentContext
): boolean {
  const token = all[i]!;
  const prev = all[i - 1];
  const language = ctx.profile?.code ?? 'en';
  if (token.kind === 'literal') return true;
  // en splits a possessive `obj's` into `obj` `'` `s`.
  if (token.value === "'" && all[i + 1]?.value === 's') return true;
  if (token.value === 's' && prev?.value === "'") return true;
  if (token.kind === 'selector') {
    // After an operator or an operator word (`no .w`, `+ .x`) a `.class`
    // across a space is the next operand; after an operand, another value.
    if (!token.value.startsWith('.') || !prev || tokensAdjacent(prev, token)) return true;
    if (RUN_OPERATORS.has(prev.value) || /^[([,]$/.test(prev.value)) return true;
    const prevWord = expressionWordOf(language, prev, all[i - 2], token, undefined).toLowerCase();
    return OPERATOR_WORDS.has(prevWord);
  }
  if (RUN_OPERATORS.has(token.value)) return true;
  if (/^[()[\],.!<>=+\-*/%]+$/.test(token.value)) return true;
  if (isOfPossessiveMarker(ctx.profile, token)) return true;
  // C14: a conjunction where none can stand (PR 59).
  if (isConnectiveOperand(language, token, prev, all[i + 1])) return true;
  if (isCopulaIn(language, all, i) || isParticleAfterOf(all, i)) return true;
  if (endsEqualTo(all, i, language)) return true;
  const word = expressionWordOf(language, token, prev, all[i + 1], undefined).toLowerCase();
  if (word === 'as' && ctx.hasResponseType) return false;
  if (EXPRESSION_WORDS.has(word)) return true;
  // An identifier in any script: the join translates a localized property
  // word (bn `দৈর্ঘ্য` → `length`), and readsAsOneExpression rejects what it
  // leaves untranslated. qu and uk keep an apostrophe in a word, so `foo's` in
  // `obj's foo's bar` is one token. A name the reader fused, `(si)`, is one too
  // (registry.tokenize): `length of (si)`.
  return (
    token.kind === 'identifier' &&
    /^(?:[\p{L}_$][\p{L}\p{M}\p{N}_$]*('s)?|\([\p{L}_$][\p{L}\p{M}\p{N}_$]*\))$/u.test(token.value)
  );
}

/**
 * C13: where a value that a marker or the clause's end bounds may end, from
 * the stream position `from`, longest first: every index up to the first
 * token it cannot run through.
 */
export function valueTailEnds(
  all: readonly LanguageToken[],
  from: number,
  ctx: ExtentContext
): number[] {
  if (!all[from] || stopsAt(all, from, ctx)) return [];
  let end = from;
  while (end < all.length && !stopsAt(all, end, ctx) && continuesValue(all, end, ctx)) end++;
  const ends: number[] = [];
  for (let k = end; k > from; k--) ends.push(k);
  return ends;
}

/**
 * C16: where each possessive link after a value ends, longest first — `'s v`
 * (en splits it into `'` `s`; uk keeps `obj's` one word, so the property
 * follows it), or an of-marker and its owner. What a value no marker bounds
 * may run on through (PR 83).
 */
export function possessiveLinkEnds(
  all: readonly LanguageToken[],
  from: number,
  profile: LanguageProfile | undefined
): number[] {
  const ends: number[] = [];
  let k = from;
  for (;;) {
    const t = all[k];
    if (!t) break;
    if (t.value === "'" && all[k + 1]?.value === 's' && all[k + 2]) k += 3;
    else if (/.'s$/.test(all[k - 1]?.value ?? '')) k += 1;
    else if (isOfPossessiveMarker(profile, t) && all[k + 1]) k += 2;
    else break;
    ends.push(k);
  }
  return ends.reverse();
}

/**
 * The longest run from `start` to one of `ends` (longest first) that the
 * expression parser reads whole, and its English raw; undefined if none does.
 */
export function longestWholeRun(
  all: readonly LanguageToken[],
  start: number,
  ends: readonly number[],
  profile: LanguageProfile | undefined
): { end: number; raw: string } | undefined {
  for (const end of ends) {
    const raw = joinExpressionTokens(all.slice(start, end), profile);
    if (readsAsOneExpression(raw)) return { end, raw };
  }
  return undefined;
}
