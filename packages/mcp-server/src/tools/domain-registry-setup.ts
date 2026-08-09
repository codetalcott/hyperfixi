/**
 * Domain Registry Setup — re-export shim.
 *
 * The implementation lives in the `@lokascript/domains` aggregate (its root
 * entry absorbed `@lokascript/domain-config`). This file stays so existing
 * import paths keep working.
 */

export { createDomainRegistry } from '@lokascript/domains';
