/**
 * C3's end word (PR 112): an end word that an operator, `and`, `or` or the
 * copula follows is a value, a variable spelled like it (tr `son`, es and fr
 * `fin`). A block's end is followed by a command, `then`, another end or
 * nothing, never by an operator. Hand-written, tr `eğer son ve flag` (if son
 * and flag) lost its whole `if` — the block scan took `son` for the block's
 * end — and es `set x to fin < 3` read `set x to <`. (A rendered one was
 * already written `(fin)`: the verified render, PR 103.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render, semanticRenderer } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe('an end word before an operator is a value', () => {
  it.each([
    [
      'tr',
      'tıklama i üzerinde eğer son ve flag "Y" i #out e koy son',
      'on click if son and flag put "Y" into #out end',
    ],
    [
      'tr',
      'tıklama i üzerinde eğer son veya flag "Y" i #out e koy son',
      'on click if son or flag put "Y" into #out end',
    ],
    [
      'es',
      'al clic establecer x a fin < 3 entonces poner x en #out',
      'on click set x to fin < 3 then put x into #out',
    ],
    [
      'es',
      'al clic si fin y flag poner 1 en #out fin',
      'on click if fin and flag put 1 into #out end',
    ],
    ['es', 'al clic si fin es 3 poner 1 en #out fin', 'on click if fin is 3 put 1 into #out end'],
    ['fr', 'quand clic mettre fin + 1 dans #out', 'on click put fin + 1 into #out'],
    // tr's `son` reads `last`, and tr lexes `<` as a selector: the join took
    // `son <` for a positional query (`last <`).
    [
      'tr',
      'tıklama i üzerinde x i son < 3 e ayarla ardından x i #out e koy',
      'on click set x to son < 3 then put x into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe('an end word is still the end', () => {
  it.each([
    [
      'tr',
      'tıklama i üzerinde eğer flag "Y" i #out e koy son',
      'on click if flag put "Y" into #out end',
    ],
    [
      'es',
      'al clic si flag poner 1 en #out fin entonces poner 2 en #out',
      'on click if flag put 1 into #out end then put 2 into #out',
    ],
    ['es', 'al clic si flag poner 1 en #out fin fin', 'on click if flag put 1 into #out end'],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe('the render keeps its plain spelling where that reads now', () => {
  // The verified render wrote `(fin)` because the plain render lost it.
  it.each([
    ['es', 'on click set x to fin < 3 then put x into #out'],
    ['tr', 'on click if son and flag then put "Y" into #out end'],
  ])('%s: %s', (language, source) => {
    const node = parse(source, 'en')!;
    const code = render(node, language);
    expect(code).toBe(semanticRenderer.render(node, language));
    expect(english(code, language)).toBe(render(node, 'en'));
  });
});
