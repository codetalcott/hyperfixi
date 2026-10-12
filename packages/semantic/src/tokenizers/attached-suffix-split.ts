/**
 * A role marker read off the word it is written onto (M2 N4, N5): bn `ক্লিকে`
 * (`ক্লিক` + the locative, written as the vowel sign after a consonant),
 * `জমাতে` (`জমা` + `তে`); tr `tıklamada` (`tıklama` + `da`). ko's and ja's
 * extractors split a particle off any word; bn's and tr's read a word of their
 * script whole, so this pass splits one that is not a keyword itself but a
 * keyword with a suffix the language attaches. Only a known word of the
 * language splits: a name that merely ends like a suffix stays a name (tr
 * `meta`, `sayfada`).
 */
import type { LanguageToken, TokenStream } from '../types';
import { TokenStreamImpl } from './token-utils';

export interface AttachedSuffix {
  /** The suffix as written on the word. */
  readonly written: string;
  /** The marker the reader gives back for it (bn `ে` reads as `তে`). */
  readonly marker: string;
}

export function splitAttachedSuffixes(
  stream: TokenStream,
  suffixes: readonly AttachedSuffix[],
  tokenizeWord: (word: string) => readonly LanguageToken[]
): TokenStream {
  const tokens = stream.tokens;
  const out: LanguageToken[] = [];
  let changed = false;
  for (const token of tokens) {
    let split = false;
    if (token.kind === 'identifier') {
      for (const { written, marker } of suffixes) {
        if (token.value.length <= written.length || !token.value.endsWith(written)) continue;
        const stem = token.value.slice(0, -written.length);
        const read = tokenizeWord(stem);
        const word = read.length === 1 ? read[0]! : undefined;
        // A word of the language: a keyword with a translation. An English name
        // the reader passes through is not one (tr `meta` is not `me` + `ta`).
        if (word?.kind !== 'keyword' || word.normalized === undefined) continue;
        const particle = tokenizeWord(marker);
        if (particle.length !== 1) continue;
        const { start, end } = token.position;
        const cut = end - written.length;
        out.push({ ...word, position: { start, end: cut } });
        out.push({ ...particle[0]!, position: { start: cut, end } });
        split = changed = true;
        break;
      }
    }
    if (!split) out.push(token);
  }
  return changed ? new TokenStreamImpl(out, stream.language) : stream;
}
