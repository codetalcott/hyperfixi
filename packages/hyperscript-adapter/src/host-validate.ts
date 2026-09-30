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

/** The part of a host parse result the gate reads: grammar errors, and each handler's events. */
export interface HostParseResult {
  errors?: unknown[];
  features?: Array<{ events?: Array<{ on?: unknown }> }>;
}

export interface HyperscriptParseHost {
  parse?: (src: string) => HostParseResult | null | undefined;
}

/**
 * Names that are references, never events. A translation that reads one as a
 * handler's event parses cleanly and does nothing: the README's Japanese
 * example `on click .active を me で 切り替え` became `on click on me toggle
 * .active`, which the engine reads as an empty click handler plus a handler for
 * an event named `me`, and the button stayed dead. The host accepts that, so
 * the gate asks for it by name.
 */
const REFERENCE_NAMES = new Set(['me', 'my', 'i', 'it', 'its', 'you', 'your']);

/** The reference a parse result listens for as an event, if any. */
export function referenceReadAsEvent(
  result: HostParseResult | null | undefined
): string | undefined {
  for (const feature of result?.features ?? []) {
    for (const event of feature.events ?? []) {
      if (typeof event.on === 'string' && REFERENCE_NAMES.has(event.on.toLowerCase()))
        return event.on;
    }
  }
  return undefined;
}

/**
 * True when the host's parser accepts `src` and reads no reference as a
 * handler's event (see REFERENCE_NAMES). Also true when the host exposes no
 * `parse()` — with nothing to validate against, the gate degrades to a no-op
 * rather than suppressing translation on unusual builds (same graceful
 * posture as the `addBeforeProcessHook` check).
 */
export function acceptedByHost(hs: HyperscriptParseHost, src: string): boolean {
  if (typeof hs.parse !== 'function') return true;
  try {
    const result = hs.parse(src);
    if (result?.errors && result.errors.length > 0) return false;
    return referenceReadAsEvent(result) === undefined;
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
      `rejects (or reads as a handler for an event named like me/it/you) — falling back to the ` +
      `original text. ` +
      `Source: "${src.length > 60 ? src.slice(0, 60) + '…' : src}" → ` +
      `"${english.length > 60 ? english.slice(0, 60) + '…' : english}". ` +
      'Further elements in this language stay quiet — enable { debug: true } for per-element detail.'
  );
}
