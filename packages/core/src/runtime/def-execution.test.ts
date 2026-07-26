/**
 * `def` execution.
 *
 * These started life (PR #779) as characterizing tests asserting that `def` did
 * NOT work: it parsed into a DefNode carrying params, body and
 * errorSymbol/errorHandler/finallyHandler, then fell through
 * RuntimeBase.execute()'s switch to evaluateAST and threw
 * `Unknown AST node type: def`. The syntax looked supported and executed
 * nothing — so the downstream report's "parsed and silently dropped" was too
 * generous; it threw, into a console.error naming an internal node type.
 *
 * They are now inverted: each one asserts the behavior it previously denied.
 *
 * Scope decisions, deliberately narrower than upstream:
 *   - the function installs into `context.globals`, NOT the real `window`.
 *     Upstream assigns body-level defs to globalThis and element-level defs to
 *     per-element storage inherited down the DOM; we trade that compatibility
 *     for not polluting the global namespace with no teardown.
 *   - a namespaced `def utils.foo()` installs under the FLAT key "utils.foo"
 *     rather than creating a nested `utils` object.
 *
 * Error handling mirrors what #768 did for `on` handlers, because upstream
 * shares one `parseErrorAndFinally` between the two features and they must not
 * drift. See runtime/on-handler-catch.test.ts for the sibling suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import { createContext } from '../core/context';
import type { ExecutionContext } from '../types/core';
import type { DefNode } from '../types/base-types';

describe('def execution', () => {
  let runtime: Runtime;
  let context: ExecutionContext;

  /** Parse and execute a source, returning nothing — installs happen as a side effect. */
  const run = async (src: string): Promise<unknown> => {
    const result = parse(src);
    expect(result.success).toBe(true);
    return runtime.execute(result.node!, context);
  };

  /** The installed callable for `name`. */
  const fnFor = (name: string): ((...args: unknown[]) => Promise<unknown>) => {
    const fn = context.globals.get(name);
    expect(typeof fn).toBe('function');
    return fn as (...args: unknown[]) => Promise<unknown>;
  };

  beforeEach(() => {
    runtime = new Runtime();
    // A fresh globals Map: createContext() otherwise defaults to the
    // module-level sharedGlobals, which would leak between tests.
    context = createContext(document.createElement('div'), new Map());
  });

  it('parses to a DefNode with the error blocks populated', () => {
    const result = parse(`def risky()
      throw 'boom'
    catch e
      log e
    finally
      log 'done'
    end`);

    expect(result.success).toBe(true);
    const def = result.node as DefNode;
    expect(def.type).toBe('def');
    expect(def.errorSymbol).toBe('e');
    expect(def.errorHandler?.length).toBeGreaterThan(0);
    expect(def.finallyHandler?.length).toBeGreaterThan(0);
  });

  it('installs a callable instead of throwing Unknown AST node type', async () => {
    await expect(run('def greet(n)\n  return n\nend')).resolves.not.toThrow();
    expect(context.globals.has('greet')).toBe(true);
    expect(typeof context.globals.get('greet')).toBe('function');
  });

  it('binds parameters and returns a value', async () => {
    await run('def identity(n)\n  return n\nend');
    await expect(fnFor('identity')(42)).resolves.toBe(42);
  });

  it('binds multiple parameters positionally', async () => {
    await run('def pick2(a, b)\n  return b\nend');
    await expect(fnFor('pick2')('first', 'second')).resolves.toBe('second');
  });

  it('leaves an unpassed parameter undefined rather than erroring', async () => {
    await run('def maybe(a)\n  return a\nend');
    await expect(fnFor('maybe')()).resolves.toBeUndefined();
  });

  it('runs the body for its side effects', async () => {
    const probe = document.createElement('div');
    probe.id = 'def-probe';
    document.body.appendChild(probe);

    await run("def sideEffect()\n  put 'ran' into #def-probe\nend");
    await fnFor('sideEffect')();

    expect(probe.textContent).toBe('ran');
    probe.remove();
  });

  it('gives each call its own locals, seeded from the declaring scope', async () => {
    context.locals.set('outer', 'visible');
    await run('def readsOuter(n)\n  return outer\nend');

    await expect(fnFor('readsOuter')(1)).resolves.toBe('visible');
    // The parameter binding must not leak back out to the declaring scope.
    expect(context.locals.has('n')).toBe(false);
  });

  it('installs a namespaced def under its flat dotted name', async () => {
    await run('def utils.calc(a)\n  return a\nend');
    expect(context.globals.has('utils.calc')).toBe(true);
    await expect(fnFor('utils.calc')(7)).resolves.toBe(7);
  });

  describe('catch / finally', () => {
    it('routes a thrown error to catch and does not re-propagate', async () => {
      await run("def risky()\n  throw 'boom'\ncatch e\n  return 'caught'\nend");
      await expect(fnFor('risky')()).resolves.toBe('caught');
    });

    it('binds the error under the author symbol', async () => {
      const probe = document.createElement('div');
      probe.id = 'def-err';
      document.body.appendChild(probe);

      await run("def risky()\n  throw 'boom'\ncatch e\n  put e into #def-err\nend");
      await fnFor('risky')();

      // Upstream binds the Error object itself, not its message.
      expect(probe.textContent).toContain('boom');
      probe.remove();
    });

    it('does not enter catch when the body succeeds', async () => {
      await run("def fine()\n  return 'ok'\ncatch e\n  return 'caught'\nend");
      await expect(fnFor('fine')()).resolves.toBe('ok');
    });

    it('runs finally on the success path', async () => {
      await run("def fin()\n  return 'ok'\nfinally\n  set $ran to 'yes'\nend");
      await expect(fnFor('fin')()).resolves.toBe('ok');
      expect(context.globals.get('ran')).toBe('yes');
    });

    it('runs finally on the failure path and still reports the error', async () => {
      await run("def boom()\n  throw 'boom'\nfinally\n  set $ran to 'yes'\nend");
      // `finally` alone must not swallow — only `catch` handles.
      await expect(fnFor('boom')()).rejects.toThrow('boom');
      expect(context.globals.get('ran')).toBe('yes');
    });

    it('runs catch then finally, in that order', async () => {
      await run(
        "def both()\n  throw 'boom'\ncatch e\n  set $order to 'caught'\nfinally\n  set $order to ($order + '-finally')\nend"
      );
      await fnFor('both')();
      expect(context.globals.get('order')).toBe('caught-finally');
    });

    it('lets an error escape a def with no error blocks', async () => {
      await run("def bare()\n  throw 'boom'\nend");
      await expect(fnFor('bare')()).rejects.toThrow('boom');
    });
  });

  describe('called from hyperscript', () => {
    // The assertion that actually matters: `call` resolves the name through
    // evaluateIdentifier (locals -> globals -> context props -> globalThis) and
    // invokes the installed closure. Everything above tests the callable in
    // isolation; this tests that authors can reach it.
    it('call reaches the def and runs its body', async () => {
      const probe = document.createElement('div');
      probe.id = 'def-e2e';
      document.body.appendChild(probe);

      await run('def shout(n)\n  put n into #def-e2e\nend');
      await run("call shout('hi')");

      expect(probe.textContent).toBe('hi');
      probe.remove();
    });

    it('call surfaces the return value as it/result', async () => {
      await run('def answer()\n  return 42\nend');
      await run('call answer()');
      expect(context.result).toBe(42);
    });

    it('a def can call another def', async () => {
      const probe = document.createElement('div');
      probe.id = 'def-nested';
      document.body.appendChild(probe);

      await run('def inner(n)\n  put n into #def-nested\nend');
      await run("def outer()\n  call inner('nested')\nend");
      await run('call outer()');

      expect(probe.textContent).toBe('nested');
      probe.remove();
    });
  });

  describe('program integration', () => {
    it('installs before init blocks run, so init can call a def', async () => {
      const probe = document.createElement('div');
      probe.id = 'def-init';
      document.body.appendChild(probe);

      // `def` is a declaration; `init` is executable code that may use it. The
      // def therefore installs in its own phase ahead of init, exactly as
      // handlers register before init can send to them.
      await run(`def label()
  return 'from-def'
end
init
  put 'ready' into #def-init
end`);

      expect(context.globals.has('label')).toBe(true);
      expect(probe.textContent).toBe('ready');
      probe.remove();
    });

    it('no longer aborts the statements that follow it', async () => {
      // Previously the def threw here, taking every later statement with it.
      const added: Array<(e: Event) => unknown> = [];
      const el = context.me as HTMLElement;
      el.addEventListener = ((_type: string, fn: unknown) => {
        added.push(fn as (e: Event) => unknown);
      }) as unknown as typeof el.addEventListener;

      await expect(
        run(`def greet(n)
  return n
end
on click
  call greet('x')
end`)
      ).resolves.not.toThrow();

      expect(context.globals.has('greet')).toBe(true);
      expect(added).toHaveLength(1);
    });
  });
});
