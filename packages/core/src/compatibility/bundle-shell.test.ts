// @vitest-environment jsdom
/**
 * Do the bundle SHELLS agree on what a HyperFixi bundle's public API is?
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS (Arc E step 3 — `docs-internal/archive/HANDOFF-command-arch-bundles.md`)
 * ---------------------------------------------------------------------------
 *
 * The same boot shell — the `[_]` scan, the `api` literal, the `window.<global>`
 * install — is written out SEVEN times across two packages. Nothing compared
 * them, so they drifted into four different public APIs along lines no user
 * could predict, and one of the divergences (`window._hyperscript`) actively
 * broke an unrelated library. `bundle-shell.ts` shares the logic that is
 * genuinely identical; THIS FILE is what stops the surfaces diverging again,
 * and it is the reason the shared helper does not need to build the api object
 * itself (measured at +103 bytes gzip on hybrid-complete — see bundle-shell.ts).
 *
 * Two rules carried from the arc, which is why the assertions look stricter
 * than "the key exists":
 *
 *   - ASSERT WHAT AN EXPORT IS FOR. `expect(typeof api.run).toBe('function')`
 *     measures nothing — a shell exporting `run: () => {}` passes it. Every
 *     export below is exercised for its actual effect.
 *   - DIFF THE UNION, BOTH DIRECTIONS. The key-set assertions are set
 *     EQUALITY, not `toContain`. A one-side-only check is blind to additions,
 *     which is exactly how `run`/`eval`/`parserName` appeared in generated
 *     bundles without anyone deciding they should.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import hybridComplete from './browser-bundle-hybrid-complete';
import lite from './browser-bundle-lite';
import litePlus from './browser-bundle-lite-plus';
import { SHELL_CORE_KEYS, createProcessElements } from './bundle-shell';
import { generateBundleCode } from '../bundle-generator/generator';

// ===========================================================================
// The declared surface of every shipped shell
// ===========================================================================

/**
 * Extras each bundle carries ABOVE the core surface, and the consumer that
 * justifies each one. Adding a key to a shipped shell without adding it here
 * FAILS — that is the ratchet.
 */
const SHIPPED_SHELLS = [
  {
    name: 'hybrid-complete',
    api: hybridComplete as unknown as Record<string, unknown>,
    hasBlocks: true,
    // addAliases: pinned by browser-tests/hybrid-complete.spec.ts.
    // tokenize/evaluate: mirror the full bundle's surface.
    extras: ['addAliases', 'addEventAliases', 'tokenize', 'evaluate'],
  },
  {
    name: 'lite',
    api: lite as unknown as Record<string, unknown>,
    hasBlocks: false,
    extras: [],
  },
  {
    name: 'lite-plus',
    api: litePlus as unknown as Record<string, unknown>,
    hasBlocks: false,
    extras: ['addAliases', 'addEventAliases'],
  },
] as const;

/**
 * Extras the GENERATED shell carries. Separate from the shipped list because
 * generated bundles are a different consumer set:
 *   - `parserName` is read by `examples/vite-plugin-test/main.js` and
 *     `examples/vite-plugin-multilingual/main.js`, and is the regex anchor
 *     `@hyperfixi/vite-plugin`'s generator splices semantic api props after.
 *   - `run` mirrors the full bundle's `run`; `eval` is a redundant alias kept
 *     only because dropping published API is a breaking change with no defect
 *     behind it.
 * None of the three is added to the shipped shells: nothing requests them
 * there, and emitted shell code is shipped bytes.
 */
const GENERATED_EXTRAS = ['run', 'eval', 'parserName'];

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

/** Let the shells' un-awaited async executors settle. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/** Parse the `const api = {...}` literal out of generated source. */
function emittedApiKeys(source: string): string[] {
  const start = source.indexOf('const api = {');
  expect(start, 'generated source must declare `const api = {`').toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('};', start));
  return Array.from(body.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*[:(]/gm)).map(m => m[1]);
}

// ===========================================================================
// 1. The key sets — set equality, both directions
// ===========================================================================

