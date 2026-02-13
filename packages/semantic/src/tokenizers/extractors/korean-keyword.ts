/**
 * Korean Keyword Extractor (Context-Aware)
 *
 * Handles Korean word extraction for:
 * - Hangul syllable blocks (U+AC00-U+D7A3)
 * - Hangul Jamo (U+1100-U+11FF, U+3130-U+318F)
 * - Temporal suffixes: 할때, 하면, 하니까 (split into stem + suffix if needed)
 *
 * Integrates with morphological normalizer for verb conjugations.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Check if character is a Hangul syllable block (U+AC00-U+D7A3).
 */
function isHangul(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * Check if character is a Hangul Jamo (U+1100-U+11FF, U+3130-U+318F).
 */
function isJamo(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x1100 && code <= 0x11ff) || (code >= 0x3130 && code <= 0x318f);
}

/**
 * Check if character is Korean (Hangul syllable or Jamo).
 */
function isKorean(char: string): boolean {
  return isHangul(char) || isJamo(char);
}

/**
 * Temporal event suffixes that should be split from compound words.
 * These are verb endings that indicate "when" something happens.
 * Sorted by length (longest first) to ensure greedy matching.
 *
 * Examples:
 * - 클릭할때 → 클릭 + 할때 (click + when)
 * - 입력할때 → 입력 + 할때 (input + when)
 */
const TEMPORAL_EVENT_SUFFIXES = ['할때', '하면', '하니까', '할 때'];

/**
 * KoreanKeywordExtractor - Context-aware extractor for Korean words.
 */
export class KoreanKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'korean-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isKorean(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('KoreanKeywordExtractor: context not set');
    }

    const startPos = position;

    // First, try to find the longest matching keyword starting at this position
    // This ensures compound words like 토글, 추가, 숨기다 are recognized whole
    const maxKeywordLen = 6; // Longest Korean keyword
    for (let len = Math.min(maxKeywordLen, input.length - startPos); len >= 2; len--) {
      const candidate = input.slice(startPos, startPos + len);

      // Check all chars are Korean
      let allKorean = true;
      for (let i = 0; i < candidate.length; i++) {
        if (!isKorean(candidate[i])) {
          allKorean = false;
          break;
        }
      }
      if (!allKorean) continue;

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

    // No keyword match - extract as regular word using character classification
    let word = '';
    let pos = position;

    while (pos < input.length && isKorean(input[pos])) {
      // Check if we're at the start of a known keyword (for word boundary detection)
      if (word.length > 0 && this.context.isKeywordStart(input, pos)) {
        break;
      }
      word += input[pos];
      pos++;
    }

    if (!word) return null;

    // Check if the word ends with a temporal event suffix
    for (const suffix of TEMPORAL_EVENT_SUFFIXES) {
      if (word.endsWith(suffix) && word.length > suffix.length) {
        const stem = word.slice(0, -suffix.length);

        // Only split if the stem is a known keyword
        const stemEntry = this.context.lookupKeyword(stem);
        if (stemEntry) {
          // Return only the stem - let tokenizer handle the suffix separately
          return {
            value: stem,
            length: stem.length,
            metadata: {
              normalized: stemEntry.normalized,
              hasSuffix: true,
              suffix: suffix,
              stem: stem, // Set stem for pattern matching
            },
          };
        }
      }
    }

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // DEBUG
    if (word.includes('토글')) {
      console.log(`[KO DEBUG] word="${word}"`);
      console.log(`[KO DEBUG] keywordEntry=${keywordEntry ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`[KO DEBUG] normalizer=${this.context.normalizer ? 'EXISTS' : 'MISSING'}`);
    }

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
          // DEBUG
          if (word.includes('토글')) {
            console.log(
              `[KO DEBUG] word="${word}", stem="${morphResult.stem}", normalized="${morphNormalized}"`
            );
          }
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
 * Create Korean-specific keyword extractor.
 */
export function createKoreanKeywordExtractor(): ContextAwareExtractor {
  return new KoreanKeywordExtractor();
}
