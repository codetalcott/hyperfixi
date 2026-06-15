// @vitest-environment happy-dom
/**
 * Optional behaviors — REAL runtime behavior tests.
 *
 * The optional three (FocusTrap / ScrollReveal / Tabs) were converted from
 * imperative installers onto the single source-compiled runtime path
 * (BEHAVIORS_CONSOLIDATION_PLAN.md §3d follow-up). Like curated-runtime.test.ts,
 * these exercise each behavior's actual hyperscript `source` through the real
 * @hyperfixi/core runtime — register → install on an element → drive the DOM →
 * assert both the effect AND the documented lifecycle events.
 *
 * This is the "parses ≠ works" guard (§2/§5): the mock-based unit tests only prove
 * `register*()` calls compileSync; these prove the `init`-block `js()` bodies (the
 * focus model, the IntersectionObserver, the ARIA/keyboard wiring) actually run
 * correctly once compiled — exactly the class of bug the imperative path masked.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { hyperscript } from '@hyperfixi/core';
import { registerFocusTrap } from './focustrap';
import { registerScrollReveal } from './scrollreveal';
import { registerTabs } from './tabs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hf = hyperscript as any;

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function install(code: string, el: HTMLElement): Promise<void> {
  const r = hyperscript.compileSync(code, { traditional: true });
  if (!r.ok) throw new Error(`install compile failed: ${JSON.stringify(r.errors)}`);
  await hyperscript.execute(r.ast, hyperscript.createContext(el));
}

beforeAll(async () => {
  // Behavior registry is a runtime singleton; register the optional set once.
  await registerFocusTrap(hf);
  await registerScrollReveal(hf);
  await registerTabs(hf);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('FocusTrap — runtime', () => {
  function buildTrap(): { trap: HTMLElement; buttons: HTMLButtonElement[] } {
    const trap = document.createElement('div');
    const buttons = [0, 1, 2].map(i => {
      const b = document.createElement('button');
      b.textContent = `b${i}`;
      trap.appendChild(b);
      return b;
    });
    document.body.appendChild(trap);
    return { trap, buttons };
  }

  it('activates on install: sets aria-modal, focuses first, fires focustrap:activated', async () => {
    const { trap, buttons } = buildTrap();
    const activated = vi.fn();
    trap.addEventListener('focustrap:activated', activated);

    await install('install FocusTrap', trap);

    expect(trap.getAttribute('aria-modal')).toBe('true');
    expect(activated).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('traps Tab: wraps forward off the last element and backward off the first', async () => {
    const { trap, buttons } = buildTrap();
    await install('install FocusTrap', trap);

    // Forward Tab from first → second.
    buttons[0].focus();
    trap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[1]);

    // Forward Tab off the last element → wraps to first.
    buttons[2].focus();
    trap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    // Shift+Tab off the first element → wraps to last.
    buttons[0].focus();
    trap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('deactivates via custom event: removes aria-modal and fires focustrap:deactivated', async () => {
    const { trap } = buildTrap();
    const deactivated = vi.fn();
    trap.addEventListener('focustrap:deactivated', deactivated);

    await install('install FocusTrap', trap);
    expect(trap.getAttribute('aria-modal')).toBe('true');

    trap.dispatchEvent(new CustomEvent('focustrap:deactivate'));
    await tick();

    expect(trap.hasAttribute('aria-modal')).toBe(false);
    expect(deactivated).toHaveBeenCalledTimes(1);
  });
});

describe('ScrollReveal — runtime', () => {
  // happy-dom ships an IntersectionObserver that never fires its callback (no
  // layout engine). Stub it so we can drive the intersection deterministically and
  // assert the js() body's class/event/disconnect logic actually runs.
  let lastCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
  let disconnected = false;
  let observed: Element | null = null;

  class MockIntersectionObserver {
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      lastCallback = cb;
    }
    observe(el: Element) {
      observed = el;
    }
    disconnect() {
      disconnected = true;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  }

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    lastCallback = null;
    disconnected = false;
    observed = null;
  });

  it('observes the element and adds the class + fires enter on intersection (once)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const enter = vi.fn();
    el.addEventListener('scrollreveal:enter', enter);

    await install('install ScrollReveal', el);

    expect(observed).toBe(el);
    expect(lastCallback).toBeTypeOf('function');

    // Simulate the element scrolling into view.
    lastCallback!([{ isIntersecting: true }]);

    expect(el.classList.contains('revealed')).toBe(true);
    expect(enter).toHaveBeenCalledTimes(1);
    // once defaults to true → observer disconnects after the first reveal.
    expect(disconnected).toBe(true);
  });

  it('honors a custom class parameter', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    await install('install ScrollReveal(cls: "shown")', el);
    lastCallback!([{ isIntersecting: true }]);

    expect(el.classList.contains('shown')).toBe(true);
  });
});

describe('Tabs — runtime', () => {
  function buildTabs(): {
    root: HTMLElement;
    tabs: HTMLElement[];
    panels: HTMLElement[];
  } {
    const root = document.createElement('div');
    const tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');
    root.appendChild(tablist);

    const tabs: HTMLElement[] = [];
    const panels: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const tab = document.createElement('button');
      tab.setAttribute('role', 'tab');
      tab.textContent = `Tab ${i}`;
      tablist.appendChild(tab);
      tabs.push(tab);

      const panel = document.createElement('div');
      panel.setAttribute('role', 'tabpanel');
      panel.textContent = `Panel ${i}`;
      root.appendChild(panel);
      panels.push(panel);
    }
    document.body.appendChild(root);
    return { root, tabs, panels };
  }

  it('wires ARIA on install: first tab selected, roving tabindex, controls/labelledby', async () => {
    const { root, tabs, panels } = buildTabs();

    await install('install Tabs', root);

    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');

    // aria-controls / aria-labelledby cross-link tab[i] <-> panel[i].
    expect(tabs[0].getAttribute('aria-controls')).toBe(panels[0].id);
    expect(panels[0].getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(panels[0].getAttribute('aria-hidden')).toBe('false');
    expect(panels[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('selects a tab on click and fires tabs:changed', async () => {
    const { root, tabs, panels } = buildTabs();
    const changed = vi.fn();
    root.addEventListener('tabs:changed', changed);

    await install('install Tabs', root);

    tabs[1].click();
    await tick();

    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(panels[1].getAttribute('aria-hidden')).toBe('false');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('navigates with ArrowRight and is cancelable via tabs:change', async () => {
    const { root, tabs } = buildTabs();
    await install('install Tabs', root);

    // ArrowRight on the tablist advances selection.
    const tablist = root.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');

    // preventDefault on the cancelable tabs:change blocks the next switch.
    root.addEventListener('tabs:change', e => e.preventDefault(), { once: true });
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[2].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });
});