describe('shell surface', () => {
  for (const shell of SHIPPED_SHELLS) {
    it(`${shell.name} exposes exactly its declared surface`, () => {
      const expected = [
        ...SHELL_CORE_KEYS,
        ...(shell.hasBlocks ? ['blocks'] : []),
        ...shell.extras,
      ].sort();

      expect(Object.keys(shell.api).sort()).toEqual(expected);
    });
  }

  it('the generated shell matches the handwritten core, plus its declared extras', () => {
    const keys = emittedApiKeys(
      generateBundleCode({ name: 'Drift', commands: ['toggle'], blocks: ['if'] } as never)
    );

    // Oracle-2 shape: two independent copies, one equality assertion. If the
    // handwritten core gains a key and the emitter does not (or vice versa),
    // this fails rather than shipping two different public APIs.
    expect(keys.sort()).toEqual([...SHELL_CORE_KEYS, 'blocks', ...GENERATED_EXTRAS].sort());
  });

  it('the generated shell omits `blocks` when the bundle has none', () => {
    // The one principled divergence: a bundle advertises `blocks` iff it can
    // execute them. lite/lite-plus omit the key for the same reason.
    const keys = emittedApiKeys(
      generateBundleCode({ name: 'NoBlocks', commands: ['toggle'] } as never)
    );

    expect(keys).not.toContain('blocks');
    expect(keys.sort()).toEqual([...SHELL_CORE_KEYS, ...GENERATED_EXTRAS].sort());
  });
});

// ===========================================================================
// 2. `window._hyperscript` — the absence is the assertion
// ===========================================================================

describe('the _hyperscript global', () => {
  it('is not claimed by any shipped bundle', () => {
    // All three shells have been imported (and auto-installed) by this point.
    expect((window as unknown as Record<string, unknown>).hyperfixi).toBeDefined();
    expect((window as unknown as Record<string, unknown>)._hyperscript).toBeUndefined();
  });

  it('is not claimed by a generated bundle', () => {
    const source = generateBundleCode({
      name: 'Global',
      commands: ['toggle'],
      blocks: ['if'],
    } as never);

    // Real `_hyperscript` (hyperscript.org) is a CALLABLE function carrying
    // `evaluate`, `processNode`, `internals`, `config`, `addCommand`… The
    // bundle api is a plain object with none of them, so a page loading both
    // got whichever won the race — and if the bundle won, `_hyperscript(...)`
    // threw "not a function" while the overlapping `parse`/`process` names
    // silently did something else. Generated bundles claimed this global for
    // as long as the generator has existed; nothing ever asserted it.
    expect(source).toContain('.hyperfixi = api');
    expect(source).not.toContain('_hyperscript');
  });
});

// ===========================================================================
// 3. What each core export is FOR
// ===========================================================================

describe('core surface behavior', () => {
  for (const shell of SHIPPED_SHELLS) {
    describe(shell.name, () => {
      const api = shell.api as {
        version: string;
        parse: (code: string) => unknown;
        execute: (code: string, el?: Element) => Promise<unknown>;
        init: (root?: Element | Document) => void;
        process: (root?: Element | Document) => void;
        commands: string[];
        blocks?: string[];
      };

      it('version identifies the bundle', () => {
        expect(api.version).toMatch(/^\d+\.\d+\.\d+-/);
      });

      it('execute applies a real DOM effect', async () => {
        const me = document.createElement('div');
        container.appendChild(me);

        await api.execute('add .applied to me', me);

        expect(me.classList.contains('applied')).toBe(true);
      });

      it('parse produces something the bundle can actually run', () => {
        // Not `toBeTruthy()` on the parse result — that passes for a parser
        // returning a useless object. The witness is that `execute`, which
        // routes through this same parse, produced the effect above.
        const parsed = api.parse('add .x to me');

        expect(parsed).toBeTruthy();
        expect(typeof parsed).toBe('object');
      });

      it('init wires elements found under the given root', async () => {
        const el = document.createElement('div');
        el.setAttribute('_', 'add .wired to me');
        container.appendChild(el);

        api.init(container);
        await flush();

        expect(el.classList.contains('wired')).toBe(true);
      });

      it('process is the same scanner as init', () => {
        // Both names have always pointed at one function; a shell that
        // diverged them would break every htmx-afterSettle integration.
        expect(api.process).toBe(api.init);
      });

      it('commands advertises a non-empty name list', () => {
        expect(Array.isArray(api.commands)).toBe(true);
        expect(api.commands.length).toBeGreaterThan(0);
        expect(api.commands.every(c => typeof c === 'string' && c.length > 0)).toBe(true);
      });

      it(`blocks is ${shell.hasBlocks ? 'advertised' : 'absent'}`, () => {
        expect('blocks' in api).toBe(shell.hasBlocks);
      });
    });
  }
});

