/**
 * Turkish Increment Patterns
 *
 * Hand-crafted patterns for "increment" command.
 * Turkish: counter artır (SOV order)
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish increment patterns.
 */
export function getIncrementPatternsTr(): LanguagePattern[] {
  return [
    {
      id: 'increment-tr-full',
      language: 'tr',
      command: 'increment',
      priority: 100,
      template: {
        format: '{patient} artır',
        tokens: [
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
          { type: 'literal', value: 'artır', alternatives: ['artir', 'artırmak', 'artirmak', 'arttır', 'increment'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    {
      id: 'increment-tr-svo',
      language: 'tr',
      command: 'increment',
      priority: 90,
      template: {
        format: 'artır {patient}',
        tokens: [
          { type: 'literal', value: 'artır', alternatives: ['artir', 'artırmak'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
