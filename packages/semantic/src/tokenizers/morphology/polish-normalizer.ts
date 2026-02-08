/**
 * Polish Morphological Normalizer
 *
 * Normalizes Polish verb forms to their base/infinitive form.
 *
 * Polish verb conjugation is complex with:
 * - Three main conjugation classes (determined by infinitive ending)
 * - Person/number agreement (6 forms per tense)
 * - Aspect pairs (perfective/imperfective)
 *
 * For software UI, Polish uses IMPERATIVE form (unlike most languages):
 * - zapisz (save), otwórz (open), usuń (delete)
 *
 * This normalizer focuses on recognizing imperative forms and
 * mapping them back to their base form for keyword matching.
 */

import type { MorphologicalNormalizer, NormalizationResult } from './types';
import { noChange, normalized } from './types';

/**
 * Common imperative forms used in Polish software UI,
 * mapped to their infinitive counterparts.
 */
const IMPERATIVE_TO_INFINITIVE = new Map<string, string>([
  // Core commands
  ['przełącz', 'przełączać'],
  ['przelacz', 'przelaczac'],
  ['dodaj', 'dodawać'],
  ['usuń', 'usuwać'],
  ['usun', 'usuwac'],
  ['umieść', 'umieszczać'],
  ['umiesc', 'umieszczac'],
  ['wstaw', 'wstawiać'],
  ['ustaw', 'ustawiać'],
  ['pobierz', 'pobierać'],
  ['weź', 'brać'],
  ['wez', 'brac'],
  ['zwiększ', 'zwiększać'],
  ['zwieksz', 'zwiekszac'],
  ['zmniejsz', 'zmniejszać'],
  ['pokaż', 'pokazywać'],
  ['pokaz', 'pokazywac'],
  ['ukryj', 'ukrywać'],
  ['schowaj', 'schowywać'],
  ['czekaj', 'czekać'],
  ['poczekaj', 'poczekać'],
  ['idź', 'iść'],
  ['idz', 'isc'],
  ['przejdź', 'przejść'],
  ['przejdz', 'przejsc'],
  ['wywołaj', 'wywoływać'],
  ['wywolaj', 'wywolywac'],
  ['wyślij', 'wysyłać'],
  ['wyslij', 'wysylac'],
  ['loguj', 'logować'],
  ['wypisz', 'wypisywać'],
  ['sklonuj', 'sklonować'],
  ['kopiuj', 'kopiować'],
  ['zamień', 'zamieniać'],
  ['zamien', 'zamieniac'],
  ['utwórz', 'tworzyć'],
  ['utworz', 'tworzyc'],
  ['stwórz', 'stwarzać'],
  ['stworz', 'stwarzac'],
  ['skup', 'skupiać'],
  ['rozmyj', 'rozmywać'],
  ['nawiguj', 'nawigować'],
  ['załaduj', 'ładować'],
  ['zaladuj', 'ladowac'],
  ['powtórz', 'powtarzać'],
  ['powtorz', 'powtarzac'],
  ['kontynuuj', 'kontynuować'],
  ['zatrzymaj', 'zatrzymywać'],
  ['przerwij', 'przerywać'],
  ['rzuć', 'rzucać'],
  ['rzuc', 'rzucac'],
  ['zwróć', 'zwracać'],
  ['zwroc', 'zwracac'],
  ['inicjuj', 'inicjować'],
  ['zainstaluj', 'instalować'],
  ['zmierz', 'mierzyć'],
]);

/**
 * Polish Morphological Normalizer
 *
 * Key patterns:
 * - Imperative suffixes: -aj, -ij, -uj (2nd person singular)
 * - Infinitive endings: -ać, -eć, -ić, -yć, -ąć
 * - Present tense endings: -am, -em, -ę, -asz, -esz, -isz, -ysz
 */
