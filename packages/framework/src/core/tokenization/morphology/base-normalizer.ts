/**
 * BaseMorphologicalNormalizer — Shared base class for language normalizers.
 *
 * Provides the common suffix/prefix stripping loop, reflexive verb handling,
 * and normalize() pipeline. Language-specific normalizers extend this class
 * and provide their conjugation rules.
 *
 * Phase 3.1 of parser-ecosystem-plan-v3.
 */

import type {
  MorphologicalNormalizer,
  NormalizationResult,
  ConjugationType,
  SuffixRule,
  PrefixRule,
} from './types';
import { noChange, normalized } from './types';

/**
 * Conjugation ending rule for verb classes (Romance languages etc.)
 * Broader than SuffixRule — includes the replacement stem (e.g., strip -ando, add -ar).
 */
export interface ConjugationEnding {
  readonly ending: string;
  readonly stem: string;
  readonly confidence: number;
  readonly type: ConjugationType;
}

/**
 * Configuration for BaseMorphologicalNormalizer.
 * Subclasses provide this in their constructor.
 */
export interface NormalizerConfig {
  /** Language code */
  readonly language: string;

  /** Minimum word length to attempt normalization */
  readonly minWordLength?: number;

  /** Minimum stem length after stripping (default: 2) */
  readonly minStemLength?: number;

  /** Conjugation endings sorted longest-first */
  readonly endings?: readonly ConjugationEnding[];

  /** Suffix rules (for SuffixRule-style normalizers) */
  readonly suffixRules?: readonly SuffixRule[];

  /** Prefix rules */
  readonly prefixRules?: readonly PrefixRule[];

  /** Reflexive suffixes (for Romance languages) */
  readonly reflexiveSuffixes?: readonly string[];

  /** Infinitive endings (for checking if already normalized) */
  readonly infinitiveEndings?: readonly string[];
}

/**
 * Abstract base class for morphological normalizers.
 *
 * Subclasses must implement `isNormalizable()` and can override any
 * normalization step. The default `normalize()` pipeline is:
 *
 * 1. Check if already in dictionary form → noChange
 * 2. Try reflexive normalization (if reflexiveSuffixes configured)
 * 3. Try conjugation endings (if endings configured)
 * 4. Try suffix rules (if suffixRules configured)
 * 5. Try prefix rules (if prefixRules configured)
 * 6. Return noChange
 */
export abstract class BaseMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language: string;
  protected readonly config: NormalizerConfig;

  constructor(config: NormalizerConfig) {
    this.language = config.language;
    this.config = {
      minWordLength: 3,
      minStemLength: 2,
      ...config,
    };
  }

  /**
   * Check if a word can be normalized. Subclasses must implement this
   * with language-specific script/character detection.
   */
  abstract isNormalizable(word: string): boolean;

  /**
   * Standard normalization pipeline. Override for custom behavior.
   */
  normalize(word: string): NormalizationResult {
    const lower = word.toLowerCase();

    // Check if already in dictionary form
    if (this.isAlreadyNormalized(lower)) {
      return noChange(word);
    }

    // Try reflexive normalization (Romance languages)
    if (this.config.reflexiveSuffixes) {
      const reflexive = this.tryReflexiveNormalization(lower);
      if (reflexive) return reflexive;
    }

    // Try conjugation endings
    if (this.config.endings) {
      const conjugation = this.tryConjugationEndings(lower);
      if (conjugation) return conjugation;
    }

    // Try suffix rules
    if (this.config.suffixRules) {
      const suffix = this.trySuffixRules(lower);
      if (suffix) return suffix;
    }

    // Try prefix rules
    if (this.config.prefixRules) {
      const prefix = this.tryPrefixRules(lower);
      if (prefix) return prefix;
    }

    return noChange(word);
  }

  /**
   * Check if word is already in dictionary form (e.g., ends in -ar/-er/-ir).
   * Override for language-specific checks.
   */
  protected isAlreadyNormalized(word: string): boolean {
    if (this.config.infinitiveEndings) {
      return this.config.infinitiveEndings.some(e => word.endsWith(e));
    }
    return false;
  }

  /**
   * Try to strip reflexive suffixes and normalize the remainder.
   * Common in Romance languages (Spanish, Portuguese, French).
   */
  protected tryReflexiveNormalization(word: string): NormalizationResult | null {
    const suffixes = this.config.reflexiveSuffixes;
    if (!suffixes) return null;

    for (const suffix of suffixes) {
      if (!word.endsWith(suffix)) continue;
      const remainder = word.slice(0, -suffix.length);

      // Check if remainder is already an infinitive
      if (this.isAlreadyNormalized(remainder)) {
        return normalized(remainder, 0.88, {
          removedSuffixes: [suffix],
          conjugationType: 'reflexive',
        });
      }

      // Try to normalize the remainder
      const inner = this.tryConjugationEndings(remainder) || this.trySuffixRules(remainder);
      if (inner && inner.stem !== remainder) {
        return normalized(inner.stem, inner.confidence * 0.95, {
          removedSuffixes: [suffix, ...(inner.metadata?.removedSuffixes || [])],
          conjugationType: 'reflexive',
        });
      }
    }

    return null;
  }

  /**
   * Try conjugation endings (verb class endings like -ar/-er/-ir patterns).
   * Endings must be pre-sorted longest-first.
   */
  protected tryConjugationEndings(word: string): NormalizationResult | null {
    const endings = this.config.endings;
    if (!endings) return null;

    const minStem = this.config.minStemLength ?? 2;

    for (const rule of endings) {
      if (!word.endsWith(rule.ending)) continue;

      const stemBase = word.slice(0, -rule.ending.length);
      if (stemBase.length < minStem) continue;

      const infinitive = stemBase + rule.stem;
      return normalized(infinitive, rule.confidence, {
        removedSuffixes: [rule.ending],
        conjugationType: rule.type,
      });
    }

    return null;
  }

  /**
   * Try SuffixRule-style normalization.
   * Rules must be pre-sorted longest-first.
   */
  protected trySuffixRules(word: string): NormalizationResult | null {
    const rules = this.config.suffixRules;
    if (!rules) return null;

    const defaultMinStem = this.config.minStemLength ?? 2;

    for (const rule of rules) {
      if (!word.endsWith(rule.pattern)) continue;

      const stem = word.slice(0, -rule.pattern.length);
      const minStem = rule.minStemLength ?? defaultMinStem;
      if (stem.length < minStem) continue;

      const result = stem + (rule.replacement || '');
      return normalized(result, rule.confidence, {
        removedSuffixes: [rule.pattern],
        ...(rule.conjugationType && { conjugationType: rule.conjugationType }),
      });
    }

    return null;
  }

  /**
   * Try PrefixRule-style normalization.
   */
  protected tryPrefixRules(word: string): NormalizationResult | null {
    const rules = this.config.prefixRules;
    if (!rules) return null;

    for (const rule of rules) {
      if (!word.startsWith(rule.pattern)) continue;

      const remainder = word.slice(rule.pattern.length);
      const minRemaining = rule.minRemaining ?? this.config.minStemLength ?? 2;
      if (remainder.length < minRemaining) continue;

      return normalized(remainder, 1.0 - rule.confidencePenalty, {
        removedPrefixes: [rule.pattern],
      });
    }

    return null;
  }
}
