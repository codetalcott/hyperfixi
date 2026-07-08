/**
 * Element-scoped `:name` variables + numeric `increment @attr`.
 *
 * Upstream _hyperscript scopes `:name` to the element that owns the handler:
 * the value persists across event firings, is shared between handlers on the
 * same element, and is isolated per element (never leaking to window/globals).
 * These tests drive the parse → runtime path (`parse()` + `Runtime.execute()`),
 * simulating repeated event firings the way `runtime-base` does (a fresh
 * per-firing `locals` map spread from a stable base context whose `owner` is the
 * handler element).
 */

import { describe, it, expect } from 'vitest';
import { Runtime } from '../../../runtime/runtime';
import { parse } from '../../../parser/parser';
import { createContext, getElementScopeMap } from '../../../core/context';
import type { ExecutionContext } from '../../../types/core';

const runtime = new Runtime();

/** Run one hyperscript command/sequence against a context. */
async function run(src: string, ctx: ExecutionContext): Promise<void> {
  const result = parse(src);
  expect(result.success).toBe(true);
  await runtime.execute(result.node!, ctx);
}

/**
 * Simulate an event firing: `runtime-base` builds each firing's context by
 * spreading the install-time base (preserving `owner`) with a fresh `locals`
 * map. Element scope must survive across these; execution-locals must not.
 */
function firingContext(base: ExecutionContext): ExecutionContext {
  return { ...base, locals: new Map(), it: null } as ExecutionContext;
}

describe('element-scoped `:name` variables', () => {
  it('increment :count persists across firings (1, 2, 3)', async () => {
    const el = document.createElement('button');
    const base = createContext(el);

    const seen: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = firingContext(base);
      await run('increment :count', ctx);
      seen.push(getElementScopeMap(el).get('count'));
    }

    expect(seen).toEqual([1, 2, 3]);
  });

  it('set :count to (:count or 0) + 1 counts up across firings', async () => {
    const el = document.createElement('button');
    const base = createContext(el);

    const seen: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = firingContext(base);
      await run('set :count to (:count or 0) + 1', ctx);
      seen.push(getElementScopeMap(el).get('count'));
    }

    expect(seen).toEqual([1, 2, 3]);
  });

  it('two elements with the same :x name do NOT share state', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const baseA = createContext(a);
    const baseB = createContext(b);

    await run('increment :x', firingContext(baseA));
    await run('increment :x', firingContext(baseA));
    await run('increment :x', firingContext(baseB));

    expect(getElementScopeMap(a).get('x')).toBe(2);
    expect(getElementScopeMap(b).get('x')).toBe(1);
  });

  it('does not leak `:x` to window or globals', async () => {
    const el = document.createElement('div');
    const ctx = createContext(el);

    await run('set :leaky to 5', ctx);

    expect(getElementScopeMap(el).get('leaky')).toBe(5);
    expect(ctx.globals.has('leaky')).toBe(false);
    expect('leaky' in (window as unknown as Record<string, unknown>)).toBe(false);
    // Not stored as an execution-local either.
    expect(ctx.locals.has('leaky')).toBe(false);
  });

  it('reading an unset `:x` yields undefined (no fallthrough to globals)', async () => {
    const el = document.createElement('div');
    const ctx = createContext(el);
    ctx.globals.set('ghost', 'from-globals');

    // `:ghost` must NOT resolve the same-named global.
    await run("set :copy to (:ghost or 'unset')", ctx);
    expect(getElementScopeMap(el).get('copy')).toBe('unset');
  });

  it('shares `:x` between two handlers on the same element', async () => {
    const el = document.createElement('div');
    const base = createContext(el);

    // Handler 1 seeds; handler 2 (separate firing) reads it back.
    await run('set :shared to 7', firingContext(base));
    await run('set :echo to :shared', firingContext(base));

    expect(getElementScopeMap(el).get('echo')).toBe(7);
  });

  it('`$x` globals are unchanged (persist via globals, not element scope)', async () => {
    const el = document.createElement('div');
    const base = createContext(el);

    const seen: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = firingContext(base);
      await run('increment $count', ctx);
      seen.push(ctx.globals.get('count'));
    }

    expect(seen).toEqual([1, 2, 3]);
    // `$count` lives in globals, not the element store.
    expect(getElementScopeMap(el).has('count')).toBe(false);
  });

  it('the `local` keyword stays execution-local (resets per firing)', async () => {
    const el = document.createElement('div');
    const base = createContext(el);

    const ctx1 = firingContext(base);
    await run('set local tmp to 1', ctx1);
    expect(ctx1.locals.get('tmp')).toBe(1);
    // Not in the element store.
    expect(getElementScopeMap(el).has('tmp')).toBe(false);

    // A new firing does not see the previous local.
    const ctx2 = firingContext(base);
    expect(ctx2.locals.has('tmp')).toBe(false);
  });

  it('`tell` keeps `:x` bound to the owner element, not the told element', async () => {
    const owner = document.createElement('div');
    const other = document.createElement('div');
    other.id = 'tell-target';
    document.body.appendChild(other);
    try {
      const ctx = createContext(owner); // owner === scope owner

      await run('tell #tell-target set :badge to 42', ctx);

      // Element scope stays with the owner even though `tell` retargets `me`.
      expect(getElementScopeMap(owner).get('badge')).toBe(42);
      expect(getElementScopeMap(other).has('badge')).toBe(false);
    } finally {
      other.remove();
    }
  });
});

describe('numeric `increment @attribute`', () => {
  it('increment @data-n coerces numerically (1, 2, 3) — not string concat', async () => {
    const el = document.createElement('div');
    const base = createContext(el);

    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = firingContext(base);
      await run('increment @data-n', ctx);
      seen.push(el.getAttribute('data-n') ?? '');
    }

    expect(seen).toEqual(['1', '2', '3']);
  });

  it('decrement @data-n stays numeric', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-n', '5');
    const ctx = createContext(el);

    await run('decrement @data-n', ctx);
    expect(el.getAttribute('data-n')).toBe('4');
  });
});
