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
  // A `$` or `:` variable URL reads as a reference, which fetch's `as` patterns did not
  // take: the bare pattern won and its value swallowed `as JSON` as a conversion.
  'on click fetch $u as JSON then put it into me',
  'on click fetch :u as text then put it into me',
  // The engine's other names (`Object` is JSON) and its conversions (`Number`): bn,
  // hi and ko left them behind a fused handler head, read by a reclaim that knew
  // only the format words.
  'on click fetch "/x" as Object then put it into me',
  'on click fetch "/x" as Number then put it into me',
  'on click fetch "/x" as String then put it into me',
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

it('a `$` variable URL leaves `as JSON` to the response type', () => {
  const fetchNode = parse('on click fetch $u as JSON', 'en')!.body![0]!;
  expect(fetchNode.roles.get('source')).toMatchObject({ type: 'reference', value: '$u' });
  expect(fetchNode.roles.get('responseType')).toMatchObject({ raw: 'JSON' });
});
