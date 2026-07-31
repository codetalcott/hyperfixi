// @vitest-environment jsdom
/**
 * `default` through the real parser and the real runtime.
 *
 * Every one of DefaultCommand's five documented `metadata.examples` was broken,
 * on BOTH execution paths, and the package's unit tests could not see it: they
 * inject a mock evaluator that returns `node.value ?? node.name`, i.e. the
 * name-preserving behavior the real evaluator does not have. Measured at
 * `22059a6e`, before this change:
 *
 *   default myVar to "fallback"          throws `Invalid target type: undefined`
 *   default @data-theme to "light"       throws `Invalid target type: object`
 *   default :x to 0                      throws `Invalid target type: undefined`
 *   default my @data-count to "0"        throws (the corpus row `default-value`)
 *   default my innerHTML to "No content" NO error — and no DOM write either:
 *                                        the evaluated target was the empty
 *                                        innerHTML string, so it created a
 *                                        junk local literally named ''
 *
 * Cause: `parseInput` did `evaluate(raw.args[0])`. A write target's evaluation
 * is its CURRENT VALUE, and for `default` that value is `undefined` exactly
 * when the command is supposed to act. A second, independent defect rode along:
 * the traditional parser emits `[target, identifier('to'), value]` and the old
 * code took `args[1]` for the value — the `to` KEYWORD — so `default #out to
 * "x"` wrote the string "undefined".
 *
 * These tests go through `hyperscript.eval` deliberately, and assert the DOM /
 * variable effect rather than the return value: a mocked unit test cannot see
 * either defect, and `wasSet: true` was returned in the silent case.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

type Mode = { label: string; opts?: Record<string, unknown> };
const MODES: Mode[] = [
  { label: 'semantic' },
  { label: 'traditional', opts: { traditional: true } },
];

function host(extra = ''): HTMLElement {
  document.body.innerHTML = `<div id="host"></div>${extra}`;
  return document.getElementById('host') as HTMLElement;
}

describe.each(MODES)('default — documented examples ($label path)', ({ opts }) => {
  const run = (src: string, el: HTMLElement) => hyperscript.eval(src, el, opts as never);

  it('`default myVar to "fallback"` sets the variable instead of throwing', async () => {
    const result = (await run('default myVar to "fallback"', host())) as Record<string, unknown>;
    expect(result).toMatchObject({
      targetType: 'variable',
      target: 'myVar',
      value: 'fallback',
      wasSet: true,
    });
  });

  it('`default @data-theme to "light"` writes the attribute', async () => {
    const el = host();
    await run('default @data-theme to "light"', el);
    expect(el.getAttribute('data-theme')).toBe('light');
  });

  it('`default @data-theme to "light"` leaves an existing attribute alone', async () => {
    const el = host();
    el.setAttribute('data-theme', 'dark');
    const result = (await run('default @data-theme to "light"', el)) as Record<string, unknown>;
    expect(el.getAttribute('data-theme')).toBe('dark');
    expect(result).toMatchObject({ wasSet: false, existingValue: 'dark' });
  });

  it('`default my innerHTML to "No content"` writes the DOM, not a junk local', async () => {
    const el = host();
    await run('default my innerHTML to "No content"', el);
    expect(el.innerHTML).toBe('No content');
  });

  it('`default my innerHTML to …` leaves existing content alone', async () => {
    const el = host();
    el.innerHTML = '<p>Existing</p>';
    await run('default my innerHTML to "No content"', el);
    expect(el.innerHTML).toBe('<p>Existing</p>');
  });

  it('`default :x to 0` sets the element-scoped variable', async () => {
    const result = (await run('default :x to 0', host())) as Record<string, unknown>;
    expect(result).toMatchObject({ targetType: 'variable', target: 'x', value: 0, wasSet: true });
  });

  it('`default my @data-count to "0"` (the corpus row) writes the attribute', async () => {
    const el = host();
    await run('default my @data-count to "0"', el);
    expect(el.getAttribute('data-count')).toBe('0');
  });

  it('`default #out to "x"` fills the element — with the VALUE, not "undefined"', async () => {
    // The `to`-keyword defect: on the traditional path this used to write the
    // literal string "undefined", because the value was read from args[1].
    const el = host('<div id="out"></div>');
    await run('default #out to "x"', el);
    expect(document.getElementById('out')!.textContent).toBe('x');
  });
});

describe('default — the no-overwrite contract', () => {
  it('`set x to 1 then default x to 9` keeps 1', async () => {
    const result = (await hyperscript.eval(
      'set x to 1 then default x to 9',
      host()
    )) as unknown as Record<string, unknown>;
    // The sequence's last command is the default; it must decline to write.
    expect(result).toMatchObject({ wasSet: false, existingValue: 1 });
  });

  it('preserves falsy-but-present values (upstream 0.9.90 nullish semantics)', async () => {
    for (const [existing, expected] of [
      ['0', 0],
      ['false', false],
      ['""', ''],
    ] as const) {
      const result = (await hyperscript.eval(
        `set x to ${existing} then default x to 9`,
        host()
      )) as unknown as Record<string, unknown>;
      expect(result, `existing ${existing}`).toMatchObject({
        wasSet: false,
        existingValue: expected,
      });
    }
  });

  it('does write when the variable is genuinely unset', async () => {
    const result = (await hyperscript.eval('default neverSet to 9', host())) as Record<
      string,
      unknown
    >;
    expect(result).toMatchObject({ wasSet: true, value: 9 });
  });
});

describe('default — a `$name` global reads and writes the same slot', () => {
  /**
   * `setVariableValue` stores a `$`-prefixed name under its BARE key in
   * globals while `getVariableValue` looks up the literal name — so a target
   * that kept its sigil would read `undefined` forever and overwrite on every
   * run, which is the one thing `default` must never do.
   *
   * Both paths are exercised because they reach the sigil strip through
   * DIFFERENT code: the semantic parser emits `contextReference{ name:'$g' }`
   * (handled by `scopedVariableTarget`), the traditional one emits
   * `identifier{ name:'$g' }` (handled by the write-target ladder's
   * bare-reference rung, then `toDefaultInput`). A test on one path alone
   * leaves the other's strip unpinned.
   */
  it.each(MODES)(
    'declines to overwrite a global it just set ($label path)',
    async ({ label, opts }) => {
      const el = host();
      const name = `$gDefault_${label}`; // globals persist — one per path
      const first = (await hyperscript.eval(`default ${name} to 1`, el, opts as never)) as Record<
        string,
        unknown
      >;
      expect(first).toMatchObject({ wasSet: true, target: `gDefault_${label}` });

      const second = (await hyperscript.eval(`default ${name} to 2`, el, opts as never)) as Record<
        string,
        unknown
      >;
      expect(second).toMatchObject({ wasSet: false, existingValue: 1 });
    }
  );
});
