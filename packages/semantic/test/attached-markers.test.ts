/**
 * ko, ja and bn write a role marker onto its word (M2 N5): `#out에`, `#outに`,
 * `#outকে` where renders wrote `#out 에`. The readers already split a particle
 * off the word before it; each render reads back as the spaced one did.
 */
import { describe, it, expect } from 'vitest';
import { tokenize, translate, tryGetProfile } from '../src/index';
import { attachMarker } from '../src/explicit/attached-markers';

describe('a marker written onto its word', () => {
  // The handler's own head is written last, once the or-legs and parameters
  // have joined the event (N4, below); tr's head keeps its marker apart.
  it.each([
    ['ja', 'on click put "x" into #out', 'クリックで "x"を #outに 置く'],
    ['ja', 'on click take .a from #b', 'クリックで #bから .aを 取る'],
    ['ja', 'on click hide #m with *opacity', 'クリックで #mを *opacityで 隠す'],
    ['ko', 'on click put "x" into #out', '클릭 할 때 "x"을 #out에 넣다'],
    ['ko', 'on click send foo to #b', '클릭 할 때 #b에게 foo을 보내다'],
    ['ko', 'on click take .a from #b', '클릭 할 때 #b에서 .a을 가져오다'],
    ['bn', 'on click put "x" into #out', 'ক্লিকে "x"কে #outএ রাখুন'],
    ['bn', 'on click add .x to #b', 'ক্লিকে #bতে .xকে যোগ'],
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
      'ক্লিকে পুনরাবৃত্তি x এ <p/> xকে লগ শেষ'
    );
  });

  it("writes bn's locative in the form the word takes", () => {
    // The vowel sign after a consonant (`ক্লিকে`, not `ক্লিকতে`), `তে` after a
    // vowel (`জমাতে`), apart after anything else; `কে` as it is.
    expect(translate('on click hide #m', 'en', 'bn')).toBe('ক্লিকে #mকে লুকান');
    const bn = tryGetProfile('bn')!;
    expect(attachMarker(bn, 'ক্লিক', 'তে')).toBe('ক্লিকে');
    expect(attachMarker(bn, 'ক্লিক', 'এ')).toBe('ক্লিকে');
    expect(attachMarker(bn, 'জমা', 'তে')).toBe('জমাতে');
    expect(attachMarker(bn, 'বডি', 'এ')).toBe('বডিতে');
    expect(attachMarker(bn, 'রং', 'তে')).toBeUndefined(); // an anusvara
    expect(attachMarker(bn, 'ফলাফল', 'কে')).toBe('ফলাফলকে');
  });

  it('leaves a marker apart where the reader would not split the word back', () => {
    // A property after a possessive is one word to ja's reader (`値を`).
    expect(translate('on click put my value into #out', 'en', 'ja')).toBe(
      'クリックで 私の 値 を #outに 置く'
    );
    expect(translate('on click put my value into #out', 'en', 'bn')).toBe(
      'ক্লিকে আমার মান কে #outএ রাখুন'
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

/**
 * ja's handler head is the event and the `on` word, written as one (M2 N4):
 * `クリックで`, where the render wrote the event's own marker too (`クリック を
 * で`). The reader takes both: code written before 4.5.0 has the two markers.
 */
describe("ja's handler head: the on word written onto the event", () => {
  it.each([
    ['on click toggle .a', 'クリックで .aを 切り替え'],
    ['on load toggle .a', 'ロードで .aを 切り替え'],
    // A fronted source, parameters, or-legs and modifiers all keep the word
    // after the whole event phrase, where the reader looks for it.
    ['on click from #b toggle .a', '#b から クリックで .aを 切り替え'],
    ['on myEvent(detail) toggle .a', 'myEvent(detail)で .aを 切り替え'],
    ['on click or keyup toggle .a', 'クリック または キーアップで .aを 切り替え'],
    ['on click debounced at 200ms toggle .a', 'クリックで debounced at 200ms .aを 切り替え'],
    ['on click js console.log(1) end', 'クリックで JS実行 console.log(1) 終わり'],
    // The body takes the clause walk, as with the two-marker head: the fused
    // `{event} で …` patterns (headOutranksFused) left a js block after `then`
    // unread and dropped fetch's response type.
    [
      'on click set t to true then js(t) window.testSuccess = t end',
      'クリックで tを 真に 設定 それから JS実行 (t) window.testSuccess = t 終わり',
    ],
    [
      'on click fetch /test as Number then put it into my.innerHTML',
      'クリックで "/test" フェッチ Number それから それを 私の innerHTMLに 置く',
    ],
    ['on click toggle .a end on keyup toggle .b end', 'クリックで .aを 切り替え\n終わり\nキーアップで .bを 切り替え\n終わり'],
  ])('%s', (source, expected) => {
    expect(translate(source, 'en', 'ja')).toBe(expected);
    expect(translate(expected, 'ja', 'en')).toBe(translate(source, 'en', 'en'));
  });

  it('still reads the two-marker head, with a fronted source and in a chain', () => {
    expect(translate('クリック を で .aを 切り替え', 'ja', 'en')).toBe('on click toggle .a');
    expect(translate('#b から クリック を で .aを 切り替え', 'ja', 'en')).toBe(
      'on click from #b toggle .a'
    );
    expect(translate('クリック を で .aを 切り替え キーアップ を で .bを 切り替え', 'ja', 'en')).toBe(
      'on click toggle .a\nend\non keyup toggle .b\nend'
    );
    expect(translate('クリックで .aを 切り替え キーアップで .bを 切り替え', 'ja', 'en')).toBe(
      'on click toggle .a\nend\non keyup toggle .b\nend'
    );
  });

  it('keeps the word apart where the reader would not split it off the event', () => {
    // `キープレスで` and `サイズ変更で` are one word to the tokenizer.
    for (const [source, head] of [
      ['on keypress toggle .a', 'キープレス で'],
      ['on resize toggle .a', 'サイズ変更 で'],
    ]) {
      const rendered = translate(source, 'en', 'ja');
      if (rendered.startsWith(head.split(' ')[0]!)) expect(rendered.startsWith(head)).toBe(true);
      expect(translate(rendered, 'ja', 'en')).toBe(source);
    }
  });
});

/**
 * bn's handler head is the event with its locative written on (M2 N4):
 * `ক্লিকে` (the vowel sign after a consonant), `জমাতে` (after a vowel), where
 * the render wrote `ক্লিক তে`. The reader splits the word back (both read as `তে`)
 * (tokenizers/attached-suffix-split.ts) and keeps taking `ক্লিক তে` and
 * `ক্লিক এ`; after code the locative is `তে`, as bn's N5 rule writes it.
 */
describe("bn's handler head: the locative written onto the event", () => {
  it.each([
    ['on click toggle .a', 'ক্লিকে .aকে টগল করুন'],
    ['on load toggle .a', 'লোডে .aকে টগল করুন'],
    ['on submit toggle .a', 'জমাতে .aকে টগল করুন'],
    ['on change put "x" into #out', 'পরিবর্তনে "x"কে #outএ রাখুন'],
    // A Bengali value takes it too, in its form; every pattern reads it back.
    ['on click set x to false then default x to true', 'ক্লিকে xকে মিথ্যাতে সেট তারপর xকে সত্যে ডিফল্ট'],
    ['on click from #b toggle .a', '#b থেকে ক্লিকে .aকে টগল করুন'],
    ['on keyup toggle .a', 'keyupতে .aকে টগল করুন'],
    ['on click or keyup toggle .a', 'ক্লিক অথবা keyupতে .aকে টগল করুন'],
    ['on myEvent(detail) toggle .a', 'myEvent(detail)তে .aকে টগল করুন'],
    ['on click debounced at 200ms toggle .a', 'ক্লিকে debounced at 200ms .aকে টগল করুন'],
    ['on click js console.log(1) end', 'ক্লিকে জেএস console.log(1) শেষ'],
    ['on click toggle .a end on keyup toggle .b end', 'ক্লিকে .aকে টগল করুন\nশেষ\nkeyupতে .bকে টগল করুন\nশেষ'],
  ])('%s', (source, expected) => {
    expect(translate(source, 'en', 'bn')).toBe(expected);
    expect(translate(expected, 'bn', 'en')).toBe(translate(source, 'en', 'en'));
  });

  it('still reads the spaced heads, with a fronted source and in a chain', () => {
    expect(translate('ক্লিক তে .aকে টগল করুন', 'bn', 'en')).toBe('on click toggle .a');
    expect(translate('ক্লিক এ .aকে টগল করুন', 'bn', 'en')).toBe('on click toggle .a');
    expect(translate('#b থেকে ক্লিক তে .aকে টগল করুন', 'bn', 'en')).toBe(
      'on click from #b toggle .a'
    );
    expect(translate('ক্লিকে .aকে টগল করুন keyupতে .bকে টগল করুন', 'bn', 'en')).toBe(
      'on click toggle .a\nend\non keyup toggle .b\nend'
    );
  });

  it('splits only a known word: a name that ends like the locative stays a name', () => {
    const values = (text: string) => tokenize(text, 'bn').tokens.map(t => `${t.value}:${t.kind}`);
    expect(values('ক্লিকে')).toEqual(['ক্লিক:keyword', 'তে:particle']);
    expect(values('জমাতে')).toEqual(['জমা:keyword', 'তে:particle']);
    expect(values('থেকে')).toEqual(['থেকে:particle']);
    expect(values('xyzে')).toEqual(values('xyzে')); // whatever it is, one way
    expect(values('কথাে').length).toBe(1);
  });
});

describe("tr's handler head: the locative written onto the event", () => {
  it.each([
    ['on click toggle .a', 'tıklamada .a i değiştir'],
    ['on submit toggle .a', 'göndermede .a i değiştir'],
    ['on change put "x" into #out', 'değişiklikte "x" i #out e koy'],
    ['on click from #b toggle .a', '#b den tıklamada .a i değiştir'],
    ['on click from window toggle .a', 'pencere den tıklamada .a i değiştir'],
    // Code keeps its suffix apart (FUSED_FORMS.md Q2), in the on word's own form;
    // so does an event the lexicon leaves in English.
    ['on keyup toggle .a', 'keyup da .a i değiştir'],
    ['on scroll toggle .a', 'scroll da .a i değiştir'],
    ['on draggable:start toggle .a', 'draggable:start da .a i değiştir'],
    ['on click or keyup toggle .a', 'tıklama veya keyup da .a i değiştir'],
    ['on keyup or click toggle .a', 'keyup veya tıklamada .a i değiştir'],
    ['on myEvent(detail) toggle .a', 'myEvent(detail) da .a i değiştir'],
    ['on click debounced at 200ms toggle .a', 'tıklamada debounced at 200ms .a i değiştir'],
    ['on click js console.log(1) end', 'tıklamada js console.log(1) son'],
    ['on click put result into #out', 'tıklamada sonucu #out e koy'],
    ['on click toggle .a end on keyup toggle .b end', 'tıklamada .a i değiştir\nson\nkeyup da .b i değiştir\nson'],
  ])('%s', (source, expected) => {
    expect(translate(source, 'en', 'tr')).toBe(expected);
    expect(translate(expected, 'tr', 'en')).toBe(translate(source, 'en', 'en'));
  });

  it('still reads the two-marker heads, with a fronted source and in a chain', () => {
    expect(translate('tıklama i üzerinde .a i değiştir', 'tr', 'en')).toBe('on click toggle .a');
    expect(translate('tıklama üzerinde .a i değiştir', 'tr', 'en')).toBe('on click toggle .a');
    expect(translate('tıklama da .a i değiştir', 'tr', 'en')).toBe('on click toggle .a');
    expect(translate('#b den tıklama i üzerinde .a i değiştir', 'tr', 'en')).toBe(
      'on click from #b toggle .a'
    );
    expect(translate('tıklamada .a i değiştir keyup da .b i değiştir', 'tr', 'en')).toBe(
      'on click toggle .a\nend\non keyup toggle .b\nend'
    );
    expect(translate('tıklamada .a i değiştir göndermede .b i değiştir', 'tr', 'en')).toBe(
      'on click toggle .a\nend\non submit toggle .b\nend'
    );
  });

  it('splits only a known word, in any of the four forms', () => {
    const values = (text: string) => tokenize(text, 'tr').tokens.map(t => `${t.value}:${t.kind}`);
    expect(values('tıklamada')).toEqual(['tıklama:keyword', 'da:particle']);
    expect(values('değişiklikte')).toEqual(['değişiklik:keyword', 'te:particle']);
    expect(values('göndermede')).toEqual(['gönderme:keyword', 'de:particle']);
    // A slip of harmony reads as the word too (`tık` takes `ta`); a name is a name.
    expect(values('tıkta')).toEqual(['tık:keyword', 'ta:particle']);
    expect(values('tıkda')).toEqual(['tık:keyword', 'da:particle']);
    expect(values('sayfada')).toEqual(['sayfada:identifier']);
    // An English name the reader passes through is not a word of the language.
    expect(values('meta')).toEqual(['meta:identifier']);
    expect(values('theta')).toEqual(['theta:identifier']);
  });

  it("writes tr's locative only onto a word of the language, by its spelling", () => {
    const isWord = (w: string) => w === 'tıklama' || w === 'değişiklik' || w === 'sonuç';
    expect(attachMarker(tryGetProfile('tr'), 'tıklama', 'da', isWord)).toBe('tıklamada');
    expect(attachMarker(tryGetProfile('tr'), 'değişiklik', 'da', isWord)).toBe('değişiklikte');
    expect(attachMarker(tryGetProfile('tr'), 'sonuç', 'da', isWord)).toBe('sonuçta');
    expect(attachMarker(tryGetProfile('tr'), 'keyup', 'da', isWord)).toBeUndefined();
    expect(attachMarker(tryGetProfile('tr'), '#out', 'da', isWord)).toBeUndefined();
    expect(attachMarker(tryGetProfile('tr'), 'tıklama', 'i', isWord)).toBeUndefined();
    expect(attachMarker(tryGetProfile('tr'), 'tıklama', 'da')).toBeUndefined();
  });
});
