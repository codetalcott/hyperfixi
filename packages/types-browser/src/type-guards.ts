/**
 * Type guards for browser globals
 */

import type { HyperfixiAPI } from './core-api';
import type { LokaScriptSemanticAPI } from './semantic-api';
import type { LokaScriptI18nAPI } from './i18n-api';

/**
 * Check that a value is the hyperscript host (`window.hyperfixi` / `window._hyperscript`):
 * callable, with `evaluate` and `processNode`.
 */
export function isHyperFixiCoreAvailable(obj?: any): obj is HyperfixiAPI {
  return (
    typeof obj === 'function' &&
    typeof obj.evaluate === 'function' &&
    typeof obj.processNode === 'function'
  );
}

/**
 * Check if window.HyperFixiSemantic is available
 */
export function isHyperFixiSemanticAvailable(obj?: any): obj is LokaScriptSemanticAPI {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.parse === 'function' &&
    typeof obj.canParse === 'function'
  );
}

/**
 * Check if window.HyperFixiI18n is available
 */
export function isHyperFixiI18nAvailable(obj?: any): obj is LokaScriptI18nAPI {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    // `translate` used to be the marker here; it left with the grammar
    // transformer (2026-08-28). `getProfile` is the surviving half of the same
    // module and is what makes this global distinguishable.
    typeof obj.getProfile === 'function' &&
    typeof obj.getSupportedLocales === 'function'
  );
}

/**
 * Safe access to window.hyperfixi with type checking
 */
export function getHyperFixiCore(): HyperfixiAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiCoreAvailable(window.hyperfixi)) {
    return window.hyperfixi;
  }
  return null;
}

/**
 * Safe access to window.LokaScriptSemantic with type checking
 */
export function getHyperFixiSemantic(): LokaScriptSemanticAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiSemanticAvailable(window.LokaScriptSemantic)) {
    return window.LokaScriptSemantic;
  }
  return null;
}

/**
 * Safe access to window.LokaScriptI18n with type checking
 */
export function getHyperFixiI18n(): LokaScriptI18nAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiI18nAvailable(window.LokaScriptI18n)) {
    return window.LokaScriptI18n;
  }
  return null;
}
