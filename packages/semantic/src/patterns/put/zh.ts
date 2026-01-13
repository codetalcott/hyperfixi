/**
 * Chinese Put Patterns
 *
 * Hand-crafted patterns for "put" command.
 * Chinese: 放置 "你好" 到 #output
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Chinese put patterns.
 */
export function getPutPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'put-zh-full',
      language: 'zh',
      command: 'put',
      priority: 100,
      template: {
        format: '放置 {patient} 到 {destination}',
        tokens: [
          { type: 'literal', value: '放置', alternatives: ['放', '放入', '置入', 'put'] },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '到', alternatives: ['在', '于', '入'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
    {
      id: 'put-zh-ba',
      language: 'zh',
      command: 'put',
      priority: 95,
      template: {
        format: '把 {patient} 放到 {destination}',
        tokens: [
          { type: 'literal', value: '把' },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '放到', alternatives: ['放在', '放入'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
  ];
}
