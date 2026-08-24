/**
 * Structural fidelity scoring — `scoreFidelity()` (agent-era arc 4).
 *
 * The scorer itself (`scoreNodes` and its report types) lives in
 * `@lokascript/semantic/fidelity` since arc 5 slice 2, so the language
 * server's translate-with-verification request and this service share ONE
 * implementation; this module re-exports it for API compatibility and adds
 * the service-level request/response shapes. See that module for signal
 * semantics; docs/FIDELITY.md for the methodology.
 */

import type { Diagnostic } from '../types.js';
import type { DiffInput } from '../diff/types.js';
import type { FidelityReport } from '@lokascript/semantic/fidelity';

export { scoreNodes } from '@lokascript/semantic/fidelity';
export type { FidelityReport, FidelityScores } from '@lokascript/semantic/fidelity';

/** Score request — a candidate scored against a reference. Sides accept the
 * same input formats as diff/compile and may be in different languages. */
export interface ScoreRequest {
  reference: DiffInput;
  candidate: DiffInput;
  /** Minimum confidence for natural language parsing (default 0.7) */
  confidence?: number;
}

export interface ScoreResponse extends Partial<FidelityReport> {
  /** Whether both sides parsed successfully. */
  ok: boolean;
  diagnostics: Diagnostic[];
}
