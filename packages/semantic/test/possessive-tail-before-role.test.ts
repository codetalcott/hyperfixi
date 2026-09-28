/**
 * A written target that is a possessive, before a role with no marker.
 *
 * The languages that write an increment's amount bare (it, pl, ru, zh, …) and
 * the ones whose `set` puts the value after the target with no marker (it, pl,
 * ru, uk: `impostare in obj's v 5`) left the target's capture nothing to stop
 * at, so it took `obj` and the next role took the rest: `increment obj's v`
 * read back `increment obj by '`, `set v of obj to 5` as `set v to of`. The
 * value now runs on through a possessive, and only through one, so the amount
 * or the value after it is still its own role.
 *
 * qu and uk keep an apostrophe inside a word, so `obj's foo's bar` is three
 * words there, and the value's run stopped at `foo's`: qu dropped `obj's` and
 * uk `foo's bar`, wherever the chain stood.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English.
const CASES = [
  "on click increment obj's v then put obj's v into #out",
  'on click increment v of obj then put v of obj into #out',
  "on click set obj's v to 5 then put obj's v into #out",
  'on click set v of obj to 5 then put v of obj into #out',
  "on click increment obj's v by 2 then put obj's v into #out",
  'on click increment v of obj by n then put v of obj into #out',
  "on click set obj's foo's bar to n then put obj's foo's bar into #out",
  'on click set bar of foo of obj to 5 then put bar of foo of obj into #out',
  "on click increment obj's foo's bar then put 1 into #out",
  'on click increment bar of foo of obj then put 1 into #out',
  // qu and uk keep the apostrophe in a word: `foo's` is one token.
  "on click put obj's foo's bar into #out",
  "on click decrement obj's v then put obj's v into #out",
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

// Hand-written: what follows a target that is not a possessive is the next role.
describe('the next role keeps its value', () => {
  it.each([
    ['it', 'su click impostare in x 5', 'on click set x to 5'],
    ['it', 'su click impostare in x y', 'on click set x to y'],
    ['pl', 'gdy click ustaw do x y', 'on click set x to y'],
    ['it', 'su click incrementare obj di 5', 'on click increment obj by 5'],
    ['zh', '一 点击 就 增加 把 n 5', 'on click increment n by 5'],
  ])('%s: %s', (language, source, english) => {
    expect(render(parse(source, language)!, 'en')).toBe(english);
  });
});
