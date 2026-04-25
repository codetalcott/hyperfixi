/**
 * Domain Registry Setup — re-export shim.
 *
 * The implementation now lives in `@lokascript/domain-config`, shared with
 * `@lokascript/mcp-multilingual-intent`. This file stays so existing import
 * paths keep working.
 */

export { createDomainRegistry } from '@lokascript/domain-config';
