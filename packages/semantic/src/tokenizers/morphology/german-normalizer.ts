/**
 * German Morphological Normalizer
 *
 * Reduces German verb conjugations to their infinitive forms.
 * German verbs have:
 * - Weak verbs (regular): machen → machte (past)
 * - Strong verbs (stem changes): fahren → fuhr (past)
 * - Mixed verbs: kennen → kannte
 * - Separable prefixes: an-, auf-, aus-, ein-, mit-, vor-, zu-
 *
 * Key features:
 * - Handles common conjugation endings
 * - Recognizes past participle ge- prefix
 * - Handles separable prefix verbs
 *
 * Examples:
 *   zeigt → zeigen (3rd person present)
 *   gemacht → machen (past participle)
 *   anzeigen → anzeigen (separable prefix verb)
 */

import type { MorphologicalNormalizer, NormalizationResult, ConjugationType } from './types';
import { noChange, normalized } from './types';

/**
 * Common separable prefixes in German.
 */
const SEPARABLE_PREFIXES = [
  'an',
  'auf',
  'aus',
  'ein',
  'mit',
  'vor',
  'zu',
  'ab',
  'bei',
  'nach',
  'weg',
  'um',
  'her',
  'hin',
];

/**
 * Check if a word looks like a German verb.
 */
function looksLikeGermanVerb(word: string): boolean {
  const lower = word.toLowerCase();
  // Check for infinitive ending
  if (lower.endsWith('en') || lower.endsWith('eln') || lower.endsWith('ern')) return true;
  // Check for past participle prefix ge-
  if (lower.startsWith('ge') && lower.endsWith('t')) return true;
  if (lower.startsWith('ge') && lower.endsWith('en')) return true;
  // Check for German-specific characters
  if (/[äöüß]/i.test(word)) return true;
  return false;
}

/**
 * Verb conjugation endings.
 * German infinitives end in -en (or -eln/-ern for some verbs).
 */
const VERB_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Present participle
  { ending: 'end', stem: 'en', confidence: 0.88, type: 'gerund' },

  // Present indicative (regular weak verbs)
  { ending: 'e', stem: 'en', confidence: 0.75, type: 'present' }, // ich
  { ending: 'st', stem: 'en', confidence: 0.8, type: 'present' }, // du
  { ending: 't', stem: 'en', confidence: 0.78, type: 'present' }, // er/sie/es, ihr
  { ending: 'en', stem: 'en', confidence: 0.85, type: 'dictionary' }, // wir/sie/Sie, infinitive

  // Past tense (weak verbs: -te, -test, -te, -ten, -tet, -ten)
  { ending: 'test', stem: 'en', confidence: 0.85, type: 'past' }, // du
  { ending: 'ten', stem: 'en', confidence: 0.82, type: 'past' }, // wir/sie/Sie
  { ending: 'tet', stem: 'en', confidence: 0.85, type: 'past' }, // ihr
  { ending: 'te', stem: 'en', confidence: 0.82, type: 'past' }, // ich/er/sie/es

  // Subjunctive II (weak verbs)
  { ending: 'test', stem: 'en', confidence: 0.8, type: 'subjunctive' },
  { ending: 'ten', stem: 'en', confidence: 0.78, type: 'subjunctive' },
  { ending: 'tet', stem: 'en', confidence: 0.8, type: 'subjunctive' },
  { ending: 'te', stem: 'en', confidence: 0.78, type: 'subjunctive' },

  // Imperative
  { ending: 'e', stem: 'en', confidence: 0.72, type: 'imperative' }, // du (informal singular)
  { ending: 't', stem: 'en', confidence: 0.72, type: 'imperative' }, // ihr (informal plural)
  { ending: 'en', stem: 'en', confidence: 0.75, type: 'imperative' }, // Sie (formal)
];

/**
 * -eln and -ern verb endings (sammeln, wandern).
 */
const ELN_ERN_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Present
  { ending: 'le', stem: 'eln', confidence: 0.82, type: 'present' }, // ich sammle
  { ending: 'elst', stem: 'eln', confidence: 0.85, type: 'present' }, // du sammelst
  { ending: 'elt', stem: 'eln', confidence: 0.85, type: 'present' }, // er/sie/es sammelt
  { ending: 'eln', stem: 'eln', confidence: 0.88, type: 'dictionary' }, // infinitive

  { ending: 're', stem: 'ern', confidence: 0.82, type: 'present' }, // ich wandre
  { ending: 'erst', stem: 'ern', confidence: 0.85, type: 'present' }, // du wanderst
  { ending: 'ert', stem: 'ern', confidence: 0.85, type: 'present' }, // er/sie/es wandert
  { ending: 'ern', stem: 'ern', confidence: 0.88, type: 'dictionary' }, // infinitive
];

