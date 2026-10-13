/**
 * The `in` that scopes a query, in each language's own word (M2, vocabulary
 * sheet A5): `<button/> in me`, `first <input/> in closest <form/>`, `last
 * <.message/> in #chat`. It was English in every translation. The word is the
 * dictionary's `modifiers.in` (grammar-words.ts QUERY_IN), and every reader
 * still takes English's.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, render, translate, tryGetProfile } from '../src/index';
import { QUERY_IN } from '../src/parser/utils/grammar-words';
import { dictionaries } from '../../i18n/src/dictionaries';

// de and it spell it `in`.
const NATIVE = getSupportedLanguages().filter(
  l => QUERY_IN[l] !== undefined && QUERY_IN[l] !== 'in'
);

const words = (text: string): string[] => text.split(/\s+/);

/**
 * Does a render write the language's query `in`? Before a pronoun it can take
 * a vowel (pl `we mnie`, ru `во мне`; M2 N3). A verb-final language writes
 * the scope first, with its own marker (tr `#list içindeki <li/>`, `bendeki`).
 */
function writesQueryIn(rendered: string, language: string): boolean {
  const profile = tryGetProfile(language);
  const spellings: string[] = [];
  for (const word of [QUERY_IN[language]!, profile?.queryScopeFirst?.marker]) {
    if (!word) continue;
    const form = profile?.obliqueReferences?.me?.[word];
    const phrases = (typeof form === 'string' ? [form] : [form?.location]).filter(
      (p): p is string => p !== undefined
    );
    spellings.push(word, ...phrases.map(p => p.split(' ')[0]!));
  }
  return words(rendered).some(w => spellings.includes(w));
}

describe.each([
  'on click focus first <input/> in closest <form/>',
  'on submit add @disabled to <button/> in me then put "Submitting..." into <button/> in me',
  'on click scroll to last <.message/> in #chat',
  'on keydown from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end',
  'on click remove <li/> in #list',
  'on click if no <li/> in #list then log 1 end',
  'on click if target matches <button/> in me then log 1 end',
  'on click set x to first .item in #list',
  'on click repeat for x in <li/> in #list log x end',
])('%s', source => {
  it.each(NATIVE)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(writesQueryIn(rendered, language), rendered).toBe(true);
    // vi's `log` is `in ra`.
    if (language !== 'vi') expect(words(rendered)).not.toContain('in');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('English’s `in` still reads', () => {
  it.each([
    [
      'es',
      'al clic enfoque primero <input/> in cercano <form/>',
      'on click focus first <input/> in closest <form/>',
    ],
    [
      'es',
      'al envío agregar @disabled a <button/> in yo',
      'on submit add @disabled to <button/> in me',
    ],
    [
      'ja',
      '送信 を で <button/> in 自分 に @disabled を 追加',
      'on submit add @disabled to <button/> in me',
    ],
  ])('%s: %s', (language, source, english) => {
    expect(translate(source, language, 'en')).toBe(english);
  });
});

describe('only a query’s `in`', () => {
  it.each(NATIVE)('%s: a comparison keeps English’s', language => {
    const rendered = translate('on click if x is in <li/> in me then log 1 end', 'en', language);
    expect(rendered).toContain(' in <li/>');
    expect(writesQueryIn(rendered, language), rendered).toBe(true);
  });
});

// es `obtener <input/> en yo` was read as get's `on me` while get had a
// destination slot (which no reader used), so the verified render wrote
// English's `in` after a get. With the slot gone, the language's word reads back.
describe('a native `in` after a get reads back', () => {
  // A positional run in a value, and a scoped query role.
  describe.each(['on click get the value of first <input/> in me', 'on click get <input/> in me'])(
    '%s',
    source => {
      it.each(['es', 'ar', 'pl', 'ru'])('%s', language => {
        const rendered = render(parse(source, 'en')!, language);
        expect(words(rendered)).not.toContain('in');
        expect(writesQueryIn(rendered, language), rendered).toBe(true);
        expect(translate(rendered, language, 'en')).toBe(source);
      });
    }
  );
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(getSupportedLanguages().filter(l => l !== 'en'))('%s', language => {
    const modifiers = (dictionaries as Record<string, { modifiers?: Record<string, string> }>)[
      language
    ]?.modifiers;
    expect(QUERY_IN[language]).toBe(modifiers?.in);
  });
});
