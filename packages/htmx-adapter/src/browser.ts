/**
 * Browser IIFE entry — auto-wires everything on load.
 *
 * Recommended script order (loka-js convention: adapter before library):
 *
 *   <script src="htmx-i18n.global.js"></script>       <!-- this file -->
 *   <script src="vocab/htmx/es.js"></script>          <!-- one or more -->
 *   <script src="htmx.js"></script>                   <!-- upstream htmx v4 -->
 *
 * On load this entry:
 *   1. Installs `window.__hyperfixi_i18n.register` so the generated vocab
 *      modules (`packages/core/vocab/htmx/{lang}.js`) self-register here
 *      exactly as they do against hyperfixi core. If a registry already
 *      exists (page also runs the embedded htmx-compat layer), we fan out
 *      so BOTH registries receive every registration.
 *   2. Registers the htmx extension immediately if `window.htmx` exists,
 *      otherwise retries once on DOMContentLoaded (covering the
 *      recommended adapter-before-htmx order).
 *   3. Installs the initial-document sweep (`installAutoSweep`).
 */

import { register } from './registry.js';
import { registerWith, installAutoSweep, EXTENSION_NAME, type HtmxLike } from './extension.js';
import { canonicalizeTree, canonicalizeElement, translateTriggerValue } from './canonicalize.js';
import { langOf, normLang } from './lang-resolver.js';

// Bracket-with-string-constant access, NOT dot access: Terser's
// `properties.regex: /^_/` pass mangles `w.__hyperfixi_i18n` but leaves
// bracket access via a string constant alone — the same load-bearing
// trick as core's i18n-orchestrator.ts / parser extensions registry.
const WINDOW_KEY = '__hyperfixi_i18n';

interface PublicRegistry {
  register: typeof register;
}

function installPublicAPI(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, PublicRegistry | undefined>;
  const existing = w[WINDOW_KEY];
  if (existing) {
    // Fan out: keep feeding the embedded layer's registry AND ours.
    const theirRegister = existing.register.bind(existing);
    w[WINDOW_KEY] = {
      register: (code, data) => {
        theirRegister(code, data);
        register(code, data);
      },
    };
    return;
  }
  w[WINDOW_KEY] = { register };
}

function autoRegister(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const w = window as unknown as { htmx?: HtmxLike };

  if (!registerWith(w.htmx)) {
    // Adapter loaded before htmx (the recommended order) — htmx isn't on
    // window yet. All sync scripts have run by DOMContentLoaded.
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        if (!registerWith(w.htmx) && typeof console !== 'undefined') {
          console.warn(
            `[htmx-i18n] window.htmx not found — the "${EXTENSION_NAME}" extension was not ` +
              'registered. Dynamically swapped content will not be canonicalized ' +
              '(the initial document sweep still ran). Load htmx on this page.'
          );
        }
      },
      { once: true }
    );
  }

  installAutoSweep(document);
}

installPublicAPI();
autoRegister();

// Global surface (tsup globalName: HtmxI18n).
export {
  register,
  registerWith,
  installAutoSweep,
  canonicalizeTree,
  canonicalizeElement,
  translateTriggerValue,
  langOf,
  normLang,
  EXTENSION_NAME,
};
