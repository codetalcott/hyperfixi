/**
 * Event Waiting Helpers
 *
 * Provides shared utilities for promise-based event waiting with cleanup.
 * Consolidates patterns from transition, settle, and wait commands.
 *
 * Patterns consolidated:
 * - waitForTransition (transition.ts)
 * - waitForSettle (settle.ts)
 * - waitForEvent (wait.ts)
 *
 * Estimated savings: ~100 lines across animation/async commands
 */

// ============================================================================
// Result Types
// ============================================================================

export interface EventWaitResult<T = Event> {
  event: T | null;
  timedOut: boolean;
  cancelled: boolean;
}

export interface TransitionWaitResult {
  completed: boolean;
  cancelled: boolean;
}

export interface AnimationWaitResult {
  completed: boolean;
  type: 'transition' | 'animation' | 'timeout';
}

// ============================================================================
// Basic Event Waiting
// ============================================================================

/**
 * Wait for a single event with optional timeout
 *
 * @param target - Event target to listen on
 * @param eventName - Event name to wait for
 * @param timeout - Optional timeout in milliseconds
 * @returns Promise resolving with event or timeout result
 */
export function waitForEvent<T extends Event = Event>(
  target: EventTarget,
  eventName: string,
  timeout?: number
): Promise<EventWaitResult<T>> {
  if (!target) {
    return Promise.reject(new Error('waitForEvent: no target provided'));
  }

  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      target.removeEventListener(eventName, handler);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const finish = createGuardedFinisher<EventWaitResult<T>>(cleanup, resolve);

    const handler = (event: Event) => {
      finish({ event: event as T, timedOut: false, cancelled: false });
    };

    target.addEventListener(eventName, handler);

    if (timeout !== undefined && timeout > 0) {
      timeoutId = setTimeout(() => {
        finish({ event: null, timedOut: true, cancelled: false });
      }, timeout);
    }
  });
}

/**
 * Wait for a simple timeout (Promise wrapper for setTimeout)
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function waitForTime(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CSS Transition Waiting
// ============================================================================

/**
 * Wait for a CSS transition to complete on a specific property
 *
 * Listens for both transitionend and transitioncancel events.
 * Falls back to timeout if transition doesn't fire.
 *
 * @param element - Element with the transition
 * @param property - CSS property being transitioned (kebab-case)
 * @param duration - Expected transition duration in ms
 * @returns Promise resolving with completion status
 */
export function waitForTransitionEnd(
  element: HTMLElement,
  property: string,
  duration: number
): Promise<TransitionWaitResult> {
  return new Promise((resolve) => {
    const onEnd = (e: TransitionEvent) => {
      if (e.target === element && e.propertyName === property) {
        finish({ completed: true, cancelled: false });
      }
    };

    const onCancel = (e: TransitionEvent) => {
      if (e.target === element && e.propertyName === property) {
        finish({ completed: false, cancelled: true });
      }
    };

    const cleanup = () => {
      element.removeEventListener('transitionend', onEnd);
      element.removeEventListener('transitioncancel', onCancel);
      clearTimeout(timeoutId);
    };

    const finish = createGuardedFinisher<TransitionWaitResult>(cleanup, resolve);

    element.addEventListener('transitionend', onEnd);
    element.addEventListener('transitioncancel', onCancel);

    // Safety timeout in case transition event doesn't fire
    const timeoutId = setTimeout(() => {
      finish({ completed: true, cancelled: false });
    }, duration + 50);
  });
}

// ============================================================================
// Animation Complete Waiting
// ============================================================================

/**
 * Wait for animations and transitions to complete on an element
 *
 * Used by the settle command to wait for all CSS animations/transitions.
 * Computes the expected animation time from computed styles.
 *
 * @param element - Element with animations
 * @param computedAnimationTime - Total expected animation time in ms
 * @param userTimeout - User-specified maximum wait time in ms
 * @returns Promise resolving with completion status
 */
