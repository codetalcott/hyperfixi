/**
 * `semanticNodeToRuntimeAST` writes a loop in the shape core's parser builds:
 * the form in `modifiers.loopType`, the operands in `for`/`in`, `times`,
 * `while`/`until`, `event`/`from` and `index`, the body the one block.
 *
 * It wrote `args: [count]` with `loopVariant` and `body` beside it, a shape
 * core's `repeat` has not read since the slot migration, so every loop through
 * `evalLSE` threw "repeat command requires a loop type". core's
 * `lse/loop-lse.test.ts` RUNS these; this pins the shape where it is written.
 */
import { describe, it, expect } from 'vitest';
import { semanticNodeToRuntimeAST } from './to-runtime-ast';
import { parseExplicit } from './explicit-parser';
import { createLoopNode, createLiteral, createCommandNode } from '../core/types';

const slot = (value: string) => ({ type: 'string', value });
const TOGGLE = '[toggle patient:.a]';

function loop(explicit: string): Record<string, unknown> {
  return semanticNodeToRuntimeAST(parseExplicit(explicit)) as unknown as Record<string, unknown>;
}

describe('a loop becomes core’s slot-shaped repeat', () => {
  it('counted', () => {
    expect(loop(`[repeat quantity:3 loop-variant:times loop-body:${TOGGLE}]`)).toEqual({
      type: 'command',
      name: 'repeat',
      args: [{ type: 'block', commands: [expect.objectContaining({ name: 'toggle' })] }],
      modifiers: { loopType: slot('times'), times: { type: 'literal', value: 3 } },
    });
  });

  it('for-in', () => {
    expect(
      loop(`[for source:.i variable:p loop-variant:for loop-body:${TOGGLE}]`).modifiers
    ).toEqual({
      loopType: slot('for'),
      for: slot('p'),
      in: { type: 'selector', value: '.i' },
    });
  });

  it.each(['while', 'until'])('%s', form => {
    const modifiers = loop(`[repeat condition:done loop-variant:${form} loop-body:${TOGGLE}]`)
      .modifiers as Record<string, unknown>;
    expect(modifiers.loopType).toEqual(slot(form));
    expect(modifiers[form]).toBeDefined();
  });

  // `loopVariant` folds `until event` into `until`; the loopType role keeps it.
  it('until event, from a target', () => {
    expect(
      loop(
        `[repeat loop-variant:until loopType:until-event event:stop source:#b loop-body:${TOGGLE}]`
      ).modifiers
    ).toEqual({
      loopType: slot('until-event'),
      event: slot('stop'),
      from: { type: 'selector', value: '#b' },
    });
  });

  it('forever', () => {
    expect(loop(`[repeat loop-variant:forever loop-body:${TOGGLE}]`).modifiers).toEqual({
      loopType: slot('forever'),
    });
  });

  it('`index i`', () => {
    const modifiers = loop(
      `[repeat quantity:2 loop-variant:times index-variable:i loop-body:${TOGGLE}]`
    ).modifiers as Record<string, unknown>;
    expect(modifiers.index).toEqual(slot('i'));
  });

  it('reads a count from `patient`, as the old shape did', () => {
    const node = createLoopNode('repeat', { patient: createLiteral(4, 'number') }, 'times', [
      createCommandNode('toggle', {}),
    ]);
    const ast = semanticNodeToRuntimeAST(node) as unknown as Record<string, unknown>;
    expect((ast.modifiers as Record<string, unknown>).times).toEqual({
      type: 'literal',
      value: 4,
    });
  });
});
