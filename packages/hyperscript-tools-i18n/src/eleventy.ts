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
 */

import { translate } from '@lokascript/i18n';
import { translateHtml, translateHtmlToManyLangs } from './html.js';
import type { LangCode, TranslateHtmlOptions } from './html.js';

export interface EleventyPluginOptions {
  /** Default source locale for filters. Defaults to 'en'. */
  defaultFrom?: LangCode;
  /** Default lenient flag for HTML translation. Defaults to true. */
  lenient?: boolean;
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

export default function hyperscriptI18nPlugin(
  eleventyConfig: EleventyConfig,
  options: EleventyPluginOptions = {}
): void {
  const defaultFrom = options.defaultFrom ?? 'en';
  const lenient = options.lenient ?? true;
  const names = {
    snippet: options.filterNames?.snippet ?? 'translateHs',
    snippetMany: options.filterNames?.snippetMany ?? 'translateHsAll',
    html: options.filterNames?.html ?? 'translateHsHtml',
  };

  eleventyConfig.addFilter(names.snippet, (input: unknown, to: unknown, from: unknown) => {
    if (typeof input !== 'string' || typeof to !== 'string') return input;
    const source = typeof from === 'string' ? from : defaultFrom;
    if (source === to) return input;
    try {
      return translate(input, source, to);
    } catch {
      return lenient ? input : '';
    }
  });

  eleventyConfig.addFilter(names.snippetMany, (input: unknown, langs: unknown, from: unknown) => {
    if (typeof input !== 'string' || !Array.isArray(langs)) return {};
    const source = typeof from === 'string' ? from : defaultFrom;
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
      }
    }
    return out;
  });

  eleventyConfig.addFilter(names.html, (html: unknown, to: unknown, from: unknown) => {
    if (typeof html !== 'string' || typeof to !== 'string') return html;
    const opts: TranslateHtmlOptions = {
      from: typeof from === 'string' ? from : defaultFrom,
      lenient,
    };
    return translateHtml(html, to, opts);
  });
}

export { translateHtml, translateHtmlToManyLangs };
export type { LangCode, TranslateHtmlOptions };
