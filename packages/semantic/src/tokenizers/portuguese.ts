/**
 * Portuguese Tokenizer
 *
 * Tokenizes Portuguese hyperscript input.
 * Portuguese is similar to Spanish:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Accent marks
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { portugueseProfile } from '../generators/profiles/portuguese';
import { PortugueseMorphologicalNormalizer } from './morphology/portuguese-normalizer';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createPortugueseExtractors } from './extractors/portuguese-keyword';

// =============================================================================
// Portuguese Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'em', // in, on
  'a', // to
  'de', // of, from
  'desde', // from, since
  'até', // until, to
  'ate', // until (no accent)
  'com', // with
  'sem', // without
  'por', // by, for
  'para', // for, to
  'sobre', // on, about
  'entre', // between
  'antes', // before
  'depois', // after
  'dentro', // inside
  'fora', // outside
  'ao', // a + o (contraction)
  'do', // de + o (contraction)
  'no', // em + o (contraction)
  'na', // em + a (contraction)
]);

// =============================================================================
// Portuguese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Accent-free variants for accessibility
 */
const PORTUGUESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'verdadeiro', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nulo', normalized: 'null' },
  { native: 'indefinido', normalized: 'undefined' },

  // Positional
  { native: 'primeiro', normalized: 'first' },
  { native: 'primeira', normalized: 'first' },
  { native: 'último', normalized: 'last' },
  { native: 'ultima', normalized: 'last' },
  { native: 'próximo', normalized: 'next' },
  { native: 'proximo', normalized: 'next' },
  { native: 'anterior', normalized: 'previous' },
  // Single token only — the tokenizer never matches multi-word natives, so the
  // old 'mais próximo' entries were dead. Fused form matches the i18n dict
  // ('próximo' alone is claimed by next).
  { native: 'maispróximo', normalized: 'closest' },
  { native: 'maisproximo', normalized: 'closest' },
  { native: 'pai', normalized: 'parent' },

  // Events
  { native: 'clique', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'entrada', normalized: 'input' },
  { native: 'mudança', normalized: 'change' },
  { native: 'mudanca', normalized: 'change' },
  { native: 'envio', normalized: 'submit' },
  { native: 'tecla baixo', normalized: 'keydown' },
  { native: 'tecla cima', normalized: 'keyup' },
  { native: 'mouse sobre', normalized: 'mouseover' },
  { native: 'mouse fora', normalized: 'mouseout' },
  { native: 'foco', normalized: 'focus' },
  { native: 'desfoque', normalized: 'blur' },
  { native: 'carregar', normalized: 'load' },
  { native: 'rolagem', normalized: 'scroll' },

  // Additional references
  { native: 'meu', normalized: 'my' },
  { native: 'minha', normalized: 'my' },
  { native: 'isso', normalized: 'it' },

  // Time units
  { native: 'segundo', normalized: 's' },
  { native: 'segundos', normalized: 's' },
  { native: 'milissegundo', normalized: 'ms' },
  { native: 'milissegundos', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minutos', normalized: 'm' },
  { native: 'hora', normalized: 'h' },
  { native: 'horas', normalized: 'h' },

  // Accent-free variants (for user convenience)
  { native: 'senao', normalized: 'else' },
  { native: 'transicao', normalized: 'transition' },
  { native: 'ate', normalized: 'until' },
  { native: 'entao', normalized: 'then' },
  { native: 'lancar', normalized: 'throw' },
  { native: 'assincrono', normalized: 'async' },
  { native: 'padrao', normalized: 'default' },
  { native: 'até que', normalized: 'until' },

  // Multi-word phrases
  { native: 'dentro de', normalized: 'into' },
  { native: 'inclusivo', normalized: 'inclusive' },
  { native: 'exclusivo', normalized: 'exclusive' },
];

// =============================================================================
// Portuguese Tokenizer Implementation
// =============================================================================

export class PortugueseTokenizer extends BaseTokenizer {
  readonly language = 'pt';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(portugueseProfile, PORTUGUESE_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new PortugueseMorphologicalNormalizer());

    // Register extractors (in priority order)
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createPortugueseExtractors()); // Portuguese keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

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
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';
    return 'identifier';
  }
}

export const portugueseTokenizer = new PortugueseTokenizer();
