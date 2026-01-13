/**
 * Hindi Get Patterns
 *
 * Patterns for parsing "get" command in Hindi.
 */

import type { LanguagePattern } from '../../types';

export function getGetPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element से प्राप्त करें
    {
      id: 'get-hi-full',
      language: 'hi',
      command: 'get',
      priority: 100,
      template: {
        format: '{source} से प्राप्त करें',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'से' },
          { type: 'literal', value: 'प्राप्त', alternatives: ['पाएं'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        source: { position: 0 },
      },
    },
    // Simple pattern: प्राप्त #element
    {
      id: 'get-hi-simple',
      language: 'hi',
      command: 'get',
      priority: 90,
      template: {
        format: 'प्राप्त {source}',
        tokens: [
          { type: 'literal', value: 'प्राप्त', alternatives: ['पाएं'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}
