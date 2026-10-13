/**
 * The parser's clause keywords: is a token the language's `then`, `else`,
 * `end`, `if`, `unless`, `js`, or its patient marker? Each reads the
 * language's profile, and the curated sets where a profile word collides.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { LanguageToken } from '../types';
import { tryGetProfile } from '../registry';
import { endWordIsValue, type EndWordPlace } from './utils/expression-lexicon';
import { curatedEndKeywordSet } from './end-keywords';
import { isAtEndPositionNoun } from '../patterns/put';

/**
 * Match a token value against a language profile's keyword (primary +
 * alternatives) for the given key. Used by the then/end/else recognizers to
 * cover languages absent from their curated keyword maps — every profile
 * carries `then`/`end`/`else`, so this generalizes recognition to all 24
 * languages without hand-maintaining each map.
 */
export function profileKeywordMatches(language: string, key: string, value: string): boolean {
  const kw = (
    tryGetProfile(language)?.keywords as
      Record<string, { primary?: string; alternatives?: string[] }> | undefined
  )?.[key];
  if (!kw) return false;
  if (kw.primary?.toLowerCase() === value) return true;
  return !!kw.alternatives?.some(a => a.toLowerCase() === value);
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

export function isThenKeyword(value: string, language: string): boolean {
  const v = value.toLowerCase();
  const thenKeywords: Record<string, Set<string>> = {
    en: new Set(['then']),
    // 'そして' and ko '그리고' are deliberately ABSENT: they are what the ja/ko
    // renderers write for `and` (`p そして q`), so keeping them here split a
    // condition or value at its `and`. then-chains use それから / 그다음.
    ja: new Set(['それから', '次に']),
    ar: new Set(['ثم', 'بعدها', 'ثمّ']),
    es: new Set(['entonces', 'luego', 'después']),
    ko: new Set(['그다음', '그런후', '그러면']),
    // 之后 is deliberately ABSENT: the zh transformer emits it as positional
    // `after` (`放置 把 X 之后 Y`, put-after) and emits 那么 for then — keeping
    // it here split the put clause at 之后 and dropped the put.
    zh: new Set(['然后', '接着', '那么']),
    // 'sonra' is deliberately ABSENT (mirrors zh dropping 之后): the tr
    // transformer emits it as positional `after` (`{patient} sonra {dest} … koy`,
    // put-after); keeping it here split the put clause at sonra and dropped the
    // put. then-chains use ardından (the i18n dict's then emission).
    tr: new Set(['ardından', 'daha sonra', 'ardindan']),
    pt: new Set(['então', 'depois', 'logo']),
    fr: new Set(['puis', 'ensuite', 'alors']),
    de: new Set(['dann', 'danach', 'anschließend']),
    id: new Set(['lalu', 'kemudian', 'setelah itu']),
    tl: new Set(['pagkatapos', 'tapos']),
    // 'পরে' is deliberately ABSENT (mirrors tr dropping 'sonra' / zh dropping
    // 之后): the bn transformer emits it as positional `after` (`{patient} পরে
    // {dest} … রাখুন`, put-after); keeping it here split the put clause at পরে and
    // dropped the put. then-chains use তারপর (the bn dict's then emission).
    bn: new Set(['তারপর']),
    qu: new Set(['chaymantataq', 'hinaspa', 'chaymanta', 'chayqa']),
    sw: new Set(['kisha', 'halafu', 'baadaye']),
  };
  // Languages with a curated map keep their exact (colloquial-rich) behavior.
  // Languages absent from it (it/ru/th/vi/he/hi/ms/pl/uk) fall back to the
  // profile's `then` form + the English literal the transformer passes through —
  // without this their multi-command then-chains collapsed to the first command.
  const curated = thenKeywords[language];
  if (curated) return curated.has(v);
  return v === 'then' || profileKeywordMatches(language, 'then', v);
}

/**
 * Check if a token is an 'else' keyword in the given language. Derived from the
 * language profile (primary + alternatives), with the English literal always
 * accepted (the grammar transformer leaves `else` verbatim for profiles without
 * an else form). Used to let the compound fallback recognize an `if … else …`
 * block whose branches are joined by `else` rather than a then-keyword.
 */
export function isElseKeyword(value: string, language: string): boolean {
  const v = value.toLowerCase();
  // Upstream reads `otherwise` as `else`; English is written with `else`.
  if (v === 'else' || v === 'otherwise') return true;
  return profileKeywordMatches(language, 'else', v);
}

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
 * Whether a token opens a `js` block. The `js` command keyword survives
 * translation verbatim (the i18n transformer masks the whole block, so the
 * keyword stays English), so the English literal is the reliable signal; the
 * profile form is also accepted for completeness.
 */
export function isJsKeyword(token: LanguageToken): boolean {
  const v = (token.normalized ?? token.value).toLowerCase();
  return v === 'js' || profileKeywordMatches('en', 'js', v);
}

/**
 * Whether a token is the language's own PATIENT role marker, by surface.
 * Homonym particles carry no `normalized` (zh `把` tokenizes as a bare
 * particle), so the profile's declared forms are what identify it.
 */
export function isPatientMarker(token: LanguageToken, language: string): boolean {
  const spec = (
    tryGetProfile(language)?.roleMarkers as
      Record<string, { primary?: string; alternatives?: string[] } | undefined> | undefined
  )?.patient;
  if (!spec?.primary) return false;
  const value = token.value.toLowerCase();
  if (spec.primary.toLowerCase() === value) return true;
  return !!spec.alternatives?.some(a => a.toLowerCase() === value);
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
 * Check if a token value is an `if` keyword in the given language (profile
 * primary + alternatives, with the English literal always accepted).
 */
export function isIfKeyword(value: string, language: string): boolean {
  const v = value.toLowerCase();
  if (v === 'if') return true;
  return profileKeywordMatches(language, 'if', v);
}

/**
 * Check if a token value is an `unless` keyword (negated conditional).
 */
export function isUnlessKeyword(value: string, language: string): boolean {
  const v = value.toLowerCase();
  if (v === 'unless') return true;
  return profileKeywordMatches(language, 'unless', v);
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
  const word = (t: LanguageToken | undefined) => t?.value.toLowerCase();
  const positional =
    (word(place.next) === 'of' &&
      (word(place.prev) === 'at' ||
        (word(place.prev) === 'the' && word(place.beforePrev) === 'at'))) ||
    isAtEndPositionNoun(language, tok.value, place.prev?.value, place.next?.value);
  return endWord && !endWordIsValue(place, language) && !positional;
}
