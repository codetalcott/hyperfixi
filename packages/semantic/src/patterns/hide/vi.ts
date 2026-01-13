/**
 * Vietnamese Hide Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese hide patterns.
 */
export function getHidePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'hide-vi-full',
      language: 'vi',
      command: 'hide',
      priority: 100,
      template: {
        format: 'ẩn {patient} với {effect}',
        tokens: [
          { type: 'literal', value: 'ẩn', alternatives: ['che', 'giấu'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'với' },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'với' },
      },
    },
    {
      id: 'hide-vi-simple',
      language: 'vi',
      command: 'hide',
      priority: 90,
      template: {
        format: 'ẩn {patient}',
        tokens: [
          { type: 'literal', value: 'ẩn', alternatives: ['che', 'giấu'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
