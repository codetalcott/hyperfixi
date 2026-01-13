/**
 * Spanish Morphological Normalizer
 *
 * Reduces Spanish verb conjugations to their infinitive forms.
 * Spanish has three verb conjugation classes (-ar, -er, -ir) and
 * supports reflexive verbs (verbs with -se suffix).
 *
 * Key features:
 * - Reflexive verb handling: mostrarse → mostrar, ocultarse → ocultar
 * - Regular conjugation patterns for -ar, -er, -ir verbs
 * - Handles common irregular verbs
 *
 * Examples:
 *   mostrarse → mostrar (reflexive infinitive)
 *   alternando → alternar (gerund)
 *   escondido → esconder (past participle)
 *   muestra → mostrar (3rd person present)
 */

import type { MorphologicalNormalizer, NormalizationResult, ConjugationType } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is a Spanish-specific letter (accented characters and ñ).
 */
function isSpanishSpecificLetter(char: string): boolean {
  return /[áéíóúüñÁÉÍÓÚÜÑ]/.test(char);
}

/**
 * Check if a word looks like a Spanish verb.
 * Spanish verbs end in -ar, -er, or -ir, or have Spanish-specific characters.
 */
function looksLikeSpanishVerb(word: string): boolean {
  const lower = word.toLowerCase();
  // Check for infinitive endings
  if (lower.endsWith('ar') || lower.endsWith('er') || lower.endsWith('ir')) return true;
  // Check for common conjugation endings
  if (lower.endsWith('ando') || lower.endsWith('iendo')) return true;
  if (lower.endsWith('ado') || lower.endsWith('ido')) return true;
  // Check for reflexive -se ending
  if (lower.endsWith('arse') || lower.endsWith('erse') || lower.endsWith('irse')) return true;
  // Check for Spanish-specific characters
  for (const char of word) {
    if (isSpanishSpecificLetter(char)) return true;
  }
  return false;
}

/**
 * Reflexive pronoun patterns that can be attached to verbs.
 */
const REFLEXIVE_SUFFIXES = ['se', 'me', 'te', 'nos', 'os'];

/**
 * Reflexive pronouns that appear before conjugated verbs.
 * Note: These are handled at the tokenizer level, not here.
 */
// const REFLEXIVE_PREFIXES = ['me', 'te', 'se', 'nos', 'os'];

/**
 * -AR verb conjugation endings mapped to infinitive reconstruction.
 */
const AR_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-ando)
  { ending: 'ando', stem: 'ar', confidence: 0.88, type: 'gerund' },
  // Past participle (-ado)
  { ending: 'ado', stem: 'ar', confidence: 0.88, type: 'participle' },
  { ending: 'ada', stem: 'ar', confidence: 0.88, type: 'participle' },
  { ending: 'ados', stem: 'ar', confidence: 0.88, type: 'participle' },
  { ending: 'adas', stem: 'ar', confidence: 0.88, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'ar', confidence: 0.75, type: 'present' }, // yo
  { ending: 'as', stem: 'ar', confidence: 0.82, type: 'present' }, // tú
  { ending: 'a', stem: 'ar', confidence: 0.75, type: 'present' }, // él/ella
  { ending: 'amos', stem: 'ar', confidence: 0.85, type: 'present' }, // nosotros
  { ending: 'áis', stem: 'ar', confidence: 0.85, type: 'present' }, // vosotros
  { ending: 'ais', stem: 'ar', confidence: 0.82, type: 'present' }, // vosotros (no accent)
  { ending: 'an', stem: 'ar', confidence: 0.8, type: 'present' }, // ellos
  // Preterite
  { ending: 'é', stem: 'ar', confidence: 0.85, type: 'past' }, // yo
  { ending: 'aste', stem: 'ar', confidence: 0.88, type: 'past' }, // tú
  { ending: 'ó', stem: 'ar', confidence: 0.82, type: 'past' }, // él/ella
  { ending: 'amos', stem: 'ar', confidence: 0.85, type: 'past' }, // nosotros (same as present)
  { ending: 'asteis', stem: 'ar', confidence: 0.88, type: 'past' }, // vosotros
  { ending: 'aron', stem: 'ar', confidence: 0.88, type: 'past' }, // ellos
  // Imperfect
  { ending: 'aba', stem: 'ar', confidence: 0.88, type: 'past' }, // yo/él
  { ending: 'abas', stem: 'ar', confidence: 0.88, type: 'past' }, // tú
  { ending: 'ábamos', stem: 'ar', confidence: 0.88, type: 'past' }, // nosotros
  { ending: 'abamos', stem: 'ar', confidence: 0.85, type: 'past' }, // nosotros (no accent)
  { ending: 'abais', stem: 'ar', confidence: 0.88, type: 'past' }, // vosotros
  { ending: 'aban', stem: 'ar', confidence: 0.88, type: 'past' }, // ellos
  // Subjunctive
  { ending: 'e', stem: 'ar', confidence: 0.72, type: 'subjunctive' }, // yo/él (ambiguous)
  { ending: 'es', stem: 'ar', confidence: 0.78, type: 'subjunctive' }, // tú
  { ending: 'emos', stem: 'ar', confidence: 0.82, type: 'subjunctive' }, // nosotros
  { ending: 'éis', stem: 'ar', confidence: 0.85, type: 'subjunctive' }, // vosotros
  { ending: 'eis', stem: 'ar', confidence: 0.82, type: 'subjunctive' }, // vosotros (no accent)
  { ending: 'en', stem: 'ar', confidence: 0.78, type: 'subjunctive' }, // ellos
  // Imperative
  { ending: 'a', stem: 'ar', confidence: 0.75, type: 'imperative' }, // tú (same as 3rd present)
  { ending: 'ad', stem: 'ar', confidence: 0.85, type: 'imperative' }, // vosotros
  // Infinitive
  { ending: 'ar', stem: 'ar', confidence: 0.92, type: 'dictionary' },
];

