/**
 * English Identifier Extractor
 *
 * Custom identifier extractor for English that handles:
 * - Namespaced events (draggable:start, htmx:afterSwap)
 * - Class syntax conversion (active class → .active)
 * - Keyword normalization (flip → toggle)
 */

import type { ValueExtractor, ExtractionResult } from '../value-extractor-types';
import type { KeywordEntry } from '../base-tokenizer';
import { isAsciiIdentifierChar } from '../base';

export interface EnglishIdentifierOptions {
  /** Keyword map for normalization lookups */
  keywordLookup: (word: string) => KeywordEntry | undefined;
  /** Check if a word is a known keyword */
  isKeyword: (word: string) => boolean;
}

/**
 * EnglishIdentifierExtractor - Handles English-specific identifier patterns.
 */
export class EnglishIdentifierExtractor implements ValueExtractor {
  readonly name = 'english-identifier';

  constructor(private options: EnglishIdentifierOptions) {}

  canExtract(input: string, position: number): boolean {
    return /[a-zA-Z_]/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let pos = position;
    let word = '';

    // Extract base word
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    // Check for namespaced event pattern: word:word (e.g., draggable:start)
    if (pos < input.length && input[pos] === ':') {
      const colonPos = pos;
      pos++; // consume colon
      let namespace = '';
      while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
        namespace += input[pos++];
      }
      // Only treat as namespaced event if there's text after the colon
      if (namespace) {
        word = word + ':' + namespace;
      } else {
        // No text after colon, revert to just the word
        pos = colonPos;
      }
    }

    // Get normalized form if this is a keyword synonym
    const keywordEntry = this.options.keywordLookup(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Check for class syntax conversion: "active class" → ".active"
    // Only for identifiers (not keywords)
    let classConversion: string | null = null;
    if (!this.options.isKeyword(word)) {
      let checkPos = pos;

      // Skip whitespace
      while (checkPos < input.length && /\s/.test(input[checkPos])) {
        checkPos++;
      }

      // Check if next word is "class"
      if (input.slice(checkPos, checkPos + 5).toLowerCase() === 'class') {
        const afterClass = checkPos + 5;
        if (afterClass >= input.length || !isAsciiIdentifierChar(input[afterClass])) {
          // Convert to class selector
          classConversion = '.' + word;
        }
      }
    }

    return {
      value: classConversion || word,
      length: pos - position,
      metadata: {
        normalized,
        classConversion: classConversion ? true : undefined,
      },
    };
  }
}
