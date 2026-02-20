/**
 * Generalized AOT compilation for any domain.
 */

export * from './types';
export { DomainAwareScanner } from './domain-scanner';
export { AOTOrchestrator } from './aot-orchestrator';
export type { DomainCompilationBackend } from './aot-orchestrator';
export { registryToAOTBackends } from './registry-bridge';
