/**
 * Framework-Agnostic Hyperscript Routes
 *
 * Core middleware logic that works with any framework via adapters.
 * Use this with adapters from ./adapters.ts for your specific framework.
 */

import type { LokaScriptRegistry } from '@hyperfixi/core/registry';
import { createRequestEventSource } from '../events/request-event-source.js';
import type { FrameworkAdapter } from './adapters.js';

export interface HyperscriptRoutesOptions {
  /** Registry to use (defaults to global registry) */
  registry?: LokaScriptRegistry;

  /** Framework adapter (required) */
  adapter: FrameworkAdapter;

  /** Enable debug logging */
  debug?: boolean;

  /** Continue to next middleware even if handler matched */
  alwaysCallNext?: boolean;

  /** Custom error handler */
  onError?: (error: Error, req: any, res: any) => void;
}

/**
 * Create framework-agnostic middleware for hyperscript route handling
 *
 * @example
 * // Express
 * import { createHyperscriptMiddleware } from '@lokascript/server-integration';
 * import { createExpressAdapter } from '@lokascript/server-integration/adapters';
 *
 * const middleware = createHyperscriptMiddleware({
 *   adapter: createExpressAdapter()
 * });
 * app.use(middleware);
 *
 * @example
 * // Koa
 * import { createHyperscriptMiddleware } from '@lokascript/server-integration';
 * import { createKoaAdapter } from '@lokascript/server-integration/adapters';
 *
 * const middleware = createHyperscriptMiddleware({
 *   adapter: createKoaAdapter()
 * });
 * app.use(middleware);
 */
export function createHyperscriptMiddleware(options: HyperscriptRoutesOptions) {
  const { adapter, debug = false, alwaysCallNext = false, onError } = options;

  let requestSource: ReturnType<typeof createRequestEventSource>;
  let initialized = false;

  async function initialize() {
    if (initialized) return;

    try {
      // Dynamic import to avoid circular dependencies
      const { getDefaultRegistry } = await import('@hyperfixi/core/registry');
      const registry = options.registry || getDefaultRegistry();

      // Create and register the request event source
      requestSource = createRequestEventSource();
      registry.eventSources.register('request', requestSource);

      // Register context providers
      setupContextProviders(registry);

      if (debug) {
        console.log(`[HyperscriptRoutes:${adapter.name}] Initialized request event source`);
      }

      initialized = true;
    } catch (error) {
      console.error(`[HyperscriptRoutes:${adapter.name}] Failed to initialize:`, error);
      throw error;
    }
  }

  // Create the middleware function using the adapter
  return adapter.createMiddleware(async (req: any, res: any, next?: any) => {
    // Initialize on first request
    if (!initialized) {
      await initialize();
    }

    try {
      // Convert framework-specific request/response to generic interfaces
      const serverRequest = adapter.toServerRequest(req);
      const serverResponse = adapter.wrapServerResponse(res);

      if (debug) {
        console.log(
          `[HyperscriptRoutes:${adapter.name}] Processing ${serverRequest.method} ${serverRequest.path}`
        );
      }

      // Try to handle with hyperscript
      const handled = requestSource.handleRequest(serverRequest, serverResponse);

      if (debug) {
        console.log(`[HyperscriptRoutes:${adapter.name}] Handled: ${handled}`);
      }

      // Continue to next middleware if not handled or if alwaysCallNext is true
      if ((!handled || alwaysCallNext) && next) {
        next();
      }
    } catch (error) {
      console.error(`[HyperscriptRoutes:${adapter.name}] Error processing request:`, error);

      if (onError) {
        onError(error as Error, req, res);
      } else if (next) {
        // Default error handling - pass to framework error handler
        next(error);
      } else {
        // Rethrow if no error handler available
        throw error;
      }
    }
  });
}

/**
 * Setup hyperscript routes for any framework
 * This is a convenience function that creates and applies the middleware
 *
 * @example
 * import { setupHyperscriptRoutes } from '@lokascript/server-integration';
 * import { createExpressAdapter } from '@lokascript/server-integration/adapters';
 *
 * const { registry, middleware } = await setupHyperscriptRoutes(app, {
 *   adapter: createExpressAdapter(),
 *   debug: true
 * });
 */
export async function setupHyperscriptRoutes(app: any, options: HyperscriptRoutesOptions) {
  const { adapter, debug = false } = options;

  try {
    // Import registry
    const { getDefaultRegistry } = await import('@hyperfixi/core/registry');
    const registry = options.registry || getDefaultRegistry();

    // Create the middleware
    const middleware = createHyperscriptMiddleware({ ...options, registry });

    // Apply to app (framework-specific)
    app.use(middleware);

    if (debug) {
      console.log(`[HyperscriptRoutes:${adapter.name}] Setup complete`);
    }

    return {
      registry,
      middleware,
    };
  } catch (error) {
    console.error(`[HyperscriptRoutes:${adapter.name}] Setup failed:`, error);
    throw error;
  }
}

/**
 * Setup context providers for server-side hyperscript
 * Makes request, response, params, etc. available in hyperscript code
 */
function setupContextProviders(registry: LokaScriptRegistry) {
  // Only register if not already registered
  if (!registry.context.has('request')) {
    registry.context.register('request', context => context.locals.get('request'), {
      description: 'Current HTTP request object',
      cache: true,
    });
  }

  if (!registry.context.has('response')) {
    registry.context.register('response', context => context.locals.get('response'), {
      description: 'Current HTTP response object',
      cache: true,
    });
  }

  if (!registry.context.has('params')) {
    registry.context.register('params', context => context.locals.get('params') || {}, {
      description: 'URL route parameters',
      cache: true,
    });
  }

  if (!registry.context.has('query')) {
    registry.context.register('query', context => context.locals.get('query') || {}, {
      description: 'URL query parameters',
      cache: true,
    });
  }

  if (!registry.context.has('body')) {
    registry.context.register('body', context => context.locals.get('body'), {
      description: 'Request body (parsed JSON)',
      cache: true,
    });
  }

  if (!registry.context.has('headers')) {
    registry.context.register('headers', context => context.locals.get('headers') || {}, {
      description: 'Request headers',
      cache: true,
    });
  }

  console.log('[HyperscriptRoutes] Registered context providers');
}
