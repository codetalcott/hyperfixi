/**
 * Japanese Tokenizer
 *
 * Tokenizes Japanese hyperscript input.
 * Japanese is challenging because:
 * - No spaces between words
 * - Particles (助詞) mark grammatical roles
 * - Mixed scripts (hiragana, katakana, kanji, romaji)
 * - CSS selectors are embedded ASCII
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createUnicodeRangeClassifier,
  combineClassifiers,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type KeywordEntry,
} from './base';
import { JapaneseMorphologicalNormalizer } from './morphology/japanese-normalizer';
import { japaneseProfile } from '../generators/profiles/japanese';

// =============================================================================
// Japanese Character Classification
// =============================================================================

/** Check if character is hiragana (U+3040-U+309F). */
const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);

/** Check if character is katakana (U+30A0-U+30FF). */
const isKatakana = createUnicodeRangeClassifier([[0x30a0, 0x30ff]]);

/** Check if character is kanji (CJK Unified Ideographs + Extension A). */
const isKanji = createUnicodeRangeClassifier([
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
]);

/** Check if character is Japanese (hiragana, katakana, or kanji). */
const isJapanese = combineClassifiers(isHiragana, isKatakana, isKanji);

// =============================================================================
// Japanese Particles
// =============================================================================

/**
 * Japanese particles that mark grammatical roles.
 * These are single hiragana characters that appear after nouns/verbs.
 */
const PARTICLES = new Set([
  'を', // wo - object marker
  'に', // ni - destination, time
  'で', // de - location of action, means
  'から', // kara - from
  'まで', // made - until
  'へ', // e - direction
  'と', // to - and, with
  'の', // no - possessive
  'が', // ga - subject marker
  'は', // wa - topic marker
  'も', // mo - also
  'より', // yori - than, from
]);

/**
 * Single-character particles (most common).
 */
const SINGLE_CHAR_PARTICLES = new Set(['を', 'に', 'で', 'へ', 'と', 'の', 'が', 'は', 'も']);

/**
 * Multi-character particles.
 */
const MULTI_CHAR_PARTICLES = ['から', 'まで', 'より'];

// =============================================================================
// Japanese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Attached particle forms (native idioms)
 * - Conditional event forms
 * - Time units
 */
const JAPANESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: '真', normalized: 'true' },
  { native: '偽', normalized: 'false' },
  { native: 'ヌル', normalized: 'null' },
  { native: '未定義', normalized: 'undefined' },

  // Positional
  { native: '最初', normalized: 'first' },
  { native: '最後', normalized: 'last' },
  { native: '次', normalized: 'next' },
  { native: '前', normalized: 'previous' },
  { native: '最も近い', normalized: 'closest' },
  { native: '親', normalized: 'parent' },

  // Events
  { native: 'クリック', normalized: 'click' },
  { native: '変更', normalized: 'change' },
  { native: '送信', normalized: 'submit' },
  { native: '入力', normalized: 'input' },
  { native: 'ロード', normalized: 'load' },
  { native: 'スクロール', normalized: 'scroll' },
  { native: 'キーダウン', normalized: 'keydown' },
  { native: 'キーアップ', normalized: 'keyup' },
  { native: 'マウスオーバー', normalized: 'mouseover' },
  { native: 'マウスアウト', normalized: 'mouseout' },
  { native: 'ブラー', normalized: 'blur' },

  // References (additional forms)
  { native: '私', normalized: 'me' },
  { native: '私の', normalized: 'my' },
  { native: 'その', normalized: 'its' },

  // Note: Attached particle forms (を切り替え, を追加, etc.) are intentionally NOT included
  // because they would cause ambiguous parsing. The separate particle + verb pattern
  // (を + 切り替え) is preferred for consistent semantic analysis.

  // Conditional event forms
  { native: 'したら', normalized: 'on' },
  { native: 'すると', normalized: 'on' },
  { native: '時に', normalized: 'on' },

  // Control flow helpers
  { native: 'もし', normalized: 'if' }, // Starts with particle も, needs explicit entry
  { native: 'ならば', normalized: 'then' },
  { native: 'なら', normalized: 'then' },

  // Time units
  { native: '秒', normalized: 's' },
  { native: 'ミリ秒', normalized: 'ms' },
  { native: '分', normalized: 'm' },
  { native: '時間', normalized: 'h' },
];

// =============================================================================
// Japanese Tokenizer Implementation
// =============================================================================

