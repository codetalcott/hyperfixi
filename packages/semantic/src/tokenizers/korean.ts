/**
 * Korean Tokenizer
 *
 * Tokenizes Korean hyperscript input.
 * Korean is an agglutinative language with:
 * - Hangul syllable blocks (가-힣)
 * - Particles (조사) mark grammatical roles
 * - 하다 verbs (noun + 하다)
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
import { KoreanMorphologicalNormalizer } from './morphology/korean-normalizer';
import { koreanProfile } from '../generators/profiles/korean';

// =============================================================================
// Korean Character Classification
// =============================================================================

/** Check if character is a Korean syllable block (U+AC00-U+D7A3). */
const isHangul = createUnicodeRangeClassifier([[0xac00, 0xd7a3]]);

/** Check if character is a Hangul Jamo (U+1100-U+11FF, U+3130-U+318F). */
const isJamo = createUnicodeRangeClassifier([
  [0x1100, 0x11ff], // Hangul Jamo
  [0x3130, 0x318f], // Hangul Compatibility Jamo
]);

/** Check if character is Korean (Hangul syllable or Jamo). */
const isKorean = combineClassifiers(isHangul, isJamo);

// =============================================================================
// Korean Particles (조사)
// =============================================================================

/**
 * Korean particles that mark grammatical roles.
 * These appear after nouns and vary based on vowel harmony.
 */
const PARTICLES = new Set([
  // Subject markers
  '이', // i - after consonant
  '가', // ga - after vowel
  // Object markers
  '을', // eul - after consonant
  '를', // reul - after vowel
  // Topic markers
  '은', // eun - after consonant
  '는', // neun - after vowel
  // Location/time markers
  '에', // e - at, to
  '에서', // eseo - at (action location), from
  '로', // ro - to, by means (after vowel or ㄹ)
  '으로', // euro - to, by means (after consonant)
  // Others
  '와', // wa - and, with (after vowel)
  '과', // gwa - and, with (after consonant)
  '의', // ui - possessive ('s)
  '도', // do - also
  '만', // man - only
  '부터', // buteo - from
  '까지', // kkaji - until
  '처럼', // cheoreom - like
  '보다', // boda - than
]);

/**
 * Single-character particles.
 */
const SINGLE_CHAR_PARTICLES = new Set([
  '이',
  '가',
  '을',
  '를',
  '은',
  '는',
  '에',
  '로',
  '와',
  '과',
  '의',
  '도',
  '만',
]);

/**
 * Multi-character particles.
 */
const MULTI_CHAR_PARTICLES = ['에서', '으로', '부터', '까지', '처럼', '보다'];

// =============================================================================
// Korean Extras (keywords not in profile)
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
const KOREAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: '참', normalized: 'true' },
  { native: '거짓', normalized: 'false' },
  { native: '널', normalized: 'null' },
  { native: '미정의', normalized: 'undefined' },

  // Positional
  { native: '첫번째', normalized: 'first' },
  { native: '마지막', normalized: 'last' },
  { native: '다음', normalized: 'next' },
  { native: '이전', normalized: 'previous' },
  { native: '가장가까운', normalized: 'closest' },
  { native: '부모', normalized: 'parent' },

  // Events
  { native: '클릭', normalized: 'click' },
  { native: '더블클릭', normalized: 'dblclick' },
  { native: '변경', normalized: 'change' },
  { native: '제출', normalized: 'submit' },
  { native: '입력', normalized: 'input' },
  { native: '로드', normalized: 'load' },
  { native: '스크롤', normalized: 'scroll' },
  { native: '키다운', normalized: 'keydown' },
  { native: '키업', normalized: 'keyup' },
  { native: '마우스오버', normalized: 'mouseover' },
  { native: '마우스아웃', normalized: 'mouseout' },

  // References (additional forms)
  { native: '내', normalized: 'my' },
  { native: '그것의', normalized: 'its' },

  // Conditional event forms (native idioms)
  { native: '하면', normalized: 'on' },
  { native: '으면', normalized: 'on' },
  { native: '면', normalized: 'on' },
  { native: '할때', normalized: 'on' },
  { native: '할 때', normalized: 'on' },
  { native: '을때', normalized: 'on' },
  { native: '을 때', normalized: 'on' },
  { native: '하니까', normalized: 'on' },
  { native: '니까', normalized: 'on' },

  // Control flow helpers
  { native: '그러면', normalized: 'then' },
  { native: '그렇지않으면', normalized: 'otherwise' },
  { native: '중단', normalized: 'break' },

  // Logical
  { native: '그리고', normalized: 'and' },
  { native: '또는', normalized: 'or' },
  { native: '아니', normalized: 'not' },
  { native: '이다', normalized: 'is' },

  // Command overrides (ensure correct mapping when profile has multiple meanings)
  { native: '추가', normalized: 'add' }, // Profile may have this as 'append'

  // Attached particle forms (native idioms - particle + verb without space)
  // Object particle 를 (after vowel)
  { native: '를토글', normalized: 'toggle' },
  { native: '를전환', normalized: 'toggle' },
  { native: '를추가', normalized: 'add' },
  { native: '를제거', normalized: 'remove' },
  { native: '를삭제', normalized: 'remove' },
  { native: '를증가', normalized: 'increment' },
  { native: '를감소', normalized: 'decrement' },
  { native: '를표시', normalized: 'show' },
  { native: '를숨기다', normalized: 'hide' },
  { native: '를설정', normalized: 'set' },
  // Object particle 을 (after consonant)
  { native: '을토글', normalized: 'toggle' },
  { native: '을전환', normalized: 'toggle' },
  { native: '을추가', normalized: 'add' },
  { native: '을제거', normalized: 'remove' },
  { native: '을삭제', normalized: 'remove' },
  { native: '을증가', normalized: 'increment' },
  { native: '을감소', normalized: 'decrement' },
  { native: '을표시', normalized: 'show' },
  { native: '을숨기다', normalized: 'hide' },
  { native: '을설정', normalized: 'set' },

  // Time units
  { native: '초', normalized: 's' },
  { native: '밀리초', normalized: 'ms' },
  { native: '분', normalized: 'm' },
  { native: '시간', normalized: 'h' },
];

