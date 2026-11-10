/**
 * A handler's head agrees with its event, and German writes an event's word as
 * the noun it is.
 *
 * es `al` and pt `ao` hold the masculine article (a + el, a + o), and every
 * handler was written with them: `al entrada agregar .a`, `ao mudança de
 * #search disparar envio em #form`. A feminine event takes `a la` and `à`.
 * de wrote its event words lower-case (`wenn klick`, `auslösen absenden auf
 * #form`) beside `Ereignis` and the capitalized words its own profile lists.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { translate, tryGetProfile, eventNameTranslations, localizeEventName } from '../src/index';

const written = (source: string, language: string): string => translate(source, 'en', language);
const read = (source: string, language: string): string => translate(source, language, 'en');

describe('es and pt: the head takes the gender of its event', () => {
  it.each([
    ['es', 'on input add .a to #b', 'a la entrada agregar .a a #b'],
    ['es', 'on keyup from #q log 1', 'a la tecla arriba de #q registrar 1'],
    ['es', 'on load add .a', 'a la carga agregar .a'],
    ['es', 'on click toggle .active', 'al clic alternar .active'],
    [
      'es',
      'on change from #search trigger submit on #form',
      'al cambio de #search disparar envío en #form',
    ],
    // The first event decides.
    ['es', 'on input or click add .a', 'a la entrada o clic agregar .a'],
    ['es', 'on click or input add .a', 'al clic o entrada agregar .a'],
    // An infinitive and a name that is code keep `al` (`al redimensionar`, `el evento`).
    ['es', 'on resize add .a', 'al redimensionar agregar .a'],
    ['es', 'on my:event add .a', 'al my:event agregar .a'],
    [
      'pt',
      'on change from #search trigger submit on #form',
      'à mudança de #search disparar envio em #form',
    ],
    ['pt', 'on input add .a to #b', 'à entrada adicionar .a a #b'],
    ['pt', 'on keyup from #q log 1', 'à tecla cima de #q registrar 1'],
    ['pt', 'on scroll add .a', 'à rolagem adicionar .a'],
    ['pt', 'on click toggle .active', 'ao clique alternar .active'],
    ['pt', 'on input or click add .a', 'à entrada ou clique adicionar .a'],
    ['pt', 'on load add .a', 'ao carregar adicionar .a'],
    ['pt', 'on my:event add .a', 'ao my:event adicionar .a'],
  ])('%s: %s', (language, source, expected) => {
    expect(written(source, language)).toBe(expected);
    expect(read(expected, language)).toBe(source);
  });

  // Pages written before the head agreed still read.
  it.each([
    ['es', 'al entrada agregar .a a #b', 'on input add .a to #b'],
    [
      'pt',
      'ao mudança de #search disparar envio em #form',
      'on change from #search trigger submit on #form',
    ],
  ])('%s still reads the head that did not agree: %s', (language, source, expected) => {
    expect(read(source, language)).toBe(expected);
  });

  // es `a` alone is the destination's marker, so `a la` is the head only
  // before a feminine event word.
  it.each([
    ['poner 5 a la', 'put 5 into la'],
    ['agregar .a a la', 'add .a to la'],
    ['al clic poner x a la', 'on click put x into la'],
  ])('es: a variable named la after `a` is not a head: %s', (source, expected) => {
    expect(read(source, 'es')).toBe(expected);
  });

  it('every feminine noun a profile lists is an event word of the language', () => {
    for (const language of ['es', 'pt']) {
      const feminine = tryGetProfile(language)!.eventHandler!.feminineEventMarker!;
      const firstWords = new Set(
        Object.keys(eventNameTranslations[language]!).map(native => native.split(' ')[0])
      );
      for (const noun of feminine.nouns) expect(firstWords, `${language} ${noun}`).toContain(noun);
    }
  });
});

describe('de: an event is written as a noun', () => {
  it.each([
    ['on click toggle .active', 'wenn Klick umschalten .active'],
    [
      'on change from #search trigger submit on #form',
      'wenn Änderung von #search auslösen Absenden auf #form',
    ],
    ['on input add .a to #b', 'wenn Eingabe hinzufügen .a zu #b'],
    ['on click or change add .a', 'wenn Klick oder Änderung hinzufügen .a'],
    ['on focus add .a', 'wenn Fokus hinzufügen .a'],
    ['on scroll add .a', 'wenn Scrollen hinzufügen .a'],
    ['on dblclick add .a', 'wenn Doppelklick hinzufügen .a'],
    ['trigger input on #search', 'auslösen Eingabe auf #search'],
    ['send change to #form', 'senden Änderung an #form'],
    ['wait for change then add .a', 'warten Änderung dann hinzufügen .a'],
    // No German word: the name stays code.
    ['on keyup from #q log 1', 'wenn keyup von #q protokollieren 1'],
    ['on my:event add .a', 'wenn my:event hinzufügen .a'],
  ])('%s', (source, expected) => {
    expect(written(source, 'de')).toBe(expected);
    expect(read(expected, 'de')).toBe(source);
  });

  it('reads the lower-case word too, as it was written before', () => {
    expect(read('wenn klick umschalten .active', 'de')).toBe('on click toggle .active');
    expect(read('wenn doppelklick hinzufügen .a', 'de')).toBe('on dblclick add .a');
    expect(read('auslösen absenden auf #form', 'de')).toBe('trigger submit on #form');
  });

  it('no other language’s event words change case', () => {
    expect(localizeEventName('click', 'fr')).toBe('clic');
    expect(localizeEventName('click', 'es')).toBe('clic');
    expect(localizeEventName('change', 'pt')).toBe('mudança');
  });
});
