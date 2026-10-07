/**
 * English `bind` with upstream's other connectives.
 *
 * Upstream reads `bind <left> and <right>` and `bind <left> with <right>` as it
 * reads `bind <left> to <right>`: the connective is not in the feature it
 * builds. Only `to` had a pattern, so the other two did not parse at all. This
 * one reads them; it ranks below the generated `to` pattern, which writes the
 * binding back (`bind $x to @data-x`), the spelling every language renders.
 */

import type { LanguagePattern } from '../../../types';

const SIDE_TYPES = ['reference', 'expression', 'selector', 'property-path'] as const;

export const bindAndEnglish: LanguagePattern = {
  id: 'bind-en-and',
  language: 'en',
  command: 'bind',
  priority: 90,
  template: {
    format: 'bind {destination} and {source}',
    tokens: [
      { type: 'literal', value: 'bind' },
      { type: 'role', role: 'destination', expectedTypes: [...SIDE_TYPES] },
      { type: 'literal', value: 'and', alternatives: ['with'] },
      { type: 'role', role: 'source', expectedTypes: [...SIDE_TYPES] },
    ],
  },
  extraction: {},
};
