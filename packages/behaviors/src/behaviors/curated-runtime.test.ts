// @vitest-environment happy-dom
/**
 * Curated behaviors — REAL runtime behavior tests.
 *
 * These exercise each curated behavior's actual hyperscript `source` on the real
 * @hyperfixi/engine: define → install on an element → drive the DOM → assert both the
 * effect AND the documented lifecycle events. This is the "parses ≠ works" guard — the
 * mock-based unit tests only prove `register*()` hands the source to the host; these prove
 * the sources do the right thing when they run.
 *
 * The engine runs the same source the pages do, and upstream _hyperscript runs it the same
 * way (measured in a browser, 2026-10-03, with at least one argument given: upstream's
 * `install X` without parentheses throws; `install X()` works there).
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { api, everything, processNode, register } from '@hyperfixi/engine';
import { registerToggleable } from './toggleable';
import { registerRemovable } from './removable';
import { registerClickOutside } from './clickoutside';
import { registerClipboard } from './clipboard';
import { registerAutoDismiss } from './autodismiss';

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

/** Install from an attribute, as a page does: the engine reads `_` and runs the install. */
async function install(code: string, el: HTMLElement): Promise<void> {
  el.setAttribute('_', code);
  processNode(el);
  await tick();
}

beforeAll(async () => {
  // The engine is assembled from modules; this bundle is every one. Behaviors are globals
  // (`window.Toggleable`), so define the set once per file.
  register(...everything);
  await registerToggleable(api);
  await registerRemovable(api);
  await registerClickOutside(api);
  await registerClipboard(api);
  await registerAutoDismiss(api);
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
