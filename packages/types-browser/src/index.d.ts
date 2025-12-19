/**
 * @hyperfixi/types-browser
 * TypeScript type definitions for HyperFixi browser globals
 *
 * This package provides complete type definitions for using HyperFixi
 * packages in the browser via global variables.
 *
 * Install with: npm install --save-dev @hyperfixi/types-browser
 *
 * Then add to your tsconfig.json:
 * ```json
 * {
 *   "compilerOptions": {
 *     "types": ["@hyperfixi/types-browser"]
 *   }
 * }
 * ```
 */

/// <reference path="./core-api.d.ts" />
/// <reference path="./semantic-api.d.ts" />
/// <reference path="./i18n-api.d.ts" />
/// <reference path="./globals.d.ts" />

// Re-export all types for convenience
export * from './core-api';
export * from './semantic-api';
export * from './i18n-api';
