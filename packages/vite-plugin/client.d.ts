/**
 * Types for an app built with `@hyperfixi/vite-plugin`, as `vite/client` is for Vite's own
 * modules. Reference it once, in `src/vite-env.d.ts`:
 *
 *   /// <reference types="@hyperfixi/vite-plugin/client" />
 *
 * or in tsconfig.json: `"types": ["vite/client", "@hyperfixi/vite-plugin/client"]`.
 *
 * It declares the plugin's virtual module (`import 'hyperfixi'`, `import api from 'hyperfixi'`)
 * and the globals its bundle installs (`window.hyperfixi`, `window._hyperscript`). For the `_`
 * attribute in JSX, see the README's TypeScript section: `data-script` needs nothing.
 */

/** The bundle's API: the engine's `api` (`evaluate`, `parse`, `processNode`, …), plus `bundle`. */
type HyperfixiBundleApi = typeof import('@hyperfixi/engine').api & {
  /** What the plugin registered: the bundle's name, modules and languages. */
  readonly bundle: Readonly<Record<string, unknown>>;
};

declare module 'hyperfixi' {
  const api: HyperfixiBundleApi;
  export default api;
  export { api };
}

declare module 'virtual:hyperfixi' {
  const api: HyperfixiBundleApi;
  export default api;
  export { api };
}

declare module 'lokascript' {
  const api: HyperfixiBundleApi;
  export default api;
  export { api };
}

interface Window {
  /** The plugin's global (its `globalName` option; `hyperfixi` by default). */
  hyperfixi: HyperfixiBundleApi;
  /** The engine's global: it is a `_hyperscript` implementation, and installs the name. */
  _hyperscript: HyperfixiBundleApi;
}
