/**
 * HTML attribute scanner + translator.
 *
 * Walks an HTML string, finds `_="..."` (and single-quoted / backtick variants)
 * attributes, translates each from a source locale to a target locale, and
 * returns the rewritten HTML. The grammar transformer doesn't know about HTML;
 * this module is the glue.
 *
 * Optionally parse-checks the ENGLISH side against the real `hyperscript.org`
 * engine (see ./validate): the input when `from === 'en'` and the output when
 * `to === 'en'`. The check only runs when a `validate` function is supplied, so
 * existing callers see no behaviour change.
 */

import { translate } from '@lokascript/i18n';
import { formatParseCheckReport, warnInvalidOnce } from './validate.js';
import type { CanonicalValidate, ParseCheckReport } from './validate.js';

export type LangCode = string;

/** What to do with an invalid-English report. */
export type OnInvalid = 'warn' | 'error' | ((report: ParseCheckReport) => void);

export interface TranslateHtmlOptions {
  /** Source locale of the input HTML's `_=` attributes. Defaults to 'en'. */
  from?: LangCode;
  /**
   * If true, swallow per-attribute translation errors and leave the original
   * text in place. Defaults to true so a single bad sample doesn't fail the
   * whole page build.
   */
  lenient?: boolean;
  /**
   * Canonical validator (from `loadValidator()`). When absent, no parse-check
   * runs and behaviour is unchanged.
   */
  validate?: CanonicalValidate;
  /** What to do with an invalid-English report. Default 'warn' (deduped console.warn). */
  onInvalid?: OnInvalid;
  /**
   * Set false when the caller already validated the English input (as
   * `translateHtmlToManyLangs` and the CLI do). Default true.
   */
  checkInput?: boolean;
}

const ATTR_PATTERNS: ReadonlyArray<RegExp> = [
  /(_\s*=\s*")([^"]+)(")/g,
  /(_\s*=\s*')([^']+)(')/g,
  /(_\s*=\s*`)([^`]+)(`)/g,
];

/**
 * Every `_=` attribute body in `html` (double/single/backtick quoted), deduped,
 * in document order.
 */
export function extractHyperscriptAttributes(html: string): string[] {
  const seen = new Set<string>();
  for (const pattern of ATTR_PATTERNS) {
    // matchAll on a /g regex does not mutate lastIndex, so reusing the shared patterns is safe.
    for (const m of html.matchAll(pattern)) {
      seen.add(m[2]);
    }
  }
  return [...seen];
}

/**
 * Validate every English `_=` attribute body of `html`; returns a report for
 * each invalid one (stage 'input').
 */
export function checkHtmlInput(
  html: string,
  validate: CanonicalValidate,
  to: LangCode = '*'
): ParseCheckReport[] {
  const reports: ParseCheckReport[] = [];
  for (const code of extractHyperscriptAttributes(html)) {
    const errors = validate(code);
    if (errors.length > 0) {
      reports.push({ stage: 'input', code, errors, from: 'en', to });
    }
  }
  return reports;
}

function dispatch(report: ParseCheckReport, onInvalid: OnInvalid): void {
  if (typeof onInvalid === 'function') onInvalid(report);
  else if (onInvalid === 'error')
    throw new Error(`[hyperscript-i18n] ${formatParseCheckReport(report)}`);
  else warnInvalidOnce(report);
}

export function translateHtml(
  html: string,
  to: LangCode,
  options: TranslateHtmlOptions = {}
): string {
  const from = options.from ?? 'en';
  const lenient = options.lenient ?? true;
  const { validate } = options;
  const onInvalid = options.onInvalid ?? 'warn';

  if (from === to) return html;

  if (validate && options.checkInput !== false && from === 'en') {
    for (const report of checkHtmlInput(html, validate, to)) dispatch(report, onInvalid);
  }

  let out = html;
  for (const pattern of ATTR_PATTERNS) {
    out = out.replace(pattern, (_match, before: string, body: string, after: string) => {
      let translated: string;
      try {
        translated = translate(body, from, to);
      } catch (err) {
        if (lenient) return `${before}${body}${after}`;
        throw err;
      }
      // Output check sits OUTSIDE the lenient try/catch so 'error' mode escapes.
      if (validate && to === 'en') {
        const errors = validate(translated);
        if (errors.length > 0) {
          dispatch({ stage: 'output', code: translated, errors, from, to }, onInvalid);
        }
      }
      return `${before}${translated}${after}`;
    });
  }
  return out;
}

export function translateHtmlToManyLangs(
  html: string,
  langs: ReadonlyArray<LangCode>,
  options: TranslateHtmlOptions = {}
): Map<LangCode, string> {
  const from = options.from ?? 'en';
  let perLang = options;

  // Check the (shared) English input once, then suppress the per-lang re-check.
  if (options.validate && options.checkInput !== false && from === 'en') {
    for (const report of checkHtmlInput(html, options.validate)) {
      dispatch(report, options.onInvalid ?? 'warn');
    }
    perLang = { ...options, checkInput: false };
  }

  const out = new Map<LangCode, string>();
  for (const lang of langs) {
    out.set(lang, translateHtml(html, lang, perLang));
  }
  return out;
}
