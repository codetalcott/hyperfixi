/**
 * Domain Registry — re-export shim.
 *
 * The implementation now lives in `@lokascript/domain-config`, shared with
 * `@hyperfixi/mcp-server`. This file stays so existing import paths keep
 * working (src/server.ts, src/tools/*.test.ts).
 */

export { createDomainRegistry, DOMAIN_PRIORITY } from '@lokascript/domain-config';
