/**
 * Chinese Tokenizer
 *
 * Tokenizes Chinese hyperscript input.
 * Chinese is challenging because:
 * - No spaces between words (like Japanese)
 * - Uses CJK characters (shared with Japanese Kanji)
 * - SVO word order (like English)
 * - Uses prepositions (把, 在, 从, etc.) for grammatical roles
 * - No conjugation (unlike Japanese/Korean)
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
} from './base';

// =============================================================================
// Chinese Character Classification
// =============================================================================

/**
 * Check if character is a CJK character (Chinese).
 * Covers CJK Unified Ideographs and common extensions.
 */
function isChinese(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
  );
}

// =============================================================================
// Chinese Particles/Prepositions
// =============================================================================

/**
 * Chinese grammatical particles and prepositions.
 * These mark grammatical relationships in Chinese sentences.
 */
const PARTICLES = new Set([
  '把', // ba - marks direct object (BA construction)
  '在', // zai - at, in, on (location)
  '从', // cong - from
  '到', // dao - to, until
  '向', // xiang - towards
  '给', // gei - to, for (recipient)
  '对', // dui - to, towards
  '用', // yong - with, using
  '被', // bei - by (passive)
  '让', // rang - let, allow
  '的', // de - possessive/attributive
  '地', // de - adverbial marker
  '得', // de - complement marker
  '了', // le - completion marker
  '着', // zhe - progressive marker
  '过', // guo - experiential marker
  '吗', // ma - question particle
  '呢', // ne - question/emphasis particle
  '吧', // ba - suggestion particle
]);

/**
 * Multi-character particles/phrases.
 */
const MULTI_CHAR_PARTICLES = ['然后', '接着', '并且', '或者', '如果', '那么', '否则'];

// =============================================================================
// Chinese Keywords
// =============================================================================

/**
 * Chinese command keywords mapped to their English equivalents.
 */
const CHINESE_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['切换', 'toggle'],
  ['添加', 'add'],
  ['加', 'add'],
  ['移除', 'remove'],
  ['删除', 'remove'],
  ['去掉', 'remove'],
  // Content operations
  ['放置', 'put'],
  ['放', 'put'],
  ['放入', 'put'],
  ['追加', 'append'],
  ['获取', 'get'],
  ['取得', 'get'],
  ['获得', 'get'],
  ['制作', 'make'],
  ['创建', 'make'],
  ['复制', 'clone'],
  // Variable operations
  ['设置', 'set'],
  ['设定', 'set'],
  ['增加', 'increment'],
  ['减少', 'decrement'],
  ['日志', 'log'],
  ['记录', 'log'],
  // Visibility
  ['显示', 'show'],
  ['展示', 'show'],
  ['隐藏', 'hide'],
  ['过渡', 'transition'],
  // Events
  ['当', 'on'],
  ['触发', 'trigger'],
  ['发送', 'send'],
  // DOM focus
  ['聚焦', 'focus'],
  ['失焦', 'blur'],
  // Navigation
  ['前往', 'go'],
  ['跳转', 'go'],
  // Async
  ['等待', 'wait'],
  ['稳定', 'settle'],
  // Control flow
  ['如果', 'if'],
  ['那么', 'then'],
  ['否则', 'else'],
  ['结束', 'end'],
  ['重复', 'repeat'],
  ['循环', 'repeat'],
  ['当', 'while'],
  ['直到', 'until'],
  ['继续', 'continue'],
  ['停止', 'halt'],
  // Events (these will be normalized)
  ['点击', 'click'],
  ['双击', 'dblclick'],
  ['输入', 'input'],
  ['变更', 'change'],
  ['改变', 'change'],
  ['提交', 'submit'],
  ['按键', 'keydown'],
  ['释放键', 'keyup'],
  ['鼠标移入', 'mouseover'],
  ['鼠标移出', 'mouseout'],
  ['获得焦点', 'focus'],
  ['失去焦点', 'blur'],
  ['加载', 'load'],
  ['滚动', 'scroll'],
  // References
  ['我', 'me'],
  ['我的', 'my'],
  ['它', 'it'],
  ['它的', 'its'],
  ['结果', 'result'],
  ['事件', 'event'],
  ['目标', 'target'],
  // Positional
  ['第一个', 'first'],
  ['最后一个', 'last'],
  ['下一个', 'next'],
  ['上一个', 'previous'],
  // Logical
  ['和', 'and'],
  ['并且', 'and'],
  ['或者', 'or'],
  ['或', 'or'],
  ['不', 'not'],
  ['非', 'not'],
  ['是', 'is'],
  // Time units
  ['秒', 's'],
  ['毫秒', 'ms'],
  ['分钟', 'm'],
  ['小时', 'h'],
  // Boolean
  ['真', 'true'],
  ['假', 'false'],
]);

