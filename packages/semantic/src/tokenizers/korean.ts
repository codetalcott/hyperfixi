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

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { KoreanMorphologicalNormalizer } from './morphology/korean-normalizer';
import { koreanProfile } from '../generators/profiles/korean';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { KoreanKeywordExtractor } from './extractors/korean-keyword';
import { KoreanParticleExtractor } from './extractors/korean-particle';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// Character classification functions moved to extractors/korean-keyword.ts

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

// Particle constants and metadata moved to extractors/korean-particle.ts
// Temporal event suffixes moved to extractors/korean-keyword.ts

// =============================================================================
// Korean Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Alternative reference forms
 * - Conditional event forms (temporal markers)
 * - Time units
 *
 * Note: Attached particle+verb forms (를토글, 을토글, etc.) are intentionally NOT included
 * because they would cause ambiguous parsing. The separate particle + verb pattern
 * (를 + 토글) is preferred for consistent semantic analysis.
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
  // The i18n dict emits 마우스다운/마우스업 for mousedown/mouseup (repeat-until-event);
  // recognize them so the event types as a literal, not a bare expression.
  { native: '마우스다운', normalized: 'mousedown' },
  { native: '마우스업', normalized: 'mouseup' },

  // References (additional forms not in profile)
  { native: '내', normalized: 'my' },
  { native: '그것의', normalized: 'its' },

  // Then/conjunction (clause chaining)
  { native: '그다음', normalized: 'then' },
  { native: '그런후', normalized: 'then' },
  { native: '그러면', normalized: 'then' },

  // Logical
  { native: '그리고', normalized: 'and' },
  { native: '또는', normalized: 'or' },
  { native: '아니', normalized: 'not' },
  { native: '이다', normalized: 'is' },

  // Time units
  { native: '초', normalized: 's' },
  { native: '밀리초', normalized: 'ms' },
  { native: '분', normalized: 'm' },
  { native: '시간', normalized: 'h' },
];

// Korean time units moved to generic-extractors.ts (NumberExtractor handles them)

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

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers (includes Korean time units)
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (counter, click, etc.)
    this.registerExtractor(new KoreanParticleExtractor()); // Particles with vowel harmony metadata
    this.registerExtractor(new KoreanKeywordExtractor()); // Korean keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    if (PARTICLES.has(token)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    // Check URLs before selectors (./path vs .class)
    if (
      token.startsWith('/') ||
      token.startsWith('./') ||
      token.startsWith('../') ||
      token.startsWith('http')
    )
      return 'url';
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

    return 'identifier';
  }

  // extractKoreanWord(), extractAsciiWord(), extractKoreanNumber(), and trySplitTemporalSuffix() methods removed
  // Now handled by KoreanKeywordExtractor and NumberExtractor
}

/**
 * Singleton instance.
 */
export const koreanTokenizer = new KoreanTokenizer();
