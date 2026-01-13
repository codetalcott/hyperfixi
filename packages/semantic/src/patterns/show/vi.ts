/**
 * Vietnamese Show Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese show patterns.
 */
export function getShowPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'show-vi-full',
      language: 'vi',
      command: 'show',
      priority: 100,
      template: {
        format: 'hiển thị {patient} với {effect}',
        tokens: [
          { type: 'literal', value: 'hiển thị', alternatives: ['hiện'] },
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
      id: 'show-vi-simple',
      language: 'vi',
      command: 'show',
      priority: 90,
      template: {
        format: 'hiển thị {patient}',
        tokens: [
          { type: 'literal', value: 'hiển thị', alternatives: ['hiện'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
