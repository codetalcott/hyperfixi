// packages/i18n/src/parser/fr.ts

import { fr } from '../dictionaries/fr';
import { createKeywordProvider } from './create-provider';
import type { KeywordProvider } from './types';

/**
 * French keyword provider for the hyperscript parser.
 *
 * Enables parsing hyperscript written in French:
 * - `sur clic basculer .active` → parses as `on click toggle .active`
 * - `si vrai alors enregistrer "bonjour"` → parses as `if true then log "hello"`
 *
 * English keywords are also accepted (mixed mode), so:
 * - `sur click basculer .active` also works (French `sur` + English `click`)
 *
 * @example
 * ```typescript
 * import { frKeywords } from '@hyperfixi/i18n/parser/fr';
 * import { Parser } from '@hyperfixi/core';
 *
 * const parser = new Parser({ keywords: frKeywords });
 * parser.parse('sur clic basculer .active');
 * ```
 */
export const frKeywords: KeywordProvider = createKeywordProvider(fr, 'fr', {
  allowEnglishFallback: true,
});

// Re-export for convenience
export { fr as frDictionary } from '../dictionaries/fr';
