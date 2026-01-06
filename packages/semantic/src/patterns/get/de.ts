/**
 * German Get Patterns
 *
 * Hand-crafted patterns for "get" command.
 * German: hole #element
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German get patterns.
 */
export function getGetPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'get-de-full',
      language: 'de',
      command: 'get',
      priority: 100,
      template: {
        format: 'hole {source}',
        tokens: [
          { type: 'literal', value: 'hole', alternatives: ['holen', 'get', 'bekomme', 'bekommen'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}
