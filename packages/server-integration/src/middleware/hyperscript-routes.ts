/**
 * Hyperscript Routes Middleware
 *
 * Enables server-side hyperscript route handling via the request event source.
 * This middleware should be added to your Express app to enable hyperscript-based routing.
 *
 * @example
 * import { createHyperscriptRoutesMiddleware } from '@lokascript/server-integration';
 * import { registry } from '@lokascript/core/registry';
 *
 * // Setup the middleware
 * const middleware = createHyperscriptRoutesMiddleware({
 *   registry,
 *   debug: true
 * });
 *
 * app.use(middleware);
 */

import type { Request, Response, NextFunction } from 'express';
import type { LokaScriptRegistry } from '@lokascript/core/registry';
import {
  createRequestEventSource,
  expressRequestToServerRequest,
  wrapExpressResponse,
} from '../events/request-event-source.js';

export interface HyperscriptRoutesOptions {
  /** Registry to use (defaults to global registry) */
  registry?: LokaScriptRegistry;

  /** Enable debug logging */
  debug?: boolean;

  /** Continue to next middleware even if handler matched */
  alwaysCallNext?: boolean;

  /** Custom error handler */
  onError?: (error: Error, req: Request, res: Response) => void;
}

/**
 * Create Express middleware for hyperscript route handling
 */
export function createHyperscriptRoutesMiddleware(options: HyperscriptRoutesOptions = {}) {
  const { debug = false, alwaysCallNext = false, onError } = options;

  // Get or use provided registry
  let requestSource: ReturnType<typeof createRequestEventSource>;

  // Lazy initialization on first request
  let initialized = false;

  return async function hyperscriptRoutesMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Initialize on first request
    if (!initialized) {
      try {
        // Dynamic import to avoid circular dependencies
        const { getDefaultRegistry } = await import('@lokascript/core/registry');
        const registry = options.registry || getDefaultRegistry();

        // Create and register the request event source
        requestSource = createRequestEventSource();
        registry.eventSources.register('request', requestSource);

        if (debug) {
          console.log('[HyperscriptRoutes] Initialized request event source');
        }

        initialized = true;
      } catch (error) {
        console.error('[HyperscriptRoutes] Failed to initialize:', error);
        return next();
      }
    }

    try {
      // Convert Express request/response to framework-agnostic interfaces
      const serverRequest = expressRequestToServerRequest(req);
      const serverResponse = wrapExpressResponse(res);

      if (debug) {
        console.log(`[HyperscriptRoutes] Processing ${serverRequest.method} ${serverRequest.path}`);
      }

      // Try to handle with hyperscript
      const handled = requestSource.handleRequest(serverRequest, serverResponse);

      if (debug) {
        console.log(`[HyperscriptRoutes] Handled: ${handled}`);
      }

      // Continue to next middleware if not handled or if alwaysCallNext is true
      if (!handled || alwaysCallNext) {
        next();
      }
    } catch (error) {
      console.error('[HyperscriptRoutes] Error processing request:', error);

      if (onError) {
        onError(error as Error, req, res);
      } else {
        // Default error handling - pass to Express error handler
        next(error);
      }
    }
  };
}

/**
 * Setup hyperscript routes for an Express app
 * This is a convenience function that registers the middleware and context providers
 */
export async function setupHyperscriptRoutes(
  app: any, // Express Application
  options: HyperscriptRoutesOptions = {}
) {
  const { debug = false } = options;

  try {
    // Import registry
    const { getDefaultRegistry } = await import('@lokascript/core/registry');
    const registry = options.registry || getDefaultRegistry();

    // Register context providers for request/response
    setupContextProviders(registry);

    // Add the middleware
    const middleware = createHyperscriptRoutesMiddleware(options);
    app.use(middleware);

    if (debug) {
      console.log('[HyperscriptRoutes] Setup complete');
    }

    return {
      registry,
      middleware,
    };
  } catch (error) {
    console.error('[HyperscriptRoutes] Setup failed:', error);
    throw error;
  }
}

/**
 * Setup context providers for server-side hyperscript
 * Makes request, response, params, etc. available in hyperscript code
 */
function setupContextProviders(registry: LokaScriptRegistry) {
  // Register request context provider
  registry.context.register(
    'request',
    context => {
      return context.locals.get('request');
    },
    {
      description: 'Current HTTP request object',
      cache: true,
    }
  );

  // Register response context provider
  registry.context.register(
    'response',
    context => {
      return context.locals.get('response');
    },
    {
      description: 'Current HTTP response object',
      cache: true,
    }
  );

  // Register params context provider
  registry.context.register(
    'params',
    context => {
      return context.locals.get('params') || {};
    },
    {
      description: 'URL route parameters',
      cache: true,
    }
  );

  // Register query context provider
  registry.context.register(
    'query',
    context => {
      return context.locals.get('query') || {};
    },
    {
      description: 'URL query parameters',
      cache: true,
    }
  );

  // Register body context provider
  registry.context.register(
    'body',
    context => {
      return context.locals.get('body');
    },
    {
      description: 'Request body (parsed JSON)',
      cache: true,
    }
  );

  // Register headers context provider
  registry.context.register(
    'headers',
    context => {
      return context.locals.get('headers') || {};
    },
    {
      description: 'Request headers',
      cache: true,
    }
  );

  console.log('[HyperscriptRoutes] Registered context providers');
}