/**
 * All endings combined, sorted by length (longest first).
 */
const ALL_ENDINGS = [...VERB_ENDINGS, ...ELN_ERN_ENDINGS].sort(
  (a, b) => b.ending.length - a.ending.length
);

/**
 * German morphological normalizer.
 */
export class GermanMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'de';

  /**
   * Check if a word might be a German verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return looksLikeGermanVerb(word);
  }

  /**
   * Normalize a German word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if this is already an infinitive (no change needed)
    if (lower.endsWith('en') && lower.length >= 4) {
      return noChange(word);
    }
    if ((lower.endsWith('eln') || lower.endsWith('ern')) && lower.length >= 5) {
      return noChange(word);
    }

    // Try past participle normalization (ge-...-t or ge-...-en)
    const participleResult = this.tryParticipleNormalization(lower);
    if (participleResult) return participleResult;

    // Try standard conjugation normalization
    const conjugationResult = this.tryConjugationNormalization(lower);
    if (conjugationResult) return conjugationResult;

    // No normalization needed
    return noChange(word);
  }

  /**
   * Try to normalize a past participle.
   * German past participles often have ge- prefix and -t or -en suffix.
   *
   * Examples:
   *   gemacht → machen (weak verb)
   *   gegangen → gehen (strong verb)
   *   angemacht → anmachen (separable prefix)
   */
  private tryParticipleNormalization(word: string): NormalizationResult | null {
    // Check for separable prefix verbs first (e.g., "angemacht" → "anmachen")
    for (const prefix of SEPARABLE_PREFIXES) {
      if (word.startsWith(prefix + 'ge')) {
        const afterPrefix = word.slice(prefix.length);
        const innerResult = this.trySimpleParticipleNormalization(afterPrefix);
        if (innerResult) {
          const metadata: {
            removedPrefixes: string[];
            removedSuffixes?: readonly string[];
            conjugationType: 'participle';
          } = {
            removedPrefixes: ['ge'],
            conjugationType: 'participle',
          };
          if (innerResult.metadata?.removedSuffixes) {
            metadata.removedSuffixes = innerResult.metadata.removedSuffixes;
          }
          return normalized(prefix + innerResult.stem, innerResult.confidence * 0.95, metadata);
        }
      }
    }

    // Try simple ge- prefix participle
    return this.trySimpleParticipleNormalization(word);
  }

  /**
   * Try to normalize a simple ge-...-t or ge-...-en participle.
   */
  private trySimpleParticipleNormalization(word: string): NormalizationResult | null {
    if (!word.startsWith('ge')) return null;

    const withoutGe = word.slice(2);

    // Weak verb participle: ge-...-t → ...-en
    if (withoutGe.endsWith('t') && withoutGe.length >= 3) {
      const stem = withoutGe.slice(0, -1);
      return normalized(stem + 'en', 0.85, {
        removedPrefixes: ['ge'],
        removedSuffixes: ['t'],
        conjugationType: 'participle',
      });
    }

    // Strong verb participle: ge-...-en → ...-en (same ending)
    if (withoutGe.endsWith('en') && withoutGe.length >= 4) {
      return normalized(withoutGe, 0.82, {
        removedPrefixes: ['ge'],
        conjugationType: 'participle',
      });
    }

    return null;
  }

  /**
   * Try to normalize a conjugated verb to its infinitive.
   */
  private tryConjugationNormalization(word: string): NormalizationResult | null {
    for (const rule of ALL_ENDINGS) {
      if (word.endsWith(rule.ending)) {
        const stemBase = word.slice(0, -rule.ending.length);

        // Must have a meaningful stem (at least 2 characters)
        if (stemBase.length < 2) continue;

        // Reconstruct infinitive
        const infinitive = stemBase + rule.stem;

        return normalized(infinitive, rule.confidence, {
          removedSuffixes: [rule.ending],
          conjugationType: rule.type,
        });
      }
    }

    return null;
  }
}

// Export singleton instance
export const germanMorphologicalNormalizer = new GermanMorphologicalNormalizer();
