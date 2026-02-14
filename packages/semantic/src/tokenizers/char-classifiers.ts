/**
 * Character Classifiers — Re-exported from @lokascript/framework
 *
 * Unicode range classification and Latin character classifier factories.
 * Used by language-specific tokenizers to define character sets.
 */

export {
  createUnicodeRangeClassifier,
  combineClassifiers,
  createLatinCharClassifiers,
} from '@lokascript/framework';

export type { UnicodeRange, LatinCharClassifiers } from '@lokascript/framework';
