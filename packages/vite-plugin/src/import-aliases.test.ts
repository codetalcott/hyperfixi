/**
 * Bare-specifier resolution (2026-08-03).
 *
 * The docs advertise `import 'hyperfixi'` and `import 'lokascript'` for the
 * plugin flow, but NEITHER name is a published npm package — they only ever
 * work because this plugin's `resolveId` intercepts them and serves the
 * generated virtual bundle.
 *
 * `lokascript` was missing from that list, which broke in two escalating ways:
 *
 *   1. Today: `resolveId` returns null, Vite falls through to node_modules,
 *      finds nothing, and the build dies on "Failed to resolve import".
 *   2. Worse: the day anyone publishes the (currently unclaimed) `lokascript`
 *      name, that same fall-through would SUCCEED — silently pulling a full
 *      ~300 KB package in place of the plugin's ~8 KB generated bundle. A
 *      40x regression that errors nowhere and no size gate would attribute
 *      to this seam.
 *
 * So these tests pin the alias list itself, not just the happy path.
 */
import { describe, it, expect } from 'vitest';
import { hyperfixi } from './index';

const RESOLVED_ID = '\0virtual:hyperfixi';

/** `resolveId` is declared as an object hook; narrow it to a callable. */
function resolveVia(id: string): string | null {
  const plugin = hyperfixi();
  const hook = plugin.resolveId as unknown as (this: unknown, id: string) => string | null;
  return hook.call(null, id);
}

describe('bare specifier resolution', () => {
  it.each(['hyperfixi', 'lokascript', '@hyperfixi/core', 'virtual:hyperfixi'])(
    'intercepts %s before node_modules resolution',
    alias => {
      expect(resolveVia(alias)).toBe(RESOLVED_ID);
    }
  );

  // The regression that motivated this file. Kept as its own case so a failure
  // names the specifier rather than an index into the table above.
  it('intercepts lokascript, so it can never fall through to a squatted package', () => {
    expect(resolveVia('lokascript')).toBe(RESOLVED_ID);
  });

  it('leaves unrelated specifiers to Vite', () => {
    expect(resolveVia('vue')).toBeNull();
    expect(resolveVia('@lokascript/semantic')).toBeNull();
    // Near-misses must not be swallowed — the match is exact, not prefix-based.
    expect(resolveVia('hyperfixi-extras')).toBeNull();
    expect(resolveVia('lokascript/core')).toBeNull();
  });
});
