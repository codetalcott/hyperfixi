/**
 * A fetch's response type (`as text`, `as html`), written as written.
 *
 * The type names a format core reads, not a word. Renders localized it through
 * the value lexicon where one had an entry (ms `teks`, ru `текст`, th
 * `ข้อความ`, bn `পাঠ্য`), and no parser read it back: in ms/ru/th/tl/uk/vi a
 * translated fetch carried an unknown type, and bn/hi dropped it. It renders
 * in English in every language now, as `json` (which no lexicon translates)
 * already did.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const CASES = [
  'on click fetch "/x" as text then put it into me',
  'on click fetch "/x" as html then put it into me',
  'on click fetch "/x" as json then put it into me',
  'on click fetch "/x" as JSON then put it into me',
  'on click fetch "/x" as response then log it',
];

describe.each(CASES)('%s, through every language', src => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

it.each([
  ['ms', 'teks'],
  ['ru', 'текст'],
  ['th', 'ข้อความ'],
  ['bn', 'পাঠ্য'],
])('%s writes `text`, not its lexicon word %s', (language, word) => {
  const foreign = render(parse(CASES[0], 'en')!, language);
  expect(foreign).toContain('text');
  expect(foreign).not.toContain(word);
});
