/**
 * Type definitions for server-integration package
 */

// Base AST node type (from core ast-utils, consolidated from ast-toolkit)
export type { ASTUtilNode as ASTNode } from '@lokascript/core/ast-utils';

// ============================================================================
// Parser Types
// ============================================================================

export interface ParseContext {
  templateVars?: Record<string, any>;
  sourceLocale?: string;
  targetLocale?: string;
  preserveOriginal?: boolean;
}

export interface ProcessedScript {
  original: string;
  processed: string;
  templateVars?: Record<string, any>;
  metadata: ScriptMetadata;
}

export interface ScriptMetadata {
  complexity: number;
  dependencies: string[];
  selectors: string[];
  events: string[];
  commands: string[];
  templateVariables: string[];
}

// ============================================================================
// Compilation Types
// ============================================================================

export interface CompilationOptions {
  minify?: boolean;
  compatibility?: 'modern' | 'legacy';
  sourceMap?: boolean;
  optimization?: boolean;
  templateVars?: Record<string, any>;
}

export interface CompilationResult {
  compiled: string;
  sourceMap?: string;
  metadata: ScriptMetadata;
  warnings: CompilationWarning[];
  errors: CompilationError[];
}

export interface CompilationWarning {
  type: string;
  message: string;
  line?: number;
  column?: number;
}

export interface CompilationError {
  type: string;
  message: string;
  line: number;
  column: number;
  stack?: string;
}

export interface CacheEntry {
  key: string;
  result: CompilationResult;
  timestamp: number;
  options: CompilationOptions;
  hits: number;
}

// ============================================================================
// Service Types
// ============================================================================

export interface ServiceConfig {
  port: number;
  host: string;
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number; // milliseconds
  };
  cors: {
    enabled: boolean;
    origins: string[];
  };
  security: {
    helmet: boolean;
    compression: boolean;
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
}

export interface CompileRequest {
  scripts: Record<string, string>;
  options?: CompilationOptions;
  context?: ParseContext;
}

export interface BatchCompileRequest {
  definitions: ScriptDefinition[];
}

export interface ScriptDefinition {
  id: string;
  script: string;
  options?: CompilationOptions;
  context?: ParseContext;
}

export interface CompileResponse {
  compiled: Record<string, string>;
  metadata: Record<string, ScriptMetadata>;
  timings: {
    total: number;
    parse: number;
    compile: number;
    cache: number;
  };
  warnings: CompilationWarning[];
  errors: CompilationError[];
}

export interface ValidateRequest {
  script: string;
  context?: ParseContext;
}

export interface ValidateResponse {
  valid: boolean;
  errors: CompilationError[];
  warnings: CompilationWarning[];
  metadata?: ScriptMetadata;
}

// ============================================================================
// Documentation Types
// ============================================================================

export interface DocsRequest {
  script: string;
  context?: ParseContext;
  options?: {
    includeSource?: boolean;
    includeMetrics?: boolean;
  };
}

export interface DocsResponse {
  title: string;
  description: string;
  eventHandlers: EventHandlerDoc[];
  behaviors: BehaviorDoc[];
  functions: FunctionDoc[];
  metrics?: CodeMetrics;
}

export interface EventHandlerDoc {
  event: string;
  description?: string;
  commands: CommandDoc[];
}

export interface BehaviorDoc {
  name: string;
  description?: string;
  properties: string[];
}

export interface FunctionDoc {
  name: string;
  parameters: string[];
  description?: string;
}

export interface CommandDoc {
  name: string;
  target?: string;
  description?: string;
}

export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  readability: number;
}

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateContext {
  data: Record<string, any>;
  scripts: Record<string, ProcessedScript>;
  locale?: string;
  templateVars?: Record<string, any>;
}

export interface ExtractedTemplate {
  html: string;
  scripts: Record<string, string>;
  metadata: TemplateMetadata;
}

export interface TemplateMetadata {
  scriptCount: number;
  templateVars: string[];
  dependencies: string[];
}

export interface ComponentDefinition {
  selector: string;
  behavior: string;
  attributes?: Record<string, any>;
  template?: string;
}

export interface PageDefinition {
  components: Record<string, ComponentDefinition>;
  globalBehaviors?: string;
  templateVars?: Record<string, any>;
}

// ============================================================================
// Client Library Types
// ============================================================================

export interface ClientConfig {
  host: string;
  port: number;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

export interface Component {
  selector: string;
  handlers: Handler[];
  attributes: Record<string, any>;
}

export interface Handler {
  event: string;
  behavior: string;
  options?: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
}

export interface Performance {
  mark(name: string): void;
  measure(name: string, start: string, end?: string): number;
  getMetrics(): Record<string, number>;
  reset(): void;
}
