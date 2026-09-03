/**
 * Structural fidelity scorers — canonical home is `@lokascript/semantic/fidelity`
 * (moved there in agent-era arc 4 so any consumer can score a candidate parse
 * against a reference without pulling in this test framework; see
 * docs/FIDELITY.md and docs-internal/AGENT_ERA_ROADMAP.md).
 *
 * This module re-exports the full surface so every in-repo consumer
 * (orchestrator, parse-validator, triage tools, the fidelity test suite) keeps
 * its import path — and the test suite now exercises the extracted module
 * through this shim, which keeps the two from drifting.
 */

export {
  FIDELITY_THRESHOLD,
  collectActions,
  collectActionsMultiset,
  computeFidelity,
  computeMultisetRecall,
  computePrecision,
  spuriousActions,
  collectRoleSignature,
  collectRoleSignatureStrict,
  collectRoleValueSignature,
} from '@lokascript/semantic/fidelity';
