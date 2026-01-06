/**
 * Put Patterns Index
 *
 * Re-exports per-language functions for tree-shaking.
 * Import specific languages directly for optimal bundle size.
 */

import type { LanguagePattern } from '../../types';

// Re-export per-language functions for direct import
export { getPutPatternsEn } from './en';
export { getPutPatternsJa } from './ja';
export { getPutPatternsAr } from './ar';
export { getPutPatternsEs } from './es';

// Import all for backwards compatibility (defeats tree-shaking)
import { getPutPatternsEn } from './en';
import { getPutPatternsJa } from './ja';
import { getPutPatternsAr } from './ar';
import { getPutPatternsEs } from './es';

/**
 * Get put patterns for a specific language.
 * Returns empty array if language has no hand-crafted patterns.
 *
 * @deprecated Import per-language functions directly for tree-shaking.
 */
export function getPutPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en': return getPutPatternsEn();
    case 'ja': return getPutPatternsJa();
    case 'ar': return getPutPatternsAr();
    case 'es': return getPutPatternsEs();
    default: return [];
  }
}
