/**
 * Structured Confidence Model — Phase 3.3
 *
 * Replaces ad-hoc confidence penalties in PatternMatcher with a documented,
 * injectable model. Each scoring factor is a named method with clear semantics.
 *
 * Users can extend DefaultConfidenceModel to customize scoring for their domain.
 */

import type { LanguagePattern, SemanticRole, SemanticValue } from '../types';

/**
 * Context passed to confidence model methods.
 */
export interface ConfidenceContext {
  /** The pattern being matched */
  readonly pattern: LanguagePattern;
  /** Captured semantic roles */
  readonly captured: ReadonlyMap<SemanticRole, SemanticValue>;
  /** Number of stem (morphological) keyword matches */
  readonly stemMatchCount: number;
  /** Total keyword matches attempted */
  readonly totalKeywordMatches: number;
}

/**
 * Breakdown of confidence scoring factors (for diagnostics/debugging).
 */
export interface ConfidenceBreakdown {
  /** Role coverage score (0-1) */
  readonly roleCoverage: number;
  /** Stem match penalty applied (0 to -0.15) */
  readonly stemPenalty: number;
  /** Language-specific boost (e.g., VSO verb-first) */
  readonly languageBoost: number;
  /** Language-specific adjustment (e.g., preposition disambiguation) */
  readonly languageAdjustment: number;
  /** Final clamped confidence (0-1) */
  readonly final: number;
}

/**
 * Injectable confidence scoring model.
 *
 * Each method computes one factor of the confidence score.
 * Override individual methods to customize scoring without rewriting the pipeline.
 */
export interface ConfidenceModel {
  /**
   * Calculate the full confidence score.
   * Default implementation calls each factor method and combines them.
   */
  calculate(ctx: ConfidenceContext): number;

  /**
   * Calculate confidence with a detailed breakdown.
   * Useful for diagnostics and debugging.
   */
  calculateWithBreakdown(ctx: ConfidenceContext): ConfidenceBreakdown;
}

// =============================================================================
// Default Weights (documented constants)
// =============================================================================

/** Weight for optional roles in groups (vs 1.0 for required roles) */
export const OPTIONAL_ROLE_WEIGHT = 0.8;

/** Partial credit for optional roles with defaults that weren't explicitly provided */
export const DEFAULT_PARTIAL_CREDIT = 0.6;

/** Maximum penalty for stem (morphological) matches: 15% at 100% stem ratio */
export const MAX_STEM_PENALTY = 0.15;

/** Floor for confidence after stem penalty */
export const STEM_PENALTY_FLOOR = 0.5;

/** VSO verb-first boost for Arabic */
export const VSO_VERB_BOOST = 0.15;

/** Maximum preposition disambiguation adjustment */
export const MAX_PREPOSITION_ADJUSTMENT = 0.1;

// =============================================================================
// Arabic-Specific Data
// =============================================================================

const ARABIC_VERBS = new Set([
  'بدل',
  'غير',
  'أضف',
  'أزل',
  'ضع',
  'اجعل',
  'عين',
  'زد',
  'انقص',
  'سجل',
  'أظهر',
  'أخف',
  'شغل',
  'أرسل',
  'ركز',
  'شوش',
  'توقف',
  'انسخ',
  'احذف',
  'اصنع',
  'انتظر',
  'انتقال',
  'أو',
]);

const PREFERRED_PREPOSITIONS: Partial<Record<SemanticRole, string[]>> = {
  patient: ['على'],
  destination: ['إلى', 'الى'],
  source: ['من'],
  agent: ['من'],
  manner: ['ب'],
  style: ['ب'],
  goal: ['إلى', 'الى'],
  method: ['ب'],
};

// =============================================================================
// Default Implementation
// =============================================================================

/**
 * Default confidence model implementing the standard scoring pipeline.
 *
 * Pipeline:
 * 1. Role coverage (required roles = 1.0 weight, optional = 0.8, defaults = 0.48)
 * 2. Stem penalty (up to -15%, floor 0.5)
 * 3. VSO verb-first boost (Arabic +0.15)
 * 4. Preposition disambiguation (Arabic ±0.10)
 * 5. Clamp to [0, 1]
 */
export class DefaultConfidenceModel implements ConfidenceModel {
  calculate(ctx: ConfidenceContext): number {
    return this.calculateWithBreakdown(ctx).final;
  }

