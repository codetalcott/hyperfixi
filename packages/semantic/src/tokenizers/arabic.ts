/**
 * Arabic Tokenizer
 *
 * Tokenizes Arabic hyperscript input.
 * Arabic is challenging because:
 * - Right-to-left (RTL) text direction
 * - Prefix prepositions that attach to words (بـ, لـ, كـ)
 * - Root-pattern morphology
 * - CSS selectors are LTR islands within RTL text
 */

import type { TokenKind, LanguageToken, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  type KeywordEntry,
} from './base';
import { ArabicMorphologicalNormalizer } from './morphology/arabic-normalizer';
import { arabicProfile } from '../generators/profiles/arabic';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { ArabicKeywordExtractor } from './extractors/arabic-keyword';
import { ArabicProcliticExtractor } from './extractors/arabic-proclitic';
import { ArabicTemporalExtractor } from './extractors/arabic-temporal';

// Character classification functions moved to extractors/arabic-keyword.ts

// Proclitic constants and metadata moved to extractors/arabic-proclitic.ts
// Temporal marker constants and metadata moved to extractors/arabic-temporal.ts

// =============================================================================
// Arabic Token Classification Sets
// =============================================================================

/**
 * Arabic conjunctions for token classification.
 * Only includes multi-proclitic sequences (ول, وب, etc.).
 * Single-character proclitics (و, ف) are NOT included here because:
 * - When attached to words, they're extracted by ArabicProcliticExtractor with metadata
 * - When standalone, they should be classified as identifiers, not conjunctions
 * The extractor metadata indicates their role, which pattern matching uses.
 */
const CONJUNCTIONS = new Set([
  // Multi-proclitic sequences only
  'ول', // wa + li- (and-to)
  'وب', // wa + bi- (and-with)
  'وك', // wa + ka- (and-like)
  'فل', // fa + li- (then-to)
  'فب', // fa + bi- (then-with)
  'فك', // fa + ka- (then-like)
]);

/**
 * Arabic standalone prepositions for token classification.
 * Note: Temporal markers (عند, لدى, etc.) are handled by ArabicTemporalExtractor
 * with formality metadata.
 */
const PREPOSITIONS = new Set([
  'في', // fī (in)
  'على', // ʿalā (on)
  'من', // min (from)
  'إلى', // ilā (to)
  'الى', // ilā (alternative spelling)
  'مع', // maʿa (with)
  'عن', // ʿan (about, from)
  'قبل', // qabl (before)
  'بعد', // baʿd (after)
  'بين', // bayn (between)
  // Attached prefix prepositions (can also appear standalone)
  'ب', // bi- (with, by)
  'ل', // li- (to, for)
  'ك', // ka- (like, as)
]);

// =============================================================================
// Arabic Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile.
 *
 * SIMPLIFIED: Following the Tagalog/Hindi model of minimal EXTRAS.
 * Command synonyms and spelling variants should be in profile alternatives,
 * not duplicated here. Only includes:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - References not in profile
 */
const ARABIC_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'صحيح', normalized: 'true' },
  { native: 'خطأ', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'فارغ', normalized: 'null' },
  { native: 'غير معرف', normalized: 'undefined' },

  // Positional
  { native: 'الأول', normalized: 'first' },
  { native: 'أول', normalized: 'first' },
  { native: 'الأخير', normalized: 'last' },
  { native: 'آخر', normalized: 'last' },
  { native: 'التالي', normalized: 'next' },
  { native: 'السابق', normalized: 'previous' },
  { native: 'الأقرب', normalized: 'closest' },
  { native: 'الأب', normalized: 'parent' },

  // Events
  { native: 'النقر', normalized: 'click' },
  { native: 'نقر', normalized: 'click' },
  { native: 'الإدخال', normalized: 'input' },
  { native: 'إدخال', normalized: 'input' },
  { native: 'التغيير', normalized: 'change' },
  { native: 'تغيير', normalized: 'change' },
  { native: 'الإرسال', normalized: 'submit' },
  { native: 'إرسال', normalized: 'submit' },
  { native: 'التركيز', normalized: 'focus' },
  { native: 'فقدان التركيز', normalized: 'blur' },
  { native: 'ضغط', normalized: 'keydown' },
  { native: 'رفع', normalized: 'keyup' },
  { native: 'تمرير الفأرة', normalized: 'mouseover' },
  { native: 'مغادرة الفأرة', normalized: 'mouseout' },
  { native: 'تحميل', normalized: 'load' },
  { native: 'تمرير', normalized: 'scroll' },

  // References (feminine "it" not in profile)
  { native: 'هي', normalized: 'it' },

  // Time units
  { native: 'ثانية', normalized: 's' },
  { native: 'ثواني', normalized: 's' },
  { native: 'ملي ثانية', normalized: 'ms' },
  { native: 'دقيقة', normalized: 'm' },
  { native: 'دقائق', normalized: 'm' },
  { native: 'ساعة', normalized: 'h' },
  { native: 'ساعات', normalized: 'h' },

  // Temporal markers (also in ArabicTemporalExtractor with formality metadata)
  { native: 'عندما', normalized: 'on' },
  { native: 'حينما', normalized: 'on' },
  { native: 'عند', normalized: 'on' },
  { native: 'حين', normalized: 'on' },
  { native: 'لمّا', normalized: 'on' },
  { native: 'لما', normalized: 'on' },
  { native: 'لدى', normalized: 'on' },
  //
  // Command spelling variants are now in the profile alternatives:
  // - toggle: بدل, غيّر, غير (in profile)
  // - add: اضف, زِد (in profile)
  // - remove: أزل, امسح (in profile)
  // - etc.
];

