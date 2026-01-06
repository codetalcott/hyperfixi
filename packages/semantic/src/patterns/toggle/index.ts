/**
 * Toggle Patterns Index
 *
 * Re-exports per-language functions for tree-shaking.
 * Import specific languages directly for optimal bundle size.
 */

import type { LanguagePattern } from '../../types';

// Re-export per-language functions for direct import
export { getTogglePatternsEn } from './en';
export { getTogglePatternsJa } from './ja';
export { getTogglePatternsAr } from './ar';
export { getTogglePatternsEs } from './es';
export { getTogglePatternsKo } from './ko';
export { getTogglePatternsZh } from './zh';
export { getTogglePatternsTr } from './tr';

// Import all for backwards compatibility (defeats tree-shaking)
import { getTogglePatternsEn } from './en';
import { getTogglePatternsJa } from './ja';
import { getTogglePatternsAr } from './ar';
import { getTogglePatternsEs } from './es';
import { getTogglePatternsKo } from './ko';
import { getTogglePatternsZh } from './zh';
import { getTogglePatternsTr } from './tr';

/**
 * Get toggle patterns for a specific language.
 * Returns empty array if language has no hand-crafted patterns.
 *
 * @deprecated Import per-language functions directly for tree-shaking.
 */
export function getTogglePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en': return getTogglePatternsEn();
    case 'ja': return getTogglePatternsJa();
    case 'ar': return getTogglePatternsAr();
    case 'es': return getTogglePatternsEs();
    case 'ko': return getTogglePatternsKo();
    case 'zh': return getTogglePatternsZh();
    case 'tr': return getTogglePatternsTr();
    default: return [];
  }
}

/**
 * Languages that have hand-crafted toggle patterns.
 */
export const togglePatternLanguages = ['en', 'ja', 'ar', 'es', 'ko', 'zh', 'tr'];
