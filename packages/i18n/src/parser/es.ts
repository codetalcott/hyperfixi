// packages/i18n/src/parser/es.ts

import { es } from '../dictionaries/es';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Spanish keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Spanish:
 * - `en clic alternar .active` → parses as `on click toggle .active`
 * - `si verdadero entonces registrar "hola"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `en click alternar .active` also works (Spanish `en` + English `click`)
 *
 * @example
 * ```typescript
 * import { esKeywords } from '@hyperfixi/i18n/parser/es';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: esKeywords });
 * parser.parse('en clic alternar .active');
 * ```
 */
export const esKeywords: KeywordProvider = createKeywordProvider(es, 'es', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { es as esDictionary } from '../dictionaries/es';
