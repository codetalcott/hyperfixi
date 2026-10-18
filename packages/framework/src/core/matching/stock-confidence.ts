/**
 * The stock confidence model: how framework's first matcher scored a domain
 * pattern's match, moved here as a `ConfidenceModel` for the matcher's
 * skeleton (domains rethink Phase 4.7).
 *
 * Role coverage (a required slot 1, an optional one 0.8, an absent optional one
 * with a default 60% of that), a stem-match penalty (up to 15%, floor 0.5), and
 * two Arabic adjustments: a VSO verb-first boost and the preposition each role
 * takes most naturally.
 */

import type { LanguagePattern, SemanticRole, SemanticValue } from '../types';
import type { ConfidenceBreakdown, ConfidenceContext, ConfidenceModel } from './confidence-model';

/**
 * Calculate confidence score for a match (0-1).
 *
 * Confidence is reduced for:
 * - Stem matches (morphological normalization has inherent uncertainty)
 * - Missing optional roles (but less penalty if role has a default value)
 *
 * Confidence is increased for:
 * - VSO languages (Arabic) when pattern starts with a verb
 */
function scoreParts(ctx: ConfidenceContext): ConfidenceBreakdown {
  const { pattern, captured } = ctx;
  let score = 0;
  let maxScore = 0;

  // Helper to check if a role has a default value in extraction rules
  const hasDefault = (role: SemanticRole): boolean => {
    return pattern.extraction?.[role]?.default !== undefined;
  };

  // Score based on captured roles
  for (const token of pattern.template.tokens) {
    if (token.type === 'role') {
      maxScore += 1;
      if (captured.has(token.role)) {
        score += 1;
      }
    } else if (token.type === 'group') {
      // Group tokens are optional - weight depends on whether they have defaults
      for (const subToken of token.tokens) {
        if (subToken.type === 'role') {
          const roleHasDefault = hasDefault(subToken.role);
          const weight = 0.8; // Optional roles: 80% weight
          maxScore += weight;

          if (captured.has(subToken.role)) {
            // Role was explicitly provided by user
            score += weight;
          } else if (roleHasDefault) {
            // Role has a default - give 60% partial credit since command is semantically complete
            // This prevents penalizing common patterns like "toggle .active" (default: me)
            score += weight * 0.6;
          }
          // If no default and not captured, score += 0 (true penalty for missing info)
        }
      }
    }
  }

  const roleCoverage = maxScore > 0 ? score / maxScore : 1;
  let baseConfidence = roleCoverage;
  let stemPenalty = 0;

  // Apply penalty for stem matches
  // Each stem match reduces confidence slightly (e.g., 5% per stem match)
  // This ensures exact matches are preferred over morphological matches
  if (ctx.stemMatchCount > 0 && ctx.totalKeywordMatches > 0) {
    stemPenalty = (ctx.stemMatchCount / ctx.totalKeywordMatches) * 0.15;
    baseConfidence = Math.max(0.5, baseConfidence - stemPenalty);
  }

  // Apply VSO confidence boost for Arabic verb-first patterns
  const vsoBoost = calculateVSOConfidenceBoost(pattern);
  baseConfidence = Math.min(1.0, baseConfidence + vsoBoost);

  // Apply preposition disambiguation adjustment for Arabic
  const prepositionAdjustment = arabicPrepositionDisambiguation(pattern, captured);
  baseConfidence = Math.max(0.0, Math.min(1.0, baseConfidence + prepositionAdjustment));

  return {
    roleCoverage,
    stemPenalty,
    languageBoost: vsoBoost,
    languageAdjustment: prepositionAdjustment,
    final: baseConfidence,
  };
}

/**
 * Calculate confidence boost for VSO (Verb-Subject-Object) language patterns.
 * Arabic naturally uses VSO word order, so patterns that start with a verb
 * should receive a confidence boost.
 *
 * Returns +0.15 confidence boost if:
 * - Language is Arabic ('ar')
 * - Pattern's first token is a verb keyword
 *
 * @param pattern The language pattern being matched
 * @returns Confidence boost (0 or 0.15)
 */
