/**
 * Voice/Accessibility Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language profile;
 * the domain's vocabulary (`../vocab`) supplies the voice verbs and marker/
 * direction/target words.
 *
 * A shared `CSSSelectorExtractor` is passed so `#id`/`.class` references stay
 * single tokens. Voice input has no operator tokens, so the bridge default
 * (includeOperators: false) is correct. Case-insensitivity is script-derived
 * (latin → true, CJK/Arabic/Hangul → false) and a diacritic-safe Latin
 * identifier extractor is attached for latin scripts, matching the old
 * per-language tokenizers.
 */

import { buildDomainTokenizer, CssSelectorExtractor } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';
import { VOICE_LANGUAGES } from '../vocab';

// =============================================================================
// CSS Selector Extractor
// Handles #id and .class references in voice commands
// =============================================================================

// Shared CSS selector extractor instance
const cssSelectorExtractor = new CssSelectorExtractor();

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = VOICE_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab, { customExtractors: [cssSelectorExtractor] });
}

export const EnglishVoiceTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishVoiceTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseVoiceTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicVoiceTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanVoiceTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseVoiceTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishVoiceTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchVoiceTokenizer: LanguageTokenizer = tokenizerFor('fr');
export const GermanVoiceTokenizer: LanguageTokenizer = tokenizerFor('de');
export const PortugueseVoiceTokenizer: LanguageTokenizer = tokenizerFor('pt');
export const RussianVoiceTokenizer: LanguageTokenizer = tokenizerFor('ru');
