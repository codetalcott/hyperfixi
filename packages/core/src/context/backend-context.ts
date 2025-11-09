/**
 * Backend Context Implementation
 * Type-safe server-side hyperscript context following enhanced pattern
 */

import { v, z } from '../validation/lightweight-validators';
import {
  EnhancedContextBase,
  BaseContextInputSchema,
  BaseContextOutputSchema,
  type ContextMetadata,
  type EvaluationResult,
} from '../types/context-types';
import type { ValidationResult, ValidationError, EvaluationType } from '../types/base-types';
import type { LLMDocumentation } from '../types/command-types';

// ============================================================================
// Backend Context Input/Output Schemas
// ============================================================================

export const BackendContextInputSchema = v
  .object({
    /** Server request data */
    request: z
      .object({
        method: v.string().optional(),
        url: v.string().optional(),
        headers: z.record(v.string(), v.string()).optional(),
        body: v.unknown().optional(),
        params: z.record(v.string(), v.string()).optional(),
        query: z.record(v.string(), v.string()).optional(),
      })
      .optional(),
    /** Server response builder */
    response: v
      .object({
        status: v.number().optional(),
        headers: z.record(v.string(), v.string()).optional(),
      })
      .optional(),
    /** Database and service access */
    services: v
      .object({
        database: v.any().optional(),
        cache: v.any().optional(),
        logger: v.any().optional(),
        queue: v.any().optional(),
      })
      .optional(),
    /** Framework-specific data */
    framework: v
      .object({
        name: z.enum(['django', 'flask', 'express', 'fastapi', 'gin']).optional(),
        version: v.string().optional(),
        context: v.any().optional(), // Framework-specific request/response objects
      })
      .optional(),
  })
  .merge(BaseContextInputSchema);

export const BackendContextOutputSchema = v
  .object({
    /** Backend-specific capabilities */
    request: z.object({
      get: z.function(), // Get request data
      validate: z.function(), // Validate request
    }),
    response: v.object({
      json: z.function(), // Send JSON response
      html: z.function(), // Send HTML response
      redirect: z.function(), // Redirect response
      status: z.function(), // Set status code
    }),
    services: v.object({
      db: z.object({
        query: z.function(),
        transaction: z.function(),
      }),
      cache: v.object({
        get: z.function(),
        set: z.function(),
        invalidate: z.function(),
      }),
      logger: v.object({
        info: z.function(),
        error: z.function(),
        debug: z.function(),
      }),
    }),
  })
  .merge(BaseContextOutputSchema);

export type BackendContextInput = any; // Inferred from RuntimeValidator
export type BackendContextOutput = any; // Inferred from RuntimeValidator

// ============================================================================
// Backend Context Implementation
// ============================================================================

export class TypedBackendContextImplementation extends EnhancedContextBase<
  BackendContextInput,
  BackendContextOutput
