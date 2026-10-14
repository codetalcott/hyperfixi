/**
 * End words: a language's word for a block's `end` (es `fin`, tr `son`, ja
 * `終わり`, bn `শেষ`), and the three questions the parser asks of one
 * (docs-internal/END_WORD_READERS.md, M3 C3):
 *
 * 1. Does it close a block here? (the block scanners, the clause walk, the
 *    fused handler's scan)
 * 2. Does a clause or a value stop here? (the role capture, the value extent,
 *    the trailing-role scans)
 * 3. Is it a value here? A variable spelled like it, as upstream reads `put
 *    end into #out` (es `poner fin en #out`): {@link endWordIsValue}.
 *
 * Every scanner asks them here. The word lists and the definition sit one
 * layer down, in `end-keywords.ts`, because `endWordIsValue` lives in the
 * expression lexicon beside the sense tables it shares, and the lexicon needs
 * the definition too: one module for both would be an import cycle.
 *
 * C3 Phase 1 moved each reader's own definition here, its body unchanged;
 * the phases after it replace them with one.
 */
import type { LanguageToken } from '../types';
import { tryGetProfile } from '../registry';
import { isAtEndPositionNoun } from '../patterns/put';
import { isThenKeyword, profileKeywordMatches } from './clause-keywords';
import { curatedEndKeywordSet, isCuratedEndKeyword, type EndWordPlace } from './end-keywords';
import { endWordIsValue } from './utils/expression-lexicon';

export {
  curatedEndKeywordSet,
  endWordPlace,
  isCuratedEndKeyword,
  isEndWord,
  type EndWordPlace,
} from './end-keywords';
export { endWordIsValue } from './utils/expression-lexicon';

/**
 * Check if a token is an 'end' keyword in the given language.
 */
export function isEndKeyword(value: string, language: string): boolean {
  const v = value.toLowerCase();
  // Curated sets live in end-keywords.ts (shared with the pattern matcher's
  // role-value guards) — see that module for the collision-audit notes.
  //
  // The English literal `end` is accepted in EVERY language, not just the
  // profile-fallback ones: hyperscript keywords that pass through a translation
  // untouched keep their English form, and crucially a masked `js(…) … end`
  // block restores its terminator as the English `end`. If a curated language
  // (es `fin`, ja `終わり`, …) rejected that literal, the depth tracker in
  // `tryParseConditionalBlock` would count the js body's `if` (+1) but never the
  // js block's `end` (−1) — leaving depth unbalanced so the conditional
  // over-consumes the rest of the handler body (the removable/sortable
  // command-drop: `trigger`, `remove`, … vanish after the js-bearing `if`).
  // en already works because `end` is in its curated set; this aligns the rest.
  const curated = curatedEndKeywordSet(language);
  if (curated) return v === 'end' || curated.has(v);
  return v === 'end' || profileKeywordMatches(language, 'end', v);
}

/**
 * Is `tok` the language's `then` where it stands? tl `tapos` is both `then`
 * and one of its end words, and where a value stands it is neither (C3,
 * endWordIsValue): `kung tapos at flag …` (if tapos and flag) read `if` with
 * no condition, then its branch.
 */
export function isThenAt(tok: LanguageToken, place: EndWordPlace, language: string): boolean {
  if (!isThenKeyword(tok.value, language)) return false;
  return !(isEndKeyword(tok.value, language) && endWordIsValue(place, language));
}

/**
 * The terminator of a js BLOCK, which is looser than {@link isEndKeyword}.
 *
 * A curated language's end set deliberately omits surfaces that double as the
 * positional word `last` — bn `শেষ`, ar `آخر` — because a role-value guard
 * must not read `last` as a terminator. But `শেষ` IS what the renderer emits
 * for bn's `end`, so inside a js block that exclusion means the block has no
 * recognizable close at all: `consumeJsBlock` walks past it and the JavaScript
 * is handed to the command patterns (bn `js(me) if (…) return "cancel";` came
 * back as `js ;`). The homonym cannot bite here — the span being scanned is
 * raw JavaScript, which is ASCII, so a Bengali positional `last` cannot occur
 * inside it — so the profile's own `end` word is accepted alongside the
 * curated set.
 */
export function isJsBlockTerminator(value: string, language: string): boolean {
  return (
    isEndKeyword(value, language) || profileKeywordMatches(language, 'end', value.toLowerCase())
  );
}

/**
 * Is the end word `tok` the noun of an `at end of` phrase, a position and no
 * block's end (`put it at end of body`, make-toast-element)? English writes
 * `at` or `at the` before it and `of` after; every other language its own
 * words, from put's patterns (zh `在 结束 的`, id `di akhir dari`, vi `tại
 * kết thúc của tôi`, where `of` and `me` are one token: isAtEndPositionNoun).
 */
export function isAtEndOfNoun(tok: LanguageToken, place: EndWordPlace, language: string): boolean {
  const word = (t: LanguageToken | undefined) => t?.value.toLowerCase();
  return (
    (word(place.next) === 'of' &&
      (word(place.prev) === 'at' ||
        (word(place.prev) === 'the' && word(place.beforePrev) === 'at'))) ||
    isAtEndPositionNoun(language, tok.value, place.prev?.value, place.next?.value)
  );
}

