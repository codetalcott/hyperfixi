/**
 * Malay Tokenizer
 *
 * Tokenizes Malay hyperscript input.
 * Word order: SVO
 * Direction: ltr
 * Uses spaces: true
 *
 * This tokenizer derives keywords from the Malay profile (single source of truth)
 * with extras for literals, positional words, and event names.
 */

import type { TokenKind } from '../types';
import type { KeywordEntry } from './base';
import { BaseTokenizer } from './base';
import { malayProfile } from '../generators/profiles/ms';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createMalayExtractors } from './extractors/malay-keyword';

// =============================================================================
// Malay-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 */
const MALAY_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'benar', normalized: 'true' },
  { native: 'salah', normalized: 'false' },
  { native: 'kosong', normalized: 'null' },
  { native: 'tak_tentu', normalized: 'undefined' },

  // Positional
  { native: 'pertama', normalized: 'first' },
  { native: 'terakhir', normalized: 'last' },
  { native: 'seterusnya', normalized: 'next' },
  { native: 'sebelumnya', normalized: 'previous' },
  { native: 'terdekat', normalized: 'closest' },
  { native: 'induk', normalized: 'parent' },

  // Events
  { native: 'klik', normalized: 'click' },
  { native: 'berubah', normalized: 'change' },
  { native: 'ubah', normalized: 'change' }, // Alternative for change
  { native: 'hantar', normalized: 'submit' },
  { native: 'input', normalized: 'input' },
  { native: 'masuk', normalized: 'input' }, // Alternative for input (means "enter")
  { native: 'muat', normalized: 'load' },
  { native: 'tatal', normalized: 'scroll' },
  { native: 'hover', normalized: 'hover' }, // English loanword commonly used
];

// =============================================================================
// Malay Tokenizer Implementation
// =============================================================================

export class MalayTokenizer extends BaseTokenizer {
  readonly language = 'ms';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(malayProfile, MALAY_EXTRAS);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createMalayExtractors()); // Malay keywords (context-aware)
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

export const malayTokenizer = new MalayTokenizer();
