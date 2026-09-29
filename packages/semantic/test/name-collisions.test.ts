/**
 * Name collisions (name-collisions.ts): which variables a language reads as
 * one of its own words, and where a program's parse reads each as the
 * variable, for the validator's and the editor's warning and its rename.
 */
import { describe, it, expect } from 'vitest';
import { findNameCollisions, nameCollision, parse, render } from '../src/index';
import type { NameCollisionFinding } from '../src/index';

describe('nameCollision', () => {
  it.each([
    // A keyword, a particle, a conjunction.
    ['si', 'es', 'structure'],
    ['y', 'es', 'structure'],
    ['a', 'es', 'structure'],
    ['i', 'tr', 'structure'],
    // A schema's role marker the tokenizer leaves an identifier (de `um`, by).
    ['um', 'de', 'structure'],
    // A connective the join reads (tl `o`, or).
    ['o', 'tl', 'structure'],
    // An English article: the role capture skips one in every language.
    ['a', 'de', 'structure'],
    // A pronoun: no spelling tells it from the reference.
    ['eu', 'pt', 'pronoun'],
    ['o', 'tr', 'pronoun'],
    // A plain identifier.
    ['count', 'es', null],
    ['si', 'de', null],
    ['zz', 'es', null],
  ])('%s in %s: %s', (name, language, expected) => {
    expect(nameCollision(name, language)).toBe(expected);
  });
});

/** `code` with each occurrence of `finding` renamed to `to`. */
function renamed(code: string, finding: NameCollisionFinding, to: string): string {
  let out = code;
  for (const { start, end } of [...finding.occurrences].reverse()) {
    out = out.slice(0, start) + to + out.slice(end);
  }
  return out;
}

const asWord = (name: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}_$])${name}(?![\\p{L}\\p{N}_$])`, 'gu');

describe('findNameCollisions', () => {
  // Each program in English, rendered into a language where its variable
  // collides; how many of the name's occurrences are the variable.
  const CASES: Array<[string, string, string, number]> = [
    ['on click set y to 5 then put y into #out', 'es', 'y', 2],
    // Not the `y` that is `and`.
    ['on click if y > 3 and z < 2 then put y into #out end', 'es', 'y', 2],
    // Not the accusative `i` after each variable `i`.
    ['on click set i to 1 then increment i then put i into #out', 'tr', 'i', 3],
    ['on click set um to 1 then put um into #out', 'de', 'um', 2],
    ['on click set o to true then if o then put 1 into #out end', 'tl', 'o', 2],
    ['on click repeat while i < 3 increment i end then put i into #out', 'pl', 'i', 3],
  ];

  it.each(CASES)('%s (%s)', (source, language, name, count) => {
    const code = render(parse(source, 'en')!, language);
    const finding = findNameCollisions(code, language).find(f => f.name === name);
    expect(finding, code).toBeDefined();
    expect(finding!.occurrences.length, code).toBe(count);
    for (const { start, end } of finding!.occurrences) expect(code.slice(start, end)).toBe(name);
    // The rename collides with nothing, and renaming the occurrences keeps the
    // program's reading.
    const to = finding!.rename!;
    expect(nameCollision(to, language)).toBeNull();
    const english = render(parse(code, language)!, 'en');
    expect(render(parse(renamed(code, finding!, to), language)!, 'en'), code).toBe(
      english.replace(asWord(name), to)
    );
  });

  it('says what the name collides with', () => {
    const code = render(parse('on click set si to 1 then put si into #out', 'en')!, 'es');
    const [finding] = findNameCollisions(code, 'es');
    expect(finding?.message).toBe(
      'Variable `si` is also the word for `if` in es: a reader tells them apart only by where it stands.'
    );
    expect(finding?.rename).toBe('si1');
  });

  it('suggests a rename a digit does not split (tr, qu)', () => {
    const code = render(parse('on click set i to 1 then put i into #out', 'en')!, 'tr');
    const [finding] = findNameCollisions(code, 'tr');
    expect(finding?.rename).toBe('iValue');
  });

  it('reports nothing in English, or for a name that collides nowhere', () => {
    expect(findNameCollisions('on click set y to 5 then put y into #out', 'en')).toEqual([]);
    const code = render(parse('on click set count to 5 then put count into #out', 'en')!, 'es');
    expect(findNameCollisions(code, 'es')).toEqual([]);
  });

  it('cannot see a pronoun: the parse reads the reference', () => {
    const code = render(parse('on click set eu to 1 then put eu into #out', 'en')!, 'pt');
    expect(findNameCollisions(code, 'pt')).toEqual([]);
  });

  it('reads no occurrence inside a string or a selector', () => {
    const code = render(parse(`on click set y to 'y' then put y into #y`, 'en')!, 'es');
    const [finding] = findNameCollisions(code, 'es');
    expect(finding?.occurrences.map(({ start, end }) => code.slice(start, end))).toEqual([
      'y',
      'y',
    ]);
    expect(finding?.occurrences.every(({ start }) => code[start - 1] === ' ')).toBe(true);
  });
});
