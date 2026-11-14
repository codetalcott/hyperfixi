/**
 * Two places semantic wrote English the engine reads differently, each run on
 * `@hyperfixi/engine` first (2026-11-13):
 *
 *  - `wait input` waits for the time in the variable `input` (the engine reads
 *    the X of `wait X` as a time expression; an event wait is `wait for X`).
 *    Semantic relabelled any X spelled like an event and wrote `wait for input`.
 *  - a handler with a leading modifier word and a source, which the renderer
 *    wrote with the source before the event (es `al de #b clic`).
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src';

const en = (source: string): string => translate(source, 'en', 'en');

describe('a bare `wait X` in English is a time, whatever X is named', () => {
  it.each(['input', 'click', 'transitionend', 'load', 'delay'])('wait %s', name => {
    expect(en(`wait ${name}`)).toBe(`wait ${name}`);
  });

  it('keeps the variable in a chain', () => {
    expect(en('set input to 500 then wait input')).toBe('set input to 500 then wait input');
  });

  it('still reads `wait for X` as an event wait', () => {
    expect(en('wait for input')).toBe('wait for input');
    expect(translate('wait for input', 'en', 'es')).toBe('esperar entrada');
  });

  it('still reads a marker-less event wait in a language that writes one', () => {
    expect(translate('esperar entrada', 'es', 'en')).toBe('wait for input');
  });

  it('refuses to write the variable wait where it would read as an event', () => {
    expect(() => translate('set input to 500 then wait input', 'en', 'es')).toThrow(/wait/);
  });
});

describe('a handler with a leading modifier word and a source', () => {
  const sources = [
    'on first click from #b add .x',
    'on every click from #b add .x',
    'on first click from #b debounced at 200ms add .x',
  ];
  // Prepositional source markers. The five that write the source before the
  // head (ja, ko, tr, hi, qu) refuse these three: their readers do not read a
  // modifier word and a fronted source together.
  const languages = ['es', 'fr', 'de', 'ar', 'zh', 'he', 'sw'];

  for (const source of sources) {
    it.each(languages)(`${source} → %s and back`, language => {
      expect(translate(translate(source, 'en', language), language, 'en')).toBe(source);
    });
  }

  it('writes the source after the event', () => {
    expect(translate('on first click from #b add .x', 'en', 'es')).toBe(
      'primero al clic de #b agregar .x'
    );
  });
});
