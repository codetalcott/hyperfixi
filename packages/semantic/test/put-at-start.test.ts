/**
 * `put X at start of Y` in every language (P60). Only English has a pattern
 * for it; each other language has one for `at end of` alone, and the renderer
 * wrote that in its place (es `poner x en fin de yo`), which `translate`
 * refused. A foreign render writes the language's `prepend`, which English
 * writes back as `put … at start of` (explicit/upstream-spelling.ts).
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, translate, tryGetProfile } from '../src/index';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

describe.each([
  ['on click put x at start of me', 'on click put x at start of me'],
  ['on click put "foo" at start of #d1', 'on click put "foo" at start of #d1'],
  ['on click put x at the start of me', 'on click put x at start of me'],
  ['put x at start of me', 'put x at start of me'],
  [
    'on click set :arr to [2,3] put 1 at start of :arr put :arr as String into me',
    'on click set :arr to [2,3] then put 1 at start of :arr then put :arr as String into me',
  ],
])('%s', (source, english) => {
  it.each(FOREIGN)('%s', language => {
    const rendered = translate(source, 'en', language);
    const prepend = tryGetProfile(language)!.keywords.prepend!.primary;
    expect(rendered.includes(prepend), rendered).toBe(true);
    expect(translate(rendered, language, 'en')).toBe(english);
  });
});

it('a put at the end is still a put', () => {
  expect(translate('on click put x at end of me', 'en', 'es')).toBe('al clic poner x en fin de yo');
});
