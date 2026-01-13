/**
 * English Control Flow Patterns
 *
 * Hand-crafted patterns for for, if, and unless commands.
 */

import type { LanguagePattern } from '../../../types';

/**
 * English: "for {variable} in {collection}"
 * Basic for-each iteration pattern.
 *
 * Examples:
 * - for item in items
 * - for x in .elements
 * - for user in users
 */
export const forEnglish: LanguagePattern = {
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

/**
 * English: "if {condition}"
 * Basic conditional pattern. Body parsing handled by main parser.
 *
 * Examples:
 * - if active toggle .class
 * - if x > 5 then ... end
 * - if myVar
 */
export const ifEnglish: LanguagePattern = {
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
export const unlessEnglish: LanguagePattern = {
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
 * All English control flow patterns.
 */
export const controlFlowPatternsEn: LanguagePattern[] = [forEnglish, ifEnglish, unlessEnglish];
