/**
 * @hyperfixi/types-browser
 * TypeScript type definitions for HyperFixi browser globals
 *
 * This package provides complete type definitions for using HyperFixi
 * packages in the browser via global variables.
 *
 * ## Installation
 *
 * ```bash
 * npm install --save-dev @hyperfixi/types-browser
 * ```
 *
 * ## Usage
 *
 * Add to your tsconfig.json:
 * ```json
 * {
 *   "compilerOptions": {
 *     "types": ["@hyperfixi/types-browser"]
 *   }
 * }
 * ```
 *
 * Or use triple-slash directive in your TypeScript files:
 * ```typescript
 * /// <reference types="@hyperfixi/types-browser" />
 * ```
 *
 * ## Examples
 *
 * ### Using window.hyperfixi
 * ```typescript
 * // window.hyperfixi (and window._hyperscript, the same object) is fully typed
 * window.hyperfixi.evaluate('toggle .active on me', { me: button })
 * window.hyperfixi.parse('on click toggle .active').errors // []
 * ```
 *
 * ### Using window.LokaScriptSemantic
 * ```typescript
 * if (window.LokaScriptSemantic) {
 *   const node = window.LokaScriptSemantic.parse('toggle .active', 'en')
 *   const japanese = window.LokaScriptSemantic.translate('toggle .active', 'en', 'ja')
 * }
 * ```
 *
 * ### Using Type Guards
 * ```typescript
 * import { getHyperFixiCore } from '@hyperfixi/types-browser'
 *
 * const hyperfixi = getHyperFixiCore()
 * if (hyperfixi) {
 *   hyperfixi.evaluate('toggle .active on me', { me: button })
 * }
 * ```
 */

export * from './core-api';
export * from './semantic-api';
export * from './i18n-api';
export * from './type-guards';
export * from './globals';
