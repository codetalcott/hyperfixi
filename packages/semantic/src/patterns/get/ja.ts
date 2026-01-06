/**
 * Japanese Get Patterns
 *
 * Hand-crafted patterns for "get" command.
 * Japanese: #element を 取得
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Japanese get patterns.
 */
export function getGetPatternsJa(): LanguagePattern[] {
  return [
    {
      id: 'get-ja-full',
      language: 'ja',
      command: 'get',
      priority: 100,
      template: {
        format: '{source} を 取得',
        tokens: [
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: '取得', alternatives: ['取得する', 'ゲット', 'ゲットする', '得る', '取る'] },
        ],
      },
      extraction: {
        source: { position: 0 },
      },
    },
    {
      id: 'get-ja-simple',
      language: 'ja',
      command: 'get',
      priority: 90,
      template: {
        format: '取得 {source}',
        tokens: [
          { type: 'literal', value: '取得', alternatives: ['取得する'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}
