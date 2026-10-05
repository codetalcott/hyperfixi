/**
 * `@hyperfixi/core` — the engine, and the tooling around it.
 *
 * Since 4.0 the root is `@hyperfixi/engine`: every export of the engine's library
 * entry (`api`, `register`, `everything` and each grammar module, `parse`,
 * `evaluate`, `processNode`, `boot`, the AST types), re-exported. Core's own
 * engine — its parser, runtime and command classes — left in Phase C6 of the
 * engine cutover; `dist/hyperfixi.js` (`@hyperfixi/core/browser`) has been the
 * engine's script-tag bundle since 3.x.
 *
 * The tooling stays on subpaths: `/multilingual` (parse, render and translate in
 * 24 languages), `/ast-utils`, `/lsp-metadata`, `/reference`, `/metadata`.
 *
 * ESM only, like the engine: a CommonJS copy would bundle a second engine, with
 * its own grammar, beside the one `@hyperfixi/engine` users register into.
 *
 * @example
 * ```typescript
 * import { register, on, toggle, processNode } from '@hyperfixi/core';
 *
 * register(on, toggle);
 * processNode(document.body);
 * ```
 */
export * from '@hyperfixi/engine';
export { VERSION } from './version';
