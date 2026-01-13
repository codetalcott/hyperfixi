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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type CreateTokenOptions,
} from './base';
import { KoreanMorphologicalNormalizer } from './morphology/korean-normalizer';

// =============================================================================
// Korean Character Classification
// =============================================================================

/**
 * Check if character is a Korean syllable block (Hangul).
 * Korean syllables are in the range U+AC00 to U+D7A3.
 */
function isHangul(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * Check if character is a Hangul Jamo (individual letter).
 * Jamo range: U+1100 to U+11FF, U+3130 to U+318F
 */
function isJamo(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x1100 && code <= 0x11ff) || (code >= 0x3130 && code <= 0x318f);
}

/**
 * Check if character is Korean (Hangul syllable or Jamo).
 */
function isKorean(char: string): boolean {
  return isHangul(char) || isJamo(char);
}

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
// Korean Keywords
// =============================================================================

/**
 * Korean command keywords mapped to their English equivalents.
 */
const KOREAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['토글', 'toggle'],
  ['전환', 'toggle'],
  ['추가', 'add'],
  ['제거', 'remove'],
  ['삭제', 'remove'],
  // Commands - Content operations
  ['넣다', 'put'],
  ['넣기', 'put'],
  ['놓기', 'put'],
  ['가져오다', 'take'],
  ['만들다', 'make'],
  ['복사', 'clone'],
  // Commands - Variable operations
  ['설정', 'set'],
  ['얻다', 'get'],
  ['가져오기', 'get'], // nominalized form - common for "get" (test case)
  ['패치', 'fetch'], // Korean transliteration for fetch
  ['증가', 'increment'],
  ['감소', 'decrement'],
  ['로그', 'log'],
  // Commands - Visibility
  ['보이다', 'show'],
  ['보이기', 'show'], // nominalized form (test case)
  ['표시', 'show'],
  ['숨기다', 'hide'],
  ['숨기기', 'hide'], // nominalized form
  ['전환', 'transition'],
  // Commands - Events (standard markers)
  ['에', 'on'],
  ['시', 'on'],
  ['때', 'on'],
  // Conditional event markers (native idioms - parallel to Japanese したら)
  ['하면', 'on'], // conditional marker (if/when)
  ['으면', 'on'], // conditional marker (vowel harmony variant)
  ['면', 'on'], // bare conditional suffix
  ['할때', 'on'], // temporal marker (when it happens)
  ['할 때', 'on'], // temporal marker with space
  ['을때', 'on'], // temporal marker (vowel harmony variant)
  ['을 때', 'on'], // temporal marker with space
  ['하니까', 'on'], // causal marker (because/since)
  ['니까', 'on'], // bare causal suffix
  ['트리거', 'trigger'],
  ['보내다', 'send'],
  // Commands - DOM focus
  ['포커스', 'focus'],
  ['블러', 'blur'],
  // Commands - Navigation
  ['이동', 'go'],
  // Commands - Async
  ['대기', 'wait'],
  ['안정', 'settle'],
  // Commands - Control flow
  ['만약', 'if'],
  ['아니면', 'else'],
  ['반복', 'repeat'],
  ['동안', 'while'],
  ['동안', 'for'],
  ['계속', 'continue'],
  ['정지', 'halt'],
  ['던지다', 'throw'],
  ['호출', 'call'],
  ['반환', 'return'],
  // Commands - Advanced
  ['JS실행', 'js'],
  ['js', 'js'],
  ['비동기', 'async'],
  ['말하다', 'tell'],
  ['기본값', 'default'],
  ['초기화', 'init'],
  ['동작', 'behavior'],
  ['설치', 'install'],
  ['설치하다', 'install'],
  ['측정', 'measure'],
  ['측정하다', 'measure'],
  ['이벤트', 'event'],
  ['에서', 'from'],
  // Modifiers
  ['으로', 'into'],
  ['전에', 'before'],
  ['후에', 'after'],
  // Control flow helpers
  ['그러면', 'then'],
  ['그렇지않으면', 'otherwise'],
  ['끝', 'end'],
  ['까지', 'until'],
  ['중단', 'break'],
  // Events (for event name recognition)
  ['클릭', 'click'],
  ['더블클릭', 'dblclick'],
  ['입력', 'input'],
  ['변경', 'change'],
  ['제출', 'submit'],
  ['포커스', 'focus'],
  ['블러', 'blur'],
  ['키다운', 'keydown'],
  ['키업', 'keyup'],
  ['마우스오버', 'mouseover'],
  ['마우스아웃', 'mouseout'],
  ['로드', 'load'],
  ['스크롤', 'scroll'],
  // References
  ['나', 'me'],
  ['내', 'my'],
  ['그것', 'it'],
  ['그것의', 'its'],
  ['결과', 'result'],
  ['이벤트', 'event'],
  ['대상', 'target'],
  // Positional
  ['첫번째', 'first'],
  ['마지막', 'last'],
  ['다음', 'next'],
  ['이전', 'previous'],
  // Logical
  ['그리고', 'and'],
  ['또는', 'or'],
  ['아니', 'not'],
  ['이다', 'is'],
  // Time units
  ['초', 's'],
  ['밀리초', 'ms'],
  ['분', 'm'],
  ['시간', 'h'],
  // Values
  ['참', 'true'],
  ['거짓', 'false'],
  // Attached particle forms (native idioms - particle + verb without space)
  // These allow natural writing like ".active를토글" or "#count를증가"
  // Object particle 를 (after vowel)
  ['를토글', 'toggle'],
  ['를전환', 'toggle'],
  ['를추가', 'add'],
  ['를제거', 'remove'],
  ['를삭제', 'remove'],
  ['를증가', 'increment'],
  ['를감소', 'decrement'],
  ['를표시', 'show'],
  ['를숨기다', 'hide'],
  ['를설정', 'set'],
  // Object particle 을 (after consonant)
  ['을토글', 'toggle'],
  ['을전환', 'toggle'],
  ['을추가', 'add'],
  ['을제거', 'remove'],
  ['을삭제', 'remove'],
  ['을증가', 'increment'],
  ['을감소', 'decrement'],
  ['을표시', 'show'],
  ['을숨기다', 'hide'],
  ['을설정', 'set'],
]);