// =============================================================================
// Korean Tokenizer Implementation
// =============================================================================

export class KoreanTokenizer extends BaseTokenizer {
  readonly language = 'ko';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(koreanProfile, KOREAN_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new KoreanMorphologicalNormalizer();
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
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

      // Try string literal
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

      // Try number (including Korean time units)
      if (isDigit(input[pos])) {
        const numberToken = this.extractKoreanNumber(input, pos);
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

      // Try Korean word FIRST (before particles)
      // This ensures keywords like 로그 aren't split on particle characters
      if (isKorean(input[pos])) {
        const wordToken = this.extractKoreanWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
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
        tokens.push(createToken(input[pos], 'particle', createPosition(pos, pos + 1)));
        pos++;
        continue;
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

    return new TokenStreamImpl(tokens, 'ko');
  }

  classifyToken(token: string): TokenKind {
    if (PARTICLES.has(token)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Try to match a multi-character particle.
   */
  private tryMultiCharParticle(input: string, pos: number): LanguageToken | null {
    for (const particle of MULTI_CHAR_PARTICLES) {
      if (input.slice(pos, pos + particle.length) === particle) {
        return createToken(particle, 'particle', createPosition(pos, pos + particle.length));
      }
    }
    return null;
  }

  /**
   * Extract a Korean word (sequence of Hangul).
   * Prioritizes known keywords, then uses particle-based word boundaries.
   *
   * Uses morphological normalization to handle verb conjugations.
   */
  private extractKoreanWord(input: string, startPos: number): LanguageToken | null {
    // First, try to find the longest matching keyword starting at this position
    // This ensures compound words like 추가, 증가, 숨기다 are recognized whole
    const maxKeywordLen = 6; // Longest Korean keyword
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 2; len--) {
      const candidate = input.slice(startPos, startPos + len);
      // Check all chars are Korean
      let allKorean = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isKorean(candidate[i])) {
          allKorean = false;
          break;
        }
      }
      if (!allKorean) continue;

      // O(1) Map lookup instead of O(n) array search
      const keywordEntry = this.lookupKeyword(candidate);
      if (keywordEntry) {
        return createToken(
          candidate,
          'keyword',
          createPosition(startPos, startPos + len),
          keywordEntry.normalized
        );
      }

      // Try morphological normalization for conjugated forms
      const morphToken = this.tryMorphKeywordMatch(candidate, startPos, startPos + len);
      if (morphToken) return morphToken;
    }

    // No keyword match - extract as regular word using particle boundaries
    let pos = startPos;
    let word = '';

    while (pos < input.length) {
      const char = input[pos];
      const nextChar = pos + 1 < input.length ? input[pos + 1] : '';

      // Stop at single-char particles only if:
      // 1. We have content already
      // 2. The particle is at a word boundary (followed by whitespace, end, non-Korean, or another particle)
      if (SINGLE_CHAR_PARTICLES.has(char) && word.length > 0) {
        const isWordBoundary =
          nextChar === '' ||
          isWhitespace(nextChar) ||
          !isKorean(nextChar) ||
          SINGLE_CHAR_PARTICLES.has(nextChar);

        if (isWordBoundary) {
          break;
        }
        // Otherwise, continue - this particle char is part of the word
      }

      // Check for multi-char particle (these are always at word boundaries)
      let foundMulti = false;
      for (const particle of MULTI_CHAR_PARTICLES) {
        if (input.slice(pos, pos + particle.length) === particle && word.length > 0) {
          // Only treat as particle if followed by word boundary
          const afterParticle = pos + particle.length;
          const charAfter = afterParticle < input.length ? input[afterParticle] : '';
          if (charAfter === '' || isWhitespace(charAfter) || !isKorean(charAfter)) {
            foundMulti = true;
            break;
          }
        }
      }
      if (foundMulti) break;

      // Continue if Korean character
      if (isKorean(char)) {
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
   * Extract an ASCII word (for mixed Korean/English content).
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
   * Extract a number, including Korean time unit suffixes.
   */
  private extractKoreanNumber(input: string, startPos: number): LanguageToken | null {
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

    // Check for time units (Korean or standard)
    if (pos < input.length) {
      const remaining = input.slice(pos);
      // Korean time units
      if (remaining.startsWith('밀리초')) {
        number += 'ms';
        pos += 3;
      } else if (remaining.startsWith('초')) {
        number += 's';
        pos += 1;
      } else if (remaining.startsWith('분')) {
        number += 'm';
        pos += 1;
      } else if (remaining.startsWith('시간')) {
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
export const koreanTokenizer = new KoreanTokenizer();
