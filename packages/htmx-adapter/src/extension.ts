/**
 * htmx extension + auto-sweep wiring.
 *
 * Primary target is **htmx v4**, whose extensions register via
 * `htmx.registerExtension(name, ext)` and hook lifecycle events through
 * underscore-named methods (event name with `:` → `_`), each receiving
 * `(elt, detail)`. Verified against htmx 4.0.0-beta5 (see
 * test/browser/vendor/README.md): `process(root)` fires
 * `htmx:before:process` on the processed root — `document.body`
 * initially, each swapped-in subtree afterwards — BEFORE any element
 * init or hx-on binding, so canonicalizing in `htmx_before_process`
 * covers everything htmx will read. `htmx_before_process_node` is kept
 * as a defensive alias for other v4 prereleases that used per-node
 * naming; an unmatched key is inert.
 *
 * A v2 fallback (`htmx.defineExtension` + `onEvent('htmx:beforeProcessNode')`)
 * is included because the localized attribute names are version-agnostic
 * data — but v2 support is best-effort, not a tested target.
 *
 * The extension hook alone is not enough for the *initial* page: script
 * order decides whether our sweep beats htmx's own DOMContentLoaded scan.
 * `installAutoSweep()` handles that — load this adapter (and vocab
 * modules) BEFORE the htmx <script> tag, mirroring loka-js's
 * "orchestrator before libraries" rule, and the sweep listener registers
 * ahead of htmx's.
 */

import { canonicalizeTree } from './canonicalize.js';
import { onVocabUpdate } from './registry.js';
import { onBodyHooksChanged } from './hx-on.js';

export const EXTENSION_NAME = 'lokascript-i18n';

/** Minimal shape of the htmx global we interact with. */
export interface HtmxLike {
  /** htmx v4 registration entry point. */
  registerExtension?(name: string, extension: object): void;
  /** htmx v1/v2 registration entry point. */
  defineExtension?(name: string, extension: object): void;
}

/**
 * Build the extension object. v4 hooks and the v2 `onEvent` callback are
 * both present — each API only reads the members it knows about.
 */
export function createExtension(): object {
  return {
    // htmx v4 (verified on 4.0.0-beta5): fires on each process() root
    // before element init and hx-on binding.
    htmx_before_process(elt: Element): void {
      canonicalizeTree(elt);
    },
    // Defensive alias for v4 prereleases with per-node hook naming.
    htmx_before_process_node(elt: Element): void {
      canonicalizeTree(elt);
    },
    // htmx v1/v2 fallback: single event dispatcher.
    onEvent(name: string, evt: CustomEvent & { target?: EventTarget | null }): void {
      if (name !== 'htmx:beforeProcessNode') return;
      const detail = evt?.detail as { elt?: Element } | undefined;
      const elt = detail?.elt ?? (evt?.target instanceof Element ? evt.target : null);
      if (elt) canonicalizeTree(elt);
    },
  };
}

/**
 * Register the extension with an htmx global. Returns which API accepted
 * it (`'v4'` / `'v2'`) or `null` if the object exposes neither.
 */
export function registerWith(htmx: HtmxLike | undefined | null): 'v4' | 'v2' | null {
  if (!htmx) return null;
  const ext = createExtension();
  if (typeof htmx.registerExtension === 'function') {
    htmx.registerExtension(EXTENSION_NAME, ext);
    return 'v4';
  }
  if (typeof htmx.defineExtension === 'function') {
    htmx.defineExtension(EXTENSION_NAME, ext);
    return 'v2';
  }
  return null;
}

/**
 * Sweep the whole document now (if parsed) or on DOMContentLoaded, and
 * re-sweep whenever a vocab module registers after the initial sweep
 * (e.g. a vocab <script> below htmx, or dynamic registration).
 *
 * Returns a cleanup function (mainly for tests).
 */
export function installAutoSweep(doc: Document = document): () => void {
  const sweep = (): void => {
    canonicalizeTree(doc.body ?? doc.documentElement);
  };

  let removeDomListener: (() => void) | null = null;
  if (doc.readyState === 'loading') {
    const onReady = (): void => sweep();
    doc.addEventListener('DOMContentLoaded', onReady, { once: true });
    removeDomListener = () => doc.removeEventListener('DOMContentLoaded', onReady);
  } else {
    sweep();
  }

  const unsubscribeVocab = onVocabUpdate(() => {
    if (doc.readyState !== 'loading') sweep();
  });

  // A body executor configured after the initial sweep flips the hx-on
  // family into executor mode — re-sweep so already-canonicalized
  // hx-on:* attrs get claimed (listener installed, attr removed).
  const unsubscribeBodyHooks = onBodyHooksChanged(() => {
    if (doc.readyState !== 'loading') sweep();
  });

  return () => {
    removeDomListener?.();
    unsubscribeVocab();
    unsubscribeBodyHooks();
  };
}
