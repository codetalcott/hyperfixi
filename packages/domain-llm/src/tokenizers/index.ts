/**
 * LLM Tokenizers
 *
 * Language-specific tokenizers for LLM commands (4 languages).
 * Created via the framework's createSimpleTokenizer factory.
 * Each tokenizer handles keyword classification for command verbs and markers.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';

// =============================================================================
// CSS Selector Extractor
// Handles #id and .class tokens as single tokens (must come before default
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

// =============================================================================
// Latin Extended Identifier Extractor
// Handles diacritics in Spanish (é, ó, ú, ñ) and other Latin-script languages
// =============================================================================

class LatinExtendedIdentifierExtractor implements ValueExtractor {
  readonly name = 'latin-extended-identifier';

  canExtract(input: string, position: number): boolean {
    return /\p{L}/u.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    while (end < input.length && /[\p{L}\p{N}_-]/u.test(input[end])) {
      end++;
    }
    if (end === position) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// English LLM Tokenizer
// =============================================================================

export const EnglishLLMTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  customExtractors: [new CSSSelectorExtractor()],
  keywords: [
    // Commands
    'ask',
    'summarize',
    'analyze',
    'translate',
    // Role markers
    'from',
    'as',
    'in',
    'to',
    // Common connectives
    'and',
    'or',
  ],
  includeOperators: false,
  caseInsensitive: true,
});

// =============================================================================
// Spanish LLM Tokenizer
// =============================================================================

export const SpanishLLMTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  customExtractors: [new CSSSelectorExtractor(), new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Commands
    'preguntar',
    'resumir',
    'analizar',
    'traducir',
    // Role markers
    'de',
    'como',
    'en',
    'a',
    // Common connectives
    'y',
    'o',
  ],
  keywordExtras: [
    { native: 'preguntar', normalized: 'ask' },
    { native: 'resumir', normalized: 'summarize' },
    { native: 'analizar', normalized: 'analyze' },
    { native: 'traducir', normalized: 'translate' },
    { native: 'de', normalized: 'from' },
    { native: 'como', normalized: 'as' },
    { native: 'a', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      ask: { primary: 'preguntar' },
      summarize: { primary: 'resumir' },
      analyze: { primary: 'analizar' },
      translate: { primary: 'traducir' },
    },
  },
  includeOperators: false,
  caseInsensitive: true,
});

// =============================================================================
// Japanese LLM Tokenizer
// =============================================================================

export const JapaneseLLMTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  customExtractors: [new CSSSelectorExtractor()],
  keywords: [
    // Commands
    '聞く',
    '要約',
    '分析',
    '翻訳',
    // Role markers
    'から',
    'として',
    'で',
    'に',
  ],
  keywordExtras: [
    { native: '聞く', normalized: 'ask' },
    { native: '要約', normalized: 'summarize' },
    { native: '分析', normalized: 'analyze' },
    { native: '翻訳', normalized: 'translate' },
    { native: 'から', normalized: 'from' },
    { native: 'として', normalized: 'as' },
    { native: 'に', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      ask: { primary: '聞く' },
      summarize: { primary: '要約' },
      analyze: { primary: '分析' },
      translate: { primary: '翻訳' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});

// =============================================================================
// Arabic LLM Tokenizer
// =============================================================================

export const ArabicLLMTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  customExtractors: [new CSSSelectorExtractor()],
  keywords: [
    // Commands
    'اسأل',
    'لخّص',
    'حلّل',
    'ترجم',
    // Role markers
    'من',
    'ك',
    'في',
    'إلى',
  ],
  keywordExtras: [
    { native: 'اسأل', normalized: 'ask' },
    { native: 'لخّص', normalized: 'summarize' },
    { native: 'حلّل', normalized: 'analyze' },
    { native: 'ترجم', normalized: 'translate' },
    { native: 'من', normalized: 'from' },
    { native: 'ك', normalized: 'as' },
    { native: 'إلى', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      ask: { primary: 'اسأل' },
      summarize: { primary: 'لخّص' },
      analyze: { primary: 'حلّل' },
      translate: { primary: 'ترجم' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});