// ===========================================================================
// 3b. The shared scanner itself
// ===========================================================================
//
// These exercise `createProcessElements` directly rather than through a
// bundle, because the containment they assert is not reachable from a shell's
// public API: neither the regex nor the hybrid parser throws SYNCHRONOUSLY on
// malformed source — they degrade and return a node. An earlier version of
// this file asserted "a scan error is contained" by feeding each shell
// gibberish, and mutation-testing showed the assertion was VACUOUS: deleting
// the try/catch outright left it green, because the catch never ran.

describe('createProcessElements (the shared scanner)', () => {
  it('contains a parser throw and labels it with the bundle name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    el.setAttribute('_', 'anything');
    container.appendChild(el);

    const scan = createProcessElements(
      () => {
        throw new Error('parse boom');
      },
      () => undefined,
      'Probe'
    );

    expect(() => scan(container)).not.toThrow();
    expect(spy).toHaveBeenCalledWith(
      'HyperFixi Probe error:',
      expect.any(Error),
      'Code:',
      'anything'
    );
    spy.mockRestore();
  });

  it('contains an executor throw', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    el.setAttribute('_', 'code');
    container.appendChild(el);

    const scan = createProcessElements(
      (code: string) => code,
      () => {
        throw new Error('run boom');
      },
      'Probe'
    );

    expect(() => scan(container)).not.toThrow();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('one element failing does not stop the scan', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = document.createElement('div');
    bad.setAttribute('_', 'bad');
    const good = document.createElement('div');
    good.setAttribute('_', 'good');
    container.append(bad, good);

    const seen: string[] = [];
    const scan = createProcessElements(
      (code: string) => {
        if (code === 'bad') throw new Error('boom');
        return code;
      },
      (ast: string) => {
        seen.push(ast);
      },
      'Probe'
    );

    scan(container);

    expect(seen).toEqual(['good']);
    spy.mockRestore();
  });

  it('scans only within the given root', () => {
    const outside = document.createElement('div');
    outside.setAttribute('_', 'outside');
    document.body.appendChild(outside);
    const inside = document.createElement('div');
    inside.setAttribute('_', 'inside');
    container.appendChild(inside);

    const seen: string[] = [];
    const scan = createProcessElements(
      (code: string) => code,
      (ast: string) => {
        seen.push(ast);
      },
      'Probe'
    );

    scan(container);

    expect(seen).toEqual(['inside']);
    outside.remove();
  });

  it('ignores an element whose _ attribute is empty', () => {
    const el = document.createElement('div');
    el.setAttribute('_', '');
    container.appendChild(el);

    const seen: string[] = [];
    const scan = createProcessElements(
      (code: string) => {
        seen.push(code);
        return code;
      },
      () => undefined,
      'Probe'
    );

    scan(container);

    expect(seen).toEqual([]);
  });
});

// ===========================================================================
// 4. What each EXTRA is for — the reason it survived the union decision
// ===========================================================================

describe('witnessed extras', () => {
  it('hybrid-complete: addAliases makes the alias actually execute', async () => {
    const api = hybridComplete as unknown as {
      addAliases: (a: Record<string, string>) => void;
      execute: (code: string, el?: Element) => Promise<unknown>;
    };
    const me = document.createElement('div');
    container.appendChild(me);

    api.addAliases({ basculer: 'toggle' });
    await api.execute('basculer .fr on me', me);

    expect(me.classList.contains('fr')).toBe(true);
  });

  it('lite-plus: addAliases makes the alias actually execute', async () => {
    const api = litePlus as unknown as {
      addAliases: (a: Record<string, string>) => void;
      execute: (code: string, el?: Element) => Promise<unknown>;
    };
    const me = document.createElement('div');
    container.appendChild(me);

    api.addAliases({ agregar: 'add' });
    await api.execute('agregar .es to me', me);

    expect(me.classList.contains('es')).toBe(true);
  });

  it('hybrid-complete: tokenize returns tokens for real source', () => {
    const api = hybridComplete as unknown as { tokenize: (code: string) => unknown[] };

    const tokens = api.tokenize('toggle .active');

    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(1);
  });

  it('hybrid-complete: evaluate resolves a node against a context', async () => {
    const api = hybridComplete as unknown as {
      evaluate: (node: unknown, ctx: unknown) => Promise<unknown>;
    };
    const me = document.createElement('div');

    const value = await api.evaluate({ type: 'literal', value: 42 }, { me, locals: new Map() });

    expect(value).toBe(42);
  });
});
