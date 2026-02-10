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
 * // window.hyperfixi is now fully typed
 * const result = await window.hyperfixi.execute('toggle .active')
 * window.evalHyperScript('toggle .active')
 * ```
 *
 * ### Using window.HyperFixiSemantic
 * ```typescript
 * if (window.HyperFixiSemantic) {
 *   const node = window.HyperFixiSemantic.parse('toggle .active', 'en')
 *   const japanese = window.HyperFixiSemantic.translate('toggle .active', 'en', 'ja')
 * }
 * ```
 *
 * ### Using Type Guards
 * ```typescript
 * import { isHyperFixiCoreAvailable, getHyperFixiCore } from '@hyperfixi/types-browser'
 *
 * const hyperfixi = getHyperFixiCore()
 * if (hyperfixi) {
 *   hyperfixi.execute('toggle .active')
 * }
 * ```
 */

export * from './core-api';
export * from './semantic-api';
export * from './i18n-api';
export * from './type-guards';
export * from './globals';
