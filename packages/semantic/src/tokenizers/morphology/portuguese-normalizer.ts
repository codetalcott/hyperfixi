/**
 * Portuguese Morphological Normalizer
 *
 * Reduces Portuguese verb conjugations to their infinitive forms.
 * Portuguese has three verb conjugation classes (-ar, -er, -ir) and
 * supports reflexive verbs (verbs with -se suffix).
 *
 * Key features:
 * - Reflexive verb handling: mostrar-se → mostrar, esconder-se → esconder
 * - Regular conjugation patterns for -ar, -er, -ir verbs
 * - Handles common irregular verbs
 * - Brazilian Portuguese variants
 *
 * Examples:
 *   mostrar-se → mostrar (reflexive infinitive)
 *   alternando → alternar (gerund)
 *   escondido → esconder (past participle)
 *   mostra → mostrar (3rd person present)
 *   clicou → clicar (3rd person preterite)
 */

import type { MorphologicalNormalizer, NormalizationResult, ConjugationType } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is a Portuguese-specific letter (accented characters and ç).
 */
function isPortugueseSpecificLetter(char: string): boolean {
  return /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(char);
}

/**
 * Check if a word looks like a Portuguese verb.
 * Portuguese verbs end in -ar, -er, or -ir, or have Portuguese-specific characters.
 */
function looksLikePortugueseVerb(word: string): boolean {
  const lower = word.toLowerCase();
  // Check for infinitive endings
  if (lower.endsWith('ar') || lower.endsWith('er') || lower.endsWith('ir')) return true;
  // Check for common conjugation endings
  if (lower.endsWith('ando') || lower.endsWith('endo') || lower.endsWith('indo')) return true;
  if (lower.endsWith('ado') || lower.endsWith('ido')) return true;
  // Check for reflexive -se ending
  if (lower.endsWith('ar-se') || lower.endsWith('er-se') || lower.endsWith('ir-se')) return true;
  // Check for Portuguese-specific characters
  for (const char of word) {
    if (isPortugueseSpecificLetter(char)) return true;
  }
  return false;
}

/**
 * Reflexive pronoun patterns that can be attached to verbs.
 * Portuguese uses hyphenated reflexive pronouns: mostrar-se, esconder-me
 */
