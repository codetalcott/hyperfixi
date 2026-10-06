/**
 * Hyperscript's line comments, as the engine reads them.
 *
 * `--` or `//`, followed by whitespace, the end of the input, or a third `-`
 * / `/`, starts a comment that runs to the end of the line (upstream's and
 * `@hyperfixi/engine`'s tokenizer rule). A URL's `//` (`http://x`) and a
 * string's contents are not comments. The parser read a comment as code:
 * `put 1 into me -- note` left `- - note` unread, and `// note` became a URL.
 */

/** Is `text[i]` a quote that opens a string (not an apostrophe inside a word: `#a's`)? */
function opensString(text: string, i: number): boolean {
  const c = text[i];
  if (c === '"' || c === '`') return true;
  if (c !== "'") return false;
  return !(/[\p{L}\p{N}_]/u.test(text[i - 1] ?? '') && /[\p{L}]/u.test(text[i + 1] ?? ''));
}

/** `input` with each comment replaced by spaces, so every offset stays where it was. */
export function blankComments(input: string): string {
  if (!input.includes('--') && !input.includes('//')) return input;
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c = input[i] as string;
    if (opensString(input, i)) {
      let j = i + 1;
      while (j < input.length && input[j] !== c) j += input[j] === '\\' ? 2 : 1;
      out += input.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const after = input[i + 2];
    if (
      (c === '-' || c === '/') &&
      input[i + 1] === c &&
      (after === undefined || /\s/.test(after) || after === c)
    ) {
      let j = i;
      while (j < input.length && input[j] !== '\n' && input[j] !== '\r') j++;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
