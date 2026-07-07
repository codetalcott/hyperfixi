/**
 * FlowScript Tokenizers
 *
 * Language-specific tokenizers, built through the framework↔semantic bridge:
 * `buildDomainTokenizer` derives direction, script handling (diacritic-safe
 * Latin identifiers, case sensitivity), particle keywords, and the
 * keyword-normalization profile from `@lokascript/semantic`'s language
 * profile; the domain's vocabulary (`../vocab`) supplies the flow verbs and
 * marker words.
 *
 * Shared custom extractors keep flow-specific literals single tokens:
 * - CSS selectors (#id, .class)
 * - URL paths (/api/users, /api/user/{id})
 * - Duration literals (5s, 30s, 1m, 500ms)
 *
 * Flow input has no operator tokens, so the bridge default
 * (includeOperators: false) is correct. Case-insensitivity is script-derived
 * (latin → true, CJK/Arabic/Hangul → false) and a diacritic-safe Latin
 * identifier extractor is attached for latin scripts, matching the old
 * per-language tokenizers.
 */

import { buildDomainTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';
import { FLOW_LANGUAGES } from '../vocab';

// =============================================================================
// CSS Selector Extractor (#id, .class)
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
// URL Path Extractor (/api/users, /api/user/{id})
// =============================================================================

class URLPathExtractor implements ValueExtractor {
  readonly name = 'url-path';

  canExtract(input: string, position: number): boolean {
    if (input[position] !== '/') return false;
    const next = input[position + 1];
    // Must be followed by a letter, digit, or path char — not a space or operator
    return next !== undefined && /[a-zA-Z0-9_:{]/.test(next);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position + 1;
    // URL path characters: letters, digits, /, -, _, ., {, }, :, ?, =, &
    while (end < input.length && /[a-zA-Z0-9/_\-.{}:?=&]/.test(input[end])) {
      end++;
    }
    if (end <= position + 1) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// Duration Extractor (5s, 30s, 1m, 500ms)
// =============================================================================

class DurationExtractor implements ValueExtractor {
  readonly name = 'duration';

  canExtract(input: string, position: number): boolean {
    return /[0-9]/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    // Consume digits
    while (end < input.length && /[0-9]/.test(input[end])) {
      end++;
    }
    if (end === position) return null;

    // Check for duration suffix: ms, s, m, h
    const remaining = input.slice(end);
    if (remaining.startsWith('ms')) {
      end += 2;
    } else if (/^[smh](?![a-zA-Z])/.test(remaining)) {
      end += 1;
    } else {
      // Plain number — still valid as a literal
      return { value: input.slice(position, end), length: end - position };
    }

    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// Shared custom extractors
// =============================================================================

const sharedExtractors = [
  new CSSSelectorExtractor(),
  new URLPathExtractor(),
  new DurationExtractor(),
];

function tokenizerFor(code: string): LanguageTokenizer {
  const { slice, vocab } = FLOW_LANGUAGES[code];
  return buildDomainTokenizer(slice, vocab, { customExtractors: sharedExtractors });
}

export const EnglishFlowTokenizer: LanguageTokenizer = tokenizerFor('en');
export const SpanishFlowTokenizer: LanguageTokenizer = tokenizerFor('es');
export const JapaneseFlowTokenizer: LanguageTokenizer = tokenizerFor('ja');
export const ArabicFlowTokenizer: LanguageTokenizer = tokenizerFor('ar');
export const KoreanFlowTokenizer: LanguageTokenizer = tokenizerFor('ko');
export const ChineseFlowTokenizer: LanguageTokenizer = tokenizerFor('zh');
export const TurkishFlowTokenizer: LanguageTokenizer = tokenizerFor('tr');
export const FrenchFlowTokenizer: LanguageTokenizer = tokenizerFor('fr');
