/**
 * Express-Specific Hyperscript Routes (Convenience Wrapper)
 *
 * This is a thin wrapper around the framework-agnostic implementation
 * that pre-configures the Express adapter for convenience.
 *
 * For maximum flexibility, use framework-agnostic-routes.ts directly.
 */

import type { LokaScriptRegistry } from '@hyperfixi/core/registry';
import {
  createHyperscriptMiddleware,
  setupHyperscriptRoutes as genericSetup,
} from './framework-agnostic-routes.js';
import { createExpressAdapter } from './adapters.js';

export interface ExpressHyperscriptRoutesOptions {
  /** Registry to use (defaults to global registry) */
  registry?: LokaScriptRegistry;

  /** Enable debug logging */
  debug?: boolean;

  /** Continue to next middleware even if handler matched */
  alwaysCallNext?: boolean;

  /** Custom error handler */
  onError?: (error: Error, req: any, res: any) => void;
}

/**
 * Create Express middleware for hyperscript route handling
 *
 * This is a convenience wrapper that pre-configures the Express adapter.
 * For other frameworks, use createHyperscriptMiddleware with appropriate adapter.
 *
 * @example
 * import express from 'express';
 * import { createExpressHyperscriptMiddleware } from '@lokascript/server-integration/middleware/express';
 *
 * const app = express();
 * const middleware = createExpressHyperscriptMiddleware({ debug: true });
 * app.use(middleware);
 */
export function createExpressHyperscriptMiddleware(options: ExpressHyperscriptRoutesOptions = {}) {
  return createHyperscriptMiddleware({
    ...options,
    adapter: createExpressAdapter(),
  });
}

/**
 * Setup hyperscript routes for an Express app
 * This is a convenience function that registers the middleware and context providers
 *
 * @example
 * import express from 'express';
 * import { setupExpressHyperscriptRoutes } from '@lokascript/server-integration/middleware/express';
 *
 * const app = express();
 * await setupExpressHyperscriptRoutes(app, { debug: true });
 */
export async function setupExpressHyperscriptRoutes(
  app: any,
  options: ExpressHyperscriptRoutesOptions = {}
) {
  return genericSetup(app, {
    ...options,
    adapter: createExpressAdapter(),
  });
}

// Re-export for backwards compatibility
export {
  createExpressHyperscriptMiddleware as createHyperscriptRoutesMiddleware,
  setupExpressHyperscriptRoutes as setupHyperscriptRoutes,
};
