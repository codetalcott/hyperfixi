/**
 * Hono server exposing the multilingual-intent Siren API.
 *
 * Five tools, stateless, each mounted at a POST/GET route. Every response
 * is a full Siren entry-point entity so `siren-mcp`'s tool set stays stable
 * across calls. Tool results ride in `properties.result`.
 *
 * The entry point is at `/api`. Point `siren-mcp` at that URL:
 *   node siren-mcp.mjs http://localhost:3030/api
 */

import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { CrossDomainDispatcher } from '@lokascript/framework';

import { createDomainRegistry, DOMAIN_PRIORITY } from './domain-registry.js';
import { buildEntryPoint, buildError, type SirenEntity } from './siren.js';
import { parseIntent, detectDomain, compileAuto, getPatternExamples } from './tools/index.js';

export interface ServerOptions {
  /** Base URL path mounted (default: "/api"). */
  basePath?: string;
  /** Confidence threshold for the dispatcher (default: 0.5). */
  minConfidence?: number;
}

/**
 * Create a configured Hono app. Caller is responsible for starting the
 * server (via `@hono/node-server` or similar).
 */
export function createServer(options: ServerOptions = {}): Hono {
  const basePath = options.basePath ?? '/api';
  const minConfidence = options.minConfidence ?? 0.5;

  const registry = createDomainRegistry();
  const dispatcher = new CrossDomainDispatcher(registry, {
    minConfidence,
    priority: DOMAIN_PRIORITY,
  });

  const app = new Hono();

  // CORS — allow browser-based landing-page demos to call the API.
  // Scoped to localhost by default; override via MCP_CORS_ORIGIN=* for
  // hosted demo deployments.
  const corsOrigin = process.env.MCP_CORS_ORIGIN ?? '*';
  app.use(
    '*',
    cors({
      origin: corsOrigin,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Accept'],
    })
  );

  // ── Entry point ────────────────────────────────────────────────────
  // GET /api → full entry-point entity with all actions listed.
  // siren-mcp fetches this first and registers each action as an MCP tool.
  app.get(basePath, c => {
    const entity = buildEntryPoint(basePath);
    return c.json(entity, 200, { 'Content-Type': 'application/vnd.siren+json' });
  });

  // ── list_supported_languages ──────────────────────────────────────
  // Plain GET, no input. Returns the canonical language list from the
  // registry so agents know what `language` codes they can pass.
  app.get(`${basePath}/languages`, c => {
    const langs = new Set<string>();
    for (const name of registry.getDomainNames()) {
      const descriptor = registry.getDescriptor(name);
      if (descriptor?.languages) {
        for (const lang of descriptor.languages) langs.add(lang);
      }
    }
    const entity = buildEntryPoint(basePath, {
      lastTool: 'list_supported_languages',
      result: {
        languages: [...langs].sort(),
        count: langs.size,
      },
    });
    return c.json(entity, 200, { 'Content-Type': 'application/vnd.siren+json' });
  });

  // ── parse_multilingual_intent ─────────────────────────────────────
  app.post(`${basePath}/parse`, async c => {
    return handleTool(c, basePath, 'parse_multilingual_intent', async body =>
      parseIntent({ dispatcher, registry }, body as never)
    );
  });

  // ── detect_domain ─────────────────────────────────────────────────
  app.post(`${basePath}/detect`, async c => {
    return handleTool(c, basePath, 'detect_domain', async body =>
      detectDomain(dispatcher, body as never)
    );
  });

  // ── compile_auto ──────────────────────────────────────────────────
  app.post(`${basePath}/compile`, async c => {
    return handleTool(c, basePath, 'compile_auto', async body =>
      compileAuto(dispatcher, body as never)
    );
  });

  // ── get_pattern_examples ──────────────────────────────────────────
  app.post(`${basePath}/examples`, async c => {
    return handleTool(c, basePath, 'get_pattern_examples', async body =>
      getPatternExamples(body as never)
    );
  });

  // ── Health check ──────────────────────────────────────────────────
  // Plain JSON, not Siren — for process supervisors and monitoring.
  app.get('/health', c => c.json({ status: 'ok', service: '@lokascript/mcp-multilingual-intent' }));

  return app;
}

/**
 * Shared tool-handling wrapper. Parses JSON body, calls the handler, wraps
 * the result in a Siren entry-point entity (preserving the stable action
 * list). Errors are caught and returned as Siren error entities — the
 * bridge sees an `error`-classed response and surfaces it to the LLM.
 */
async function handleTool(
  c: Context,
  basePath: string,
  toolName: string,
  handler: (body: unknown) => Promise<unknown>
): Promise<Response> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  try {
    const result = await handler(body);
    const entity: SirenEntity = buildEntryPoint(basePath, {
      class: ['entry-point', 'multilingual-intent', 'result'],
      lastTool: toolName,
      result,
    });
    return c.json(entity, 200, { 'Content-Type': 'application/vnd.siren+json' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const entity = buildError(basePath, message, { tool: toolName });
    return c.json(entity, 400, { 'Content-Type': 'application/vnd.siren+json' });
  }
}
