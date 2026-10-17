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
 * Every domain but bdd, which behaviorspec absorbed (domains 4.2.0; hyperfixi domains rethink, D6):
 * its tools leave the server while `@lokascript/domains/bdd` stays through domains 4.x.
 */
export function createDomainRegistry(): DomainRegistry {
  return createAggregateRegistry({ omit: ['bdd'] });
}
