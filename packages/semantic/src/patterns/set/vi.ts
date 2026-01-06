/**
 * Vietnamese Set Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese set patterns.
 */
export function getSetPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'set-vi-full',
      language: 'vi',
      command: 'set',
      priority: 100,
      template: {
        format: 'gán {target} thành {value}',
        tokens: [
          { type: 'literal', value: 'gán', alternatives: ['thiết lập', 'đặt giá trị'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'thành', alternatives: ['bằng', 'là'] },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'thành', markerAlternatives: ['bằng', 'là'] },
      },
    },
    {
      id: 'set-vi-simple',
      language: 'vi',
      command: 'set',
      priority: 90,
      template: {
        format: 'đặt {target} là {value}',
        tokens: [
          { type: 'literal', value: 'đặt' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'là' },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'là' },
      },
    },
  ];
}
