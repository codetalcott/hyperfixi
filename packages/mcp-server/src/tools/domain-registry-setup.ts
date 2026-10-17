/**
 * Domain Registry Setup — re-export shim.
 *
 * The implementation lives in the `@lokascript/domains` aggregate (its root
 * entry absorbed `@lokascript/domain-config`). This file stays so existing
 * import paths keep working.
 */

import { createDomainRegistry as createAggregateRegistry } from '@lokascript/domains';
import type { DomainRegistry } from '@lokascript/framework';

/**
 * Every domain: domains 5.0.0 has seven (bdd, which behaviorspec absorbed in domains 4.2.0, was
 * deleted; hyperfixi domains rethink, D6).
 */
export function createDomainRegistry(): DomainRegistry {
  return createAggregateRegistry();
}
