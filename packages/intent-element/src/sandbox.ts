/**
 * Sandboxed execution wrapper for <lse-intent>.
 *
 * Wraps the hyperfixi runtime call with:
 * - try/catch for execution errors
 * - configurable timeout (default 5s)
 * - structured error reporting
 */

export interface SandboxResult {
  ok: boolean;
  result?: unknown;
  error?: Error;
  timedOut?: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Execute `fn` with a timeout. If it exceeds `timeoutMs`, the promise
 * rejects with an error whose `timedOut` flag is set.
 */
export async function sandboxed(
  fn: () => Promise<unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<SandboxResult> {
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      reject(new Error(`LSE execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timeoutHandle);
    return { ok: true, result };
  } catch (err) {
    clearTimeout(timeoutHandle);
    const error = err instanceof Error ? err : new Error(String(err));
    return { ok: false, error, timedOut };
  }
}
