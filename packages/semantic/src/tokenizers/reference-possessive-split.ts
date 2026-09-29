/**
 * Split a reference's English possessive off the word it is written onto.
 *
 * qu and uk keep an apostrophe inside a word (qu glottalizes, `t'ikray`; uk
 * writes `м'ясо`), so the renderer's `ruway's type` (event's type) reached the
 * parser as one identifier, `ruway's`, where every other language reads the
 * reference and the possessive apart (es `evento` `'` `s`). qu then read a
 * variable named `ruway`, whose `type` is null, and uk's Cyrillic word left the
 * whole value unreadable (`put подія's into`).
 *
 * Only a stem that is a reference on its own splits: a variable's `obj's`
 * stays one token, which the value extent reads (PR 83).
 */
import type { LanguageToken, TokenStream } from '../types';
import { TokenStreamImpl } from './token-utils';

/**
 * The references the renderer writes with `'s`, by normalized form. Not `me`,
 * `it` or `you`: their possessive is a word of its own (`my`, qu `noqap`).
 */
const REFERENCES: ReadonlySet<string> = new Set([
  'result',
  'event',
  'target',
  'body',
  'detail',
  'document',
  'window',
]);

const POSSESSIVE_WORD = /^(.+)'s$/u;

/**
 * `stream` with each `<reference>'s` identifier replaced by the reference,
 * as `tokenizeWord` reads the stem alone, and the `'` and `s` tokens English
 * writes.
 */
export function splitReferencePossessive(
  stream: TokenStream,
  tokenizeWord: (word: string) => readonly LanguageToken[]
): TokenStream {
  const tokens = stream.tokens;
  if (!tokens.some(t => t.kind === 'identifier' && POSSESSIVE_WORD.test(t.value))) return stream;
  const out: LanguageToken[] = [];
  for (const token of tokens) {
    const stem = token.kind === 'identifier' ? POSSESSIVE_WORD.exec(token.value)?.[1] : undefined;
    const parts = stem ? tokenizeWord(stem) : [];
    const reference = parts.length === 1 ? parts[0] : undefined;
    if (
      !stem ||
      reference?.kind !== 'keyword' ||
      !REFERENCES.has((reference.normalized ?? '').toLowerCase())
    ) {
      out.push(token);
      continue;
    }
    const start = token.position.start;
    const apostrophe = start + stem.length;
    out.push({ ...reference, position: { start, end: apostrophe } });
    out.push({
      value: "'",
      kind: 'identifier',
      position: { start: apostrophe, end: apostrophe + 1 },
    });
    out.push({
      value: 's',
      kind: 'identifier',
      position: { start: apostrophe + 1, end: apostrophe + 2 },
    });
  }
  return new TokenStreamImpl(out, stream.language);
}
