/**
 * A snake_case name (`global_function()`, `my_var`) is one word in every language.
 *
 * Eleven tokenizers (de es fr id it pl pt qu sw tr vi) split a word at `_`, so
 * `call global_function()` read back as `global _` + `function ( )` and was refused.
 * id, sw and tr kept an `_`-joined run whole only when it was a registered keyword
 * (`ubah_ukuran`, `panya_shuka`, `tuş_bas`); `_` is now a word character mid-word, as
 * the Cyrillic and Malay extractors had it, and a leading `_` still starts no word.
 */
import { describe, it, expect } from 'vitest';
import { tokenize, translate, getSupportedLanguages } from '../src/index';

const LANGUAGES = getSupportedLanguages();
const FOREIGN = LANGUAGES.filter(l => l !== 'en');

describe('a snake_case name tokenizes as one word', () => {
  it.each(LANGUAGES)('%s', language => {
    for (const name of ['global_function', 'my_func', 'foo_bar_baz', 'x_1']) {
      const words = tokenize(`${name}()`, language)
        .tokens.map(t => t.value)
        .filter(v => v !== '(' && v !== ')');
      expect(words, name).toEqual([name]);
    }
  });
});

describe.each(['on click call global_function()', 'on click set my_var to 1'])('%s', source => {
  it.each(FOREIGN)('reads back from %s', language => {
    const foreign = translate(source, 'en', language);
    expect(translate(foreign, language, 'en'), foreign).toBe(source);
  });
});

it('an `_`-joined keyword is still one keyword', () => {
  const [sw] = tokenize('panya_shuka', 'sw').tokens;
  expect(sw).toMatchObject({ value: 'panya_shuka', normalized: 'mousedown' });
  const [tr] = tokenize('tuş_bas', 'tr').tokens;
  expect(tr).toMatchObject({ value: 'tuş_bas', normalized: 'keydown' });
});
