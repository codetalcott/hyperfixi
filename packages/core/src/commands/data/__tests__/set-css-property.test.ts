/**
 * `set *<css-property>` — every spelling upstream accepts writes inline style.
 *
 * The table is the ORACLE: each row was run on the vendored `_hyperscript`
 * 0.9.93 in jsdom (2026-09-03), same element ids, same context. Before the
 * parser re-typed the star (`retypeStylePropertyTarget`), only `my *opacity`
 * worked here — three rows were silent no-ops and `the *opacity of me` threw
 * (`docs-internal/PARSER_NEXT_STEPS.md`, "set *<css-property>").
 *
 * Strict on purpose: a no-op leaves `style.opacity === ''`, and the target
 * row also asserts `me` was NOT written, so a fix that lands the style on the
 * wrong element still fails.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../../../runtime/runtime';
import { parse } from '../../../parser/parser';
import type { ExecutionContext } from '../../../types/core';

function ctx(me: HTMLElement): ExecutionContext {
  return {
    me,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
  } as unknown as ExecutionContext;
}

const ON_ME: string[] = [
  'set *opacity to 0.5',
  'set *opacity of me to 0.5',
  'set the *opacity of me to 0.5',
  'set my *opacity to 0.5',
];

const ON_TARGET: string[] = [
  'set *opacity of #target to 0.5',
  'set the *opacity of #target to 0.5',
  "set #target's *opacity to 0.5",
  'set *opacity of the first <div/> to 0.5',
];

describe('set *<css-property> writes inline style (upstream 0.9.93 oracle)', () => {
  let runtime: Runtime;
  let me: HTMLElement;
  let target: HTMLElement;

  beforeEach(() => {
    runtime = new Runtime();
    document.body.innerHTML = '<div id="target"></div><div id="me"></div>';
    target = document.getElementById('target') as HTMLElement;
    me = document.getElementById('me') as HTMLElement;
  });

  for (const code of ON_ME) {
    it(`${code} → me.style.opacity`, async () => {
      const { node, errors } = parse(code);
      expect(errors ?? []).toEqual([]);
      await runtime.execute(node!, ctx(me));
      expect(me.style.opacity).toBe('0.5');
      expect(target.style.opacity).toBe('');
    });
  }

  for (const code of ON_TARGET) {
    it(`${code} → #target.style.opacity, not me`, async () => {
      const { node, errors } = parse(code);
      expect(errors ?? []).toEqual([]);
      await runtime.execute(node!, ctx(me));
      expect(target.style.opacity).toBe('0.5');
      expect(me.style.opacity).toBe('');
    });
  }

  // Not an oracle row: upstream in jsdom leaves `cssText` EMPTY here (its
  // bracket write of a hyphenated name is one jsdom ignores; browsers accept
  // it). Asserted on browser semantics — the style helper uses setProperty.
  it('a hyphenated property name: set *background-color of me to "red"', async () => {
    const { node } = parse('set *background-color of me to "red"');
    await runtime.execute(node!, ctx(me));
    expect(me.style.getPropertyValue('background-color')).toBe('red');
  });

  it('the re-typed destination is an identifier property, not a selector (AST shape)', () => {
    const strip = (n: unknown) =>
      JSON.parse(
        JSON.stringify(n, (k, v) =>
          ['start', 'end', 'line', 'column', 'isBlocking'].includes(k) ? undefined : v
        )
      );
    const bare = strip(parse('set *opacity to 0.5').node);
    expect(bare.args[0]).toEqual({ type: 'identifier', name: '*opacity' });

    const ofForm = strip(parse('set *opacity of me to 0.5').node);
    expect(ofForm.args[0]).toEqual({
      type: 'propertyOfExpression',
      property: { type: 'identifier', name: '*opacity' },
      target: { type: 'identifier', name: 'me' },
    });

    const theForm = strip(parse('set the *opacity of me to 0.5').node);
    expect(theForm.args[0]).toEqual(ofForm.args[0]);
  });
});
