/**
 * Korean Get Patterns
 *
 * Hand-crafted patterns for "get" command.
 * Korean: #element 를 가져오기
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean get patterns.
 */
export function getGetPatternsKo(): LanguagePattern[] {
  return [
    {
      id: 'get-ko-full',
      language: 'ko',
      command: 'get',
      priority: 100,
      template: {
        format: '{source} 를 가져오기',
        tokens: [
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '가져오기', alternatives: ['가져오다', '얻다', '얻기', '취득', '취득하다'] },
        ],
      },
      extraction: {
        source: { position: 0 },
      },
    },
    {
      id: 'get-ko-simple',
      language: 'ko',
      command: 'get',
      priority: 90,
      template: {
        format: '가져오기 {source}',
        tokens: [
          { type: 'literal', value: '가져오기', alternatives: ['가져오다'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}
