/**
 * Drift guard: registry language lists vs. actual DSL registrations.
 *
 * `createDomainRegistry()` declares each domain's `languages` statically so
 * registration stays lazy (deriving them would force-load every domain
 * package via `getDSL`). The cost of that laziness is drift: a domain gains
 * a language and the registry list silently understates it — which is
 * exactly what happened when the bridge migration took six domains from 8
 * to 11 languages. This suite force-loads each DSL (fine in tests) and
 * asserts the static list matches `getSupportedLanguages()` exactly.
 */

import { describe, it, expect } from 'vitest';
import { createDomainRegistry, DOMAIN_PRIORITY } from '../index';

const registry = createDomainRegistry();
const domains = registry.getDomainNames();

describe('domain-config: registry languages match DSL registrations', () => {
  it.each(domains)('%s', async name => {
    const descriptor = registry.getDescriptor(name);
    expect(descriptor).toBeDefined();

    const dsl = await registry.getDSLForDomain(name);
    expect(dsl).not.toBeNull();
    const actual = dsl!.getSupportedLanguages();

    // Set equality (order-independent), with readable diffs on failure.
    expect([...descriptor!.languages].sort()).toEqual([...actual].sort());
  });
});

describe('domain-config: DOMAIN_PRIORITY covers the registry', () => {
  it('lists every registered domain exactly once', () => {
    expect([...DOMAIN_PRIORITY].sort()).toEqual([...domains].sort());
  });
});
