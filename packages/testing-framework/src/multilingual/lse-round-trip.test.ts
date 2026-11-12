/**
 * LSE round-trip gate. See lse-round-trip.ts for what it runs.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { LossyEncodingError, fromProtocolJSON, toProtocolJSON } from '@lokascript/intent';
import { parse } from '@lokascript/semantic';
import {
  diffBaseline,
  grade,
  loadBaseline,
  loadCases,
  runLseRoundTrip,
  type LseCaseResult,
  type LseDiff,
} from './lse-round-trip';

const REGEN = 'npx tsx tools/regen-lse-round-trip-baseline.ts';
const show = (lines: string[]): string =>
  lines.slice(0, 20).join('\n') + (lines.length > 20 ? `\n… and ${lines.length - 20} more` : '');

describe('the gate sees a loss when a writer is told to allow one', () => {
  // `{ lossy: 'allow' }` writes what the encoding can hold of a node. Each of these
  // must grade `silent`: if one graded faithful, the gate below could not see that loss.
  const lossy = [
    ['an event modifier', 'on click from #x debounced at 200ms toggle .a'],
    ['a selector scope (the scorer alone scores this faithful)', 'on click add .foo to <p/> in me'],
    ['a catch block', 'on click fetch /test catch e put e into me'],
    ['a second class in one command', 'on click add .foo .bar'],
  ] as const;

  it.each(lossy)('%s', (_name, source) => {
    const node = parse(source, 'en') as unknown as Parameters<typeof toProtocolJSON>[0];
    expect(() => toProtocolJSON(node)).toThrow(LossyEncodingError);
    const wire = JSON.parse(JSON.stringify(toProtocolJSON(node, { lossy: 'allow' })));
    expect(grade(node, fromProtocolJSON(wire)).outcome).toBe('silent');
  });

  it('and grades a whole round trip faithful', () => {
    const node = parse('on click toggle .active on #menu', 'en') as unknown as Parameters<
      typeof toProtocolJSON
    >[0];
    const wire = JSON.parse(JSON.stringify(toProtocolJSON(node)));
    expect(grade(node, fromProtocolJSON(wire)).outcome).toBe('faithful');
  });
});

describe('LSE round trip (bracket syntax and protocol JSON) on the command-shape cases', () => {
  let results: LseCaseResult[];
  let diff: LseDiff;
  const baseline = loadBaseline();

  beforeAll(() => {
    results = runLseRoundTrip(loadCases());
    diff = diffBaseline(results, baseline);
  });

  it('runs the cases the baseline was made from', () => {
    expect(results.length).toBe(baseline.cases);
    expect(results.filter(r => r.outcomes).length).toBe(baseline.parsed);
  });

  it('never writes an encoding with a command or a value missing', () => {
    expect(
      diff.silent,
      `An encoding was written and reads back as something else:\n${show(diff.silent)}`
    ).toEqual([]);
  });

  it('carries no case worse than the baseline lists', () => {
    expect(
      diff.worse,
      `Worse than baselines/lse-round-trip.json. If intended, say why in the PR and run ` +
        `\`${REGEN} --allow-new\`:\n${show(diff.worse)}`
    ).toEqual([]);
  });

  it('has no case better than the baseline lists (prune it)', () => {
    expect(diff.better, `Now better: run \`${REGEN}\`:\n${show(diff.better)}`).toEqual([]);
    expect(diff.orphaned, `No longer cases: run \`${REGEN}\`:\n${show(diff.orphaned)}`).toEqual([]);
  });
});
