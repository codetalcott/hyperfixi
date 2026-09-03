/**
 * Host-parser validity gate (review item F8).
 *
 * After the preprocessor rewrites an attribute to English, the plugin asks
 * the HOST _hyperscript runtime — the same parser that will consume the
 * rewrite moments later — whether the result actually parses. On rejection
 * the plugin falls back to the author's original text, so any parse error
 * the author then sees names code they wrote, not invisible generated
 * English. This is the runtime analog of the offline R4 canonical-validity
 * gate, and the F5 arc measured its failure class shipping in practice:
 * until the whole-string-first reorder (#899), 256 corpus rows rendered
 * English the engine rejects, with no warning anywhere.
 *
 * The engine has two failure channels — `parse().errors` collects grammar
 * errors, and the tokenizer THROWS on an unknown character — folded here
 * the same way test/whole-string-first.test.ts folds them.
 *
 * Zero-dependency module: shared by the full, slim, and lite plugin
 * variants, which must not share heavier import chains (the slim/lite
 * bundles exclude the full semantic package by construction).
 */

export interface HyperscriptParseHost {
  parse?: (src: string) => { errors?: unknown[] } | null | undefined;
}

/**
 * True when the host's parser accepts `src`. Also true when the host
 * exposes no `parse()` — with nothing to validate against, the gate
 * degrades to a no-op rather than suppressing translation on unusual
 * builds (same graceful posture as the `addBeforeProcessHook` check).
 */
export function acceptedByHost(hs: HyperscriptParseHost, src: string): boolean {
  if (typeof hs.parse !== 'function') return true;
  try {
    const result = hs.parse(src);
    return !result?.errors || result.errors.length === 0;
  } catch {
    return false;
  }
}

/** Languages already warned about a rejected translation this page load —
 *  same warn-once-per-lang convention as the unchanged-translation warning
 *  (and htmx-adapter's warnMissingLangOnce). */
const warnedRejectedLang = new Set<string>();

/** Reset the warn-once state. Mainly for tests. */
export function resetHostValidationWarnings(): void {
  warnedRejectedLang.clear();
}

export function warnRejectedOnce(lang: string, src: string, english: string): void {
  if (warnedRejectedLang.has(lang)) return;
  warnedRejectedLang.add(lang);
  console.warn(
    `[hyperscript-i18n] Translation for lang="${lang}" rendered hyperscript the host parser ` +
      `rejects — falling back to the original text. ` +
      `Source: "${src.length > 60 ? src.slice(0, 60) + '…' : src}" → ` +
      `"${english.length > 60 ? english.slice(0, 60) + '…' : english}". ` +
      'Further elements in this language stay quiet — enable { debug: true } for per-element detail.'
  );
}
