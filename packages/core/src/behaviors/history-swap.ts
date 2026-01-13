/**
 * HistorySwap Behavior - Automatic popstate handling (htmx 4 pattern)
 *
 * Pre-built behavior for handling browser back/forward navigation.
 * Following htmx 4's simplified approach: re-fetch content on popstate
 * (no localStorage snapshots).
 *
 * Usage in hyperscript:
 *   behavior HistorySwap(target)
 *     on popstate from window
 *       fetch location.href as html
 *       swap innerHTML of target with it
 *     end
 *   end
 *
 * Programmatic usage:
 *   import { registerHistorySwap } from '@hyperfixi/core/behaviors';
 *   registerHistorySwap(runtime);
 *   // Then in hyperscript: install HistorySwap(target: "#main")
 *
 * @example
 *   <!-- Automatic content refresh on back/forward -->
 *   <div id="content" _="install HistorySwap(target: '#content')">
 *     Content here...
 *   </div>
 *
 *   <!-- Or specify which swap strategy to use -->
 *   <div _="install HistorySwap(target: '#app', strategy: 'morph')">
 *     App content...
 *   </div>
 */

import { executeSwap } from '../lib/swap-executor';
import { withViewTransition, isViewTransitionsSupported } from '../lib/view-transitions';
import { isHTMLElement } from '../utils/element-check';
import type { SwapStrategy } from '../commands/dom/swap';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for HistorySwap behavior
 */
export interface HistorySwapConfig {
  /** Target element selector or element to swap content into */
  target: string | HTMLElement;
  /** Swap strategy to use (default: 'morph') */
  strategy?: SwapStrategy;
  /** Whether to use View Transitions API (default: false) */
  useViewTransition?: boolean;
  /** Custom fetch options */
  fetchOptions?: RequestInit;
  /** URL transformer function */
  transformUrl?: (url: string) => string;
  /** Callback before fetch */
  onBeforeFetch?: (url: string) => void | Promise<void>;
  /** Callback after swap */
  onAfterSwap?: (url: string, content: string) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: Error, url: string) => void;
}

/**
 * HistorySwap behavior instance
 */
export interface HistorySwapInstance {
  /** Destroy the behavior and remove event listener */
  destroy: () => void;
  /** Current configuration */
  config: HistorySwapConfig;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a HistorySwap behavior instance
 *
 * This function creates an event listener for the popstate event
 * that re-fetches content and swaps it into the target element.
 *
 * @param config - Behavior configuration
 * @returns Behavior instance with destroy method
 */
export function createHistorySwap(config: HistorySwapConfig): HistorySwapInstance {
  const {
    target,
    strategy = 'morph',
    useViewTransition = false,
    fetchOptions = {},
    transformUrl,
    onBeforeFetch,
    onAfterSwap,
    onError,
  } = config;

  // Resolve target element
  const resolveTarget = (): HTMLElement | null => {
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      return isHTMLElement(element) ? (element as HTMLElement) : null;
    }
    return isHTMLElement(target) ? target : null;
  };

  // Popstate handler
  const handlePopstate = async (event: PopStateEvent) => {
    const targetElement = resolveTarget();
    if (!targetElement) {
      console.warn(`HistorySwap: target "${target}" not found`);
      return;
    }

    let url = window.location.href;

    // Transform URL if configured
    if (transformUrl) {
      url = transformUrl(url);
    }

    try {
      // Before fetch callback
      if (onBeforeFetch) {
        await onBeforeFetch(url);
      }

      // Add loading indicator class
      targetElement.classList.add('hx-swapping');

      // Fetch content
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/html',
          'HX-Request': 'true',
          'HX-History-Restore-Request': 'true',
        },
        ...fetchOptions,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Perform swap (optionally with View Transitions)
      const performSwap = () => {
        executeSwap(targetElement, html, strategy);
      };

      if (useViewTransition && isViewTransitionsSupported()) {
        await withViewTransition(performSwap);
      } else {
        performSwap();
      }

      // Remove loading indicator
      targetElement.classList.remove('hx-swapping');

      // After swap callback
      if (onAfterSwap) {
        await onAfterSwap(url, html);
      }

      // Dispatch event for monitoring
      window.dispatchEvent(
        new CustomEvent('hyperfixi:historyswap', {
          detail: { url, strategy, target },
        })
      );
    } catch (error) {
      targetElement.classList.remove('hx-swapping');

      if (onError) {
        onError(error as Error, url);
      } else {
        console.error('HistorySwap fetch failed:', error);
      }
    }
  };

  // Register event listener
  window.addEventListener('popstate', handlePopstate);

  // Return instance with destroy method
  return {
    destroy: () => {
      window.removeEventListener('popstate', handlePopstate);
    },
    config,
  };
}

// ============================================================================
// Behavior Registration
// ============================================================================

/**
 * Behavior definition for registration with runtime
 */
export const HistorySwapBehavior = {
  name: 'HistorySwap',

  /**
   * Initialize behavior on an element
   *
   * @param element - Element to install behavior on
   * @param params - Behavior parameters
   * @returns Behavior instance
   */
  init(element: HTMLElement, params: Record<string, unknown> = {}): HistorySwapInstance {
    const config: HistorySwapConfig = {
      target: (params.target as string | HTMLElement) || element,
      strategy: (params.strategy as SwapStrategy) || 'morph',
      useViewTransition: Boolean(params.useViewTransition),
    };

    return createHistorySwap(config);
  },

  /**
   * Destroy behavior instance
   *
   * @param instance - Behavior instance to destroy
   */
  destroy(instance: HistorySwapInstance): void {
    instance.destroy();
  },
};

/**
 * Register HistorySwap behavior with a runtime/behavior registry
 *
 * @param registry - Behavior registry (Map or object with set method)
 */
export function registerHistorySwap(registry: Map<string, unknown> | any): void {
  if (registry instanceof Map) {
    registry.set('HistorySwap', HistorySwapBehavior);
  } else if (registry && typeof registry.set === 'function') {
    registry.set('HistorySwap', HistorySwapBehavior);
  } else if (registry && typeof registry === 'object') {
    registry['HistorySwap'] = HistorySwapBehavior;
  }
}

// ============================================================================
// Hyperscript Source (for reference/customization)
// ============================================================================

/**
 * Hyperscript source for HistorySwap behavior
 *
 * This can be used to define the behavior in pure hyperscript
 * instead of using the programmatic version.
 */
export const historySwapHyperscript = `
behavior HistorySwap(target, strategy)
  init
    if no target then set target to me end
    if no strategy then set strategy to 'morph' end
  end

  on popstate from window
    add .hx-swapping to target
    fetch location.href as html
    if strategy is 'morph' then
      swap target with it
    else if strategy is 'innerHTML' then
      swap innerHTML of target with it
    else
      swap target with it
    end
    remove .hx-swapping from target
  end
end
`;
