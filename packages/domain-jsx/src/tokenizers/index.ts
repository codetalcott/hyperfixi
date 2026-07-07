/**
 * JSX Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language profile;
 * the domain's vocabulary (`../vocab`) supplies the JSX verbs and marker words.
 *
 * JSX input has no operator tokens, so the bridge default (includeOperators:
 * false) is correct — no options are needed. Case-insensitivity is
 * script-derived (latin → true, CJK/Arabic/Hangul → false) and a
 * diacritic-safe Latin identifier extractor is attached for latin scripts,
 * matching the old per-language tokenizers.
 */

import { buildDomainTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';
import { JSX_LANGUAGES } from '../vocab';

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = JSX_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab);
}

export const EnglishJSXTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishJSXTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseJSXTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicJSXTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanJSXTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseJSXTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishJSXTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchJSXTokenizer: LanguageTokenizer = tokenizerFor('fr');

// Re-export the LanguageTokenizer type for consumers
export type { LanguageTokenizer };
