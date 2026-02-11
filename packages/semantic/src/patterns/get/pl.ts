/**
 * Polish Get Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish get patterns.
 */
export function getGetPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'get-pl-full',
      language: 'pl',
      command: 'get',
      priority: 100,
      template: {
        format: 'uzyskaj {patient} z {source}',
        tokens: [
          { type: 'literal', value: 'uzyskaj' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'z', alternatives: ['od', 'ze'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'z', markerAlternatives: ['od', 'ze'] },
      },
    },
    {
      id: 'get-pl-simple',
      language: 'pl',
      command: 'get',
      priority: 90,
      template: {
        format: 'uzyskaj {patient}',
        tokens: [
          { type: 'literal', value: 'uzyskaj' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
