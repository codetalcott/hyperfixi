import { describe, it, expect } from 'vitest';
import { collectActions, computeFidelity, FIDELITY_THRESHOLD } from './fidelity';

describe('collectActions', () => {
  it('collects distinct actions across a nested event-handler tree', () => {
    // Shape of the English `focus-trap` parse: on { if ; focus ; halt }.
    const node = {
      kind: 'event-handler',
      action: 'on',
      body: [
        {
          kind: 'compound',
          action: 'compound',
          statements: [
            { kind: 'command', action: 'if' },
            { kind: 'command', action: 'focus' },
            { kind: 'command', action: 'halt' },
          ],
        },
      ],
    };
    expect(collectActions(node)).toEqual(['focus', 'halt', 'if', 'on']);
  });

  it('excludes the structural `compound` wrapper', () => {
    const node = { action: 'compound', statements: [{ action: 'toggle' }] };
    expect(collectActions(node)).toEqual(['toggle']);
  });

  it('handles a flat command and non-object input', () => {
    expect(collectActions({ kind: 'command', action: 'toggle' })).toEqual(['toggle']);
    expect(collectActions(null)).toEqual([]);
    expect(collectActions(undefined)).toEqual([]);
  });
});

describe('computeFidelity', () => {
  const en = ['focus', 'halt', 'if', 'on'];

  it('scores a faithful (reordered) parse 1.0', () => {
    // SOV/VSO reorder keeps the same command set → full fidelity.
    expect(computeFidelity(en, ['on', 'if', 'halt', 'focus'])).toBe(1);
  });

  it('scores a degenerate parse low (focus-trap dropping commands)', () => {
    // ja `focus-trap` parsed as `on { from }` — only `on` survives of 4.
    const score = computeFidelity(en, ['on', 'from']);
    expect(score).toBeCloseTo(0.25);
    expect(score! < FIDELITY_THRESHOLD).toBe(true);
  });

  it('is recall, not precision — extra candidate actions do not lower it', () => {
    expect(computeFidelity(['toggle'], ['toggle', 'add', 'remove'])).toBe(1);
  });

  it('returns undefined when there is no reference to score against', () => {
    expect(computeFidelity([], ['on'])).toBeUndefined();
  });
});
