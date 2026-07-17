/**
 * Indonesian Tokenizer
 *
 * Tokenizes Indonesian hyperscript input.
 * Indonesian characteristics:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Agglutinative prefixes/suffixes (me-, ber-, di-, -kan, -i)
 * - No grammatical gender or conjugation
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { indonesianProfile } from '../generators/profiles/indonesian';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createIndonesianExtractors } from './extractors/indonesian-keyword';

// =============================================================================
// Indonesian Prepositions (used in classifyToken)
// =============================================================================

/**
 * Indonesian prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'di', // at, in
  'ke', // to
  'dari', // from
  'pada', // on, at
  'dengan', // with
  'tanpa', // without
  'untuk', // for
  'oleh', // by
  'antara', // between
  'sebelum', // before
  'sesudah', // after
  'setelah', // after
  'selama', // during
  'sampai', // until
  'hingga', // until
  'sejak', // since
  'menuju', // towards
  'tentang', // about
  'terhadap', // towards, against
  'melalui', // through
  'dalam', // inside
  'luar', // outside
]);

// =============================================================================
// Indonesian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const INDONESIAN_EXTRAS: KeywordEntry[] = [
  // window-resize compound: the dict emits underscore-joined ubah_ukuran
  // (resize), which the `_` split shattered into ubah(→change) + _ + ukuran —
  // the event slot normalized to `change` and `_ ukuran` dropped unconsumed
  // (Arc F). Whole-token entry mirrors qu's hatun_kay precedent (quechua.ts).
  { native: 'ubah_ukuran', normalized: 'resize' },
  // behavior-draggable's `no` operator: the dict emits underscore-joined
  // tidak_ada, which the `_` split shattered into tidak(→not) + _ + ada(→exists).
  // Whole-token entry mirrors ubah_ukuran above; the keyword walk sorts
  // longest-first, so `tidak_ada` (9) beats `tidak` (5).
  { native: 'tidak_ada', normalized: 'no' },

  // Values/Literals
  { native: 'benar', normalized: 'true' },
  { native: 'salah', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'kosong', normalized: 'null' },
  { native: 'tidakdidefinisikan', normalized: 'undefined' },

  // Positional
  { native: 'pertama', normalized: 'first' },
  { native: 'terakhir', normalized: 'last' },
  { native: 'berikutnya', normalized: 'next' },
  { native: 'sebelumnya', normalized: 'previous' },
  { native: 'terdekat', normalized: 'closest' },
  { native: 'induk', normalized: 'parent' },

  // Events
  { native: 'klik', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'ubah', normalized: 'change' },
  { native: 'kirim', normalized: 'submit' },
  { native: 'tekan', normalized: 'keydown' },
  { native: 'arahkan', normalized: 'mouseover' },
  { native: 'tinggalkan', normalized: 'mouseout' },
  { native: 'kabur', normalized: 'blur' },
  { native: 'muat', normalized: 'load' },
  { native: 'gulir', normalized: 'scroll' },
  { native: 'input', normalized: 'input' },

  // References
  { native: 'milik', normalized: 'my' },

  // Time units
  { native: 'detik', normalized: 's' },
  { native: 'milidetik', normalized: 'ms' },
  { native: 'menit', normalized: 'm' },
  { native: 'jam', normalized: 'h' },

  // Logical/conditional
  { native: 'atau', normalized: 'or' },
  { native: 'tidak', normalized: 'not' },
  { native: 'adalah', normalized: 'is' },
  { native: 'ada', normalized: 'exists' },
];

// =============================================================================
// Indonesian Tokenizer Implementation
// =============================================================================

export class IndonesianTokenizer extends BaseTokenizer {
  readonly language = 'id';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(indonesianProfile, INDONESIAN_EXTRAS);
    // Indonesian has morphological normalization but no normalizer is set yet
    // If IndonesianMorphologicalNormalizer exists, uncomment:
    // this.setNormalizer(new IndonesianMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createIndonesianExtractors()); // Indonesian keywords (context-aware)
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
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // extractWord(), extractNumber() methods removed
  // Now handled by IndonesianKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const indonesianTokenizer = new IndonesianTokenizer();
