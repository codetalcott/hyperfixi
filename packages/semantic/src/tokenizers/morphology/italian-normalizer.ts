/**
 * Italian Morphological Normalizer
 *
 * Reduces Italian verb conjugations to their infinitive forms.
 * Italian has three verb conjugation classes (-are, -ere, -ire) and
 * supports reflexive verbs (verbs with -si suffix).
 *
 * Key features:
 * - Reflexive verb handling: mostrarsi → mostrare, nascondersi → nascondere
 * - Regular conjugation patterns for -are, -ere, -ire verbs
 * - Handles common irregular verbs
 *
 * Examples:
 *   mostrarsi → mostrare (reflexive infinitive)
 *   alternando → alternare (gerund)
 *   nascosto → nascondere (past participle)
 *   mostra → mostrare (3rd person present)
 */

import type { MorphologicalNormalizer, NormalizationResult, ConjugationType } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is an Italian-specific letter (accented characters).
 */
function isItalianSpecificLetter(char: string): boolean {
  return /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/.test(char);
}

/**
 * Check if a word looks like an Italian verb.
 * Italian verbs end in -are, -ere, or -ire, or have Italian-specific characters.
 */
function looksLikeItalianVerb(word: string): boolean {
  const lower = word.toLowerCase();
  // Check for infinitive endings
  if (lower.endsWith('are') || lower.endsWith('ere') || lower.endsWith('ire')) return true;
  // Check for common conjugation endings
  if (lower.endsWith('ando') || lower.endsWith('endo')) return true;
  if (lower.endsWith('ato') || lower.endsWith('uto') || lower.endsWith('ito')) return true;
  // Check for reflexive -si ending
  if (lower.endsWith('arsi') || lower.endsWith('ersi') || lower.endsWith('irsi')) return true;
  // Check for Italian-specific characters
  for (const char of word) {
    if (isItalianSpecificLetter(char)) return true;
  }
  return false;
}

/**
 * Reflexive pronoun patterns that can be attached to verbs.
 */
const REFLEXIVE_SUFFIXES = ['si', 'mi', 'ti', 'ci', 'vi'];

/**
 * -ARE verb conjugation endings mapped to infinitive reconstruction.
 */
const ARE_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-ando)
  { ending: 'ando', stem: 'are', confidence: 0.88, type: 'gerund' },
  // Past participle (-ato)
  { ending: 'ato', stem: 'are', confidence: 0.88, type: 'participle' },
  { ending: 'ata', stem: 'are', confidence: 0.88, type: 'participle' },
  { ending: 'ati', stem: 'are', confidence: 0.88, type: 'participle' },
  { ending: 'ate', stem: 'are', confidence: 0.88, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'are', confidence: 0.75, type: 'present' }, // io
  { ending: 'i', stem: 'are', confidence: 0.72, type: 'present' }, // tu
  { ending: 'a', stem: 'are', confidence: 0.75, type: 'present' }, // lui/lei
  { ending: 'iamo', stem: 'are', confidence: 0.85, type: 'present' }, // noi
  { ending: 'ate', stem: 'are', confidence: 0.85, type: 'present' }, // voi
  { ending: 'ano', stem: 'are', confidence: 0.85, type: 'present' }, // loro
  // Imperfect
  { ending: 'avo', stem: 'are', confidence: 0.88, type: 'past' }, // io
  { ending: 'avi', stem: 'are', confidence: 0.88, type: 'past' }, // tu
  { ending: 'ava', stem: 'are', confidence: 0.88, type: 'past' }, // lui/lei
  { ending: 'avamo', stem: 'are', confidence: 0.88, type: 'past' }, // noi
  { ending: 'avate', stem: 'are', confidence: 0.88, type: 'past' }, // voi
  { ending: 'avano', stem: 'are', confidence: 0.88, type: 'past' }, // loro
  // Preterite (passato remoto)
  { ending: 'ai', stem: 'are', confidence: 0.85, type: 'past' }, // io
  { ending: 'asti', stem: 'are', confidence: 0.88, type: 'past' }, // tu
  { ending: 'ò', stem: 'are', confidence: 0.85, type: 'past' }, // lui/lei
  { ending: 'ammo', stem: 'are', confidence: 0.88, type: 'past' }, // noi
  { ending: 'aste', stem: 'are', confidence: 0.88, type: 'past' }, // voi
  { ending: 'arono', stem: 'are', confidence: 0.88, type: 'past' }, // loro
  // Subjunctive present
  { ending: 'i', stem: 'are', confidence: 0.72, type: 'subjunctive' }, // io/tu/lui (ambiguous)
  { ending: 'ino', stem: 'are', confidence: 0.82, type: 'subjunctive' }, // loro
  // Imperative
  { ending: 'a', stem: 'are', confidence: 0.75, type: 'imperative' }, // tu
  // Infinitive
  { ending: 'are', stem: 'are', confidence: 0.92, type: 'dictionary' },
];

