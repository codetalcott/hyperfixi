/**
 * `transition [<target>] <property> to <value>` — parse AND execute.
 *
 * Every form here is `VALID` on the real `hyperscript.org` engine
 * (`hs.parse(src).errors` → `[]`), and the possessive is what the docs and the
 * multilingual corpus render — yet only the BARE form worked before this fix
 * (docs-internal/PARSER_NEXT_STEPS.md, found by #847's reachability probe):
 *
 *   transition my *opacity to 0 over 200ms  → 'Expected "to" keyword after
 *                                             property in transition command'
 *   transition its *opacity to 0            → same
 *   transition #a's *opacity to 0           → 'Transition command requires a
 *                                             CSS property'
 *   transition #a *opacity to 0             → same (NOT in the original brief;
 *                                             found while fixing the others)
 *
 * Two adjacent gaps, as the brief predicted from the differing messages:
 * `my`/`its` were consumed AS the property (so the real property sat where
 * `to` was expected), while a leading selector matched neither branch and left
 * property null. Both messages named exactly what had been supplied.
 *
 * The runtime was never the blocker: `TransitionCommand.parseInput` has always
 * discriminated a `[target, property]` two-arg shape — the parser simply never
 * emitted one, so that branch was unreachable. Making it reachable exposed one
 * real hole, covered below: an unresolvable target used to fall through to
 * `String(undefined)` and transition a property literally named "undefined" —
 * a silent no-op.
 *
 * Both parse paths are exercised deliberately: this was never a
 * semantic-vs-traditional divergence, and a regression on either would be
 * invisible to a single-path test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

function setup(): { a: HTMLElement; host: HTMLElement } {
  document.body.innerHTML =
    '<div id="a" style="opacity: 1">A</div><div id="host" style="opacity: 1"></div>';
  return {
    a: document.getElementById('a') as HTMLElement,
    host: document.getElementById('host') as HTMLElement,
  };
}

const BOTH_PATHS = [
  ['auto', undefined],
  ['traditional', { traditional: true }],
] as const;

describe.each(BOTH_PATHS)('transition <target> <property> (%s path)', (_label, opts) => {
  beforeEach(() => {
    setup();
  });

  it('parses all four previously-rejected target forms', () => {
    for (const src of [
      'transition my *opacity to 0 over 200ms',
      'transition its *opacity to 0',
      "transition #a's *opacity to 0 over 200ms",
      'transition #a *opacity to 0 over 200ms',
    ]) {
      const result = hyperscript.compileSync(src, opts as never);
      expect(result.errors ?? [], `${src}: ${JSON.stringify(result.errors)}`).toHaveLength(0);
      expect(result.ok, src).toBe(true);
    }
  });

  it('keeps the bare form working (the narrower case that always worked)', async () => {
    const { a, host } = setup();
    await hyperscript.eval('transition *opacity to 0 over 20ms', host, opts as never);

    expect(host.style.opacity, 'bare form targets me').toBe('0');
    expect(a.style.opacity, 'and leaves everything else alone').toBe('1');
  });

  it('`my *opacity` transitions me', async () => {
    const { a, host } = setup();
    await hyperscript.eval('transition my *opacity to 0 over 20ms', host, opts as never);

    expect(host.style.opacity).toBe('0');
    expect(a.style.opacity).toBe('1');
  });

  it("`#a's *opacity` transitions the possessive's owner, NOT me", async () => {
    const { a, host } = setup();
    await hyperscript.eval("transition #a's *opacity to 0 over 20ms", host, opts as never);

    expect(a.style.opacity, 'the selector target moves').toBe('0');
    expect(host.style.opacity, 'me is untouched').toBe('1');
  });

  it('`#a *opacity` (space-separated) transitions the target too', async () => {
    const { a, host } = setup();
    await hyperscript.eval('transition #a *opacity to 0 over 20ms', host, opts as never);

    expect(a.style.opacity).toBe('0');
    expect(host.style.opacity).toBe('1');
  });

  it('`its *opacity` transitions whatever `it` currently holds', async () => {
    const { a, host } = setup();
    await hyperscript.eval(
      'get #a then transition its *opacity to 0 over 20ms',
      host,
      opts as never
    );

    expect(a.style.opacity, '`it` was set to #a by the get').toBe('0');
    expect(host.style.opacity).toBe('1');
  });

  it('still honours `over` and `with` after a target', () => {
    const result = hyperscript.compileSync(
      "transition #a's *opacity to 0 over 1s with ease-in-out",
      opts as never
    );
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
    const ast = result.ast as { modifiers?: Record<string, unknown> };
    expect(Object.keys(ast.modifiers ?? {})).toEqual(
      expect.arrayContaining(['to', 'over', 'with'])
    );
  });

  it('emits [target, property] — the two-arg shape parseInput discriminates on', () => {
    const result = hyperscript.compileSync("transition #a's *opacity to 0", opts as never);
    const ast = result.ast as { args?: Array<{ type?: string; value?: unknown }> };

    expect(ast.args).toHaveLength(2);
    expect(ast.args?.[0]?.type, 'first arg is the target').toBe('selector');
    expect(ast.args?.[1]?.value, 'second arg is the property').toBe('*opacity');
  });
});

describe('transition — an explicit target that does not resolve is an ERROR', () => {
  // Regression guard for the hole that making the target branch reachable
  // exposed: `String(undefined)` became the property name, so the command
  // transitioned a property called "undefined" and reported success.

  it('errors on a selector matching nothing', async () => {
    const { host } = setup();
    await expect(
      hyperscript.eval('transition #nope *opacity to 0 over 20ms', host)
    ).rejects.toThrow(/target element not found/);
  });

  it('errors on `its` when `it` is unset', async () => {
    const { host } = setup();
    await expect(hyperscript.eval('transition its *opacity to 0 over 20ms', host)).rejects.toThrow(
      /target element not found/
    );
  });
});
