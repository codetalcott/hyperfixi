/**
 * `me` after a marker, in the case the marker takes (M2 N3).
 *
 * The reader half: de `zu mir`, pt `a mim`, pl `do mnie`, ru `ко мне`, uk
 * `до мене`, hi `मुझ में`. An author writes these; the readers took each for a
 * variable (`zu mir` ran as `to mir`) or refused it. Each reads as the
 * nominative does; es `mí`, it `me` and tl `akin` already read.
 *
 * The render half: translations write them (the profiles' `obliqueReferences`),
 * in es, pt, it, tl, pl, ru, uk, de and hi, where the reader brings the form
 * back as the nominative would be; elsewhere the nominative, as before.
 */
import { describe, it, expect } from 'vitest';
import { parse, semanticRenderer, translate, tryGetProfile } from '../src/index';

const FORMS: Record<string, string[]> = {
  de: ['mir', 'mich'],
  pt: ['mim'],
  pl: ['mnie', 'mną'],
  ru: ['меня', 'мне', 'мной'],
  uk: ['мене', 'мені', 'мною'],
  hi: ['मुझ', 'मुझे'],
};

const SHAPES = [
  'on click put 1 into me',
  'on click add .x to me',
  'on click remove .x from me',
  'on click send foo to me',
  'on click toggle .x on me',
  'on click put me into #out',
];

describe.each(Object.entries(FORMS))('%s reads', (language, forms) => {
  const me = tryGetProfile(language)!.references.me!;
  const isMe = (w: string): boolean => w === me || forms.includes(w);
  it.each(SHAPES)('%s', source => {
    const rendered = translate(source, 'en', language);
    expect(rendered.split(/\s+/).some(isMe), rendered).toBe(true);
    for (const form of [me, ...forms]) {
      const written = rendered
        .split(/\s+/)
        .map(w => (isMe(w) ? form : w))
        .join(' ');
      expect(translate(written, language, 'en'), written).toBe(source);
    }
  });
});

describe('renders write me in the case its marker takes', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['es', 'on click put 1 into me', 'al clic poner 1 en mí'],
    ['pt', 'on click put 1 into me', 'ao clique colocar 1 em mim'],
    ['it', 'on click put 1 into me', 'su clic mettere 1 in me'],
    ['tl', 'on click put 1 into me', 'kapag click ilagay 1 sa akin'],
    ['pl', 'on click put 1 into me', 'gdy kliknięcie umieść 1 do mnie'],
    ['ru', 'on click put 1 into me', 'при клик положить 1 в меня'],
    ['uk', 'on click put 1 into me', 'при клік покласти 1 в мене'],
    ['de', 'on click put 1 into me', 'wenn klick setzen 1 in mich'],
    ['hi', 'on click put 1 into me', 'क्लिक पर 1 को रखें मुझ में'],
    // A location's case: toggle's `on`, a query's `in`.
    ['de', 'on click toggle .x on me', 'wenn klick umschalten .x auf mir'],
    ['de', 'on click trigger foo on me', 'wenn klick auslösen foo auf mir'],
    ['ru', 'on click toggle .x on me', 'при клик переключить .x на мне'],
    ['uk', 'on click toggle .x on me', 'при клік перемкнути .x на мені'],
    ['de', 'on click hide <p/> in me', 'wenn klick verstecke <p/> in mir'],
    ['de', 'on click get first <p/> in me', 'wenn klick hole erste <p/> in mir'],
    // A marker vocalized before the pronoun, which the reader takes there too.
    ['ru', 'on click add .x to me', 'при клик добавить .x ко мне'],
    ['ru', 'on click hide <p/> in me', 'при клик скрыть <p/> во мне'],
    ['pl', 'on click remove .x from me', 'gdy kliknięcie usuń .x ze mnie'],
    ['pl', 'on click hide <p/> in me', 'gdy kliknięcie ukryj <p/> we mnie'],
    ['pl', 'on click put 1 at end of me', 'gdy kliknięcie umieść 1 przy koniec ze mnie'],
    ['pl', 'on click put 1 before me', 'gdy kliknięcie umieść 1 przede mną'],
    ['ru', 'on click put 1 before me', 'при клик положить 1 передо мной'],
    ['uk', 'on click put 1 before me', 'при клік покласти 1 переді мною'],
    // A marker after the pronoun; a patient that has a marker; a marker put
    // writes as one word.
    ['hi', 'on click remove .x from me', 'क्लिक पर .x को मुझ से हटाएं'],
    ['es', 'on click set $x to me', 'al clic establecer $x a mí'],
    ['de', 'on click send foo to me', 'wenn klick senden foo an mich'],
    ['tl', 'on click remove .x from me', 'kapag click alisin .x mula_sa akin'],
    // The rest of the render reads back otherwise (`I match` as `me matches`):
    // the case form changes nothing the reader reads, so it stays.
    [
      'es',
      'on click if I match .x remove .x from me end',
      'al clic si yo coincide .x quitar .x de mí fin',
    ],
    // A scroll position keeps its own phrase (`top of me`), and the nominative.
    ['es', 'on click scroll to the top of me', 'al clic desplazamiento en the top of yo'],
    // tl `akin` before a word reads as `my` (`sa akin for 2s`): the nominative.
    ['tl', 'on click toggle .x on me for 2s', 'kapag click palitan .x sa ako for 2s'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });
});

// The plain render, before the verified render's fallback: a scroll position's
// phrase is never replaced by a case form (the fallback would hide it).
it('a scroll position keeps its phrase in the plain render', () => {
  const node = parse('on click scroll to the top of me', 'en')!;
  expect(semanticRenderer.render(node, 'es')).toBe('al clic desplazamiento en the top of yo');
});