export class JapaneseTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(japaneseProfile, JAPANESE_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new JapaneseMorphologicalNormalizer();
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace (Japanese can have spaces for readability)
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // Try CSS selector first (ASCII-based, highest priority)
      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // Try string literal (both ASCII and Japanese quotes)
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Try URL (/path, ./path, http://, etc.)
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number (including Japanese time units)
      if (isDigit(input[pos])) {
        const numberToken = this.extractJapaneseNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Try variable reference (:varname)
      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Try multi-character particle (before single-character)
      const multiParticle = this.tryMultiCharParticle(input, pos, MULTI_CHAR_PARTICLES);
      if (multiParticle) {
        tokens.push(multiParticle);
        pos = multiParticle.position.end;
        continue;
      }

      // Check if this starts a multi-character keyword (before single-char particle check)
      // This prevents splitting keywords like もし (if) into も (particle) + し (identifier)
      if (SINGLE_CHAR_PARTICLES.has(input[pos])) {
        const keywordToken = this.tryProfileKeyword(input, pos);
        // Only accept keywords longer than 1 char (e.g., もし but not を/で/に which are role markers)
        if (keywordToken && keywordToken.value.length > 1) {
          tokens.push(keywordToken);
          pos = keywordToken.position.end;
          continue;
        }
        // Not a multi-char keyword, treat as particle
        tokens.push(createToken(input[pos], 'particle', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // Try Japanese word (kanji/kana sequence)
      if (isJapanese(input[pos])) {
        const wordToken = this.extractJapaneseWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Try ASCII word (for mixed content)
      if (isAsciiIdentifierChar(input[pos])) {
        const asciiToken = this.extractAsciiWord(input, pos);
        if (asciiToken) {
          tokens.push(asciiToken);
          pos = asciiToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'ja');
  }

  classifyToken(token: string): TokenKind {
    if (PARTICLES.has(token)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('「')) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Extract a Japanese word (sequence of kanji/kana).
   * Stops at particles, ASCII, or whitespace.
   *
   * Uses morphological normalization to handle verb conjugations:
   * 1. First checks if the exact word is in the keyword map
   * 2. If not found, tries to strip conjugation suffixes and check again
   */
  private extractJapaneseWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length) {
      const char = input[pos];

      // Stop at particles (except within longer words)
      if (SINGLE_CHAR_PARTICLES.has(char) && word.length > 0) {
        break;
      }

      // Check for multi-char particle
      let foundMulti = false;
      for (const particle of MULTI_CHAR_PARTICLES) {
        if (input.slice(pos, pos + particle.length) === particle && word.length > 0) {
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) break;

      // Continue if Japanese character
      if (isJapanese(char)) {
        word += char;
        pos++;
      } else {
        break;
      }
    }

    if (!word) return null;

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(word);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Try morphological normalization for conjugated forms
    const morphToken = this.tryMorphKeywordMatch(word, startPos, pos);
    if (morphToken) return morphToken;

    // Not a keyword, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract an ASCII word (for mixed Japanese/English content).
   */
  private extractAsciiWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Japanese time unit suffixes.
   */
  private extractJapaneseNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    // Check for time units (Japanese or standard)
    if (pos < input.length) {
      const remaining = input.slice(pos);
      // Japanese time units
      if (remaining.startsWith('ミリ秒')) {
        number += 'ms';
        pos += 3;
      } else if (remaining.startsWith('秒')) {
        number += 's';
        pos += 1;
      } else if (remaining.startsWith('分')) {
        number += 'm';
        pos += 1;
      } else if (remaining.startsWith('時間')) {
        number += 'h';
        pos += 2;
      }
      // Standard time units (s, ms, m, h)
      else if (remaining.startsWith('ms')) {
        number += 'ms';
        pos += 2;
      } else if (remaining[0] === 's' && !isAsciiIdentifierChar(remaining[1] || '')) {
        number += 's';
        pos += 1;
      } else if (
        remaining[0] === 'm' &&
        remaining[1] !== 's' &&
        !isAsciiIdentifierChar(remaining[1] || '')
      ) {
        number += 'm';
        pos += 1;
      } else if (remaining[0] === 'h' && !isAsciiIdentifierChar(remaining[1] || '')) {
        number += 'h';
        pos += 1;
      }
    }

    if (!number) return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

/**
 * Singleton instance.
 */
export const japaneseTokenizer = new JapaneseTokenizer();
