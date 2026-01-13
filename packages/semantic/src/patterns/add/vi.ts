/**
 * Vietnamese Add Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese add patterns.
 */
export function getAddPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'add-vi-full',
      language: 'vi',
      command: 'add',
      priority: 100,
      template: {
        format: 'thêm {patient} vào {target}',
        tokens: [
          { type: 'literal', value: 'thêm', alternatives: ['bổ sung'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'vào', alternatives: ['cho'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'vào',
          markerAlternatives: ['cho'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-vi-simple',
      language: 'vi',
      command: 'add',
      priority: 90,
      template: {
        format: 'thêm {patient}',
        tokens: [
          { type: 'literal', value: 'thêm', alternatives: ['bổ sung'] },
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
