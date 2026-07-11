/**
 * Grammar-Transformed Patterns (Consolidated)
 *
 * Patterns for SOV/VSO grammar-transformed output that the schema generators
 * don't cover. Most languages rely on auto-generation from profiles; entries
 * here are corpus-shaped one-offs.
 *
 * Phase 3.2: Consolidated from 4 files into single file.
 */

import type { LanguagePattern } from '../types';

/**
 * Get grammar-transformed patterns for a specific language.
 */
export function getGrammarTransformedPatternsForLanguage(language: string): LanguagePattern[] {
  if (language === 'qu') {
    return [
      // go-url: the qu render fronts the whole destination phrase (`url
      // "/page" man ñitiy pi riy`); the generated `go-qu-generated`
      // ({destination} man riy) skipped the leading `url` word as noise and
      // bound only the quoted string — destination:literal vs the en
      // reference's destination:expression (R1 deferred-tail qu tail).
      // Anchoring the `url` head keeps the pair together and re-types the
      // capture as the expression the en side produces.
      {
        id: 'go-qu-url-dest',
        language: 'qu',
        command: 'go',
        priority: 105,
        template: {
          format: 'url {destination} man riy',
          tokens: [
            { type: 'literal', value: 'url' },
            { type: 'role', role: 'destination', expectedTypes: ['literal', 'expression'] },
            { type: 'literal', value: 'man', alternatives: ['pa'] },
            { type: 'literal', value: 'riy', alternatives: ['puriy'] },
          ],
        },
        extraction: {
          destination: {
            position: 1,
            transform: raw => ({ type: 'expression', raw: `url ${raw}` }),
          },
        },
      },
    ];
  }
  return [];
}