> {
  public readonly name = 'backendContext';
  public readonly category = 'Backend' as const;
  public readonly description =
    'Type-safe backend hyperscript context with server-side capabilities';
  public readonly inputSchema = BackendContextInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  public readonly metadata: ContextMetadata = {
    category: 'Backend',
    complexity: 'medium',
    sideEffects: ['database-access', 'response-modification', 'logging', 'cache-access'],
    dependencies: ['server-runtime', 'database', 'cache'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ request: { method: "POST", url: "/api/users" }, services: { database, cache } }',
        description: 'Initialize backend context with request data and services',
        expectedOutput: 'TypedBackendContext with request/response and service capabilities',
      },
      {
        input:
          '{ framework: { name: "django", context: djangoRequest }, services: { database: models } }',
        description: 'Backend context for Django framework with ORM access',
        expectedOutput: 'Django-aware context with model access',
      },
    ],
    relatedContexts: ['frontendContext', 'universalContext'],
    relatedExpressions: ['request', 'response', 'database', 'cache', 'service'],
    frameworkDependencies: ['nodejs', 'python', 'go'],
    environmentRequirements: {
      server: true,
      nodejs: true,
      python: true,
    },
    performance: {
      averageTime: 3.8,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary:
      'Creates type-safe backend context for server-side hyperscript execution with request/response handling, database access, and service integration',
    parameters: [
      {
        name: 'contextData',
        type: 'BackendContextInput',
        description:
          'Backend-specific context initialization data including request/response and service access',
        optional: false,
        examples: [
          '{ request: { method: "GET", url: "/users" } }',
          '{ services: { database, cache, logger }, framework: { name: "express" } }',
          '{ request: httpRequest, response: httpResponse, services: { db: models } }',
        ],
      },
    ],
    returns: {
      type: 'BackendContext',
      description:
        'Initialized backend context with request handling, response building, and service access capabilities',
      examples: [
        'context.request.get("userId")',
        'context.response.json({ success: true })',
        'context.services.db.query("SELECT * FROM users")',
        'context.services.cache.set("key", data, 3600)',
      ],
    },
    examples: [
      {
        title: 'Express.js API endpoint',
        code: 'const context = await backendContext.initialize({ request: req, response: res, framework: { name: "express" } })',
        explanation: 'Create backend context for Express.js API endpoint handling',
        output: 'Context with Express-specific request/response capabilities',
      },
      {
        title: 'Django view context',
        code: 'await context.initialize({ framework: { name: "django", context: request }, services: { database: models } })',
        explanation: 'Initialize Django view context with ORM access',
        output: 'Django-aware context with model querying and response building',
      },
      {
        title: 'Full backend services',
        code: 'await context.initialize({ services: { database, cache, logger, queue } })',
        explanation: 'Create comprehensive backend context with all service access',
        output: 'Full-service backend context for complex operations',
      },
    ],
    seeAlso: ['frontendContext', 'universalContext', 'enhancedExpressions'],
    tags: ['context', 'backend', 'server', 'api', 'database', 'type-safe', 'enhanced-pattern'],
  };

  async initialize(input: BackendContextInput): Promise<EvaluationResult<BackendContextOutput>> {
    const startTime = Date.now();

    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Create enhanced backend context
      const context: BackendContextOutput = {
        contextId: `backend-${Date.now()}`,
        timestamp: startTime,
        category: 'Backend',
        capabilities: [
          'request-handling',
          'response-building',
          'database-access',
          'caching',
          'logging',
        ],
        state: 'ready',

        // Enhanced request handling
        request: {
          get: this.createEnhancedRequestGetter(input.request),
          validate: this.createEnhancedRequestValidator(input.request),
        },

        // Enhanced response building
        response: {
          json: this.createEnhancedJsonResponse(input.response),
          html: this.createEnhancedHtmlResponse(input.response),
          redirect: this.createEnhancedRedirect(input.response),
          status: this.createEnhancedStatusSetter(input.response),
        },

        // Enhanced service access
        services: {
          db: this.createEnhancedDatabaseAccess(input.services?.database),
          cache: this.createEnhancedCacheAccess(input.services?.cache),
          logger: this.createEnhancedLogger(input.services?.logger),
        },
      };

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);

      return {
        success: true,
        value: context,
        type: 'Context',
      };
    } catch (error) {
      this.trackPerformance(startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Backend context initialization failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        suggestions: [
          'Verify server environment availability',
          'Check service connections and availability',
          'Ensure framework context is properly configured',
        ],
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods (following enhanced expression pattern)
  // ============================================================================

  private createEnhancedRequestGetter(request?: any) {
    return (key: string) => {
      if (!request) return undefined;

      // Try different request properties
      return (
        request[key] ||
        request.params?.[key] ||
        request.query?.[key] ||
        request.body?.[key] ||
        request.headers?.[key]
      );
    };
  }

  private createEnhancedRequestValidator(request?: any) {
    return (schema: any) => {
      if (!request) return { isValid: false, errors: ['No request data available'] };

      try {
        schema.parse(request);
        return { isValid: true, errors: [] };
      } catch (error) {
        return {
          isValid: false,
          errors: error instanceof Error ? [error.message] : ['Validation failed'],
        };
      }
    };
  }

  private createEnhancedJsonResponse(response?: any) {
    return (data: any, statusCode = 200) => {
      if (response && typeof response.json === 'function') {
        response.status(statusCode).json(data);
      } else if (response) {
        response.statusCode = statusCode;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(data));
      }
      return { status: statusCode, data };
    };
  }

  private createEnhancedHtmlResponse(response?: any) {
    return (html: string, statusCode = 200) => {
      if (response) {
        if (typeof response.send === 'function') {
          response.status(statusCode).send(html);
        } else {
          response.statusCode = statusCode;
          response.setHeader('Content-Type', 'text/html');
          response.end(html);
        }
      }
      return { status: statusCode, html };
    };
  }

  private createEnhancedRedirect(response?: any) {
    return (url: string, statusCode = 302) => {
      if (response && typeof response.redirect === 'function') {
        response.redirect(statusCode, url);
      } else if (response) {
        response.statusCode = statusCode;
        response.setHeader('Location', url);
        response.end();
      }
      return { status: statusCode, url };
    };
  }

  private createEnhancedStatusSetter(response?: any) {
    return (code: number) => {
      if (response) {
        if (typeof response.status === 'function') {
          response.status(code);
        } else {
          response.statusCode = code;
        }
      }
      return code;
    };
  }

  private createEnhancedDatabaseAccess(database?: any) {
    return {
      query: async (sql: string, params?: any[]) => {
        if (!database) throw new Error('Database not available in backend context');

        if (typeof database.query === 'function') {
          return await database.query(sql, params);
        } else if (typeof database.raw === 'function') {
          return await database.raw(sql, params);
        }
        throw new Error('Database query method not found');
      },
      transaction: async (callback: Function) => {
        if (!database) throw new Error('Database not available in backend context');

        if (typeof database.transaction === 'function') {
          return await database.transaction(callback);
        }
        throw new Error('Database transaction method not found');
      },
    };
  }

  private createEnhancedCacheAccess(cache?: any) {
    return {
      get: async (key: string) => {
        if (!cache) return null;

        if (typeof cache.get === 'function') {
          return await cache.get(key);
        }
        return cache[key] || null;
      },
      set: async (key: string, value: any, ttl?: number) => {
        if (!cache) return;

        if (typeof cache.set === 'function') {
          await cache.set(key, value, ttl);
        } else {
          cache[key] = value;
        }
      },
      invalidate: async (pattern: string) => {
        if (!cache) return;

        if (typeof cache.del === 'function') {
          await cache.del(pattern);
        } else if (typeof cache.invalidate === 'function') {
          await cache.invalidate(pattern);
        }
      },
    };
  }

  private createEnhancedLogger(logger?: any) {
    return {
      info: (message: string, ...args: any[]) => {
        if (logger && typeof logger.info === 'function') {
          logger.info(message, ...args);
        } else {
          console.log(`[INFO] ${message}`, ...args);
        }
      },
      error: (message: string, ...args: any[]) => {
        if (logger && typeof logger.error === 'function') {
          logger.error(message, ...args);
        } else {
          console.error(`[ERROR] ${message}`, ...args);
        }
      },
      debug: (message: string, ...args: any[]) => {
        if (logger && typeof logger.debug === 'function') {
          logger.debug(message, ...args);
        } else {
          console.debug(`[DEBUG] ${message}`, ...args);
        }
      },
    };
  }

  protected override validateContextSpecific(data: BackendContextInput): ValidationResult {
    const errors: ValidationError[] = [];
    const suggestions: string[] = [];

    // Validate framework configuration
    if (data.framework && data.framework.name) {
      const supportedFrameworks = ['django', 'flask', 'express', 'fastapi', 'gin'];
      if (!supportedFrameworks.includes(data.framework.name)) {
        errors.push({
          type: 'validation-error',
          message: `Framework ${data.framework.name} is not supported`,
          path: 'framework.name',
          suggestions: [`Use one of: ${supportedFrameworks.join(', ')}`],
        });
      }
    }

    // Validate service availability
    if (data.services) {
      if (data.services.database && typeof data.services.database !== 'object') {
        errors.push({
          type: 'type-mismatch',
          message: 'Database service must be an object with query capabilities',
          path: 'services.database',
          suggestions: ['Provide a database service object with query methods'],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }
}

// ============================================================================
// Framework-Specific Context Creators
// ============================================================================

export function createDjangoContext(
  request: any,
  models: any
): Promise<EvaluationResult<BackendContextOutput>> {
  const context = new TypedBackendContextImplementation();
  return context.initialize({
    framework: { name: 'django', context: request },
    services: { database: models },
    request: {
      method: request.method,
      url: request.get_full_path(),
      headers: Object.fromEntries(Object.entries(request.META || {})),
    },
  });
}

export function createExpressContext(
  req: any,
  res: any
): Promise<EvaluationResult<BackendContextOutput>> {
  const context = new TypedBackendContextImplementation();
  return context.initialize({
    framework: { name: 'express', context: { req, res } },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    },
    response: res,
  });
}

export function createFlaskContext(request: any): Promise<EvaluationResult<BackendContextOutput>> {
  const context = new TypedBackendContextImplementation();
  return context.initialize({
    framework: { name: 'flask', context: request },
    request: {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers || []),
      body: request.get_json({ silent: true }),
    },
  });
}

// ============================================================================
// Convenience Factory Function
// ============================================================================

export function createBackendContext(): TypedBackendContextImplementation {
  return new TypedBackendContextImplementation();
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const backendContextImplementation = new TypedBackendContextImplementation();
