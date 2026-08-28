/**
 * The translation primitives this package re-exports and builds on.
 *
 * These used to come straight from `@lokascript/i18n`'s `GrammarTransformer`.
 * They now come from `@lokascript/semantic` — the renderer every runtime surface
 * in this repo already uses (`hyperfixi.translate`, MCP `translate_code`, core's
 * `MultilingualHyperscript`) and the one the 3,657-row corpus is written by.
 *
 * WHAT CHANGES FOR A CALLER
 * -------------------------
 * The i18n transformer never failed: given something it could not parse it
 * substituted words and returned a result. Measured on the same inputs, it turns
 * `zzz qqq ###` into ja `qqq ### を zzz` and `not hyperscript at all!!` into
 * `hyperscript で all!! を ではない`. For a build-time tool that writes files, a
 * confident wrong answer is the worst failure mode available — it ships.
 *
 * The semantic translator throws instead (`SemanticParseError`). `translateHtml`
 * was already written for that: its `lenient` option (default true) catches and
 * keeps the original body, and `lenient: false` propagates. Both branches were
 * unreachable with a translator that never threw.
 */
import { translate as semanticTranslate } from '@lokascript/semantic';

/**
 * Translate hyperscript between any two languages.
 *
 * Identity when source and target match — kept from the i18n signature, and not
 * merely an optimization: a parse/render round trip normalizes incidental syntax
 * (`'Got it!'` comes back as `"Got it!"`), which a same-language call should not
 * do to a caller's source.
 *
 * @throws when the input cannot be parsed in `sourceLocale`, or `targetLocale`
 * has no registered renderer.
 */
export function translate(input: string, sourceLocale: string, targetLocale: string): string {
  if (sourceLocale === targetLocale) return input;
  return semanticTranslate(input, sourceLocale, targetLocale);
}

/** English → `targetLocale`. */
export function toLocale(input: string, targetLocale: string): string {
  return translate(input, 'en', targetLocale);
}

/** `sourceLocale` → English. */
export function toEnglish(input: string, sourceLocale: string): string {
  return translate(input, sourceLocale, 'en');
}
