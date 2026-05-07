/**
 * HTML attribute scanner + translator.
 *
 * Walks an HTML string, finds `_="..."` (and single-quoted / backtick variants)
 * attributes, translates each from a source locale to a target locale, and
 * returns the rewritten HTML. The grammar transformer doesn't know about HTML;
 * this module is the glue.
 */

import { translate } from '@lokascript/i18n';

export type LangCode = string;

export interface TranslateHtmlOptions {
  /** Source locale of the input HTML's `_=` attributes. Defaults to 'en'. */
  from?: LangCode;
  /**
   * If true, swallow per-attribute translation errors and leave the original
   * text in place. Defaults to true so a single bad sample doesn't fail the
   * whole page build.
   */
  lenient?: boolean;
}

const ATTR_PATTERNS: ReadonlyArray<RegExp> = [
  /(_\s*=\s*")([^"]+)(")/g,
  /(_\s*=\s*')([^']+)(')/g,
  /(_\s*=\s*`)([^`]+)(`)/g,
];

export function translateHtml(
  html: string,
  to: LangCode,
  options: TranslateHtmlOptions = {}
): string {
  const from = options.from ?? 'en';
  const lenient = options.lenient ?? true;

  if (from === to) return html;

  let out = html;
  for (const pattern of ATTR_PATTERNS) {
    out = out.replace(pattern, (_match, before: string, body: string, after: string) => {
      try {
        const translated = translate(body, from, to);
        return `${before}${translated}${after}`;
      } catch (err) {
        if (lenient) return `${before}${body}${after}`;
        throw err;
      }
    });
  }
  return out;
}

export function translateHtmlToManyLangs(
  html: string,
  langs: ReadonlyArray<LangCode>,
  options: TranslateHtmlOptions = {}
): Map<LangCode, string> {
  const out = new Map<LangCode, string>();
  for (const lang of langs) {
    out.set(lang, translateHtml(html, lang, options));
  }
  return out;
}
