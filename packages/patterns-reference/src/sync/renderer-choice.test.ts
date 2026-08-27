import { describe, it, expect } from 'vitest';
import { noWorseThan, type CandidateScore } from './renderer-choice';

const perfect = (over: Partial<CandidateScore> = {}): CandidateScore => ({
  scores: { actionRecall: 1, multisetRecall: 1, precision: 1, roleFidelity: 1, valueRecall: 1 },
  roundTrip: true,
  engineValid: true,
  ...over,
});
const withScore = (k: keyof CandidateScore['scores'], v: number | undefined): CandidateScore =>
  perfect({ scores: { ...perfect().scores, [k]: v } });

describe('best-renderer choice rule', () => {
  it('a candidate that does not parse loses to any that does, and ties with another non-parse', () => {
    expect(noWorseThan(null, perfect())).toBe(false);
    expect(noWorseThan(perfect(), null)).toBe(true);
    expect(noWorseThan(null, null)).toBe(true);
  });

  it('ties go to the first candidate (semantic)', () => {
    expect(noWorseThan(perfect(), perfect())).toBe(true);
  });

  it('loses on any lower ratchet score, wins on a higher one', () => {
    for (const k of [
      'actionRecall',
      'multisetRecall',
      'precision',
      'roleFidelity',
      'valueRecall',
    ] as const) {
      expect(noWorseThan(withScore(k, 0.5), perfect()), `${k} lower`).toBe(false);
      expect(noWorseThan(perfect(), withScore(k, 0.5)), `${k} higher`).toBe(true);
    }
  });

  it('an undefined score (nothing invariant to compare) never decides, on either side', () => {
    expect(noWorseThan(withScore('valueRecall', undefined), perfect())).toBe(true);
    expect(noWorseThan(perfect(), withScore('valueRecall', undefined))).toBe(true);
  });

  it('the English round-trip is a veto: a mismatch loses only to a match', () => {
    expect(noWorseThan(perfect({ roundTrip: false }), perfect())).toBe(false);
    expect(noWorseThan(perfect(), perfect({ roundTrip: false }))).toBe(true);
    expect(noWorseThan(perfect({ roundTrip: false }), perfect({ roundTrip: false }))).toBe(true);
  });

  it('engine validity is a veto too, and an unavailable engine never decides', () => {
    expect(noWorseThan(perfect({ engineValid: false }), perfect())).toBe(false);
    expect(noWorseThan(perfect(), perfect({ engineValid: false }))).toBe(true);
    expect(noWorseThan(perfect({ engineValid: undefined }), perfect())).toBe(true);
    expect(noWorseThan(perfect({ engineValid: false }), perfect({ engineValid: undefined }))).toBe(
      true
    );
  });

  it('a veto does not rescue a lower score', () => {
    expect(
      noWorseThan(withScore('roleFidelity', 0.5), perfect({ roundTrip: false, engineValid: false }))
    ).toBe(false);
  });
});
