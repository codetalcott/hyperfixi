import { describe, it, expect } from 'vitest';
import {
  collectActions,
  collectActionsMultiset,
  computeFidelity,
  computeMultisetRecall,
  computePrecision,
  spuriousActions,
  FIDELITY_THRESHOLD,
} from './fidelity';

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

describe('collectActionsMultiset', () => {
  it('preserves duplicate actions the Set-based collector drops', () => {
    // The ja/ko/tr round-trip of `on click toggle .open then put "hi" into #out`
    // renders a phantom `toggle` ahead of the real one: [on, toggle, toggle, put].
    const node = {
      kind: 'event-handler',
      action: 'on',
      body: [
        { kind: 'command', action: 'toggle' }, // phantom, injected by the renderer
        { kind: 'command', action: 'toggle' }, // the real one
        { kind: 'command', action: 'put' },
      ],
    };
    expect(collectActionsMultiset(node)).toEqual(['on', 'put', 'toggle', 'toggle']);
    // The existing Set-based collector cannot see the duplicate:
    expect(collectActions(node)).toEqual(['on', 'put', 'toggle']);
  });

  it('still excludes the structural `compound` wrapper', () => {
    const node = { action: 'compound', statements: [{ action: 'toggle' }, { action: 'toggle' }] };
    expect(collectActionsMultiset(node)).toEqual(['toggle', 'toggle']);
  });
});

describe('computePrecision', () => {
  it('scores a faithful (reordered) parse 1.0', () => {
    const en = ['focus', 'halt', 'if', 'on'];
    expect(computePrecision(en, ['on', 'if', 'halt', 'focus'])).toBe(1);
  });

  it('catches the phantom `toggle` recall is blind to (the renderer bug)', () => {
    // Real shape: EN `on click add .x then remove .y` round-tripped through ja
    // renders as [on, toggle, add, remove] — recall stays 1.0, precision drops.
    const en = ['add', 'on', 'remove'];
    const ja = ['add', 'on', 'remove', 'toggle'];
    expect(computeFidelity(en, ja)).toBe(1); // recall is fooled
    expect(computePrecision(en, ja)).toBeCloseTo(3 / 4); // precision is not
  });

  it('penalizes a duplicated spurious action (multiset)', () => {
    // [toggle, toggle, put] vs reference [put, toggle]: one toggle is spurious.
    expect(computePrecision(['put', 'toggle'], ['put', 'toggle', 'toggle'])).toBeCloseTo(2 / 3);
  });

  it('scores 0 when every candidate action is spurious (ar/ru substitutive case)', () => {
    // ar `on click if … end` collapsed to just a phantom [toggle].
    expect(computePrecision(['if', 'on'], ['toggle'])).toBe(0);
  });

  it('returns undefined when there is no candidate to score', () => {
    expect(computePrecision(['on'], [])).toBeUndefined();
  });
});

describe('computeMultisetRecall', () => {
  it('catches the dropped duplicate that Set-based recall is blind to', () => {
    // The `bind-two-way` shape. EN `bind $n to #a bind $n to #b` is [bind, bind];
    // a parse that truncates to the first command yields [bind]. Every Set-based
    // signal reads this as perfect — which is why the row recorded fidelity 1.0
    // across all 24 languages while every one of them dropped half its body.
    const en = ['bind', 'bind'];
    const truncated = ['bind'];

    expect(computeFidelity(collectSet(en), collectSet(truncated))).toBe(1); // recall is fooled
    expect(computePrecision(en, truncated)).toBe(1); // precision is fooled too
    expect(computeMultisetRecall(en, truncated)).toBe(0.5); // this is not
  });

  it('scores a faithful (reordered) parse 1.0', () => {
    expect(computeMultisetRecall(['bind', 'bind'], ['bind', 'bind'])).toBe(1);
    expect(computeMultisetRecall(['add', 'on', 'remove'], ['on', 'remove', 'add'])).toBe(1);
  });

  it('is not fooled by an added duplicate (that is precision’s job)', () => {
    // A candidate with a phantom extra still has full recall; precision catches it.
    expect(computeMultisetRecall(['bind'], ['bind', 'bind'])).toBe(1);
    expect(computePrecision(['bind'], ['bind', 'bind'])).toBe(0.5);
  });

  it('returns undefined when there is no reference to score against', () => {
    expect(computeMultisetRecall([], ['bind'])).toBeUndefined();
  });
});

/** The deduped Set signature `collectActions` produces, from a multiset. */
function collectSet(actions: readonly string[]): string[] {
  return [...new Set(actions)].sort();
}

describe('spuriousActions', () => {
  it('lists the hallucinated commands a render/parse introduced', () => {
    expect(spuriousActions(['add', 'on', 'remove'], ['add', 'on', 'remove', 'toggle'])).toEqual([
      'toggle',
    ]);
  });

  it('counts duplicates as spurious beyond the reference multiset', () => {
    expect(spuriousActions(['put', 'toggle'], ['put', 'toggle', 'toggle'])).toEqual(['toggle']);
  });

  it('is empty for a faithful subset/reorder', () => {
    expect(spuriousActions(['focus', 'halt', 'if', 'on'], ['on', 'if', 'focus'])).toEqual([]);
  });
});
