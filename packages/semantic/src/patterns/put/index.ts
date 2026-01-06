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
export { getPutPatternsZh } from './zh';
export { getPutPatternsKo } from './ko';
export { getPutPatternsTr } from './tr';
export { getPutPatternsId } from './id';

// Import all for backwards compatibility (defeats tree-shaking)
import { getPutPatternsEn } from './en';
import { getPutPatternsJa } from './ja';
import { getPutPatternsAr } from './ar';
import { getPutPatternsEs } from './es';
import { getPutPatternsZh } from './zh';
import { getPutPatternsKo } from './ko';
import { getPutPatternsTr } from './tr';
import { getPutPatternsId } from './id';

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
    case 'zh': return getPutPatternsZh();
    case 'ko': return getPutPatternsKo();
    case 'tr': return getPutPatternsTr();
    case 'id': return getPutPatternsId();
    default: return [];
  }
}
