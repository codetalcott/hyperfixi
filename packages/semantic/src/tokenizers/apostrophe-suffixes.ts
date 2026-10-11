/**
 * A case suffix written onto code after an apostrophe, as Turkish writes one
 * on a name or an abbreviation (M2 N5, FUSED_FORMS.md Q2): `#out'a`,
 * `.active'i`, `$x'e`, `5'e`, `"x"'i`. The reader takes the marker as a word
 * of its own (`#out a`), so the apostrophe is read as the space it stands
 * for. Every harmony form of a suffix reads (`'a`/`'e`/`'ya`/`'ye`): which
 * one a code word takes depends on how it is read aloud.
 */

/** A character that ends code a suffix can follow: a name, a number, a closing quote or bracket. */
const ENDS_CODE = /[\p{L}\p{N}_\-)\]}"`>*]/u;

/**
 * `input` with each apostrophe (`'` or `’`) that joins code to one of
 * `suffixes` replaced by a space, so positions hold. Not inside a string, and
 * only where no letter follows the suffix (`#out'ta` is not `#out` + `t`…).
 */
export function spaceApostropheSuffixes(input: string, suffixes: ReadonlySet<string>): string {
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
    if ((c === "'" || c === '’') && i > 0 && ENDS_CODE.test(input[i - 1]!)) {
      const suffix = /^\p{L}+/u.exec(input.slice(i + 1))?.[0];
      if (suffix && suffixes.has(suffix.toLowerCase())) {
        out += ' ';
        continue;
      }
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    out += c;
  }
  return out;
}
