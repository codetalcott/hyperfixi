/**
 * Base Tokenizer
 *
 * Re-exports all tokenizer utilities and the BaseTokenizer class.
 * Language-specific tokenizers import from this file.
 */

// Token primitives & character classification
export {
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiLetter,
  isAsciiIdentifierChar,
} from './token-utils';
export type { TimeUnitMapping, CreateTokenOptions } from './token-utils';

// Unicode range classification factories
export {
  createUnicodeRangeClassifier,
  combineClassifiers,
  createLatinCharClassifiers,
} from './char-classifiers';
export type { UnicodeRange, LatinCharClassifiers } from './char-classifiers';

// Extraction utilities
export {
  extractCssSelector,
  isPossessiveMarker,
  extractStringLiteral,
  isUrlStart,
  extractUrl,
  extractNumber,
} from './extractors';

// BaseTokenizer class & types
export { BaseTokenizer } from './base-tokenizer';
export type { KeywordEntry, TokenizerProfile } from './base-tokenizer';
