/**
 * Feature Plugins
 * Demonstrates feature plugin pattern
 */

import type { FeaturePlugin, ElementContext, InitContext } from '../types';

/**
 * Reactive State Feature
 */
export const ReactiveStateFeature: FeaturePlugin = {
  type: 'feature',
  name: 'reactive-state',

  onGlobalInit: (ctx: InitContext) => {
    // Initialize global state management
    const globalState = new Map<string, any>();

    ctx.registerFeature('state', {
      name: 'state',
      init: (elementCtx: ElementContext) => {
        const { element } = elementCtx;
        const stateAttr = element.getAttribute('data-state');
        
        if (stateAttr) {
          try {
            const state = JSON.parse(stateAttr);
            // Create reactive proxy
            const reactiveState = new Proxy(state, {
              set(target, prop, value) {
                target[prop] = value;
                // Trigger updates
                element.dispatchEvent(new CustomEvent('state:change', {
                  detail: { property: prop, value }
                }));
                return true;
              }
            });

            // Attach to element
            (element as any)._hsState = reactiveState;
          } catch (e) {
            console.error('Invalid state JSON:', e);
          }
        }
      }
    });
  },

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    
    // Set up state observation
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          // Re-initialize state
          console.log('State attribute changed');
        }
      }
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['data-state']
    });

    ctx.cleanup(() => observer.disconnect());
  }
};

/**
 * Auto-fetch Feature
 */
export const AutoFetchFeature: FeaturePlugin = {
  type: 'feature',
  name: 'auto-fetch',

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    const fetchUrl = element.getAttribute('data-fetch');
    const fetchInterval = element.getAttribute('data-fetch-interval');

    if (!fetchUrl) return;

    const doFetch = async () => {
      try {
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        element.dispatchEvent(new CustomEvent('fetch:success', {
          detail: data,
          bubbles: true
        }));
      } catch (error) {
        element.dispatchEvent(new CustomEvent('fetch:error', {
          detail: error,
          bubbles: true
        }));
      }
    };

    // Initial fetch
    doFetch();

    // Set up interval if specified
    if (fetchInterval) {
      const interval = setInterval(doFetch, parseInt(fetchInterval));
      ctx.cleanup(() => clearInterval(interval));
    }
  }
};

/**
 * Intersection Observer Feature
 */
export const IntersectionFeature: FeaturePlugin = {
  type: 'feature',
  name: 'intersection',

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    const threshold = element.getAttribute('data-intersect-threshold') || '0';
    const rootMargin = element.getAttribute('data-intersect-margin') || '0px';

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          element.dispatchEvent(new CustomEvent('intersect:enter', {
            detail: entry,
            bubbles: true
          }));
        } else {
          element.dispatchEvent(new CustomEvent('intersect:leave', {
            detail: entry,
            bubbles: true
          }));
        }
      });
    }, {
      threshold: parseFloat(threshold),
      rootMargin
    });

    observer.observe(element);
    ctx.cleanup(() => observer.disconnect());
  }
};
