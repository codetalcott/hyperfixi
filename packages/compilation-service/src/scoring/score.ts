/**
 * Structural fidelity scoring — `scoreFidelity()` (agent-era arc 4).
 *
 * Scores a CANDIDATE parse against a REFERENCE parse using the extracted
 * scorers in `@lokascript/semantic/fidelity` — the same primitives behind the
 * multilingual CI ratchet (docs/FIDELITY.md), applied to a pair of inputs
 * instead of a corpus. Deterministic, no corpus, no DOM, no LLM.
 *
 * Complementary to `diff()`: diff answers "are these two behaviors identical,
 * and where do they differ?"; scoring answers "how much of the reference's
 * structure does the candidate preserve, and what precisely is missing or
 * hallucinated?" — the shape an agent (or a translation pipeline) needs to
 * decide whether a generated/translated snippet is faithful. The two sides
 * may be in different languages and different input formats.
 *
 * Signal semantics (each in [0,1]; `undefined` when the relevant side has
 * nothing to score, mirroring the ratchet's semantics):
 * - `actionRecall`      — fraction of reference actions present (deduped set).
 * - `multisetRecall`    — duplicates counted; catches a dropped repeat.
 * - `precision`         — fraction of candidate actions justified by the
 *                         reference; catches hallucinated commands.
 * - `roleFidelity`      — recall of `action.role:valueType` signatures;
 *                         catches kept-verb-wrong-role parses.
 * - `valueRecall`       — recall of language-invariant `action.role=value`
 *                         entries (selectors, sigil refs, numbers, event
 *                         names); catches a silently rewritten target.
 */

import type { Diagnostic } from '../types.js';
import type { DiffInput } from '../diff/types.js';
import {
  collectActions,
  collectActionsMultiset,
  collectRoleSignature,
  collectRoleValueSignature,
  computeFidelity,
  computeMultisetRecall,
  computePrecision,
  spuriousActions,
} from '@lokascript/semantic/fidelity';

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

export interface FidelityScores {
  actionRecall: number | undefined;
  multisetRecall: number | undefined;
  precision: number | undefined;
  roleFidelity: number | undefined;
  valueRecall: number | undefined;
}

export interface FidelityReport {
  scores: FidelityScores;
  /** Reference actions absent from the candidate (multiset difference). */
  missingActions: string[];
  /** Candidate actions the reference never had (multiset difference). */
  spuriousActions: string[];
  /** Reference role signatures absent from the candidate. */
  missingRoles: string[];
  /** Reference invariant values absent from the candidate. */
  missingValues: string[];
  /** Every defined score is exactly 1.0. */
  faithful: boolean;
}

/** Recall of `reference` entries within `candidate`, as a set. */
function setRecallMisses(reference: string[], candidate: string[]): string[] {
  const cand = new Set(candidate);
  return reference.filter(r => !cand.has(r)).sort();
}

/**
 * Score two parsed semantic nodes. Pure — parsing/validation is the caller's
 * job (the service normalizes both sides first, same as `diff()`).
 */
export function scoreNodes(referenceNode: unknown, candidateNode: unknown): FidelityReport {
  const refSet = collectActions(referenceNode);
  const candSet = collectActions(candidateNode);
  const refMulti = collectActionsMultiset(referenceNode);
  const candMulti = collectActionsMultiset(candidateNode);
  const refRoles = collectRoleSignature(referenceNode);
  const candRoles = collectRoleSignature(candidateNode);
  const refValues = collectRoleValueSignature(referenceNode);
  const candValues = collectRoleValueSignature(candidateNode);

  const scores: FidelityScores = {
    actionRecall: computeFidelity(refSet, candSet),
    multisetRecall: computeMultisetRecall(refMulti, candMulti),
    precision: computePrecision(refMulti, candMulti),
    roleFidelity: computeFidelity(refRoles, candRoles),
    valueRecall: refValues.length === 0 ? undefined : computeFidelity(refValues, candValues),
  };

  // Multiset difference in the reference→candidate direction: what got dropped.
  const missingActions = spuriousActions(candMulti, refMulti);

  const defined = Object.values(scores).filter((s): s is number => s !== undefined);
  return {
    scores,
    missingActions,
    spuriousActions: spuriousActions(refMulti, candMulti),
    missingRoles: setRecallMisses(refRoles, candRoles),
    missingValues: setRecallMisses(refValues, candValues),
    faithful: defined.length > 0 && defined.every(s => s === 1),
  };
}
