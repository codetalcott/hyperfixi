/**
 * Turkish suffixes (M2 N5, FUSED_FORMS.md Q2). The reader takes a case suffix
 * written onto code after an apostrophe, as Turkish writes one on a name
 * (`#out'a`, `.active'i`), in any harmony form. Renders fuse the suffix with
 * Turkish's own reference words (`sonucu`, `hedefe`), whose harmony their
 * spelling gives, and keep it apart on code until a reviewer picks a code
 * word's harmony.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';
import { spaceApostropheSuffixes } from '../src/tokenizers/apostrophe-suffixes';

describe('tr reads a suffix written onto code', () => {
  it.each([
    ['tıklama i üzerinde "x"\'i #out\'a koy', 'on click put "x" into #out'],
    ["tıklama i üzerinde .active'i değiştir", 'on click toggle .active'],
    ["tıklama i üzerinde #b'ye .a'yı ekle", 'on click add .a to #b'],
    ["tıklama i üzerinde $x'i 5'e ayarla", 'on click set $x to 5'],
    ['tıklama i üzerinde #out’tan .a’yı kaldır', 'on click remove .a from #out'],
    // The spaced form still reads.
    ['tıklama i üzerinde "x" i #out e koy', 'on click put "x" into #out'],
  ])('%s', (source, english) => {
    expect(translate(source, 'tr', 'en')).toBe(english);
  });

  it('leaves a string, and a suffix it does not know, alone', () => {
    const suffixes = new Set(['a', 'e', 'i', 'ye']);
    expect(spaceApostropheSuffixes("#out'a koy", suffixes)).toBe('#out a koy');
    expect(spaceApostropheSuffixes('"Ali\'ye" i koy', suffixes)).toBe('"Ali\'ye" i koy');
    expect(spaceApostropheSuffixes("'abc' i koy", suffixes)).toBe("'abc' i koy");
    expect(spaceApostropheSuffixes("#out'tadır koy", suffixes)).toBe("#out'tadır koy");
    expect(translate('tıklama i üzerinde "Ali\'ye" i #out\'a koy', 'tr', 'en')).toBe(
      'on click put "Ali\'ye" into #out'
    );
  });
});

describe('tr fuses a suffix with its own words', () => {
  it.each([
    ['on click put result into #out', 'tıklama i üzerinde sonucu #out e koy'],
    ['on click send foo to the target', 'tıklama i üzerinde hedefe foo i gönder'],
    ['on click remove .a from the target', 'tıklama i üzerinde hedeften .a i kaldır'],
    ['on click put "x" into document', 'tıklama i üzerinde "x" i belgeye koy'],
  ])('%s', (source, expected) => {
    expect(translate(source, 'en', 'tr')).toBe(expected);
    expect(translate(expected, 'tr', 'en')).toBe(translate(source, 'en', 'en'));
  });
});
