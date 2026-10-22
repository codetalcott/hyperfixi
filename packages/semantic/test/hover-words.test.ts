/**
 * A language's hover word reads as `mouseenter`. Eighteen profiles (and ms's loanword) normalized
 * it to `hover`, which is no DOM event: `al sobrevolar agregar .h` came back
 * `on hover add .h`, a handler nothing fires, with no error (7.3.0 live test). The words stay
 * (the profiles' `hover` key keeps its name); what `on mouseenter` renders to does not move.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { getSupportedLanguages, translate, tryGetProfile } from '../src/index';

describe('a hover word is mouseenter', () => {
  it.each([
    ['es', 'al sobrevolar agregar .h'],
    ['es', 'al pasar por encima agregar .h'],
    ['fr', 'au survol ajouter .h'],
    ['ko', '호버 할 때 .h을 추가'],
  ])('%s: %s', (lang, source) => {
    expect(translate(source, lang, 'en')).toBe('on mouseenter add .h');
  });

  it('no profile normalizes a word to hover', () => {
    for (const lang of getSupportedLanguages()) {
      const keywords = tryGetProfile(lang)?.keywords ?? {};
      for (const entry of Object.values(keywords)) {
        expect((entry as { normalized?: string }).normalized, lang).not.toBe('hover');
      }
    }
  });

  it.each(getSupportedLanguages().filter(l => l !== 'en'))(
    '%s: on mouseenter still reads back',
    lang => {
      const written = translate('on mouseenter add .h', 'en', lang);
      expect(translate(written, lang, 'en')).toBe('on mouseenter add .h');
    }
  );
});
