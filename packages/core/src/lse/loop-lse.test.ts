/**
 * A loop in explicit syntax RUNS, through `evalLSE`, `evalLSENode` and
 * `compileLSE`.
 *
 * All three convert with framework's `semanticNodeToRuntimeAST`, which wrote a
 * loop as `args: [count]` with `loopVariant` and `body` beside it: a shape core's
 * `repeat` has not read since the slot migration (Arc 3 step 3). Every loop
 * threw "repeat command requires a loop type". It now writes the shape core's
 * parser builds.
 *
 * The bodies increment a counter on purpose. Explicit syntax hands a command's
 * roles to core as positional args, so a `destination` or a reference value
 * (`destination:p`, `patient:i`) does not reach core's commands. That gap is
 * filed in PARSER_NEXT_STEPS.md; it is not a loop gap.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parse, renderExplicit } from '@lokascript/semantic';
import { hyperscript } from '../api/hyperscript-api';
import { parseExplicit } from './index';

beforeEach(() => {
  document.body.innerHTML =
    '<div id="host"></div><i class="i"></i><i class="i"></i><div id="n">0</div><div id="out"></div>';
});

function count(): string {
  return document.getElementById('n')!.textContent!;
}

function host(): HTMLElement {
  return document.getElementById('host')!;
}

/** The explicit syntax the MCP `lse_from_hyperscript` path produces. */
function explicitFor(source: string): string {
  const node = parse(source, 'en');
  if (!node) throw new Error(`no English parse: ${source}`);
  return renderExplicit(node);
}

describe('evalLSE runs a loop', () => {
  it.each([
    ['counted', '[repeat quantity:3 loop-variant:times loop-body:[increment patient:#n]]', '3'],
    ['for-in', '[for source:.i variable:p loop-variant:for loop-body:[increment patient:#n]]', '2'],
    ['counted, rendered from English', explicitFor('repeat 3 times increment #n end'), '3'],
    ['for-in, rendered from English', explicitFor('for p in .i increment #n end'), '2'],
  ])('%s', async (_, lse, expected) => {
    await hyperscript.evalLSE(lse, host());
    expect(count()).toBe(expected);
  });

  it.each([
    [
      'written by hand',
      '[repeat loop-variant:until loopType:until-event event:stop source:#out loop-body:[increment patient:#n]]',
    ],
    ['rendered from English', explicitFor('repeat until event stop from #out increment #n end')],
  ])('`until event` runs until the event arrives: %s', async (_, lse) => {
    const run = hyperscript.evalLSE(lse, host());
    setTimeout(() => document.getElementById('out')!.dispatchEvent(new Event('stop')), 20);
    await run;
    const passes = Number(count());
    expect(passes).toBeGreaterThan(0);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(Number(count())).toBe(passes);
  });
});

it('evalLSENode runs a loop node', async () => {
  const node = await parseExplicit(
    '[repeat quantity:2 loop-variant:times loop-body:[increment patient:#n]]'
  );
  await hyperscript.evalLSENode(node, host());
  expect(count()).toBe('2');
});

it('compileLSE compiles a loop that runs', async () => {
  const compiled = await hyperscript.compileLSE(
    '[repeat quantity:3 loop-variant:times loop-body:[increment patient:#n]]'
  );
  expect(compiled.ok).toBe(true);
  await hyperscript.execute(compiled.ast!, hyperscript.createContext(host()));
  expect(count()).toBe('3');
});
