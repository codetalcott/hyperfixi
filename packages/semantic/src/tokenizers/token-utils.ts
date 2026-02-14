/**
 * Token Utilities — Re-exported from @lokascript/framework
 *
 * Core token creation, stream implementation, and character classification.
 * These are the foundational building blocks used by all tokenizers.
 */

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
} from '@lokascript/framework';

export type { TimeUnitMapping, CreateTokenOptions } from '@lokascript/framework';