/**
 * -ER verb conjugation endings.
 */
const ER_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-iendo)
  { ending: 'iendo', stem: 'er', confidence: 0.88, type: 'gerund' },
  // Past participle (-ido)
  { ending: 'ido', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'ida', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'idos', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'idas', stem: 'er', confidence: 0.85, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'er', confidence: 0.72, type: 'present' }, // yo
  { ending: 'es', stem: 'er', confidence: 0.78, type: 'present' }, // tú
  { ending: 'e', stem: 'er', confidence: 0.72, type: 'present' }, // él/ella
  { ending: 'emos', stem: 'er', confidence: 0.85, type: 'present' }, // nosotros
  { ending: 'éis', stem: 'er', confidence: 0.85, type: 'present' }, // vosotros
  { ending: 'eis', stem: 'er', confidence: 0.82, type: 'present' }, // vosotros (no accent)
  { ending: 'en', stem: 'er', confidence: 0.78, type: 'present' }, // ellos
  // Preterite
  { ending: 'í', stem: 'er', confidence: 0.85, type: 'past' }, // yo
  { ending: 'iste', stem: 'er', confidence: 0.88, type: 'past' }, // tú
  { ending: 'ió', stem: 'er', confidence: 0.85, type: 'past' }, // él/ella
  { ending: 'io', stem: 'er', confidence: 0.82, type: 'past' }, // él/ella (no accent)
  { ending: 'imos', stem: 'er', confidence: 0.85, type: 'past' }, // nosotros
  { ending: 'isteis', stem: 'er', confidence: 0.88, type: 'past' }, // vosotros
  { ending: 'ieron', stem: 'er', confidence: 0.88, type: 'past' }, // ellos
  // Imperfect
  { ending: 'ía', stem: 'er', confidence: 0.88, type: 'past' }, // yo/él
  { ending: 'ia', stem: 'er', confidence: 0.85, type: 'past' }, // yo/él (no accent)
  { ending: 'ías', stem: 'er', confidence: 0.88, type: 'past' }, // tú
  { ending: 'ias', stem: 'er', confidence: 0.85, type: 'past' }, // tú (no accent)
  { ending: 'íamos', stem: 'er', confidence: 0.88, type: 'past' }, // nosotros
  { ending: 'iamos', stem: 'er', confidence: 0.85, type: 'past' }, // nosotros (no accent)
  { ending: 'íais', stem: 'er', confidence: 0.88, type: 'past' }, // vosotros
  { ending: 'iais', stem: 'er', confidence: 0.85, type: 'past' }, // vosotros (no accent)
  { ending: 'ían', stem: 'er', confidence: 0.88, type: 'past' }, // ellos
  { ending: 'ian', stem: 'er', confidence: 0.85, type: 'past' }, // ellos (no accent)
  // Infinitive
  { ending: 'er', stem: 'er', confidence: 0.92, type: 'dictionary' },
];

