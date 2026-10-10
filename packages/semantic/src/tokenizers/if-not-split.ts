/**
 * Split a merged `<if> <not>` keyword back into `if` and `not`.
 *
 * The renderer writes `if not flag` word by word, and in two languages the
 * pair is another keyword the tokenizer takes whole: bn `যদি না` is its
 * `unless`, and vi `nếu không` an alternative `else` ("otherwise"). So `if not
 * flag … else … end` read back bn `unless me`, vi a bare `put`, and the
 * condition and the branch structure were lost.
 *
 * Position tells them apart. The condition of `if not` follows the pair, and
 * nothing that ends an operand comes before it: bn writes `unless` after its
 * condition (`flag যদি না`), and vi's `else` follows the branch before it
 * (`… vào #out nếu không đặt …`) and runs into a command verb.
 */
import type { LanguageToken, TokenStream } from '../types';
import { TokenStreamImpl } from './token-utils';

/** Keywords that are whole operands: literals and references. */
const OPERAND_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'me',
  'my',
  'it',
  'its',
  'you',
  'your',
  'result',
  'event',
  'target',
  'body',
  'document',
  'window',
]);

function isOperand(token: LanguageToken): boolean {
  if (token.kind === 'literal' || token.kind === 'selector') return true;
  if ((token.kind as string) === 'reference') return true;
  if (token.kind === 'identifier') return /^[:$]?[\p{L}_][\p{L}\p{M}\p{N}_]*$/u.test(token.value);
  // A reference written in English (`window.tmp` keeps its base) carries no
  // normalized form: its value is the word.
  return (
    token.kind === 'keyword' &&
    OPERAND_KEYWORDS.has((token.normalized ?? token.value).toLowerCase())
  );
}

function startsOperand(token: LanguageToken | undefined): boolean {
  return !!token && (/^[([-]$/.test(token.value) || isOperand(token));
}

function endsOperand(token: LanguageToken | undefined): boolean {
  return !!token && (token.value === ')' || token.value === ']' || isOperand(token));
}

/**
 * `stream` with each `merged` token (`<if> <not>`, one space) that stands where
 * `if not` does replaced by its two words, each tokenized alone by `tokenizeWord`.
 */
export function splitIfNot(
  stream: TokenStream,
  merged: string,
  tokenizeWord: (word: string) => readonly LanguageToken[]
): TokenStream {
  const tokens = stream.tokens;
  if (!tokens.some(t => t.value === merged)) return stream;
  const out: LanguageToken[] = [];
  tokens.forEach((token, i) => {
    if (token.value !== merged || !startsOperand(tokens[i + 1]) || endsOperand(tokens[i - 1])) {
      out.push(token);
      return;
    }
    const space = merged.indexOf(' ');
    for (const [word, offset] of [
      [merged.slice(0, space), 0],
      [merged.slice(space + 1), space + 1],
    ] as const) {
      const base = token.position.start + offset;
      for (const part of tokenizeWord(word)) {
        out.push({
          ...part,
          position: { start: part.position.start + base, end: part.position.end + base },
        });
      }
    }
  });
  return new TokenStreamImpl(out, stream.language);
}
