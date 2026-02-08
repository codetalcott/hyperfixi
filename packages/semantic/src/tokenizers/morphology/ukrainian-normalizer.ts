/**
 * Ukrainian Morphological Normalizer
 *
 * Reduces Ukrainian verb conjugations to their infinitive forms.
 * Ukrainian is a fusional language closely related to Russian with rich verb morphology:
 * - Two aspects: perfective and imperfective
 * - Three tenses: present, past, future
 * - Person/number agreement in present tense (6 forms)
 * - Gender/number agreement in past tense (4 forms)
 * - Imperative mood (2 forms: singular and plural)
 * - Reflexive verbs (suffix -ся/-сь)
 *
 * Key differences from Russian:
 * - Infinitive ends in -ти (not -ть): робити, ходити
 * - Past masculine ends in -в (not -л): робив, ходив
 * - Unique vowels: і, ї, є, ґ
 *
 * For software UI, Ukrainian uses INFINITIVE form (industry standard):
 * - перемкнути (toggle), додати (add), видалити (remove)
 *
 * Examples:
 *   перемкни → перемкнути (imperative → infinitive)
 *   додав → додати (past → infinitive)
 *   видаляє → видаляти (present → infinitive)
 */

import type { MorphologicalNormalizer, NormalizationResult } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a word contains Ukrainian/Cyrillic characters.
 */
