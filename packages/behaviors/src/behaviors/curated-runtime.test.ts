// @vitest-environment happy-dom
/**
 * Curated behaviors — REAL runtime behavior tests (Phase 2).
 *
 * These exercise each curated behavior's actual hyperscript `source` through the
 * real @hyperfixi/core runtime: register → install on an element → drive the DOM →
 * assert both the effect AND the documented lifecycle events. This is the
 * "parses ≠ works" guard (BEHAVIORS_CONSOLIDATION_PLAN.md §2/§5) — the mock-based
 * unit tests only prove `register*()` calls compileSync; these prove the js()
 * bodies actually do the right thing at runtime.
 *
 * These tests already paid for themselves: they surfaced two source bugs the
 * imperative path was masking — ClickOutside read `event.target` without passing
 * `event` into its js() block, and Clipboard used top-level `await` (invalid in a
 * js() block). Both are fixed in the schema sources.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { hyperscript } from '@hyperfixi/core';
import { registerToggleable } from './toggleable';
import { registerRemovable } from './removable';
import { registerClickOutside } from './clickoutside';
import { registerClipboard } from './clipboard';
import { registerAutoDismiss } from './autodismiss';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hf = hyperscript as any;

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function install(code: string, el: HTMLElement): Promise<void> {
  const r = hyperscript.compileSync(code, { traditional: true });
  if (!r.ok) throw new Error(`install compile failed: ${JSON.stringify(r.errors)}`);
  await hyperscript.execute(r.ast, hyperscript.createContext(el));
}

beforeAll(async () => {
  // Behavior registry is a runtime singleton; register the curated set once.
  await registerToggleable(hf);
  await registerRemovable(hf);
  await registerClickOutside(hf);
  await registerClipboard(hf);
  await registerAutoDismiss(hf);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Toggleable — runtime', () => {
  it('toggles the parameterized class and fires on/off lifecycle events', async () => {
    const el = document.createElement('button');
    document.body.appendChild(el);
    const on = vi.fn();
    const off = vi.fn();
    el.addEventListener('toggleable:on', on);
    el.addEventListener('toggleable:off', off);

    await install('install Toggleable(cls: "hl")', el);

    el.click();
    await tick();
    expect(el.classList.contains('hl')).toBe(true);
    expect(on).toHaveBeenCalledTimes(1);

    el.click();
    await tick();
    expect(el.classList.contains('hl')).toBe(false);
    expect(off).toHaveBeenCalledTimes(1);
  });
});

describe('Removable — runtime', () => {
  it('removes the element on click and fires before/removed events', async () => {
    const el = document.createElement('div');
    el.id = 'rm-target';
    document.body.appendChild(el);
    const before = vi.fn();
    const removed = vi.fn();
    el.addEventListener('removable:before', before);
    document.addEventListener('removable:removed', removed, { once: true });

    await install('install Removable', el);

    el.click();
    await tick();

    expect(document.getElementById('rm-target')).toBeNull();
    expect(before).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
  });
});

describe('ClickOutside — runtime', () => {
  it('fires clickoutside for outside presses but not inside', async () => {
    const el = document.createElement('div');
    const outside = document.createElement('button');
    document.body.append(el, outside);
    const fired = vi.fn();
    el.addEventListener('clickoutside', fired);

    await install('install ClickOutside', el);

    // The source passes `event` into its js() block, so dispatch sets event.target.
    const press = (target: HTMLElement) =>
      target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    press(outside);
    await tick();
    expect(fired).toHaveBeenCalledTimes(1);

    fired.mockClear();
    press(el);
    await tick();
    expect(fired).not.toHaveBeenCalled();
  });
});

describe('Clipboard — runtime', () => {
  it('writes literal text, adds .copied feedback, and fires clipboard:copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const el = document.createElement('button');
    document.body.appendChild(el);
    const copied = vi.fn();
    el.addEventListener('clipboard:copied', copied);

    await install('install Clipboard(text: "hello")', el);

    el.click();
    await tick();

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(el.classList.contains('copied')).toBe(true);
    expect(copied).toHaveBeenCalledTimes(1);
  });
});

describe('AutoDismiss — runtime', () => {
  it('fires start, then removes the element after the delay and fires dismissed', async () => {
    const el = document.createElement('div');
    el.id = 'ad-target';
    document.body.appendChild(el);
    const start = vi.fn();
    const dismissed = vi.fn();
    el.addEventListener('autodismiss:start', start);
    document.addEventListener('autodismiss:dismissed', dismissed, { once: true });

    await install('install AutoDismiss(delay: 10)', el);

    expect(start).toHaveBeenCalledTimes(1);

    await tick(80);

    expect(document.getElementById('ad-target')).toBeNull();
    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});
