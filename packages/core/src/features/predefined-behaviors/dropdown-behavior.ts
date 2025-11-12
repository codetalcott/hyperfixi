/**
 * Dropdown Behavior Implementation
 * Uses native HTML <details> and <summary> elements
 *
 * Syntax:
 *   install dropdown-behavior on #myDropdown
 *   call openDropdown() on #myDropdown
 *   call closeDropdown() on #myDropdown
 *   call toggleDropdown() on #myDropdown
 *
 * Example:
 *   <details id="myDropdown" _="install dropdown-behavior">
 *     <summary>Menu</summary>
 *     <ul>
 *       <li><a href="#">Item 1</a></li>
 *       <li><a href="#">Item 2</a></li>
 *       <li><a href="#">Item 3</a></li>
 *     </ul>
 *   </details>
 *
 * Features:
 * - Native <details> API for built-in accessibility
 * - Keyboard navigation (Space/Enter on summary)
 * - Auto-close on outside click (optional)
 * - Custom events: dropdown:open, dropdown:close, dropdown:toggle
 * - Animation support via CSS
 */

import type { BehaviorDefinition } from './types';

/**
 * Dropdown behavior options
 */
export interface DropdownBehaviorOptions {
  /** Close dropdown when clicking outside */
  closeOnClickOutside?: boolean;
  /** Close dropdown when clicking inside content */
  closeOnClickInside?: boolean;
  /** Close dropdown on Escape key */
  closeOnEscape?: boolean;
  /** Custom class for open state */
  openClass?: string;
  /** Animation duration in ms (for waiting before cleanup) */
  animationDuration?: number;
}

/**
 * Default dropdown behavior options
 */
const defaultOptions: Required<DropdownBehaviorOptions> = {
  closeOnClickOutside: true,
  closeOnClickInside: false,
  closeOnEscape: true,
  openClass: '',
  animationDuration: 0
};

/**
 * Dropdown behavior definition for HyperFixi
 *
 * Installs open/close/toggle methods on a <details> element
 * Handles events and dispatches custom events
 */
export const dropdownBehaviorDefinition: BehaviorDefinition = {
  name: 'dropdown-behavior',
  parameters: ['closeOnClickOutside', 'closeOnClickInside', 'closeOnEscape', 'openClass', 'animationDuration'],

  init(element: HTMLDetailsElement, options: DropdownBehaviorOptions = {}) {
    // Merge options with defaults
    const config: Required<DropdownBehaviorOptions> = { ...defaultOptions, ...options };

    // Ensure element is a <details>
    if (element.tagName !== 'DETAILS') {
      console.error('dropdown-behavior can only be installed on <details> elements');
      return;
    }

    // Clean up any existing behavior first
    if ((element as any)._dropdownCleanup) {
      (element as any)._dropdownCleanup();
    }

    // Track event listeners for cleanup
    const eventListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

    // Store methods on element for easy access
    const dropdownMethods = {
      /**
       * Open the dropdown
       */
      openDropdown() {
        if (!element.open) {
          element.open = true;

          // Apply open class if provided
          if (config.openClass) {
            element.classList.add(config.openClass);
          }

          // Dispatch custom event
          element.dispatchEvent(new CustomEvent('dropdown:open', {
            detail: { element },
            bubbles: true,
            cancelable: false
          }));
        }
      },

      /**
       * Close the dropdown
       */
      closeDropdown() {
        if (element.open) {
          // Remove open class if provided
          if (config.openClass) {
            element.classList.remove(config.openClass);
          }

          // Wait for animation if specified
          if (config.animationDuration > 0) {
            setTimeout(() => {
              element.open = false;
            }, config.animationDuration);
          } else {
            element.open = false;
          }

          // Dispatch custom event
          element.dispatchEvent(new CustomEvent('dropdown:close', {
            detail: { element },
            bubbles: true,
            cancelable: false
          }));
        }
      },

      /**
       * Toggle the dropdown
       */
      toggleDropdown() {
        if (element.open) {
          dropdownMethods.closeDropdown();
        } else {
          dropdownMethods.openDropdown();
        }

        // Dispatch custom event
        element.dispatchEvent(new CustomEvent('dropdown:toggle', {
          detail: { element, open: element.open },
          bubbles: true,
          cancelable: false
        }));
      },

      /**
       * Check if dropdown is open
       */
      isDropdownOpen() {
        return element.open;
      }
    };

    // Attach methods to element
    Object.assign(element, dropdownMethods);

    // Handle native toggle event
    const toggleHandler = () => {
      if (element.open) {
        if (config.openClass) {
          element.classList.add(config.openClass);
        }
        element.dispatchEvent(new CustomEvent('dropdown:open', {
          detail: { element },
          bubbles: true,
          cancelable: false
        }));
      } else {
        if (config.openClass) {
          element.classList.remove(config.openClass);
        }
        element.dispatchEvent(new CustomEvent('dropdown:close', {
          detail: { element },
          bubbles: true,
          cancelable: false
        }));
      }
    };
    element.addEventListener('toggle', toggleHandler);
    eventListeners.push({ target: element, type: 'toggle', handler: toggleHandler });

    // Handle click outside
    if (config.closeOnClickOutside) {
      const outsideClickHandler = (event: Event) => {
        if (element.open && !element.contains(event.target as Node)) {
          dropdownMethods.closeDropdown();
        }
      };
      // Use document for outside click detection
      document.addEventListener('click', outsideClickHandler);
      eventListeners.push({ target: document, type: 'click', handler: outsideClickHandler });
    }

    // Handle click inside
    if (config.closeOnClickInside) {
      const insideClickHandler = (event: Event) => {
        // Don't close if clicking on summary
        const summary = element.querySelector('summary');
        if (event.target !== summary && !summary?.contains(event.target as Node)) {
          dropdownMethods.closeDropdown();
        }
      };
      element.addEventListener('click', insideClickHandler);
      eventListeners.push({ target: element, type: 'click', handler: insideClickHandler });
    }

    // Handle Escape key
    if (config.closeOnEscape) {
      const escapeHandler = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === 'Escape' && element.open) {
          event.preventDefault();
          dropdownMethods.closeDropdown();
        }
      };
      document.addEventListener('keydown', escapeHandler);
      eventListeners.push({ target: document, type: 'keydown', handler: escapeHandler });
    }

    // Store cleanup function on element
    (element as any)._dropdownCleanup = () => {
      eventListeners.forEach(({ target, type, handler }) => {
        target.removeEventListener(type, handler);
      });
      delete (element as any).openDropdown;
      delete (element as any).closeDropdown;
      delete (element as any).toggleDropdown;
      delete (element as any).isDropdownOpen;
      delete (element as any)._dropdownCleanup;
    };
  },

  destroy(element: HTMLDetailsElement) {
    // Close dropdown if open
    if (element.open) {
      element.open = false;
    }

    // Call cleanup function if it exists
    if ((element as any)._dropdownCleanup) {
      (element as any)._dropdownCleanup();
    }
  }
};

/**
 * Helper function to create a dropdown behavior instance
 */
export function createDropdownBehavior(
  element: HTMLDetailsElement,
  options?: DropdownBehaviorOptions
): void {
  dropdownBehaviorDefinition.init(element, options);
}

/**
 * Type augmentation for HTMLDetailsElement with dropdown methods
 */
declare global {
  interface HTMLDetailsElement {
    openDropdown(): void;
    closeDropdown(): void;
    toggleDropdown(): void;
    isDropdownOpen(): boolean;
  }
}

// Export the behavior for registration
export default dropdownBehaviorDefinition;
