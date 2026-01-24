/**
 * Hebrew Event Handler Patterns
 *
 * Strategy: Return empty array to rely on auto-generated patterns from profile.
 * Hebrew uses SVO word order with preposition-based event markers (ב/כש/עם).
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Hebrew event handler patterns.
 */
export function getEventHandlerPatternsHe(): LanguagePattern[] {
  return [];
}