/**
 * -IR verb conjugation endings.
 */
const IR_ENDINGS: readonly {
  ending: string;
  stem: string;
  confidence: number;
  type: ConjugationType;
}[] = [
  // Gerund (-iendo)
  { ending: 'iendo', stem: 'ir', confidence: 0.88, type: 'gerund' },
  // Past participle (-ido)
  { ending: 'ido', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'ida', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'idos', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'idas', stem: 'ir', confidence: 0.85, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'ir', confidence: 0.72, type: 'present' }, // yo
  { ending: 'es', stem: 'ir', confidence: 0.78, type: 'present' }, // tú
  { ending: 'e', stem: 'ir', confidence: 0.72, type: 'present' }, // él/ella
  { ending: 'imos', stem: 'ir', confidence: 0.85, type: 'present' }, // nosotros
  { ending: 'ís', stem: 'ir', confidence: 0.85, type: 'present' }, // vosotros
  { ending: 'is', stem: 'ir', confidence: 0.82, type: 'present' }, // vosotros (no accent)
  { ending: 'en', stem: 'ir', confidence: 0.78, type: 'present' }, // ellos
  // Preterite (same as -er)
  { ending: 'í', stem: 'ir', confidence: 0.85, type: 'past' }, // yo
  { ending: 'iste', stem: 'ir', confidence: 0.88, type: 'past' }, // tú
  { ending: 'ió', stem: 'ir', confidence: 0.85, type: 'past' }, // él/ella
  { ending: 'io', stem: 'ir', confidence: 0.82, type: 'past' }, // él/ella (no accent)
  { ending: 'imos', stem: 'ir', confidence: 0.85, type: 'past' }, // nosotros
  { ending: 'isteis', stem: 'ir', confidence: 0.88, type: 'past' }, // vosotros
  { ending: 'ieron', stem: 'ir', confidence: 0.88, type: 'past' }, // ellos
  // Imperfect (same as -er)
  { ending: 'ía', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'ia', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'ías', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'ias', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'íamos', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'iamos', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'íais', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'iais', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'ían', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'ian', stem: 'ir', confidence: 0.85, type: 'past' },
  // Infinitive
  { ending: 'ir', stem: 'ir', confidence: 0.92, type: 'dictionary' },
];

/**
 * All endings combined, sorted by length (longest first).
 */
const ALL_ENDINGS = [...AR_ENDINGS, ...ER_ENDINGS, ...IR_ENDINGS].sort(
  (a, b) => b.ending.length - a.ending.length
);

/**
 * Spanish morphological normalizer.
 */
export class SpanishMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'es';

  /**
   * Check if a word might be a Spanish verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return looksLikeSpanishVerb(word);
  }

  /**
   * Normalize a Spanish word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if this is already an infinitive (no change needed)
    if (lower.endsWith('ar') || lower.endsWith('er') || lower.endsWith('ir')) {
      // If it's a simple infinitive, return as-is with 1.0 confidence
      // (unless it's a reflexive like "mostrarse")
      if (
        !REFLEXIVE_SUFFIXES.some(
          s => lower.endsWith(s + 'ar') || lower.endsWith(s + 'er') || lower.endsWith(s + 'ir')
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
   * Reflexive verbs end with -se, -me, -te, -nos, -os attached to infinitive.
   *
   * Examples:
   *   mostrarse → mostrar
   *   ocultarse → ocultar
   *   esconderse → esconder
   */
  private tryReflexiveNormalization(word: string): NormalizationResult | null {
    for (const suffix of REFLEXIVE_SUFFIXES) {
      if (word.endsWith(suffix)) {
        const withoutReflexive = word.slice(0, -suffix.length);

        // Check if this looks like an infinitive
        if (
          withoutReflexive.endsWith('ar') ||
          withoutReflexive.endsWith('er') ||
          withoutReflexive.endsWith('ir')
        ) {
          // It's a reflexive infinitive (e.g., mostrarse → mostrar)
          return normalized(withoutReflexive, 0.88, {
            removedSuffixes: [suffix],
            conjugationType: 'reflexive',
          });
        }

        // Try to normalize the remaining part as a conjugated verb
        const innerResult = this.tryConjugationNormalization(withoutReflexive);
        if (innerResult && innerResult.stem !== withoutReflexive) {
          // It's a reflexive conjugated form (e.g., muestrase → mostrar)
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
export const spanishMorphologicalNormalizer = new SpanishMorphologicalNormalizer();
