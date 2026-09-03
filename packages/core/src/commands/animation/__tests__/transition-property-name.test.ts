/**
 * `transition <property>` — the property NAME, on both parse paths
 *
 * The convergence triage filed this as a `node-type` row —
 * `string -> identifier` on `transition opacity to 0.5` — which reads like an
 * alias needing a rename. It was a live, silent no-op on the DEFAULT path.
 *
 * `transition <property>` takes a property NAME, and the two paths spell it
 * differently: the traditional parser emits `string{value:'opacity'}`, which
 * evaluates to its own text, while the semantic parser emits
 * `identifier{name:'opacity'}`, which evaluates to **undefined**. `parseInput`
 * did `String(firstArg)`, so the property became the literal string
 * `"undefined"` — truthy, so the existing guard passed it — and the command
 * animated a CSS property that cannot exist. No error, no effect.
 *
 * Measured before the fix, running each source on both paths:
 *
 * | source | traditional | semantic (DEFAULT) |
 * | ------ | ----------- | ------------------ |
 * | `transition opacity to 0.5` | `0.5` | **no-op** |
 * | `transition color to red`   | `red` | **no-op** |
 * | `transition my opacity to 0.5` | `0.5` | **no-op** |
 * | `transition *opacity to 0.5` | `0.5` | `0.5` |
 * | `transition #t opacity to 0.5` | `0.5` | `0.5` |
 * | `transition left to 100px` | `100px` | `100px` |
 *
 * The three that already worked are the tell: `*opacity` is a SELECTOR token
 * because of the sigil, and `left` is a KEYWORD token, so both reach the
 * runtime as strings on either path. Only a bare, non-keyword CSS property was
 * broken — which is the idiomatic form and the command's own documented syntax.
 *
 * ## Why jsdom cannot oracle this against upstream
 *
 * Run on the real 0.9.93 engine in jsdom, **every** row above is a no-op,
 * `*opacity` included: upstream's transition completes through `transitionend`,
 * which jsdom never fires. That is exactly why `shipped-examples-execution`
 * disqualifies `transition` outright. The oracle here is hyperfixi's own
 * traditional path, which the rest of this suite already pins.
 *
 * ## The `'undefined'` guard is a second, separate assertion
 *
 * Stringifying a node that evaluated to nothing is the whole bug class, and
 * this file already fixed one instance of it for the TARGET slot. The guard now
 * rejects `'undefined'`/`'null'` as property names so the next instance throws
 * instead of silently animating nothing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('transition — the property name reaches the runtime', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="t" style="opacity:1;color:blue;left:0px;position:absolute">x</div>';
  });

  const el = () => document.getElementById('t') as HTMLElement;

  describe.each(BOTH_PATHS)('%s path', (_label, traditional) => {
    it.each([
      ['transition opacity to 0.5 over 10ms', 'opacity', '0.5'],
      ['transition color to red over 10ms', 'color', 'red'],
      ['transition my opacity to 0.5 over 10ms', 'opacity', '0.5'],
      // Already worked on both paths — the sigil/keyword tokens. Kept so a fix
      // that regressed them would be visible.
      ['transition *opacity to 0.5 over 10ms', 'opacity', '0.5'],
      ['transition left to 100px over 10ms', 'left', '100px'],
    ] as const)('%s', async (source, property, expected) => {
      await hyperscript.eval(source, el(), { traditional } as never);
      expect(el().style.getPropertyValue(property)).toBe(expected);
    });

    it('names an explicit target as well as the property', async () => {
      await hyperscript.eval('transition #t opacity to 0.5 over 10ms', document.body, {
        traditional,
      } as never);
      expect(el().style.opacity).toBe('0.5');
    });
  });

  describe('a property that stringifies to "undefined" is rejected, not animated', () => {
    const { parseInput } = {
      parseInput: async (evaluated: unknown) => {
        const { TransitionCommand } = await import('../transition');
        return new TransitionCommand().parseInput(
          {
            args: [{ type: 'literal', value: evaluated }],
            modifiers: { to: { type: 'literal', value: 1 } },
          } as never,
          { evaluate: async () => evaluated } as never,
          {} as never
        );
      },
    };

    it('rejects a node that evaluated to nothing and names nothing', async () => {
      // Hits the `!named` throw: nothing to fall back to.
      await expect(parseInput(undefined)).rejects.toThrow('transition requires a CSS property');
    });

    it('rejects the STRING "undefined" — the stringified-nothing residual', async () => {
      // This row is what makes the `property === 'undefined'` guard non-vacuous.
      // Mutation-measured: with the guard weakened back to `!property`, the row
      // above still passes (it throws earlier) and only this one reddens. The
      // guard is defence-in-depth for the whole `String(<nothing>)` class this
      // file has now been bitten by twice.
      await expect(parseInput('undefined')).rejects.toThrow('transition requires a CSS property');
      await expect(parseInput('null')).rejects.toThrow('transition requires a CSS property');
    });
  });
});
