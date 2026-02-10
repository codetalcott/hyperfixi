/**
 * Boosted Behavior - Automatic AJAX links/forms (htmx boost pattern)
 *
 * Pre-built behavior for converting regular links and forms to AJAX requests.
 * Similar to htmx's hx-boost feature but using hyperscript patterns.
 *
 * Features:
 * - Intercepts link clicks and form submissions
 * - Fetches content via AJAX
 * - Swaps content into target (default: body or specified target)
 * - Pushes URL to history
 * - Handles external links normally
 * - Respects meta/ctrl/shift clicks for new tabs
 *
 * Usage in hyperscript:
 *   behavior Boosted(target, selector)
 *     on click from <a/> in me
 *       halt the event
 *       fetch the @href of the target as html
 *       swap target with it
 *       push url the @href of the target
 *     end
 *   end
 *
 * Programmatic usage:
 *   import { createBoosted } from '@hyperfixi/core/behaviors';
 *   const boost = createBoosted({
 *     target: '#main',
 *     selector: 'a:not([target])',
 *   });
 *
 * @example
 *   <!-- Boost all links in a container -->
 *   <nav _="install Boosted(target: '#content')">
 *     <a href="/page1">Page 1</a>
 *     <a href="/page2">Page 2</a>
 *   </nav>
 *
 *   <!-- Boost forms too -->
 *   <div _="install Boosted(target: '#results', boostForms: true)">
 *     <form action="/search" method="GET">
 *       <input name="q" />
 *       <button>Search</button>
 *     </form>
 *   </div>
 */

import { executeSwap } from '../lib/swap-executor';
import { withViewTransition, isViewTransitionsSupported } from '../lib/view-transitions';
import { isExternalUrl } from '../commands/helpers/url-validation';
import { isHTMLElement } from '../utils/element-check';
import type { SwapStrategy } from '../commands/dom/swap';
import { dispatchLokaScriptEvent } from '../commands/helpers/event-helpers';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for Boosted behavior
 */
export interface BoostedConfig {
  /** Container element to attach listener to */
  container: HTMLElement;
  /** Target element selector or element to swap content into */
  target?: string | HTMLElement;
  /** CSS selector for links to boost (default: 'a[href]') */
  linkSelector?: string;
  /** CSS selector for forms to boost (default: none) */
  formSelector?: string;
  /** Whether to boost forms (default: false) */
  boostForms?: boolean;
  /** Swap strategy to use (default: 'morph') */
  strategy?: SwapStrategy;
  /** Whether to push URL to history (default: true) */
  pushUrl?: boolean;
  /** Whether to use View Transitions API (default: false) */
  useViewTransition?: boolean;
  /** Custom fetch options */
  fetchOptions?: RequestInit;
  /** Callback before fetch */
  onBeforeFetch?: (url: string, method: string) => void | boolean | Promise<void | boolean>;
  /** Callback after swap */
  onAfterSwap?: (url: string, content: string) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: Error, url: string) => void;
}

/**
 * Boosted behavior instance
 */
