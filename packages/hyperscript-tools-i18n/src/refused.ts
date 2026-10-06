/**
 * A translation `@lokascript/semantic` refused because it would lose part of
 * the script (`LossyTranslationError`). A build that keeps the source text for
 * such an attribute (`lenient`) says so, with what the translation would drop;
 * it used to keep the source silently.
 */

export interface RefusalReport {
  /** The hyperscript whose translation was refused. */
  code: string;
  from: string;
  to: string;
  /** What the translation would drop. */
  lost: string[];
  /** What it would have produced: NOT the whole script. */
  partial: string;
}

/** What to do with a refused translation. Default 'warn' (deduped console.warn). */
export type OnRefused = 'warn' | 'error' | ((report: RefusalReport) => void);

/** The report an error carries, when it is semantic's `LossyTranslationError`. */
export function refusalOf(
  error: unknown,
  code: string,
  from: string,
  to: string
): RefusalReport | undefined {
  if (!(error instanceof Error) || error.name !== 'LossyTranslationError') return undefined;
  const e = error as Error & { partial?: unknown; loss?: { lost?: unknown } };
  return {
    code,
    from,
    to,
    lost: Array.isArray(e.loss?.lost) ? e.loss.lost.map(String) : [],
    partial: typeof e.partial === 'string' ? e.partial : '',
  };
}

export function formatRefusalReport(r: RefusalReport): string {
  const code = r.code.length > 80 ? r.code.slice(0, 77) + '...' : r.code;
  return `translation ${r.from} -> ${r.to} refused, it would lose ${r.lost.join(', ')}: _="${code}" (kept as written)`;
}

const warned = new Set<string>();

/** Default warn printer; dedupes by code and target per process. */
export function warnRefusedOnce(r: RefusalReport): void {
  const key = `${r.to}\u0000${r.code}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[hyperscript-i18n] ${formatRefusalReport(r)}`);
}

/** Act on a refusal: warn (default), throw, or hand it to the caller. */
export function dispatchRefusal(report: RefusalReport, onRefused: OnRefused = 'warn'): void {
  if (onRefused === 'error') throw new Error(`[hyperscript-i18n] ${formatRefusalReport(report)}`);
  if (onRefused === 'warn') warnRefusedOnce(report);
  else onRefused(report);
}
