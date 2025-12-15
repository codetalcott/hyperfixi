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
  // Tier 4: DOM Content Manipulation
  swapSchema,
  morphSchema,
  // Tier 5: Control flow & Behavior system
  haltSchema,
  behaviorSchema,
  installSchema,
  measureSchema,
} from '../generators';

// =============================================================================
// Hand-crafted Fetch Simple Pattern (English only)
// =============================================================================

/**
 * English: "fetch /url as json" with response type.
 * This pattern has higher priority to capture the "as json" modifier.
 */
const fetchWithResponseTypeEnglish: LanguagePattern = {
  id: 'fetch-en-with-response-type',
  language: 'en',
  command: 'fetch',
  priority: 90, // Higher than simple pattern (80) to capture "as" modifier first
  template: {
    format: 'fetch {source} as {responseType}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'as' },
      // json/text/html are identifiers not keywords, so we need to accept 'expression' type
      { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    source: { position: 1 },
    responseType: { marker: 'as' },
  },
};

/**
 * English: "fetch /url" without "from" preposition.
 * Official hyperscript allows bare URL without "from".
 * Lower priority so it's tried after the response type pattern.
 */
const fetchSimpleEnglish: LanguagePattern = {
  id: 'fetch-en-simple',
  language: 'en',
  command: 'fetch',
  priority: 80, // Lower than response type pattern (90) - fallback when "as" not present
  template: {
    format: 'fetch {source}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source' },
    ],
  },
  extraction: {
    source: { position: 1 },
  },
};

// =============================================================================
// Hand-crafted Swap Pattern (English only)
// =============================================================================

/**
 * English: "swap <strategy> <target>" without prepositions.
 * Examples:
 * - swap delete #item
 * - swap innerHTML #target
 * - swap outerHTML me
 */
const swapSimpleEnglish: LanguagePattern = {
  id: 'swap-en-handcrafted',
  language: 'en',
  command: 'swap',
  priority: 110, // Higher than generated patterns
  template: {
    format: 'swap {method} {destination}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'method' },
      { type: 'role', role: 'destination' },
    ],
  },
  extraction: {
    method: { position: 1 },
    destination: { position: 2 },
  },
};

// =============================================================================
// Hand-crafted Repeat Until Event Patterns (English only)
// =============================================================================

/**
 * English: "repeat until event pointerup from document"
 * Full form with event source specification.
 * Higher priority to capture the complete "until event X from Y" syntax.
 */
