/**
 * The `element` that scopes a variable, in each language's own word (M2,
 * vocabulary sheet A10): `set element x to 10` is es `establecer elemento x a
 * 10`. It was English in every translation. The word is the dictionary's
 * `values.element` (grammar-words.ts ELEMENT_SCOPE), and every reader still
 * takes English's.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, render, translate } from '../src/index';
import { ELEMENT_SCOPE } from '../src/element-scope';
import { dictionaries } from '../../i18n/src/dictionaries';

const LANGUAGES = getSupportedLanguages().filter(l => l !== 'en');
// de and pl spell it `element`.
const NATIVE = LANGUAGES.filter(l => ELEMENT_SCOPE[l] !== 'element');

describe.each([
  'on click set element x to 10',
  'on click set element x to 10 then put element x into me',
  'on click increment element count',
  'on click default element x to 0',
  // Inside a value.
  'on click if element x is 1 then log 1 end',
  'on click set element x to element x + 1',
])('%s', source => {
  it.each(NATIVE)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(rendered).toContain(`${ELEMENT_SCOPE[language]} `);
    expect(rendered.split(/\s+/)).not.toContain('element');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

// Both engines read `the element's x` as `element x`, the name it writes.
describe('the possessive spelling', () => {
  it.each(NATIVE)('%s', language => {
    const rendered = render(parse('on click set the element\'s x to 1', 'en')!, language);
    expect(rendered).toContain(`${ELEMENT_SCOPE[language]} x`);
    expect(translate(rendered, language, 'en')).toBe('on click set element x to 1');
  });

  // Before an index, only `element's` reads: `element bar["count"]` is lost in
  // English too.
  it.each(NATIVE)('%s: before an index it stays English', language => {
    const source = 'on click put element\'s bar["count"] into me';
    const rendered = render(parse(source, 'en')!, language);
    expect(rendered).toContain("element's bar");
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('the language’s word reads back', () => {
  it.each([
    ['es', 'al clic establecer elemento x a 10'],
    ['vi', 'khi nhấp gán phần tử x vào 10'],
    ['ja', 'クリック を で 要素 x を 10 に 設定'],
  ])('%s: %s', (language, code) => {
    expect(translate(code, language, 'en')).toBe('on click set element x to 10');
  });
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(LANGUAGES)('%s', language => {
    const values = (dictionaries as Record<string, { values?: Record<string, string> }>)[language]
      ?.values;
    expect(ELEMENT_SCOPE[language]).toBe(values?.element);
  });
});
