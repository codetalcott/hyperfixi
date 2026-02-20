/**
 * Registry-to-AOT Bridge
 *
 * Converts DomainRegistry entries into DomainCompilationBackend instances
 * for use with AOTOrchestrator. Only domains that have scanConfig defined
 * are included.
 *
 * @example
 * ```typescript
 * const registry = new DomainRegistry();
 * // ... register domains with scanConfig ...
 *
 * const backends = await registryToAOTBackends(registry);
 * const orchestrator = new AOTOrchestrator();
 * for (const backend of backends) {
 *   orchestrator.registerBackend(backend);
 * }
 * ```
 */

import type { DomainCompilationBackend } from './aot-orchestrator';
import type { DomainScanConfig } from './types';
import type { DomainRegistry } from '../api/domain-registry';
import type { CodeGenerator } from '../api/create-dsl';
import type { SemanticNode } from '../core/types';

/**
 * Convert all registry entries with scanConfig into AOT backends.
 * Domains without scanConfig are skipped.
 */
export async function registryToAOTBackends(
  registry: DomainRegistry
): Promise<DomainCompilationBackend[]> {
  const backends: DomainCompilationBackend[] = [];

  for (const name of registry.getDomainNames()) {
    const descriptor = registry.getDescriptor(name);
    if (!descriptor?.scanConfig) continue;

    const dsl = await registry.getDSLForDomain(name);
    if (!dsl) continue;

    const scanConfig: DomainScanConfig = {
      domain: name,
      attributes: [...descriptor.scanConfig.attributes],
      ...(descriptor.scanConfig.scriptTypes
        ? { scriptTypes: [...descriptor.scanConfig.scriptTypes] }
        : {}),
      defaultLanguage: descriptor.scanConfig.defaultLanguage ?? 'en',
    };

    // The AOTOrchestrator only calls backend.dsl.compile(), not codeGenerator directly.
    // Provide a thin adapter that parses then generates via the DSL's internal pipeline.
    const codeGenerator: CodeGenerator = {
      generate(node: SemanticNode): string {
        // Fallback: compile through the DSL by reconstructing explicit syntax.
        // In practice, AOTOrchestrator uses dsl.compile() directly.
        return JSON.stringify({ action: node.action, roles: Object.fromEntries(node.roles) });
      },
    };

    backends.push({ domain: name, dsl, codeGenerator, scanConfig });
  }

  return backends;
}
