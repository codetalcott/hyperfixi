/**
 * Two qu readings the consolidation filed (PR 107).
 *
 * - qu's tokenizer split an attached case marker off any word that ended in
 *   one, so `FormData` was `FormDa` + `ta` (the accusative): a PascalCase
 *   word is a type's name, not Quechua. (A camelCase variable keeps an
 *   attached marker, `triggerElta`, so `userData` stays ambiguous.)
 * - qu writes the patient right after the event, so `click (o) ta …` took
 *   `(o)` for the event's parameters. Parameters touch their event.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tokenize } from '../src/index';

const values = (code: string): string[] => tokenize(code, 'qu').tokens.map(t => t.value);

describe('a PascalCase word keeps its case-marker-shaped end', () => {
  it.each([
    'on click put x as FormData into #out',
    'on click set x to y as JSONString then put x into #out',
  ])('%s', source => {
    const english = render(parse(source, 'en')!, 'en');
    const qu = render(parse(source, 'en')!, 'qu');
    expect(render(parse(qu, 'qu')!, 'en'), qu).toBe(english);
  });

  it('a Quechua word still splits: wasita is wasi + ta', () => {
    expect(values('wasita')).toEqual(['wasi', 'ta']);
    expect(values('FormData ta')).toEqual(['FormData', 'ta']);
  });
});

describe('parameters touch their event', () => {
  it('qu `click (o) ta` is the patient', () => {
    expect(render(parse('maykama click (o) ta #out man churay', 'qu')!, 'en')).toBe(
      'on click put (o) into #out'
    );
  });

  it('a group apart from its event is still its parameters before a command', () => {
    expect(render(parse('al clic (evt) poner evt.detail en #out', 'es')!, 'en')).toBe(
      'on click(evt) put evt.detail into #out'
    );
  });

  it.each(['qu', 'bn', 'ja', 'tr', 'ko', 'es', 'ar'])(
    '%s: `click(evt)` still reads its parameters',
    language => {
      const source = 'on click(evt) put evt.detail into #out';
      const foreign = render(parse(source, 'en')!, language);
      expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
    }
  );
});
