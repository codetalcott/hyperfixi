/**
 * The value matrix's colliding names (collidingNames in value-matrix.ts). The
 * list is derived, so these pin what each source puts in and what each rule
 * leaves out; the matrix shards run the names themselves.
 */
import { describe, it, expect } from 'vitest';
import { KEYWORD_NAMES, collidingNames, generateCells } from './value-matrix';

const names = new Map(collidingNames().map(entry => [entry.name, entry]));

describe('value matrix: colliding names', () => {
  it('takes a word a tokenizer reads as structure', () => {
    expect(names.has('a')).toBe(true); // es, it, pt `to`; a tr particle
    expect(names.has('y')).toBe(true); // es `and`
    expect(names.has('wo')).toBe(true); // de `where`
  });

  it('takes a longer name as code writes it, which a tokenizer splits', () => {
    expect(names.get('userData')?.pronounIn).toEqual([]); // qu `userDa` + `ta`
  });

  it('takes a schema marker the tokenizer leaves an identifier', () => {
    expect(names.has('um')).toBe(true); // de `increment … by`
  });

  it('leaves out English keywords, but not the articles', () => {
    expect(names.has('in')).toBe(false);
    expect(names.has('on')).toBe(false);
    expect(names.has('an')).toBe(true);
  });

  // Upstream runs each as a variable; English's own parse dropped `set input
  // to "a"`, and every language wrote `when` as its keyword (P49).
  it('takes the English words upstream runs as variables (KEYWORD_NAMES)', () => {
    for (const name of KEYWORD_NAMES) expect(names.has(name), name).toBe(true);
    expect(KEYWORD_NAMES).toContain('input'); // an event name
    expect(KEYWORD_NAMES).toContain('when'); // a structure word
    expect(KEYWORD_NAMES).toContain('index'); // a value-lexicon word (P28)
    expect(names.has('if')).toBe(false); // P53
  });

  it("leaves out upstream's `no` and the templates' variables", () => {
    expect(names.has('no')).toBe(false);
    expect(names.has('i')).toBe(false);
  });

  it('leaves out a name that only ever collides with a pronoun', () => {
    expect(names.has('eu')).toBe(false); // pt `me`
    expect(names.has('io')).toBe(false); // it `me`
  });

  it("keeps a name that is a pronoun elsewhere, without that language's lanes", () => {
    expect(names.get('o')?.pronounIn).toEqual(['tr']); // es and it `or`; tr `it`
    expect(names.get('es')?.pronounIn).toEqual(['de']); // es `is`; de `it`
    const cells = generateCells().filter(cell => cell.name === 'o');
    expect(cells.map(cell => `${cell.position}|${cell.expression}`)).toEqual([
      'put|o',
      'set|o',
      'if|o',
      'increment|o',
      'chain|o',
      'get|o',
      'assign|o',
      'count|o',
      'put|o + 1',
      'set|1 + o',
      'if|o < 3',
      'if|not o',
    ]);
    expect(cells.every(cell => cell.skip?.join() === 'tr')).toBe(true);
  });
});
