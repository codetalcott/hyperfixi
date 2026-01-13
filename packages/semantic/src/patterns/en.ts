/**
 * English Patterns Module
 *
 * Builds all patterns for English language.
 * This module is imported by languages/en.ts and only includes English patterns.
 */

import type { LanguagePattern } from '../types';
import { englishProfile } from '../generators/profiles/english';
import { generatePatternsForLanguage } from '../generators/pattern-generator';

// Import directly from per-language files for tree-shaking
import { getTogglePatternsEn } from './toggle/en';
import { getPutPatternsEn } from './put/en';
import { getEventHandlerPatternsEn } from './event-handler/en';

// =============================================================================
// Hand-crafted English-only patterns
// =============================================================================

/**
 * English: "fetch /url as json" with response type.
 */
const fetchWithResponseTypeEnglish: LanguagePattern = {
  id: 'fetch-en-with-response-type',
  language: 'en',
  command: 'fetch',
  priority: 90,
  template: {
    format: 'fetch {source} as {responseType}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'as' },
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
 */
const fetchSimpleEnglish: LanguagePattern = {
  id: 'fetch-en-simple',
  language: 'en',
  command: 'fetch',
  priority: 80,
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

/**
 * English: "swap <strategy> <target>" without prepositions.
 */
const swapSimpleEnglish: LanguagePattern = {
  id: 'swap-en-handcrafted',
  language: 'en',
  command: 'swap',
  priority: 110,
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

/**
 * English: "repeat until event pointerup from document"
 */
const repeatUntilEventFromEnglish: LanguagePattern = {
  id: 'repeat-en-until-event-from',
  language: 'en',
  command: 'repeat',
  priority: 120,
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
 */
const repeatUntilEventEnglish: LanguagePattern = {
  id: 'repeat-en-until-event',
  language: 'en',
  command: 'repeat',
  priority: 110,
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

/**
 * English: "set {target} to {value}" with possessive syntax support
 */
const setPossessiveEnglish: LanguagePattern = {
  id: 'set-en-possessive',
  language: 'en',
  command: 'set',
  priority: 100,
  template: {
    format: 'set {destination} to {patient}',
    tokens: [
      { type: 'literal', value: 'set' },
      {
        type: 'role',
        role: 'destination',
        expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
      },
      { type: 'literal', value: 'to' },
      { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
    ],
  },
  extraction: {
    destination: { position: 1 },
    patient: { marker: 'to' },
  },
};

/**
 * English: "for {variable} in {collection}"
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
      { type: 'role', role: 'patient', expectedTypes: ['expression', 'reference'] },
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'expression', 'reference'] },
    ],
  },
  extraction: {
    patient: { position: 1 },
    source: { marker: 'in' },
    loopType: { default: { type: 'literal', value: 'for' } },
  },
};

/**
 * English: "if {condition}"
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

/**
 * English: "in 2s toggle .active" - Natural temporal delay
 */
const temporalInEnglish: LanguagePattern = {
  id: 'temporal-en-in',
  language: 'en',
  command: 'wait',
  priority: 95,
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
 * English: "after 2s show #tooltip" - Natural temporal delay
 */
const temporalAfterEnglish: LanguagePattern = {
  id: 'temporal-en-after',
  language: 'en',
  command: 'wait',
  priority: 95,
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
// Build All English Patterns
// =============================================================================

/**
 * Build all English patterns.
 * Called once when the English language module is imported.
 */
export function buildEnglishPatterns(): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // 1. Hand-crafted patterns
  patterns.push(...getTogglePatternsEn());
  patterns.push(...getPutPatternsEn());
  patterns.push(...getEventHandlerPatternsEn());

  // 2. English-only hand-crafted patterns
  patterns.push(
    fetchWithResponseTypeEnglish,
    fetchSimpleEnglish,
    swapSimpleEnglish,
    repeatUntilEventFromEnglish,
    repeatUntilEventEnglish,
    setPossessiveEnglish,
    forEnglish,
    ifEnglish,
    unlessEnglish,
    temporalInEnglish,
    temporalAfterEnglish
  );

  // 3. Generated patterns for English
  const generatedPatterns = generatePatternsForLanguage(englishProfile);
  patterns.push(...generatedPatterns);

  return patterns;
}
