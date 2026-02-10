/**
 * Core Parser Adapter
 *
 * Bridges @hyperfixi/core's parser output into AOT ASTNode types.
 * Delegates AST conversion to the shared interchange format (fromCoreAST)
 * exported by @hyperfixi/core.
 */

import type { ASTNode } from '../types/aot-types.js';

// =============================================================================
// CORE TYPES (imported dynamically)
// =============================================================================

// Locally-declared types to avoid requiring the peer dependency at compile time.

interface CoreCompileResult {
  ok: boolean;
  ast?: CoreASTNode;
  errors?: Array<{ message: string }>;
}

interface CoreASTNode {
  type: string;
  [key: string]: unknown;
}

interface CoreHyperscriptAPI {
  compileSync(
    code: string,
    options?: { language?: string; traditional?: boolean }
  ): CoreCompileResult;
}

/** Interchange converter function signature */
type InterchangeConverter = (node: CoreASTNode) => ASTNode;

// =============================================================================
// CORE PARSER ADAPTER
// =============================================================================

/**
 * Adapts @hyperfixi/core's compileSync() output into the Parser interface
 * expected by AOTCompiler.
 */
export class CoreParserAdapter {
  private api: CoreHyperscriptAPI;
  private converter: InterchangeConverter;

  constructor(api: CoreHyperscriptAPI, converter: InterchangeConverter) {
    this.api = api;
    this.converter = converter;
  }

  /**
   * Parse hyperscript code to an AOT-compatible AST.
   */
  parse(code: string, language?: string): ASTNode {
    const result = this.api.compileSync(code, {
      language: language ?? 'en',
      traditional: true,
    });

    if (!result.ok || !result.ast) {
      throw new Error(result.errors?.[0]?.message ?? `Core parser failed for: ${code}`);
    }

    return this.converter(result.ast);
  }
}

// =============================================================================
// STANDALONE CONVERTER (backward compat)
// =============================================================================

/**
 * Module-level converter, set by createCoreParserAdapter().
 * Falls back to a passthrough if not yet initialized (shouldn't happen in practice).
 */
let _converter: InterchangeConverter | null = null;

/**
 * Convert a core parser AST node to an AOT AST node.
 *
 * Delegates to `fromCoreAST` from `@hyperfixi/core`'s interchange format.
 * This function is available after `createCoreParserAdapter()` has been called.
 *
 * @deprecated Import `fromCoreAST` from `@hyperfixi/core` directly instead.
 */
export function convertCoreASTToAOT(node: CoreASTNode): ASTNode {
  if (_converter) return _converter(node);
  // Should not reach here — factory sets _converter before anything uses it
  return node as ASTNode;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a CoreParserAdapter by dynamically importing @hyperfixi/core.
 * Throws if the package is not available.
 */
export async function createCoreParserAdapter(): Promise<CoreParserAdapter> {
  const core = await import('@hyperfixi/core');
  // The core package exports `hyperscript` with compileSync
  const api = core.hyperscript ?? core.default ?? core;

  if (!api?.compileSync) {
    throw new Error(
      '@hyperfixi/core does not export compileSync. ' +
        'Ensure @hyperfixi/core >= 1.0.0 is installed.'
    );
  }

  // Use the interchange converter from core
  const converter = (core as Record<string, unknown>).fromCoreAST as InterchangeConverter;
  if (!converter) {
    throw new Error(
      '@hyperfixi/core does not export fromCoreAST. ' +
        'Ensure @hyperfixi/core >= 1.3.0 is installed.'
    );
  }

  // Cache for standalone convertCoreASTToAOT()
  _converter = converter;

  return new CoreParserAdapter(api as unknown as CoreHyperscriptAPI, converter);
}
