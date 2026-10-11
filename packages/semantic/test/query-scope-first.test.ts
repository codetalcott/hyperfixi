/**
 * A query's scope written before it, as a verb-final language writes a
 * modifier (M2 N3, `profile.queryScopeFirst`): tr `bendeki <p/>` (the `<p/>`
 * in me), hi `मुझ में स्थित <p/>`, bn `আমাতে থাকা <p/>`, ja `自分 の中の <p/>`,
 * ko `나 안의 <p/>`, where renders wrote English's order (`<p/> içinde ben`).
 * The matcher reads it at a role; English's order still reads.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

describe('the scope before the query', () => {
  it.each([
    ['tr', 'on click hide <p/> in me', 'tıklama i üzerinde bendeki <p/> i gizle'],
    [
      'tr',
      'on click add .x to <li/> in #list',
      'tıklama i üzerinde #list içindeki <li/> e .x i ekle',
    ],
    ['tr', 'on click get the first <p/> in me', 'tıklama i üzerinde bendeki ilk <p/> i al'],
    ['hi', 'on click hide <p/> in me', 'क्लिक पर मुझ में स्थित <p/> को छिपाएं'],
    ['bn', 'on click hide <p/> in #list', 'ক্লিক তে #list এ থাকা <p/>কে লুকান'],
    ['ja', 'on click hide <p/> in me', 'クリック を で 自分 の中の <p/>を 隠す'],
    ['ko', 'on click add .x to <li/> in #list', '클릭 할 때 #list 안의 <li/>에 .x을 추가'],
  ])('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(translate(source, 'en', 'en'));
  });

  it('reads in a body, which is re-read from its first token', () => {
    for (const language of ['tr', 'hi', 'bn', 'ja', 'ko']) {
      const source = 'on click repeat 2 times hide <p/> in me end';
      const rendered = translate(source, 'en', language);
      expect(translate(rendered, language, 'en'), rendered).toBe(translate(source, 'en', 'en'));
    }
  });

  it("still reads English's order", () => {
    expect(translate('tıklama i üzerinde <p/> içinde ben i gizle', 'tr', 'en')).toBe(
      'on click hide <p/> in me'
    );
    expect(translate('क्लिक पर <p/> में मुझ को छिपाएं', 'hi', 'en')).toBe(
      'on click hide <p/> in me'
    );
  });

  it("keeps English's order where the scope-first form reads otherwise (a condition)", () => {
    expect(
      translate('on click if target matches <button/> in me then log 1 end', 'en', 'bn')
    ).toContain('<button/> এ আমি');
  });

  it('reads a class query an author writes scope first', () => {
    expect(translate('tıklama i üzerinde #list içindeki .item i gizle', 'tr', 'en')).toBe(
      'on click hide .item in #list'
    );
  });
});