// Arabic time units moved to generic-extractors.ts (NumberExtractor handles them)

// =============================================================================
// Arabic Tokenizer Implementation
// =============================================================================

export class ArabicTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(arabicProfile, ARABIC_EXTRAS);
    // Set morphological normalizer for prefix/suffix stripping
    this.normalizer = new ArabicMorphologicalNormalizer();

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    // CRITICAL: Temporal markers FIRST (before proclitics and keywords)
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers (includes Arabic time units)
    this.registerExtractor(new ArabicTemporalExtractor()); // Temporal markers with formality metadata
    this.registerExtractor(new ArabicProcliticExtractor()); // Proclitics (after temporal check)
    this.registerExtractor(new ArabicKeywordExtractor()); // Arabic keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // Override tokenizeWithExtractors to handle proclitic metadata
  protected override tokenizeWithExtractors(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      while (pos < input.length && isWhitespace(input[pos])) {
        pos++;
      }
      if (pos >= input.length) break;

      // Try registered extractors in order
      let extracted = false;
      for (const extractor of this.extractors) {
        if (extractor.canExtract(input, pos)) {
          const result = extractor.extract(input, pos);
          if (result) {
            // Extract promoted fields from metadata
            const normalized = result.metadata?.normalized as string | undefined;
            const stem = result.metadata?.stem as string | undefined;
            const stemConfidence = result.metadata?.stemConfidence as number | undefined;

            // Create clean metadata without promoted fields
            const cleanMetadata: Record<string, unknown> = {};
            if (result.metadata) {
              for (const [key, value] of Object.entries(result.metadata)) {
                if (key !== 'normalized' && key !== 'stem' && key !== 'stemConfidence') {
                  cleanMetadata[key] = value;
                }
              }
            }

            // Special handling for proclitics: use metadata to determine kind
            let kind: TokenKind;
            if (cleanMetadata.procliticType === 'conjunction') {
              kind = 'conjunction';
            } else if (cleanMetadata.procliticType === 'preposition') {
              kind = 'particle';
            } else {
              kind = this.classifyToken(result.value);
            }

            // Build options object with all available fields
            const options: {
              normalized?: string;
              stem?: string;
              stemConfidence?: number;
              metadata?: Record<string, unknown>;
            } = {};
            if (normalized) options.normalized = normalized;
            if (stem) options.stem = stem;
            if (stemConfidence !== undefined) options.stemConfidence = stemConfidence;
            if (Object.keys(cleanMetadata).length > 0) options.metadata = cleanMetadata;

            tokens.push(
              createToken(
                result.value,
                kind,
                createPosition(pos, pos + result.length),
                Object.keys(options).length > 0 ? options : undefined
              )
            );
            pos += result.length;
            extracted = true;
            break;
          }
        }
      }

      // Fallback: single character as operator/punctuation
      if (!extracted) {
        const char = input[pos];
        const kind = this.classifyUnknownChar(char);
        tokens.push(createToken(char, kind, createPosition(pos, pos + 1)));
        pos++;
      }
    }

    return new TokenStreamImpl(tokens, this.language);
  }

  classifyToken(token: string): TokenKind {
    if (CONJUNCTIONS.has(token)) return 'conjunction';
    if (PREPOSITIONS.has(token)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    // Check URLs before selectors (./path vs .class)
    if (
      token.startsWith('/') ||
      token.startsWith('./') ||
      token.startsWith('../') ||
      token.startsWith('http')
    )
      return 'url';
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

    return 'identifier';
  }

  // extractArabicWord(), extractAsciiWord(), extractArabicNumber(), tryPreposition(),
  // and tryProclitic() methods removed - now handled by extractors
}

/**
 * Singleton instance.
 */
export const arabicTokenizer = new ArabicTokenizer();