function calculateVSOConfidenceBoost(pattern: LanguagePattern): number {
  // Only apply to Arabic
  if (pattern.language !== 'ar') {
    return 0;
  }

  // Check if first token in pattern is a literal (keyword)
  const firstToken = pattern.template.tokens[0];
  if (!firstToken || firstToken.type !== 'literal') {
    return 0;
  }

  // List of Arabic verb keywords (command verbs)
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

  // Check if first token value is a verb
  if (ARABIC_VERBS.has(firstToken.value)) {
    return 0.15;
  }

  // Check alternatives
  if (firstToken.alternatives) {
    for (const alt of firstToken.alternatives) {
      if (ARABIC_VERBS.has(alt)) {
        return 0.15;
      }
    }
  }

  return 0;
}

/**
 * Arabic preposition disambiguation for confidence adjustment.
 *
 * Different Arabic prepositions are more or less natural for different semantic roles:
 * - على (on/upon) is preferred for patient/target roles (element selectors)
 * - إلى (to) is preferred for destination roles
 * - من (from) is preferred for source roles
 * - في (in) is preferred for location roles
 *
 * This method analyzes the prepositions used with captured semantic roles and
 * adjusts confidence based on idiomaticity:
 * - +0.10 for highly idiomatic preposition choices
 * - -0.10 for less natural preposition choices
 *
 * @param pattern The language pattern being matched
 * @param captured The captured semantic values
 * @returns Confidence adjustment (-0.10 to +0.10)
 */
function arabicPrepositionDisambiguation(
  pattern: LanguagePattern,
  captured: ReadonlyMap<SemanticRole, SemanticValue>
): number {
  // Only apply to Arabic
  if (pattern.language !== 'ar') {
    return 0;
  }

  let adjustment = 0;

  // Preferred prepositions for each semantic role
  // Only including roles that commonly use prepositions in Arabic
  const PREFERRED_PREPOSITIONS: Partial<Record<SemanticRole, string[]>> = {
    patient: ['على'], // element selectors prefer على (on/upon)
    destination: ['إلى', 'الى'], // destination prefers إلى (to)
    source: ['من'], // source prefers من (from)
    agent: ['من'], // agent/by prefers من (from/by)
    manner: ['ب'], // manner prefers ب (with/by)
    style: ['ب'], // style prefers ب (with)
    goal: ['إلى', 'الى'], // target state prefers إلى (to)
    method: ['ب'], // method prefers ب (with/by)
  };

  // Check each captured role for preposition metadata
  for (const [role, value] of captured.entries()) {
    // Skip if no preferred prepositions defined for this role
    const preferred = PREFERRED_PREPOSITIONS[role];
    if (!preferred || preferred.length === 0) {
      continue;
    }

    // Check if the value has preposition metadata (from Arabic tokenizer)
    // This metadata is attached when a preposition particle token is consumed
    const metadata =
      'metadata' in value ? (value as { metadata: Record<string, unknown> }).metadata : undefined;
    if (metadata && typeof metadata.prepositionValue === 'string') {
      const usedPreposition = metadata.prepositionValue;

      // Check if the used preposition is in the preferred list
      if (preferred.includes(usedPreposition)) {
        // Idiomatic choice - boost confidence
        adjustment += 0.1;
      } else {
        // Less natural choice - reduce confidence
        adjustment -= 0.1;
      }
    }
  }

  // Cap total adjustment at ±0.10 (even if multiple roles analyzed)
  return Math.max(-0.1, Math.min(0.1, adjustment));
}

/** The stock confidence model (stateless: one instance serves every matcher). */
export const stockConfidenceModel: ConfidenceModel = {
  calculate: ctx => scoreParts(ctx).final,
  calculateWithBreakdown: ctx => scoreParts(ctx),
};