  calculateWithBreakdown(ctx: ConfidenceContext): ConfidenceBreakdown {
    const roleCoverage = this.scoreRoleCoverage(ctx);
    const stemPenalty = this.scoreStemPenalty(ctx);
    const languageBoost = this.scoreLanguageBoost(ctx);
    const languageAdjustment = this.scoreLanguageAdjustment(ctx);

    let score = roleCoverage;
    score = Math.max(STEM_PENALTY_FLOOR, score + stemPenalty);
    score = Math.min(1.0, score + languageBoost);
    score = Math.max(0.0, Math.min(1.0, score + languageAdjustment));

    return {
      roleCoverage,
      stemPenalty,
      languageBoost,
      languageAdjustment,
      final: score,
    };
  }

  /**
   * Score based on how many pattern roles were captured.
   * Required roles: 1.0 weight. Optional (in groups): 0.8.
   * Optional with defaults but not captured: 60% partial credit.
   */
  protected scoreRoleCoverage(ctx: ConfidenceContext): number {
    const { pattern, captured } = ctx;
    let score = 0;
    let maxScore = 0;

    const hasDefault = (role: SemanticRole): boolean => {
      return pattern.extraction?.[role]?.default !== undefined;
    };

    for (const token of pattern.template.tokens) {
      if (token.type === 'role') {
        maxScore += 1;
        if (captured.has(token.role)) {
          score += 1;
        }
      } else if (token.type === 'group') {
        for (const subToken of token.tokens) {
          if (subToken.type === 'role') {
            maxScore += OPTIONAL_ROLE_WEIGHT;
            if (captured.has(subToken.role)) {
              score += OPTIONAL_ROLE_WEIGHT;
            } else if (hasDefault(subToken.role)) {
              score += OPTIONAL_ROLE_WEIGHT * DEFAULT_PARTIAL_CREDIT;
            }
          }
        }
      }
    }

    return maxScore > 0 ? score / maxScore : 1;
  }

  /**
   * Penalty for morphological stem matches vs exact keyword matches.
   * Returns a negative value (penalty), or 0 if no stem matches.
   */
  protected scoreStemPenalty(ctx: ConfidenceContext): number {
    const { stemMatchCount, totalKeywordMatches } = ctx;
    if (stemMatchCount <= 0 || totalKeywordMatches <= 0) return 0;
    return -(stemMatchCount / totalKeywordMatches) * MAX_STEM_PENALTY;
  }

  /**
   * Language-specific boost (e.g., VSO verb-first for Arabic).
   * Override to add boosts for other language families.
   */
  protected scoreLanguageBoost(ctx: ConfidenceContext): number {
    const { pattern } = ctx;
    if (pattern.language !== 'ar') return 0;

    const firstToken = pattern.template.tokens[0];
    if (!firstToken || firstToken.type !== 'literal') return 0;

    if (ARABIC_VERBS.has(firstToken.value)) return VSO_VERB_BOOST;
    if (firstToken.alternatives?.some(alt => ARABIC_VERBS.has(alt))) return VSO_VERB_BOOST;

    return 0;
  }

  /**
   * Language-specific micro-adjustment (e.g., Arabic preposition naturalness).
   * Override to add disambiguation for other languages.
   */
  protected scoreLanguageAdjustment(ctx: ConfidenceContext): number {
    const { pattern, captured } = ctx;
    if (pattern.language !== 'ar') return 0;

    let adjustment = 0;

    for (const [role, value] of captured.entries()) {
      const preferred = PREFERRED_PREPOSITIONS[role];
      if (!preferred || preferred.length === 0) continue;

      const metadata =
        'metadata' in value ? (value as { metadata: Record<string, unknown> }).metadata : undefined;
      if (metadata && typeof metadata.prepositionValue === 'string') {
        if (preferred.includes(metadata.prepositionValue)) {
          adjustment += 0.1;
        } else {
          adjustment -= 0.1;
        }
      }
    }

    return Math.max(-MAX_PREPOSITION_ADJUSTMENT, Math.min(MAX_PREPOSITION_ADJUSTMENT, adjustment));
  }
}

/** Singleton default model */
export const defaultConfidenceModel = new DefaultConfidenceModel();
