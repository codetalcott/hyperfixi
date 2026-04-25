#!/usr/bin/env node
/**
 * @lokascript/mcp-multilingual-intent
 *
 * Multilingual-intent MCP server. Exposes natural-language parsing, domain
 * auto-detection, compilation, and pattern-example lookup as MCP tools via
 * the `siren-mcp` bridge.
 *
 * Run directly:
 *   npm run dev                    # tsx src/index.ts
 *   npm start                      # node dist/index.js (after build)
 *
 * Then point siren-mcp at the entry point:
 *   node /path/to/siren-mcp.mjs http://localhost:3030/api
 *
 * Or use the convenience scripts:
 *   npm run mcp                    # stdio transport (Claude Desktop)
 *   npm run mcp:http               # HTTP transport on port 8080
 */

import { serve } from '@hono/node-server';
import { createServer } from './server.js';

export { createServer } from './server.js';
export type { ServerOptions } from './server.js';
export * from './tools/index.js';

const DEFAULT_PORT = 3030;

function resolvePort(): number {
  const env = process.env.MCP_MULTILINGUAL_INTENT_PORT ?? process.env.PORT;
  if (!env) return DEFAULT_PORT;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function isMain(): boolean {
  // True when this module is the process entry point (node dist/index.js or
  // tsx src/index.ts). False when imported from another module.
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const entry = process.argv[1];
  // Simple heuristic: entry path ends with this file name (works for both
  // dist/index.js and src/index.ts via tsx).
  return /\/(?:dist|src)\/index\.(?:js|ts|mjs)$/.test(entry) || entry.endsWith('/index.js');
}

if (isMain()) {
  const port = resolvePort();
  const app = createServer();

  serve({ fetch: app.fetch, port }, info => {
    const host = info.address === '::' || info.address === '0.0.0.0' ? 'localhost' : info.address;
    console.error(
      `[mcp-multilingual-intent] Siren API listening on http://${host}:${info.port}/api`
    );
    console.error(
      `[mcp-multilingual-intent] Point siren-mcp at the entry point:\n  node <path-to>/siren-mcp.mjs http://${host}:${info.port}/api`
    );
  });
}