const repeatUntilEventFromEnglish: LanguagePattern = {
  id: 'repeat-en-until-event-from',
  language: 'en',
  command: 'repeat',
  priority: 120, // Highest priority - most specific pattern
  template: {
    format: 'repeat until event {event} from {source}',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'from' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
    ],
  },
  extraction: {
    event: { marker: 'event' },
    source: { marker: 'from' },
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

/**
 * English: "repeat until event pointerup"
 * Simple event termination without source.
 */
const repeatUntilEventEnglish: LanguagePattern = {
  id: 'repeat-en-until-event',
  language: 'en',
  command: 'repeat',
  priority: 110, // Lower than "from" variant, but higher than quantity-based repeat
  template: {
    format: 'repeat until event {event}',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    event: { marker: 'event' },
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

// =============================================================================
// Hand-crafted Set Patterns (English)
// =============================================================================

/**
 * English: "set {target} to {value}"
 * Handles all set command variants including possessive syntax.
 * Higher priority than generated setSchema to capture property-path types.
 *
 * Examples:
 * - set x to 5 (simple variable)
 * - set :localVar to 'hello' (local scope)
 * - set #el's *opacity to 0.5 (possessive CSS property)
 * - set my innerHTML to 'content' (possessive reference)
 */
const setPossessiveEnglish: LanguagePattern = {
  id: 'set-en-possessive',
  language: 'en',
  command: 'set',
  priority: 100, // Higher than generated setSchema (80)
  template: {
    format: 'set {destination} to {patient}',
    tokens: [
      { type: 'literal', value: 'set' },
      // Role token with property-path support for possessive syntax
      { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
      { type: 'literal', value: 'to' },
      { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
    ],
  },
  extraction: {
    destination: { position: 1 },
    patient: { marker: 'to' },
  },
};

// =============================================================================
// Hand-crafted For Loop Patterns (English)
// =============================================================================

/**
 * English: "for {variable} in {collection}"
 * Basic for-each iteration pattern.
 *
 * Examples:
 * - for item in items
 * - for x in .elements
 * - for user in users
 */
const forEnglish: LanguagePattern = {
  id: 'for-en-basic',
  language: 'en',
  command: 'for',
  priority: 100,
  template: {
    format: 'for {patient} in {source}',
    tokens: [
      { type: 'literal', value: 'for' },
      { type: 'role', role: 'patient', expectedTypes: ['expression', 'reference'] }, // Loop variable
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'expression', 'reference'] }, // Collection
    ],
  },
  extraction: {
    patient: { position: 1 },
    source: { marker: 'in' },
    loopType: { default: { type: 'literal', value: 'for' } },
  },
};

// =============================================================================
// Hand-crafted Temporal Expression Patterns (English Idiom Support)
// =============================================================================

/**
 * English: "in 2s toggle .active" - Natural temporal delay
 * Transforms to: wait 2s then toggle .active
 *
 * This is a beginner-friendly idiom for delayed execution.
 * Supports: 2s, 500ms, 2 seconds, 500 milliseconds
 */
const temporalInEnglish: LanguagePattern = {
  id: 'temporal-en-in',
  language: 'en',
  command: 'wait',
  priority: 95, // Lower than standard wait patterns
  template: {
    format: 'in {duration}',
    tokens: [
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

/**
 * English: "after 2s show #tooltip" - Natural temporal delay (alternative)
 * Transforms to: wait 2s then show #tooltip
 */
const temporalAfterEnglish: LanguagePattern = {
  id: 'temporal-en-after',
  language: 'en',
  command: 'wait',
  priority: 95, // Lower than standard wait patterns
  template: {
    format: 'after {duration}',
    tokens: [
      { type: 'literal', value: 'after' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

// =============================================================================
// Hand-crafted If/Unless Patterns (English)
// =============================================================================

/**
 * English: "if {condition}"
 * Basic conditional pattern. Body parsing handled by main parser.
 *
 * Examples:
 * - if active toggle .class
 * - if x > 5 then ... end
 * - if myVar
 */
const ifEnglish: LanguagePattern = {
  id: 'if-en-basic',
  language: 'en',
  command: 'if',
  priority: 100,
  template: {
    format: 'if {condition}',
    tokens: [
      { type: 'literal', value: 'if' },
      { type: 'role', role: 'condition', expectedTypes: ['expression', 'reference', 'selector'] },
    ],
  },
  extraction: {
    condition: { position: 1 },
  },
};

/**
 * English: "unless {condition}"
 * Negated conditional pattern. Body parsing handled by main parser.
 *
 * Examples:
 * - unless disabled submit
 * - unless x == 0 then ... end
 */
const unlessEnglish: LanguagePattern = {
  id: 'unless-en-basic',
  language: 'en',
  command: 'unless',
  priority: 100,
  template: {
    format: 'unless {condition}',
    tokens: [
      { type: 'literal', value: 'unless' },
      { type: 'role', role: 'condition', expectedTypes: ['expression', 'reference', 'selector'] },
    ],
  },
  extraction: {
    condition: { position: 1 },
  },
};

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
  // Tier 4: DOM Content Manipulation
  ...generatePatternsForCommand(swapSchema),
  ...generatePatternsForCommand(morphSchema),
  // Tier 5: Control flow & Behavior system
  ...generatePatternsForCommand(haltSchema),
  ...generatePatternsForCommand(behaviorSchema),
  ...generatePatternsForCommand(installSchema),
  ...generatePatternsForCommand(measureSchema),
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
  fetchWithResponseTypeEnglish, // fetch /url as json (higher priority)
  fetchSimpleEnglish, // fetch /url without "from" (lower priority)
  swapSimpleEnglish,  // swap <strategy> <target>
  repeatUntilEventFromEnglish, // repeat until event X from Y (highest priority)
  repeatUntilEventEnglish, // repeat until event X (lower priority)
  setPossessiveEnglish, // set X to Y with possessive support (higher priority)
  forEnglish, // for X in Y iteration (higher priority)
  ifEnglish, // if {condition} conditional (higher priority)
  unlessEnglish, // unless {condition} negated conditional (higher priority)
  temporalInEnglish, // in 2s {command} - natural delay idiom
  temporalAfterEnglish, // after 2s {command} - natural delay idiom
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
