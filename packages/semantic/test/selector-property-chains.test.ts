/**
 * A property chain on an element (`#d1.value.length`), in every language.
 *
 * The tokenizer reads `#d1.value.length` as `#d1`, `.value`, `.length`, and
 * the matcher folded only the first `.prop` into the element's property path.
 * The rest stranded: `put #d1.value.length into #out` lost the whole put, in
 * English and so in every translation, and `log #d1.value.length` logged
 * `#d1.value`. Both engines read the whole chain.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English.
const CASES: string[] = [
  'on click put #d1.value.length into #out',
  'on click log #d1.value.length',
  'on click set x to #d1.value.length then put x into #out',
  'on click put #l1.children.length into #out',
  'put #d1.value.length into #out',
  // A method call at the end of the chain stays a call.
  'on click call #x.a.foo(1)',
  // The one-property form, as before.
  'on click put #d1.value into #out',
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
