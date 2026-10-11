/**
 * Bengali letters, for the locative written onto a word (M2 N4): the vowel
 * sign `ে` after a consonant (`ক্লিকে`), `তে` after a vowel (`জমাতে`). Shared
 * by the render (explicit/attached-markers.ts) and bn's reader (bengali.ts),
 * and kept apart from both so a language module copies neither.
 */

/** A Bengali consonant letter (U+0995–U+09B9, the nukta letters, khanda ta) at the end. */
const BN_CONSONANT = /[ক-হড়-য়ৎ]$/u;
/** A Bengali vowel at the end: a vowel sign or an independent vowel. */
const BN_VOWEL = /[া-ৌঅ-ঔ]$/u;

/** Does a Bengali word end in a consonant letter (so a vowel sign may follow it)? */
export const endsInBengaliConsonant = (word: string): boolean => BN_CONSONANT.test(word);

/**
 * The locative written onto a Bengali word: the vowel sign `ে` after a
 * consonant (`ক্লিকে`, which reads as `ক্লিক` + `এ`), `তে` after a vowel
 * (`জমাতে`); undefined after anything else (a hasant, an anusvara).
 */
export function bengaliLocative(word: string): string | undefined {
  if (BN_CONSONANT.test(word)) return `${word}ে`;
  if (BN_VOWEL.test(word)) return `${word}তে`;
  return undefined;
}
