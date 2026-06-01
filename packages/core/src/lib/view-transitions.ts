/**
 * View Transitions API integration with a small sequencing queue.
 *
 * `document.startViewTransition()` cancels any in-flight transition when
 * called again, which produces visible flicker when multiple swaps land in
 * quick succession. The queue serialises calls so each transition finishes
 * before the next one starts (htmx 4 does the same thing).
 *
 * When the API is unsupported, callbacks run synchronously.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */

export type TransitionCallback = () => void | Promise<void>;

export interface ViewTransitionOptions {
  /**
   * Maps to the View Transitions API "types" (the object form,
   * `startViewTransition({ update, types })`). CSS can then target the
   * transition via `:active-view-transition-type(<name>)`. Where the object
   * form is unsupported, this is a no-op — the call falls back to the
   * callback form and the name carries no runtime effect (consistent with
   * naming individual elements via the CSS `view-transition-name` property).
   */
  transitionName?: string;
}

interface ViewTransitionLike {
  finished: Promise<void>;
}

type StartViewTransitionFn = (cb: () => void | Promise<void>) => ViewTransitionLike;

function getStartViewTransition(): StartViewTransitionFn | undefined {
  if (typeof document === 'undefined') return undefined;
  return (document as unknown as { startViewTransition?: StartViewTransitionFn })
    .startViewTransition;
}

export function isViewTransitionsSupported(): boolean {
  return typeof getStartViewTransition() === 'function';
}

interface QueuedTransition {
  callback: TransitionCallback;
  options?: ViewTransitionOptions;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

const queue: QueuedTransition[] = [];
let processing = false;

async function runOne(
  callback: TransitionCallback,
  options?: ViewTransitionOptions
): Promise<void> {
  const start = getStartViewTransition();
  if (!start) {
    await callback();
    return;
  }
  const update = async () => {
    await callback();
  };
  let transition: ViewTransitionLike;
  if (options?.transitionName) {
    // Prefer the modern object form so the name surfaces as a transition type
    // CSS can target. Browsers with only the callback form throw on the object
    // argument ("update is not a function"); fall back to the callback form.
    try {
      transition = (start as unknown as (o: object) => ViewTransitionLike)({
        update,
        types: [options.transitionName],
      });
    } catch {
      transition = start(update);
    }
  } else {
    transition = start(update);
  }
  // `finished` rejects if either the callback throws or the animation
  // fails. Propagate either — silent swallowing previously hid real DOM
  // update errors from the caller.
  await transition.finished;
}

async function drain(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        await runOne(item.callback, item.options);
        item.resolve();
      } catch (error) {
        item.reject(error);
      }
    }
  } finally {
    processing = false;
  }
}

/**
 * Run a DOM update inside a queued view transition.
 *
 * Falls back to direct execution when the API is unsupported. Multiple calls
 * in flight execute sequentially, so transitions never cancel each other.
 *
 * @param options Optional view-transition options (e.g. `transitionName`).
 */
export function withViewTransition(
  callback: TransitionCallback,
  options?: ViewTransitionOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    queue.push({ callback, options, resolve, reject });
    drain().catch(reject);
  });
}
