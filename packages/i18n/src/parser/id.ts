// packages/i18n/src/parser/id.ts

import { id } from '../dictionaries/id';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * Indonesian (Bahasa Indonesia) keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in Indonesian:
 * - `pada klik ganti .active` → parses as `on click toggle .active`
 * - `jika benar lalu log "Halo"` → parses as `if true then log "Hello"`
 *
 * Indonesian is an SVO language with:
 * - Agglutinative morphology (prefixes/suffixes)
 * - No grammatical gender
 * - Prepositions (like English)
 * - Relatively simple syntax
 *
 * @example
 * ```typescript
 * import { idKeywords } from '@lokascript/i18n/parser/id';
 *
 * idKeywords.resolve('alihkan'); // 'toggle'
 * idKeywords.toLocale('on'); // 'pada'
 * ```
 */
export const idKeywords: KeywordProvider = createKeywordProvider(id, 'id', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { id as idDictionary } from '../dictionaries/id';
