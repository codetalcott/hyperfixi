/**
 * Toggle Group Behavior Implementation
 * Manages mutually exclusive toggles (like radio buttons or tabs)
 *
 * Syntax:
 *   install toggle-group-behavior(name: 'tabs') on #tabContainer
 *
 * Example:
 *   <div id="tabs" _="install toggle-group-behavior(name: 'tabs')">
 *     <button data-toggle="tab1" class="active">Tab 1</button>
 *     <button data-toggle="tab2">Tab 2</button>
 *     <button data-toggle="tab3">Tab 3</button>
 *   </div>
 *
 * Features:
 * - Mutually exclusive toggles (only one active at a time)
 * - Custom active class
 * - Keyboard navigation (Arrow keys)
 * - Custom events: toggle:activate, toggle:deactivate, togglegroup:change
 * - Support for data-toggle attribute or custom selector
 */

import type { BehaviorDefinition } from './types';

/**
 * Toggle group behavior options
 */
export interface ToggleGroupBehaviorOptions {
  /** Name of the toggle group (for identification) */
  name?: string;
  /** Selector for toggle items (default: '[data-toggle]') */
  itemSelector?: string;
  /** Class to add to active item */
  activeClass?: string;
  /** Allow deselecting all items */
  allowNone?: boolean;
  /** Enable keyboard navigation with arrow keys */
  keyboardNavigation?: boolean;
  /** Initial active item (data-toggle value or index) */
  initialActive?: string | number;
}

/**
 * Default toggle group behavior options
 */
const defaultOptions: Required<ToggleGroupBehaviorOptions> = {
  name: 'toggle-group',
  itemSelector: '[data-toggle]',
  activeClass: 'active',
  allowNone: false,
  keyboardNavigation: true,
  initialActive: 0
};

/**
 * Toggle group behavior definition for HyperFixi
 *
 * Manages a group of toggle items where only one can be active at a time
 */
