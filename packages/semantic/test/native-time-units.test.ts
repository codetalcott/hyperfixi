/**
 * A number and the language's own time-unit word after it are one duration (registry.ts,
 * fuseGluedValues). The tokenizers knew the unit words but left them a token apart, so the event
 * head read the number as a click count and the unit as an operand of `wait`:
 * `클릭할 때 1초 대기` came back as `on click 1 wait s`, which waits for nothing and runs on the
 * first click only — and translate() did not refuse it (7.3.0 live test). The renderer writes
 * `2s`, so the corpus never held a native unit.
 *
 * These are regression cases for that bug, not native-speaker input (the hand-written gate in
 * testing-framework is for that).
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { translate } from '../src/index';

describe('a native time unit after the event head is a duration', () => {
  const cases: Array<[string, string, string]> = [
    ['ko', '클릭할 때 1초 대기 그다음 #t의 .a를 토글', 'on click wait 1s then toggle .a on #t'],
    ['ko', '클릭할 때 150밀리초 대기', 'on click wait 150ms'],
    ['tr', 'tıklamada 1 saniye bekle', 'on click wait 1s'],
    ['ja', 'クリックで 1 秒 待つ', 'on click wait 1s'],
    ['ja', 'クリックで 1秒 待つ', 'on click wait 1s'],
    ['zh', '点击时 等待 1 秒', 'on click wait 1s'],
    ['es', 'al hacer clic esperar 2 segundos', 'on click wait 2s'],
    ['fr', 'au clic attendre 2 secondes', 'on click wait 2s'],
  ];
  for (const [lang, source, english] of cases) {
    it(`${lang}: ${source}`, () => {
      expect(translate(source, lang, 'en')).toBe(english);
    });
  }

  it('a unit later in a chain reads the same', () => {
    expect(translate('클릭할 때 #t의 .a를 토글 그다음 1초 대기', 'ko', 'en')).toBe(
      'on click toggle .a on #t then wait 1s'
    );
  });

  it('a number with no unit after it is still a head count', () => {
    for (const lang of ['ko', 'ja', 'tr', 'es']) {
      const there = translate('on click 2 toggle .a', 'en', lang);
      expect(translate(there, lang, 'en')).toBe('on click 2 toggle .a');
    }
  });
});
