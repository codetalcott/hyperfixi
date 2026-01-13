/**
 * Vietnamese Get Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese get patterns.
 */
export function getGetPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'get-vi-full',
      language: 'vi',
      command: 'get',
      priority: 100,
      template: {
        format: 'lấy giá trị của {target}',
        tokens: [
          { type: 'literal', value: 'lấy giá trị', alternatives: ['nhận', 'lấy'] },
          { type: 'group', optional: true, tokens: [{ type: 'literal', value: 'của' }] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'get-vi-simple',
      language: 'vi',
      command: 'get',
      priority: 90,
      template: {
        format: 'lấy {target}',
        tokens: [
          { type: 'literal', value: 'lấy', alternatives: ['nhận', 'lấy giá trị'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
