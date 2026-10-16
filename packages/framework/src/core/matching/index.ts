/**
 * The pattern matcher's skeleton and its value-reader seam (domains rethink
 * Phase 4.3): the matcher semantic's hyperscript parser runs, with
 * hyperscript's reading behind `ValueReader`.
 */

export { MatchSkeleton } from './match-skeleton';
export type { MatchView, RoleSlot, ValueReader } from './value-reader';
export type { ConfidenceBreakdown, ConfidenceContext, ConfidenceModel } from './confidence-model';
export { StockValueReader, createStockReader, greedyStopMarkers, readGreedy } from './stock-reader';
export { readRoleValue, type ReadingProfile } from './stock-reading';
export { stockConfidenceModel } from './stock-confidence';
