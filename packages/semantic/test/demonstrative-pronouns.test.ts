/**
 * A neuter demonstrative is `it`, as it already was in most profiles (pt `isso`, fr `ça`, ru
 * `это`, he `זה`, ja `それ`). es read `eso`, `esto` and a detached `lo` as variables, so
 * `poner eso en #o` came back `put eso into #o`, which puts nothing, with no error; pt `isto` and
 * fr `cela`/`ceci` did the same beside the `isso` and `ça` they read. Render is unchanged.
 *
 * A variable spelled like one of these words now reads as `it` in that language, as a variable
 * named `isso` already did in pt: translate_code warns NAME_COLLISION with a rename.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { findTranslationCollisions, translate } from '../src/index';

describe('a neuter demonstrative is it', () => {
  it.each([
    ['es', 'poner eso en #o'],
    ['es', 'poner esto en #o'],
    ['es', 'poner lo en #o'],
    ['es', 'ponerlo en #o'],
    ['pt', 'colocar isto em #o'],
    ['pt', 'colocar isso em #o'],
    ['fr', 'mettre cela dans #o'],
    ['fr', 'mettre ceci dans #o'],
  ])('%s: %s', (lang, source) => {
    expect(translate(source, lang, 'en')).toBe('put it into #o');
  });

  it('inside a handler', () => {
    expect(translate('al hacer clic poner eso en #o', 'es', 'en')).toBe('on click put it into #o');
  });

  it('es `de lo contrario` is still else', () => {
    expect(
      translate('si x entonces poner 1 en #o de lo contrario poner 2 en #o fin', 'es', 'en')
    ).toBe('if x put 1 into #o else put 2 into #o end');
  });

  it('what `it` renders to does not move', () => {
    expect(translate('put it into #o', 'en', 'es')).toBe('ponerlo en #o');
    expect(translate('put it into #o', 'en', 'fr')).toBe('le mettre dans #o');
  });

  it('a variable named like one is a collision translate_code reports', () => {
    const [finding] = findTranslationCollisions('set lo to 1 then put lo into #o', 'en', 'es');
    expect(finding?.name).toBe('lo');
    expect(finding?.collision).toBe('pronoun');
  });
});
