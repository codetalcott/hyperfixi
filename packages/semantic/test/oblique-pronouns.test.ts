/**
 * `me` after a marker, in the case the marker takes (M2 N3, the reader half):
 * de `zu mir`, pt `a mim`, pl `do mnie`, ru `ко мне`, uk `до мене`, hi `मुझ में`.
 * An author writes these; the readers took each for a variable (`zu mir` ran
 * as `to mir`) or refused it. Each now reads as the nominative does. Renders
 * still write the nominative (the render half of N3 is to come); es `mí`, it
 * `me` and tl `akin` already read.
 */
import { describe, it, expect } from 'vitest';
import { translate, tryGetProfile } from '../src/index';

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

describe.each(Object.entries(FORMS))('%s', (language, forms) => {
  const me = tryGetProfile(language)!.references.me!;
  it.each(SHAPES)('%s', source => {
    const rendered = translate(source, 'en', language);
    expect(rendered.split(/\s+/), rendered).toContain(me);
    for (const form of forms) {
      const written = rendered
        .split(/\s+/)
        .map(w => (w === me ? form : w))
        .join(' ');
      expect(translate(written, language, 'en'), written).toBe(source);
    }
  });
});
