/**
 * Eleventy plugin entry: `@hyperscript-tools/i18n/eleventy`
 *
 * Adds:
 *   - `translateHs` filter: translate a hyperscript snippet to a target lang.
 *       {{ snippet | translateHs("ja") }}
 *       {{ snippet | translateHs("ja", "en") }}     // explicit source
 *
 *   - `translateHsAll` filter: produce { lang: translated } for an array of
 *     target langs. Useful for emitting per-language code blocks side by side.
 *       {% set variants = snippet | translateHsAll(["ja","es","ko"]) %}
 *
 *   - `translateHsHtml` filter: rewrite every `_="..."` attribute in an HTML
 *     fragment. Useful for `{{ patternHtml | translateHsHtml("ja") | safe }}`.
 *
 * Usage:
 *   import hyperscriptI18n from '@hyperscript-tools/i18n/eleventy';
 *   export default function (eleventyConfig) {
 *     eleventyConfig.addPlugin(hyperscriptI18n);
 *   }
 *
 * The plugin is ASYNC: when `parseCheck` is on (the default), it awaits the
 * canonical `hyperscript.org` parser before returning. Eleventy 3 awaits plugin
 * callbacks passed to `addPlugin`, so the check is active before any template
 * renders. All three filters are registered SYNCHRONOUSLY before that await, so
 * an un-awaited caller (or Eleventy 2) still gets working filters — the check
 * simply activates once the parser finishes loading.
 */

import { translate } from '@lokascript/i18n';
import { translateHtml, translateHtmlToManyLangs } from './html.js';
import type { LangCode, TranslateHtmlOptions } from './html.js';
import { loadValidator, warnInvalidOnce, formatParseCheckReport } from './validate.js';
import type { CanonicalValidate, ParseCheckReport } from './validate.js';

export interface EleventyPluginOptions {
  /** Default source locale for filters. Defaults to 'en'. */
  defaultFrom?: LangCode;
  /** Default lenient flag for HTML translation. Defaults to true. */
  lenient?: boolean;
  /**
   * Canonical parse-check for the ENGLISH side (input when source is 'en';
   * output when a target is 'en'):
   *   'off'   — no check
   *   'warn'  — print a deduped warning for invalid English (default)
   *   'error' — throw, failing the build
   */
  parseCheck?: 'off' | 'warn' | 'error';
  /** Override filter names (in case of collisions in your config). */
  filterNames?: {
    snippet?: string;
    snippetMany?: string;
    html?: string;
  };
}

interface EleventyConfig {
  addFilter(name: string, fn: (...args: unknown[]) => unknown): void;
}

export default async function hyperscriptI18nPlugin(
  eleventyConfig: EleventyConfig,
  options: EleventyPluginOptions = {}
): Promise<void> {
  const defaultFrom = options.defaultFrom ?? 'en';
  const lenient = options.lenient ?? true;
  const parseCheck = options.parseCheck ?? 'warn';
  const names = {
    snippet: options.filterNames?.snippet ?? 'translateHs',
    snippetMany: options.filterNames?.snippetMany ?? 'translateHsAll',
    html: options.filterNames?.html ?? 'translateHsHtml',
  };

  // Assigned once the parser resolves below; the filters close over it.
  let validate: CanonicalValidate | undefined;

  const check = (code: string, stage: 'input' | 'output', from: string, to: string): void => {
    if (!validate) return;
    const errors = validate(code);
    if (errors.length === 0) return;
    const report: ParseCheckReport = { stage, code, errors, from, to };
    if (parseCheck === 'error')
      throw new Error(`[hyperscript-i18n] ${formatParseCheckReport(report)}`);
    warnInvalidOnce(report);
  };

  eleventyConfig.addFilter(names.snippet, (input: unknown, to: unknown, from: unknown) => {
    if (typeof input !== 'string' || typeof to !== 'string') return input;
    const source = typeof from === 'string' ? from : defaultFrom;
    if (source === to) return input;
    if (source === 'en') check(input, 'input', source, to); // before the try — 'error' must escape
    let out: string;
    try {
      out = translate(input, source, to);
    } catch {
      return lenient ? input : '';
    }
    if (to === 'en') check(out, 'output', source, to); // after the try — same reason
    return out;
  });

  eleventyConfig.addFilter(names.snippetMany, (input: unknown, langs: unknown, from: unknown) => {
    if (typeof input !== 'string' || !Array.isArray(langs)) return {};
    const source = typeof from === 'string' ? from : defaultFrom;
    if (source === 'en') check(input, 'input', source, '*'); // once, before the lang loop
    const out: Record<string, string> = {};
    for (const lang of langs) {
      if (typeof lang !== 'string') continue;
      if (lang === source) {
        out[lang] = input;
        continue;
      }
      try {
        out[lang] = translate(input, source, lang);
      } catch {
        out[lang] = lenient ? input : '';
        continue;
      }
      if (lang === 'en') check(out[lang], 'output', source, 'en');
    }
    return out;
  });

  eleventyConfig.addFilter(names.html, (html: unknown, to: unknown, from: unknown) => {
    if (typeof html !== 'string' || typeof to !== 'string') return html;
    const opts: TranslateHtmlOptions = {
      from: typeof from === 'string' ? from : defaultFrom,
      lenient,
      validate: parseCheck === 'off' ? undefined : validate,
      checkInput: true,
      onInvalid: parseCheck === 'error' ? 'error' : 'warn',
    };
    return translateHtml(html, to, opts);
  });

  if (parseCheck !== 'off') {
    try {
      validate = await loadValidator();
    } catch (err) {
      const msg = (err as Error).message;
      if (parseCheck === 'error') {
        throw new Error(
          `[hyperscript-i18n] parseCheck 'error' but the canonical parser failed to load: ${msg}`
        );
      }
      console.warn(
        `[hyperscript-i18n] parse-check disabled (could not load hyperscript.org): ${msg}`
      );
    }
  }
}

export { translateHtml, translateHtmlToManyLangs };
export type { LangCode, TranslateHtmlOptions };
