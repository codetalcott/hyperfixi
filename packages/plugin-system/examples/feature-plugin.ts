/**
 * Feature Plugin Example
 * Demonstrates how to create feature plugins that add capabilities to elements
 */

import {
  optimizedRegistry,
  HybridPluginLoader,
  type FeaturePlugin,
  type ElementContext,
  type InitContext,
} from '@hyperfixi/plugin-system';

/**
 * Example 1: Auto-Save Feature
 * Automatically saves form data to localStorage
 *
 * Usage: <form data-autosave="myForm">...</form>
 */
const AutoSaveFeature: FeaturePlugin = {
  type: 'feature',
  name: 'auto-save',

  onElementInit: (ctx: ElementContext) => {
    const { element, attribute } = ctx;
    const key = element.getAttribute('data-autosave');
    if (!key) return;

    const form = element as HTMLFormElement;
    const savedData = localStorage.getItem(`autosave:${key}`);

    // Restore saved data
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        Object.entries(data).forEach(([name, value]) => {
          const input = form.elements.namedItem(name) as HTMLInputElement;
          if (input) {
            input.value = value as string;
          }
        });
      } catch (e) {
        console.warn('Failed to restore autosave data:', e);
      }
    }

    // Save on input
    const saveHandler = () => {
      const formData = new FormData(form);
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
      localStorage.setItem(`autosave:${key}`, JSON.stringify(data));
    };

    form.addEventListener('input', saveHandler);

    // Clear on successful submit
    const submitHandler = () => {
      localStorage.removeItem(`autosave:${key}`);
    };
    form.addEventListener('submit', submitHandler);

    // Return cleanup function
    return () => {
      form.removeEventListener('input', saveHandler);
      form.removeEventListener('submit', submitHandler);
    };
  },
};

/**
 * Example 2: Intersection Observer Feature
 * Triggers events when element enters/leaves viewport
 *
 * Usage: <div data-intersect data-intersect-threshold="0.5">...</div>
 */
const IntersectionFeature: FeaturePlugin = {
  type: 'feature',
  name: 'intersection',

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;

    if (!element.hasAttribute('data-intersect')) return;

    const threshold = parseFloat(
      element.getAttribute('data-intersect-threshold') || '0'
    );
    const rootMargin = element.getAttribute('data-intersect-margin') || '0px';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const eventType = entry.isIntersecting
            ? 'intersect:enter'
            : 'intersect:leave';

          element.dispatchEvent(
            new CustomEvent(eventType, {
              detail: {
                ratio: entry.intersectionRatio,
                boundingRect: entry.boundingClientRect,
              },
            })
          );

          // Also add/remove classes for CSS-based effects
          if (entry.isIntersecting) {
            element.classList.add('in-viewport');
          } else {
            element.classList.remove('in-viewport');
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  },
};

/**
 * Example 3: Keyboard Shortcuts Feature
 * Enables keyboard shortcuts on elements
 *
 * Usage: <button data-shortcut="ctrl+s" _="on shortcut:trigger click me">Save</button>
 */
const KeyboardShortcutsFeature: FeaturePlugin = {
  type: 'feature',
  name: 'keyboard-shortcuts',

  // Global initialization - set up document-level listener
  onGlobalInit: (ctx: InitContext) => {
    const shortcuts = new Map<string, Element[]>();

    // Register global keyboard handler
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = buildShortcutKey(e);
      const elements = shortcuts.get(key);

      if (elements && elements.length > 0) {
        e.preventDefault();
        elements.forEach((el) => {
          el.dispatchEvent(new CustomEvent('shortcut:trigger'));
        });
      }
    });

    // Store shortcuts map for element registration
    (window as any).__hyperfixi_shortcuts = shortcuts;
  },

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    const shortcut = element.getAttribute('data-shortcut');
    if (!shortcut) return;

    const shortcuts = (window as any).__hyperfixi_shortcuts as Map<
      string,
      Element[]
    >;
    if (!shortcuts) return;

    const normalizedKey = normalizeShortcut(shortcut);
    const existing = shortcuts.get(normalizedKey) || [];
    existing.push(element);
    shortcuts.set(normalizedKey, existing);

    return () => {
      const elements = shortcuts.get(normalizedKey);
      if (elements) {
        const index = elements.indexOf(element);
        if (index > -1) {
          elements.splice(index, 1);
        }
        if (elements.length === 0) {
          shortcuts.delete(normalizedKey);
        }
      }
    };
  },
};

function buildShortcutKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

function normalizeShortcut(shortcut: string): string {
  return shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .sort()
    .join('+');
}

/**
 * Example 4: Lazy Load Feature
 * Lazy loads content when element becomes visible
 *
 * Usage: <div data-lazy-src="/api/content">Loading...</div>
 */
const LazyLoadFeature: FeaturePlugin = {
  type: 'feature',
  name: 'lazy-load',

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    const src = element.getAttribute('data-lazy-src');
    if (!src) return;

    let loaded = false;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loaded) {
          loaded = true;
          observer.disconnect();

          element.classList.add('loading');

          try {
            const response = await fetch(src);
            const content = await response.text();
            element.innerHTML = content;
            element.classList.remove('loading');
            element.classList.add('loaded');

            element.dispatchEvent(new CustomEvent('lazy:loaded'));
          } catch (error) {
            element.classList.remove('loading');
            element.classList.add('load-error');
            element.dispatchEvent(
              new CustomEvent('lazy:error', { detail: { error } })
            );
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  },
};

/**
 * Setup with Hybrid Loader for Dynamic Loading
 */
export function setupWithHybridLoader() {
  const loader = new HybridPluginLoader({
    // Core features always loaded
    corePlugins: [AutoSaveFeature],

    // Optional features loaded on demand
    optionalPlugins: new Map([
      ['intersection', async () => IntersectionFeature],
      ['keyboard-shortcuts', async () => KeyboardShortcutsFeature],
      ['lazy-load', async () => LazyLoadFeature],
    ]),

    autoDetect: true,
    lazyLoadDelay: 100,
  });

  loader.initialize();

  return loader;
}

/**
 * Simple setup with all features
 */
export function setupAllFeatures() {
  optimizedRegistry.load(
    AutoSaveFeature,
    IntersectionFeature,
    KeyboardShortcutsFeature,
    LazyLoadFeature
  );

  optimizedRegistry.apply();
}

// Export for testing
export {
  AutoSaveFeature,
  IntersectionFeature,
  KeyboardShortcutsFeature,
  LazyLoadFeature,
};
