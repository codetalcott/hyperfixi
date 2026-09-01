/**
 * Sigil-scoped variables (`:elem`, `$global`) on both parse paths
 *
 * The convergence triage filed this as `identifier -> contextReference`, six
 * `node-type` sites that read like an alias needing a rename. Two of the six
 * were a live defect on the DEFAULT path, and it was not subtle.
 *
 * `packages/semantic`'s `convertReference` turned EVERY reference into a
 * `contextReference`, sigil and all: `:count` became
 * `{ type: 'contextReference', contextType: ':count', name: ':count' }`. But
 * `ContextType` is a closed union of `me`/`it`/`you`/`event`/… that never
 * contained a sigil form, so the cast was a lie, and core's
 * `evaluateContextReference` has no case for it — it returns `undefined`.
 *
 * ## Why it hid, and why it is common
 *
 * Core parses a command SEQUENCE traditionally and hands only the final
 * remainder to the semantic analyzer, so it is the LAST command of a handler
 * that gets the semantic node. Measured before the fix:
 *
 *   set :v to 5 then log :v then log :v   →  ["5", "5", undefined]
 *   set $v to 5 then log $v then log $v   →  ["5", "5", undefined]
 *   set  v to 5 then log  v then log  v   →  ["5", "5", "5"]   (unscoped: fine)
 *
 * Only the last read failed, and only for a sigil. So `on click increment
 * :count then log :count` — an ordinary shape — produced `undefined`, while
 * every earlier command in the same handler was fine. That positional quality
 * is exactly what makes it hard to notice and easy to misattribute.
 *
 * Two commands were measurably broken by it beyond `log`:
 *
 *   default :x to 0 then log :x                   before: undefined  after: 0
 *   set :x to 7 then default :x to 0 then log :x  before: undefined  after: 7
 *
 * `default` was neither preserving an existing value nor applying its default.
 *
 * ## `clear` was broken independently, on the OTHER path
 *
 * Found in the same measurement and fixed alongside, because the two together
 * are what make the paths agree. `clear` wrote
 * `context.locals.set(name, null)` directly, ignoring the `scope` the node
 * carries — so `clear :count` was a silent NO-OP on the TRADITIONAL path
 * (`log :count` still read 5). `clear $g` and `clear x` worked, which is why it
 * survived: only the element scope is a genuinely separate store. It now writes
 * through `setVariableValue`, the same helper `set` uses.
 *
 * `clear` is a hyperfixi extension — upstream has no such keyword and parses
 * `clear :count` as something else entirely — so the oracle here is internal
 * consistency with `set`/`get`, not the canonical engine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('scoped variables — both parse paths agree', () => {
  let logged: string[];

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    logged = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(String(args[0]));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const host = () => document.getElementById('host') as HTMLElement;
  const run = (source: string) => hyperscript.eval(source, host());
  const runOn = (source: string, traditional: boolean) =>
    hyperscript.eval(source, host(), { traditional } as never);

  describe.each(BOTH_PATHS)('%s path', (_label, traditional) => {
    // The trailing read is the point: only the LAST command of a sequence
    // reaches the semantic analyzer, so a two-read source is the shortest
    // source that can exhibit the defect at all.
    it.each([
      ['set :v to 5 then log :v then log :v', ['5', '5']],
      ['set $v to 5 then log $v then log $v', ['5', '5']],
      ['set v to 5 then log v then log v', ['5', '5']],
    ] as const)('%s', async (source, expected) => {
      await runOn(source, traditional);
      expect(logged).toEqual([...expected]);
    });

    it('reads a scoped variable in the last command after an unrelated one', async () => {
      await runOn('set :v to 5 then log :v then log "sep" then log :v', traditional);
      expect(logged).toEqual(['5', 'sep', '5']);
    });

    it.each([
      ['clear :count', 'set :count to 5 then clear :count then log :count'],
      ['clear $g', 'set $g to 7 then clear $g then log $g'],
      ['clear x', 'set x to 9 then clear x then log x'],
    ] as const)('%s empties the right store', async (_label, source) => {
      await runOn(source, traditional);
      expect(logged).toEqual(['null']);
    });

    it('default respects an already-set scoped variable', async () => {
      await runOn('set :x to 7 then default :x to 0 then log :x', traditional);
      expect(logged).toEqual(['7']);
    });

    it('default applies its value when the scoped variable is unset', async () => {
      await runOn('default :x to 0 then log :x', traditional);
      expect(logged).toEqual(['0']);
    });
  });

  it('a real context reference is still a context reference', async () => {
    // The fix must not swallow `me`/`it`/`you` — those genuinely ARE context
    // references, and the four remaining `identifier -> contextReference`
    // triage sites are all of that kind.
    document.body.innerHTML = '<div id="host"><span>hi</span></div>';
    await run('log me');
    expect(logged).toHaveLength(1);
    expect(logged[0]).not.toBe('undefined');
  });
});
