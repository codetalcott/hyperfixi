/**
 * Polish Put Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish put patterns.
 */
export function getPutPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'put-pl-full',
      language: 'pl',
      command: 'put',
      priority: 100,
      template: {
        format: 'umieść {patient} w {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw', 'włóż', 'wloz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'w', alternatives: ['do', 'na'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'w', markerAlternatives: ['do', 'na'] },
      },
    },
    {
      id: 'put-pl-before',
      language: 'pl',
      command: 'put',
      priority: 95,
      template: {
        format: 'umieść {patient} przed {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'przed' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'przed' },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-pl-after',
      language: 'pl',
      command: 'put',
      priority: 95,
      template: {
        format: 'umieść {patient} po {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'po' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'po' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}
