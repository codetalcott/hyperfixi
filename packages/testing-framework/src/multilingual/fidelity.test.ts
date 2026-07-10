import { describe, it, expect } from 'vitest';
import {
  collectActions,
  collectActionsMultiset,
  collectRoleValueSignature,
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

describe('collectRoleValueSignature', () => {
  it('emits every invariant-shaped value class, from a roles Map', () => {
    const node = {
      kind: 'event-handler',
      action: 'on',
      roles: new Map<string, unknown>([
        ['event', { type: 'expression', raw: 'draggable:start' }], // colon-qualified (the #633 class)
      ]),
      body: [
        {
          kind: 'command',
          action: 'toggle',
          roles: new Map<string, unknown>([
            ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
          ]),
        },
        {
          kind: 'command',
          action: 'set',
          roles: new Map<string, unknown>([
            ['destination', { type: 'expression', raw: ':x' }], // sigil ref
          ]),
        },
        {
          kind: 'command',
          action: 'wait',
          roles: new Map<string, unknown>([
            ['duration', { type: 'literal', value: '200ms', dataType: 'duration' }],
          ]),
        },
        {
          kind: 'command',
          action: 'fetch',
          roles: new Map<string, unknown>([['source', { type: 'literal', value: '/api/data' }]]),
        },
      ],
    };
    expect(collectRoleValueSignature(node)).toEqual([
      'fetch.source=/api/data',
      'on.event=draggable:start',
      'set.destination=:x',
      'toggle.patient=.active',
      'wait.duration=200ms',
    ]);
  });

  it('excludes non-invariant values: references, prose, bare words, mixed raws, flags, property-paths', () => {
    const node = {
      kind: 'command',
      action: 'put',
      roles: new Map<string, unknown>([
        ['destination', { type: 'reference', value: 'me' }], // fillSchemaDefaults noise
        ['patient', { type: 'literal', value: 'Hello world', dataType: 'string' }], // legitimately translated
        ['source', { type: 'expression', raw: 'startX' }], // bare identifier — v1 exclusion
        ['modifier', { type: 'expression', raw: '次 .item' }], // native words + code mixed
        ['condition', { type: 'expression', raw: '#modal exists' }], // selector-prefixed prose (if-exists class)
        ['url', { type: 'literal', value: '/api/search?q=${my' }], // truncated template interpolation
        ['flagRole', { type: 'flag', name: 'async', enabled: true }],
        [
          'pathRole',
          { type: 'property-path', object: { type: 'reference', value: 'me' }, property: 'value' },
        ],
      ]),
    };
    expect(collectRoleValueSignature(node)).toEqual([]);
  });

  it('is a multiset — a dropped duplicate value is visible via computeMultisetRecall', () => {
    // The bind-two-way shape: two `bind`s to two different sigil refs; a
    // truncating parse keeps only the first. Both entries share NO key with a
    // Set — but if both bound the SAME ref, dedup would hide the drop:
    const twoBinds = {
      action: 'compound',
      statements: [
        {
          action: 'bind',
          roles: new Map<string, unknown>([['source', { type: 'expression', raw: '$name' }]]),
        },
        {
          action: 'bind',
          roles: new Map<string, unknown>([['source', { type: 'expression', raw: '$name' }]]),
        },
      ],
    };
    const oneBind = {
      action: 'bind',
      roles: new Map<string, unknown>([['source', { type: 'expression', raw: '$name' }]]),
    };
    const ref = collectRoleValueSignature(twoBinds);
    const cand = collectRoleValueSignature(oneBind);
    expect(ref).toEqual(['bind.source=$name', 'bind.source=$name']);
    expect(cand).toEqual(['bind.source=$name']);
    expect(computeMultisetRecall(ref, cand)).toBe(0.5);
  });

  it('recurses into behavior-shaped nodes (eventHandlers + initBlock)', () => {
    // No other walker test exercises these two CHILD_FIELDS; ad-hoc walkers
    // that omit them see behavior bodies as empty.
    const behavior = {
      kind: 'behavior',
      action: 'behavior',
      roles: new Map<string, unknown>([['name', { type: 'expression', raw: 'Draggable' }]]),
      eventHandlers: [
        {
          kind: 'event-handler',
          action: 'on',
          roles: new Map<string, unknown>([
            ['event', { type: 'literal', value: 'draggable:start' }],
          ]),
          body: [
            {
              kind: 'command',
              action: 'add',
              roles: new Map<string, unknown>([
                ['patient', { type: 'selector', value: '.dragging' }],
              ]),
            },
          ],
        },
      ],
      initBlock: [
        {
          kind: 'command',
          action: 'set',
          roles: new Map<string, unknown>([['destination', { type: 'expression', raw: '*width' }]]),
        },
      ],
    };
    expect(collectRoleValueSignature(behavior)).toEqual([
      'add.patient=.dragging',
      'on.event=draggable:start',
      'set.destination=*width',
    ]);
  });

  it('reads plain-object roles (synthetic/JSON-shaped nodes) too', () => {
    const node = {
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '#count' } },
    };
    expect(collectRoleValueSignature(node)).toEqual(['toggle.patient=#count']);
  });

  it('skips the structural compound wrapper and handles non-object input', () => {
    const node = {
      action: 'compound',
      roles: new Map<string, unknown>([['patient', { type: 'selector', value: '.x' }]]),
      statements: [{ action: 'toggle', roles: { patient: { type: 'selector', value: '.x' } } }],
    };
    expect(collectRoleValueSignature(node)).toEqual(['toggle.patient=.x']);
    expect(collectRoleValueSignature(null)).toEqual([]);
    expect(collectRoleValueSignature(undefined)).toEqual([]);
  });
});

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
