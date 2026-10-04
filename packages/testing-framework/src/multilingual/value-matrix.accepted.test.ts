/**
 * The value matrix's accepted pairs (ACCEPTED in value-matrix.ts): failures the
 * owner decided to keep. A cell's entry carries the reason only when every
 * failing lane is accepted, so a new failure in an accepted cell still reads as
 * open work.
 */
import { describe, it, expect } from 'vitest';
import {
  ACCEPTED,
  acceptedReason,
  baselineFrom,
  expandLanes,
  generateCells,
  type CellResult,
} from './value-matrix';
import { loadBaseline } from './value-matrix-gate';

describe('value matrix: accepted pairs', () => {
  const [known, ambiguity] = ACCEPTED;

  it('tags a cell whose failing lanes are all accepted', () => {
    expect(acceptedReason('put|the textContent of #a as Int', ['en'])).toBe(known!.reason);
    expect(acceptedReason('increment|#a.textContent', ['it/up'])).toBe(ambiguity!.reason);
    expect(acceptedReason('increment|#a.textContent', ['it/up', 'it/eng'])).toBe(ambiguity!.reason);
  });

  it('leaves it open when one failing lane is not', () => {
    expect(acceptedReason('increment|#a.textContent', ['it/up', 'es/up'])).toBeUndefined();
    expect(acceptedReason('put|the textContent of #a as Int', ['en', 'es/up'])).toBeUndefined();
  });

  it('a regenerated baseline carries the reason, and counts the pairs', () => {
    const result = (lanes: Record<string, string>): CellResult => ({
      id: 'increment|#a.textContent',
      want: '7',
      lanes: { en: '7', 'es/up': '7', ...lanes },
    });
    const kept = baselineFrom([result({ 'it/up': '1', 'it/eng': '1' })], '');
    expect(kept.entries['increment|#a.textContent']?.accepted).toBe(ambiguity!.reason);
    expect(kept.accepted).toBe(2);
    const open = baselineFrom([result({ 'it/up': '1', 'es/up': '1' })], '');
    expect(open.entries['increment|#a.textContent']?.accepted).toBeUndefined();
    expect(open.accepted).toBe(0);
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
