/**
 * `repeat forever` in each language's own word (M2, V1, owner 2026-10-10).
 * Fifteen languages wrote English `forever`; their profiles listed it as their
 * own word, so neither the vocabulary checks nor the leak gate saw it. Each now
 * writes the dictionary's word, and every reader still takes English's.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, getLexicon, translate, tryGetProfile } from '../src/index';
import { dictionaries } from '../../i18n/src/dictionaries';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
const words = (text: string): string[] => text.split(/\s+/);

describe.each([
  'on click repeat forever log 1 end',
  'on click repeat forever toggle .pulse then wait 1s end',
  'on load repeat forever add .a to me wait 1s remove .a from me wait 1s end',
])('%s', source => {
  it.each(FOREIGN)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(words(rendered), rendered).not.toContain('forever');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('the word is the dictionary’s, and English’s still reads', () => {
  it.each(FOREIGN)('%s', language => {
    const word = tryGetProfile(language)!.keywords.forever!;
    const temporal = (dictionaries as Record<string, { temporal?: Record<string, string> }>)[
      language
    ]?.temporal;
    expect(word.primary).toBe(temporal?.forever);
    expect(getLexicon(language)?.temporal?.forever?.primary).toBe(temporal?.forever);
    expect(word.alternatives).toContain('forever');
  });

  it('es `repetir forever` reads', () => {
    expect(translate('al clic repetir forever registrar 1 fin', 'es', 'en')).toBe(
      'on click repeat forever log 1 end'
    );
  });
});