export const toggleGroupBehaviorDefinition: BehaviorDefinition = {
  name: 'toggle-group-behavior',
  parameters: ['name', 'itemSelector', 'activeClass', 'allowNone', 'keyboardNavigation', 'initialActive'],

  init(element: HTMLElement, options: ToggleGroupBehaviorOptions = {}) {
    // Merge options with defaults
    const config: Required<ToggleGroupBehaviorOptions> = { ...defaultOptions, ...options };

    // Clean up any existing behavior first
    if ((element as any)._toggleGroupCleanup) {
      (element as any)._toggleGroupCleanup();
    }

    // Track event listeners for cleanup
    const eventListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

    // Get all toggle items
    const getItems = (): HTMLElement[] => {
      return Array.from(element.querySelectorAll(config.itemSelector));
    };

    // Get active item
    const getActive = (): HTMLElement | null => {
      return element.querySelector(`${config.itemSelector}.${config.activeClass}`);
    };

    // Store methods on element for easy access
    const toggleGroupMethods = {
      /**
       * Activate a specific item
       */
      activateItem(item: HTMLElement | string | number) {
        let targetItem: HTMLElement | null = null;

        if (typeof item === 'number') {
          // Activate by index
          const items = getItems();
          targetItem = items[item] || null;
        } else if (typeof item === 'string') {
          // Activate by data-toggle value
          targetItem = element.querySelector(`${config.itemSelector}[data-toggle="${item}"]`);
        } else if (item instanceof HTMLElement) {
          // Activate directly
          targetItem = item;
        }

        if (!targetItem) {
          console.warn('Toggle item not found:', item);
          return;
        }

        const currentActive = getActive();

        // If clicking already active item and allowNone is true, deactivate
        if (currentActive === targetItem && config.allowNone) {
          this.deactivateAll();
          return;
        }

        // Deactivate current active item
        if (currentActive && currentActive !== targetItem) {
          currentActive.classList.remove(config.activeClass);
          currentActive.dispatchEvent(new CustomEvent('toggle:deactivate', {
            detail: { element: currentActive, group: config.name },
            bubbles: true,
            cancelable: false
          }));
        }

        // Activate new item
        if (!targetItem.classList.contains(config.activeClass)) {
          targetItem.classList.add(config.activeClass);
          targetItem.dispatchEvent(new CustomEvent('toggle:activate', {
            detail: { element: targetItem, group: config.name },
            bubbles: true,
            cancelable: false
          }));

          // Dispatch group change event
          element.dispatchEvent(new CustomEvent('togglegroup:change', {
            detail: {
              active: targetItem,
              previous: currentActive,
              group: config.name,
              value: targetItem.getAttribute('data-toggle')
            },
            bubbles: true,
            cancelable: false
          }));
        }
      },

      /**
       * Deactivate all items
       */
      deactivateAll() {
        const currentActive = getActive();
        if (currentActive) {
          currentActive.classList.remove(config.activeClass);
          currentActive.dispatchEvent(new CustomEvent('toggle:deactivate', {
            detail: { element: currentActive, group: config.name },
            bubbles: true,
            cancelable: false
          }));

          element.dispatchEvent(new CustomEvent('togglegroup:change', {
            detail: {
              active: null,
              previous: currentActive,
              group: config.name,
              value: null
            },
            bubbles: true,
            cancelable: false
          }));
        }
      },

      /**
       * Get the currently active item
       */
      getActiveItem(): HTMLElement | null {
        return getActive();
      },

      /**
       * Get the active item's value (data-toggle attribute)
       */
      getActiveValue(): string | null {
        const active = getActive();
        return active ? active.getAttribute('data-toggle') : null;
      },

      /**
       * Navigate to next item
       */
      next() {
        const items = getItems();
        const active = getActive();
        const currentIndex = active ? items.indexOf(active) : -1;
        const nextIndex = (currentIndex + 1) % items.length;
        this.activateItem(nextIndex);
      },

      /**
       * Navigate to previous item
       */
      previous() {
        const items = getItems();
        const active = getActive();
        const currentIndex = active ? items.indexOf(active) : -1;
        const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        this.activateItem(prevIndex);
      }
    };

    // Attach methods to element
    Object.assign(element, toggleGroupMethods);

    // Handle click events on toggle items
    const clickHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      const item = target.closest(config.itemSelector) as HTMLElement;

      if (item && element.contains(item)) {
        event.preventDefault();
        toggleGroupMethods.activateItem(item);
      }
    };
    element.addEventListener('click', clickHandler);
    eventListeners.push({ target: element, type: 'click', handler: clickHandler });

    // Handle keyboard navigation
    if (config.keyboardNavigation) {
      const keydownHandler = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        const target = event.target as HTMLElement;

        // Only handle if focus is on a toggle item
        const item = target.closest(config.itemSelector) as HTMLElement;
        if (!item || !element.contains(item)) return;

        switch (keyEvent.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            keyEvent.preventDefault();
            toggleGroupMethods.next();
            // Focus new active item
            const nextActive = getActive();
            if (nextActive && 'focus' in nextActive) {
              (nextActive as HTMLElement).focus();
            }
            break;

          case 'ArrowLeft':
          case 'ArrowUp':
            keyEvent.preventDefault();
            toggleGroupMethods.previous();
            // Focus new active item
            const prevActive = getActive();
            if (prevActive && 'focus' in prevActive) {
              (prevActive as HTMLElement).focus();
            }
            break;

          case 'Home':
            keyEvent.preventDefault();
            toggleGroupMethods.activateItem(0);
            const firstActive = getActive();
            if (firstActive && 'focus' in firstActive) {
              (firstActive as HTMLElement).focus();
            }
            break;

          case 'End':
            keyEvent.preventDefault();
            const items = getItems();
            toggleGroupMethods.activateItem(items.length - 1);
            const lastActive = getActive();
            if (lastActive && 'focus' in lastActive) {
              (lastActive as HTMLElement).focus();
            }
            break;
        }
      };
      element.addEventListener('keydown', keydownHandler);
      eventListeners.push({ target: element, type: 'keydown', handler: keydownHandler });
    }

    // Set initial active item
    if (config.initialActive !== undefined) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const items = getItems();
        if (items.length > 0) {
          toggleGroupMethods.activateItem(config.initialActive);
        }
      }, 0);
    }

    // Store cleanup function on element
    (element as any)._toggleGroupCleanup = () => {
      eventListeners.forEach(({ target, type, handler }) => {
        target.removeEventListener(type, handler);
      });
      delete (element as any).activateItem;
      delete (element as any).deactivateAll;
      delete (element as any).getActiveItem;
      delete (element as any).getActiveValue;
      delete (element as any).next;
      delete (element as any).previous;
      delete (element as any)._toggleGroupCleanup;
    };
  },

  destroy(element: HTMLElement) {
    // Call cleanup function if it exists
    if ((element as any)._toggleGroupCleanup) {
      (element as any)._toggleGroupCleanup();
    }
  }
};

/**
 * Helper function to create a toggle group behavior instance
 */
export function createToggleGroupBehavior(
  element: HTMLElement,
  options?: ToggleGroupBehaviorOptions
): void {
  toggleGroupBehaviorDefinition.init(element, options);
}

/**
 * Type augmentation for HTMLElement with toggle group methods
 */
declare global {
  interface HTMLElement {
    activateItem(item: HTMLElement | string | number): void;
    deactivateAll(): void;
    getActiveItem(): HTMLElement | null;
    getActiveValue(): string | null;
    next(): void;
    previous(): void;
  }
}

// Export the behavior for registration
export default toggleGroupBehaviorDefinition;
