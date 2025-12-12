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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type CreateTokenOptions,
} from './base';
import { JapaneseMorphologicalNormalizer } from './morphology/japanese-normalizer';

// =============================================================================
// Japanese Character Classification
// =============================================================================

/**
 * Check if character is hiragana.
 */
function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

/**
 * Check if character is katakana.
 */
function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

/**
 * Check if character is kanji (CJK Unified Ideographs).
 */
function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK Unified Ideographs
         (code >= 0x3400 && code <= 0x4DBF);    // CJK Unified Ideographs Extension A
}

/**
 * Check if character is Japanese (hiragana, katakana, or kanji).
 */
function isJapanese(char: string): boolean {
  return isHiragana(char) || isKatakana(char) || isKanji(char);
}

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
// Japanese Keywords
// =============================================================================

/**
 * Japanese command keywords mapped to their English equivalents.
 */
const JAPANESE_KEYWORDS: Map<string, string> = new Map([
  // Commands
  ['切り替え', 'toggle'],
  ['切り替える', 'toggle'],
  ['トグル', 'toggle'],
  ['トグルする', 'toggle'],
  ['追加', 'add'],
  ['追加する', 'add'],
  ['削除', 'remove'],
  ['削除する', 'remove'],
  ['置く', 'put'],
  ['入れる', 'put'],
  ['セット', 'set'],
  ['セットする', 'set'],
  ['設定', 'set'],
  ['設定する', 'set'],
  ['取得', 'get'],
  ['取得する', 'get'],
  ['表示', 'show'],
  ['表示する', 'show'],
  ['隠す', 'hide'],
  ['非表示', 'hide'],
  ['増加', 'increment'],
  ['増加する', 'increment'],
  ['増やす', 'increment'],
  ['減少', 'decrement'],
  ['減少する', 'decrement'],
  ['減らす', 'decrement'],
  ['待つ', 'wait'],
  ['待機', 'wait'],
  ['送信', 'send'],
  ['送信する', 'send'],
  ['トリガー', 'trigger'],
  ['発火', 'trigger'],
  ['引き金', 'trigger'],  // Primary in language profile
  ['呼び出す', 'call'],
  ['返す', 'return'],
  ['ログ', 'log'],
  // Append/prepend
  ['末尾追加', 'append'],
  ['末尾に追加', 'append'],
  ['アペンド', 'append'],
  ['先頭追加', 'prepend'],
  ['先頭に追加', 'prepend'],
  ['プリペンド', 'prepend'],
  // Control flow
  ['もし', 'if'],
  ['ならば', 'then'],
  ['なら', 'then'],
  ['そうでなければ', 'else'],
  ['終わり', 'end'],
  ['繰り返す', 'repeat'],
  ['繰り返し', 'repeat'],
  ['間', 'while'],
  ['まで', 'until'],
  // Events (these will be normalized)
  ['クリック', 'click'],
  ['入力', 'input'],
  ['変更', 'change'],
  ['送信', 'submit'],
  ['キーダウン', 'keydown'],
  ['キーアップ', 'keyup'],
  ['マウスオーバー', 'mouseover'],
  ['マウスアウト', 'mouseout'],
  ['フォーカス', 'focus'],
  ['ブラー', 'blur'],
  ['ロード', 'load'],
  ['スクロール', 'scroll'],
  // References
  ['私', 'me'],
  ['私の', 'my'],
  ['それ', 'it'],
  ['その', 'its'],
  ['結果', 'result'],
  ['イベント', 'event'],
  ['ターゲット', 'target'],
  // Positional
  ['最初', 'first'],
  ['最後', 'last'],
  ['次', 'next'],
  ['前', 'previous'],
  // Time units
  ['秒', 's'],
  ['ミリ秒', 'ms'],
  ['分', 'm'],
  ['時間', 'h'],
]);

// =============================================================================
// Japanese Tokenizer Implementation
// =============================================================================

export class JapaneseTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  /** Morphological normalizer for Japanese verb conjugations */
  private morphNormalizer = new JapaneseMorphologicalNormalizer();

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
      const multiParticle = this.tryMultiCharParticle(input, pos);
      if (multiParticle) {
        tokens.push(multiParticle);
        pos = multiParticle.position.end;
        continue;
      }

      // Try single-character particle
      if (SINGLE_CHAR_PARTICLES.has(input[pos])) {
        tokens.push(createToken(
          input[pos],
          'particle',
          createPosition(pos, pos + 1)
        ));
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
    if (JAPANESE_KEYWORDS.has(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('「')) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Try to match a multi-character particle.
   */
  private tryMultiCharParticle(input: string, pos: number): LanguageToken | null {
    for (const particle of MULTI_CHAR_PARTICLES) {
      if (input.slice(pos, pos + particle.length) === particle) {
        return createToken(
          particle,
          'particle',
          createPosition(pos, pos + particle.length)
        );
      }
    }
    return null;
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

    // Check if this is a known keyword (exact match)
    const normalized = JAPANESE_KEYWORDS.get(word);

    if (normalized) {
      // Exact match found in keyword map
      return createToken(
        word,
        'keyword',
        createPosition(startPos, pos),
        normalized
      );
    }

    // Try morphological normalization for conjugated forms
    const morphResult = this.morphNormalizer.normalize(word);

    if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
      // Check if the stem is a known keyword
      const stemNormalized = JAPANESE_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        // Found via morphological normalization
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(
          word,
          'keyword',
          createPosition(startPos, pos),
          tokenOptions
        );
      }
    }

    // Not a keyword, return as identifier
    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
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

    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
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
      } else if (remaining[0] === 'm' && remaining[1] !== 's' && !isAsciiIdentifierChar(remaining[1] || '')) {
        number += 'm';
        pos += 1;
      } else if (remaining[0] === 'h' && !isAsciiIdentifierChar(remaining[1] || '')) {
        number += 'h';
        pos += 1;
      }
    }

    if (!number) return null;

    return createToken(
      number,
      'literal',
      createPosition(startPos, pos)
    );
  }
}

/**
 * Singleton instance.
 */
export const japaneseTokenizer = new JapaneseTokenizer();
