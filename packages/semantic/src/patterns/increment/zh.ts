/**
 * Chinese Increment Patterns
 *
 * Hand-crafted patterns for "increment" command.
 * Chinese: 增加 counter
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Chinese increment patterns.
 */
export function getIncrementPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'increment-zh-full',
      language: 'zh',
      command: 'increment',
      priority: 100,
      template: {
        format: '增加 {patient}',
        tokens: [
          { type: 'literal', value: '增加', alternatives: ['递增', '加', '增', 'increment'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
