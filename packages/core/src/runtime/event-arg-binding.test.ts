// @vitest-environment happy-dom
/**
 * Regression: top-level `on <event>(arg1, arg2)` must bind the destructured event
 * properties as locals — the same as behavior-block handlers.
 *
 * The top-level parser used to emit these names as an untyped `params` field that
 * the runtime never read (it binds from `args`), so `on click(button)` /
 * `on pointermove(clientX, clientY)` left the names `undefined`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import type { ExecutionContext } from '../types/core';

function freshContext(el: HTMLElement): ExecutionContext {
  return {
    me: el,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    events: new Map(),
  } as unknown as ExecutionContext;
}

const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

describe('top-level event-arg destructuring', () => {
  let runtime: Runtime;
  let el: HTMLElement;

  beforeEach(() => {
    runtime = new Runtime();
    document.body.innerHTML = '';
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  it('binds a single event property: on click(detail) ...', async () => {
    const { node } = parse('on pointerdown(clientX) put `x=${clientX}` into me');
    await runtime.execute(node!, freshContext(el));
    await tick();

    el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 42, bubbles: true }));
    await tick();

    expect(el.textContent).toBe('x=42');
  });

  it('binds multiple event properties: on pointermove(clientX, clientY) ...', async () => {
    const { node } = parse('on pointermove(clientX, clientY) put `${clientX},${clientY}` into me');
    await runtime.execute(node!, freshContext(el));
    await tick();

    el.dispatchEvent(new MouseEvent('pointermove', { clientX: 7, clientY: 9, bubbles: true }));
    await tick();

    expect(el.textContent).toBe('7,9');
  });
});
