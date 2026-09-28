/**
 * The value matrix's accepted pairs (ACCEPTED in value-matrix.ts): failures the
 * owner decided to keep. A cell's entry carries the reason only when every
 * failing lane is accepted, so a new failure in an accepted cell still reads as
 * open work.
 */
import { describe, it, expect } from 'vitest';
import { ACCEPTED, acceptedReason, expandLanes, generateCells } from './value-matrix';
import { loadBaseline } from './value-matrix-gate';

describe('value matrix: accepted pairs', () => {
  const [known, ambiguity] = ACCEPTED;

  it('tags a cell whose failing lanes are all accepted', () => {
    expect(acceptedReason('put|the textContent of #a as Int', ['en', 'es', 'ja'])).toBe(
      known!.reason
    );
    expect(acceptedReason('increment|#a.textContent', ['it', 'it/up'])).toBe(ambiguity!.reason);
  });

  it('leaves it open when one failing lane is not', () => {
    expect(acceptedReason('increment|#a.textContent', ['it', 'es'])).toBeUndefined();
    expect(acceptedReason('put|the textContent of #a as Int', ['en', 'es/up'])).toBeUndefined();
  });

  it('accepts only the cells it names', () => {
    expect(acceptedReason('put|textContent of #a', ['en'])).toBeUndefined();
  });

  it('names cells the generator makes, and the baseline lists them as accepted', () => {
    const ids = new Set(generateCells().map(cell => cell.id));
    const baseline = loadBaseline();
    for (const entry of ACCEPTED) {
      for (const id of entry.cells) {
        expect(ids.has(id), id).toBe(true);
        expect(baseline.entries[id]?.accepted, id).toBe(entry.reason);
        expect(expandLanes(baseline.entries[id]!.lanes).length, id).toBeGreaterThan(0);
      }
    }
  });
});
