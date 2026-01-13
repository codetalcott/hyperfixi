/**
 * Arabic Morphological Normalizer
 *
 * Arabic uses a complex root-pattern morphology system where most words
 * are derived from triliteral (3-consonant) roots. This normalizer focuses
 * on prefix/suffix stripping rather than full root extraction.
 *
 * Key features:
 * - Definite article prefix: ال (al-)
 * - Conjunction/preposition prefixes: و (wa-), ف (fa-), ب (bi-), ل (li-), ك (ka-)
 * - Verb prefixes (present tense markers): ي (ya-), ت (ta-), ن (na-), أ (a-)
 * - Plural/gender suffixes: ون (ūn), ين (īn), ات (āt), ة (a)
 * - Pronoun suffixes: ها (hā), هم (hum), etc.
 * - Diacritics handling: Words with and without diacritics should match
 *
 * Examples:
 *   والتبديل → تبديل → بدّل (and the changing → changing → change!)
 *   يبدّل → بدّل (he changes → change!)
 *   المستخدمين → مستخدم (the users → user)
 */

import type { MorphologicalNormalizer, NormalizationResult, PrefixRule } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is Arabic.
 */
function isArabic(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0600 && code <= 0x06ff) || // Arabic
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0x08a0 && code <= 0x08ff) || // Arabic Extended-A
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff)
  ); // Arabic Presentation Forms-B
}

/**
 * Check if a word contains Arabic characters.
 */
function containsArabic(word: string): boolean {
  for (const char of word) {
    if (isArabic(char)) return true;
  }
  return false;
}

/**
 * Remove Arabic diacritics (tashkeel) from a word.
 * This helps match words regardless of vocalization marks.
 */
function removeDiacritics(word: string): string {
  // Arabic diacritics: fatha, kasra, damma, sukun, shadda, etc.
  return word.replace(/[\u064B-\u0652\u0670]/g, '');
}

/**
 * Prefix rules for Arabic, ordered by priority.
 * Combined prefixes should be checked first.
 */
const COMBINED_PREFIXES: readonly PrefixRule[] = [
  // Conjunction + article combinations (4 chars)
  { pattern: 'وال', confidencePenalty: 0.15, prefixType: 'conjunction' }, // wa + al
  { pattern: 'فال', confidencePenalty: 0.15, prefixType: 'conjunction' }, // fa + al
  { pattern: 'بال', confidencePenalty: 0.15, prefixType: 'preposition' }, // bi + al
  { pattern: 'كال', confidencePenalty: 0.15, prefixType: 'preposition' }, // ka + al
  { pattern: 'لل', confidencePenalty: 0.12, prefixType: 'preposition' }, // li + al (assimilation)
];

/**
 * Single prefix rules.
 * Note: Single-character prefixes require minimum 3-char remaining stem
 * to avoid over-stripping words where the character is part of the root.
 */
const SINGLE_PREFIXES: readonly PrefixRule[] = [
  // Definite article (2 chars) - can leave 2-char stem
  { pattern: 'ال', confidencePenalty: 0.08, prefixType: 'article', minRemaining: 2 },

  // Conjunctions and prepositions (1 char) - need longer stem to be safe
  { pattern: 'و', confidencePenalty: 0.08, prefixType: 'conjunction', minRemaining: 3 }, // wa- (and)
  { pattern: 'ف', confidencePenalty: 0.08, prefixType: 'conjunction', minRemaining: 3 }, // fa- (then/so)
  { pattern: 'ب', confidencePenalty: 0.1, prefixType: 'preposition', minRemaining: 3 }, // bi- (with/by)
  { pattern: 'ل', confidencePenalty: 0.1, prefixType: 'preposition', minRemaining: 3 }, // li- (to/for)
  { pattern: 'ك', confidencePenalty: 0.1, prefixType: 'preposition', minRemaining: 3 }, // ka- (like/as)
];

/**
 * Verb prefixes (present tense markers).
 * These are more tentative as they change verb meaning.
 * Require minimum 3-char remaining to avoid over-stripping.
 */
const VERB_PREFIXES: readonly PrefixRule[] = [
  { pattern: 'ي', confidencePenalty: 0.12, prefixType: 'verb-marker', minRemaining: 3 }, // ya- (he/it)
  { pattern: 'ت', confidencePenalty: 0.12, prefixType: 'verb-marker', minRemaining: 3 }, // ta- (she/you)
  { pattern: 'ن', confidencePenalty: 0.12, prefixType: 'verb-marker', minRemaining: 3 }, // na- (we)
  { pattern: 'أ', confidencePenalty: 0.12, prefixType: 'verb-marker', minRemaining: 3 }, // a- (I)
  { pattern: 'ا', confidencePenalty: 0.12, prefixType: 'verb-marker', minRemaining: 3 }, // a- without hamza
];

/**
 * Suffix rules for Arabic.
 */
