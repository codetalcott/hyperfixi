/**
 * Spanish Tokenizer
 *
 * Tokenizes Spanish hyperscript input.
 * Spanish is relatively straightforward as it:
 * - Uses space-separated words like English
 * - Has similar preposition structure (SVO)
 * - Uses accent marks that need proper handling
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { SpanishMorphologicalNormalizer } from './morphology/spanish-normalizer';
import { spanishProfile } from '../generators/profiles/spanish';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createSpanishExtractors } from './extractors/spanish-keyword';

// =============================================================================
// Spanish Prepositions (used in classifyToken)
// =============================================================================

/**
 * Spanish prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'en', // in, on
  'a', // to
  'de', // of, from
  'desde', // from
  'hasta', // until, to
  'con', // with
  'sin', // without
  'por', // by, for
  'para', // for
  'sobre', // on, about
  'entre', // between
  'antes', // before
  'después', // after
  'despues', // after (no accent)
  'dentro', // inside
  'fuera', // outside
  'al', // a + el (contraction)
  'del', // de + el (contraction)
]);

// =============================================================================
// Spanish Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Time units (segundo, minuto, hora with suffixes)
 * - Reference alternatives (mí with accent, destino for target)
 *
 * All other keywords (positional, events, commands, logical operators,
 * multi-word phrases) are now in the profile.
 */
const SPANISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals (not in profile - generic across all languages)
  { native: 'verdadero', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nulo', normalized: 'null' },
  { native: 'indefinido', normalized: 'undefined' },

  // Time units (not in profile - handled by number parser)
  { native: 'segundo', normalized: 's' },
  { native: 'segundos', normalized: 's' },
  { native: 'milisegundo', normalized: 'ms' },
  { native: 'milisegundos', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minutos', normalized: 'm' },
  { native: 'hora', normalized: 'h' },
  { native: 'horas', normalized: 'h' },

  // Reference alternatives (accent variation, synonym)
  { native: 'mí', normalized: 'me' }, // Accented form of mi
  { native: 'destino', normalized: 'target' }, // Synonym for objetivo
  { native: 'inclusivo', normalized: 'inclusive' },
  { native: 'exclusivo', normalized: 'exclusive' },
];

// =============================================================================
// Spanish Tokenizer Implementation
// =============================================================================

export class SpanishTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(spanishProfile, SPANISH_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new SpanishMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createSpanishExtractors()); // Spanish keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';
    // URLs (`/api/data`, `./x`, `http…`) — fetch sources. Without this the URL falls
    // through to `identifier` → typed `expression`, mismatching the en reference's
    // `fetch.source:literal` (the on/fetch source R1 residue in 14 space-using langs).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // tryMultiWordPhrase(), extractSpanishWord(), extractSpanishNumber() methods removed
  // Now handled by SpanishKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const spanishTokenizer = new SpanishTokenizer();