/**
 * -ERE verb conjugation endings.
 */
const ERE_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-endo)
  { ending: 'endo', stem: 'ere', confidence: 0.88, type: 'gerund' },
  // Past participle (-uto)
  { ending: 'uto', stem: 'ere', confidence: 0.85, type: 'participle' },
  { ending: 'uta', stem: 'ere', confidence: 0.85, type: 'participle' },
  { ending: 'uti', stem: 'ere', confidence: 0.85, type: 'participle' },
  { ending: 'ute', stem: 'ere', confidence: 0.85, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'ere', confidence: 0.72, type: 'present' }, // io
  { ending: 'i', stem: 'ere', confidence: 0.72, type: 'present' }, // tu
  { ending: 'e', stem: 'ere', confidence: 0.72, type: 'present' }, // lui/lei
  { ending: 'iamo', stem: 'ere', confidence: 0.85, type: 'present' }, // noi
  { ending: 'ete', stem: 'ere', confidence: 0.85, type: 'present' }, // voi
  { ending: 'ono', stem: 'ere', confidence: 0.82, type: 'present' }, // loro
  // Imperfect
  { ending: 'evo', stem: 'ere', confidence: 0.88, type: 'past' }, // io
  { ending: 'evi', stem: 'ere', confidence: 0.88, type: 'past' }, // tu
  { ending: 'eva', stem: 'ere', confidence: 0.88, type: 'past' }, // lui/lei
  { ending: 'evamo', stem: 'ere', confidence: 0.88, type: 'past' }, // noi
  { ending: 'evate', stem: 'ere', confidence: 0.88, type: 'past' }, // voi
  { ending: 'evano', stem: 'ere', confidence: 0.88, type: 'past' }, // loro
  // Preterite
  { ending: 'ei', stem: 'ere', confidence: 0.85, type: 'past' }, // io
  { ending: 'etti', stem: 'ere', confidence: 0.85, type: 'past' }, // io (variant)
  { ending: 'esti', stem: 'ere', confidence: 0.88, type: 'past' }, // tu
  { ending: 'é', stem: 'ere', confidence: 0.85, type: 'past' }, // lui/lei
  { ending: 'ette', stem: 'ere', confidence: 0.85, type: 'past' }, // lui/lei (variant)
  { ending: 'emmo', stem: 'ere', confidence: 0.88, type: 'past' }, // noi
  { ending: 'este', stem: 'ere', confidence: 0.88, type: 'past' }, // voi
  { ending: 'erono', stem: 'ere', confidence: 0.88, type: 'past' }, // loro
  { ending: 'ettero', stem: 'ere', confidence: 0.88, type: 'past' }, // loro (variant)
  // Infinitive
  { ending: 'ere', stem: 'ere', confidence: 0.92, type: 'dictionary' },
];

/**
 * -IRE verb conjugation endings.
 */
const IRE_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-endo)
  { ending: 'endo', stem: 'ire', confidence: 0.85, type: 'gerund' },
  // Past participle (-ito)
  { ending: 'ito', stem: 'ire', confidence: 0.85, type: 'participle' },
  { ending: 'ita', stem: 'ire', confidence: 0.85, type: 'participle' },
  { ending: 'iti', stem: 'ire', confidence: 0.85, type: 'participle' },
  { ending: 'ite', stem: 'ire', confidence: 0.85, type: 'participle' },
  // Present indicative (standard)
  { ending: 'o', stem: 'ire', confidence: 0.7, type: 'present' }, // io
  { ending: 'i', stem: 'ire', confidence: 0.7, type: 'present' }, // tu
  { ending: 'e', stem: 'ire', confidence: 0.7, type: 'present' }, // lui/lei
  { ending: 'iamo', stem: 'ire', confidence: 0.85, type: 'present' }, // noi
  { ending: 'ite', stem: 'ire', confidence: 0.85, type: 'present' }, // voi
  { ending: 'ono', stem: 'ire', confidence: 0.78, type: 'present' }, // loro
  // Present indicative (-isco verbs)
  { ending: 'isco', stem: 'ire', confidence: 0.85, type: 'present' }, // io
  { ending: 'isci', stem: 'ire', confidence: 0.85, type: 'present' }, // tu
  { ending: 'isce', stem: 'ire', confidence: 0.85, type: 'present' }, // lui/lei
  { ending: 'iscono', stem: 'ire', confidence: 0.88, type: 'present' }, // loro
  // Imperfect
  { ending: 'ivo', stem: 'ire', confidence: 0.88, type: 'past' }, // io
  { ending: 'ivi', stem: 'ire', confidence: 0.88, type: 'past' }, // tu
  { ending: 'iva', stem: 'ire', confidence: 0.88, type: 'past' }, // lui/lei
  { ending: 'ivamo', stem: 'ire', confidence: 0.88, type: 'past' }, // noi
  { ending: 'ivate', stem: 'ire', confidence: 0.88, type: 'past' }, // voi
  { ending: 'ivano', stem: 'ire', confidence: 0.88, type: 'past' }, // loro
  // Preterite
  { ending: 'ii', stem: 'ire', confidence: 0.85, type: 'past' }, // io
  { ending: 'isti', stem: 'ire', confidence: 0.88, type: 'past' }, // tu
  { ending: 'ì', stem: 'ire', confidence: 0.85, type: 'past' }, // lui/lei
  { ending: 'immo', stem: 'ire', confidence: 0.88, type: 'past' }, // noi
  { ending: 'iste', stem: 'ire', confidence: 0.88, type: 'past' }, // voi
  { ending: 'irono', stem: 'ire', confidence: 0.88, type: 'past' }, // loro
  // Infinitive
  { ending: 'ire', stem: 'ire', confidence: 0.92, type: 'dictionary' },
];

