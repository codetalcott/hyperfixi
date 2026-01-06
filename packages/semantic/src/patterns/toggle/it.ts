/**
 * Italian Toggle Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian toggle patterns.
 */
export function getTogglePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'toggle-it-full',
      language: 'it',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'commutare {patient} su {target}',
        tokens: [
          { type: 'literal', value: 'commutare', alternatives: ['alternare', 'toggle', 'cambiare'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'su', alternatives: ['in', 'di'] },
            { type: 'role', role: 'destination' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'su', markerAlternatives: ['in', 'di'], default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-it-simple',
      language: 'it',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'commutare {patient}',
        tokens: [
          { type: 'literal', value: 'commutare', alternatives: ['alternare', 'toggle', 'cambiare'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
