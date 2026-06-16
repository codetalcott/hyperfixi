// @vitest-environment happy-dom
/**
 * Regression: `set my style.<prop> to V` must write the WRITABLE inline style
 * (`element.style`), not the read-only computed style.
 *
 * A plain `.style` member read resolves to `getComputedStyle(element)`; assigning
 * to it throws ("these styles are computed … read-only"). The set member-assignment
 * path now targets `element.style` for `.style.<prop>` writes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../../../runtime/runtime';
import { parse } from '../../../parser/parser';
import type { ExecutionContext } from '../../../types/core';

function ctx(el: HTMLElement): ExecutionContext {
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

describe('set my style.<prop> writes inline style', () => {
  let runtime: Runtime;
  let el: HTMLElement;

  beforeEach(() => {
    runtime = new Runtime();
    document.body.innerHTML = '';
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  it('set my style.width to "50px"', async () => {
    const { node } = parse('set my style.width to "50px"');
    await runtime.execute(node!, ctx(el));
    expect(el.style.width).toBe('50px');
  });

  it('set my style.backgroundColor to "red"', async () => {
    const { node } = parse('set my style.backgroundColor to "red"');
    await runtime.execute(node!, ctx(el));
    expect(el.style.backgroundColor).toBe('red');
  });

  it('does not disturb non-style member assignment (set my innerHTML)', async () => {
    const { node } = parse('set my innerHTML to "<span>hi</span>"');
    await runtime.execute(node!, ctx(el));
    expect(el.innerHTML).toBe('<span>hi</span>');
  });
});
