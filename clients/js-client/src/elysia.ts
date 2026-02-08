import { Elysia, Context } from 'elysia';
import {
  HyperfixiClient,
  CompileRequest,
  ValidateRequest,
  BatchCompileRequest,
  CompilationOptions,
  HyperfixiError,
  eventAttribute,
  escapeAttrValue,
} from './types';

/**
 * ElysiaJS plugin configuration for LokaScript
 */
export interface ElysiaPluginConfig {
  client: HyperfixiClient;
  compileOnResponse?: boolean;
  templateVarsHeader?: string;
  compilationOptions?: CompilationOptions;
  skipPaths?: string[];
  onlyContentTypes?: string[];
  errorHandler?: (context: Context, error: Error) => void;
  basePath?: string;
}

/**
 * Default ElysiaJS plugin configuration
 */
const DEFAULT_PLUGIN_CONFIG: Partial<ElysiaPluginConfig> = {
  compileOnResponse: true,
  templateVarsHeader: 'x-hyperscript-template-vars',
  compilationOptions: {},
  skipPaths: ['/api/', '/static/'],
  onlyContentTypes: ['text/html'],
  basePath: '/hyperscript',
};

/**
 * Default error handler for ElysiaJS plugin
 */
function defaultErrorHandler(context: Context, error: Error): void {
  console.error('LokaScript ElysiaJS plugin error:', error.message);
  // Don't break the response, just log the error
}

/**
 * ElysiaJS plugin for LokaScript integration
 */
export function lokascriptPlugin(config: ElysiaPluginConfig) {
  const finalConfig = { ...DEFAULT_PLUGIN_CONFIG, ...config };

  if (!finalConfig.client) {
    throw new Error('LokaScript client is required in plugin config');
  }

  if (!finalConfig.errorHandler) {
    finalConfig.errorHandler = defaultErrorHandler;
  }

  return new Elysia({ name: 'lokascript' })
    // Add client to context
    .derive(({ headers }) => {
      // Parse template variables from header
      let templateVars: Record<string, any> | undefined;
      const headerValue = headers[finalConfig.templateVarsHeader!];
      if (headerValue) {
        try {
          templateVars = JSON.parse(headerValue);
        } catch (error) {
          // Invalid JSON in header, ignore
        }
      }

      return {
        lokascript: finalConfig.client!,
        lokascriptTemplateVars: templateVars,
      };
    })
    
    // Response processing hook
    .onAfterHandle({ as: 'global' }, async (context) => {
      if (!finalConfig.compileOnResponse) {
        return;
      }

      // Check if we should skip this path
      const url = new URL(context.request.url);
      const path = url.pathname;
      
      for (const skipPath of finalConfig.skipPaths || []) {
        if (path.startsWith(skipPath)) {
          return;
        }
      }

      // Only process successful responses
      if (!context.response || context.set.status >= 400) {
        return;
      }

      // Check content type
      const contentType = context.set.headers?.['content-type'] || '';
      if (finalConfig.onlyContentTypes && finalConfig.onlyContentTypes.length > 0) {
        const shouldProcess = finalConfig.onlyContentTypes.some(type => 
          contentType.includes(type)
        );
        if (!shouldProcess) {
          return;
        }
      }

      // Process HTML response if it's a string
      if (typeof context.response === 'string') {
        try {
          const processedBody = await compileHyperscriptInHtml(
            finalConfig.client!,
            context.response,
            context.lokascriptTemplateVars,
            finalConfig.compilationOptions
          );
          context.response = processedBody;
        } catch (error) {
          finalConfig.errorHandler!(context, error as Error);
        }
      }
    })

    // API Routes
    .group(finalConfig.basePath!, (app) =>
      app
        // Compile endpoint
        .post('/compile', async ({ body, lokascript }) => {
          try {
            const request = body as CompileRequest;
            return await lokascript.compile(request);
          } catch (error) {
            throw createElysiaError(error);
          }
        }, {
          body: 'object',
          response: 'object',
        })

        // Validate endpoint
        .post('/validate', async ({ body, lokascript }) => {
          try {
            const request = body as ValidateRequest;
            return await lokascript.validate(request);
          } catch (error) {
            throw createElysiaError(error);
          }
        }, {
          body: 'object',
          response: 'object',
        })

        // Batch compile endpoint
        .post('/batch', async ({ body, lokascript }) => {
          try {
            const request = body as BatchCompileRequest;
            return await lokascript.batchCompile(request);
          } catch (error) {
            throw createElysiaError(error);
          }
        }, {
          body: 'object',
          response: 'object',
        })

        // Health endpoint
        .get('/health', async ({ lokascript }) => {
          try {
            return await lokascript.health();
          } catch (error) {
            throw createElysiaError(error);
          }
        })

        // Cache stats endpoint
        .get('/cache/stats', async ({ lokascript }) => {
          try {
            return await lokascript.cacheStats();
          } catch (error) {
            throw createElysiaError(error);
          }
        })

        // Clear cache endpoint
        .post('/cache/clear', async ({ lokascript }) => {
          try {
            await lokascript.clearCache();
            return { message: 'Cache cleared successfully' };
          } catch (error) {
            throw createElysiaError(error);
          }
        })
    );
}