export interface BoostedInstance {
  /** Destroy the behavior and remove event listeners */
  destroy: () => void;
  /** Current configuration */
  config: BoostedConfig;
  /** Manually boost a URL */
  boost: (url: string, method?: string, body?: FormData | null) => Promise<void>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if link should be boosted (not external, no target, no download, etc.)
 */
function shouldBoostLink(link: HTMLAnchorElement): boolean {
  // Skip external links
  if (isExternalUrl(link.href)) {
    return false;
  }

  // Skip links with target attribute
  if (link.target && link.target !== '_self') {
    return false;
  }

  // Skip download links
  if (link.hasAttribute('download')) {
    return false;
  }

  // Skip links with data-no-boost attribute
  if (link.hasAttribute('data-no-boost') || link.hasAttribute('hx-boost-off')) {
    return false;
  }

  // Skip javascript: and mailto: links
  if (link.protocol === 'javascript:' || link.protocol === 'mailto:') {
    return false;
  }

  return true;
}

/**
 * Check if click should be handled (not modified key, not right click)
 */
function shouldHandleClick(event: MouseEvent): boolean {
  // Skip if modifier keys are pressed (user wants new tab/window)
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  // Skip right clicks
  if (event.button !== 0) {
    return false;
  }

  return true;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a Boosted behavior instance
 *
 * This function creates event listeners for clicks and form submissions
 * that intercept navigation and perform AJAX requests instead.
 *
 * @param config - Behavior configuration
 * @returns Behavior instance with destroy method
 */
export function createBoosted(config: BoostedConfig): BoostedInstance {
  const {
    container,
    target,
    linkSelector = 'a[href]',
    formSelector = 'form',
    boostForms = false,
    strategy = 'morph',
    pushUrl = true,
    useViewTransition = false,
    fetchOptions = {},
    onBeforeFetch,
    onAfterSwap,
    onError,
  } = config;

  // Resolve target element
  const resolveTarget = (): HTMLElement | null => {
    if (!target) {
      return document.body;
    }
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      return isHTMLElement(element) ? (element as HTMLElement) : null;
    }
    return isHTMLElement(target) ? target : null;
  };

  // Boost function for programmatic use
  const boost = async (
    url: string,
    method: string = 'GET',
    body: FormData | null = null
  ): Promise<void> => {
    const targetElement = resolveTarget();
    if (!targetElement) {
      console.warn(`Boosted: target "${target}" not found`);
      return;
    }

    try {
      // Before fetch callback
      if (onBeforeFetch) {
        const result = await onBeforeFetch(url, method);
        if (result === false) {
          return; // Cancelled
        }
      }

      // Add loading indicator class
      targetElement.classList.add('hx-swapping');
      container.classList.add('hx-boosting');

      // Fetch content
      const requestInit: RequestInit = {
        method,
        headers: {
          Accept: 'text/html',
          'HX-Request': 'true',
          'HX-Boosted': 'true',
        },
        ...fetchOptions,
      };

      if (body && method !== 'GET') {
        requestInit.body = body;
      }

      const response = await fetch(url, requestInit);

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

      // Remove loading indicators
      targetElement.classList.remove('hx-swapping');
      container.classList.remove('hx-boosting');

      // Push URL to history
      if (pushUrl && method === 'GET') {
        window.history.pushState(null, '', url);
      }

      // After swap callback
      if (onAfterSwap) {
        await onAfterSwap(url, html);
      }

      // Dispatch lifecycle event with backward compatibility (lokascript: + hyperfixi:)
      dispatchLokaScriptEvent(window, 'boosted', { url, method, strategy, target });
    } catch (error) {
      targetElement.classList.remove('hx-swapping');
      container.classList.remove('hx-boosting');

      if (onError) {
        onError(error as Error, url);
      } else {
        console.error('Boosted fetch failed:', error);
        // Fall back to normal navigation on error
        window.location.href = url;
      }
    }
  };

  // Click handler for links
  const handleClick = async (event: MouseEvent) => {
    // Check if it's a boosted link
    const link = (event.target as Element).closest(linkSelector) as HTMLAnchorElement | null;
    if (!link) {
      return;
    }

    // Check if click should be handled
    if (!shouldHandleClick(event)) {
      return;
    }

    // Check if link should be boosted
    if (!shouldBoostLink(link)) {
      return;
    }

    // Prevent default navigation
    event.preventDefault();
    event.stopPropagation();

    // Perform boosted fetch
    await boost(link.href);
  };

  // Submit handler for forms
  const handleSubmit = async (event: SubmitEvent) => {
    if (!boostForms) {
      return;
    }

    const form = (event.target as Element).closest(formSelector) as HTMLFormElement | null;
    if (!form) {
      return;
    }

    // Skip forms with data-no-boost attribute
    if (form.hasAttribute('data-no-boost') || form.hasAttribute('hx-boost-off')) {
      return;
    }

    // Skip forms with target attribute
    if (form.target && form.target !== '_self') {
      return;
    }

    // Prevent default form submission
    event.preventDefault();
    event.stopPropagation();

    // Build URL for GET or body for POST
    const method = (form.method || 'GET').toUpperCase();
    const formData = new FormData(form);

    let url: string;
    let body: FormData | null = null;

    if (method === 'GET') {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, String(value));
      });
      url = `${form.action || window.location.pathname}?${params.toString()}`;
    } else {
      url = form.action || window.location.pathname;
      body = formData;
    }

    // Perform boosted fetch
    await boost(url, method, body);
  };

  // Register event listeners
  container.addEventListener('click', handleClick);
  if (boostForms) {
    container.addEventListener('submit', handleSubmit);
  }

  // Return instance
  return {
    destroy: () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('submit', handleSubmit);
    },
    config,
    boost,
  };
}

// ============================================================================
// Behavior Registration
// ============================================================================

/**
 * Behavior definition for registration with runtime
 */
export const BoostedBehavior = {
  name: 'Boosted',

  /**
   * Initialize behavior on an element
   *
   * @param element - Element to install behavior on (container)
   * @param params - Behavior parameters
   * @returns Behavior instance
   */
  init(element: HTMLElement, params: Record<string, unknown> = {}): BoostedInstance {
    const config: BoostedConfig = {
      container: element,
      target: params.target as string | HTMLElement | undefined,
      linkSelector: (params.linkSelector as string) || 'a[href]',
      formSelector: (params.formSelector as string) || 'form',
      boostForms: Boolean(params.boostForms),
      strategy: (params.strategy as SwapStrategy) || 'morph',
      pushUrl: params.pushUrl !== false,
      useViewTransition: Boolean(params.useViewTransition),
    };

    return createBoosted(config);
  },

  /**
   * Destroy behavior instance
   *
   * @param instance - Behavior instance to destroy
   */
  destroy(instance: BoostedInstance): void {
    instance.destroy();
  },
};

/**
 * Register Boosted behavior with a runtime/behavior registry
 *
 * @param registry - Behavior registry (Map or object with set method)
 */
export function registerBoosted(registry: Map<string, unknown> | any): void {
  if (registry instanceof Map) {
    registry.set('Boosted', BoostedBehavior);
  } else if (registry && typeof registry.set === 'function') {
    registry.set('Boosted', BoostedBehavior);
  } else if (registry && typeof registry === 'object') {
    registry['Boosted'] = BoostedBehavior;
  }
}

// ============================================================================
// Hyperscript Source (for reference/customization)
// ============================================================================

/**
 * Hyperscript source for Boosted behavior
 *
 * This can be used to define the behavior in pure hyperscript
 * instead of using the programmatic version.
 */
export const boostedHyperscript = `
behavior Boosted(target, pushHistory)
  init
    if no target then set target to document.body end
    if no pushHistory then set pushHistory to true end
  end

  on click from <a[href]/> in me
    -- Skip if modifier keys pressed
    if event.metaKey or event.ctrlKey or event.shiftKey or event.altKey then exit end

    -- Skip external links
    set href to the @href of the target
    if href starts with 'http' and not (href starts with location.origin) then exit end

    -- Skip links with target attribute
    if the target has @target then exit end

    halt the event
    add .hx-swapping to target
    fetch href as html
    swap target with it
    remove .hx-swapping from target
    if pushHistory then push url href end
  end
end
`;
