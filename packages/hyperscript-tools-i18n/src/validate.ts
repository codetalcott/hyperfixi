/**
 * Canonical parse-check.
 *
 * Loads the REAL `hyperscript.org` engine headlessly (parse-only needs no DOM)
 * and exposes a validate function that NEVER throws. The engine has two failure
 * channels: `parse().errors` COLLECTS grammar errors, but the tokenizer THROWS
 * on an unknown character (e.g. a leaked non-ASCII surface → `Unknown token: เ`)
 * and the `js` command's `new Function` throws on invalid JavaScript. Both
 * throws are folded into the returned array so callers have one contract —
 * check `.length === 0`, never wrap in try/catch expecting invalidity to throw.
 *
 * Self-contained on purpose: node builtins + `hyperscript.org` only, no
 * `@lokascript/*` or `@hyperfixi/*` imports, so the package stays extraction-ready.
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/** Parse `src` on the canonical engine; returns error messages (empty = valid). Never throws. */
export type CanonicalValidate = (src: string) => string[];

export interface ParseCheckReport {
  /** 'input' = English source before translating; 'output' = English produced from a foreign source. */
  stage: 'input' | 'output';
  /** The invalid English hyperscript. */
  code: string;
  /** Canonical parser error messages (first line each). */
  errors: string[];
  /** Source locale of the translate call ('en' for stage 'input'). */
  from: string;
  /** Target locale ('en' for stage 'output'; '*' for an aggregated input check). */
  to: string;
}

interface HyperscriptApi {
  version?: string;
  parse: (src: string) => { errors?: Array<{ message: string }> } | undefined;
}

let cached: Promise<CanonicalValidate> | undefined;

/**
 * Load (once, module-cached) the canonical validator. Resolve `hyperscript.org`,
 * then import the sibling prebuilt `_hyperscript.esm.js` by file URL. Rejects if
 * the package cannot be loaded or does not expose `parse()`.
 */
export function loadValidator(): Promise<CanonicalValidate> {
  if (!cached) {
    cached = (async () => {
      const require = createRequire(import.meta.url);
      // Package root resolves to the IIFE build; the unexported ESM build sits beside it.
      const iife = require.resolve('hyperscript.org');
      const esm = path.join(path.dirname(iife), '_hyperscript.esm.js');
      const mod = (await import(pathToFileURL(esm).href)) as {
        default?: HyperscriptApi;
      } & HyperscriptApi;
      const hs = mod.default ?? mod;
      if (typeof hs?.parse !== 'function') {
        throw new Error(
          'Loaded hyperscript.org but it did not expose parse(); the package layout may have changed.'
        );
      }
      return (src: string): string[] => {
        try {
          return (hs.parse(src)?.errors ?? []).map(e => e.message.split('\n')[0]);
        } catch (e) {
          return ['threw: ' + (e as Error).message.split('\n')[0]];
        }
      };
    })();
  }
  return cached;
}

/** Convenience: load (cached) and validate in one call. */
export async function validateHyperscript(src: string): Promise<string[]> {
  return (await loadValidator())(src);
}

/** Multi-line human-readable rendering of a report (head line + one `  - <error>` line each). */
export function formatParseCheckReport(r: ParseCheckReport): string {
  const code = r.code.length > 80 ? r.code.slice(0, 77) + '...' : r.code;
  const where = r.stage === 'input' ? `English input -> ${r.to}` : `English output <- ${r.from}`;
  return [`invalid hyperscript (${where}): _="${code}"`, ...r.errors.map(e => `  - ${e}`)].join(
    '\n'
  );
}

const warned = new Set<string>();

/** Default warn printer; dedupes by `r.code` per process. Returns true if it printed. */
export function warnInvalidOnce(r: ParseCheckReport): boolean {
  if (warned.has(r.code)) return false;
  warned.add(r.code);
  console.warn(`[hyperscript-i18n] ${formatParseCheckReport(r)}`);
  return true;
}

/** @internal test hook — clears the per-process warn-dedupe set. */
export function __resetParseCheckWarnings(): void {
  warned.clear();
}
