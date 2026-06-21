/**
 * Arabic Proclitic Extractor (Context-Aware)
 *
 * Handles Arabic proclitics that attach directly to words:
 * - Conjunction proclitics: و (and), ف (then)
 * - Preposition proclitics: ب (with), ل (to), ك (like)
 * - Multi-proclitic sequences: ول, وب, فل, فب, وك, فك
 *
 * CRITICAL: Checks if full word is a keyword FIRST before splitting
 * to avoid splitting keywords like بدل (toggle) into ب + دل
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';
import { createUnicodeRangeClassifier } from '../base';

/** Check if character is Arabic (includes all Arabic Unicode blocks). */
const isArabic = createUnicodeRangeClassifier([
  [0x0600, 0x06ff], // Arabic
  [0x0750, 0x077f], // Arabic Supplement
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb50, 0xfdff], // Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
]);

/**
 * Proclitic metadata for semantic role assignment.
 */
interface ProcliticMetadata {
  readonly normalized: string;
  readonly type: 'conjunction' | 'preposition';
}

/**
 * Arabic proclitics with type metadata.
 */
const PROCLITICS = new Map<string, ProcliticMetadata>([
  // Conjunctions (single character)
  ['و', { normalized: 'and', type: 'conjunction' }], // wa - conjunction "and"
  ['ف', { normalized: 'then', type: 'conjunction' }], // fa - conjunction "then/so"

  // Attached prefix prepositions
  ['ب', { normalized: 'with', type: 'preposition' }], // bi- (with, by)
  ['ل', { normalized: 'to', type: 'preposition' }], // li- (to, for)
  ['ك', { normalized: 'like', type: 'preposition' }], // ka- (like, as)

  // Multi-proclitic sequences (conjunction + preposition)
  ['ول', { normalized: 'and-to', type: 'conjunction' }], // wa + li-
  ['وب', { normalized: 'and-with', type: 'conjunction' }], // wa + bi-
  ['وك', { normalized: 'and-like', type: 'conjunction' }], // wa + ka-
  ['فل', { normalized: 'then-to', type: 'conjunction' }], // fa + li-
  ['فب', { normalized: 'then-with', type: 'conjunction' }], // fa + bi-
  ['فك', { normalized: 'then-like', type: 'conjunction' }], // fa + ka-
]);

/**
 * Whole words that BEGIN with a proclitic letter (و/ف/ب/ل/ك) but are NOT a
 * proclitic + stem — splitting them destroys a real word. `isKeyword(fullWord)`
 * already protects command keywords (بدل, etc.); this covers content words the
 * i18n dict emits that aren't hyperscript keywords. `وثيقة` (document, `from
 * document`) is the motivating case: split into و (`and`) + ثيقة, the spurious
 * `and` conjunction became a clause boundary that dropped the surrounding command
 * (ar behavior-sortable's `wait … from document` clause parsed as null). Returning
 * null here routes the word to the identifier extractor — kept as a single
 * `identifier` token (so a role can capture it), matching how en lexes `document`.
 */
const NON_PROCLITIC_WORDS = new Set<string>([
  'وثيقة', // document
]);

/**
 * ArabicProcliticExtractor - Extracts Arabic proclitics with role metadata.
 *
 * Prevents splitting keywords by checking full word against keyword map first.
 */
export class ArabicProcliticExtractor implements ContextAwareExtractor {
  readonly name = 'arabic-proclitic';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    return (
      PROCLITICS.has(char) ||
      (position + 1 < input.length && PROCLITICS.has(input.slice(position, position + 2)))
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('ArabicProcliticExtractor: context not set');
    }

    // CRITICAL: Check if the full word is a keyword BEFORE splitting
    // This prevents keywords like بدل (toggle) from being split into ب (with) + دل
    let wordEnd = position;
    while (wordEnd < input.length && (isArabic(input[wordEnd]) || input[wordEnd] === 'ـ')) {
      wordEnd++;
    }
    const fullWord = input.slice(position, wordEnd);

    // Check if full word is a keyword (with or without diacritics)
    if (this.context.isKeyword(fullWord)) {
      return null; // Let keyword extractor handle it
    }

    // Known content word that merely begins with a proclitic letter — keep whole.
    if (NON_PROCLITIC_WORDS.has(fullWord)) {
      return null; // Let the identifier extractor handle it
    }

    // Try multi-character proclitics first (longest match)
    // Check 2-character sequences (ول, وب, فل, فب, etc.)
    if (position + 2 <= input.length) {
      const twoChar = input.slice(position, position + 2);
      const twoCharEntry = PROCLITICS.get(twoChar);
      if (twoCharEntry) {
        // Check if there's a following Arabic character (proclitic must be attached)
        const nextPos = position + 2;
        if (nextPos < input.length && isArabic(input[nextPos])) {
          // Count remaining Arabic characters to ensure meaningful word follows
          let remainingLength = 0;
          let checkPos = nextPos;
          while (checkPos < input.length && isArabic(input[checkPos])) {
            remainingLength++;
            checkPos++;
          }

          // Require at least 2 characters after proclitic to avoid false positives
          if (remainingLength >= 2) {
            // IMPORTANT: Check if a single-char proclitic would leave a keyword
            // e.g., "وبدل" should be "و" + "بدل" (keyword), not "وب" + "دل"
            const singleCharProclitic = PROCLITICS.get(input[position]);
            if (singleCharProclitic) {
              const afterSingleChar = input.slice(position + 1, wordEnd);
              if (this.context.isKeyword(afterSingleChar)) {
                // Single-char proclitic leaves a keyword - don't match multi-proclitic
                // Fall through to single-char proclitic handling below
              } else {
                // Multi-char proclitic is valid
                return {
                  value: twoChar,
                  length: 2,
                  metadata: {
                    procliticType: twoCharEntry.type,
                    normalized: twoCharEntry.normalized,
                  },
                };
              }
            } else {
              // No single-char proclitic alternative, use multi-char
              return {
                value: twoChar,
                length: 2,
                metadata: {
                  procliticType: twoCharEntry.type,
                  normalized: twoCharEntry.normalized,
                },
              };
            }
          }
        }
      }
    }

    // Try single-character proclitics
    const char = input[position];
    const entry = PROCLITICS.get(char);

    if (!entry) return null;

    // Check if there's a following Arabic character (proclitic must be attached)
    const nextPos = position + 1;
    if (nextPos >= input.length || !isArabic(input[nextPos])) {
      return null; // Standalone conjunction or end of input
    }

    // Count remaining Arabic characters to ensure meaningful word follows
    let remainingLength = 0;
    let checkPos = nextPos;
    while (checkPos < input.length && isArabic(input[checkPos])) {
      remainingLength++;
      checkPos++;
    }

    // Require at least 2 characters after proclitic to avoid false positives
    // (e.g., وو could be a typo, and short roots need protection)
    if (remainingLength < 2) {
      return null;
    }

    return {
      value: char,
      length: 1,
      metadata: {
        procliticType: entry.type,
        normalized: entry.normalized,
      },
    };
  }
}

/**
 * Create Arabic proclitic extractor.
 */
export function createArabicProcliticExtractor(): ContextAwareExtractor {
  return new ArabicProcliticExtractor();
}
