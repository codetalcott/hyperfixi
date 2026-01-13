/**
 * French Morphological Normalizer
 *
 * Reduces French verb conjugations to their infinitive forms.
 * French has three verb conjugation groups:
 * - 1st group: -er verbs (parler, montrer, afficher)
 * - 2nd group: -ir verbs with -iss- forms (finir, choisir)
 * - 3rd group: irregular -ir, -re, -oir verbs (partir, prendre, voir)
 *
 * Key features:
 * - Reflexive verb handling: se montrer → montrer
 * - Regular conjugation patterns for all three groups
 * - Past participle (-é, -i, -u) and present participle (-ant) forms
 *
 * Examples:
 *   affiche → afficher (3rd person present)
 *   montrant → montrer (present participle)
 *   caché → cacher (past participle)
 *   finissons → finir (1st person plural present)
 */

import type { MorphologicalNormalizer, NormalizationResult, ConjugationType } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a word looks like a French verb.
 */
function looksLikeFrenchVerb(word: string): boolean {
  const lower = word.toLowerCase();
  // Check for infinitive endings
  if (lower.endsWith('er') || lower.endsWith('ir') || lower.endsWith('re')) return true;
  // Check for common conjugation endings
  if (lower.endsWith('ant')) return true; // present participle
  if (lower.endsWith('é') || lower.endsWith('i') || lower.endsWith('u')) return true; // past participles
  // Check for French-specific characters
  if (/[àâäéèêëïîôùûüÿçœæ]/i.test(word)) return true;
  return false;
}

/**
 * Reflexive pronouns that attach to verbs in imperative form.
 */
const REFLEXIVE_SUFFIXES = ['toi', 'vous', 'nous'];

/**
 * -ER verb conjugation endings (1st group - largest group).
 */
const ER_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Present participle
  { ending: 'ant', stem: 'er', confidence: 0.88, type: 'gerund' },
  // Past participle
  { ending: 'é', stem: 'er', confidence: 0.88, type: 'participle' },
  { ending: 'ée', stem: 'er', confidence: 0.88, type: 'participle' },
  { ending: 'és', stem: 'er', confidence: 0.88, type: 'participle' },
  { ending: 'ées', stem: 'er', confidence: 0.88, type: 'participle' },
  // Present indicative
  { ending: 'e', stem: 'er', confidence: 0.75, type: 'present' }, // je/il/elle
  { ending: 'es', stem: 'er', confidence: 0.78, type: 'present' }, // tu
  { ending: 'ons', stem: 'er', confidence: 0.85, type: 'present' }, // nous
  { ending: 'ez', stem: 'er', confidence: 0.85, type: 'present' }, // vous
  { ending: 'ent', stem: 'er', confidence: 0.82, type: 'present' }, // ils/elles
  // Imperfect
  { ending: 'ais', stem: 'er', confidence: 0.82, type: 'past' }, // je/tu
  { ending: 'ait', stem: 'er', confidence: 0.82, type: 'past' }, // il/elle
  { ending: 'ions', stem: 'er', confidence: 0.85, type: 'past' }, // nous
  { ending: 'iez', stem: 'er', confidence: 0.85, type: 'past' }, // vous
  { ending: 'aient', stem: 'er', confidence: 0.85, type: 'past' }, // ils/elles
  // Simple past (passé simple)
  { ending: 'ai', stem: 'er', confidence: 0.8, type: 'past' }, // je
  { ending: 'as', stem: 'er', confidence: 0.78, type: 'past' }, // tu
  { ending: 'a', stem: 'er', confidence: 0.75, type: 'past' }, // il/elle
  { ending: 'âmes', stem: 'er', confidence: 0.88, type: 'past' }, // nous
  { ending: 'âtes', stem: 'er', confidence: 0.88, type: 'past' }, // vous
  { ending: 'èrent', stem: 'er', confidence: 0.88, type: 'past' }, // ils/elles
  // Future
  { ending: 'erai', stem: 'er', confidence: 0.85, type: 'future' }, // je
  { ending: 'eras', stem: 'er', confidence: 0.85, type: 'future' }, // tu
  { ending: 'era', stem: 'er', confidence: 0.82, type: 'future' }, // il/elle
  { ending: 'erons', stem: 'er', confidence: 0.88, type: 'future' }, // nous
  { ending: 'erez', stem: 'er', confidence: 0.88, type: 'future' }, // vous
  { ending: 'eront', stem: 'er', confidence: 0.88, type: 'future' }, // ils/elles
  // Conditional
  { ending: 'erais', stem: 'er', confidence: 0.85, type: 'conditional' }, // je/tu
  { ending: 'erait', stem: 'er', confidence: 0.85, type: 'conditional' }, // il/elle
  { ending: 'erions', stem: 'er', confidence: 0.88, type: 'conditional' }, // nous
  { ending: 'eriez', stem: 'er', confidence: 0.88, type: 'conditional' }, // vous
  { ending: 'eraient', stem: 'er', confidence: 0.88, type: 'conditional' }, // ils/elles
  // Subjunctive
  { ending: 'ions', stem: 'er', confidence: 0.8, type: 'subjunctive' }, // nous
  { ending: 'iez', stem: 'er', confidence: 0.8, type: 'subjunctive' }, // vous
  // Imperative
  { ending: 'ons', stem: 'er', confidence: 0.82, type: 'imperative' }, // nous
  { ending: 'ez', stem: 'er', confidence: 0.82, type: 'imperative' }, // vous
  // Infinitive
  { ending: 'er', stem: 'er', confidence: 0.92, type: 'dictionary' },
];

/**
 * -IR verb conjugation endings (2nd group - verbs with -iss- forms).
 * Examples: finir → finissons, choisir → choisissons
 */
