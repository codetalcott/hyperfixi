/**
 * Modal Behavior Implementation
 * Uses native HTML <dialog> element for accessible modals
 *
 * Syntax:
 *   install modal-behavior on #myDialog
 *   call open() on #myDialog
 *   call close() on #myDialog
 *
 * Example:
 *   <dialog id="myDialog" _="install modal-behavior">
 *     <form method="dialog">
 *       <h2>Modal Title</h2>
 *       <p>Modal content...</p>
 *       <button value="cancel">Cancel</button>
 *       <button value="confirm">Confirm</button>
 *     </form>
 *   </dialog>
 *
 *   <button _="on click call open() on #myDialog">Open Modal</button>
 *
 * Features:
 * - Native <dialog> API for built-in accessibility
 * - Escape key handling (native)
 * - Focus trapping (native)
 * - Backdrop support (::backdrop CSS)
 * - Close on outside click (optional)
 * - Custom events: modal:open, modal:close, modal:cancel
 */

import type { BehaviorDefinition } from './types';

/**
 * Modal behavior options
 */
export interface ModalBehaviorOptions {
  /** Close modal when clicking outside (backdrop) */
  closeOnBackdropClick?: boolean;
  /** Close modal on Escape key (default: true, native behavior) */
  closeOnEscape?: boolean;
  /** Custom class for backdrop styling */
  backdropClass?: string;
  /** Whether to use modal mode (blocking) or non-modal (default: true) */
  modal?: boolean;
}

/**
 * Default modal behavior options
 */
const defaultOptions: Required<ModalBehaviorOptions> = {
  closeOnBackdropClick: true,
  closeOnEscape: true,
  backdropClass: '',
  modal: true,
};

/**
 * Modal behavior definition for HyperFixi
 *
 * Installs open() and close() methods on a <dialog> element
 * Handles events and dispatches custom events
 */
export const modalBehaviorDefinition: BehaviorDefinition = {
  name: 'modal-behavior',
  parameters: ['closeOnBackdropClick', 'closeOnEscape', 'backdropClass', 'modal'],

  init(element: HTMLDialogElement, options: ModalBehaviorOptions = {}) {
    // Merge options with defaults
    const config: Required<ModalBehaviorOptions> = { ...defaultOptions, ...options };

    // Ensure element is a <dialog>
    if (!(element instanceof HTMLDialogElement)) {
      console.error('modal-behavior can only be installed on <dialog> elements');
      return;
    }

    // Clean up any existing behavior first
    if ((element as any)._modalCleanup) {
      (element as any)._modalCleanup();
    }

    // Apply backdrop class if provided
    if (config.backdropClass) {
      element.classList.add(config.backdropClass);
    }

    // Store native methods to avoid name collisions
    const nativeShow = element.show.bind(element);
    const nativeShowModal = element.showModal.bind(element);
    const nativeClose = element.close.bind(element);

    // Track event listeners for cleanup
    const eventListeners: Array<{ type: string; handler: EventListener }> = [];

    // Store methods on element for easy access
    const modalMethods = {
      /**
       * Open the modal
       */
      openModal() {
        if (!element.open) {
          if (config.modal) {
            nativeShowModal();
          } else {
            nativeShow();
          }

          // Dispatch custom event
          element.dispatchEvent(
            new CustomEvent('modal:open', {
              detail: { element },
              bubbles: true,
              cancelable: false,
            })
          );
        }
      },

      /**
       * Close the modal with optional return value
       */
      closeModal(returnValue?: string) {
        if (element.open) {
          nativeClose(returnValue);

          // Dispatch custom event
          element.dispatchEvent(
            new CustomEvent('modal:close', {
              detail: { element, returnValue },
              bubbles: true,
              cancelable: false,
            })
          );
        }
      },

      /**
       * Check if modal is open
       */
      isModalOpen() {
        return element.open;
      },
    };

    // Attach methods to element
    Object.assign(element, modalMethods);

    // Handle backdrop click
    if (config.closeOnBackdropClick) {
      const backdropClickHandler = (event: Event) => {
        const rect = element.getBoundingClientRect();
        const mouseEvent = event as MouseEvent;
        const clickedOutside =
          mouseEvent.clientX < rect.left ||
          mouseEvent.clientX > rect.right ||
          mouseEvent.clientY < rect.top ||
          mouseEvent.clientY > rect.bottom;

        if (clickedOutside) {
          modalMethods.closeModal('backdrop');
        }
      };
      element.addEventListener('click', backdropClickHandler);
      eventListeners.push({ type: 'click', handler: backdropClickHandler });
    }

    // Handle cancel event (Escape key)
    const cancelHandler = (event: Event) => {
      if (!config.closeOnEscape) {
        event.preventDefault();
        return;
      }

      // Dispatch custom cancel event
      element.dispatchEvent(
        new CustomEvent('modal:cancel', {
          detail: { element },
          bubbles: true,
          cancelable: false,
        })
      );
    };
    element.addEventListener('cancel', cancelHandler);
    eventListeners.push({ type: 'cancel', handler: cancelHandler });

    // Handle close event
    const closeHandler = () => {
      // Already handled by close() method
    };
    element.addEventListener('close', closeHandler);
    eventListeners.push({ type: 'close', handler: closeHandler });

    // Store cleanup function on element
    (element as any)._modalCleanup = () => {
      eventListeners.forEach(({ type, handler }) => {
        element.removeEventListener(type, handler);
      });
      delete (element as any).openModal;
      delete (element as any).closeModal;
      delete (element as any).isModalOpen;
      delete (element as any)._modalCleanup;
    };
  },

  destroy(element: HTMLDialogElement) {
    // Close modal if open
    if (element.open) {
      element.close();
    }

    // Call cleanup function if it exists
    if ((element as any)._modalCleanup) {
      (element as any)._modalCleanup();
    }
  },
};

/**
 * Helper function to create a modal behavior instance
 */
export function createModalBehavior(
  element: HTMLDialogElement,
  options?: ModalBehaviorOptions
): void {
  modalBehaviorDefinition.init(element, options);
}

/**
 * Type augmentation for HTMLDialogElement with modal methods
 */
declare global {
  interface HTMLDialogElement {
    openModal(): void;
    closeModal(returnValue?: string): void;
    isModalOpen(): boolean;
  }
}

// Export the behavior for registration
export default modalBehaviorDefinition;