export class PolishMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'pl';

  /**
   * Check if a word appears to be a Polish verb form that can be normalized.
   */
  isNormalizable(word: string): boolean {
    if (word.length < 3) return false;
    // Check for Polish-specific characters or Latin letters
    return /[a-zA-ZąęćńóśźżłĄĘĆŃÓŚŹŻŁ]/.test(word);
  }

  /**
   * Normalize a Polish verb to its base/infinitive form.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Already in infinitive form (-ać, -eć, -ić, -yć, -ąć, -ować)?
    if (this.isInfinitive(lower)) {
      return noChange(lower);
    }

    // Try imperative normalization
    const imperativeResult = this.tryImperativeNormalization(lower);
    if (imperativeResult) return imperativeResult;

    // Try past tense normalization (before present — longer suffixes like -ałem vs -em)
    const pastResult = this.tryPastTenseNormalization(lower);
    if (pastResult) return pastResult;

    // Try present tense normalization
    const presentResult = this.tryPresentTenseNormalization(lower);
    if (presentResult) return presentResult;

    // Return as-is if no normalization found
    return noChange(lower);
  }

  /**
   * Check if word is already in infinitive form.
   */
  private isInfinitive(word: string): boolean {
    const infinitiveEndings = ['ać', 'eć', 'ić', 'yć', 'ąć', 'ować', 'iwać', 'ywać'];
    return infinitiveEndings.some(ending => word.endsWith(ending));
  }

  /**
   * Try to normalize imperative form to infinitive.
   *
   * Polish imperative (2nd person singular) patterns:
   * - pisać → pisz (write)
   * - czytać → czytaj (read)
   * - robić → rób (do)
   * - mówić → mów (speak)
   * - uczyć → ucz (teach)
   */
  private tryImperativeNormalization(word: string): NormalizationResult | null {
    if (IMPERATIVE_TO_INFINITIVE.has(word)) {
      return normalized(IMPERATIVE_TO_INFINITIVE.get(word)!, 0.95, {
        removedSuffixes: ['imperative'],
        conjugationType: 'imperative',
      });
    }

    // Generic imperative pattern: ends in consonant or -j
    // Try to reconstruct infinitive

    // Pattern: -aj → -ać (czytaj → czytać)
    if (word.endsWith('aj')) {
      return normalized(word.slice(0, -2) + 'ać', 0.8, {
        removedSuffixes: ['aj'],
        conjugationType: 'imperative',
      });
    }

    // Pattern: -uj → -ować (kopiuj → kopiować)
    if (word.endsWith('uj')) {
      return normalized(word.slice(0, -2) + 'ować', 0.8, {
        removedSuffixes: ['uj'],
        conjugationType: 'imperative',
      });
    }

    // Pattern: -ij → -ić (rób → robić - irregular)
    if (word.endsWith('ij')) {
      return normalized(word.slice(0, -2) + 'ić', 0.75, {
        removedSuffixes: ['ij'],
        conjugationType: 'imperative',
      });
    }

    return null;
  }

  /**
   * Try to normalize present tense form to infinitive.
   */
  private tryPresentTenseNormalization(word: string): NormalizationResult | null {
    // Pattern: -uję → -ować (pracuję → pracować) — check before -am/-em
    if (word.endsWith('uję') || word.endsWith('uje')) {
      return normalized(word.slice(0, -3) + 'ować', 0.85, {
        removedSuffixes: ['uję'],
        conjugationType: 'present',
      });
    }

    // Pattern: -am → -ać (czytam → czytać)
    if (word.endsWith('am') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'ać', 0.8, {
        removedSuffixes: ['am'],
        conjugationType: 'present',
      });
    }

    // Pattern: -em → -eć (rozumiem → rozumieć)
    if (word.endsWith('em') && word.length > 3) {
      return normalized(word.slice(0, -2) + 'eć', 0.75, {
        removedSuffixes: ['em'],
        conjugationType: 'present',
      });
    }

    // Pattern: -ę → -ać/-eć (piszę → pisać)
    if (word.endsWith('ę') && word.length > 2) {
      return normalized(word.slice(0, -1) + 'ać', 0.7, {
        removedSuffixes: ['ę'],
        conjugationType: 'present',
      });
    }

    return null;
  }

  /**
   * Try to normalize past tense form to infinitive.
   */
  private tryPastTenseNormalization(word: string): NormalizationResult | null {
    // Pattern: -ałem/-ałam → -ać (czytałem → czytać)
    if (word.endsWith('ałem') || word.endsWith('ałam')) {
      return normalized(word.slice(0, -4) + 'ać', 0.85, {
        removedSuffixes: [word.slice(-4)],
        conjugationType: 'past',
      });
    }

    // Pattern: -ał/-ała → -ać (czytał → czytać)
    if (word.endsWith('ał') || word.endsWith('ała')) {
      const suffixLen = word.endsWith('ała') ? 3 : 2;
      return normalized(word.slice(0, -suffixLen) + 'ać', 0.8, {
        removedSuffixes: [word.slice(-suffixLen)],
        conjugationType: 'past',
      });
    }

    // Pattern: -iłem/-iłam → -ić (robiłem → robić)
    if (
      word.endsWith('iłem') ||
      word.endsWith('iłam') ||
      word.endsWith('ilem') ||
      word.endsWith('ilam')
    ) {
      return normalized(word.slice(0, -4) + 'ić', 0.85, {
        removedSuffixes: [word.slice(-4)],
        conjugationType: 'past',
      });
    }

    // Pattern: -ił/-iła → -ić (robił → robić)
    if (
      word.endsWith('ił') ||
      word.endsWith('iła') ||
      word.endsWith('il') ||
      word.endsWith('ila')
    ) {
      const suffixLen = word.endsWith('iła') || word.endsWith('ila') ? 3 : 2;
      return normalized(word.slice(0, -suffixLen) + 'ić', 0.8, {
        removedSuffixes: [word.slice(-suffixLen)],
        conjugationType: 'past',
      });
    }

    return null;
  }
}

// Export singleton instance
export const polishMorphologicalNormalizer = new PolishMorphologicalNormalizer();
