/**
 * A custom event in a wait, in the language's own words (OPEN_ITEMS P52):
 * `esperar evento foo`, de `warten Ereignis foo`, ja `イベント foo 待つ`. The
 * renderer wrote `esperar foo`, which every reader took for a time wait
 * (`wait foo`), so `on click wait for foo` was refused in every language. The
 * event word goes only before a name no event table knows: a known event keeps
 * the marker-less form (`esperar transitionend`), and a bare name stays a time
 * wait (`esperar delay` is `wait delay`, as upstream reads it).
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, translate, tryGetProfile } from '../src/index';

const LANGS = getSupportedLanguages().filter(l => l !== 'en');
const SHAPES = [
  'on click wait for foo then log 1',
  'on click wait for foo or 2s then log 1',
  'on click wait for foo from #b then log 1',
  'on click wait for foo(bar) then put bar into me',
  'on click add .a then wait for foo then add .b',
  'on click wait for draggable:start then log 1',
];

describe('a custom event in a wait takes the language’s event word', () => {
  it.each(LANGS.flatMap(lang => SHAPES.map(shape => [lang, shape] as const)))(
    '%s: %s',
    (lang, shape) => {
      const written = translate(shape, 'en', lang);
      const word = tryGetProfile(lang)?.keywords?.event?.primary;
      expect(word).toBeTruthy();
      expect(written).toContain(`${word} ${shape.includes('foo(') ? 'foo(bar)' : shape.includes('draggable') ? 'draggable:start' : 'foo'}`);
      expect(translate(written, lang, 'en')).toBe(translate(shape, 'en', 'en'));
    }
  );

  it.each(LANGS)('%s: a known event keeps the marker-less form', lang => {
    const written = translate('on click wait for transitionend then log 1', 'en', lang);
    const word = tryGetProfile(lang)?.keywords?.event?.primary ?? '';
    expect(written).toContain('transitionend');
    expect(written).not.toContain(`${word} transitionend`);
    expect(translate(written, lang, 'en')).toBe('on click wait for transitionend then log 1');
  });

  it.each([
    ['es', 'al clic esperar delay entonces registrar 1', 'on click wait delay then log 1'],
    ['es', 'al clic esperar 2s entonces registrar 1', 'on click wait 2s then log 1'],
    ['ja', 'クリックで delay 待つ それから 1を 記録', 'on click wait delay then log 1'],
  ])('%s: a bare name stays a time wait (%s)', (lang, written, english) => {
    expect(translate(written, lang, 'en')).toBe(english);
  });

  // Outside a handler no fused path and no leg scanner help: the head alone reads it.
  it.each(['es', 'ja', 'zh', 'he', 'tr'])('%s: a wait outside a handler reads by the head alone', lang => {
    const source = 'def f() wait for foo then log 1 end';
    expect(translate(translate(source, 'en', lang), lang, 'en')).toBe(translate(source, 'en', 'en'));
  });

  // es and pt write their own `for` (registry.ts, WAIT_FOR_WORDS). es `a` is also the
  // destination marker, skipped, so `esperar a continue` read as `wait continue` (7.3.0 live test).
  it.each([
    ['es', 'esperar a continue', 'wait for continue'],
    ['es', 'esperar a carga', 'wait for load'],
    ['es', 'al hacer clic esperar a foo entonces agregar .a', 'on click wait for foo then add .a'],
    ['es', 'al clic esperar a foo o bar entonces registrar 1', 'on click wait for foo or bar then log 1'],
    ['es', 'al clic esperar a foo de #b entonces registrar 1', 'on click wait for foo from #b then log 1'],
    ['pt', 'esperar por foo', 'wait for foo'],
    ['pt', 'ao clicar esperar por foo então adicionar .a', 'on click wait for foo then add .a'],
    ['pt', 'esperar a foo', 'wait for foo'],
  ])('%s: the language’s own `for` (%s)', (lang, written, english) => {
    expect(translate(written, lang, 'en')).toBe(english);
  });

  it('English keeps `wait for`', () => {
    expect(translate('on click wait for foo then log 1', 'en', 'en')).toBe(
      'on click wait for foo then log 1'
    );
  });
});
