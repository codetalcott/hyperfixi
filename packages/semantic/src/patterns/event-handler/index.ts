/**
 * Event Handler Patterns Index
 *
 * Re-exports per-language functions for tree-shaking.
 * Import specific languages directly for optimal bundle size.
 *
 * Languages de, fr, id, sw use generated patterns from profile.eventHandler config.
 * Other languages use hand-crafted patterns for complex word order/morphology.
 */

import type { LanguagePattern } from '../../types';
import { generateEventHandlerPatterns } from '../../generators/event-handler-generator';
import { germanProfile } from '../../generators/profiles/german';
import { frenchProfile } from '../../generators/profiles/french';
import { indonesianProfile } from '../../generators/profiles/indonesian';
import { swahiliProfile } from '../../generators/profiles/swahili';

// Re-export shared utilities
export { eventNameTranslations, normalizeEventName } from './shared';

// Re-export per-language functions for direct import (hand-crafted languages)
export { getEventHandlerPatternsEn } from './en';
export { getEventHandlerPatternsJa } from './ja';
export { getEventHandlerPatternsKo } from './ko';
export { getEventHandlerPatternsAr } from './ar';
export { getEventHandlerPatternsTr } from './tr';
export { getEventHandlerPatternsEs } from './es';
export { getEventHandlerPatternsPt } from './pt';
export { getEventHandlerPatternsZh } from './zh';
export { getEventHandlerPatternsQu } from './qu';

// Generated pattern getters for simple SVO languages
export function getEventHandlerPatternsDe(): LanguagePattern[] {
  return generateEventHandlerPatterns(germanProfile);
}

export function getEventHandlerPatternsFr(): LanguagePattern[] {
  return generateEventHandlerPatterns(frenchProfile);
}

export function getEventHandlerPatternsId(): LanguagePattern[] {
  return generateEventHandlerPatterns(indonesianProfile);
}

export function getEventHandlerPatternsSw(): LanguagePattern[] {
  return generateEventHandlerPatterns(swahiliProfile);
}

// Import hand-crafted patterns for backwards compatibility
import { getEventHandlerPatternsEn } from './en';
import { getEventHandlerPatternsJa } from './ja';
import { getEventHandlerPatternsKo } from './ko';
import { getEventHandlerPatternsAr } from './ar';
import { getEventHandlerPatternsTr } from './tr';
import { getEventHandlerPatternsEs } from './es';
import { getEventHandlerPatternsPt } from './pt';
import { getEventHandlerPatternsZh } from './zh';
import { getEventHandlerPatternsQu } from './qu';

/**
 * Get event handler patterns for a specific language.
 * Returns empty array if language has no patterns.
 *
 * @deprecated Import per-language functions directly for tree-shaking.
 */
export function getEventHandlerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    // Hand-crafted patterns (complex languages)
    case 'en': return getEventHandlerPatternsEn();
    case 'ja': return getEventHandlerPatternsJa();
    case 'ko': return getEventHandlerPatternsKo();
    case 'ar': return getEventHandlerPatternsAr();
    case 'tr': return getEventHandlerPatternsTr();
    case 'es': return getEventHandlerPatternsEs();
    case 'pt': return getEventHandlerPatternsPt();
    case 'zh': return getEventHandlerPatternsZh();
    case 'qu': return getEventHandlerPatternsQu();
    // Generated patterns (simple SVO languages)
    case 'de': return getEventHandlerPatternsDe();
    case 'fr': return getEventHandlerPatternsFr();
    case 'id': return getEventHandlerPatternsId();
    case 'sw': return getEventHandlerPatternsSw();
    default: return [];
  }
}
