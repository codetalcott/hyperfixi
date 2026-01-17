/**
 * Runtime Environment Detection
 *
 * Provides type-level and runtime environment detection for conditional types.
 * This enables type-safe APIs that adapt to browser vs Node.js environments.
 *
 * Usage:
 *   import type { RuntimeEnvironment, DetectEnvironment } from './environment';
 *   import { isBrowserEnvironment, isNodeEnvironment } from './environment';
 *
 * Type-level detection:
 *   type Env = DetectEnvironment;  // 'browser' | 'node' | 'universal'
 *
 * Runtime detection:
 *   if (isBrowserEnvironment()) {
 *     // Use DOM APIs
 *   }
 */

/**
 * Runtime environment types
 *
 * - 'browser': Web browser with DOM APIs (window, document, Element)
 * - 'node': Node.js with process, require, etc.
 * - 'universal': Code that works in both environments
 */
export type RuntimeEnvironment = 'browser' | 'node' | 'universal';

/**
 * Detect runtime environment at type level
 *
 * Uses conditional types to branch based on available globals.
 * This is a compile-time type computation with zero runtime cost.
 *
 * @example
 * type CurrentEnv = DetectEnvironment;
 * // In browser: 'browser'
 * // In Node.js: 'node'
 * // In universal code: 'universal'
 */
export type DetectEnvironment<T = typeof globalThis> = T extends {
  document: any;
  window: any;
}
  ? 'browser'
  : T extends { process: any; require: any }
    ? 'node'
    : 'universal';

/**
 * Check if code is running in a browser environment
 *
 * Detects browser by checking for window and document globals.
 * Safe to call in both browser and Node.js.
 *
 * @returns true if running in a browser with DOM APIs
 *
 * @example
 * if (isBrowserEnvironment()) {
 *   document.querySelector('#app');
 * }
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if code is running in a Node.js environment
 *
 * Detects Node.js by checking for process.versions.node.
 * Safe to call in both browser and Node.js.
 *
 * @returns true if running in Node.js
 *
 * @example
 * if (isNodeEnvironment()) {
 *   const fs = require('fs');
 * }
 */
export function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}

/**
 * Get current runtime environment
 *
 * Returns a string indicating the current runtime environment.
 * Useful for runtime branching and debugging.
 *
 * @returns 'browser', 'node', or 'unknown'
 *
 * @example
 * const env = getRuntimeEnvironment();
 * console.log(`Running in: ${env}`);
 */
export function getRuntimeEnvironment(): 'browser' | 'node' | 'unknown' {
  if (isBrowserEnvironment()) return 'browser';
  if (isNodeEnvironment()) return 'node';
  return 'unknown';
}

/**
 * Assert that code is running in browser environment
 *
 * Throws an error if not in browser environment.
 * Useful for functions that require DOM APIs.
 *
 * @throws {Error} if not in browser environment
 *
 * @example
 * function manipulateDOM() {
 *   assertBrowserEnvironment();
 *   document.body.appendChild(element);
 * }
 */
export function assertBrowserEnvironment(): asserts this is { window: Window; document: Document } {
  if (!isBrowserEnvironment()) {
    throw new Error(
      'This function requires a browser environment with DOM APIs. ' +
        'Current environment: ' +
        getRuntimeEnvironment()
    );
  }
}

/**
 * Assert that code is running in Node.js environment
 *
 * Throws an error if not in Node.js environment.
 * Useful for functions that require Node.js APIs.
 *
 * @throws {Error} if not in Node.js environment
 *
 * @example
 * function readFile() {
 *   assertNodeEnvironment();
 *   const fs = require('fs');
 *   return fs.readFileSync('file.txt');
 * }
 */
export function assertNodeEnvironment(): asserts this is { process: NodeJS.Process } {
  if (!isNodeEnvironment()) {
    throw new Error(
      'This function requires a Node.js environment. ' +
        'Current environment: ' +
        getRuntimeEnvironment()
    );
  }
}
