/**
 * LokaScript JavaScript/TypeScript Client
 * 
 * A comprehensive client library for LokaScript server-side hyperscript compilation
 * with Express.js, ElysiaJS middleware integration and TypeScript support.
 */

// Core client exports
export { Client, createClient, createDefaultClient } from './client';

// Type definitions
export type {
  ClientConfig,
  ParseContext,
  CompilationOptions,
  CompatibilityMode,
  CompileRequest,
  ValidateRequest,
  ScriptDefinition,
  BatchCompileRequest,
  ScriptMetadata,
  Timings,
  CompilationWarning,
  CompilationError,
  CompileResponse,
  ValidateResponse,
  CacheStats,
  HealthStatus,
  HyperfixiClient,
  ExpressMiddlewareConfig,
  TemplateHelpers,
} from './types';

// Error classes
export {
  HyperfixiError,
  NetworkError,
  ValidationError,
  CompilationFailedError,
} from './types';

// Helpers
export { eventAttribute, escapeAttrValue } from './types';

// Express.js integration
export {
  lokascriptMiddleware,
  createTemplateHelpers,
  createApiRoutes,
  getHyperfixiClient,
  getTemplateVars,
  createMiddlewareConfig,
} from './express';

// ElysiaJS integration
export {
  lokascriptPlugin,
  createElysiaTemplateHelpers,
  createHyperfixiApp,
  createElysiaConfig,
  getHyperfixiClient as getElysiaHyperfixiClient,
  getTemplateVars as getElysiaTemplateVars,
} from './elysia';
export type { ElysiaPluginConfig } from './elysia';

// Constants
export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRIES = 3;

/**
 * Client version
 */
export const VERSION = '0.1.0';