/**
 * The value matrix runs every (cell, lane) pair in one process, so no run may
 * see another's writes. Two ways one did:
 *   - a run writes a window global (`increment n`); `@hyperfixi/core` also kept
 *     global variables in a Map every context shared, so one lane's write made
 *     every later run read `n` as 7 (that lane left with core's engine in C4,
 *     and the reset still restores every global);
 *   - a lane can remove the body (tr read `increment i by 2 * 2` as
 *     `increment *`), and the next run's reset then threw.
 *
 * One set of engines for the file: the engines bind the window they are first
 * loaded with, so a second initMatrixEngines() would run on a stale document.
 *
 * @vitest-environment node
 * Required, not a preference: see value-matrix.put.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initMatrixEngines, type MatrixCell, type MatrixEngines } from './value-matrix';

const cell = (id: string, source: string): MatrixCell => ({
  id,
  position: 'put',
  group: 'operand',
  source,
});

const read = cell('reads', 'on click put n into #out');

describe('value matrix: runs are isolated', () => {
  let engines: MatrixEngines;
  beforeAll(async () => {
    engines = await initMatrixEngines();
  }, 120_000);
  afterAll(async () => {
    await engines.close();
  });

  it('a global one run writes is gone in the next', async () => {
    const before = await engines.runCell(read);
    // A cell whose oracle writes nothing runs no lane, so this one puts.
    const writes = await engines.runCell(
      cell('writes', 'on click increment n then put n into #out')
    );
    const after = await engines.runCell(read);
    expect(writes.lanes.eng).toBe('7');
    expect(before.want).toBe('6');
    expect(before.lanes.eng).toBe('6');
    expect(after.lanes).toEqual(before.lanes);
  }, 120_000);

  it('a run that removes the body leaves the next its fixture', async () => {
    const before = await engines.runCell(read);
    await engines.runCell(cell('removes', 'on click remove document.body'));
    const after = await engines.runCell(read);
    expect(before.lanes.eng).toBe('6');
    expect(after.lanes).toEqual(before.lanes);
  }, 120_000);
});
