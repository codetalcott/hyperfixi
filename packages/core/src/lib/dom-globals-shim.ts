/**
 * Guarded DOM-globals shim for Node/SSR safety.
 *
 * morphlex (1.4.0) evaluates `"moveBefore" in Element.prototype` at module
 * scope, which throws `ReferenceError: Element is not defined` in bare
 * Node/SSR. Defining a dummy `Element` before morphlex's module body runs
 * prevents the import-time crash. It does NOT make morphing work headless —
 * morph still needs a real DOM. No-op in browsers (and happy-dom/jsdom).
 *
 * `Element` is deliberately the ONLY global shimmed: it is the only DOM
 * global morphlex touches at module scope, and every extra fake global risks
 * fooling `typeof X !== 'undefined'` environment detection elsewhere in the
 * process. If a morphlex upgrade adds more module-scope globals, the
 * bare-Node import check (scripts/check-node-import.mjs) fails in CI —
 * extend the guard here then.
 */
function ensureDomGlobals(): boolean {
  if (typeof (globalThis as { Element?: unknown }).Element === 'undefined') {
    (globalThis as { Element?: unknown }).Element = class {};
  }
  return true;
}

/**
 * Always `true`. Imported and *used* by morph-adapter so statement-level
 * treeshakers honoring this package's `"sideEffects": false` (Rollup/Vite)
 * cannot drop the shim while retaining morphlex. Do NOT convert the consumer
 * to a bare side-effect import.
 */
export const domGlobalsEnsured: boolean = ensureDomGlobals();
