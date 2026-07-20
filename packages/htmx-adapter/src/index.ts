/**
 * @lokascript/htmx-adapter — multilingual adapter for upstream htmx v4.
 *
 * Lets authors write `hx-*` / `sse-*` / `ws-*` attributes in 24 languages
 * against the stock htmx library. Localized names are canonicalized on
 * the element before htmx processes it (see canonicalize.ts); vocab data
 * is the same generated `packages/core/vocab/htmx/{lang}.js` modules the
 * embedded hyperfixi htmx-compat layer uses.
 *
 * Programmatic use:
 *
 *   import { register, registerWith, installAutoSweep } from '@lokascript/htmx-adapter';
 *   register('es', { hyperfixi: { attrs: { 'hx-obtener': 'hx-get' }, events: { clic: 'click' } } });
 *   registerWith(window.htmx);   // v4 extension (v2 fallback)
 *   installAutoSweep();          // initial-page sweep
 *
 * Browser IIFE (`./browser` export) does all of the above automatically.
 */

export { langOf, normLang } from './lang-resolver.js';
export {
  register,
  vocabFor,
  isLangRegistered,
  hasAnyVocab,
  onVocabUpdate,
  resetRegistry,
  type HtmxVocab,
  type VocabPayload,
} from './registry.js';
export { canonicalizeElement, canonicalizeTree, translateTriggerValue } from './canonicalize.js';
export {
  EXTENSION_NAME,
  createExtension,
  registerWith,
  installAutoSweep,
  type HtmxLike,
} from './extension.js';
export {
  setBodyExecutor,
  setBodyTranslator,
  hasBodyExecutor,
  hasBodyTranslator,
  onBodyHooksChanged,
  claimHxOnAttribute,
  autoDetectBodyHooks,
  resetBodyHooks,
  type BodyExecutor,
  type BodyTranslator,
} from './hx-on.js';