export function waitForAnimationComplete(
  element: HTMLElement,
  computedAnimationTime: number,
  userTimeout: number
): Promise<AnimationWaitResult> {
  // If no animations, resolve immediately
  if (computedAnimationTime <= 0) {
    return Promise.resolve({ completed: true, type: 'timeout' as const });
  }

  return new Promise((resolve) => {
    const onTransitionEnd = (event: Event) => {
      if (event.target === element) {
        finish({ completed: true, type: 'transition' });
      }
    };

    const onAnimationEnd = (event: Event) => {
      if (event.target === element) {
        finish({ completed: true, type: 'animation' });
      }
    };

    const cleanup = () => {
      element.removeEventListener('transitionend', onTransitionEnd);
      element.removeEventListener('animationend', onAnimationEnd);
      clearTimeout(animationTimeoutId);
      clearTimeout(userTimeoutId);
    };

    const finish = createGuardedFinisher<AnimationWaitResult>(cleanup, resolve);

    element.addEventListener('transitionend', onTransitionEnd);
    element.addEventListener('animationend', onAnimationEnd);

    // Animation completion timeout (computed from styles)
    const animationTimeoutId = setTimeout(() => {
      finish({ completed: true, type: 'timeout' });
    }, computedAnimationTime + 50);

    // User-specified maximum timeout
    const userTimeoutId = setTimeout(() => {
      finish({ completed: false, type: 'timeout' });
    }, userTimeout);
  });
}

// ============================================================================
// Race Condition Waiting
// ============================================================================

/**
 * Wait condition for racing
 */
export type WaitCondition =
  | { type: 'time'; ms: number }
  | { type: 'event'; target: EventTarget; eventName: string };

/**
 * Result of a race between conditions
 */
export interface RaceResult {
  winner: WaitCondition;
  result: number | Event;
}

/**
 * Race multiple wait conditions
 *
 * Returns when the first condition completes.
 *
 * @param conditions - Array of conditions to race
 * @returns Promise with the winning condition and its result
 */
export function waitForFirst(conditions: WaitCondition[]): Promise<RaceResult> {
  if (conditions.length === 0) {
    return Promise.reject(new Error('waitForFirst: no conditions provided'));
  }

  const promises = conditions.map((condition) => {
    if (condition.type === 'time') {
      return waitForTime(condition.ms).then(() => ({
        winner: condition,
        result: condition.ms as number | Event,
      }));
    }

    return waitForEvent(condition.target, condition.eventName).then((res) => ({
      winner: condition,
      result: res.event as Event,
    }));
  });

  return Promise.race(promises);
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Create a guarded finisher function that ensures a promise resolves only once
 *
 * Wraps the common pattern of:
 * - Maintaining a completion flag
 * - Running cleanup when finished
 * - Resolving the promise with the result
 *
 * @param cleanup - Function to call before resolving
 * @param resolve - Promise resolve function
 * @returns Finisher function that safely resolves the promise once
 */
export function createGuardedFinisher<T>(
  cleanup: () => void,
  resolve: (value: T) => void
): (result: T) => void {
  let completed = false;
  return (result: T) => {
    if (!completed) {
      completed = true;
      cleanup();
      resolve(result);
    }
  };
}

/**
 * Create a guarded callback that only executes once
 *
 * Useful for preventing multiple event handler invocations.
 *
 * @param callback - Function to execute once
 * @returns Guarded callback function
 */
export function createOnceGuard<T extends (...args: any[]) => void>(
  callback: T
): (...args: Parameters<T>) => void {
  let called = false;
  return (...args: Parameters<T>) => {
    if (!called) {
      called = true;
      callback(...args);
    }
  };
}

/**
 * Create a cleanup manager for multiple cleanup functions
 *
 * @returns Object with add() to register cleanups and cleanup() to run all
 */
export function createCleanupManager(): {
  add: (fn: () => void) => void;
  cleanup: () => void;
} {
  const cleanups: (() => void)[] = [];

  return {
    add: (fn: () => void) => cleanups.push(fn),
    cleanup: () => {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          // Ignore cleanup errors
        }
      }
      cleanups.length = 0;
    },
  };
}
