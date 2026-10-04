// packages/i18n/src/parser/pt.ts

import { pt } from '../dictionaries/pt';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Portuguese (Português) keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Portuguese:
 * - `em clique alternar .active` → parses as `on click toggle .active`
 * - `se verdadeiro então registrar "Olá"` → parses as `if true then log "Hello"`
 *
 * Portuguese is an SVO language with:
 * - High mutual intelligibility with Spanish
 * - Prepositions (like English and Spanish)
 * - Gender agreement (simplified for hyperscript)
 * - Fusional morphology
 *
 * Direct translation is supported between Portuguese and Spanish,
 * avoiding the English pivot for more natural translations.
 *
 * @example
 * ```typescript
 * import { ptKeywords } from '@lokascript/i18n/parser/pt';
 *
 * ptKeywords.resolve('alternar'); // 'toggle'
 * ptKeywords.toLocale('on'); // 'em'
 * ```
 */
export const ptKeywords: KeywordProvider = createKeywordProvider(pt, 'pt', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { pt as ptDictionary } from '../dictionaries/pt';
