/**
 * Arabic Get Patterns
 *
 * Hand-crafted patterns for "get" command.
 * Arabic: احصل على #element
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Arabic get patterns.
 */
export function getGetPatternsAr(): LanguagePattern[] {
  return [
    {
      id: 'get-ar-full',
      language: 'ar',
      command: 'get',
      priority: 100,
      template: {
        format: 'احصل على {source}',
        tokens: [
          { type: 'literal', value: 'احصل', alternatives: ['أحصل', 'خذ', 'أخذ', 'جلب'] },
          { type: 'literal', value: 'على', alternatives: ['علي'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 2 },
      },
    },
    {
      id: 'get-ar-simple',
      language: 'ar',
      command: 'get',
      priority: 90,
      template: {
        format: 'احصل {source}',
        tokens: [
          { type: 'literal', value: 'احصل', alternatives: ['أحصل', 'خذ'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}
