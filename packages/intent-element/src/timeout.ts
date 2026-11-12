/**
 * A bound on how long `<lse-intent>` waits for a script.
 *
 * It is not a sandbox. When the time is up the element stops waiting and
 * reports `EXECUTION_TIMEOUT`; the script is not interrupted (nothing in a page
 * can interrupt one), so what it does later still happens, and a synchronous
 * loop is never timed out at all.
 */

export interface RunResult {
  ok: boolean;
  result?: unknown;
  error?: Error;
  timedOut?: boolean;
}

export const DEFAULT_TIMEOUT_MS = 5000;

/** Run `fn`, waiting at most `timeoutMs` for it to settle. */
export async function withTimeout(
  fn: () => unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<RunResult> {
  let timedOut = false;
  let handle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(() => {
      timedOut = true;
      reject(new Error(`LSE execution still running after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    // `fn` inside the promise chain, so a synchronous throw is a result too.
    const result = await Promise.race([Promise.resolve().then(fn), timeout]);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)), timedOut };
  } finally {
    clearTimeout(handle);
  }
}
