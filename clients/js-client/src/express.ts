import { Request, Response, NextFunction, Router } from 'express';
import {
  HyperfixiClient,
  ExpressMiddlewareConfig,
  CompileRequest,
  ValidateRequest,
  BatchCompileRequest,
  CompilationOptions,
  TemplateHelpers,
  HyperfixiError,
  eventAttribute,
  escapeAttrValue,
} from './types';

/**
 * Default Express middleware configuration
 */
const DEFAULT_MIDDLEWARE_CONFIG: Partial<ExpressMiddlewareConfig> = {
  compileOnResponse: true,
  templateVarsHeader: 'X-Hyperscript-Template-Vars',
  compilationOptions: {},
  skipPaths: ['/api/', '/static/'],
  onlyContentTypes: ['text/html'],
};

/**
 * Default error handler for Express middleware
 */
function defaultErrorHandler(req: Request, res: Response, error: Error): void {
  console.error('LokaScript middleware error:', error.message);
  // Don't break the response, just log the error
}

/**
 * Express middleware for automatic hyperscript compilation
 */
export function lokascriptMiddleware(config: ExpressMiddlewareConfig) {
  const finalConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config };

  if (!finalConfig.client) {
    throw new Error('LokaScript client is required in middleware config');
  }

  if (!finalConfig.errorHandler) {
    finalConfig.errorHandler = defaultErrorHandler;
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Add client to request for use in handlers
    (req as any).lokascript = finalConfig.client;

    // Parse template variables from header
    let templateVars: Record<string, any> | undefined;
    const headerValue = req.get(finalConfig.templateVarsHeader!);
    if (headerValue) {
      try {
        templateVars = JSON.parse(headerValue);
        (req as any).lokascriptTemplateVars = templateVars;
      } catch (error) {
        // Invalid JSON in header, ignore
      }
    }

    if (!finalConfig.compileOnResponse) {
      return next();
    }

    // Check if we should skip this path
    const path = req.path;
    for (const skipPath of finalConfig.skipPaths || []) {
      if (path.startsWith(skipPath)) {
        return next();
      }
    }

    // Capture the original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send to process HTML responses
    res.send = function(body: any) {
      if (shouldProcessResponse(res, finalConfig.onlyContentTypes)) {
        processHtmlResponse(body, finalConfig, templateVars)
          .then((processedBody) => {
            originalSend.call(this, processedBody);
          })
          .catch((error) => {
            finalConfig.errorHandler!(req, res, error);
            originalSend.call(this, body);
          });
      } else {
        originalSend.call(this, body);
      }
      return this;
    };

    // Override res.json (in case someone sends HTML via JSON)
    res.json = function(obj: any) {
      originalJson.call(this, obj);
      return this;
    };

    next();
  };
}

/**
 * Check if response should be processed for hyperscript compilation
 */
function shouldProcessResponse(res: Response, onlyContentTypes?: string[]): boolean {
  if (res.statusCode >= 400) {
    return false;
  }

  const contentType = res.get('Content-Type') || '';
  
  if (!onlyContentTypes || onlyContentTypes.length === 0) {
    return true;
  }

  return onlyContentTypes.some(type => contentType.includes(type));
}

/**
 * Process HTML response to compile hyperscript
 */
async function processHtmlResponse(
  body: any,
  config: ExpressMiddlewareConfig,
  templateVars?: Record<string, any>
): Promise<string> {
  if (typeof body !== 'string') {
    return body;
  }

  return compileHyperscriptInHtml(
    config.client!, 
    body, 
    templateVars, 
    config.compilationOptions
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
 * Express template helpers for hyperscript compilation
 */
export function createTemplateHelpers(client: HyperfixiClient): TemplateHelpers {
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
 * Create Express API routes for LokaScript operations
 */
export function createApiRoutes(client: HyperfixiClient, basePath = '/hyperscript'): Router {
  const router = Router();

  // Compile endpoint
  router.post(`${basePath}/compile`, async (req: Request, res: Response) => {
    try {
      const request = req.body as CompileRequest;
      const result = await client.compile(request);
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Validate endpoint
  router.post(`${basePath}/validate`, async (req: Request, res: Response) => {
    try {
      const request = req.body as ValidateRequest;
      const result = await client.validate(request);
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Batch compile endpoint
  router.post(`${basePath}/batch`, async (req: Request, res: Response) => {
    try {
      const request = req.body as BatchCompileRequest;
      const result = await client.batchCompile(request);
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Health endpoint
  router.get(`${basePath}/health`, async (req: Request, res: Response) => {
    try {
      const result = await client.health();
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Cache stats endpoint
  router.get(`${basePath}/cache/stats`, async (req: Request, res: Response) => {
    try {
      const result = await client.cacheStats();
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Clear cache endpoint
  router.post(`${basePath}/cache/clear`, async (req: Request, res: Response) => {
    try {
      await client.clearCache();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  return router;
}

/**
 * Handle API errors consistently
 */
function handleApiError(res: Response, error: unknown): void {
  if (error instanceof HyperfixiError) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      type: error.name,
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      type: 'UnknownError',
    });
  }
}

/**
 * Get LokaScript client from Express request
 */
export function getHyperfixiClient(req: Request): HyperfixiClient | undefined {
  return (req as any).lokascript;
}

/**
 * Get template variables from Express request
 */
export function getTemplateVars(req: Request): Record<string, any> | undefined {
  return (req as any).lokascriptTemplateVars;
}

/**
 * Express middleware configuration builder
 */
export function createMiddlewareConfig(client: HyperfixiClient): ExpressMiddlewareConfig {
  return {
    client,
    ...DEFAULT_MIDDLEWARE_CONFIG,
  };
}