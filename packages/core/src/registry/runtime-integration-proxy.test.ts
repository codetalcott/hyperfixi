/**
 * Arc 4c step 3 — no Proxy without providers.
 *
 * `enhanceContext` used to wrap EVERY context in a `Proxy` (five allocation
 * sites in runtime-base: behavior, event, mutation and change contexts) so
 * that registered context providers could resolve as lazy getters — and no
 * production caller has ever registered one. With zero providers the
 * context is returned as-is; the Proxy only exists when someone asked for it.
 */
import { describe, it, expect } from 'vitest';
import { types } from 'node:util';
import { createRegistryIntegration } from './runtime-integration';
import { createContextProviderRegistry } from './context-provider-registry';
import { createContext } from '../core/context';

describe('enhanceContext', () => {
  it('returns the same object when no provider is registered', () => {
    const integration = createRegistryIntegration({
      registry: { context: createContextProviderRegistry() },
    });
    const context = createContext(null);
    const enhanced = integration.enhanceContext(context);
    expect(enhanced).toBe(context);
    expect(types.isProxy(enhanced)).toBe(false);
  });

  it('wraps in a Proxy only once a provider exists', () => {
    const registry = createContextProviderRegistry();
    registry.register('answer', () => 42);
    const integration = createRegistryIntegration({ registry: { context: registry } });
    const context = createContext(null);
    const enhanced = integration.enhanceContext(context);
    expect(enhanced).not.toBe(context);
    expect(types.isProxy(enhanced)).toBe(true);
    expect((enhanced as unknown as { answer: number }).answer).toBe(42);
  });
});
