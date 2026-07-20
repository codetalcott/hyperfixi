/**
 * Vietnamese Tokenizer
 *
 * Tokenizes Vietnamese hyperscript input.
 * Vietnamese is an isolating (analytic) language with:
 * - SVO word order (like English)
 * - Latin script with extensive diacritics (tone marks)
 * - No verb conjugation or noun declension
 * - Space-separated syllables (can be multi-syllable words)
 * - Prepositions for grammatical roles
 *
 * Vietnamese diacritics:
 * - Tone marks: à á ả ã ạ (and similar for other vowels)
 * - Vowel modifications: ă â ê ô ơ ư đ
 *
 * Examples:
 *   chuyển đổi .active  → toggle .active
 *   thêm .highlight     → add .highlight
 *   hiển thị #modal     → show #modal
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { vietnameseProfile } from '../generators/profiles/vietnamese';
import { createVietnameseExtractors } from './extractors/vietnamese-keyword';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';

// =============================================================================
// Vietnamese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Multi-word phrases not in profile
 * - Additional synonyms
 */
const VIETNAMESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'đúng', normalized: 'true' },
  { native: 'sai', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'không xác định', normalized: 'undefined' },

  // Positional
  { native: 'đầu tiên', normalized: 'first' },
  { native: 'cuối cùng', normalized: 'last' },
  { native: 'tiếp theo', normalized: 'next' },
  { native: 'trước đó', normalized: 'previous' },
  { native: 'gần nhất', normalized: 'closest' },
  { native: 'cha', normalized: 'parent' },

  // Events
  { native: 'nhấp', normalized: 'click' },
  { native: 'nhấp chuột', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'nhấp đúp', normalized: 'dblclick' },
  { native: 'nhập', normalized: 'input' },
  { native: 'thay đổi', normalized: 'change' },
  { native: 'gửi biểu mẫu', normalized: 'submit' },
  { native: 'phím xuống', normalized: 'keydown' },
  { native: 'phím lên', normalized: 'keyup' },
  { native: 'chuột vào', normalized: 'mouseover' },
  { native: 'chuột ra', normalized: 'mouseout' },
  { native: 'tải trang', normalized: 'load' },
  { native: 'cuộn', normalized: 'scroll' },

  // References - possessive forms
  { native: 'của tôi', normalized: 'my' },
  { native: 'của nó', normalized: 'its' },

  // Time units
  { native: 'giây', normalized: 's' },
  { native: 'mili giây', normalized: 'ms' },
  { native: 'phút', normalized: 'm' },
  { native: 'giờ', normalized: 'h' },

  // Additional multi-word phrases not in profile
  { native: 'thêm vào cuối', normalized: 'append' },
  { native: 'nhân bản', normalized: 'clone' },
  { native: 'tạo ra', normalized: 'make' },
  { native: 'đặt giá trị', normalized: 'set' },
  { native: 'giá trị', normalized: 'value' },
  { native: 'ghi nhật ký', normalized: 'log' },
  { native: 'chuyển tới', normalized: 'go' },
  { native: 'ngược lại', normalized: 'else' },
  { native: 'lặp', normalized: 'repeat' },

  // Logical/conditional
  { native: 'hoặc', normalized: 'or' },
  { native: 'không', normalized: 'not' },
  { native: 'là', normalized: 'is' },
  { native: 'tồn tại', normalized: 'exists' },
  { native: 'rỗng', normalized: 'empty' },

  // English synonyms
  { native: 'javascript', normalized: 'js' },
  { native: 'bao gồm', normalized: 'inclusive' },
  { native: 'loại trừ', normalized: 'exclusive' },
];

// =============================================================================
// Vietnamese Tokenizer Implementation
// =============================================================================

export class VietnameseTokenizer extends BaseTokenizer {
  readonly language = 'vi';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(vietnameseProfile, VIETNAMESE_EXTRAS);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createVietnameseExtractors()); // Vietnamese keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // tryMultiWordPhrase(), extractVietnameseWord(), extractVietnameseNumber() methods removed
  // Now handled by VietnameseKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const vietnameseTokenizer = new VietnameseTokenizer();
