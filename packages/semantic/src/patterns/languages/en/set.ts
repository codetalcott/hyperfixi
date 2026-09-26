/**
 * English Set Patterns
 *
 * Hand-crafted patterns for set command with possessive syntax support.
 */

import type { ExpectedType, LanguagePattern } from '../../../types';
import { setSchema } from '../../../generators/command-schemas';

/**
 * The value takes what the schema's does. The narrower copy matched only the
 * property word of `set x to the value of #d1` and left `of #d1` behind, so
 * the generated pattern, which reads the possessive, never ran.
 */
const PATIENT_TYPES: ExpectedType[] = [
  ...(setSchema.roles.find(role => role.role === 'patient')?.expectedTypes ?? []),
];

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
 * - set x to the value of #d1 (a possessive value)
 */
export const setPossessiveEnglish: LanguagePattern = {
  id: 'set-en-possessive',
  language: 'en',
  command: 'set',
  priority: 100,
  template: {
    // Optional trailing `on <scope>` (S1 tabs-aria): `set @aria-selected to
    // "false" on .tab` writes the attribute to every scope-matched element.
    // This hand-crafted pattern ties the generated `set-en-generated` on
    // priority and wins on stable-sort order, so the scope group must live
    // here too or `on .tab` is silently dropped.
    format: 'set {destination} to {patient} [on {scope}]',
    tokens: [
      { type: 'literal', value: 'set' },
      // Role token with property-path support for possessive syntax
      {
        type: 'role',
        role: 'destination',
        expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
      },
      { type: 'literal', value: 'to' },
      { type: 'role', role: 'patient', expectedTypes: PATIENT_TYPES },
      {
        type: 'group',
        optional: true,
        tokens: [
          { type: 'literal', value: 'on' },
          { type: 'role', role: 'scope', optional: true, expectedTypes: ['selector', 'reference'] },
        ],
      },
    ],
  },
  extraction: {
    destination: { position: 1 },
    patient: { marker: 'to' },
    scope: { marker: 'on' },
  },
};

/**
 * All English set patterns.
 */
export const setPatternsEn: LanguagePattern[] = [setPossessiveEnglish];
