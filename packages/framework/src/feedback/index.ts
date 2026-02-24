/**
 * Feedback Loop
 *
 * Structured error feedback, confidence-aware disambiguation,
 * and pattern hit-rate tracking for the LLM ↔ LSE integration.
 */

export type {
  LSEFeedback,
  FeedbackDiagnostic,
  FixType,
  DisambiguationRequest,
  DisambiguationCandidate,
  PatternEvent,
  HitRate,
  PatternTrackerSummary,
  TopFailure,
} from './types';

export { buildFeedback } from './feedback-formatter';

export { needsDisambiguation, buildDisambiguation } from './confidence-gate';

export { PatternTracker } from './pattern-tracker';
