/**
 * Parser Module
 *
 * Exports the semantic parser and pattern matcher.
 */

export { PatternMatcher, patternMatcher, matchPattern, matchBest } from './pattern-matcher';

// Confidence model (Phase 3.3)
export type { ConfidenceModel, ConfidenceContext, ConfidenceBreakdown } from './confidence-model';
export { DefaultConfidenceModel, defaultConfidenceModel } from './confidence-model';
export {
  OPTIONAL_ROLE_WEIGHT,
  DEFAULT_PARTIAL_CREDIT,
  MAX_STEM_PENALTY,
  STEM_PENALTY_FLOOR,
  VSO_VERB_BOOST,
  MAX_PREPOSITION_ADJUSTMENT,
} from './confidence-model';

export {
  SemanticParserImpl,
  SemanticParseError,
  semanticParser,
  parse,
  canParse,
  getCommandType,
} from './semantic-parser';
