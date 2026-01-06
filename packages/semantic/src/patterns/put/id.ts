/**
 * Indonesian Put Patterns
 *
 * Hand-crafted patterns for "put" command.
 * Indonesian: taruh "halo" ke dalam #output
 *
 * Note: Indonesian uses two-word preposition "ke dalam" (into)
 * We support both the full form and simplified forms.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Indonesian put patterns.
 */
export function getPutPatternsId(): LanguagePattern[] {
  return [
    {
      id: 'put-id-full',
      language: 'id',
      command: 'put',
      priority: 100,
      template: {
        // Two-word preposition: "ke dalam"
        format: 'taruh {patient} ke dalam {destination}',
        tokens: [
          { type: 'literal', value: 'taruh', alternatives: ['letakkan', 'masukkan', 'tempatkan', 'put'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'ke' },
          { type: 'literal', value: 'dalam', alternatives: ['di'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 4 },
      },
    },
    {
      id: 'put-id-simple-ke',
      language: 'id',
      command: 'put',
      priority: 95,
      template: {
        // Simplified: just "ke" without "dalam"
        format: 'taruh {patient} ke {destination}',
        tokens: [
          { type: 'literal', value: 'taruh', alternatives: ['letakkan', 'masukkan', 'tempatkan'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'ke', alternatives: ['di', 'pada'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
    {
      id: 'put-id-di',
      language: 'id',
      command: 'put',
      priority: 90,
      template: {
        // Alternative with "di"
        format: 'taruh {patient} di {destination}',
        tokens: [
          { type: 'literal', value: 'taruh', alternatives: ['letakkan', 'masukkan'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'di' },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
  ];
}