// =============================================================================
// Korean Tokenizer Implementation
// =============================================================================

export class KoreanTokenizer extends BaseTokenizer {
  readonly language = 'ko';
  readonly direction = 'ltr' as const;

  /** Morphological normalizer for Korean verb conjugations */
  private morphNormalizer = new KoreanMorphologicalNormalizer();

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
    if (KOREAN_KEYWORDS.has(token)) return 'keyword';
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

      // Check if it's a keyword (exact match or stem match)
      const normalized = KOREAN_KEYWORDS.get(candidate);
      if (normalized) {
        return createToken(
          candidate,
          'keyword',
          createPosition(startPos, startPos + len),
          normalized
        );
      }

      // Try morphological normalization for conjugated forms
      const morphResult = this.morphNormalizer.normalize(candidate);
      if (morphResult.stem !== candidate && morphResult.confidence >= 0.7) {
        const stemNormalized = KOREAN_KEYWORDS.get(morphResult.stem);
        if (stemNormalized) {
          const tokenOptions: CreateTokenOptions = {
            normalized: stemNormalized,
            stem: morphResult.stem,
            stemConfidence: morphResult.confidence,
          };
          return createToken(
            candidate,
            'keyword',
            createPosition(startPos, startPos + len),
            tokenOptions
          );
        }
      }
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

    // Check if this is a known keyword (exact match)
    const normalized = KOREAN_KEYWORDS.get(word);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    // Try morphological normalization for conjugated forms
    const morphResult = this.morphNormalizer.normalize(word);

    if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
      // Check if the stem is a known keyword
      const stemNormalized = KOREAN_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(word, 'keyword', createPosition(startPos, pos), tokenOptions);
      }
    }

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