/**
 * Find and compile hyperscript attributes in HTML
 */
async function compileHyperscriptInHtml(
  client: HyperfixiClient,
  html: string,
  templateVars?: Record<string, any>,
  options?: CompilationOptions
): Promise<string> {
  // Find all hyperscript attributes
  const hyperscriptPattern = /(?:_|data-hs)="([^"]*)"/g;
  const matches = [...html.matchAll(hyperscriptPattern)];

  if (matches.length === 0) {
    return html;
  }

  try {
    // Create scripts map
    const scripts: Record<string, string> = {};
    matches.forEach((match, index) => {
      scripts[`script_${index}`] = match[1] || '';
    });

    // Compile scripts
    const request: CompileRequest = {
      scripts,
      ...(options && { options }),
      ...(templateVars && { context: { templateVars } }),
    };

    const result = await client.compile(request);

    // Replace hyperscript with compiled JavaScript using correct event attribute
    let compiledHtml = html;
    matches.forEach((match, index) => {
      const scriptId = `script_${index}`;
      const compiled = result.compiled[scriptId];

      if (compiled) {
        const oldAttr = match[0]; // Full match like _="on click toggle .active"
        const attr = eventAttribute(result.metadata[scriptId]);
        const newAttr = `${attr}="${escapeAttrValue(compiled)}"`;
        compiledHtml = compiledHtml.replace(oldAttr, newAttr);
      }
    });

    return compiledHtml;
  } catch (error) {
    // If compilation fails, return original HTML
    console.error('HyperScript compilation failed:', error);
    return html;
  }
}

/**
 * Create appropriate Elysia error from LokaScript error
 */
function createElysiaError(error: unknown): Error {
  if (error instanceof HyperfixiError) {
    const elysiaError = new Error(error.message);
    elysiaError.name = error.name;
    return elysiaError;
  } else if (error instanceof Error) {
    return error;
  } else {
    return new Error('Unknown error occurred');
  }
}

/**
 * ElysiaJS template helpers for hyperscript compilation
 */
export function createElysiaTemplateHelpers(client: HyperfixiClient) {
  return {
    async compileHyperscript(
      script: string,
      templateVars?: Record<string, any>
    ): Promise<string> {
      try {
        const request: CompileRequest = {
          scripts: { template_script: script },
          ...(templateVars && { context: { templateVars } }),
        };

        const result = await client.compile(request);
        const compiled = result.compiled.template_script;
        if (!compiled) return '';
        const attr = eventAttribute(result.metadata.template_script);
        return `${attr}="${escapeAttrValue(compiled)}"`;
      } catch (error) {
        console.error('HyperScript template compilation failed:', error);
        return `onclick="/* LokaScript compilation error: ${error instanceof Error ? error.message : 'Unknown error'} */"`;
      }
    },

    async compileHyperscriptWithOptions(
      script: string,
      templateVars?: Record<string, any>,
      options?: CompilationOptions
    ): Promise<string> {
      try {
        const request: CompileRequest = {
          scripts: { template_script: script },
          ...(options && { options }),
          ...(templateVars && { context: { templateVars } }),
        };

        const result = await client.compile(request);
        const compiled = result.compiled.template_script;
        if (!compiled) return '';
        const attr = eventAttribute(result.metadata.template_script);
        return `${attr}="${escapeAttrValue(compiled)}"`;
      } catch (error) {
        console.error('HyperScript template compilation failed:', error);
        return `onclick="/* LokaScript compilation error: ${error instanceof Error ? error.message : 'Unknown error'} */"`;
      }
    },

    async validateHyperscript(script: string): Promise<boolean> {
      try {
        const result = await client.validateScript(script);
        return result.valid;
      } catch (error) {
        return false;
      }
    },
  };
}

/**
 * Get LokaScript client from Elysia context
 */
export function getHyperfixiClient(context: Context): HyperfixiClient | undefined {
  return (context as any).lokascript;
}

/**
 * Get template variables from Elysia context
 */
export function getTemplateVars(context: Context): Record<string, any> | undefined {
  return (context as any).lokascriptTemplateVars;
}

/**
 * Create a standalone Elysia app with LokaScript routes only
 */
export function createHyperfixiApp(client: HyperfixiClient, basePath = '/hyperscript') {
  return new Elysia()
    .use(lokascriptPlugin({ client, basePath, compileOnResponse: false }));
}

/**
 * Create ElysiaJS middleware configuration builder
 */
export function createElysiaConfig(client: HyperfixiClient): ElysiaPluginConfig {
  return {
    client,
    ...DEFAULT_PLUGIN_CONFIG,
  };
}