/**
 * A type name is the runtime's vocabulary, not the language's (value-lexicon
 * TYPE_NAME, PR 95). Both engines read `Element`, `Number`, `HTMLElement` in
 * English, so a rendering keeps what `as` converts to and what `is a`/`is an`
 * checks. Localized, `#a is an Element` read back as `#a is an elemento`,
 * false in every language whose lexicon names `element`, and `set x to 7 as
 * Element` lost its conversion.
 */
import { describe, it, expect } from 'vitest';
import { CONVERSION_TYPE_NAMES } from '../src/parser/utils/expression-lexicon';
import { parse, render } from '../src/index';

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

/** Core's conversions (not `json`, fetch's response type), and `Fixed:2`. */
const CONVERSIONS = [...[...CONVERSION_TYPE_NAMES].filter(name => /^[A-Z]/.test(name)), 'Fixed:2'];

/** What a type check names: a plain conversion name, or a DOM or JS type. */
const CHECKED_TYPES = [
  ...CONVERSIONS.filter(name => !name.includes(':')),
  'Element',
  'HTMLElement',
  'Node',
  'Text',
  'Document',
  'Window',
  'Event',
  'NodeList',
];

const article = (type: string): string => (/^[AEIOU]/.test(type) ? 'an' : 'a');

const SOURCES = [
  ...CONVERSIONS.map(type => `on click put x as ${type} into #out`),
  ...CHECKED_TYPES.flatMap(type => [
    `on click put #a is ${article(type)} ${type} into #out`,
    `on click put #a is not ${article(type)} ${type} into #out`,
  ]),
];

/**
 * qu's tokenizer takes a word's last `ta` for its accusative: `FormData`
 * reads as `FormDa` and a marker, and the `put` keeps `ta` (filed with PR 95;
 * the same on main).
 */
const BROKEN: Record<string, readonly string[]> = { FormData: ['qu'] };

describe.each(SOURCES)('%s', source => {
  const english = render(parse(source, 'en')!, 'en');
  const type = source.match(/(?:as|an?) (\S+) into/)![1]!;
  const languages = LANGUAGES.filter(language => !BROKEN[type]?.includes(language));

  it.each(languages)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    const back = parse(foreign, language);
    expect(back ? render(back, 'en') : `(no parse)`, foreign).toBe(english);
  });
});
