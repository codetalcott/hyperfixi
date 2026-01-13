/**
 * English Set Patterns
 *
 * Hand-crafted patterns for set command with possessive syntax support.
 */

import type { LanguagePattern } from '../../../types';

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
export const setPossessiveEnglish: LanguagePattern = {
  id: 'set-en-possessive',
  language: 'en',
  command: 'set',
  priority: 100, // Higher than generated setSchema (80)
  template: {
    format: 'set {destination} to {patient}',
    tokens: [
      { type: 'literal', value: 'set' },
      // Role token with property-path support for possessive syntax
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
 * All English set patterns.
 */
export const setPatternsEn: LanguagePattern[] = [setPossessiveEnglish];
