/**
 * `go` to an element, and `go … in new window`, in every language.
 *
 * go's destination took a literal or an expression, and a tokenizer reads
 * `#d1` as a selector, so `go to #d1` matched no pattern and the whole `go` was
 * lost, in English and so in every translation. Both engines scroll #d1 into
 * view. `in new window` was not modeled at all: `in new` read as `wait new`
 * (the `in <duration>` form of wait), so the go navigated the same window and
 * a phantom wait followed it.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Source → its English render. English renders go's destination without `to`
// and quotes a URL, as the corpus's `go to url "/page"` row always has.
const CASES: Array<[string, string]> = [
  ['on click go to #d1', 'on click go #d1'],
  ['on click go to me', 'on click go me'],
  ['on click go to #d1 then add .z to me', 'on click go #d1 then add .z to me'],
  ['go to #d1', 'go #d1'],
  ['on click go to url "/x" in new window', 'on click go url "/x" in new window'],
  // The command after the phrase stays a command.
  [
    'on click go to url "/x" in new window then add .z to me',
    'on click go url "/x" in new window then add .z to me',
  ],
  [
    'on click add .z to me then go to url "/x" in new window',
    'on click add .z to me then go url "/x" in new window',
  ],
  ['go to url "/x" in new window', 'go url "/x" in new window'],
  // Core-only syntax renders as written: upstream reads `"/x" in …` as its
  // `in` operator, and only `go url "/x" in new window` parses there.
  ['on click go "/x" in new window', 'on click go "/x" in new window'],
  // The forms that already rendered.
  ['on click go to url "/x"', 'on click go url "/x"'],
  ['on click go back', 'on click go back'],
  ['on click go forward', 'on click go forward'],
];

describe.each(CASES)('%s, through every language', (src, english) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(english);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

// The phrase is English in every language, as `using view transition` is: the
// renderer localizes a `window` reference (es `ventana`), and `in new ventana`
// is a phrase in no language.
describe('`in new window` renders in English in every language', () => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse('on click go to url "/x" in new window', 'en')!, language);
    expect(foreign).toContain('in new window');
  });
});
