/**
 * Korean Morphological Normalizer
 *
 * Reduces Korean verb conjugations to their stem forms.
 * Korean verbs conjugate by modifying their endings:
 *
 * Base: 토글 (togeul) - "toggle" (loanword)
 * 다 ending: 토글하다 (togeul-hada) - "to toggle" (dictionary form)
 * 요 ending: 토글해요 (togeul-haeyo) - polite present
 * 니다 ending: 토글합니다 (togeul-hamnida) - formal present
 * 세요 ending: 토글하세요 (togeul-haseyo) - honorific request
 * 았/었 past: 토글했어 (togeul-haesseo) - informal past
 *
 * Korean also has vowel harmony affecting suffix forms.
 *
 * This normalizer strips these suffixes to find the stem,
 * which can then be matched against keyword dictionaries.
 */

import type {
  MorphologicalNormalizer,
  NormalizationResult,
  SuffixRule,
  ConjugationType,
} from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is a Korean syllable block (Hangul).
 * Korean syllables are in the range U+AC00 to U+D7A3.
 */
function isHangul(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * Check if a word contains Korean characters.
 */
function containsKorean(word: string): boolean {
  for (const char of word) {
    if (isHangul(char)) return true;
  }
  return false;
}

/**
 * Suffix rules for Korean verb conjugation.
 * Ordered by length (longest first) to ensure greedy matching.
 */
const KOREAN_SUFFIX_RULES: readonly SuffixRule[] = [
  // Honorific conditional/temporal forms (-시- infix)
  // These are critical for polite/formal Korean
  { pattern: '하시니까', confidence: 0.85, conjugationType: 'honorific-causal', minStemLength: 1 },
  { pattern: '하실때', confidence: 0.88, conjugationType: 'honorific-temporal', minStemLength: 1 },
  { pattern: '하실 때', confidence: 0.88, conjugationType: 'honorific-temporal', minStemLength: 1 },
  {
    pattern: '하시면',
    confidence: 0.88,
    conjugationType: 'honorific-conditional',
    minStemLength: 1,
  },
  {
    pattern: '으시면',
    confidence: 0.85,
    conjugationType: 'honorific-conditional',
    minStemLength: 2,
  },
  { pattern: '시면', confidence: 0.82, conjugationType: 'honorific-conditional', minStemLength: 2 },

  // Sequential/temporal forms - "after doing", "before doing", "as soon as"
  { pattern: '하고나서', confidence: 0.85, conjugationType: 'sequential-after', minStemLength: 1 },
  { pattern: '하고 나서', confidence: 0.85, conjugationType: 'sequential-after', minStemLength: 1 },
  { pattern: '하고서', confidence: 0.85, conjugationType: 'sequential-after', minStemLength: 1 },
  { pattern: '고나서', confidence: 0.82, conjugationType: 'sequential-after', minStemLength: 2 },
  { pattern: '고 나서', confidence: 0.82, conjugationType: 'sequential-after', minStemLength: 2 },
  { pattern: '고서', confidence: 0.82, conjugationType: 'sequential-after', minStemLength: 2 },
  { pattern: '하기전에', confidence: 0.85, conjugationType: 'sequential-before', minStemLength: 1 },
  {
    pattern: '하기 전에',
    confidence: 0.85,
    conjugationType: 'sequential-before',
    minStemLength: 1,
  },
  { pattern: '기전에', confidence: 0.82, conjugationType: 'sequential-before', minStemLength: 2 },
  { pattern: '기 전에', confidence: 0.82, conjugationType: 'sequential-before', minStemLength: 2 },
  { pattern: '하자마자', confidence: 0.88, conjugationType: 'immediate', minStemLength: 1 },
  { pattern: '자마자', confidence: 0.85, conjugationType: 'immediate', minStemLength: 2 },

  // Obligation forms - "must do", "should do"
  { pattern: '해야해요', confidence: 0.85, conjugationType: 'obligation', minStemLength: 1 },
  { pattern: '해야해', confidence: 0.85, conjugationType: 'obligation', minStemLength: 1 },
  { pattern: '해야하다', confidence: 0.85, conjugationType: 'obligation', minStemLength: 1 },
  { pattern: '어야해요', confidence: 0.82, conjugationType: 'obligation', minStemLength: 2 },
  { pattern: '어야해', confidence: 0.82, conjugationType: 'obligation', minStemLength: 2 },
  { pattern: '아야해요', confidence: 0.82, conjugationType: 'obligation', minStemLength: 2 },
  { pattern: '아야해', confidence: 0.82, conjugationType: 'obligation', minStemLength: 2 },

  // Conditional forms - most natural for event handlers (longest first)
  // These are critical for native Korean idioms like "클릭하면 증가"
  { pattern: '하니까', confidence: 0.85, conjugationType: 'causal-nikka', minStemLength: 1 },
  { pattern: '할때', confidence: 0.88, conjugationType: 'temporal-ttae', minStemLength: 1 },
  { pattern: '할 때', confidence: 0.88, conjugationType: 'temporal-ttae', minStemLength: 1 },
  { pattern: '을때', confidence: 0.85, conjugationType: 'temporal-ttae', minStemLength: 2 },
  { pattern: '을 때', confidence: 0.85, conjugationType: 'temporal-ttae', minStemLength: 2 },
  { pattern: '하면', confidence: 0.88, conjugationType: 'conditional-myeon', minStemLength: 1 },
  { pattern: '으면', confidence: 0.85, conjugationType: 'conditional-myeon', minStemLength: 2 },
  { pattern: '니까', confidence: 0.82, conjugationType: 'causal-nikka', minStemLength: 2 },
  { pattern: '면', confidence: 0.8, conjugationType: 'conditional-myeon', minStemLength: 2 },

  // Formal polite forms (longest first)
  { pattern: '하였습니다', confidence: 0.85, conjugationType: 'past', minStemLength: 1 },
  { pattern: '했습니다', confidence: 0.85, conjugationType: 'past', minStemLength: 1 },
  { pattern: '합니다', confidence: 0.85, conjugationType: 'polite', minStemLength: 1 },
  { pattern: '습니다', confidence: 0.82, conjugationType: 'polite', minStemLength: 2 },
  { pattern: '됩니다', confidence: 0.82, conjugationType: 'polite', minStemLength: 1 },
  { pattern: 'ㅂ니다', confidence: 0.82, conjugationType: 'polite', minStemLength: 2 },

  // Honorific request forms
  { pattern: '하세요', confidence: 0.85, conjugationType: 'honorific', minStemLength: 1 },
  { pattern: '하십시오', confidence: 0.85, conjugationType: 'honorific', minStemLength: 1 },
  { pattern: '세요', confidence: 0.82, conjugationType: 'honorific', minStemLength: 2 },
  { pattern: '십시오', confidence: 0.82, conjugationType: 'honorific', minStemLength: 2 },

  // Informal polite (요) forms
  { pattern: '하고있어요', confidence: 0.82, conjugationType: 'progressive', minStemLength: 1 },
  { pattern: '하고있어', confidence: 0.82, conjugationType: 'progressive', minStemLength: 1 },
  { pattern: '했어요', confidence: 0.85, conjugationType: 'past', minStemLength: 1 },
  { pattern: '해요', confidence: 0.85, conjugationType: 'polite', minStemLength: 1 },
  { pattern: '어요', confidence: 0.82, conjugationType: 'polite', minStemLength: 2 },
  { pattern: '아요', confidence: 0.82, conjugationType: 'polite', minStemLength: 2 },

  // Informal (반말) forms
  { pattern: '했어', confidence: 0.85, conjugationType: 'past', minStemLength: 1 },
  { pattern: '해', confidence: 0.8, conjugationType: 'present', minStemLength: 1 },
  { pattern: '었어', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: '았어', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },

  // Progressive forms
  { pattern: '하고있다', confidence: 0.82, conjugationType: 'progressive', minStemLength: 1 },
  { pattern: '고있다', confidence: 0.8, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: '고있어', confidence: 0.8, conjugationType: 'progressive', minStemLength: 2 },

  // Dictionary/infinitive form (하다 verbs)
  { pattern: '하다', confidence: 0.88, conjugationType: 'dictionary', minStemLength: 1 },

  // Negative forms
  { pattern: '하지않다', confidence: 0.82, conjugationType: 'negative', minStemLength: 1 },
  { pattern: '안하다', confidence: 0.82, conjugationType: 'negative', minStemLength: 1 },
  { pattern: '지않다', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },

  // Imperative forms
  { pattern: '해라', confidence: 0.82, conjugationType: 'imperative', minStemLength: 1 },
  { pattern: '하라', confidence: 0.82, conjugationType: 'imperative', minStemLength: 1 },

  // Generic verb endings (lower confidence)
  { pattern: '다', confidence: 0.75, conjugationType: 'dictionary', minStemLength: 2 },
];

/**
 * 하다 verb pattern - very common pattern in Korean.
 * Noun + 하다 forms a verb.
 * e.g., 토글 + 하다 = 토글하다 (to toggle)
 */
const HADA_PATTERNS: readonly {
  pattern: string;
  confidence: number;
  conjugationType: ConjugationType;
}[] = [
  // Honorific forms (-시- infix) - polite/formal Korean
  // 클릭하시면 → 클릭 (if you click - honorific)
  { pattern: '하시니까', confidence: 0.88, conjugationType: 'honorific-causal' },
  { pattern: '하실때', confidence: 0.88, conjugationType: 'honorific-temporal' },
  { pattern: '하실 때', confidence: 0.88, conjugationType: 'honorific-temporal' },
  { pattern: '하시면', confidence: 0.88, conjugationType: 'honorific-conditional' },
  { pattern: '하셨어요', confidence: 0.85, conjugationType: 'honorific-past' },
  { pattern: '하셨어', confidence: 0.85, conjugationType: 'honorific-past' },
  { pattern: '하십니다', confidence: 0.85, conjugationType: 'honorific-polite' },

  // Sequential/temporal forms - "after doing", "before doing", "as soon as"
  { pattern: '하고나서', confidence: 0.88, conjugationType: 'sequential-after' },
  { pattern: '하고 나서', confidence: 0.88, conjugationType: 'sequential-after' },
  { pattern: '하고서', confidence: 0.88, conjugationType: 'sequential-after' },
  { pattern: '하기전에', confidence: 0.88, conjugationType: 'sequential-before' },
  { pattern: '하기 전에', confidence: 0.88, conjugationType: 'sequential-before' },
  { pattern: '하자마자', confidence: 0.88, conjugationType: 'immediate' },

  // Obligation forms - "must do", "should do"
  { pattern: '해야해요', confidence: 0.88, conjugationType: 'obligation' },
  { pattern: '해야해', confidence: 0.88, conjugationType: 'obligation' },
  { pattern: '해야하다', confidence: 0.88, conjugationType: 'obligation' },

  // Conditional forms - most natural for event handlers (highest priority)
  // 클릭하면 → 클릭 (if clicked)
  { pattern: '하니까', confidence: 0.88, conjugationType: 'causal-nikka' },
  { pattern: '할때', confidence: 0.88, conjugationType: 'temporal-ttae' },
  { pattern: '할 때', confidence: 0.88, conjugationType: 'temporal-ttae' },
  { pattern: '하면', confidence: 0.88, conjugationType: 'conditional-myeon' },

  // Formal
  { pattern: '하였습니다', confidence: 0.85, conjugationType: 'past' },
  { pattern: '했습니다', confidence: 0.85, conjugationType: 'past' },
  { pattern: '합니다', confidence: 0.85, conjugationType: 'polite' },
  { pattern: '하십시오', confidence: 0.85, conjugationType: 'honorific' },
  { pattern: '하세요', confidence: 0.85, conjugationType: 'honorific' },
  // Informal polite
  { pattern: '했어요', confidence: 0.85, conjugationType: 'past' },
  { pattern: '해요', confidence: 0.85, conjugationType: 'polite' },
  // Informal
  { pattern: '했어', confidence: 0.85, conjugationType: 'past' },
  { pattern: '해', confidence: 0.8, conjugationType: 'present' },
  // Progressive
  { pattern: '하고있어요', confidence: 0.82, conjugationType: 'progressive' },
  { pattern: '하고있어', confidence: 0.82, conjugationType: 'progressive' },
  { pattern: '하고있다', confidence: 0.82, conjugationType: 'progressive' },
  // Connective forms (해서 = because/so, 하고 = and)
  { pattern: '해서', confidence: 0.82, conjugationType: 'connective' },
  { pattern: '하고', confidence: 0.8, conjugationType: 'connective' },
  // Negative
  { pattern: '하지않아요', confidence: 0.82, conjugationType: 'negative' },
  { pattern: '하지않다', confidence: 0.82, conjugationType: 'negative' },
  { pattern: '안해요', confidence: 0.82, conjugationType: 'negative' },
  { pattern: '안해', confidence: 0.82, conjugationType: 'negative' },
  // Imperative
  { pattern: '해라', confidence: 0.82, conjugationType: 'imperative' },
  { pattern: '하라', confidence: 0.82, conjugationType: 'imperative' },
  // Dictionary form
  { pattern: '하다', confidence: 0.88, conjugationType: 'dictionary' },
];

/**
 * Korean morphological normalizer.
 */
export class KoreanMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'ko';

  /**
   * Check if a word might be a Korean verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    // Must contain Korean characters
    if (!containsKorean(word)) return false;

    // Must be at least 2 characters
    if (word.length < 2) return false;

    return true;
  }

  /**
   * Normalize a Korean word to its stem form.
   */
  normalize(word: string): NormalizationResult {
    // Check for 하다 verb patterns first (most common verb type)
    const hadaResult = this.tryHadaNormalization(word);
    if (hadaResult) return hadaResult;

    // Try general suffix rules
    for (const rule of KOREAN_SUFFIX_RULES) {
      if (word.endsWith(rule.pattern)) {
        const stem = word.slice(0, -rule.pattern.length);

        // Validate stem length
        const minLength = rule.minStemLength ?? 2;
        if (stem.length < minLength) continue;

        const metadata: {
          removedSuffixes: string[];
          conjugationType?: typeof rule.conjugationType;
        } = {
          removedSuffixes: [rule.pattern],
        };
        if (rule.conjugationType) {
          metadata.conjugationType = rule.conjugationType;
        }
        return normalized(stem, rule.confidence, metadata);
      }
    }

    // No normalization needed
    return noChange(word);
  }

  /**
   * Try to normalize a 하다 verb.
   * 하다 verbs are formed by noun + 하다, very common in Korean.
   */
  private tryHadaNormalization(word: string): NormalizationResult | null {
    for (const pattern of HADA_PATTERNS) {
      if (word.endsWith(pattern.pattern)) {
        const stem = word.slice(0, -pattern.pattern.length);

        // 하다 verbs need at least one character for the noun part
        if (stem.length < 1) continue;

        // Return the noun part (without 하다 conjugation)
        return normalized(stem, pattern.confidence, {
          removedSuffixes: [pattern.pattern],
          conjugationType: pattern.conjugationType,
          originalForm: 'hada-verb',
        });
      }
    }
    return null;
  }
}

// Export singleton instance
export const koreanMorphologicalNormalizer = new KoreanMorphologicalNormalizer();
