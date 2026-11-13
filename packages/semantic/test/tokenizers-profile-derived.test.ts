/**
 * Test: Profile-Derived vs Hardcoded Japanese Tokenizer
 *
 * This test validates that the profile-derived tokenizer pattern
 * can handle complex SOV languages with non-Latin scripts.
 *
 * Goal: Compare keyword recognition between:
 * 1. Original hardcoded JAPANESE_KEYWORDS map
 * 2. Profile-derived keywords from initializeKeywordsFromProfile()
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { LanguageToken, TokenStream } from '../src/types';
import type { KeywordEntry } from '../src/tokenizers/base';
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
} from '../src/tokenizers/base';
import { japaneseProfile } from '../src/generators/profiles/japanese';
import { JapaneseMorphologicalNormalizer } from '../src/tokenizers/morphology/japanese-normalizer';

// Import original tokenizer for comparison
import { JapaneseTokenizer as OriginalJapaneseTokenizer } from '../src/tokenizers/japanese';

// =============================================================================
// Character Classification (shared)
// =============================================================================

function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
}

function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff;
}

function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

function isJapanese(char: string): boolean {
  return isHiragana(char) || isKatakana(char) || isKanji(char);
}

// =============================================================================
// Particles
// =============================================================================

const PARTICLES = new Set([
  'を', 'に', 'で', 'から', 'まで', 'へ', 'と', 'の', 'が', 'は', 'も', 'より',
]);
const SINGLE_CHAR_PARTICLES = new Set(['を', 'に', 'で', 'へ', 'と', 'の', 'が', 'は', 'も']);
const MULTI_CHAR_PARTICLES = ['から', 'まで', 'より'];

// =============================================================================
// Japanese-Specific Extras (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Attached particle forms (native idioms)
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
  { native: '結果', normalized: 'result' },
  { native: 'イベント', normalized: 'event' },
  { native: 'ターゲット', normalized: 'target' },

  // Attached particle forms (native idioms - を + verb)
  { native: 'を切り替え', normalized: 'toggle' },
  { native: 'を切り替える', normalized: 'toggle' },
  { native: 'をトグル', normalized: 'toggle' },
  { native: 'を増加', normalized: 'increment' },
  { native: 'を増やす', normalized: 'increment' },
  { native: 'を減少', normalized: 'decrement' },
  { native: 'を減らす', normalized: 'decrement' },
  { native: 'を追加', normalized: 'add' },
  { native: 'を削除', normalized: 'remove' },
  { native: 'を表示', normalized: 'show' },
  { native: 'を隠す', normalized: 'hide' },
  { native: 'を非表示', normalized: 'hide' },

  // Conditional event forms
  { native: 'したら', normalized: 'on' },
  { native: 'すると', normalized: 'on' },
  { native: '時に', normalized: 'on' },

  // Control flow helpers
  { native: 'ならば', normalized: 'then' },
  { native: 'なら', normalized: 'then' },
  { native: '終わり', normalized: 'end' },

  // Time units
  { native: '秒', normalized: 's' },
  { native: 'ミリ秒', normalized: 'ms' },
  { native: '分', normalized: 'm' },
  { native: '時間', normalized: 'h' },
];

// =============================================================================
// Profile-Derived Japanese Tokenizer
// =============================================================================

class ProfileDerivedJapaneseTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;
  private morphNormalizer = new JapaneseMorphologicalNormalizer();

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(japaneseProfile, JAPANESE_EXTRAS);
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // CSS selectors
      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // String literals
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // URLs
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Numbers with time units
      if (isDigit(input[pos])) {
        const numberToken = this.extractJapaneseNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Variable references
      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Multi-character particles
      const multiParticle = this.tryMultiCharParticle(input, pos);
      if (multiParticle) {
        tokens.push(multiParticle);
        pos = multiParticle.position.end;
        continue;
      }

      // Single-character particles
      if (SINGLE_CHAR_PARTICLES.has(input[pos])) {
        tokens.push(createToken(input[pos], 'particle', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // Japanese words - try profile keyword matching
      if (isJapanese(input[pos])) {
        const wordToken = this.extractJapaneseWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // ASCII words
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        const keywordToken = this.tryProfileKeyword(input, pos);
        if (keywordToken) {
          tokens.push(keywordToken);
          pos = keywordToken.position.end;
          continue;
        }

        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos++];
        }
        if (word) {
          tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
        }
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'ja');
  }

  classifyToken(token: string): 'keyword' | 'particle' | 'selector' | 'literal' | 'identifier' {
    if (PARTICLES.has(token)) return 'particle';
    for (const entry of this.profileKeywords) {
      if (token.toLowerCase() === entry.native.toLowerCase()) return 'keyword';
    }
    if (token.startsWith('.') || token.startsWith('#') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('「')) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private tryMultiCharParticle(input: string, pos: number): LanguageToken | null {
    for (const particle of MULTI_CHAR_PARTICLES) {
      if (input.slice(pos, pos + particle.length) === particle) {
        return createToken(particle, 'particle', createPosition(pos, pos + particle.length));
      }
    }
    return null;
  }

  private extractJapaneseWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length) {
      const char = input[pos];

      if (SINGLE_CHAR_PARTICLES.has(char) && word.length > 0) break;

      let foundMulti = false;
      for (const particle of MULTI_CHAR_PARTICLES) {
        if (input.slice(pos, pos + particle.length) === particle && word.length > 0) {
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) break;

      if (isJapanese(char)) {
        word += char;
        pos++;
      } else {
        break;
      }
    }

    if (!word) return null;

    // Try profile keyword lookup (exact match)
    for (const entry of this.profileKeywords) {
      if (word === entry.native) {
        return createToken(word, 'keyword', createPosition(startPos, pos), entry.normalized);
      }
    }

    // Try morphological normalization
    const morphResult = this.morphNormalizer.normalize(word);
    if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
      for (const entry of this.profileKeywords) {
        if (morphResult.stem === entry.native) {
          const tokenOptions: CreateTokenOptions = {
            normalized: entry.normalized,
            stem: morphResult.stem,
            stemConfidence: morphResult.confidence,
          };
          return createToken(word, 'keyword', createPosition(startPos, pos), tokenOptions);
        }
      }
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  private extractJapaneseNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    if (pos < input.length) {
      const remaining = input.slice(pos);
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
      } else if (remaining.startsWith('ms')) {
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
    return createToken(number, 'literal', createPosition(startPos, pos));
  }

  // Expose keywords for comparison
  getKeywordCount(): number {
    return this.profileKeywords.length;
  }

  getKeywordSet(): Set<string> {
    return new Set(this.profileKeywords.map(k => k.native));
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Profile-Derived Japanese Tokenizer Comparison', () => {
  let originalTokenizer: OriginalJapaneseTokenizer;
  let profileDerivedTokenizer: ProfileDerivedJapaneseTokenizer;

  beforeAll(() => {
    originalTokenizer = new OriginalJapaneseTokenizer();
    profileDerivedTokenizer = new ProfileDerivedJapaneseTokenizer();
  });

  describe('Keyword Coverage', () => {
    it('should have keywords from profile', () => {
      const profileDerivedKeywords = profileDerivedTokenizer.getKeywordSet();

      // Check that primary keywords from profile are included
      expect(profileDerivedKeywords.has('切り替え')).toBe(true); // toggle primary
      expect(profileDerivedKeywords.has('トグル')).toBe(true); // toggle alternative
      expect(profileDerivedKeywords.has('追加')).toBe(true); // add
      expect(profileDerivedKeywords.has('削除')).toBe(true); // remove
      expect(profileDerivedKeywords.has('表示')).toBe(true); // show
      expect(profileDerivedKeywords.has('隠す')).toBe(true); // hide
    });

    it('should have extras (events, positional, idioms)', () => {
      const profileDerivedKeywords = profileDerivedTokenizer.getKeywordSet();

      // Events
      expect(profileDerivedKeywords.has('クリック')).toBe(true);
      expect(profileDerivedKeywords.has('変更')).toBe(true);

      // Positional
      expect(profileDerivedKeywords.has('最初')).toBe(true);
      expect(profileDerivedKeywords.has('最後')).toBe(true);

      // Attached particle idioms
      expect(profileDerivedKeywords.has('を切り替え')).toBe(true);
      expect(profileDerivedKeywords.has('を追加')).toBe(true);
    });

    it('should report keyword count', () => {
      const count = profileDerivedTokenizer.getKeywordCount();
      console.log(`Profile-derived keyword count: ${count}`);
      // Should have profile keywords + extras
      expect(count).toBeGreaterThan(50);
    });
  });

  describe('Basic Tokenization Equivalence', () => {
    const testCases = [
      { input: '切り替え .active', description: 'simple toggle command' },
      { input: '#button の .active を 切り替え', description: 'full SOV toggle' },
      { input: 'クリック で 表示 #modal', description: 'event handler' },
      { input: '.item を 追加 #list に', description: 'add with destination' },
      { input: '3秒 待つ', description: 'wait with time unit' },
      { input: ':count を 増加', description: 'increment variable' },
    ];

    for (const { input, description } of testCases) {
      it(`should tokenize "${description}": ${input}`, () => {
        const originalTokens = originalTokenizer.tokenize(input);
        const profileDerivedTokens = profileDerivedTokenizer.tokenize(input);

        const originalArr = originalTokens.tokens;
        const profileDerivedArr = profileDerivedTokens.tokens;

        // Compare token counts
        expect(profileDerivedArr.length).toBe(originalArr.length);

        // Compare token values and kinds
        for (let i = 0; i < originalArr.length; i++) {
          expect(profileDerivedArr[i].value).toBe(originalArr[i].value);
          expect(profileDerivedArr[i].kind).toBe(originalArr[i].kind);
        }
      });
    }
  });

  describe('Keyword Recognition', () => {
    const keywordTests = [
      { input: '切り替え', expectedNormalized: 'toggle' },
      { input: 'トグル', expectedNormalized: 'toggle' },
      { input: '追加', expectedNormalized: 'add' },
      { input: '削除', expectedNormalized: 'remove' },
      { input: '表示', expectedNormalized: 'show' },
      { input: '隠す', expectedNormalized: 'hide' },
      { input: '増加', expectedNormalized: 'increment' },
      { input: '減少', expectedNormalized: 'decrement' },
    ];

    for (const { input, expectedNormalized } of keywordTests) {
      it(`should recognize "${input}" as keyword -> "${expectedNormalized}"`, () => {
        const tokens = profileDerivedTokenizer.tokenize(input).tokens;
        expect(tokens.length).toBe(1);
        expect(tokens[0].kind).toBe('keyword');
        expect(tokens[0].normalized).toBe(expectedNormalized);
      });
    }
  });

  describe('Mixed Script Handling', () => {
    it('should handle CSS selectors in Japanese context', () => {
      const tokens = profileDerivedTokenizer.tokenize('#button .active').tokens;
      expect(tokens.length).toBe(2);
      expect(tokens[0].kind).toBe('selector');
      expect(tokens[1].kind).toBe('selector');
    });

    it('should handle variable references', () => {
      const tokens = profileDerivedTokenizer.tokenize(':count を 増加').tokens;
      expect(tokens.find(t => t.value === ':count')?.kind).toBe('identifier');
      expect(tokens.find(t => t.value === 'を')?.kind).toBe('particle');
      expect(tokens.find(t => t.value === '増加')?.kind).toBe('keyword');
    });

    it('should handle string literals', () => {
      const tokens = profileDerivedTokenizer.tokenize('"テスト" を 置く').tokens;
      expect(tokens.find(t => t.value === '"テスト"')?.kind).toBe('literal');
    });
  });

  describe('Particle Handling', () => {
    it('should recognize single-character particles', () => {
      const tokens = profileDerivedTokenizer.tokenize('を に で').tokens;
      expect(tokens.every(t => t.kind === 'particle')).toBe(true);
    });

    it('should recognize multi-character particles', () => {
      const tokens = profileDerivedTokenizer.tokenize('#source から #dest まで').tokens;
      const particleTokens = tokens.filter(t => t.kind === 'particle');
      expect(particleTokens.map(t => t.value)).toContain('から');
      expect(particleTokens.map(t => t.value)).toContain('まで');
    });
  });

  describe('Time Units', () => {
    it('should parse Japanese time units', () => {
      const cases = [
        { input: '3秒', expected: '3s' },
        { input: '500ミリ秒', expected: '500ms' },
        { input: '2分', expected: '2m' },
        { input: '1時間', expected: '1h' },
      ];

      for (const { input, expected } of cases) {
        const tokens = profileDerivedTokenizer.tokenize(input).tokens;
        expect(tokens[0].value).toBe(expected);
        expect(tokens[0].kind).toBe('literal');
      }
    });
  });

  describe('Code Size Comparison', () => {
    it('should demonstrate code reduction potential', () => {
      // Count keywords in profile
      let profileKeywordCount = 0;
      for (const [, value] of Object.entries(japaneseProfile.keywords)) {
        profileKeywordCount++; // primary
        if (value.alternatives) {
          profileKeywordCount += value.alternatives.length;
        }
      }

      // Add extras
      const extrasCount = JAPANESE_EXTRAS.length;
      const totalProfileDerived = profileKeywordCount + extrasCount;

      console.log(`\nCode Size Comparison:`);
      console.log(`  Profile keywords: ${profileKeywordCount}`);
      console.log(`  Extras: ${extrasCount}`);
      console.log(`  Total profile-derived: ${totalProfileDerived}`);
      console.log(`  Original hardcoded: ~185 entries`);
      console.log(`  \nWith profile-derived approach:`);
      console.log(`  - Keywords come from single source (profile)`);
      console.log(`  - Only extras need to be maintained in tokenizer`);
      console.log(`  - Profile changes automatically propagate`);

      // The profile-derived approach should cover the essential keywords
      expect(totalProfileDerived).toBeGreaterThan(100);
    });
  });
});

// =============================================================================
// Korean Tokenizer Validation Tests
// =============================================================================

import { KoreanTokenizer as OriginalKoreanTokenizer } from '../src/tokenizers/korean';
import { koreanProfile } from '../src/generators/profiles/korean';
import { KoreanMorphologicalNormalizer } from '../src/tokenizers/morphology/korean-normalizer';

// Korean character classification
function isHangul(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

function isJamo(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x1100 && code <= 0x11ff) || (code >= 0x3130 && code <= 0x318f);
}

function isKoreanChar(char: string): boolean {
  return isHangul(char) || isJamo(char);
}

// Korean particles
const KOREAN_PARTICLES = new Set([
  '이', '가', '을', '를', '은', '는', '에', '에서', '로', '으로',
  '와', '과', '의', '도', '만', '부터', '까지', '처럼', '보다',
]);
const KOREAN_SINGLE_CHAR_PARTICLES = new Set([
  '이', '가', '을', '를', '은', '는', '에', '로', '와', '과', '의', '도', '만',
]);
const KOREAN_MULTI_CHAR_PARTICLES = ['에서', '으로', '부터', '까지', '처럼', '보다'];

// Korean extras (not in profile)
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

// Profile-derived Korean tokenizer for validation
class ProfileDerivedKoreanTokenizer extends BaseTokenizer {
  readonly language = 'ko';
  readonly direction = 'ltr' as const;
  private morphNormalizer = new KoreanMorphologicalNormalizer();

  constructor() {
    super();
    this.initializeKeywordsFromProfile(koreanProfile, KOREAN_EXTRAS);
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      if (isDigit(input[pos])) {
        const numberToken = this.extractKoreanNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Try Korean word FIRST (before particles)
      if (isKoreanChar(input[pos])) {
        const wordToken = this.extractKoreanWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Multi-character particle
      let foundMulti = false;
      for (const particle of KOREAN_MULTI_CHAR_PARTICLES) {
        if (input.slice(pos, pos + particle.length) === particle) {
          tokens.push(createToken(particle, 'particle', createPosition(pos, pos + particle.length)));
          pos += particle.length;
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) continue;

      // Single-character particle
      if (KOREAN_SINGLE_CHAR_PARTICLES.has(input[pos])) {
        tokens.push(createToken(input[pos], 'particle', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // ASCII word
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos++];
        }
        if (word) {
          tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
        }
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'ko');
  }

  classifyToken(token: string): 'keyword' | 'particle' | 'selector' | 'literal' | 'identifier' {
    if (KOREAN_PARTICLES.has(token)) return 'particle';
    for (const entry of this.profileKeywords) {
      if (token === entry.native) return 'keyword';
    }
    if (token.startsWith('.') || token.startsWith('#') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractKoreanWord(input: string, startPos: number): LanguageToken | null {
    // Try longest keyword match first
    const maxKeywordLen = 6;
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 2; len--) {
      const candidate = input.slice(startPos, startPos + len);
      let allKorean = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isKoreanChar(candidate[i])) {
          allKorean = false;
          break;
        }
      }
      if (!allKorean) continue;

      // Skip if this is a particle (particles shouldn't be classified as keywords)
      if (KOREAN_PARTICLES.has(candidate)) continue;

      for (const entry of this.profileKeywords) {
        if (candidate === entry.native) {
          return createToken(candidate, 'keyword', createPosition(startPos, startPos + len), entry.normalized);
        }
      }

      // Try morphological normalization
      const morphResult = this.morphNormalizer.normalize(candidate);
      if (morphResult.stem !== candidate && morphResult.confidence >= 0.7) {
        for (const entry of this.profileKeywords) {
          if (morphResult.stem === entry.native) {
            const tokenOptions: CreateTokenOptions = {
              normalized: entry.normalized,
              stem: morphResult.stem,
              stemConfidence: morphResult.confidence,
            };
            return createToken(candidate, 'keyword', createPosition(startPos, startPos + len), tokenOptions);
          }
        }
      }
    }

    // Extract as regular word
    let pos = startPos;
    let word = '';

    while (pos < input.length) {
      const char = input[pos];
      const nextChar = pos + 1 < input.length ? input[pos + 1] : '';

      if (KOREAN_SINGLE_CHAR_PARTICLES.has(char) && word.length > 0) {
        const isWordBoundary = nextChar === '' || isWhitespace(nextChar) || !isKoreanChar(nextChar) || KOREAN_SINGLE_CHAR_PARTICLES.has(nextChar);
        if (isWordBoundary) break;
      }

      let foundMulti = false;
      for (const particle of KOREAN_MULTI_CHAR_PARTICLES) {
        if (input.slice(pos, pos + particle.length) === particle && word.length > 0) {
          const afterParticle = pos + particle.length;
          const charAfter = afterParticle < input.length ? input[afterParticle] : '';
          if (charAfter === '' || isWhitespace(charAfter) || !isKoreanChar(charAfter)) {
            foundMulti = true;
            break;
          }
        }
      }
      if (foundMulti) break;

      if (isKoreanChar(char)) {
        word += char;
        pos++;
      } else {
        break;
      }
    }

    if (!word) return null;

    // Skip if this is a particle
    if (KOREAN_PARTICLES.has(word)) {
      return null; // Let particle handling take care of it
    }

    for (const entry of this.profileKeywords) {
      if (word === entry.native) {
        return createToken(word, 'keyword', createPosition(startPos, pos), entry.normalized);
      }
    }

    // Try morphological normalization
    const morphResult = this.morphNormalizer.normalize(word);
    if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
      for (const entry of this.profileKeywords) {
        if (morphResult.stem === entry.native) {
          const tokenOptions: CreateTokenOptions = {
            normalized: entry.normalized,
            stem: morphResult.stem,
            stemConfidence: morphResult.confidence,
          };
          return createToken(word, 'keyword', createPosition(startPos, pos), tokenOptions);
        }
      }
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  private extractKoreanNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    if (pos < input.length) {
      const remaining = input.slice(pos);
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
      } else if (remaining.startsWith('ms')) {
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
    return createToken(number, 'literal', createPosition(startPos, pos));
  }

  getKeywordCount(): number {
    return this.profileKeywords.length;
  }

  getKeywordSet(): Set<string> {
    return new Set(this.profileKeywords.map(k => k.native));
  }
}

describe('Profile-Derived Korean Tokenizer Comparison', () => {
  let _originalTokenizer: OriginalKoreanTokenizer;
  let profileDerivedTokenizer: ProfileDerivedKoreanTokenizer;

  beforeAll(() => {
    _originalTokenizer = new OriginalKoreanTokenizer();
    profileDerivedTokenizer = new ProfileDerivedKoreanTokenizer();
  });

  describe('Keyword Coverage', () => {
    it('should have keywords from profile', () => {
      const profileDerivedKeywords = profileDerivedTokenizer.getKeywordSet();

      expect(profileDerivedKeywords.has('토글')).toBe(true);
      expect(profileDerivedKeywords.has('추가')).toBe(true);
      expect(profileDerivedKeywords.has('제거')).toBe(true);
      expect(profileDerivedKeywords.has('보이다')).toBe(true);
      expect(profileDerivedKeywords.has('숨기다')).toBe(true);
    });

    it('should have extras (events, positional, idioms)', () => {
      const profileDerivedKeywords = profileDerivedTokenizer.getKeywordSet();

      expect(profileDerivedKeywords.has('클릭')).toBe(true);
      expect(profileDerivedKeywords.has('변경')).toBe(true);
      expect(profileDerivedKeywords.has('첫번째')).toBe(true);
      expect(profileDerivedKeywords.has('마지막')).toBe(true);
      expect(profileDerivedKeywords.has('를토글')).toBe(true);
      expect(profileDerivedKeywords.has('을추가')).toBe(true);
    });

    it('should report keyword count', () => {
      const count = profileDerivedTokenizer.getKeywordCount();
      console.log(`Korean profile-derived keyword count: ${count}`);
      expect(count).toBeGreaterThan(50);
    });
  });

  describe('Basic Tokenization', () => {
    it('should tokenize simple toggle command', () => {
      const tokens = profileDerivedTokenizer.tokenize('토글 .active').tokens;
      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe('토글');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[1].value).toBe('.active');
      expect(tokens[1].kind).toBe('selector');
    });

    it('should tokenize wait with time unit', () => {
      const tokens = profileDerivedTokenizer.tokenize('3초 대기').tokens;
      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe('3s');
      expect(tokens[0].kind).toBe('literal');
      expect(tokens[1].value).toBe('대기');
      expect(tokens[1].kind).toBe('keyword');
    });

    it('should tokenize multiple selectors', () => {
      const tokens = profileDerivedTokenizer.tokenize('#button .active').tokens;
      expect(tokens.length).toBe(2);
      expect(tokens.every(t => t.kind === 'selector')).toBe(true);
    });

    it('should tokenize variable references', () => {
      const tokens = profileDerivedTokenizer.tokenize(':count 증가').tokens;
      expect(tokens.find(t => t.value === ':count')?.kind).toBe('identifier');
      expect(tokens.find(t => t.value === '증가')?.kind).toBe('keyword');
    });
  });

  describe('Keyword Recognition', () => {
    const keywordTests = [
      { input: '토글', expectedNormalized: 'toggle' },
      { input: '추가', expectedNormalized: 'add' },
      { input: '제거', expectedNormalized: 'remove' },
      { input: '보이다', expectedNormalized: 'show' },
      { input: '숨기다', expectedNormalized: 'hide' },
      { input: '증가', expectedNormalized: 'increment' },
      { input: '감소', expectedNormalized: 'decrement' },
    ];

    for (const { input, expectedNormalized } of keywordTests) {
      it(`should recognize "${input}" as keyword -> "${expectedNormalized}"`, () => {
        const tokens = profileDerivedTokenizer.tokenize(input).tokens;
        expect(tokens.length).toBe(1);
        expect(tokens[0].kind).toBe('keyword');
        expect(tokens[0].normalized).toBe(expectedNormalized);
      });
    }
  });

  describe('Mixed Script Handling', () => {
    it('should handle CSS selectors in Korean context', () => {
      const tokens = profileDerivedTokenizer.tokenize('#button .active').tokens;
      expect(tokens.length).toBe(2);
      expect(tokens[0].kind).toBe('selector');
      expect(tokens[1].kind).toBe('selector');
    });

    it('should handle string literals', () => {
      const tokens = profileDerivedTokenizer.tokenize('"테스트" 표시').tokens;
      expect(tokens.find(t => t.value === '"테스트"')?.kind).toBe('literal');
      expect(tokens.find(t => t.value === '표시')?.kind).toBe('keyword');
    });
  });

  describe('Time Units', () => {
    it('should parse Korean time units', () => {
      const cases = [
        { input: '3초', expected: '3s' },
        { input: '500밀리초', expected: '500ms' },
        { input: '2분', expected: '2m' },
        { input: '1시간', expected: '1h' },
      ];

      for (const { input, expected } of cases) {
        const tokens = profileDerivedTokenizer.tokenize(input).tokens;
        expect(tokens[0].value).toBe(expected);
        expect(tokens[0].kind).toBe('literal');
      }
    });
  });
});