const SUFFIXES: readonly { pattern: string; confidencePenalty: number; type: string }[] = [
  // Plural forms
  { pattern: 'ون', confidencePenalty: 0.1, type: 'masculine-plural' },
  { pattern: 'ين', confidencePenalty: 0.1, type: 'masculine-plural-accusative' },
  { pattern: 'ات', confidencePenalty: 0.1, type: 'feminine-plural' },
  // Dual forms
  { pattern: 'ان', confidencePenalty: 0.1, type: 'dual-nominative' },
  { pattern: 'ين', confidencePenalty: 0.1, type: 'dual-accusative' },
  // Pronoun suffixes
  { pattern: 'ها', confidencePenalty: 0.1, type: 'pronoun-her' },
  { pattern: 'هم', confidencePenalty: 0.1, type: 'pronoun-them' },
  { pattern: 'هن', confidencePenalty: 0.1, type: 'pronoun-them-f' },
  { pattern: 'نا', confidencePenalty: 0.1, type: 'pronoun-us' },
  { pattern: 'كم', confidencePenalty: 0.1, type: 'pronoun-you-pl' },
  { pattern: 'ك', confidencePenalty: 0.08, type: 'pronoun-you' },
  { pattern: 'ه', confidencePenalty: 0.08, type: 'pronoun-him' },
  { pattern: 'ي', confidencePenalty: 0.08, type: 'pronoun-me' },
  // Feminine marker
  { pattern: 'ة', confidencePenalty: 0.08, type: 'feminine' },
];

/**
 * Arabic morphological normalizer.
 */
export class ArabicMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'ar';

  /**
   * Check if a word might be an Arabic word that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (!containsArabic(word)) return false;
    // Arabic words are typically at least 2 characters
    if (word.length < 2) return false;
    return true;
  }

  /**
   * Normalize an Arabic word by stripping prefixes and suffixes.
   */
  normalize(word: string): NormalizationResult {
    // Remove diacritics for consistent matching
    let stem = removeDiacritics(word);
    let confidence = 1.0;
    const removedPrefixes: string[] = [];
    const removedSuffixes: string[] = [];

    // Try combined prefixes first (longest match)
    for (const rule of COMBINED_PREFIXES) {
      if (stem.startsWith(rule.pattern)) {
        const remaining = stem.slice(rule.pattern.length);
        // Must leave a meaningful stem (at least 2 characters)
        if (remaining.length >= 2) {
          stem = remaining;
          confidence -= rule.confidencePenalty;
          removedPrefixes.push(rule.pattern);
          break; // Only one combined prefix
        }
      }
    }

    // Try single prefixes (if no combined prefix was found)
    if (removedPrefixes.length === 0) {
      for (const rule of SINGLE_PREFIXES) {
        if (stem.startsWith(rule.pattern)) {
          const remaining = stem.slice(rule.pattern.length);
          const minLen = rule.minRemaining ?? 2;
          if (remaining.length >= minLen) {
            stem = remaining;
            confidence -= rule.confidencePenalty;
            removedPrefixes.push(rule.pattern);
            break; // Only one prefix at a time for now
          }
        }
      }
    }

    // Try verb prefixes ONLY for words that look like verbs (not nouns)
    // Skip if the word has noun-pattern suffixes or pronoun suffixes
    // This prevents stripping ت from تغييرات (changes) or تغييرها (her change)
    const looksLikeNoun =
      stem.endsWith('ات') ||
      stem.endsWith('ة') ||
      stem.endsWith('ون') ||
      stem.endsWith('ين') ||
      stem.endsWith('ها') ||
      stem.endsWith('هم') ||
      stem.endsWith('هن') ||
      stem.endsWith('نا') ||
      stem.endsWith('كم');
    if (
      !looksLikeNoun &&
      (removedPrefixes.length === 0 || removedPrefixes[0] === 'و' || removedPrefixes[0] === 'ف')
    ) {
      for (const rule of VERB_PREFIXES) {
        if (stem.startsWith(rule.pattern)) {
          const remaining = stem.slice(rule.pattern.length);
          const minLen = rule.minRemaining ?? 3;
          if (remaining.length >= minLen) {
            stem = remaining;
            confidence -= rule.confidencePenalty;
            removedPrefixes.push(rule.pattern);
            break;
          }
        }
      }
    }

    // Try suffixes (can apply multiple passes)
    for (const rule of SUFFIXES) {
      if (stem.endsWith(rule.pattern)) {
        const remaining = stem.slice(0, -rule.pattern.length);
        // Must leave a meaningful stem
        if (remaining.length >= 2) {
          stem = remaining;
          confidence -= rule.confidencePenalty;
          removedSuffixes.push(rule.pattern);
          // Don't break - some suffixes can be stacked
        }
      }
    }

    // Ensure confidence stays reasonable
    confidence = Math.max(0.5, confidence);

    // If nothing was stripped, return unchanged
    if (removedPrefixes.length === 0 && removedSuffixes.length === 0) {
      return noChange(word);
    }

    return normalized(stem, confidence, {
      removedPrefixes,
      removedSuffixes,
    });
  }
}

// Export singleton instance
export const arabicMorphologicalNormalizer = new ArabicMorphologicalNormalizer();
