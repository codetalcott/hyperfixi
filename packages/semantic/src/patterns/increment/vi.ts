/**
 * Vietnamese Increment Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese increment patterns.
 */
export function getIncrementPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'increment-vi-full',
      language: 'vi',
      command: 'increment',
      priority: 100,
      template: {
        format: 'tăng {target} thêm {amount}',
        tokens: [
          { type: 'literal', value: 'tăng', alternatives: ['tăng lên'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'thêm', alternatives: ['lên'] },
            { type: 'role', role: 'quantity' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'thêm', markerAlternatives: ['lên'], default: { type: 'literal', value: '1' } },
      },
    },
    {
      id: 'increment-vi-simple',
      language: 'vi',
      command: 'increment',
      priority: 90,
      template: {
        format: 'tăng {target}',
        tokens: [
          { type: 'literal', value: 'tăng', alternatives: ['tăng lên'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: '1' } },
      },
    },
  ];
}
