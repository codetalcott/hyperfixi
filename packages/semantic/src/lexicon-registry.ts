/**
 * Registry for per-language render vocabulary.
 *
 * WHY A REGISTRY RATHER THAN A PROFILE FIELD
 * ------------------------------------------
 * The lexicon began life as `LanguageProfile.lexicon`, which was correct
 * modelling and wrong packaging: a bundler cannot drop an unused PROPERTY of an
 * exported object literal (the object is one binding, and properties are read
 * dynamically). Parsing requires the profile, so the profile retains the
 * lexicon, so every parse-only consumer shipped the full render vocabulary of
 * every language it registered — measured at ~0.75 KB gz per language, charged
 * even to bundles that never call `render`.
 *
 * The hyperscript-adapter's slim bundles are the case that matters: they exist
 * specifically to avoid shipping English render data (~26 KB), and they render
 * with their own English-only renderer, so foreign render vocabulary is pure
 * dead weight to them.
 *
 * Moving the data into `lexicons/{code}.ts` — separate modules that register
 * themselves as a side effect — makes it droppable, because a consumer that
 * never imports them never reaches them.
 *
 * WHO IMPORTS WHAT
 * ----------------
 *   `languages/{code}`  tokenizer + profile         → parsing (no lexicon)
 *   `lexicons/{code}`   render vocabulary           → rendering into that language
 *
 * The full entries (`index.ts` via `languages/_all`, and every `browser-*.ts`
 * bundle) import both, so nothing that renders today loses vocabulary. A
 * consumer that deliberately takes only `core` + `languages/{code}` — the slim
 * path — gets the smaller bundle.
 *
 * DEGRADATION IS SAFE, NOT SILENT-BROKEN. With no lexicon registered, the
 * renderer emits value interiors in English, which is exactly the behaviour
 * that shipped before the lexicon existed. Output stays valid; it is less
 * localized. That is why the lookup returns `undefined` rather than throwing.
 */
import type { LanguageLexicon } from './generators/profiles/types';

const lexicons = new Map<string, LanguageLexicon>();

/**
 * Register render vocabulary for a language. Called as a side effect by each
 * `lexicons/{code}.ts` module; last registration wins, so a host may override.
 */
export function registerLexicon(code: string, lexicon: LanguageLexicon): void {
  lexicons.set(code.toLowerCase(), lexicon);
}

/**
 * Look up render vocabulary. Returns `undefined` when the language's lexicon
 * module has not been imported — the caller must treat that as "render the
 * interior in English", not as an error.
 *
 * Regional tags fall back to their base language, matching `tryGetProfile`, so
 * `pt-BR` finds the `pt` lexicon.
 */
export function getLexicon(code: string): LanguageLexicon | undefined {
  const normalized = code.toLowerCase();
  return lexicons.get(normalized) ?? lexicons.get(normalized.split('-')[0]);
}

/** Language codes with registered render vocabulary. Diagnostics and tests. */
export function getRegisteredLexicons(): string[] {
  return [...lexicons.keys()].sort();
}
