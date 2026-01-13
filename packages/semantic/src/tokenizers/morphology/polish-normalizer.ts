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

export interface NormalizationResult {
  stem: string;
  suffix?: string;
  confidence: number;
  originalForm?: string;
}

/**
 * Polish Morphological Normalizer
 *
 * Key patterns:
 * - Imperative suffixes: -aj, -ij, -uj (2nd person singular)
 * - Infinitive endings: -ać, -eć, -ić, -yć, -ąć
 * - Present tense endings: -am, -em, -ę, -asz, -esz, -isz, -ysz
 */
export class PolishMorphologicalNormalizer {
  /**
   * Normalize a Polish verb to its base/infinitive form
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Already in infinitive form (-ać, -eć, -ić, -yć, -ąć, -ować)?
    if (this.isInfinitive(lower)) {
      return { stem: lower, confidence: 1.0 };
    }

    // Try imperative normalization
    const imperativeResult = this.tryImperativeNormalization(lower);
    if (imperativeResult) return imperativeResult;

    // Try present tense normalization
    const presentResult = this.tryPresentTenseNormalization(lower);
    if (presentResult) return presentResult;

    // Try past tense normalization
    const pastResult = this.tryPastTenseNormalization(lower);
    if (pastResult) return pastResult;

    // Return as-is if no normalization found
    return { stem: lower, confidence: 0.5, originalForm: word };
  }

  /**
   * Check if word is already in infinitive form
   */
  private isInfinitive(word: string): boolean {
    const infinitiveEndings = ['ać', 'eć', 'ić', 'yć', 'ąć', 'ować', 'iwać', 'ywać'];
    return infinitiveEndings.some(ending => word.endsWith(ending));
  }

  /**
   * Try to normalize imperative form to infinitive
   *
   * Polish imperative (2nd person singular) patterns:
   * - pisać → pisz (write)
   * - czytać → czytaj (read)
   * - robić → rób (do)
   * - mówić → mów (speak)
   * - uczyć → ucz (teach)
   */
  private tryImperativeNormalization(word: string): NormalizationResult | null {
    // Common imperative forms used in Polish software UI
    const imperativeToInfinitive: Map<string, string> = new Map([
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

    if (imperativeToInfinitive.has(word)) {
      return {
        stem: imperativeToInfinitive.get(word)!,
        suffix: 'imperative',
        confidence: 0.95,
        originalForm: word,
      };
    }

    // Generic imperative pattern: ends in consonant or -j
    // Try to reconstruct infinitive

    // Pattern: -aj → -ać (czytaj → czytać)
    if (word.endsWith('aj')) {
      const stem = word.slice(0, -2) + 'ać';
      return { stem, suffix: 'aj', confidence: 0.8, originalForm: word };
    }

    // Pattern: -uj → -ować (kopiuj → kopiować)
    if (word.endsWith('uj')) {
      const stem = word.slice(0, -2) + 'ować';
      return { stem, suffix: 'uj', confidence: 0.8, originalForm: word };
    }

    // Pattern: -ij → -ić (rób → robić - irregular)
    if (word.endsWith('ij')) {
      const stem = word.slice(0, -2) + 'ić';
      return { stem, suffix: 'ij', confidence: 0.75, originalForm: word };
    }

    return null;
  }

  /**
   * Try to normalize present tense form to infinitive
   */
  private tryPresentTenseNormalization(word: string): NormalizationResult | null {
    // Pattern: -am → -ać (czytam → czytać)
    if (word.endsWith('am')) {
      const stem = word.slice(0, -2) + 'ać';
      return { stem, suffix: 'am', confidence: 0.8, originalForm: word };
    }

    // Pattern: -em → -eć (rozumiem → rozumieć)
    if (word.endsWith('em') && word.length > 3) {
      const stem = word.slice(0, -2) + 'eć';
      return { stem, suffix: 'em', confidence: 0.75, originalForm: word };
    }

    // Pattern: -ę → -ać/-eć (piszę → pisać)
    if (word.endsWith('ę')) {
      const stem = word.slice(0, -1) + 'ać';
      return { stem, suffix: 'ę', confidence: 0.7, originalForm: word };
    }

    // Pattern: -uję → -ować (pracuję → pracować)
    if (word.endsWith('uję') || word.endsWith('uje')) {
      const stem = word.slice(0, -3) + 'ować';
      return { stem, suffix: 'uję', confidence: 0.85, originalForm: word };
    }

    return null;
  }

  /**
   * Try to normalize past tense form to infinitive
   */
  private tryPastTenseNormalization(word: string): NormalizationResult | null {
    // Pattern: -ałem/-ałam → -ać (czytałem → czytać)
    if (word.endsWith('ałem') || word.endsWith('ałam')) {
      const stem = word.slice(0, -4) + 'ać';
      return { stem, suffix: word.slice(-4), confidence: 0.85, originalForm: word };
    }

    // Pattern: -ał/-ała → -ać (czytał → czytać)
    if (word.endsWith('ał') || word.endsWith('ała')) {
      const suffixLen = word.endsWith('ała') ? 3 : 2;
      const stem = word.slice(0, -suffixLen) + 'ać';
      return { stem, suffix: word.slice(-suffixLen), confidence: 0.8, originalForm: word };
    }

    // Pattern: -iłem/-iłam → -ić (robiłem → robić)
    if (
      word.endsWith('iłem') ||
      word.endsWith('iłam') ||
      word.endsWith('ilem') ||
      word.endsWith('ilam')
    ) {
      const stem = word.slice(0, -4) + 'ić';
      return { stem, suffix: word.slice(-4), confidence: 0.85, originalForm: word };
    }

    // Pattern: -ił/-iła → -ić (robił → robić)
    if (
      word.endsWith('ił') ||
      word.endsWith('iła') ||
      word.endsWith('il') ||
      word.endsWith('ila')
    ) {
      const suffixLen = word.endsWith('iła') || word.endsWith('ila') ? 3 : 2;
      const stem = word.slice(0, -suffixLen) + 'ić';
      return { stem, suffix: word.slice(-suffixLen), confidence: 0.8, originalForm: word };
    }

    return null;
  }

  /**
   * Check if two words are morphologically related
   */
  areMorphologicallyRelated(word1: string, word2: string): boolean {
    const norm1 = this.normalize(word1);
    const norm2 = this.normalize(word2);

    // Same stem
    if (norm1.stem === norm2.stem) return true;

    // Check if one is prefix of the other (for aspectual pairs)
    const stems = [norm1.stem, norm2.stem].sort((a, b) => a.length - b.length);
    if (stems[1].endsWith(stems[0].slice(-4))) return true;

    return false;
  }
}
