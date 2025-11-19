/**
 * Temporal Modifiers System for HyperFixi
 * Implements the 'until' temporal modifier from official _hyperscript cookbook
 *
 * Example: toggle @disabled until htmx:afterOnLoad
 *
 * This system:
 * 1. Executes the command immediately
 * 2. Stores the original state
 * 3. Listens for the specified event
 * 4. Reverses the command when event fires
 * 5. Cleans up event listeners
 */

export interface TemporalState {
  id: string;
  command: string;
  element: HTMLElement;
  originalState: any;
  untilEvent: string;
  untilTarget?: HTMLElement | Document | Window | undefined;
  cleanup: () => void;
  timestamp: number;
}

export interface TemporalModifierOptions {
  command: string;
  element: HTMLElement;
  untilEvent: string;
  untilTarget?: HTMLElement | Document | Window | undefined;
  stateCapture: () => any;
  stateRestore: (state: any) => void;
}

export class TemporalModifierManager {
  private static instance: TemporalModifierManager;
  private activeStates: Map<string, TemporalState> = new Map();
  private nextId = 0;

  private constructor() {}

  static getInstance(): TemporalModifierManager {
    if (!TemporalModifierManager.instance) {
      TemporalModifierManager.instance = new TemporalModifierManager();
    }
    return TemporalModifierManager.instance;
  }

  /**
   * Register a temporal state that will be reversed when an event fires
   */
  register(options: TemporalModifierOptions): string {
    const id = `temporal-${this.nextId++}`;

    // Capture the original state before command executed
    const originalState = options.stateCapture();

    // Determine the event target (where to listen for the event)
    const eventTarget = options.untilTarget || options.element;

    // Create event listener that will restore state
    const eventListener = () => {
      // Restore the original state (reverses the command)
      options.stateRestore(originalState);

      // Clean up this temporal state
      this.unregister(id);
    };

    // Add event listener
    eventTarget.addEventListener(options.untilEvent, eventListener, { once: true });

    // Create cleanup function
    const cleanup = () => {
      eventTarget.removeEventListener(options.untilEvent, eventListener);
    };

    // Store temporal state
    const state: TemporalState = {
      id,
      command: options.command,
      element: options.element,
      originalState,
      untilEvent: options.untilEvent,
      untilTarget: eventTarget,
      cleanup,
      timestamp: Date.now(),
    };

    this.activeStates.set(id, state);

    return id;
  }

  /**
   * Unregister and cleanup a temporal state
   */
  unregister(id: string): boolean {
    const state = this.activeStates.get(id);
    if (state) {
      state.cleanup();
      this.activeStates.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get all active temporal states
   */
  getActiveStates(): TemporalState[] {
    return Array.from(this.activeStates.values());
  }

  /**
   * Get active states for a specific element
   */
  getStatesForElement(element: HTMLElement): TemporalState[] {
    return this.getActiveStates().filter(state => state.element === element);
  }

  /**
   * Clear all temporal states (useful for testing)
   */
  clearAll(): void {
    for (const state of this.activeStates.values()) {
      state.cleanup();
    }
    this.activeStates.clear();
  }

  /**
   * Get the number of active temporal states
   */
  get activeCount(): number {
    return this.activeStates.size;
  }
}

/**
 * Helper function to create temporal modifier for toggle command
 */
export function createToggleUntil(
  element: HTMLElement,
  targetType: 'class' | 'attribute',
  targetName: string,
  untilEvent: string,
  untilTarget?: HTMLElement | Document | Window
): string {
  const manager = TemporalModifierManager.getInstance();

  if (targetType === 'class') {
    return manager.register({
      command: `toggle .${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => element.classList.contains(targetName),
      stateRestore: (hadClass: boolean) => {
        if (hadClass) {
          element.classList.add(targetName);
        } else {
          element.classList.remove(targetName);
        }
      },
    });
  } else {
    // attribute
    return manager.register({
      command: `toggle @${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => ({
        hasAttribute: element.hasAttribute(targetName),
        value: element.getAttribute(targetName),
      }),
      stateRestore: (state: { hasAttribute: boolean; value: string | null }) => {
        if (state.hasAttribute) {
          element.setAttribute(targetName, state.value || '');
        } else {
          element.removeAttribute(targetName);
        }
      },
    });
  }
}

/**
 * Helper function to create temporal modifier for add command
 */
export function createAddUntil(
  element: HTMLElement,
  targetType: 'class' | 'attribute',
  targetName: string,
  targetValue: string | undefined,
  untilEvent: string,
  untilTarget?: HTMLElement | Document | Window
): string {
  const manager = TemporalModifierManager.getInstance();

  if (targetType === 'class') {
    return manager.register({
      command: `add .${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => element.classList.contains(targetName),
      stateRestore: (hadClass: boolean) => {
        if (!hadClass) {
          element.classList.remove(targetName);
        }
      },
    });
  } else {
    // attribute
    return manager.register({
      command: `add @${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => ({
        hasAttribute: element.hasAttribute(targetName),
        value: element.getAttribute(targetName),
      }),
      stateRestore: (state: { hasAttribute: boolean; value: string | null }) => {
        if (!state.hasAttribute) {
          element.removeAttribute(targetName);
        } else if (state.value !== element.getAttribute(targetName)) {
          element.setAttribute(targetName, state.value || '');
        }
      },
    });
  }
}

/**
 * Helper function to create temporal modifier for remove command
 */
export function createRemoveUntil(
  element: HTMLElement,
  targetType: 'class' | 'attribute',
  targetName: string,
  untilEvent: string,
  untilTarget?: HTMLElement | Document | Window
): string {
  const manager = TemporalModifierManager.getInstance();

  if (targetType === 'class') {
    return manager.register({
      command: `remove .${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => element.classList.contains(targetName),
      stateRestore: (hadClass: boolean) => {
        if (hadClass) {
          element.classList.add(targetName);
        }
      },
    });
  } else {
    // attribute
    return manager.register({
      command: `remove @${targetName}`,
      element,
      untilEvent,
      untilTarget,
      stateCapture: () => ({
        hasAttribute: element.hasAttribute(targetName),
        value: element.getAttribute(targetName),
      }),
      stateRestore: (state: { hasAttribute: boolean; value: string | null }) => {
        if (state.hasAttribute) {
          element.setAttribute(targetName, state.value || '');
        }
      },
    });
  }
}

// Export singleton instance
export const temporalModifierManager = TemporalModifierManager.getInstance();

// Export for browser global access
if (typeof window !== 'undefined') {
  (window as any).__HYPERFIXI_TEMPORAL__ = temporalModifierManager;
}

export default TemporalModifierManager;
