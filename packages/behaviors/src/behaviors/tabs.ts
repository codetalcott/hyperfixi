/**
 * Tabs Behavior — Imperative Implementation
 *
 * WAI-ARIA compliant tabs with roving tabindex keyboard navigation.
 * Auto-wires role, aria-selected, aria-controls, and aria-labelledby.
 */

import { tabsSchema } from '../schemas/tabs.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

export const tabsSource = tabsSchema.source;
export const tabsMetadata = tabsSchema;

let idCounter = 0;

function ensureId(el: HTMLElement, prefix: string): string {
  if (!el.id) {
    el.id = `${prefix}-${++idCounter}`;
  }
  return el.id;
}

/**
 * Imperative installer for Tabs behavior.
 */
function installTabs(element: HTMLElement, params: Record<string, any>): void {
  const orientation = params.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const wrap = params.wrap !== false;
  const activeClass = (params.activeClass as string) || 'active';
  const initialIndex = typeof params.activeTab === 'number' ? params.activeTab : 0;

  // Discover tabs and panels
  const tabs = Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]'));
  const panels = Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

  if (tabs.length === 0 || panels.length === 0) return;

  // Find or mark the tablist
  const tablist = element.querySelector<HTMLElement>('[role="tablist"]') || tabs[0].parentElement;
  if (tablist && !tablist.getAttribute('role')) {
    tablist.setAttribute('role', 'tablist');
  }
  if (tablist) {
    tablist.setAttribute('aria-orientation', orientation);
  }

  // Wire IDs, aria-controls, aria-labelledby
  const count = Math.min(tabs.length, panels.length);
  for (let i = 0; i < count; i++) {
    const tabId = ensureId(tabs[i], 'tab');
    const panelId = ensureId(panels[i], 'tabpanel');
    tabs[i].setAttribute('aria-controls', panelId);
    panels[i].setAttribute('aria-labelledby', tabId);
  }

  let currentIndex = -1;

  function selectTab(index: number, previousIndex: number): boolean {
    if (index === previousIndex || index < 0 || index >= count) return false;

    const detail = {
      tab: tabs[index],
      panel: panels[index],
      index,
      previousIndex,
    };

    // Cancelable before-event
    const changeEvent = new CustomEvent('tabs:change', {
      bubbles: true,
      cancelable: true,
      detail,
    });
    element.dispatchEvent(changeEvent);
    if (changeEvent.defaultPrevented) return false;

    // Deactivate previous
    if (previousIndex >= 0 && previousIndex < count) {
      tabs[previousIndex].setAttribute('aria-selected', 'false');
      tabs[previousIndex].setAttribute('tabindex', '-1');
      tabs[previousIndex].classList.remove(activeClass);
      panels[previousIndex].setAttribute('aria-hidden', 'true');
      panels[previousIndex].classList.remove(activeClass);
    }

    // Activate new
    tabs[index].setAttribute('aria-selected', 'true');
    tabs[index].setAttribute('tabindex', '0');
    tabs[index].classList.add(activeClass);
    panels[index].setAttribute('aria-hidden', 'false');
    panels[index].classList.add(activeClass);

    currentIndex = index;

    element.dispatchEvent(new CustomEvent('tabs:changed', { bubbles: true, detail }));
    return true;
  }

  // Initialize all tabs as inactive, then activate initial
  for (let i = 0; i < count; i++) {
    tabs[i].setAttribute('aria-selected', 'false');
    tabs[i].setAttribute('tabindex', '-1');
    tabs[i].classList.remove(activeClass);
    panels[i].setAttribute('aria-hidden', 'true');
    panels[i].classList.remove(activeClass);
  }

  const clamped = Math.max(0, Math.min(initialIndex, count - 1));
  // Directly activate without firing change event on init
  tabs[clamped].setAttribute('aria-selected', 'true');
  tabs[clamped].setAttribute('tabindex', '0');
  tabs[clamped].classList.add(activeClass);
  panels[clamped].setAttribute('aria-hidden', 'false');
  panels[clamped].classList.add(activeClass);
  currentIndex = clamped;

  // Click handler
  for (let i = 0; i < count; i++) {
    tabs[i].addEventListener('click', () => {
      selectTab(i, currentIndex);
      tabs[i].focus();
    });
  }

  // Keyboard handler on tablist
  const keyTarget = tablist || element;
  keyTarget.addEventListener('keydown', (e: KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    let nextIndex: number | null = null;

    if (e.key === nextKey) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= count) nextIndex = wrap ? 0 : null;
    } else if (e.key === prevKey) {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = wrap ? count - 1 : null;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      if (selectTab(nextIndex, currentIndex)) {
        tabs[nextIndex].focus();
      }
    }
  });

  // Programmatic tab selection
  element.addEventListener('tabs:select', ((e: CustomEvent) => {
    const index = e.detail?.index;
    if (typeof index === 'number') {
      selectTab(index, currentIndex);
    }
  }) as EventListener);
}

/**
 * Register the Tabs behavior with LokaScript.
 */
export async function registerTabs(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'Tabs',
    parameters: ['orientation', 'activeTab', 'wrap', 'activeClass'],
    eventHandlers: [],
    imperativeInstaller: installTabs,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerTabs().catch(console.error);
}

export default {
  source: tabsSchema.source,
  metadata: tabsSchema,
  register: registerTabs,
};
