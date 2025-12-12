/**
 * Morphological Normalizers
 *
 * Re-exports all morphological normalizer types and implementations.
 */

// Types
export type {
  NormalizationResult,
  NormalizationMetadata,
  ConjugationType,
  MorphologicalNormalizer,
  SuffixRule,
  PrefixRule,
} from './types';

export { noChange, normalized } from './types';

// Language-specific normalizers
export {
  JapaneseMorphologicalNormalizer,
  japaneseMorphologicalNormalizer,
} from './japanese-normalizer';

export {
  KoreanMorphologicalNormalizer,
  koreanMorphologicalNormalizer,
} from './korean-normalizer';

export {
  SpanishMorphologicalNormalizer,
  spanishMorphologicalNormalizer,
} from './spanish-normalizer';

export {
  ArabicMorphologicalNormalizer,
  arabicMorphologicalNormalizer,
} from './arabic-normalizer';
