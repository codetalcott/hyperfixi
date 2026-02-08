/**
 * Russian Morphological Normalizer
 *
 * Reduces Russian verb conjugations to their infinitive forms.
 * Russian is a fusional language with rich verb morphology:
 * - Two aspects: perfective (single completed action) and imperfective (ongoing/repeated)
 * - Three tenses: present, past, future
 * - Person/number agreement in present tense (6 forms)
 * - Gender/number agreement in past tense (4 forms)
 * - Imperative mood (2 forms: singular and plural)
 * - Reflexive verbs (suffix -ся/-сь)
 *
 * For software UI, Russian uses INFINITIVE form (industry standard):
 * - переключить (toggle), добавить (add), удалить (remove)
 *
 * Examples:
 *   переключи → переключить (imperative → infinitive)
 *   добавил → добавить (past → infinitive)
 *   удаляет → удалять (present → infinitive, imperfective)
 */

import type { MorphologicalNormalizer, NormalizationResult } from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is Cyrillic.
 */
function isCyrillic(char: string): boolean {
  return /[а-яА-ЯёЁ]/.test(char);
}

/**
 * Check if a word contains Cyrillic characters.
 */
function hasCyrillic(word: string): boolean {
  for (const char of word) {
    if (isCyrillic(char)) return true;
  }
  return false;
}

/**
 * Common imperative → infinitive mappings for Russian software UI keywords.
 * These are irregular or semi-regular forms from the language profile.
 */
const IMPERATIVE_TO_INFINITIVE = new Map<string, string>([
  // Core commands (from Russian language profile)
  ['переключи', 'переключить'],
  ['добавь', 'добавить'],
  ['удали', 'удалить'],
  ['убери', 'убрать'],
  ['положи', 'положить'],
  ['помести', 'поместить'],
  ['вставь', 'вставить'],
  ['возьми', 'взять'],
  ['создай', 'создать'],
  ['клонируй', 'клонировать'],
  ['поменяй', 'поменять'],
  ['трансформируй', 'трансформировать'],
  ['установи', 'установить'],
  ['задай', 'задать'],
  ['получи', 'получить'],
  ['увеличь', 'увеличить'],
  ['уменьши', 'уменьшить'],
  ['запиши', 'записать'],
  ['покажи', 'показать'],
  ['скрой', 'скрыть'],
  ['спрячь', 'спрятать'],
  ['анимируй', 'анимировать'],
  ['вызови', 'вызвать'],
  ['отправь', 'отправить'],
  ['сфокусируй', 'сфокусировать'],
  ['размой', 'размыть'],
  ['перейди', 'перейти'],
  ['иди', 'идти'],
  ['жди', 'ждать'],
  ['подожди', 'подождать'],
  ['загрузи', 'загрузить'],
  ['повтори', 'повторить'],
  ['продолжи', 'продолжить'],
  ['брось', 'бросить'],
  ['верни', 'вернуть'],
  ['скажи', 'сказать'],
  ['инициализируй', 'инициализировать'],
  ['измерь', 'измерить'],
]);

/**
 * Russian morphological normalizer.
 */