/**
 * Block-terminator check for the conditional fold, by surface OR normalized
 * form. bn renders `end` as শেষ, which the curated {@link isEndKeyword} set
 * cannot list by value (শেষ is ALSO bn's positional `last` — the ar آخر
 * lesson), so the value-only check never terminated a bn fold: the block
 * consumed the rest of the handler body and every sibling after the
 * conditional nested into the branch (behavior-removable bn dropped both
 * `trigger`s once the junk verb-first event capture stopped masking it).
 * The tokenizer already disambiguates the dual-use word: a KEYWORD token
 * whose normalized form is `end` is the block terminator — except when
 * followed by a selector, which is the positional reading (`শেষ <li/>` =
 * `last <li/>`), never a block close. The lookahead exception is scoped to
 * normalized-only recognition: a curated surface form (`end`, ja 終わり, …)
 * keeps terminating even before a selector-led sibling clause.
 */
export function isBlockEndToken(
  tok: LanguageToken,
  place: EndWordPlace,
  language: string
): boolean {
  const next = place.next;
  const endWord =
    isEndKeyword(tok.value, language) ||
    (tok.kind === 'keyword' &&
      (tok.normalized ?? '').toLowerCase() === 'end' &&
      !(next && next.kind === 'selector'));
  // An end word where a value stands is a variable spelled like it (C3): tr
  // `eğer son ve flag` (if son and flag) ended its block at `son`. The noun
  // of `at end of` is a position (`if x put 'a' at end of me end`): taken for
  // the block's `end`, it ended the conditional early, its own `end` closed
  // the loop or handler around it, and the commands after it ran inside it.
  return endWord && !endWordIsValue(place, language) && !isAtEndOfNoun(tok, place, language);
}

/**
 * The SOV value groups' stray terminator: a block terminator the SOV reorder
 * absorbed into a role phrase (bn repeat-while renders wait's object phrase
 * as `200ms শেষ কে` — the terminator belongs after the verb) is structural
 * residue, never part of a value: joined in it glues (`200msশেষ`), alone it
 * fabricates a phantom trailing role. Recognized like isBlockEndToken
 * (curated isEndKeyword surface OR keyword normalized `end`), but the
 * positional lookahead applies to BOTH modes: a value group is exactly where
 * a positional-`last` phrase lives (bn `শেষ <li/>`, tr `son .item`), so any
 * terminator-shaped token followed by a selector keeps its positional
 * reading.
 */
export function isStrayTerminator(
  t: LanguageToken,
  next: LanguageToken | undefined,
  language: string
): boolean {
  const curatedEnd = isEndKeyword(t.value, language);
  const normalizedEnd = t.kind === 'keyword' && (t.normalized ?? '').toLowerCase() === 'end';
  if (!curatedEnd && !normalizedEnd) return false;
  // A terminator the clause walker matched to a tracked block opener is
  // ALWAYS structural (never positional `last`), even before a selector —
  // see the annotation in parseBodyWithClauses.
  if (t.metadata?.closesTrackedBlock === true) return true;
  // A CURATED end word is never the positional `last`: the curated sets
  // are audited for exactly that collision (tr emits `sonuncu` for last,
  // `son` stays the terminator; qu last is `qhipa`, not `tukuy`; ar آخر is
  // deliberately absent BECAUSE it is positional). Without this, a loop's
  // own `son` directly before the next command's selector was read as
  // `last <sel>` and prefixed that command's role value (tr
  // behavior-sortable remove.patient="last .{dragClass}").
  if (curatedEnd) return true;
  // Dual-use words reached via the normalized fallback (bn শেষ = end AND
  // positional last) keep their positional reading before a selector.
  return !(next && next.kind === 'selector');
}

/**
 * The role capture's end word (neverAValue, C3): a block terminator by
 * normalized form, except `end` before a selector, which keeps its
 * positional `last` reading (bn `শেষ <li/>`), or a curated end word by value
 * (tr `son`, qu `tukuy`), whatever the tokenizer normalized it to (tr `son`
 * → `last`). Only a keyword: a string "end" is a value.
 */
export function isCaptureEndWord(
  token: LanguageToken,
  next: LanguageToken | undefined,
  language: string
): boolean {
  if (token.kind !== 'keyword') return false;
  const norm = (token.normalized ?? token.value).toLowerCase();
  return (
    (norm === 'end' && next?.kind !== 'selector') || isCuratedEndKeyword(token.value, language)
  );
}

/** A keyword normalized `end`: the clause end of a slot's next token (clauseEndsAt). */
export function isNormalizedEnd(token: LanguageToken): boolean {
  return token.kind === 'keyword' && (token.normalized ?? token.value).toLowerCase() === 'end';
}

/**
 * The block parser's end words: `end`, and the profile's word for it with
 * its alternatives, matched by a token's value or its normalized form, of any
 * token kind (see {@link matchesBlockEnd}).
 */
export function blockEndForms(language: string): Set<string> {
  const set = new Set<string>(['end']);
  const entry = tryGetProfile(language)?.keywords?.end;
  if (entry) {
    if (entry.primary) set.add(entry.primary.toLowerCase());
    for (const alt of entry.alternatives ?? []) set.add(alt.toLowerCase());
  }
  return set;
}

/** Does `tok` match one of the block parser's end forms (by value or normalized form)? */
export function matchesBlockEnd(tok: LanguageToken, forms: ReadonlySet<string>): boolean {
  if (forms.has(tok.value.toLowerCase())) return true;
  return tok.normalized ? forms.has(tok.normalized.toLowerCase()) : false;
}
