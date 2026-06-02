/**
 * Possessive Value-Filler Tests (cross-language)
 *
 * Regression coverage for a language-agnostic possessive bug: the pattern
 * matcher looked up possessive keywords (`my`, `لي`, `aking`, ...) using the
 * token's NORMALIZED form (e.g. `لي` → `me`), but every language profile keys
 * `possessive.keywords` by the NATIVE word. English happened to work because
 * its keyword keys ARE the English possessive adjectives (`my`/`its`/`your`),
 * but `put my value` / `set my X` never matched in any other language.
 *
 * The fix makes `tryMatchPossessiveExpression` look up by BOTH the native value
 * and the normalized form, so possessive value-fillers parse everywhere.
 *
 * Each case asserts only that a node is produced — the role contents are
 * exercised by the per-language idiom suites; here we guard the matching gate.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src';

describe('Possessive value-fillers (cross-language)', () => {
  // [label, code, language] — possessive pronoun + property as a role filler.
  const cases: Array<[string, string, string]> = [
    ['EN: put my value', 'on input put my value into #preview', 'en'],
    ['EN: its innerHTML', 'on click put its innerHTML into #out', 'en'],
    ['AR: put my value (لي قيمة)', 'ضع لي قيمة إلى #preview عند إدخال', 'ar'],
    ['AR: set my value (لي قيمة)', 'اضبط لي قيمة إلى 0 عند تحميل', 'ar'],
    ['TL: put my value (aking halaga)', 'ilagay aking halaga sa #preview kapag input', 'tl'],
    ['ES: put my value (mi valor)', 'al hacer clic poner mi valor en #preview', 'es'],
  ];

  for (const [label, code, lang] of cases) {
    it(`parses ${label}`, () => {
      const node = parse(code, lang);
      expect(node).toBeTruthy();
    });
  }

  it('English possessive lookup is unaffected (no regression)', () => {
    expect(parse('on input put my value into #preview', 'en')).toBeTruthy();
  });
});
