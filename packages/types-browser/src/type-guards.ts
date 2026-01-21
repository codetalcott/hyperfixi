/**
 * Type guards for browser globals
 */

import type { LokaScriptCoreAPI } from './core-api';
import type { LokaScriptSemanticAPI } from './semantic-api';
import type { LokaScriptI18nAPI } from './i18n-api';

/**
 * Check if window.hyperfixi is available and properly typed
 */
export function isHyperFixiCoreAvailable(obj?: any): obj is LokaScriptCoreAPI {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.execute === 'function' &&
    typeof obj.compile === 'function'
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
    typeof obj.translate === 'function' &&
    typeof obj.getSupportedLocales === 'function'
  );
}

/**
 * Safe access to window.hyperfixi with type checking
 */
export function getHyperFixiCore(): LokaScriptCoreAPI | null {
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
