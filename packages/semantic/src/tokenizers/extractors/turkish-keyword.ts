/**
 * Turkish Keyword Extractor (Context-Aware)
 *
 * Handles Turkish word extraction for:
 * - Latin alphabet with special characters (ç, ğ, ı, ö, ş, ü)
 * - Agglutinative morphology with vowel harmony
 * - Postposition suffixes
 * - Case suffixes (14 patterns)
 *
 * Integrates with morphological normalizer for verb conjugations.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Check if character is a Turkish letter.
 * Turkish uses Latin alphabet with special characters: ç, ğ, ı, ö, ş, ü
 */
function isTurkishLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  // Basic Latin letters
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
    return true;
  }
  // Turkish special characters
  const turkishChars = 'çÇğĞıİöÖşŞüÜ';
  return turkishChars.includes(char);
}

/**
 * Turkish postpositions (come after the noun they modify).
 */
const POSTPOSITIONS = new Set([
  'ile', // with
  'için', // for
  'kadar', // until, as far as
  'gibi', // like
  'önce', // before
  'üzerinde', // on, above
  'altında', // under
  'içinde', // inside
  'dışında', // outside
  'arasında', // between
  'karşı', // against, towards
  'göre', // according to
  'rağmen', // despite
  'doğru', // towards
  'boyunca', // along, throughout
]);

/**
 * Turkish case suffixes (attach to nouns).
 * These are often used as particles in semantic parsing.
 */
const CASE_SUFFIXES = new Set([
  'de',
  'da',
  'te',
  'ta', // locative (at, in)
  'den',
  'dan',
  'ten',
  'tan', // ablative (from)
  'e',
  'a',
  'ye',
  'ya', // dative (to)
  'i',
  'ı',
  'u',
  'ü', // accusative (object)
  'in',
  'ın',
  'un',
  'ün', // genitive (of)
  'le',
  'la',
  'yle',
  'yla', // instrumental (with)
]);

/**
 * TurkishKeywordExtractor - Context-aware extractor for Turkish words.
 *
 * Handles:
 * - Turkish alphabet with special characters
 * - Vowel harmony validation
 * - Agglutinative morphology
 * - Postposition detection with metadata
 */
export class TurkishKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'turkish-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isTurkishLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('TurkishKeywordExtractor: context not set');
    }

    const startPos = position;

    // First, try to find the longest matching keyword starting at this position
    // This ensures compound words are recognized whole
    const maxKeywordLen = 12; // Longest Turkish keyword
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 2; len--) {
      const candidate = input.slice(startPos, startPos + len);

      // Word-boundary guard: a marker/keyword is only a real token when it ends
      // at a word boundary. If the next character continues the word, this
      // candidate is just a prefix of a longer content word (e.g. `de` in
      // `değer`, `te` in `textContent`) — skip it so the whole word is kept.
      // Turkish markers arrive space-delimited, so a mid-word match is always
      // spurious.
      if (startPos + len < input.length && isTurkishLetter(input[startPos + len])) {
        continue;
      }

      // Check all chars are Turkish
      let allTurkish = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isTurkishLetter(candidate[i])) {
          allTurkish = false;
          break;
        }
      }
      if (!allTurkish) continue;

      // Look up keyword entry
      const keywordEntry = this.context.lookupKeyword(candidate);
      if (keywordEntry) {
        return {
          value: candidate,
          length: len,
          metadata: {
            normalized:
              keywordEntry.normalized !== keywordEntry.native ? keywordEntry.normalized : undefined,
          },
        };
      }

      // Try morphological normalization
      if (this.context.normalizer) {
        const morphResult = this.context.normalizer.normalize(candidate);
        if (morphResult.stem !== candidate && morphResult.confidence >= 0.7) {
          const stemEntry = this.context.lookupKeyword(morphResult.stem);
          if (stemEntry) {
            return {
              value: candidate,
              length: len,
              metadata: {
                normalized: stemEntry.normalized,
                stem: morphResult.stem, // Native language stem for pattern matching
                stemConfidence: morphResult.confidence,
              },
            };
          }
        }
      }
    }

    // No keyword match in greedy loop - extract full word and try longest match
    // Use greedy approach to handle compound keywords
    let word = '';
    let pos = position;

    // Extract full Turkish word
    while (pos < input.length && isTurkishLetter(input[pos])) {
      word += input[pos];
      pos++;
    }

    // Now try to match the extracted word as a keyword. Only a full-word match
    // counts: a shorter prefix would be a mid-word marker match (e.g. `de` in
    // `değer`), the same spurious fragmentation guarded against above.
    for (let len = word.length; len >= 2; len--) {
      if (len < word.length) break;
      const candidate = word.substring(0, len);
      const keywordEntry = this.context.lookupKeyword(candidate);
      if (keywordEntry) {
        return {
          value: candidate,
          length: len,
          metadata: {
            normalized:
              keywordEntry.normalized !== keywordEntry.native ? keywordEntry.normalized : undefined,
          },
        };
      }
    }

    // No keyword found, return the full word as-is
    if (!word) return null;

    if (!word) return null;

    // Check if it's a postposition (with metadata for disambiguation)
    if (POSTPOSITIONS.has(word.toLowerCase())) {
      return {
        value: word,
        length: pos - startPos,
        metadata: {
          postpositionValue: word.toLowerCase(),
        },
      };
    }

    // Check if it's a case suffix (with metadata for disambiguation)
    if (CASE_SUFFIXES.has(word.toLowerCase())) {
      return {
        value: word,
        length: pos - startPos,
        metadata: {
          caseSuffixValue: word.toLowerCase(),
        },
      };
    }

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available
    let morphNormalized: string | undefined;
    let morphStem: string | undefined;
    let morphConfidence: number | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        const stemEntry = this.context.lookupKeyword(morphResult.stem);
        if (stemEntry) {
          morphNormalized = stemEntry.normalized;
          morphStem = morphResult.stem; // Native language stem for pattern matching
          morphConfidence = morphResult.confidence;
        }
      }
    }

    return {
      value: word,
      length: pos - startPos,
      metadata: {
        normalized: normalized || morphNormalized,
        stem: morphStem,
        stemConfidence: morphConfidence,
      },
    };
  }
}

/**
 * Create Turkish-specific keyword extractor.
 */
export function createTurkishKeywordExtractor(): ContextAwareExtractor {
  return new TurkishKeywordExtractor();
}
