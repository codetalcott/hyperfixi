/**
 * Arabic diacritic (harakat) handling — at the TOKENIZER level.
 *
 * Arabic writes short vowels as optional marks: `بدّل` and `بَدِّل` are the same
 * word, and real Arabic prose (and any learner typing carefully) uses either.
 * The keyword map is INDEXED with and without harakat, but the query used to be
 * exact — so a surface form carrying diacritics the profile did not happen to
 * spell never matched.
 *
 * That is not merely a missed keyword. For a word beginning with one of the
 * proclitic letters (و/ف/ب/ل/ك), the failed `isKeyword` guard in
 * `ArabicProcliticExtractor` handed the word on and the single-char `ب` bi-
 * proclitic claimed it — so `بَدِّل` ("toggle!") tokenized as
 * `kind=particle normalized=with`. A wrong CONCEPT, silently, rather than a
 * parse failure.
 *
 * These tests are at the `tokenize()` level deliberately. `test/morphology.test.ts`
 * covers the normalizer, and the vocab gate's V4 check calls `classifyToken`
 * (a direct map lookup) — neither runs the extractor pipeline, which is exactly
 * why this survived. Anything asserting diacritic behaviour must go through
 * `tokenize()`.
 */
import { describe, it, expect } from 'vitest';
import { getTokenizer, parse } from '../src/index';

const tokenize = (input: string) => getTokenizer('ar').tokenize(input).tokens;

describe('Arabic diacritics — tokenizer', () => {
  it('a diacritized keyword resolves to the same concept as the bare form', () => {
    const bare = tokenize('بدّل')[0];
    const diacritized = tokenize('بَدِّل')[0];

    expect(bare.kind).toBe('keyword');
    expect(bare.normalized).toBe('toggle');
    expect(diacritized.kind).toBe('keyword');
    expect(diacritized.normalized).toBe('toggle');
  });

  // The regression that motivated this file: `ب` is the bi- ("with") preposition
  // proclitic, so a toggle imperative starting with ب was claimed by it.
  it('does not mistake a diacritized keyword for the bi- proclitic', () => {
    const [first] = tokenize('بَدِّل');
    expect(first.kind).not.toBe('particle');
    expect(first.normalized).not.toBe('with');
    expect(first.value).not.toBe('ب');
  });

  it.each([
    ['أضِف', 'add'],
    ['احذِف', 'remove'],
    ['أظهِر', 'show'],
    ['أرسِل', 'send'],
    ['اذهَب', 'go'],
  ])('%s resolves to %s', (word, concept) => {
    const [tok] = tokenize(word);
    expect(tok.kind).toBe('keyword');
    expect(tok.normalized).toBe(concept);
  });

  // The bi- proclitic must still work where it genuinely IS a proclitic — the
  // fix is miss-only, so nothing that resolved before may change.
  it('still reads a real bi- proclitic as a particle', () => {
    const [first] = tokenize('بسرعة');
    expect(first.value).toBe('ب');
    expect(first.normalized).toBe('with');
  });

  it('parses a command written with full harakat', () => {
    const node = parse('بَدِّل .active', 'ar');
    expect(node).not.toBeNull();
    expect((node as { action?: string }).action).toBe('toggle');
  });

  // `measure` used to list both `قِس` and `قس` because the bare form could not
  // reach the diacritized entry. Only the diacritized one is declared now.
  it('reaches a diacritics-only profile entry from the bare surface form', () => {
    const [tok] = tokenize('قس');
    expect(tok.kind).toBe('keyword');
    expect(tok.normalized).toBe('measure');
  });
});
