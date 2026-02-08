/**
 * Character Classifiers
 *
 * Unicode range classification and Latin character classifier factories.
 * Used by language-specific tokenizers to define character sets.
 */

// =============================================================================
// Unicode Range Classification
// =============================================================================

/**
 * Unicode range tuple: [start, end] (inclusive).
 */
export type UnicodeRange = readonly [number, number];

/**
 * Create a character classifier for Unicode ranges.
 * Returns a function that checks if a character's code point falls within any of the ranges.
 *
 * @example
 * // Japanese Hiragana
 * const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);
 *
 * // Korean (Hangul syllables + Jamo)
 * const isKorean = createUnicodeRangeClassifier([
 *   [0xac00, 0xd7a3],  // Hangul syllables
 *   [0x1100, 0x11ff],  // Hangul Jamo
 *   [0x3130, 0x318f],  // Hangul Compatibility Jamo
 * ]);
 */
export function createUnicodeRangeClassifier(
  ranges: readonly UnicodeRange[]
): (char: string) => boolean {
  return (char: string): boolean => {
    const code = char.charCodeAt(0);
    return ranges.some(([start, end]) => code >= start && code <= end);
  };
}

/**
 * Combine multiple character classifiers into one.
 * Returns true if any of the classifiers return true.
 *
 * @example
 * const isJapanese = combineClassifiers(isHiragana, isKatakana, isKanji);
 */
export function combineClassifiers(
  ...classifiers: Array<(char: string) => boolean>
): (char: string) => boolean {
  return (char: string): boolean => classifiers.some(fn => fn(char));
}

/**
 * Character classifiers for a Latin-based language.
 */
export interface LatinCharClassifiers {
  /** Check if character is a letter in this language (including accented chars). */
  isLetter: (char: string) => boolean;
  /** Check if character is part of an identifier (letter, digit, underscore, hyphen). */
  isIdentifierChar: (char: string) => boolean;
}

/**
 * Create character classifiers for a Latin-based language.
 * Returns isLetter and isIdentifierChar functions based on the provided regex.
 *
 * @example
 * // Spanish letters
 * const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/);
 *
 * // German letters
 * const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-ZäöüÄÖÜß]/);
 */
export function createLatinCharClassifiers(letterPattern: RegExp): LatinCharClassifiers {
  const isLetter = (char: string): boolean => letterPattern.test(char);
  const isIdentifierChar = (char: string): boolean => isLetter(char) || /[0-9_-]/.test(char);
  return { isLetter, isIdentifierChar };
}
