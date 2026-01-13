/**
 * Type guards for browser globals
 */

import type { HyperFixiCoreAPI } from './core-api';
import type { HyperFixiSemanticAPI } from './semantic-api';
import type { HyperFixiI18nAPI } from './i18n-api';

/**
 * Check if window.hyperfixi is available and properly typed
 */
export function isHyperFixiCoreAvailable(obj?: any): obj is HyperFixiCoreAPI {
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
export function isHyperFixiSemanticAvailable(obj?: any): obj is HyperFixiSemanticAPI {
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
export function isHyperFixiI18nAvailable(obj?: any): obj is HyperFixiI18nAPI {
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
export function getHyperFixiCore(): HyperFixiCoreAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiCoreAvailable(window.hyperfixi)) {
    return window.hyperfixi;
  }
  return null;
}

/**
 * Safe access to window.HyperFixiSemantic with type checking
 */
export function getHyperFixiSemantic(): HyperFixiSemanticAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiSemanticAvailable(window.HyperFixiSemantic)) {
    return window.HyperFixiSemantic;
  }
  return null;
}

/**
 * Safe access to window.HyperFixiI18n with type checking
 */
export function getHyperFixiI18n(): HyperFixiI18nAPI | null {
  if (typeof window !== 'undefined' && isHyperFixiI18nAvailable(window.HyperFixiI18n)) {
    return window.HyperFixiI18n;
  }
  return null;
}
