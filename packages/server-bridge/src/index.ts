// Public API
export type {
  HttpMethod,
  RouteDescriptor,
  RouteSource,
  RequestBodyField,
  QueryParam,
  ScanResult,
  ScanError,
  ConflictWarning,
  ConflictDetail,
  GeneratorOptions,
  GeneratedFile,
  GenerateResult,
  ServerBridgeConfig,
} from './types.js';

export {
  extractPathParams,
  extractQueryParams,
  normalizeUrl,
  urlToHandlerName,
} from './conventions/url-patterns.js';
export { inferConventions } from './conventions/convention-engine.js';
export type { ConventionContext, ConventionResult } from './conventions/convention-engine.js';
export { extractHyperscriptRoutes } from './scanner/hyperscript-extractor.js';
export { extractHtmxRoutes } from './scanner/htmx-extractor.js';
export { extractFormFields, extractFormBodies } from './scanner/form-scanner.js';
export { scanRoutes, scanDirectory } from './scanner/route-scanner.js';
export { ExpressGenerator } from './generators/express-generator.js';
export { HonoGenerator } from './generators/hono-generator.js';
export { OpenAPIGenerator } from './generators/openapi-generator.js';
export { DjangoGenerator } from './generators/django-generator.js';
export { FastAPIGenerator } from './generators/fastapi-generator.js';
export type { RouteGenerator } from './generators/types.js';
export { selectGenerator } from './generators/index.js';
export { createManifest, loadManifest, saveManifest, diffRoutes } from './generators/manifest.js';
export { detectConflicts, formatConflicts } from './scanner/conflict-detector.js';

// Convenience generate function for programmatic use (e.g., Vite plugin)
export { generate } from './generate.js';
export type { ProgrammaticGenerateOptions, GenerateFullResult } from './generate.js';
