/**
 * Feedback Loop Types
 *
 * Types for structured error feedback, confidence-aware disambiguation,
 * and pattern hit-rate tracking in the LLM ↔ LSE integration.
 */

import type { SemanticJSON } from '../ir/types';

// =============================================================================
// Structured Error Feedback (Level 1)
// =============================================================================

/**
 * Structured feedback for an LSE validation attempt.
 */
export interface LSEFeedback {
  /** Whether the input was accepted (no errors) */
  readonly accepted: boolean;

  /** The original input */
  readonly input: {
    readonly format: 'explicit' | 'json' | 'natural';
    readonly text: string;
  };

  /** Machine-actionable diagnostics */
  readonly diagnostics: readonly FeedbackDiagnostic[];

  /** Human-readable hints for retrying */
  readonly hints: readonly string[];

  /** Valid schema structure for the attempted command (if identifiable) */
  readonly schema?: {
    readonly action: string;
    readonly requiredRoles: readonly string[];
    readonly optionalRoles: readonly string[];
    readonly roleDescriptions: Readonly<Record<string, string>>;
  };

  /** Corrected example (if fixable) */
  readonly correctedExample?: {
    readonly explicit: string;
    readonly json: SemanticJSON;
  };
}

/**
 * A single diagnostic with machine-actionable fix type.
 */
export interface FeedbackDiagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly fixType?: FixType;
}

/**
 * Machine-actionable fix type for LLM retry logic.
 */
export type FixType =
  | 'missing_role'
  | 'invalid_type'
  | 'unknown_command'
  | 'unknown_role'
  | 'syntax_error';

// =============================================================================
// Confidence-Aware Disambiguation (Level 2)
// =============================================================================

/**
 * A disambiguation request presented when confidence is borderline.
 */
export interface DisambiguationRequest {
  /** The original input that was ambiguous */
  readonly input: string;

  /** Candidate interpretations ranked by confidence */
  readonly candidates: readonly DisambiguationCandidate[];

  /** Human/LLM-readable disambiguation prompt */
  readonly question: string;
}

/**
 * A single candidate interpretation.
 */
export interface DisambiguationCandidate {
  /** Command action */
  readonly action: string;

  /** Confidence score */
  readonly confidence: number;

  /** Canonical LSE for this interpretation */
  readonly explicit: string;

  /** Human-readable description */
  readonly description: string;
}

// =============================================================================
// Pattern Hit-Rate Instrumentation (Level 3)
// =============================================================================

/**
 * A single pattern event for hit-rate tracking.
 */
export interface PatternEvent {
  readonly timestamp: number;
  readonly domain: string;
  readonly action: string;
  readonly language: string;
  readonly inputFormat: 'explicit' | 'json' | 'natural';
  readonly confidence: number;
  readonly outcome: 'accepted' | 'rejected' | 'disambiguated';
  readonly diagnosticCodes?: readonly string[];
}

/**
 * Hit-rate statistics for a category.
 */
export interface HitRate {
  readonly attempts: number;
  readonly successes: number;
  readonly rate: number;
}

/**
 * Summary of pattern tracking data.
 */
export interface PatternTrackerSummary {
  readonly totalEvents: number;
  readonly byOutcome: Readonly<Record<string, number>>;
  readonly byCommand: Readonly<Record<string, HitRate>>;
  readonly byLanguage: Readonly<Record<string, HitRate>>;
  readonly topFailures: readonly TopFailure[];
}

/**
 * A frequently failing diagnostic code.
 */
export interface TopFailure {
  readonly code: string;
  readonly count: number;
  readonly actions: readonly string[];
}