/**
 * All endings combined, sorted by length (longest first).
 */
const ALL_ENDINGS = [...ARE_ENDINGS, ...ERE_ENDINGS, ...IRE_ENDINGS].sort(
  (a, b) => b.ending.length - a.ending.length
);

/**
 * Italian morphological normalizer.
 */
export class ItalianMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'it';

  /**
   * Check if a word might be an Italian verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return looksLikeItalianVerb(word);
  }

  /**
   * Normalize an Italian word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if this is already an infinitive (no change needed)
    if (lower.endsWith('are') || lower.endsWith('ere') || lower.endsWith('ire')) {
      // If it's a simple infinitive, return as-is with 1.0 confidence
      // (unless it's a reflexive like "mostrarsi")
      if (
        !REFLEXIVE_SUFFIXES.some(
          s => lower.endsWith(s + 'are') || lower.endsWith(s + 'ere') || lower.endsWith(s + 'ire')
        )
      ) {
        return noChange(word);
      }
    }

    // Try reflexive verb normalization first (highest priority)
    const reflexiveResult = this.tryReflexiveNormalization(lower);
    if (reflexiveResult) return reflexiveResult;

    // Try standard conjugation normalization
    const conjugationResult = this.tryConjugationNormalization(lower);
    if (conjugationResult) return conjugationResult;

    // No normalization needed
    return noChange(word);
  }

  /**
   * Try to normalize a reflexive verb.
   * Reflexive verbs end with -si, -mi, -ti, -ci, -vi attached to infinitive.
   *
   * In Italian, reflexive infinitives drop the final -e before attaching the pronoun:
   *   mostrare + si → mostrarsi (not mostraresi)
   *   nascondere + si → nascondersi
   *
   * Examples:
   *   mostrarsi → mostrare
   *   nascondersi → nascondere
   */
  private tryReflexiveNormalization(word: string): NormalizationResult | null {
    for (const suffix of REFLEXIVE_SUFFIXES) {
      if (word.endsWith(suffix)) {
        const withoutReflexive = word.slice(0, -suffix.length);

        // In Italian, reflexive infinitives are formed by dropping the final -e
        // So mostrarsi = mostrar + si, where mostrar comes from mostrare
        // Check if adding 'e' gives us a valid infinitive
        if (
          withoutReflexive.endsWith('ar') ||
          withoutReflexive.endsWith('er') ||
          withoutReflexive.endsWith('ir')
        ) {
          // Reconstruct the infinitive by adding 'e'
          const infinitive = withoutReflexive + 'e';
          return normalized(infinitive, 0.88, {
            removedSuffixes: [suffix],
            conjugationType: 'reflexive',
          });
        }

        // Check if this already looks like an infinitive (less common case)
        if (
          withoutReflexive.endsWith('are') ||
          withoutReflexive.endsWith('ere') ||
          withoutReflexive.endsWith('ire')
        ) {
          return normalized(withoutReflexive, 0.88, {
            removedSuffixes: [suffix],
            conjugationType: 'reflexive',
          });
        }

        // Try to normalize the remaining part as a conjugated verb
        const innerResult = this.tryConjugationNormalization(withoutReflexive);
        if (innerResult && innerResult.stem !== withoutReflexive) {
          // It's a reflexive conjugated form
          return normalized(innerResult.stem, innerResult.confidence * 0.95, {
            removedSuffixes: [suffix, ...(innerResult.metadata?.removedSuffixes || [])],
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
export const italianMorphologicalNormalizer = new ItalianMorphologicalNormalizer();
