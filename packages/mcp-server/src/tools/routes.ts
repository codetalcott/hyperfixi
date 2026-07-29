/**
 * ServerBridge Route MCP Tools
 *
 * Extracts server route contracts from HTML files containing hyperscript,
 * htmx, and fixi attributes. Can also generate server-side route scaffolding
 * for Express, Hono, OpenAPI, Django, and FastAPI targets.
 */

import { validateRequired, getString, getBoolean, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded ServerBridge modules
let scanRoutesImpl: any = null;
let generators: Record<string, any> = {};

async function getScanRoutes() {
  if (scanRoutesImpl) return scanRoutesImpl;

  try {
    const mod = await import('@hyperfixi/server-bridge');
    scanRoutesImpl = mod.scanRoutes;
    generators = {
      express: mod.ExpressGenerator,
      hono: mod.HonoGenerator,
      openapi: mod.OpenAPIGenerator,
      django: mod.DjangoGenerator,
      fastapi: mod.FastAPIGenerator,
    };
    return scanRoutesImpl;
  } catch {
    throw new Error(
      '@hyperfixi/server-bridge not available. Install it to use route extraction tools.'
    );
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const routeTools = [
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

  const scanRoutes = await getScanRoutes();
  const result = scanRoutes(html, filename);

  return jsonResponse({
    routes: result.routes,
    count: result.routes.length,
    errors: result.errors,
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

  const scanRoutes = await getScanRoutes();
  const result = scanRoutes(html, filename);

  if (result.routes.length === 0) {
    return jsonResponse({
      files: [],
      routes: 0,
      message: 'No routes found in the provided HTML.',
      errors: result.errors,
    });
  }

  const GeneratorClass = generators[framework];
  if (!GeneratorClass) {
    return errorResponse(
      `Unknown framework: ${framework}. Supported: express, hono, openapi, django, fastapi`
    );
  }

  const generator = new GeneratorClass();
  const generated = generator.generate(result.routes, {
    outputDir: './server/routes',
    typescript,
  });

  return jsonResponse({
    framework: generator.framework,
    routes: result.routes.length,
    files: generated.files.map((f: any) => ({
      path: f.path,
      content: f.content,
    })),
    warnings: generated.warnings,
    scanErrors: result.errors,
  });
}
