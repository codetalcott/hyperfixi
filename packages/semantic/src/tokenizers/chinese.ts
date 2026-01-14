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
  createUnicodeRangeClassifier,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type KeywordEntry,
} from './base';
import { chineseProfile } from '../generators/profiles/chinese';

// =============================================================================
// Chinese Character Classification
// =============================================================================

/** Check if character is a CJK character (Chinese). */
const isChinese = createUnicodeRangeClassifier([
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x20000, 0x2a6df], // CJK Unified Ideographs Extension B
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x2f800, 0x2fa1f], // CJK Compatibility Ideographs Supplement
]);

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
// Chinese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const CHINESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: '真', normalized: 'true' },
  { native: '假', normalized: 'false' },
  { native: '空', normalized: 'null' },
  { native: '未定义', normalized: 'undefined' },

  // Positional
  { native: '第一个', normalized: 'first' },
  { native: '首个', normalized: 'first' },
  { native: '最后一个', normalized: 'last' },
  { native: '末个', normalized: 'last' },
  { native: '下一个', normalized: 'next' },
  { native: '上一个', normalized: 'previous' },
  { native: '最近的', normalized: 'closest' },
  { native: '父级', normalized: 'parent' },

  // Events
  { native: '点击', normalized: 'click' },
  { native: '双击', normalized: 'dblclick' },
  { native: '输入', normalized: 'input' },
  { native: '变更', normalized: 'change' },
  { native: '改变', normalized: 'change' },
  { native: '提交', normalized: 'submit' },
  { native: '按键', normalized: 'keydown' },
  { native: '释放键', normalized: 'keyup' },
  { native: '鼠标移入', normalized: 'mouseover' },
  { native: '鼠标移出', normalized: 'mouseout' },
  { native: '获得焦点', normalized: 'focus' },
  { native: '失去焦点', normalized: 'blur' },
  { native: '加载', normalized: 'load' },
  { native: '滚动', normalized: 'scroll' },

  // Additional references
  { native: '我的', normalized: 'my' },
  { native: '它的', normalized: 'its' },

  // Time units
  { native: '秒', normalized: 's' },
  { native: '毫秒', normalized: 'ms' },
  { native: '分钟', normalized: 'm' },
  { native: '小时', normalized: 'h' },

  // Logical operators
  { native: '和', normalized: 'and' },
  { native: '或者', normalized: 'or' },
  { native: '或', normalized: 'or' },
  { native: '不', normalized: 'not' },
  { native: '非', normalized: 'not' },
  { native: '是', normalized: 'is' },

  // Additional synonyms not in profile
  { native: '若', normalized: 'if' },
  { native: '不然', normalized: 'else' },
  { native: '循环', normalized: 'repeat' },
  { native: '遍历', normalized: 'for' },
  { native: '每个', normalized: 'for' },
  { native: '为每', normalized: 'for' },
  { native: '中止', normalized: 'halt' },
  { native: '抛', normalized: 'throw' },
  { native: '呼叫', normalized: 'call' },
  { native: '回', normalized: 'return' },
  { native: '脚本', normalized: 'js' },
  { native: '通知', normalized: 'tell' },
  { native: '缺省', normalized: 'default' },
  { native: '初始', normalized: 'init' },
  { native: '动作', normalized: 'behavior' },
  { native: '激发', normalized: 'trigger' },
  { native: '对焦', normalized: 'focus' },
  { native: '模糊', normalized: 'blur' },
  { native: '跳转', normalized: 'go' },
  { native: '导航', normalized: 'go' },
  { native: '抓取', normalized: 'fetch' },
  { native: '获取数据', normalized: 'fetch' },
  { native: '安定', normalized: 'settle' },
  { native: '拿取', normalized: 'take' },
  { native: '取', normalized: 'take' },
  { native: '创建', normalized: 'make' },
  { native: '克隆', normalized: 'clone' },
  { native: '记录', normalized: 'log' },
  { native: '打印', normalized: 'log' },
  { native: '动画', normalized: 'transition' },

  // Modifiers
  { native: '到里面', normalized: 'into' },
  { native: '里', normalized: 'into' },
  { native: '前', normalized: 'before' },
  { native: '后', normalized: 'after' },
  { native: '那么', normalized: 'then' },
  { native: '完', normalized: 'end' },
];

// =============================================================================
// Chinese Tokenizer Implementation
// =============================================================================

export class ChineseTokenizer extends BaseTokenizer {
  readonly language = 'zh';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(chineseProfile, CHINESE_EXTRAS);
  }

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
      if (
        isQuote(input[pos]) ||
        input[pos] === '\u201C' ||
        input[pos] === '\u201D' ||
        input[pos] === '\u2018' ||
        input[pos] === '\u2019'
      ) {
        const stringToken = this.tryChineseString(input, pos);
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
      const multiParticle = this.tryMultiCharParticle(input, pos, MULTI_CHAR_PARTICLES);
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
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('<')
    )
      return 'selector';
    if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith('\u201C') ||
      token.startsWith('\u2018')
    )
      return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Extract a Chinese word.
   * Uses greedy matching to find the longest known keyword.
   * Chinese doesn't have inflection, so we don't need morphological normalization.
   * profileKeywords is already sorted longest-first, enabling greedy matching.
   */
  private extractChineseWord(input: string, startPos: number): LanguageToken | null {
    // profileKeywords is sorted longest-first, so iterate through for greedy match
    for (const entry of this.profileKeywords) {
      const keyword = entry.native;
      const candidate = input.slice(startPos, startPos + keyword.length);

      if (candidate === keyword) {
        // Check all chars are Chinese (to avoid matching partial ASCII)
        let allChinese = true;
        for (let i = 0; i < keyword.length; i++) {
          if (!isChinese(keyword[i])) {
            allChinese = false;
            break;
          }
        }
        if (allChinese) {
          return createToken(
            candidate,
            'keyword',
            createPosition(startPos, startPos + keyword.length),
            entry.normalized
          );
        }
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
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // Not a keyword, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
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

    return createToken(word, 'identifier', createPosition(startPos, pos));
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
export const chineseTokenizer = new ChineseTokenizer();
