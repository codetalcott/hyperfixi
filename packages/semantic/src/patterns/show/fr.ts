/**
 * French Show Patterns
 *
 * Hand-crafted patterns for "show" command.
 * French: afficher #modal
 */

import type { LanguagePattern } from '../../types';

/**
 * Get French show patterns.
 */
export function getShowPatternsFr(): LanguagePattern[] {
  return [
    {
      id: 'show-fr-full',
      language: 'fr',
      command: 'show',
      priority: 100,
      template: {
        format: 'afficher {patient}',
        tokens: [
          { type: 'literal', value: 'afficher', alternatives: ['montrer', 'présenter', 'show'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
