/**
 * Bengali Tokenizer
 *
 * Tokenizes Bengali hyperscript input.
 * Bengali is an agglutinative SOV language with:
 * - Bengali script (U+0980-U+09FF)
 * - Postposition markers (কে, তে, থেকে, etc.)
 * - Similar grammatical structure to Hindi
 * - CSS selectors are embedded ASCII
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { bengaliMorphologicalNormalizer } from './morphology/bengali-normalizer';
import { bengaliProfile } from '../generators/profiles/bengali';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { BengaliKeywordExtractor } from './extractors/bengali-keyword';
import { BengaliParticleExtractor } from './extractors/bengali-particle';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// Character classification functions moved to extractors/bengali-keyword.ts

// =============================================================================
// Bengali Postpositions
// =============================================================================

/**
 * Single-word postpositions (for classifyToken only).
 * Actual extraction is handled by BengaliParticleExtractor.
 */
const SINGLE_POSTPOSITIONS = new Set([
  'কে',
  'তে',
  'থেকে',
  'র',
  'এর',
  'দিয়ে',
  'জন্য',
  'পর্যন্ত',
  'এ', // locative "at/on/in" — marks events (ক্লিক এ = "on click")
  'মধ্যে', // "in/within"
]);

// =============================================================================
// Bengali Extras (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the Bengali profile.
 * Profile provides: commands, references, possessives, roleMarkers
 * Extras provide: values, positional, events, modifiers
 */
const BENGALI_EXTRAS: KeywordEntry[] = [
  // Values
  { native: 'সত্য', normalized: 'true' },
  { native: 'মিথ্যা', normalized: 'false' },
  { native: 'শূন্য', normalized: 'null' },
  { native: 'অনির্ধারিত', normalized: 'undefined' },

  // Positional
  { native: 'প্রথম', normalized: 'first' },
  // Note: 'শেষ' means both 'end' and 'last' in Bengali - profile has it as 'end'
  { native: 'পরবর্তী', normalized: 'next' },
  { native: 'আগের', normalized: 'previous' },
  { native: 'নিকটতম', normalized: 'closest' },
  { native: 'মূল', normalized: 'parent' },

  // Events
  { native: 'ক্লিক', normalized: 'click' },
  { native: 'জমা', normalized: 'submit' },
  { native: 'ইনপুট', normalized: 'input' },
  { native: 'লোড', normalized: 'load' },
  { native: 'স্ক্রোল', normalized: 'scroll' },

  // Additional modifiers not in profile
  { native: 'কে', normalized: 'to' },
  { native: 'সাথে', normalized: 'with' },

  // Conjunctions. `অথবা` (or) — dict bn.ts `or`. Already matched by surface in the
  // parser's OR_KEYWORDS (event-adjacent `or` was absorbed); registering it lets
  // surfaceOf emit `or` inside raw expressions (the wait-for event list in
  // behavior-draggable/sortable). Phantom-safe: `or` is neither an ActionType nor
  // a command schema.
  { native: 'অথবা', normalized: 'or' },
  { native: 'অন্তর্ভুক্ত', normalized: 'inclusive' },
  { native: 'বাদ', normalized: 'exclusive' },
];

// =============================================================================
// Bengali Tokenizer Class
// =============================================================================

export class BengaliTokenizer extends BaseTokenizer {
  readonly language = 'bn';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(bengaliProfile, BENGALI_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(bengaliMorphologicalNormalizer);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(new BengaliParticleExtractor()); // Particles with role metadata
    this.registerExtractor(new BengaliKeywordExtractor()); // Bengali keywords (context-aware)
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (for mixed content)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(value: string): TokenKind {
    if (SINGLE_POSTPOSITIONS.has(value)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(value)) return 'keyword';
    // Check URLs before selectors (./path vs .class)
    if (
      value.startsWith('/') ||
      value.startsWith('./') ||
      value.startsWith('../') ||
      value.startsWith('http')
    )
      return 'url';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(value))
      return 'event-modifier';
    if (
      value.startsWith('#') ||
      value.startsWith('.') ||
      value.startsWith('[') ||
      value.startsWith('*') ||
      value.startsWith('<')
    )
      return 'selector';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^\d/.test(value)) return 'literal';
    if (value.startsWith(':')) return 'identifier';

    return 'identifier';
  }

  // extractNumber() method removed - now handled by NumberExtractor
}

export const bengaliTokenizer = new BengaliTokenizer();
