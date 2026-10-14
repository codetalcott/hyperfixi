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
 * Every scanner asks them here. The definition, {@link endWordKind}, sits one
 * layer down, in `end-keywords.ts`, because `endWordIsValue` lives in the
 * expression lexicon beside the sense tables it shares, and the lexicon reads
 * end words too: one module for both would be an import cycle.
 *
 * A reader reads the kind one of three ways: {@link isCuratedEndWord} (the
 * curated kind only), {@link isEndWordAt} (either kind, but not the positional
 * `last` before a selector) or {@link isEndWord} (either kind, anywhere).
 */
import type { LanguageToken } from '../types';
import { isAtEndPositionNoun } from '../patterns/put';
import { isThenKeyword } from './clause-keywords';
import { endWordKind, isEndWord, type EndWordPlace } from './end-keywords';
import { endWordIsValue } from './utils/expression-lexicon';

export {
  endWordKind,
  endWordPlace,
  endWordSurfaces,
  isEndWord,
  type EndWordKind,
  type EndWordPlace,
} from './end-keywords';
export { endWordIsValue } from './utils/expression-lexicon';

/**
 * A curated end word: read by its value, never the positional `last`. The
 * readers that do not read bn `শেষ` (`end`, and also `last`) at all: the
 * clause walk's own `end` (bn's closes an open loop there, through
 * isBlockEndToken, and never the body), the fused handler's body tests, the
 * trailing-role scans and the coverage residue.
 */
export function isCuratedEndWord(token: LanguageToken, language: string): boolean {
  return endWordKind(token, language) === 'curated';
}

/**
 * An end word where it stands: a curated one anywhere, and one of the `end`
 * kind except before a selector, where it is the positional `last` (bn `শেষ
 * <li/>`). A curated word keeps its reading before a selector-led sibling
 * clause: tr `son .item` is a loop's end, and the next command's patient.
 */
export function isEndWordAt(
  token: LanguageToken,
  next: LanguageToken | undefined,
  language: string
): boolean {
  const kind = endWordKind(token, language);
  return kind === 'curated' || (kind === 'end' && next?.kind !== 'selector');
}

/**
 * Is `tok` the language's `then` where it stands? tl `tapos` is both `then`
 * and one of its end words, and where a value stands it is neither (C3,
 * endWordIsValue): `kung tapos at flag …` (if tapos and flag) read `if` with
 * no condition, then its branch.
 */
export function isThenAt(tok: LanguageToken, place: EndWordPlace, language: string): boolean {
  if (!isThenKeyword(tok.value, language)) return false;
  return !(isCuratedEndWord(tok, language) && endWordIsValue(place, language));
}

/**
 * The terminator of a js BLOCK: an end word of either kind, before a selector
 * too. A role-value reader must not take bn `শেষ` (also `last`) for a
 * terminator, but `শেষ` IS what the renderer emits for bn's `end`, so a js
 * block read that way had no close at all: `consumeJsBlock` walked past it and
 * the JavaScript was handed to the command patterns (bn `js(me) if (…) return
 * "cancel";` came back as `js ;`). The homonym cannot bite here: the span
 * being scanned is raw JavaScript, which is ASCII, so a Bengali positional
 * `last` cannot occur inside it.
 */
export function isJsBlockTerminator(token: LanguageToken, language: string): boolean {
  return isEndWord(token, language);
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
 * Block-terminator check for the conditional fold: an end word where it
 * stands (isEndWordAt). bn renders `end` as শেষ, which is also its positional
 * `last`, so a curated set cannot list it; read by value alone, a bn fold
 * never closed, and every sibling after the conditional nested into its
 * branch (behavior-removable bn dropped both `trigger`s).
 */
export function isBlockEndToken(
  tok: LanguageToken,
  place: EndWordPlace,
  language: string
): boolean {
  // An end word where a value stands is a variable spelled like it (C3): tr
  // `eğer son ve flag` (if son and flag) ended its block at `son`. The noun
  // of `at end of` is a position (`if x put 'a' at end of me end`): taken for
  // the block's `end`, it ended the conditional early, its own `end` closed
  // the loop or handler around it, and the commands after it ran inside it.
  return (
    isEndWordAt(tok, place.next, language) &&
    !endWordIsValue(place, language) &&
    !isAtEndOfNoun(tok, place, language)
  );
}

/**
 * The SOV value groups' stray terminator: a block terminator the SOV reorder
 * absorbed into a role phrase (bn repeat-while renders wait's object phrase
 * as `200ms শেষ কে` — the terminator belongs after the verb) is structural
 * residue, never part of a value: joined in it glues (`200msশেষ`), alone it
 * fabricates a phantom trailing role. An end word where it stands
 * (isEndWordAt), since a value group is exactly where a positional-`last`
 * phrase lives (bn `শেষ <li/>`) — unless the clause walker matched it to a
 * tracked block opener, which makes it structural even before a selector (tr
 * behavior-sortable's `son .{dragClass}`, loop end then remove's patient: see
 * the annotation in parseBodyWithClauses).
 */
export function isStrayTerminator(
  t: LanguageToken,
  next: LanguageToken | undefined,
  language: string
): boolean {
  if (t.metadata?.closesTrackedBlock === true) return isEndWord(t, language);
  return isEndWordAt(t, next, language);
}
