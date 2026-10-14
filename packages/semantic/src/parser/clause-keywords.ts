/**
 * The parser's clause keywords: is a token the language's `then`, `else`,
 * `if`, `unless`, `js`, or its patient marker? Each reads the language's
 * profile, and the curated sets where a profile word collides. `end` has its
 * own module, `end-words.ts` (C3).
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { LanguageToken } from '../types';
import { tryGetProfile } from '../registry';

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
