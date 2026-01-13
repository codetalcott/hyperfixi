/**
 * Japanese Morphological Normalizer
 *
 * Reduces Japanese verb conjugations to their stem forms.
 * Japanese verbs conjugate by modifying their endings:
 *
 * Base: 切り替え (kiri-kae) - "toggle"
 * て-form: 切り替えて (kiri-kaete) - "toggle and..."
 * た-form: 切り替えた (kiri-kaeta) - "toggled" (past)
 * ます-form: 切り替えます (kiri-kaemasu) - polite present
 * ている: 切り替えている (kiri-kaeteiru) - "is toggling" (progressive)
 * ない: 切り替えない (kiri-kaenai) - "don't toggle" (negative)
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
 * Suffix rules for Japanese verb conjugation.
 * Ordered by length (longest first) to ensure greedy matching.
 */
const JAPANESE_SUFFIX_RULES: readonly SuffixRule[] = [
  // Conditional forms - very common for event handlers (longest first)
  // したら/すると/すれば are する verb conditionals
  { pattern: 'したら', confidence: 0.88, conjugationType: 'conditional-tara', minStemLength: 2 },
  { pattern: 'すると', confidence: 0.88, conjugationType: 'conditional-to', minStemLength: 2 },
  { pattern: 'すれば', confidence: 0.85, conjugationType: 'conditional-ba', minStemLength: 2 },
  // たら/れば are regular verb conditionals
  { pattern: 'たら', confidence: 0.85, conjugationType: 'conditional-tara', minStemLength: 2 },
  { pattern: 'れば', confidence: 0.82, conjugationType: 'conditional-ba', minStemLength: 2 },

  // Compound forms (longest first)
  { pattern: 'ていました', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'ています', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'てください', confidence: 0.85, conjugationType: 'request', minStemLength: 2 },
  { pattern: 'でください', confidence: 0.85, conjugationType: 'request', minStemLength: 2 },
  { pattern: 'ている', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ておく', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'てみる', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'てある', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },

  // Casual request forms
  { pattern: 'てくれ', confidence: 0.8, conjugationType: 'casual-request', minStemLength: 2 },
  { pattern: 'でくれ', confidence: 0.8, conjugationType: 'casual-request', minStemLength: 2 },

  // Contracted/colloquial forms (ちゃう/じゃう = てしまう/でしまう)
  { pattern: 'ちゃった', confidence: 0.82, conjugationType: 'contracted-past', minStemLength: 2 },
  { pattern: 'じゃった', confidence: 0.82, conjugationType: 'contracted-past', minStemLength: 2 },
  { pattern: 'ちゃう', confidence: 0.82, conjugationType: 'contracted', minStemLength: 2 },
  { pattern: 'じゃう', confidence: 0.82, conjugationType: 'contracted', minStemLength: 2 },

  // Polite forms
  { pattern: 'ました', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'ません', confidence: 0.85, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'ます', confidence: 0.85, conjugationType: 'polite', minStemLength: 2 },

  // て/た forms (very common)
  { pattern: 'て', confidence: 0.85, conjugationType: 'te-form', minStemLength: 2 },
  { pattern: 'た', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },

  // Negative forms
  { pattern: 'ない', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'なかった', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },

  // Potential forms
  { pattern: 'られる', confidence: 0.8, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'れる', confidence: 0.78, conjugationType: 'potential', minStemLength: 2 },

  // Passive forms
  { pattern: 'られた', confidence: 0.8, conjugationType: 'passive', minStemLength: 2 },

  // Causative forms
  { pattern: 'させる', confidence: 0.8, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'せる', confidence: 0.78, conjugationType: 'causative', minStemLength: 2 },

  // Volitional forms
  { pattern: 'よう', confidence: 0.8, conjugationType: 'volitional', minStemLength: 2 },

  // Dictionary form ending (る-verbs) - lower confidence due to ambiguity
  { pattern: 'る', confidence: 0.75, conjugationType: 'dictionary', minStemLength: 3 },
];

/**
 * Special する verb patterns.
 * する verbs are formed by noun + する, very common in Japanese.
 * Order by length (longest first) for greedy matching.
 */
const SURU_PATTERNS: readonly {
  pattern: string;
  confidence: number;
  conjugationType: ConjugationType;
}[] = [
  // Conditional forms (most important for native idioms)
  { pattern: 'したら', confidence: 0.88, conjugationType: 'conditional-tara' },
  { pattern: 'すると', confidence: 0.88, conjugationType: 'conditional-to' },
  { pattern: 'すれば', confidence: 0.85, conjugationType: 'conditional-ba' },
  // Progressive forms
  { pattern: 'しています', confidence: 0.85, conjugationType: 'progressive' },
  { pattern: 'している', confidence: 0.85, conjugationType: 'progressive' },
  // Other forms
  { pattern: 'しました', confidence: 0.85, conjugationType: 'past' },
  { pattern: 'します', confidence: 0.85, conjugationType: 'polite' },
  { pattern: 'しない', confidence: 0.82, conjugationType: 'negative' },
  { pattern: 'して', confidence: 0.85, conjugationType: 'te-form' },
  { pattern: 'した', confidence: 0.85, conjugationType: 'past' },
  { pattern: 'する', confidence: 0.88, conjugationType: 'dictionary' },
];

/**
 * Check if a character is hiragana.
 */
function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
}

/**
 * Check if a character is katakana.
 */
function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff;
}

/**
 * Check if a character is kanji.
 */
function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

/**
 * Check if a word contains Japanese characters.
 */
function containsJapanese(word: string): boolean {
  for (const char of word) {
    if (isHiragana(char) || isKatakana(char) || isKanji(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Japanese morphological normalizer.
 */
export class JapaneseMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'ja';

  /**
   * Check if a word might be a Japanese verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    // Must contain Japanese characters
    if (!containsJapanese(word)) return false;

    // Must be at least 2 characters
    if (word.length < 2) return false;

    // Check if it ends with a hiragana character (verbs typically do)
    const lastChar = word[word.length - 1];
    return isHiragana(lastChar);
  }

  /**
   * Normalize a Japanese word to its stem form.
   */
  normalize(word: string): NormalizationResult {
    // Check for する verb patterns first (most common compound verbs)
    const suruResult = this.trySuruNormalization(word);
    if (suruResult) return suruResult;

    // Try suffix rules
    for (const rule of JAPANESE_SUFFIX_RULES) {
      if (word.endsWith(rule.pattern)) {
        const stem = word.slice(0, -rule.pattern.length);

        // Validate stem length
        const minLength = rule.minStemLength ?? 2;
        if (stem.length < minLength) continue;

        // Return normalized result
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
   * Try to normalize a する verb.
   */
  private trySuruNormalization(word: string): NormalizationResult | null {
    for (const pattern of SURU_PATTERNS) {
      if (word.endsWith(pattern.pattern)) {
        const stem = word.slice(0, -pattern.pattern.length);

        // する verbs need at least one character for the noun part
        if (stem.length < 1) continue;

        // Return the noun part (without する)
        return normalized(stem, pattern.confidence, {
          removedSuffixes: [pattern.pattern],
          conjugationType: pattern.conjugationType,
          originalForm: 'suru-verb',
        });
      }
    }
    return null;
  }
}

// Export singleton instance
export const japaneseMorphologicalNormalizer = new JapaneseMorphologicalNormalizer();