// =============================================================================
// Chinese Tokenizer Implementation
// =============================================================================

export class ChineseTokenizer extends BaseTokenizer {
  readonly language = 'zh';
  readonly direction = 'ltr' as const;

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace (Chinese can have spaces for readability)
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

      // Try string literal (both ASCII and Chinese quotes)
      // Chinese quotes: \u201C " \u201D " \u2018 ' \u2019 '
      if (isQuote(input[pos]) || input[pos] === '\u201C' || input[pos] === '\u201D' || input[pos] === '\u2018' || input[pos] === '\u2019') {
        const stringToken = this.tryChineseString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Try number (including Chinese time units)
      if (isDigit(input[pos])) {
        const numberToken = this.extractChineseNumber(input, pos);
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

      // Try Chinese word (CJK sequence)
      if (isChinese(input[pos])) {
        const wordToken = this.extractChineseWord(input, pos);
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

    return new TokenStreamImpl(tokens, 'zh');
  }

  classifyToken(token: string): TokenKind {
    if (PARTICLES.has(token)) return 'particle';
    if (CHINESE_KEYWORDS.has(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[') || token.startsWith('<')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('\u201C') || token.startsWith('\u2018')) return 'literal';
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
   * Extract a Chinese word.
   * Uses greedy matching to find the longest known keyword.
   * Chinese doesn't have inflection, so we don't need morphological normalization.
   */
  private extractChineseWord(input: string, startPos: number): LanguageToken | null {
    // First, try to find the longest matching keyword starting at this position
    const maxKeywordLen = 5; // Longest Chinese keyword (e.g., 鼠标移入)
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 1; len--) {
      const candidate = input.slice(startPos, startPos + len);

      // Check all chars are Chinese
      let allChinese = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isChinese(candidate[i])) {
          allChinese = false;
          break;
        }
      }
      if (!allChinese) continue;

      // Check if it's a keyword (exact match)
      const normalized = CHINESE_KEYWORDS.get(candidate);
      if (normalized) {
        return createToken(
          candidate,
          'keyword',
          createPosition(startPos, startPos + len),
          normalized
        );
      }
    }

    // No keyword match - extract as regular word
    // Stop at particles, ASCII, or whitespace
    let pos = startPos;
    let word = '';

    while (pos < input.length) {
      const char = input[pos];

      // Stop at single-char particles if we have content
      if (PARTICLES.has(char) && word.length > 0) {
        break;
      }

      // Continue if Chinese character
      if (isChinese(char)) {
        word += char;
        pos++;
      } else {
        break;
      }
    }

    if (!word) return null;

    // Check if this word is a particle
    if (PARTICLES.has(word)) {
      return createToken(
        word,
        'particle',
        createPosition(startPos, pos)
      );
    }

    // Not a keyword, return as identifier
    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
  }

  /**
   * Extract an ASCII word (for mixed Chinese/English content).
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
   * Try to extract a string literal, including Chinese quotes.
   * Chinese quotes: \u201C " (open) \u201D " (close) \u2018 ' (open) \u2019 ' (close)
   */
  private tryChineseString(input: string, pos: number): LanguageToken | null {
    const char = input[pos];

    // ASCII quotes
    if (char === '"' || char === "'" || char === '`') {
      return this.tryString(input, pos);
    }

    // Chinese double quotes: \u201C " ... \u201D "
    if (char === '\u201C') {
      let endPos = pos + 1;
      while (endPos < input.length && input[endPos] !== '\u201D') {
        endPos++;
      }
      if (endPos >= input.length) return null;

      const value = input.slice(pos, endPos + 1);
      return createToken(value, 'literal', createPosition(pos, endPos + 1));
    }

    // Chinese single quotes: \u2018 ' ... \u2019 '
    if (char === '\u2018') {
      let endPos = pos + 1;
      while (endPos < input.length && input[endPos] !== '\u2019') {
        endPos++;
      }
      if (endPos >= input.length) return null;

      const value = input.slice(pos, endPos + 1);
      return createToken(value, 'literal', createPosition(pos, endPos + 1));
    }

    return null;
  }

  /**
   * Extract a number, including Chinese time unit suffixes.
   */
  private extractChineseNumber(input: string, startPos: number): LanguageToken | null {
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

    // Check for time units (Chinese or standard)
    if (pos < input.length) {
      const remaining = input.slice(pos);
      // Chinese time units
      if (remaining.startsWith('毫秒')) {
        number += 'ms';
        pos += 2;
      } else if (remaining.startsWith('秒')) {
        number += 's';
        pos += 1;
      } else if (remaining.startsWith('分钟')) {
        number += 'm';
        pos += 2;
      } else if (remaining.startsWith('分')) {
        number += 'm';
        pos += 1;
      } else if (remaining.startsWith('小时')) {
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
export const chineseTokenizer = new ChineseTokenizer();
