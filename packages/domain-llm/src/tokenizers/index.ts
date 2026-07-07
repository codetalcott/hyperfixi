/**
 * LLM Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language profile;
 * the domain's vocabulary (`../vocab`) supplies the LLM verbs and marker words.
 *
 * Two LLM-specific tokenizer settings are preserved through the bridge:
 * - a `CSSSelectorExtractor` so `#id`/`.class` context selectors stay single
 *   tokens (registered before the bridge's Latin identifier extractor);
 * - `includeOperators: false`, matching the pre-bridge tokenizers.
 * Case-insensitivity is script-derived by the bridge (latin → true, CJK/
 * Arabic/Hangul → false), matching the old per-language settings.
 */

import { buildDomainTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';
import { LLM_LANGUAGES } from '../vocab';

// =============================================================================
// CSS Selector Extractor
// Handles #id and .class tokens as single tokens (must come before the default
// identifier extractor, which would otherwise split '#' from 'article')
// =============================================================================

class CSSSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    if (char !== '#' && char !== '.') return false;
    const next = input[position + 1];
    return next !== undefined && /[a-zA-Z_-]/.test(next);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position + 1;
    while (end < input.length && /[a-zA-Z0-9_-]/.test(input[end])) {
      end++;
    }
    if (end === position + 1) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = LLM_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab, {
    includeOperators: false,
    customExtractors: [new CSSSelectorExtractor()],
  });
}

export const EnglishLLMTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishLLMTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseLLMTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicLLMTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanLLMTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseLLMTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishLLMTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchLLMTokenizer: LanguageTokenizer = tokenizerFor('fr');
