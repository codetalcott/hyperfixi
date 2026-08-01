/**
 * The shared boot shell — one definition of what a HyperFixi bundle's public
 * API *is*, for every bundle that has one.
 *
 * ---------------------------------------------------------------------------
 * WHY (Arc E step 3 — `docs-internal/archive/HANDOFF-command-arch-bundles.md`)
 * ---------------------------------------------------------------------------
 *
 * Before this module, the same ~40 lines — `processElements`, the `api` object
 * literal, and the `window.<global> = api` + DOMContentLoaded block — were
 * written out SEVEN times: three handwritten TypeScript bundles
 * (hybrid-complete, lite, lite-plus), core's `bundle-generator/generator.ts`,
 * and three separate emission sites in `@hyperfixi/vite-plugin`
 * (`generator.ts`'s main and empty-bundle shells, `compiled-generator.ts`).
 * The brief predicted four. Counting only the copies you already know about is
 * how the divergences below survived.
 *
 * They had drifted into four different public APIs, and NOT along any line a
 * user could predict:
 *
 *   - `run`/`eval`/`parserName` existed ONLY in generated bundles.
 *   - `tokenize`/`evaluate` existed ONLY in hybrid-complete.
 *   - `addAliases`/`addEventAliases` existed in hybrid-complete and lite-plus
 *     but not lite.
 *   - `blocks` existed only where a bundle had blocks — the one divergence
 *     that was actually principled.
 *   - Every GENERATED bundle claimed `window._hyperscript`; no shipped
 *     handwritten bundle did. See § THE `_hyperscript` DECISION below.
 *
 * ---------------------------------------------------------------------------
 * THE RULE this module encodes
 * ---------------------------------------------------------------------------
 *
 * A bundle's API is a CORE surface (`SHELL_CORE_KEYS` — every bundle with a
 * shell has all six) plus `blocks` iff it executes blocks, plus `extras` that
 * a specific bundle declares. Divergence above the core is legitimate only
 * when a consumer or a gate witnesses it; it was measured, not assumed:
 *
 *   | extra              | kept on            | witnessed by                        |
 *   | ------------------ | ------------------ | ----------------------------------- |
 *   | addAliases         | hybrid-complete,   | `browser-tests/hybrid-complete.spec` |
 *   |                    | lite-plus          | ("addAliases function works")       |
 *   | addEventAliases    | same two           | i18n pair of the above              |
 *   | tokenize, evaluate | hybrid-complete    | house-consistent with the full      |
 *   |                    |                    | bundle, which exports both          |
 *   | run, eval          | generated          | `run` mirrors the full bundle;      |
 *   |                    |                    | `eval` is a redundant alias, kept   |
 *   |                    |                    | only because removing published API |
 *   |                    |                    | is a breaking change with no defect |
 *   |                    |                    | behind it                           |
 *   | parserName         | generated          | `examples/vite-plugin-test/main.js` |
 *   |                    |                    | and `-multilingual/main.js` read it |
 *
 * Nothing was added to a shell that did not already have it. Unioning every
 * key into every shell would have put unrequested API into four shipped
 * bundles and into every bundle the vite-plugin emits — the same trade the
 * `getClassName` comment-trim was decided on in step 2, where emitted shell
 * code is shipped bytes.
 *
 * ---------------------------------------------------------------------------
 * THE `_hyperscript` DECISION — the one behavior change here
 * ---------------------------------------------------------------------------
 *
 * Every generated bundle assigned `window._hyperscript = api`, squatting the
 * global of the library HyperFixi is compatible WITH. Measured against the
 * real thing (`hyperscript.org@0.9.93`), the shapes are incompatible:
 * `_hyperscript` is a callable function (`_hyperscript('1 + 1')` → `2`)
 * carrying `evaluate`, `processNode`, `internals`, `config`, `addCommand`,
 * `addFeature`, and more. The bundle `api` is a plain object with none of
 * them. On a page loading both, last-write-wins, and if the generated bundle
 * won then `_hyperscript(...)` threw "not a function", `.evaluate` was
 * undefined, and `.parse`/`.process` — the only overlapping names — silently
 * did something ELSE.
 *
 * No shipped handwritten bundle ever did this, and no test anywhere asserted
 * it, so nothing was watching. The shells converge on NOT doing it; the
 * absence is now pinned by `bundle-shell.test.ts`.
 */

/**
 * The six keys every shell has. The drift gate asserts both the runtime shell
 * and the emitted twin carry exactly these, so the two cannot diverge silently.
 */
export const SHELL_CORE_KEYS = [
  'version',
  'parse',
  'execute',
  'init',
  'process',
  'commands',
] as const;

/**
 * The core surface every shell carries, typed. Generic over the bundle's AST
 * so `api.parse` keeps its real return type — erasing it to
 * `Record<string, unknown>` would break every consumer, including
 * `hyperfixi-hx.js`, which spreads hybrid-complete's api wholesale.
 *
 * Bundles declare their api as a flat object literal satisfying this type
 * rather than receiving one from a factory. That is deliberate, and MEASURED:
 * a factory taking an options object and re-emitting it as an api object costs
 * **+103 bytes gzip on `hyperfixi-hybrid-complete.js` and +63 on
 * `hyperfixi-hx.js`** — terser inlines the call but cannot collapse the two
 * object literals or the property indirection through the options bag. Since
 * every bundle is rolled up independently, that indirection buys no sharing at
 * runtime; it is pure overhead in four shipped bundles.
 *
 * What actually prevents the shells from drifting is `bundle-shell.test.ts`,
 * which pins each shell's key set and the absence of `window._hyperscript` —
 * not the indirection. So the helpers below share the logic that is genuinely
 * identical (the `[_]` scan loop and the global install) and the type pins the
 * shape, at zero byte cost.
 */
export interface BundleShellApi<TAst> {
  version: string;
  parse: (code: string) => TAst;
  execute: (code: string, element?: Element) => Promise<unknown>;
  init: (root?: Element | Document) => void;
  process: (root?: Element | Document) => void;
  commands: string[];
  blocks?: string[];
}

/**
 * Build the `[_]` document scanner every bundle runs.
 *
 * Identical in all seven shells apart from the console label, which is why it
 * is shared and the api literal is not.
 */
export function createProcessElements<TAst>(
  parse: (code: string) => TAst,
  run: (ast: TAst, me: Element) => unknown,
  errorLabel: string
): (root?: Element | Document) => void {
  return (root: Element | Document = document): void => {
    root.querySelectorAll('[_]').forEach(el => {
      const code = el.getAttribute('_');
      if (!code) return;
      try {
        run(parse(code), el);
      } catch (err) {
        console.error(`HyperFixi ${errorLabel} error:`, err, 'Code:', code);
      }
    });
  };
}

/**
 * Publish the api on `window` and schedule the initial document scan.
 *
 * Deliberately assigns ONE global. See § THE `_hyperscript` DECISION.
 */
export function installBundleGlobal(
  api: unknown,
  processElements: (root?: Element | Document) => void,
  globalName = 'hyperfixi'
): void {
  if (typeof window === 'undefined') return;
  (window as any)[globalName] = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
}
