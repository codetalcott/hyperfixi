/**
 * CompilationService — the main orchestrator.
 *
 * Accepts hyperscript in three formats (natural language, explicit syntax, LLM JSON),
 * validates through semantic schemas, and compiles to optimized JavaScript.
 */

import type {
  CompileRequest,
  CompileResponse,
  ValidationResponse,
  TranslateRequest,
  TranslateResponse,
  ServiceOptions,
  SemanticJSON,
  SemanticJSONValue,
  Diagnostic,
} from './types.js';
import { normalize, initNormalizer } from './input/normalize.js';
import {
  runValidationGates,
  initValidation,
  type ValidationFunctions,
} from './validation/gates.js';
import {
  compileSemanticNode,
  initBridge,
  type BridgeFunctions,
  type AOTCompilerLike,
} from './compile/bridge.js';
import { SemanticCache, generateCacheKey } from './compile/cache.js';

// =============================================================================
// Service
// =============================================================================

export class CompilationService {
  private cache: SemanticCache;
  private confidenceThreshold: number;
  private translateFn: ((code: string, from: string, to: string) => string) | null = null;

  private constructor(options: ServiceOptions = {}) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
    this.cache = new SemanticCache(options.cacheSize ?? 500);
  }

  /**
   * Create a CompilationService by dynamically importing dependencies.
   *
   * This async factory resolves @lokascript/semantic and @lokascript/aot-compiler
   * at runtime, following the same pattern as createMultilingualCompiler().
   */
  static async create(options: ServiceOptions = {}): Promise<CompilationService> {
    const service = new CompilationService(options);

    // Import semantic package
    const semantic = await import('@lokascript/semantic');

    // Initialize normalizer with semantic parsing functions
    initNormalizer({
      parseSemantic: semantic.parseSemantic,
      parseExplicit: semantic.parseExplicit,
      isExplicitSyntax: semantic.isExplicitSyntax,
    });

    // Initialize validation with schema validator
    // Cast needed: our interface uses `unknown` to avoid importing semantic types
    initValidation({
      validateSemanticResult:
        semantic.validateSemanticResult as ValidationFunctions['validateSemanticResult'],
    });

    // Import AOT compiler
    const aot = await import('@lokascript/aot-compiler');
    const compiler = aot.createCompiler();

    // Initialize bridge with AST builder and compiler
    // Cast needed: our interfaces use `unknown` to avoid direct type dependencies
    initBridge(
      {
        ASTBuilder: semantic.ASTBuilder as unknown as BridgeFunctions['ASTBuilder'],
        fromSemanticAST: semantic.fromSemanticAST as unknown as BridgeFunctions['fromSemanticAST'],
      },
      compiler as unknown as AOTCompilerLike
    );

    // Store translate function
    service.translateFn = semantic.translate;

    return service;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Compile hyperscript to JavaScript.
   *
   * Accepts any of three input formats:
   * - `code` + `language`: Natural language hyperscript
   * - `explicit`: Bracket syntax [command role:value ...]
   * - `semantic`: LLM JSON { action, roles, trigger }
   *
   * Returns compiled JS, semantic representation, and diagnostics.
   */
  compile(request: CompileRequest): CompileResponse {
    const diagnostics: Diagnostic[] = [];

    // Step 1: Normalize input to SemanticNode
    const normalized = normalize(request);
    diagnostics.push(...normalized.diagnostics);

    if (!normalized.node) {
      return { ok: false, diagnostics };
    }

    // Step 2: Validate
    const threshold = request.confidence ?? this.confidenceThreshold;
    const gateResult = runValidationGates(normalized.node, normalized.confidence, threshold);
    diagnostics.push(...gateResult.diagnostics);

    if (!gateResult.pass) {
      return {
        ok: false,
        confidence: gateResult.adjustedConfidence,
        diagnostics,
      };
    }

    // Step 3: Check cache
    const cacheKey = generateCacheKey(normalized.node, {
      optimization: request.optimization,
      target: request.target,
      minify: request.minify,
    });

    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Merge current diagnostics with cached (warnings may differ)
      return {
        ...cached,
        confidence: gateResult.adjustedConfidence,
        diagnostics: [...diagnostics, ...cached.diagnostics.filter(d => d.severity !== 'error')],
      };
    }

    // Step 4: Compile
    const result = compileSemanticNode(normalized.node, {
      language: request.language,
      optimization: request.optimization,
      target: request.target,
      minify: request.minify,
    });

    // Convert bridge warnings/errors to diagnostics
    for (const warning of result.warnings) {
      diagnostics.push({ severity: 'warning', code: 'COMPILE_WARNING', message: warning });
    }
    for (const error of result.errors) {
      diagnostics.push({ severity: 'error', code: 'COMPILE_ERROR', message: error });
    }

    if (!result.success) {
      return { ok: false, diagnostics };
    }

    // Step 5: Assemble response
    const semanticJSON = nodeToSemanticJSON(normalized.node);
    const response: CompileResponse = {
      ok: true,
      js: result.code,
      helpers: result.helpers,
      size: result.code ? new TextEncoder().encode(result.code).length : 0,
      semantic: semanticJSON,
      confidence: gateResult.adjustedConfidence,
      diagnostics,
    };

    // Step 6: Cache
    this.cache.set(cacheKey, response);

    return response;
  }

  /**
   * Validate input without compiling.
   * Returns semantic representation and diagnostics.
   */
  validate(request: CompileRequest): ValidationResponse {
    const diagnostics: Diagnostic[] = [];

    // Normalize
    const normalized = normalize(request);
    diagnostics.push(...normalized.diagnostics);

    if (!normalized.node) {
      return { ok: false, diagnostics };
    }

    // Validate
    const threshold = request.confidence ?? this.confidenceThreshold;
    const gateResult = runValidationGates(normalized.node, normalized.confidence, threshold);
    diagnostics.push(...gateResult.diagnostics);

    const semanticJSON = gateResult.pass ? nodeToSemanticJSON(normalized.node) : undefined;

    return {
      ok: gateResult.pass,
      semantic: semanticJSON,
      confidence: gateResult.adjustedConfidence,
      diagnostics,
    };
  }

  /**
   * Translate hyperscript between languages.
   */
  translate(request: TranslateRequest): TranslateResponse {
    if (!this.translateFn) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'NOT_INITIALIZED',
            message: 'Translation not available.',
          },
        ],
      };
    }

    try {
      const result = this.translateFn(request.code, request.from, request.to);
      return {
        ok: true,
        code: result,
        diagnostics: [],
      };
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'TRANSLATE_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.cache.hits + this.cache.misses;
    return {
      size: this.cache.size,
      hits: this.cache.hits,
      misses: this.cache.misses,
      hitRate: total > 0 ? this.cache.hits / total : 0,
    };
  }

  /**
   * Clear the compilation cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert a SemanticNode to SemanticJSON for the response.
 */