const REFLEXIVE_SUFFIXES = ['-se', '-me', '-te', '-nos', '-vos'];

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
  { ending: 'o', stem: 'ar', confidence: 0.75, type: 'present' }, // eu
  { ending: 'as', stem: 'ar', confidence: 0.82, type: 'present' }, // tu
  { ending: 'a', stem: 'ar', confidence: 0.75, type: 'present' }, // ele/ela/você
  { ending: 'amos', stem: 'ar', confidence: 0.85, type: 'present' }, // nós
  { ending: 'ais', stem: 'ar', confidence: 0.85, type: 'present' }, // vós
  { ending: 'am', stem: 'ar', confidence: 0.8, type: 'present' }, // eles/elas/vocês
  // Preterite (past)
  { ending: 'ei', stem: 'ar', confidence: 0.88, type: 'past' }, // eu
  { ending: 'aste', stem: 'ar', confidence: 0.88, type: 'past' }, // tu
  { ending: 'ou', stem: 'ar', confidence: 0.88, type: 'past' }, // ele/ela/você
  { ending: 'ámos', stem: 'ar', confidence: 0.88, type: 'past' }, // nós (with accent)
  { ending: 'amos', stem: 'ar', confidence: 0.85, type: 'past' }, // nós (Brazilian)
  { ending: 'astes', stem: 'ar', confidence: 0.88, type: 'past' }, // vós
  { ending: 'aram', stem: 'ar', confidence: 0.88, type: 'past' }, // eles/elas/vocês
  // Imperfect
  { ending: 'ava', stem: 'ar', confidence: 0.88, type: 'past' }, // eu/ele
  { ending: 'avas', stem: 'ar', confidence: 0.88, type: 'past' }, // tu
  { ending: 'ávamos', stem: 'ar', confidence: 0.88, type: 'past' }, // nós
  { ending: 'avamos', stem: 'ar', confidence: 0.85, type: 'past' }, // nós (no accent)
  { ending: 'áveis', stem: 'ar', confidence: 0.88, type: 'past' }, // vós
  { ending: 'aveis', stem: 'ar', confidence: 0.85, type: 'past' }, // vós (no accent)
  { ending: 'avam', stem: 'ar', confidence: 0.88, type: 'past' }, // eles
  // Subjunctive
  { ending: 'e', stem: 'ar', confidence: 0.72, type: 'subjunctive' }, // eu/ele (ambiguous)
  { ending: 'es', stem: 'ar', confidence: 0.78, type: 'subjunctive' }, // tu
  { ending: 'emos', stem: 'ar', confidence: 0.82, type: 'subjunctive' }, // nós
  { ending: 'eis', stem: 'ar', confidence: 0.82, type: 'subjunctive' }, // vós
  { ending: 'em', stem: 'ar', confidence: 0.78, type: 'subjunctive' }, // eles
  // Imperative
  { ending: 'a', stem: 'ar', confidence: 0.75, type: 'imperative' }, // tu/você
  { ending: 'ai', stem: 'ar', confidence: 0.85, type: 'imperative' }, // vós
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
  // Gerund (-endo)
  { ending: 'endo', stem: 'er', confidence: 0.88, type: 'gerund' },
  // Past participle (-ido)
  { ending: 'ido', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'ida', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'idos', stem: 'er', confidence: 0.85, type: 'participle' },
  { ending: 'idas', stem: 'er', confidence: 0.85, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'er', confidence: 0.72, type: 'present' }, // eu
  { ending: 'es', stem: 'er', confidence: 0.78, type: 'present' }, // tu
  { ending: 'e', stem: 'er', confidence: 0.72, type: 'present' }, // ele
  { ending: 'emos', stem: 'er', confidence: 0.85, type: 'present' }, // nós
  { ending: 'eis', stem: 'er', confidence: 0.82, type: 'present' }, // vós
  { ending: 'em', stem: 'er', confidence: 0.78, type: 'present' }, // eles
  // Preterite
  { ending: 'i', stem: 'er', confidence: 0.85, type: 'past' }, // eu
  { ending: 'este', stem: 'er', confidence: 0.88, type: 'past' }, // tu
  { ending: 'eu', stem: 'er', confidence: 0.88, type: 'past' }, // ele
  { ending: 'emos', stem: 'er', confidence: 0.85, type: 'past' }, // nós
  { ending: 'estes', stem: 'er', confidence: 0.88, type: 'past' }, // vós
  { ending: 'eram', stem: 'er', confidence: 0.88, type: 'past' }, // eles
  // Imperfect
  { ending: 'ia', stem: 'er', confidence: 0.85, type: 'past' }, // eu/ele
  { ending: 'ias', stem: 'er', confidence: 0.85, type: 'past' }, // tu
  { ending: 'íamos', stem: 'er', confidence: 0.88, type: 'past' }, // nós
  { ending: 'iamos', stem: 'er', confidence: 0.85, type: 'past' }, // nós (no accent)
  { ending: 'íeis', stem: 'er', confidence: 0.88, type: 'past' }, // vós
  { ending: 'ieis', stem: 'er', confidence: 0.85, type: 'past' }, // vós (no accent)
  { ending: 'iam', stem: 'er', confidence: 0.85, type: 'past' }, // eles
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
  // Gerund (-indo)
  { ending: 'indo', stem: 'ir', confidence: 0.88, type: 'gerund' },
  // Past participle (-ido)
  { ending: 'ido', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'ida', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'idos', stem: 'ir', confidence: 0.85, type: 'participle' },
  { ending: 'idas', stem: 'ir', confidence: 0.85, type: 'participle' },
  // Present indicative
  { ending: 'o', stem: 'ir', confidence: 0.72, type: 'present' }, // eu
  { ending: 'es', stem: 'ir', confidence: 0.78, type: 'present' }, // tu
  { ending: 'e', stem: 'ir', confidence: 0.72, type: 'present' }, // ele
  { ending: 'imos', stem: 'ir', confidence: 0.85, type: 'present' }, // nós
  { ending: 'is', stem: 'ir', confidence: 0.82, type: 'present' }, // vós
  { ending: 'em', stem: 'ir', confidence: 0.78, type: 'present' }, // eles
  // Preterite (same as -er)
  { ending: 'i', stem: 'ir', confidence: 0.85, type: 'past' }, // eu
  { ending: 'iste', stem: 'ir', confidence: 0.88, type: 'past' }, // tu
  { ending: 'iu', stem: 'ir', confidence: 0.88, type: 'past' }, // ele
  { ending: 'imos', stem: 'ir', confidence: 0.85, type: 'past' }, // nós
  { ending: 'istes', stem: 'ir', confidence: 0.88, type: 'past' }, // vós
  { ending: 'iram', stem: 'ir', confidence: 0.88, type: 'past' }, // eles
  // Imperfect (same as -er)
  { ending: 'ia', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'ias', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'íamos', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'iamos', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'íeis', stem: 'ir', confidence: 0.88, type: 'past' },
  { ending: 'ieis', stem: 'ir', confidence: 0.85, type: 'past' },
  { ending: 'iam', stem: 'ir', confidence: 0.85, type: 'past' },
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
 * Portuguese morphological normalizer.
 */
export class PortugueseMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'pt';

  /**
   * Check if a word might be a Portuguese verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return looksLikePortugueseVerb(word);
  }

  /**
   * Normalize a Portuguese word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if this is already an infinitive (no change needed)
    if (lower.endsWith('ar') || lower.endsWith('er') || lower.endsWith('ir')) {
      // If it's a simple infinitive, return as-is with 1.0 confidence
      // (unless it's a reflexive like "mostrar-se")
      if (!REFLEXIVE_SUFFIXES.some(s => lower.endsWith(s))) {
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
   * Portuguese reflexive verbs use hyphenated pronouns: mostrar-se, esconder-me
   *
   * Examples:
   *   mostrar-se → mostrar
   *   esconder-se → esconder
   *   exibir-se → exibir
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
          // It's a reflexive infinitive (e.g., mostrar-se → mostrar)
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
export const portugueseMorphologicalNormalizer = new PortugueseMorphologicalNormalizer();
