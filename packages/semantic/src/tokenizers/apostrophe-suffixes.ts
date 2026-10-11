/**
 * Apostrophes a reader reads as the space they stand for (M2 N5, N3).
 *
 * A case suffix written onto code after an apostrophe, as Turkish writes one
 * on a name or an abbreviation (M2 N5, FUSED_FORMS.md Q2): `#out'a`,
 * `.active'i`, `$x'e`, `5'e`, `"x"'i`. The reader takes the marker as a word
 * of its own (`#out a`), so the apostrophe is read as the space it stands
 * for. Every harmony form of a suffix reads (`'a`/`'e`/`'ya`/`'ye`): which
 * one a code word takes depends on how it is read aloud.
 *
 * And an elided clitic before its verb (fr `l'afficher`, `m'afficher`, FUSED_FORMS.md
 * Q1): the clitic is read as a word of its own.
 */

/** A character that ends code a suffix can follow: a name, a number, a closing quote or bracket. */
const ENDS_CODE = /[\p{L}\p{N}_\-)\]}"`>*]/u;

/** A character of a word: an apostrophe after one is inside the word (`jusqu'à`), not a quote. */
const WORD = /[\p{L}\p{M}\p{N}_]/u;

/**
 * `input` with each apostrophe (`'` or `’`) that `joins` accepts replaced by a
 * space, so positions hold. Never inside a string; an apostrophe inside a word
 * opens none.
 */
function spaceApostrophes(input: string, joins: (at: number) => boolean): string {
  if (!input.includes("'") && !input.includes('’')) return input;
  let out = '';
  let quote: string | undefined;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (quote !== undefined) {
      out += c;
      if (c === '\\') out += input[++i] ?? '';
      else if (c === quote) quote = undefined;
      continue;
    }
    if (c === "'" || c === '’') {
      if (i > 0 && joins(i)) {
        out += ' ';
        continue;
      }
      if (c === '’' || WORD.test(input[i - 1] ?? '')) {
        out += c;
        continue;
      }
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    out += c;
  }
  return out;
}

/**
 * `input` with each apostrophe that joins code to one of `suffixes` replaced
 * by a space (tr `#out'a` reads as `#out a`), where no letter follows the
 * suffix (`#out'ta` is not `#out` + `t`…).
 */
export function spaceApostropheSuffixes(input: string, suffixes: ReadonlySet<string>): string {
  return spaceApostrophes(input, i => {
    if (!ENDS_CODE.test(input[i - 1]!)) return false;
    const suffix = /^\p{L}+/u.exec(input.slice(i + 1))?.[0];
    return !!suffix && suffixes.has(suffix.toLowerCase());
  });
}

/**
 * `input` with the apostrophe of an elided word before another replaced by a
 * space: fr `l'afficher` reads as `l afficher`, the clitic apart from its verb
 * (splitObjectClitics). Only the words in `elided`, whole.
 */
export function spaceElisions(input: string, elided: ReadonlySet<string>): string {
  return spaceApostrophes(input, i => {
    const word = /(?:^|[^\p{L}\p{M}\p{N}_])(\p{L}+)$/u.exec(input.slice(0, i))?.[1];
    return !!word && elided.has(word.toLowerCase()) && /\p{L}/u.test(input[i + 1] ?? '');
  });
}