function nodeToSemanticJSON(node: unknown): SemanticJSON | undefined {
  if (!node || typeof node !== 'object') return undefined;

  const n = node as {
    kind?: string;
    action?: string;
    roles?: ReadonlyMap<string, unknown>;
    body?: unknown[];
    eventModifiers?: Record<string, unknown>;
  };

  if (!n.action) return undefined;

  const roles: Record<string, SemanticJSONValue> = {};

  if (n.roles && typeof n.roles.entries === 'function') {
    for (const [role, value] of n.roles.entries()) {
      if (role === 'event') continue; // Handled via trigger
      const v = value as { type?: string; value?: unknown; raw?: string };
      if (v && v.type) {
        const valueType = v.type as SemanticJSONValue['type'];
        roles[role] = {
          type: (['selector', 'literal', 'reference', 'expression'].includes(valueType)
            ? valueType
            : 'literal') as SemanticJSONValue['type'],
          value: (v.value ?? v.raw ?? '') as string | number | boolean,
        };
      }
    }
  }

  // Handle event handlers
  if (n.kind === 'event-handler' || n.action === 'on') {
    const eventRole =
      n.roles && typeof n.roles.get === 'function'
        ? (n.roles.get('event') as { value?: string } | undefined)
        : undefined;

    // For event handlers, return the body command's semantic JSON
    if (n.body && n.body.length > 0) {
      const bodyJSON = nodeToSemanticJSON(n.body[0]);
      if (bodyJSON) {
        bodyJSON.trigger = {
          event: eventRole?.value ?? 'click',
          modifiers: n.eventModifiers,
        };
        return bodyJSON;
      }
    }

    return {
      action: n.action,
      roles,
      trigger: {
        event: eventRole?.value ?? 'click',
        modifiers: n.eventModifiers,
      },
    };
  }

  return { action: n.action, roles };
}
