/**
 * Tagalog Tokenizer
 *
 * Tokenizes Tagalog hyperscript input.
 * Word order: VSO
 * Direction: ltr
 * Uses spaces: true
 *
 * This tokenizer derives keywords from the Tagalog profile (single source of truth)
 * with extras for literals, positional words, and event names.
 */

import type { TokenKind } from '../types';
import type { KeywordEntry } from './base';
import { BaseTokenizer } from './base';
import { tagalogProfile } from '../generators/profiles/tl';
import { tagalogMorphologicalNormalizer } from './morphology/tagalog-normalizer';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createTagalogExtractors } from './extractors/tagalog-keyword';

// =============================================================================
// Tagalog-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 */
const TAGALOG_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'totoo', normalized: 'true' },
  { native: 'mali', normalized: 'false' },
  { native: 'wala', normalized: 'null' },
  { native: 'hindi_tinukoy', normalized: 'undefined' },

  // Positional
  { native: 'una', normalized: 'first' },
  { native: 'huli', normalized: 'last' },
  { native: 'susunod', normalized: 'next' },
  { native: 'nakaraan', normalized: 'previous' },
  { native: 'pinakamalapit', normalized: 'closest' },
  { native: 'magulang', normalized: 'parent' },

  // Events
  { native: 'pindot', normalized: 'click' },
  { native: 'pagbabago', normalized: 'change' },
  { native: 'isumite', normalized: 'submit' },
  { native: 'input', normalized: 'input' },
  { native: 'karga', normalized: 'load' },
  { native: 'mag_scroll', normalized: 'scroll' },
  { native: 'kasama', normalized: 'inclusive' },
  { native: 'bukod', normalized: 'exclusive' },
  { native: 'karakter', normalized: 'characters' },
];

// =============================================================================
// Tagalog Tokenizer Implementation
// =============================================================================

export class TagalogTokenizer extends BaseTokenizer {
  readonly language = 'tl';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(tagalogProfile, TAGALOG_EXTRAS);
    // Set morphological normalizer for verb conjugation handling
    this.setNormalizer(tagalogMorphologicalNormalizer);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createTagalogExtractors()); // Tagalog keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    // Check event modifiers BEFORE selectors (.once vs .active)
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('.') ||
      token.startsWith('#') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith(':')) return 'identifier';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^-?\d/.test(token)) return 'literal';
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';
    return 'identifier';
  }
}

export const tagalogTokenizer = new TagalogTokenizer();
