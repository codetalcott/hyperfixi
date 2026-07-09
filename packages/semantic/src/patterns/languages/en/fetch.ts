/**
 * English Fetch Patterns
 *
 * Hand-crafted patterns for fetch command with response type support.
 */

import type { LanguagePattern } from '../../../types';

/**
 * English: "fetch /url as json" with response type.
 * This pattern has higher priority to capture the "as json" modifier.
 */
export const fetchWithResponseTypeEnglish: LanguagePattern = {
  id: 'fetch-en-with-response-type',
  language: 'en',
  command: 'fetch',
  priority: 90, // Higher than simple pattern (80) to capture "as" modifier first
  template: {
    format: 'fetch {source} as {responseType}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'as' },
      // json/text/html are identifiers not keywords, so we need to accept 'expression' type
      { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    source: { position: 1 },
    responseType: { marker: 'as' },
  },
};

/**
 * English: "fetch /url with { method: 'POST' } as json" — request options plus
 * response type.
 *
 * `style` carries the RequestInit options object (it is the role whose English
 * marker is `with`). It is REQUIRED here rather than an optional group in the
 * patterns above: an optional role would raise those patterns' role-coverage
 * denominator and drop the confidence of every plain `fetch /url as json` parse.
 * Highest priority, since it is the most specific shape.
 */
export const fetchWithOptionsAndResponseTypeEnglish: LanguagePattern = {
  id: 'fetch-en-with-options-as',
  language: 'en',
  command: 'fetch',
  priority: 95,
  template: {
    format: 'fetch {source} with {style} as {responseType}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'with', alternatives: ['by', 'using'] },
      // expression-ONLY: routes `{ … }` to the object-literal fold, which keeps
      // the source text intact for the expression parser.
      { type: 'role', role: 'style', expectedTypes: ['expression'] },
      { type: 'literal', value: 'as' },
      { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    source: { position: 1 },
    style: { marker: 'with' },
    responseType: { marker: 'as' },
  },
};

/**
 * English: "fetch /url with { method: 'POST' }" — request options, no `as`.
 */
export const fetchWithOptionsEnglish: LanguagePattern = {
  id: 'fetch-en-with-options',
  language: 'en',
  command: 'fetch',
  priority: 93, // Below the with+as pattern, above the response-type pattern (90)
  template: {
    format: 'fetch {source} with {style}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'with', alternatives: ['by', 'using'] },
      { type: 'role', role: 'style', expectedTypes: ['expression'] },
    ],
  },
  extraction: {
    source: { position: 1 },
    style: { marker: 'with' },
  },
};

/**
 * English: "fetch /url" without "from" preposition.
 * Official hyperscript allows bare URL without "from".
 * Lower priority so it's tried after the response type pattern.
 */
export const fetchSimpleEnglish: LanguagePattern = {
  id: 'fetch-en-simple',
  language: 'en',
  command: 'fetch',
  priority: 80, // Lower than response type pattern (90) - fallback when "as" not present
  template: {
    format: 'fetch {source}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source' },
    ],
  },
  extraction: {
    source: { position: 1 },
  },
};

/**
 * All English fetch patterns.
 */
export const fetchPatternsEn: LanguagePattern[] = [
  fetchWithOptionsAndResponseTypeEnglish,
  fetchWithOptionsEnglish,
  fetchWithResponseTypeEnglish,
  fetchSimpleEnglish,
];
