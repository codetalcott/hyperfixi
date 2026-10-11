/**
 * A pronoun fused with its marker reads as the two (tokenizers/fused-forms-split.ts,
 * M2 N3 wave 3): tr `bana` is `ben` + `e`. Only the profile's own fused words
 * split; a word that only looks like one stays a word.
 */
import { describe, it, expect } from 'vitest';
import { tokenize, tryGetProfile } from '../src/index';
import { fusedForms, splitFusedForms } from '../src/tokenizers/fused-forms-split';

const read = (text: string, language: string): string[] =>
  tokenize(text, language).tokens.map(t => `${t.value}:${t.normalized ?? t.kind}`);

describe('fused forms', () => {
  it('derives the fused words from the profile, in the order the parts are written', () => {
    const forms = fusedForms(tryGetProfile('tr')!);
    expect(forms.get('bana')).toEqual(['ben', 'e']);
    expect(forms.get('onu')).toEqual(['o', 'i']);
    // A phrase of two words is no fused form (es `en mí`).
    expect(fusedForms(tryGetProfile('es')!).size).toBe(0);
  });

  it('splits a fused word into the pronoun and its marker', () => {
    expect(read('bana', 'tr')).toEqual(read('ben e', 'tr'));
    expect(read('ondan', 'tr')).toEqual(read('o den', 'tr'));
  });

  it('keeps the positions inside the word', () => {
    const [pronoun, marker] = tokenize('bana', 'tr').tokens;
    expect(pronoun!.position).toEqual({ start: 0, end: 3 });
    expect(marker!.position).toEqual({ start: 3, end: 4 });
  });

  it("reads no fused form from a verb's object (`''`, de `mich`): no marker fuses there", () => {
    expect([...fusedForms(tryGetProfile('de')!).keys()]).not.toContain('mich');
  });

  it('splits only where each part reads as one token', () => {
    // A stream no split has touched (es has no fused forms).
    const stream = tokenize('bana', 'es');
    const forms = new Map([['bana', ['ben', 'e']]]);
    const values = (words: (w: string) => readonly unknown[]) =>
      splitFusedForms(stream, forms, words as never).tokens.map(t => t.value);
    expect(values(word => tokenize(word, 'tr').tokens)).toEqual(['ben', 'e']);
    expect(values(word => tokenize(`${word} ${word}`, 'tr').tokens)).toEqual(['bana']);
  });

  it('leaves every other word alone', () => {
    expect(read('banal', 'tr')).toEqual(['banal:identifier']);
    expect(read('bana', 'es')).toEqual(['bana:identifier']);
  });
});
