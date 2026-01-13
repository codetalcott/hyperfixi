/**
 * HyperFixi SSR Support
 *
 * Server-side rendering with behavior injection for HyperFixi applications
 */

// Core SSR engine
export {
  HyperFixiSSREngine,
  ssrEngine,
  renderSSR,
  generateHydrationScript,
  extractCriticalCSS,
} from './engine';

// Static site generation
export { HyperFixiStaticGenerator } from './static-generator';

// SEO utilities
export { SEOGenerator } from './seo';

// Critical CSS extraction
export { CriticalCSSExtractor } from './critical-css';

// Caching implementations
export { MemorySSRCache, RedisSSRCache, TieredSSRCache, createSSRCache } from './cache';

// Framework middleware
export {
  createExpressSSRMiddleware,
  createKoaSSRMiddleware,
  createFastifySSRPlugin,
  createNextSSRHandler,
  configureSSRMiddleware,
} from './middleware';

// Type exports
export type {
  SSROptions,
  SSRContext,
  SSRResult,
  HydrationData,
  SEOData,
  SSRCache,
  ProgressiveEnhancement,
  SSREngine,
  StaticGenerator,
  StaticGenerationOptions,
  StaticGenerationResult,
  RobotsOptions,
  CriticalCSSExtractor as ICriticalCSSExtractor,
  SSRMiddleware,
  SSRError,
} from './types';

// Utility functions
export * from './utils';

// Version
export const VERSION = '0.1.0';
