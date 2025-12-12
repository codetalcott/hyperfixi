/**
 * Pattern Registry
 *
 * Central registry for all language patterns.
 * Provides lookup by language and command type.
 *
 * Migration Strategy:
 * - Hand-crafted patterns: toggle, put, event-handler (validated, keep)
 * - Generated patterns: add, remove, show, hide, wait, log, etc. (new)
 */

import type { LanguagePattern, ActionType } from '../types';
import { togglePatterns, getTogglePatternsForLanguage } from './toggle';
import { putPatterns, getPutPatternsForLanguage } from './put';
import { eventHandlerPatterns, getEventHandlerPatternsForLanguage, eventNameTranslations, normalizeEventName } from './event-handler';

// Import generator for new commands
import {
  generatePatternsForCommand,
  addSchema,
  removeSchema,
  showSchema,
  hideSchema,
  waitSchema,
  logSchema,
  incrementSchema,
  decrementSchema,
  sendSchema,
  goSchema,
  fetchSchema,
  appendSchema,
  prependSchema,
  triggerSchema,
  setSchema,
  // Tier 2: Content & variable operations
  takeSchema,
  makeSchema,
  cloneSchema,
  getCommandSchema,
  // Tier 3: Control flow & DOM
  callSchema,
  returnSchema,
  focusSchema,
  blurSchema,
} from '../generators';

// =============================================================================
// Generated Patterns (New Commands)
// =============================================================================

/**
 * Commands using generated patterns.
 * These don't have hand-crafted patterns, so we generate them.
 */
const generatedPatterns: LanguagePattern[] = [
  // Tier 1: Core commands
  ...generatePatternsForCommand(addSchema),
  ...generatePatternsForCommand(removeSchema),
  ...generatePatternsForCommand(showSchema),
  ...generatePatternsForCommand(hideSchema),
  ...generatePatternsForCommand(waitSchema),
  ...generatePatternsForCommand(logSchema),
  ...generatePatternsForCommand(incrementSchema),
  ...generatePatternsForCommand(decrementSchema),
  ...generatePatternsForCommand(sendSchema),
  ...generatePatternsForCommand(goSchema),
  ...generatePatternsForCommand(fetchSchema),
  ...generatePatternsForCommand(appendSchema),
  ...generatePatternsForCommand(prependSchema),
  ...generatePatternsForCommand(triggerSchema),
  ...generatePatternsForCommand(setSchema),
  // Tier 2: Content & variable operations
  ...generatePatternsForCommand(takeSchema),
  ...generatePatternsForCommand(makeSchema),
  ...generatePatternsForCommand(cloneSchema),
  ...generatePatternsForCommand(getCommandSchema),
  // Tier 3: Control flow & DOM
  ...generatePatternsForCommand(callSchema),
  ...generatePatternsForCommand(returnSchema),
  ...generatePatternsForCommand(focusSchema),
  ...generatePatternsForCommand(blurSchema),
];

// =============================================================================
// All Patterns
// =============================================================================

/**
 * All registered patterns across all languages.
 * Combines hand-crafted (validated) with generated (new).
 */
export const allPatterns: LanguagePattern[] = [
  // Hand-crafted patterns (validated, higher priority)
  ...togglePatterns,
  ...putPatterns,
  ...eventHandlerPatterns,
  // Generated patterns (new commands)
  ...generatedPatterns,
];

// =============================================================================
// Pattern Lookup
// =============================================================================

/**
 * Get all patterns for a specific language.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  return allPatterns.filter(p => p.language === language);
}

/**
 * Get patterns for a specific language and command.
 */
export function getPatternsForLanguageAndCommand(
  language: string,
  command: ActionType
): LanguagePattern[] {
  return allPatterns
    .filter(p => p.language === language && p.command === command)
    .sort((a, b) => b.priority - a.priority); // Sort by priority descending
}

/**
 * Get all supported languages.
 */
export function getSupportedLanguages(): string[] {
  const languages = new Set(allPatterns.map(p => p.language));
  return Array.from(languages);
}

/**
 * Get all supported commands.
 */
export function getSupportedCommands(): ActionType[] {
  const commands = new Set(allPatterns.map(p => p.command));
  return Array.from(commands) as ActionType[];
}

/**
 * Find a pattern by ID.
 */
export function getPatternById(id: string): LanguagePattern | undefined {
  return allPatterns.find(p => p.id === id);
}

// =============================================================================
// Pattern Statistics (for debugging/tooling)
// =============================================================================

export interface PatternStats {
  totalPatterns: number;
  byLanguage: Record<string, number>;
  byCommand: Record<string, number>;
}

/**
 * Get statistics about registered patterns.
 */
export function getPatternStats(): PatternStats {
  const byLanguage: Record<string, number> = {};
  const byCommand: Record<string, number> = {};

  for (const pattern of allPatterns) {
    byLanguage[pattern.language] = (byLanguage[pattern.language] || 0) + 1;
    byCommand[pattern.command] = (byCommand[pattern.command] || 0) + 1;
  }

  return {
    totalPatterns: allPatterns.length,
    byLanguage,
    byCommand,
  };
}

// =============================================================================
// Re-exports
// =============================================================================

export {
  togglePatterns,
  getTogglePatternsForLanguage,
  putPatterns,
  getPutPatternsForLanguage,
  eventHandlerPatterns,
  getEventHandlerPatternsForLanguage,
  eventNameTranslations,
  normalizeEventName,
};
