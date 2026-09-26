/**
 * `put X into <variable>` and `put X into <property path>`, in every language.
 *
 * put's destination took a selector or reference only (`#out`, `me`,
 * `result`), so a variable (`into item`, a loop's element) or a property
 * path (`into my.textContent`) matched no generated pattern and the put was
 * dropped in ar/de/fr/id/zh — English's handcrafted pattern never checked the
 * type. id's and zh's handcrafted patterns had copied the narrow list; they
 * now read the schema's.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// [source, its English render]
const CASES: [string, string][] = [
  ['on click put 1 into item', 'on click put 1 into item'],
  ['on click put it into item', 'on click put it into item'],
  ['on click put 1 into my.textContent', 'on click put 1 into my textContent'],
  [
    'on click repeat for item in <li/> in #list put "x" into item end',
    'on click repeat for item in <li/> in #list put "x" into item end',
  ],
  // The types it always took.
  ['on click put "x" into #out', 'on click put "x" into #out'],
  ['on click put 1 into result', 'on click put 1 into result'],
];

describe.each(CASES)('%s, through every language', (src, expected) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});