function hasUkrainianChars(word: string): boolean {
  return /[а-яА-ЯіІїЇєЄґҐьЬ']/.test(word);
}

/**
 * Common imperative → infinitive mappings for Ukrainian software UI keywords.
 * These are irregular or semi-regular forms from the language profile.
 */
const IMPERATIVE_TO_INFINITIVE = new Map<string, string>([
  // Core commands (from Ukrainian language profile)
  ['перемкни', 'перемкнути'],
  ['додай', 'додати'],
  ['видали', 'видалити'],
  ['прибери', 'прибрати'],
  ['поклади', 'покласти'],
  ['помісти', 'помістити'],
  ['встав', 'вставити'],
  ['візьми', 'взяти'],
  ['створи', 'створити'],
  ['клонуй', 'клонувати'],
  ['поміняй', 'поміняти'],
  ['трансформуй', 'трансформувати'],
  ['встанови', 'встановити'],
  ['задай', 'задати'],
  ['отримай', 'отримати'],
  ['збільш', 'збільшити'],
  ['зменш', 'зменшити'],
  ['запиши', 'записати'],
  ['покажи', 'показати'],
  ['сховай', 'сховати'],
  ['приховай', 'приховати'],
  ['анімуй', 'анімувати'],
  ['виклич', 'викликати'],
  ['надішли', 'надіслати'],
  ['сфокусуй', 'сфокусувати'],
  ['розфокусуй', 'розфокусувати'],
  ['перейди', 'перейти'],
  ['йди', 'йти'],
  ['чекай', 'чекати'],
  ['зачекай', 'зачекати'],
  ['завантаж', 'завантажити'],
  ['повтори', 'повторити'],
  ['продовжуй', 'продовжити'],
  ['кинь', 'кинути'],
  ['поверни', 'повернути'],
  ['скажи', 'сказати'],
  ['ініціалізуй', 'ініціалізувати'],
  ['виміряй', 'виміряти'],
]);

/**
 * Ukrainian morphological normalizer.
 */
export class UkrainianMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'uk';

  /**
   * Check if a word might be a Ukrainian verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return hasUkrainianChars(word);
  }

  /**
   * Normalize a Ukrainian word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Handle reflexive verbs: strip -ся/-сь, normalize, re-add -ся
    if (lower.endsWith('ся') || lower.endsWith('сь')) {
      const reflexiveResult = this.tryReflexiveNormalization(lower);
      if (reflexiveResult) return reflexiveResult;
    }

    // Already in infinitive form (-ти, -тися)?
    if (lower.endsWith('ти') || lower.endsWith('чи')) {
      return noChange(word);
    }

    // Try imperative → infinitive (lookup table only — high confidence)
    const imperativeLookup = this.tryImperativeLookup(lower);
    if (imperativeLookup) return imperativeLookup;

    // Try past tense → infinitive (before generic patterns — -али/-или are longer)
    const pastResult = this.tryPastTenseNormalization(lower);
    if (pastResult) return pastResult;

    // Try present tense → infinitive
    const presentResult = this.tryPresentTenseNormalization(lower);
    if (presentResult) return presentResult;

    // Try generic imperative patterns (fallback — lower confidence)
    const imperativeGeneric = this.tryGenericImperativeNormalization(lower);
    if (imperativeGeneric) return imperativeGeneric;

    // No normalization needed
    return noChange(word);
  }

  /**
   * Try to normalize reflexive verbs (-ся/-сь).
   */
  private tryReflexiveNormalization(word: string): NormalizationResult | null {
    const base = word.slice(0, -2);

    // Already reflexive infinitive (-тися)?
    if (word.endsWith('тися') || word.endsWith('чися')) {
      return noChange(word);
    }

    // Normalize the base verb
    const baseResult = this.normalizeNonReflexive(base);
    if (baseResult.confidence < 1.0) {
      const infinitive = baseResult.stem.endsWith('ти')
        ? baseResult.stem.slice(0, -2) + 'тися'
        : baseResult.stem + 'ся';
      return normalized(infinitive, baseResult.confidence * 0.95, {
        removedSuffixes: ['ся', ...(baseResult.metadata?.removedSuffixes || [])],
        conjugationType: 'reflexive',
      });
    }

    return null;
  }

  /**
   * Normalize a non-reflexive verb form.
   */
  private normalizeNonReflexive(word: string): NormalizationResult {
    if (word.endsWith('ти') || word.endsWith('чи')) {
      return noChange(word);
    }

    const imperativeLookup = this.tryImperativeLookup(word);
    if (imperativeLookup) return imperativeLookup;

    const pastResult = this.tryPastTenseNormalization(word);
    if (pastResult) return pastResult;

    const presentResult = this.tryPresentTenseNormalization(word);
    if (presentResult) return presentResult;

    const imperativeGeneric = this.tryGenericImperativeNormalization(word);
    if (imperativeGeneric) return imperativeGeneric;

    return noChange(word);
  }

  /**
   * Try imperative → infinitive via lookup table only.
   */
  private tryImperativeLookup(word: string): NormalizationResult | null {
    if (IMPERATIVE_TO_INFINITIVE.has(word)) {
      return normalized(IMPERATIVE_TO_INFINITIVE.get(word)!, 0.95, {
        removedSuffixes: ['imperative'],
        conjugationType: 'imperative',
      });
    }
    return null;
  }

  /**
   * Try generic imperative patterns (lower confidence fallback).
   */
  private tryGenericImperativeNormalization(word: string): NormalizationResult | null {
    // -йте (plural imperative for -ати verbs: читайте → читати)
    if (word.endsWith('йте') && word.length > 5) {
      return normalized(word.slice(0, -3) + 'ти', 0.8, {
        removedSuffixes: ['йте'],
        conjugationType: 'imperative',
      });
    }

    // -іть (2nd person plural/formal imperative)
    if (word.endsWith('іть') && word.length > 5) {
      return normalized(word.slice(0, -3) + 'ити', 0.8, {
        removedSuffixes: ['іть'],
        conjugationType: 'imperative',
      });
    }

    // -й → -ти (e.g., читай → читати)
    if (word.endsWith('й') && word.length > 3) {
      return normalized(word.slice(0, -1) + 'ти', 0.75, {
        removedSuffixes: ['й'],
        conjugationType: 'imperative',
      });
    }

    // -и (2nd person singular for -ити verbs)
    // e.g., говори → говорити
    if (word.endsWith('и') && word.length > 3) {
      return normalized(word + 'ти', 0.7, {
        removedSuffixes: ['и→ити'],
        conjugationType: 'imperative',
      });
    }

    return null;
  }

  /**
   * Try past tense → infinitive.
   *
   * Ukrainian past tense endings (differs from Russian):
   * - masculine: -в (робив → робити)
   * - feminine: -ла (робила → робити)
   * - neuter: -ло (робило → робити)
   * - plural: -ли (робили → робити)
   */
  private tryPastTenseNormalization(word: string): NormalizationResult | null {
    // Feminine/neuter/plural forms (longer suffixes first)
    if (word.endsWith('ала') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ати', 0.85, {
        removedSuffixes: ['ала'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('ила') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ити', 0.85, {
        removedSuffixes: ['ила'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('али') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ати', 0.85, {
        removedSuffixes: ['али'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('или') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ити', 0.85, {
        removedSuffixes: ['или'],
        conjugationType: 'past',
      });
    }

    // Masculine past: -ав → -ати, -ив → -ити
    if (word.endsWith('ав') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ати', 0.82, {
        removedSuffixes: ['ав'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('ив') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ити', 0.82, {
        removedSuffixes: ['ив'],
        conjugationType: 'past',
      });
    }

    return null;
  }

  /**
   * Try present tense → infinitive.
   *
   * Ukrainian present tense endings:
   * 1st conj: -ю/-у, -еш/-єш, -е/-є, -емо/-ємо, -ете/-єте, -ють/-уть
   * 2nd conj: -ю/-у, -иш, -ить, -имо, -ите, -ять/-ать
   */
  private tryPresentTenseNormalization(word: string): NormalizationResult | null {
    // 2nd conjugation (more specific, check first)
    if (word.endsWith('иш') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ити', 0.8, {
        removedSuffixes: ['иш'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('ить') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ити', 0.78, {
        removedSuffixes: ['ить'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('имо') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ити', 0.8, {
        removedSuffixes: ['имо'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('ять') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ити', 0.78, {
        removedSuffixes: ['ять'],
        conjugationType: 'present',
      });
    }

    // 1st conjugation
    if (word.endsWith('єш') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ати', 0.78, {
        removedSuffixes: ['єш'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('еш') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ати', 0.75, {
        removedSuffixes: ['еш'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('є') && word.length > 2) {
      return normalized(word.slice(0, -1) + 'ати', 0.72, {
        removedSuffixes: ['є'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('ємо') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ати', 0.8, {
        removedSuffixes: ['ємо'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('ють') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ати', 0.78, {
        removedSuffixes: ['ють'],
        conjugationType: 'present',
      });
    }
    if (word.endsWith('уть') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ати', 0.75, {
        removedSuffixes: ['уть'],
        conjugationType: 'present',
      });
    }

    return null;
  }
}

// Export singleton instance
export const ukrainianMorphologicalNormalizer = new UkrainianMorphologicalNormalizer();
