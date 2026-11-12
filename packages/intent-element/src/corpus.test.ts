// @vitest-environment node
/**
 * What `<lse-intent>` would run, for every script LSE can carry.
 *
 * The command-shape cases (testing-framework: every script in upstream's suite
 * and the reference examples) are parsed, written as protocol JSON, and planned
 * as the element plans them. A case is then one of:
 *
 *   runs      the element's trigger and script, put back together, are the
 *             script the parse renders to (the same text, or the same engine
 *             parse)
 *   refused   the plan refuses it, by a code counted below
 *   differs   it would run something else: never allowed
 *
 * The counts are pinned: a change to the element, the wire format or the
 * renderer that moves one shows here.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { everything, parse as engineParse, register } from '@hyperfixi/engine';
import { parse, render } from '@lokascript/semantic';
import { LossyEncodingError, toProtocolJSON } from '@lokascript/intent';
import { droppedValues, planIntent } from './plan.js';

const CASES = new URL(
  '../../testing-framework/src/multilingual/command-shapes.cases.json',
  import.meta.url
);

type Node = Parameters<typeof render>[0];

/** An engine parse as plain data: no functions, no positions. */
function plain(value: unknown): unknown {
  if (typeof value === 'function') return undefined;
  if (Array.isArray(value)) return value.map(plain);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, v]) => typeof v !== 'function' && !['start', 'end', 'line', 'col'].includes(key)
      )
      .map(([key, v]) => [key, plain(v)])
  );
}

const read = (script: string): string => {
  try {
    return JSON.stringify(plain(engineParse(script)));
  } catch (error) {
    return `rejected: ${(error as Error).message.split('\n')[0]}`;
  }
};

interface Tally {
  runs: number;
  notEncodable: number;
  refused: Record<string, number>;
  differs: string[];
}

describe('<lse-intent> on the command-shape cases', () => {
  let tally: Tally;

  beforeAll(() => {
    register(...everything);
    const { cases } = JSON.parse(readFileSync(CASES, 'utf8')) as {
      cases: Array<{ id: string; source: string }>;
    };
    tally = { runs: 0, notEncodable: 0, refused: {}, differs: [] };
    for (const shape of cases) {
      let node: Node | null;
      try {
        node = parse(shape.source, 'en') as Node | null;
      } catch {
        node = null;
      }
      if (!node) continue;
      let json: unknown;
      try {
        json = JSON.parse(
          JSON.stringify(toProtocolJSON(node as Parameters<typeof toProtocolJSON>[0]))
        );
      } catch (error) {
        if (!(error instanceof LossyEncodingError)) throw error;
        tally.notEncodable++;
        continue;
      }
      const plan = planIntent(json);
      if (!plan.ok) {
        for (const code of new Set(
          plan.diagnostics.filter(d => d.severity === 'error').map(d => d.code)
        )) {
          tally.refused[code] = (tally.refused[code] ?? 0) + 1;
        }
        continue;
      }
      const script = render(plan.body as Node, 'en');
      const dropped = droppedValues(plan.body, script);
      if (dropped.length > 0) {
        tally.refused['RENDER_DROPPED_VALUE'] = (tally.refused['RENDER_DROPPED_VALUE'] ?? 0) + 1;
        continue;
      }
      const ran = plan.trigger
        ? `on ${plan.trigger.event}${plan.trigger.once ? ' once' : ''} ${script}`
        : script;
      const want = render(node, 'en');
      if (ran === want || read(ran) === read(want)) tally.runs++;
      else tally.differs.push(`${shape.id}\n  wants: ${want}\n  runs:  ${ran}`);
    }
  });

  it('never runs a script other than the one written', () => {
    expect(tally.differs, tally.differs.slice(0, 15).join('\n')).toEqual([]);
  });

  it('runs or refuses each case as counted', () => {
    expect({ runs: tally.runs, notEncodable: tally.notEncodable, refused: tally.refused }).toEqual({
      runs: 745,
      // toProtocolJSON refuses these (features, defs, behaviors, clauses with no field).
      notEncodable: 385,
      refused: {
        // `on click` with nothing after it.
        EMPTY_HANDLER: 2,
        // The event is not a literal name (`on mutation of …`, `on intersection(…)`).
        INVALID_EVENT: 16,
        // A second `on …` inside the script.
        NESTED_HANDLER: 14,
        // A filter or alternatives (`keyup[key is "Enter"]`, `click or keyup`).
        UNSUPPORTED_EVENT: 4,
      },
    });
  });
});
