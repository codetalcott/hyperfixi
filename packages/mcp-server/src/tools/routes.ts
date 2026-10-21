/**
 * ServerBridge Route MCP Tools
 *
 * Extracts server route contracts from HTML files containing hyperscript,
 * htmx, and fixi attributes. Can also generate server-side route scaffolding
 * for Express, Hono, OpenAPI, Django, and FastAPI targets.
 */

import type { Tool } from '@modelcontextprotocol/server';
// Types only: the package is an optional peer, loaded below on first use. Typed, so a change to
// its return shapes fails the typecheck. (Untyped, both tools read `scanRoutes(...).routes` from
// the array it returns, and threw on every input from the day they were added until 7.2.0.)
import type * as ServerBridge from '@hyperfixi/server-bridge';
import { validateRequired, getString, getBoolean, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded ServerBridge module
let serverBridge: typeof ServerBridge | null = null;

async function getServerBridge(): Promise<typeof ServerBridge> {
  if (serverBridge) return serverBridge;

  try {
    serverBridge = await import('@hyperfixi/server-bridge');
    return serverBridge;
  } catch {
    throw new Error(
      '@hyperfixi/server-bridge not available. Install it to use route extraction tools.'
    );
  }
}

function generatorFor(
  bridge: typeof ServerBridge,
  framework: string
): ServerBridge.RouteGenerator | null {
  switch (framework) {
    case 'express':
      return new bridge.ExpressGenerator();
    case 'hono':
      return new bridge.HonoGenerator();
    case 'openapi':
      return new bridge.OpenAPIGenerator();
    case 'django':
      return new bridge.DjangoGenerator();
    case 'fastapi':
      return new bridge.FastAPIGenerator();
    default:
      return null;
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const routeTools: Tool[] = [
  {
    name: 'extract_routes',
    description:
      'Extract server route contracts from HTML content containing hyperscript fetch commands, ' +
      'htmx attributes (hx-get, hx-post, etc.), and fixi attributes (fx-action). ' +
      'Returns RouteDescriptor[] with path, method, responseFormat, pathParams, and requestBody.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        html: {
          type: 'string',
          description: 'HTML content to scan for route declarations',
        },
        filename: {
          type: 'string',
          description: 'Optional filename for source attribution (default: "input.html")',
        },
      },
      required: ['html'],
    },
  },
  {
    name: 'generate_server_routes',
    description:
      'Generate server-side route scaffolding from HTML content. Scans for routes and produces ' +
      'framework-specific code. Supports Express, Hono, OpenAPI, Django, and FastAPI output.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        html: {
          type: 'string',
          description: 'HTML content to scan for route declarations',
        },
        framework: {
          type: 'string',
          description:
            'Target framework: "express", "hono", "openapi", "django", or "fastapi" (default: "express")',
          enum: ['express', 'hono', 'openapi', 'django', 'fastapi'],
        },
        typescript: {
          type: 'boolean',
          description: 'Generate TypeScript output (default: true)',
        },
        filename: {
          type: 'string',
          description: 'Optional filename for source attribution (default: "input.html")',
        },
      },
      required: ['html'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

export async function handleRouteTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'extract_routes':
        return await extractRoutes(args);
      case 'generate_server_routes':
        return await generateServerRoutes(args);
      default:
        return errorResponse(`Unknown route tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Route tool error: ${message}`);
  }
}

// =============================================================================
// Tool Implementations
// =============================================================================

async function extractRoutes(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['html']);
  if (error) return error;

  const html = getString(args, 'html');
  const filename = getString(args, 'filename', 'input.html');

  const bridge = await getServerBridge();
  const routes = bridge.scanRoutes(html, filename);

  return jsonResponse({
    routes,
    count: routes.length,
    conflicts: bridge.detectConflicts(routes),
  });
}

async function generateServerRoutes(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['html']);
  if (error) return error;

  const html = getString(args, 'html');
  const framework = getString(args, 'framework', 'express') as
    'express' | 'hono' | 'openapi' | 'django' | 'fastapi';
  const typescript = getBoolean(args, 'typescript', true);
  const filename = getString(args, 'filename', 'input.html');

  const bridge = await getServerBridge();
  const generator = generatorFor(bridge, framework);
  if (!generator) {
    return errorResponse(
      `Unknown framework: ${framework}. Supported: express, hono, openapi, django, fastapi`
    );
  }

  const routes = bridge.scanRoutes(html, filename);
  if (routes.length === 0) {
    return jsonResponse({
      files: [],
      routes: 0,
      message: 'No routes found in the provided HTML.',
    });
  }

  const generated = generator.generate(routes, {
    outputDir: './server/routes',
    typescript,
  });

  return jsonResponse({
    framework: generator.framework,
    routes: routes.length,
    files: generated.files.map(f => ({
      path: f.path,
      content: f.content,
    })),
    warnings: generated.warnings,
    conflicts: bridge.detectConflicts(routes),
  });
}
