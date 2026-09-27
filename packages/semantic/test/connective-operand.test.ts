/**
 * A variable spelled like the language's conjunction.
 *
 * pl `i` ("and") is the usual loop variable, es `y` ("and") a coordinate;
 * it and pt `e`, fr `et` and de `und` are "and" too, and es `o` and pt/fr
 * `ou` are "or". Each tokenizes, or its lexicon reads, as the
 * conjunction, so a role captured `and` for the variable (`set i to 0` came
 * back `set and to 0`) and a value joined it as `and` (`i < 3` as `and < 3`):
 * every pl loop and increment cell of the value matrix failed. A conjunction
 * is never a whole value and never an operator's operand, so in either place
 * the word is now the variable.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const CASES: Array<[string, string]> = [
  ['pl', 'i'],
  ['es', 'y'],
  ['es', 'o'],
  ['it', 'e'],
  ['pt', 'e'],
  ['pt', 'ou'],
  ['fr', 'et'],
  ['fr', 'ou'],
  ['de', 'und'],
];

describe.each(CASES)('%s `%s`', (language, name) => {
  it.each([
    `on click set ${name} to 0 then repeat while ${name} < 3 increment ${name} end then put ${name} into #out`,
    `on click set ${name} to 2 then put ${name} + 1 into #out`,
    `on click set ${name} to 2 then put 1 + ${name} into #out`,
    // A possessive head, which the value's tail extends past the operator.
    `on click set ${name} to 2 then put obj's v + ${name} into #out`,
    `on click set ${name} to 2 then put [${name}, 1] into #out`,
    `on click set ${name} to 2 then if ${name} is 2 then put "Y" into #out end`,
  ])('%s', source => {
    const english = render(parse(source, 'en')!, 'en');
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

describe('a conjunction between two conditions stays one', () => {
  it.each([
    ['pl', 'and'],
    ['es', 'and'],
    ['it', 'and'],
    ['de', 'and'],
    ['pt', 'or'],
    ['fr', 'or'],
  ])('%s `%s`', (language, word) => {
    const source = `on click if x > 1 ${word} x < 9 then put "Y" into #out end`;
    const english = render(parse(source, 'en')!, 'en');
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

describe('a conjunction inside `or equal to` stays one', () => {
  // es `mayor que o igual a`, it `maggiore o uguale a`: the conjunction sits
  // right before `equal`, which is why `equal` does not mark an operand. (pl
  // keeps `equal to` in English, and reads `to` as its own word for `it`: a
  // separate filing.)
  it.each(['es', 'it', 'pt', 'fr', 'de'])('%s', language => {
    for (const phrase of ['greater than or equal to', 'less than or equal to']) {
      const source = `on click if p is ${phrase} 1 then put "Y" into #out end`;
      const english = render(parse(source, 'en')!, 'en');
      const foreign = render(parse(source, 'en')!, language);
      expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
    }
  });
});
