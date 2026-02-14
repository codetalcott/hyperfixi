// Public API
export type {
  HttpMethod,
  RouteDescriptor,
  RouteSource,
  RequestBodyField,
  ScanResult,
  ScanError,
  GeneratorOptions,
  GeneratedFile,
  GenerateResult,
  ServerBridgeConfig,
} from './types.js';

export { extractPathParams, normalizeUrl, urlToHandlerName } from './conventions/url-patterns.js';
export { inferConventions } from './conventions/convention-engine.js';
export type { ConventionContext, ConventionResult } from './conventions/convention-engine.js';
export { extractHyperscriptRoutes } from './scanner/hyperscript-extractor.js';
export { extractHtmxRoutes } from './scanner/htmx-extractor.js';
export { extractFormFields, extractFormBodies } from './scanner/form-scanner.js';
export { scanRoutes, scanDirectory } from './scanner/route-scanner.js';
export { ExpressGenerator } from './generators/express-generator.js';
export { HonoGenerator } from './generators/hono-generator.js';
export type { RouteGenerator } from './generators/types.js';
export { createManifest, loadManifest, saveManifest, diffRoutes } from './generators/manifest.js';