export class RussianMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'ru';

  /**
   * Check if a word might be a Russian verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    return hasCyrillic(word);
  }

  /**
   * Normalize a Russian word to its infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Handle reflexive verbs: strip -ся/-сь, normalize, re-add -ся
    if (lower.endsWith('ся') || lower.endsWith('сь')) {
      const reflexiveResult = this.tryReflexiveNormalization(lower);
      if (reflexiveResult) return reflexiveResult;
    }

    // Already in infinitive form (-ть)?
    if (lower.endsWith('ть') || lower.endsWith('ти') || lower.endsWith('чь')) {
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
   * Strip the reflexive suffix, normalize the base, then append -ться.
   */
  private tryReflexiveNormalization(word: string): NormalizationResult | null {
    const suffixLen = word.endsWith('ся') ? 2 : 2; // both are 2 chars
    const base = word.slice(0, -suffixLen);

    // If the base is already infinitive + reflexive (e.g., -ться)
    if (word.endsWith('ться') || word.endsWith('тись') || word.endsWith('чься')) {
      return noChange(word);
    }

    // Normalize the base verb
    const baseResult = this.normalizeNonReflexive(base);
    if (baseResult.confidence < 1.0) {
      // The base was normalized — reconstruct with -ся
      const infinitive = baseResult.stem.endsWith('ть')
        ? baseResult.stem.slice(0, -2) + 'ться'
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
    // Already infinitive?
    if (word.endsWith('ть') || word.endsWith('ти') || word.endsWith('чь')) {
      return noChange(word);
    }

    // Try imperative lookup (high confidence)
    const imperativeLookup = this.tryImperativeLookup(word);
    if (imperativeLookup) return imperativeLookup;

    // Try past tense (before generic imperative — -али/-или are longer)
    const pastResult = this.tryPastTenseNormalization(word);
    if (pastResult) return pastResult;

    // Try present tense
    const presentResult = this.tryPresentTenseNormalization(word);
    if (presentResult) return presentResult;

    // Try generic imperative patterns (fallback)
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
    // -йте (plural imperative for -ать verbs: читайте → читать)
    if (word.endsWith('йте') && word.length > 5) {
      return normalized(word.slice(0, -3) + 'ть', 0.8, {
        removedSuffixes: ['йте'],
        conjugationType: 'imperative',
      });
    }

    // -ите (2nd person plural/formal imperative)
    if (word.endsWith('ите') && word.length > 5) {
      return normalized(word.slice(0, -3) + 'ить', 0.8, {
        removedSuffixes: ['ите'],
        conjugationType: 'imperative',
      });
    }

    // -й → -ть (e.g., читай → читать — strip й, add ть)
    if (word.endsWith('й') && word.length > 3) {
      return normalized(word.slice(0, -1) + 'ть', 0.75, {
        removedSuffixes: ['й'],
        conjugationType: 'imperative',
      });
    }

    // -и (2nd person singular imperative for -ить verbs)
    // e.g., говори → говорить
    if (word.endsWith('и') && word.length > 3) {
      return normalized(word + 'ть', 0.7, {
        removedSuffixes: ['и→ить'],
        conjugationType: 'imperative',
      });
    }

    return null;
  }

  /**
   * Try past tense → infinitive.
   *
   * Russian past tense endings:
   * - masculine: -л (делал → делать)
   * - feminine: -ла (делала → делать)
   * - neuter: -ло (делало → делать)
   * - plural: -ли (делали → делать)
   */
  private tryPastTenseNormalization(word: string): NormalizationResult | null {
    // Long suffixes first
    // -ала/-ила/-ола/-ула → -ать/-ить/-оть/-уть
    if (word.endsWith('ала') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ать', 0.85, {
        removedSuffixes: ['ала'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('ила') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ить', 0.85, {
        removedSuffixes: ['ила'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('ело') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'еть', 0.82, {
        removedSuffixes: ['ело'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('або') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ать', 0.82, {
        removedSuffixes: ['або'],
        conjugationType: 'past',
      });
    }

    // -али/-или → -ать/-ить (plural past)
    if (word.endsWith('али') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ать', 0.85, {
        removedSuffixes: ['али'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('или') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ить', 0.85, {
        removedSuffixes: ['или'],
        conjugationType: 'past',
      });
    }

    // -ал/-ил → -ать/-ить (masculine past)
    if (word.endsWith('ал') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ать', 0.82, {
        removedSuffixes: ['ал'],
        conjugationType: 'past',
      });
    }
    if (word.endsWith('ил') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ить', 0.82, {
        removedSuffixes: ['ил'],
        conjugationType: 'past',
      });
    }

    return null;
  }

  /**
   * Try present tense → infinitive.
   *
   * Russian present tense endings (imperfective verbs):
   * 1st conj: -ю/-у, -ешь, -ет, -ем, -ете, -ют/-ут
   * 2nd conj: -ю/-у, -ишь, -ит, -им, -ите, -ят/-ат
   */
  private tryPresentTenseNormalization(word: string): NormalizationResult | null {
    // 2nd conjugation patterns (more specific, check first)
    // -ишь → -ить
    if (word.endsWith('ишь') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ить', 0.8, {
        removedSuffixes: ['ишь'],
        conjugationType: 'present',
      });
    }
    // -ит → -ить
    if (word.endsWith('ит') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ить', 0.78, {
        removedSuffixes: ['ит'],
        conjugationType: 'present',
      });
    }
    // -им → -ить
    if (word.endsWith('им') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ить', 0.78, {
        removedSuffixes: ['им'],
        conjugationType: 'present',
      });
    }
    // -ят → -ить (3rd plural, 2nd conj)
    if (word.endsWith('ят') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ить', 0.78, {
        removedSuffixes: ['ят'],
        conjugationType: 'present',
      });
    }

    // 1st conjugation patterns
    // -ешь → -ать (or -еть)
    if (word.endsWith('ешь') && word.length > 4) {
      return normalized(word.slice(0, -3) + 'ать', 0.75, {
        removedSuffixes: ['ешь'],
        conjugationType: 'present',
      });
    }
    // -ет → -ать (or -еть)
    if (word.endsWith('ет') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ать', 0.72, {
        removedSuffixes: ['ет'],
        conjugationType: 'present',
      });
    }
    // -ем → -ать
    if (word.endsWith('ем') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ать', 0.72, {
        removedSuffixes: ['ем'],
        conjugationType: 'present',
      });
    }
    // -ют → -ать (3rd plural, 1st conj)
    if (word.endsWith('ют') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ать', 0.75, {
        removedSuffixes: ['ют'],
        conjugationType: 'present',
      });
    }
    // -ут → -ать (3rd plural, 1st conj variant)
    if (word.endsWith('ут') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ать', 0.72, {
        removedSuffixes: ['ут'],
        conjugationType: 'present',
      });
    }

    return null;
  }
}

// Export singleton instance
export const russianMorphologicalNormalizer = new RussianMorphologicalNormalizer();
