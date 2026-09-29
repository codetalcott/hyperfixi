/**
 * The value matrix's colliding names (collidingNames in value-matrix.ts). The
 * list is derived, so these pin what each source puts in and what each rule
 * leaves out; the matrix shards run the names themselves.
 */
import { describe, it, expect } from 'vitest';
import { collidingNames, generateCells } from './value-matrix';

const names = new Map(collidingNames().map(entry => [entry.name, entry]));

describe('value matrix: colliding names', () => {
  it('takes a word a tokenizer reads as structure', () => {
    expect(names.has('a')).toBe(true); // es, it, pt `to`; a tr particle
    expect(names.has('y')).toBe(true); // es `and`
    expect(names.has('wo')).toBe(true); // de `where`
  });

  it('takes a schema marker the tokenizer leaves an identifier', () => {
    expect(names.has('um')).toBe(true); // de `increment … by`
  });

  it('leaves out English keywords, but not the articles', () => {
    expect(names.has('in')).toBe(false);
    expect(names.has('on')).toBe(false);
    expect(names.has('an')).toBe(true);
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
