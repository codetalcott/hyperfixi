/**
 * `catch` / `finally` execution for event handlers.
 *
 * Companion to src/parser/on-handler-catch.test.ts. The parser change alone is
 * not enough: `errorHandler`/`errorSymbol` had no reader anywhere in the repo,
 * so the blocks would have parsed and been dropped. These tests pin the four
 * behaviors a downstream report exercised against 2.9.0:
 *
 *   - success must NOT enter catch (it used to, clobbering the result)
 *   - a rejected async command MUST enter catch (it used to escape uncaught)
 *   - a sync throw must enter catch (proves this is not async-specific)
 *   - finally runs on both paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import type { ExecutionContext } from '../types/core';

describe('event handler catch/finally — execution', () => {
  let runtime: Runtime;
  let context: ExecutionContext;
  let element: HTMLElement;
  let out: HTMLElement;

  /** Bind the handler source to `element` and return the registered listener. */
  const listenerFor = async (src: string): Promise<(e: Event) => Promise<void>> => {
    const result = parse(src);
    expect(result.success).toBe(true);
    const added: Array<(e: Event) => Promise<void>> = [];
    element.addEventListener = vi.fn((_type: string, fn: unknown) => {
      added.push(fn as (e: Event) => Promise<void>);
    }) as unknown as typeof element.addEventListener;
    await runtime.execute(result.node!, context);
    expect(added).toHaveLength(1);
    return added[0];
  };

  beforeEach(() => {
    runtime = new Runtime();
    element = document.createElement('div');
    out = document.createElement('div');
    out.id = 'catch-out';
    document.body.appendChild(element);
    document.body.appendChild(out);
    context = {
      me: element,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      events: new Map(),
    };
  });

  afterEach(() => {
    element.remove();
    out.remove();
    vi.restoreAllMocks();
  });

  it('does not run the catch body on the success path', async () => {
    const listener = await listenerFor(`on click
      put 'ok' into #catch-out
    catch e
      put 'FAILED' into #catch-out
    end`);

    await listener(new Event('click'));

    // The reported symptom was `#catch-out` ending up as the catch body's text
    // because that body had been appended to the try body.
    expect(out.textContent).toBe('ok');
  });

  it('routes a synchronous throw to the catch body', async () => {
    const listener = await listenerFor(`on click
      throw 'boom'
      put 'unreachable' into #catch-out
    catch e
      put 'caught' into #catch-out
    end`);

    await listener(new Event('click'));

    expect(out.textContent).toBe('caught');
  });

  it('binds the error to the catch symbol', async () => {
    const listener = await listenerFor(`on click
      throw 'boom'
    catch e
      put e into #catch-out
    end`);

    await listener(new Event('click'));

    // Upstream binds the Error object itself, not its message.
    expect(out.textContent).toContain('boom');
  });

  it('routes a rejected async command (fetch 404) to the catch body', async () => {
    // The report's failing case: fetch throws on non-2xx by default, and the
    // rejection used to bypass the handler's catch entirely.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('not found', { status: 404, statusText: 'Not Found' }));
    vi.stubGlobal('fetch', fetchMock);

    // NB: double quotes deliberately — a single-quoted string starting with a
    // lowercase `s` is mis-lexed as the possessive `'s` operator (separate bug).
    const listener = await listenerFor(`on click
      fetch '/does-not-exist' as text
      put "unreachable" into #catch-out
    catch e
      put 'handled' into #catch-out
    end`);

    await listener(new Event('click'));

    expect(fetchMock).toHaveBeenCalled();
    expect(out.textContent).toBe('handled');
  });

  it('runs finally on the success path', async () => {
    const listener = await listenerFor(`on click
      put 'body' into #catch-out
    finally
      put 'finally' into #catch-out
    end`);

    await listener(new Event('click'));

    expect(out.textContent).toBe('finally');
  });

  it('runs finally on the failure path and still reports the error', async () => {
    const listener = await listenerFor(`on click
      throw 'boom'
    finally
      put 'finally' into #catch-out
    end`);

    // `finally` alone must not swallow the error — only `catch` handles it.
    await expect(listener(new Event('click'))).rejects.toThrow('boom');
    expect(out.textContent).toBe('finally');
  });

  it('runs catch then finally when the body throws', async () => {
    const listener = await listenerFor(`on click
      throw 'boom'
    catch e
      append 'caught ' to #catch-out
    finally
      append 'finally' to #catch-out
    end`);

    await listener(new Event('click'));

    expect(out.textContent).toBe('caught finally');
  });

  it('still lets errors escape a handler with no error blocks', async () => {
    // Regression guard: the no-catch path must behave exactly as before.
    const listener = await listenerFor(`on click
      throw 'boom'
    end`);

    await expect(listener(new Event('click'))).rejects.toThrow('boom');
  });
});
