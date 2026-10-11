/**
 * Bengali letters, for the locative written onto a word (M2 N4): the vowel
 * sign `ে` after a consonant (`ক্লিকে`), `তে` after a vowel (`জমাতে`). Shared
 * for the render (explicit/attached-markers.ts); apart from it so a language
 * module (bn's reader) copies none of it.
 */

/** A Bengali consonant letter (U+0995–U+09B9, the nukta letters, khanda ta) at the end. */
const BN_CONSONANT = /[ক-হড়-য়ৎ]$/u;
/** A Bengali vowel at the end: a vowel sign or an independent vowel. */
const BN_VOWEL = /[া-ৌঅ-ঔ]$/u;

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
