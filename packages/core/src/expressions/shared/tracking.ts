/**
 * Evaluation tracking — an OPT-IN devtools sink (Arc 4c step 2; target
 * design item 7).
 *
 * Every comparison and typed expression used to push a record into
 * `context.evaluationHistory`, an array the command adapter allocated on
 * every command execution and that nothing in production ever read. The
 * record now goes to a tracker a devtool installs, and when none is
 * installed the expressions skip the `Date.now()` pair entirely.
 *
 * Module-level on purpose: the expression evaluators receive a context, not
 * a runtime, and a devtools facility that sees every runtime in the page is
 * the useful shape. `Runtime` exposes the same two calls for plugins.
 */

export interface EvaluationRecord {
  expressionName: string;
  category: string;
  input: unknown;
  output: unknown;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: Error;
}

export interface EvaluationTracker {
  record(entry: EvaluationRecord): void;
}

let tracker: EvaluationTracker | null = null;

/** Install a tracker (or `null` to stop tracking). Returns the previous one. */
export function setEvaluationTracker(next: EvaluationTracker | null): EvaluationTracker | null {
  const previous = tracker;
  tracker = next;
  return previous;
}

export function getEvaluationTracker(): EvaluationTracker | null {
  return tracker;
}

/** Cheap check for the hot path: is anyone listening? */
export function isTrackingEvaluations(): boolean {
  return tracker !== null;
}

/** Collects records into an array — the shape tests and simple devtools want. */
export function collectEvaluations(): EvaluationTracker & { readonly records: EvaluationRecord[] } {
  const records: EvaluationRecord[] = [];
  return {
    records,
    record(entry) {
      records.push(entry);
    },
  };
}
