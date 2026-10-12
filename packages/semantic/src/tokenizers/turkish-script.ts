/**
 * Turkish vowel harmony, for the locative written onto a word of the language
 * (M2 N4): `tıklamada`, `yüklemede`, `değişiklikte`. The suffix's vowel follows
 * the word's last vowel (back `a` / front `e`), its consonant the word's last
 * letter (`t` after a voiceless one, else `d`). Apart from the render and the
 * reader so a language module copies neither.
 */

const VOWELS = /[aeıioöuü]/gu;
const BACK = new Set(['a', 'ı', 'o', 'u']);
const VOICELESS = new Set(['ç', 'f', 'h', 'k', 'p', 's', 'ş', 't']);
/** The four locative suffixes. */
export const TR_LOCATIVES: ReadonlySet<string> = new Set(['da', 'de', 'ta', 'te']);

/** The locative suffix `word` takes, or undefined for a word with no vowel. */
export function turkishLocative(word: string): string | undefined {
  const lower = word.toLowerCase();
  const vowels = lower.match(VOWELS);
  if (!vowels) return undefined;
  const consonant = VOICELESS.has(lower[lower.length - 1]!) ? 't' : 'd';
  return consonant + (BACK.has(vowels[vowels.length - 1]!) ? 'a' : 'e');
}
