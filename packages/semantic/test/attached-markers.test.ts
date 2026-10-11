/**
 * ko, ja and bn write a role marker onto its word (M2 N5): `#out에`, `#outに`,
 * `#outকে` where renders wrote `#out 에`. The readers already split a particle
 * off the word before it; each render reads back as the spaced one did.
 */
import { describe, it, expect } from 'vitest';
import { translate, tryGetProfile } from '../src/index';
import { attachMarker } from '../src/explicit/attached-markers';

describe('a marker written onto its word', () => {
  // A handler's own event keeps its marker apart: or-legs and parameters
  // splice onto the event word, and the head itself is N4's (`クリック を で`).
  it.each([
    ['ja', 'on click put "x" into #out', 'クリック を で "x"を #outに 置く'],
    ['ja', 'on click take .a from #b', 'クリック を で #bから .aを 取る'],
    ['ja', 'on click hide #m with *opacity', 'クリック を で #mを *opacityで 隠す'],
    ['ko', 'on click put "x" into #out', '클릭 할 때 "x"을 #out에 넣다'],
    ['ko', 'on click send foo to #b', '클릭 할 때 #b에게 foo을 보내다'],
    ['ko', 'on click take .a from #b', '클릭 할 때 #b에서 .a을 가져오다'],
    ['bn', 'on click put "x" into #out', 'ক্লিক তে "x"কে #outএ রাখুন'],
    ['bn', 'on click add .x to #b', 'ক্লিক তে #bতে .xকে যোগ'],
  ])('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });

  it("ko takes each particle's form from a Hangul word's last syllable", () => {
    // 결과 and 나 end in a vowel (를), 그것 in a consonant (을); after code, the render's choice.
    expect(translate('on click put result into #out', 'en', 'ko')).toBe(
      '클릭 할 때 결과를 #out에 넣다'
    );
    expect(translate('on click put it into #out', 'en', 'ko')).toBe(
      '클릭 할 때 그것을 #out에 넣다'
    );
    expect(translate('on click hide me', 'en', 'ko')).toBe('클릭 할 때 나를 숨기다');
    expect(translate('on click set $x to 5', 'en', 'ko')).toBe('클릭 할 때 $x를 5에 설정');
    const ko = tryGetProfile('ko')!;
    expect(attachMarker(ko, '파일', '으로')).toBe('파일로'); // ㄹ takes 로
    expect(attachMarker(ko, '값', '로')).toBe('값으로');
    expect(attachMarker(ko, '나', '으로')).toBe('나로');
  });

  it('leaves apart a marker of the role after it (bn `x এ <p/>`, a loop in English order)', () => {
    expect(translate('on click repeat for x in <p/> log x end', 'en', 'bn')).toBe(
      'ক্লিক তে পুনরাবৃত্তি x এ <p/> xকে লগ শেষ'
    );
  });

  it("leaves bn's locative apart after a Bengali word, whose spelling it changes", () => {
    // `ক্লিকে`, not `ক্লিকতে`, and the reader does not split the first.
    expect(translate('on click hide #m', 'en', 'bn')).toBe('ক্লিক তে #mকে লুকান');
    const bn = tryGetProfile('bn')!;
    expect(attachMarker(bn, 'ক্লিক', 'তে')).toBeUndefined();
    expect(attachMarker(bn, 'ফলাফল', 'কে')).toBe('ফলাফলকে');
  });

  it('leaves a marker apart where the reader would not split the word back', () => {
    // A property after a possessive is one word to ja's reader (`値を`).
    expect(translate('on click put my value into #out', 'en', 'ja')).toBe(
      'クリック を で 私の 値 を #outに 置く'
    );
    expect(translate('on click put my value into #out', 'en', 'bn')).toBe(
      'ক্লিক তে আমার মান কে #outএ রাখুন'
    );
  });

  it('keeps the whole render spaced where the attached one reads otherwise', () => {
    // Each marker splits back alone, but ko reads `나을 display:flex로` as
    // something else: the verified render writes it spaced, and it reads back.
    for (const source of [
      'on click show me with display: flex',
      "on click set #t1's value to 'x'",
    ]) {
      const rendered = translate(source, 'en', 'ko');
      expect(translate(rendered, 'ko', 'en'), rendered).toBe(translate(source, 'en', 'en'));
    }
  });

  it('attaches nothing in a language that writes its markers apart', () => {
    expect(attachMarker(tryGetProfile('tr'), '#out', 'e')).toBeUndefined();
    expect(attachMarker(tryGetProfile('es'), '#out', 'en')).toBeUndefined();
  });
});
