/**
 * Morphological Normalizer Types — Re-exported from @lokascript/framework
 *
 * Defines interfaces for language-specific morphological analysis.
 * Normalizers reduce conjugated/inflected forms to canonical stems
 * that can be matched against keyword dictionaries.
 */

export type {
  NormalizationResult,
  NormalizationMetadata,
  ConjugationType,
  MorphologicalNormalizer,
  SuffixRule,
  PrefixRule,
  ConjugationEnding,
  NormalizerConfig,
} from '@lokascript/framework';

export { noChange, normalized, BaseMorphologicalNormalizer } from '@lokascript/framework';