const IR_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Present participle
  { ending: 'issant', stem: 'ir', confidence: 0.88, type: 'gerund' },
  // Past participle
  { ending: 'i', stem: 'ir', confidence: 0.8, type: 'participle' },
  { ending: 'ie', stem: 'ir', confidence: 0.82, type: 'participle' },
  { ending: 'is', stem: 'ir', confidence: 0.78, type: 'participle' },
  { ending: 'ies', stem: 'ir', confidence: 0.82, type: 'participle' },
  // Present indicative with -iss-
  { ending: 'is', stem: 'ir', confidence: 0.78, type: 'present' }, // je/tu
  { ending: 'it', stem: 'ir', confidence: 0.78, type: 'present' }, // il/elle
  { ending: 'issons', stem: 'ir', confidence: 0.88, type: 'present' }, // nous
  { ending: 'issez', stem: 'ir', confidence: 0.88, type: 'present' }, // vous
  { ending: 'issent', stem: 'ir', confidence: 0.88, type: 'present' }, // ils/elles
  // Imperfect
  { ending: 'issais', stem: 'ir', confidence: 0.85, type: 'past' }, // je/tu
  { ending: 'issait', stem: 'ir', confidence: 0.85, type: 'past' }, // il/elle
  { ending: 'issions', stem: 'ir', confidence: 0.88, type: 'past' }, // nous
  { ending: 'issiez', stem: 'ir', confidence: 0.88, type: 'past' }, // vous
  { ending: 'issaient', stem: 'ir', confidence: 0.88, type: 'past' }, // ils/elles
  // Future
  { ending: 'irai', stem: 'ir', confidence: 0.85, type: 'future' }, // je
  { ending: 'iras', stem: 'ir', confidence: 0.85, type: 'future' }, // tu
  { ending: 'ira', stem: 'ir', confidence: 0.82, type: 'future' }, // il/elle
  { ending: 'irons', stem: 'ir', confidence: 0.88, type: 'future' }, // nous
  { ending: 'irez', stem: 'ir', confidence: 0.88, type: 'future' }, // vous
  { ending: 'iront', stem: 'ir', confidence: 0.88, type: 'future' }, // ils/elles
  // Infinitive
  { ending: 'ir', stem: 'ir', confidence: 0.9, type: 'dictionary' },
];

/**
 * -RE verb conjugation endings (3rd group).
 * Examples: prendre, vendre, attendre
 */
const RE_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Present participle
  { ending: 'ant', stem: 're', confidence: 0.82, type: 'gerund' },
  // Past participle (common patterns)
  { ending: 'u', stem: 're', confidence: 0.8, type: 'participle' },
  { ending: 'ue', stem: 're', confidence: 0.82, type: 'participle' },
  { ending: 'us', stem: 're', confidence: 0.82, type: 'participle' },
  { ending: 'ues', stem: 're', confidence: 0.82, type: 'participle' },
  // Present indicative
  { ending: 's', stem: 're', confidence: 0.72, type: 'present' }, // je/tu
  { ending: 'd', stem: 're', confidence: 0.75, type: 'present' }, // il/elle (prend, vend)
  { ending: 'ons', stem: 're', confidence: 0.82, type: 'present' }, // nous
  { ending: 'ez', stem: 're', confidence: 0.82, type: 'present' }, // vous
  { ending: 'ent', stem: 're', confidence: 0.8, type: 'present' }, // ils/elles
  // Infinitive
  { ending: 're', stem: 're', confidence: 0.9, type: 'dictionary' },
];

/**
 * All endings combined, sorted by length (longest first).
 */
const ALL_ENDINGS = [...ER_ENDINGS, ...IR_ENDINGS, ...RE_ENDINGS].sort(
  (a, b) => b.ending.length - a.ending.length
);

/**
 * French morphological normalizer.
 */
export class FrenchMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'fr';

  /**
   * Check if a word might be a French verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return looksLikeFrenchVerb(word);
  }

  /**
   * Normalize a French word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if this is already an infinitive (no change needed)
    if (lower.endsWith('er') || lower.endsWith('ir') || lower.endsWith('re')) {
      // Simple infinitive, return as-is
      if (lower.length >= 4) {
        return noChange(word);
      }
    }

    // Try reflexive verb normalization first (for imperative forms like "montrez-vous")
    const reflexiveResult = this.tryReflexiveNormalization(lower);
    if (reflexiveResult) return reflexiveResult;

    // Try standard conjugation normalization
    const conjugationResult = this.tryConjugationNormalization(lower);
    if (conjugationResult) return conjugationResult;

    // No normalization needed
    return noChange(word);
  }

  /**
   * Try to normalize a reflexive verb (imperative forms with attached pronouns).
   * Examples: montrez-vous → montrer, lève-toi → lever
   */
  private tryReflexiveNormalization(word: string): NormalizationResult | null {
    // Check for hyphenated reflexive forms (e.g., "montrez-vous")
    for (const suffix of REFLEXIVE_SUFFIXES) {
      const hyphenatedSuffix = '-' + suffix;
      if (word.endsWith(hyphenatedSuffix)) {
        const withoutReflexive = word.slice(0, -hyphenatedSuffix.length);

        // Try to normalize the remaining part
        const innerResult = this.tryConjugationNormalization(withoutReflexive);
        if (innerResult && innerResult.stem !== withoutReflexive) {
          return normalized(innerResult.stem, innerResult.confidence * 0.95, {
            removedSuffixes: [hyphenatedSuffix, ...(innerResult.metadata?.removedSuffixes || [])],
            conjugationType: 'reflexive',
          });
        }
      }
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
export const frenchMorphologicalNormalizer = new FrenchMorphologicalNormalizer();
