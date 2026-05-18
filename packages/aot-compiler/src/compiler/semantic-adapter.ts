/**
 * Semantic Parser Adapter
 *
 * Bridges @lokascript/semantic's parse output into AOT ASTNode types.
 * Delegates AST conversion to the shared interchange format (fromSemanticAST)
 * exported by @lokascript/semantic.
 */

import type { ASTNode } from '../types/aot-types.js';

// =============================================================================
// SEMANTIC TYPES (imported dynamically)
// =============================================================================

// These mirror the types from @lokascript/semantic but are declared locally
// so the adapter can be compiled without the optional peer dependency.

interface SemanticAnalysisResult {
  confidence: number;
  node?: SemanticNodeLike;
  errors?: string[];
}

interface SemanticAnalyzerLike {
  analyze(input: string, language: string): SemanticAnalysisResult;
  supportsLanguage(language: string): boolean;
}

interface SemanticNodeLike {
  kind: string;
  action: string;
  roles: ReadonlyMap<string, unknown>;
  metadata?: { confidence?: number };
  body?: SemanticNodeLike[];
  eventModifiers?: Record<string, unknown>;
  parameterNames?: readonly string[];
  thenBranch?: SemanticNodeLike[];
  elseBranch?: SemanticNodeLike[];
  statements?: SemanticNodeLike[];
  loopVariant?: string;
  loopVariable?: string;
  indexVariable?: string;
}

interface ASTBuilderLike {
  build(node: SemanticNodeLike): SemanticASTNodeLike;
  warnings: string[];
}

interface SemanticASTNodeLike {
  type: string;
  [key: string]: unknown;
}

type ParseWithConfidenceFn = (
  code: string,
  language: string
) => { node: SemanticNodeLike | null; confidence: number; error: string | undefined };

/** Interchange converter function signature */
type InterchangeConverter = (node: SemanticASTNodeLike) => ASTNode;

// =============================================================================
// SEMANTIC PARSER ADAPTER
// =============================================================================

/**
 * Adapts @lokascript/semantic into the SemanticParser interface expected by
 * AOTCompiler.
 *
 * Uses `parseWithConfidence()` for analysis — this is the full semantic parser
 * (not just the pattern matcher), so it correctly handles event handlers with
 * body commands, compound statements, etc.
 */
export class SemanticParserAdapter {
  private analyzer: SemanticAnalyzerLike;
  private ASTBuilderClass: new () => ASTBuilderLike;
  private parseWithConfidenceFn: ParseWithConfidenceFn;
  private converter: InterchangeConverter;

  constructor(
    analyzer: SemanticAnalyzerLike,
    ASTBuilderClass: new () => ASTBuilderLike,
    parseWithConfidenceFn: ParseWithConfidenceFn,
    converter: InterchangeConverter
  ) {
    this.analyzer = analyzer;
    this.ASTBuilderClass = ASTBuilderClass;
    this.parseWithConfidenceFn = parseWithConfidenceFn;
    this.converter = converter;
  }

  /**
   * Analyze code in the given language.
   * Uses the full semantic parser (parseWithConfidence) which correctly
   * returns event-handler nodes with body commands.
   */
  analyze(
    code: string,
    language: string
  ): { node?: unknown; confidence: number; errors?: string[] } {
    try {
      const result = this.parseWithConfidenceFn(code, language);
      return {
        node: result.node ?? undefined,
        confidence: result.confidence,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      return {
        confidence: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Build an AOT-compatible AST from the SemanticNode.
   * Converts the semantic package's AST format to AOT types via interchange.
   */
  buildAST(node: unknown): { ast: ASTNode; warnings: string[] } {
    const semanticNode = node as SemanticNodeLike;

    const builder = new this.ASTBuilderClass();
    const semanticAST = builder.build(semanticNode);
    const aotAST = this.converter(semanticAST);

    return { ast: aotAST, warnings: builder.warnings };
  }

  /**
   * Check if the given language is supported.
   */
  supportsLanguage(language: string): boolean {
    return this.analyzer.supportsLanguage(language);
  }
}

// =============================================================================
// STANDALONE CONVERTER (backward compat)
// =============================================================================

let _converter: InterchangeConverter | null = null;

/**
 * Convert a semantic package AST node to an AOT AST node.
 *
 * Delegates to `fromSemanticAST` from `@lokascript/semantic`'s interchange format.
 * This function is available after `createSemanticAdapter()` has been called.
 *
 * @deprecated Import `fromSemanticAST` from `@lokascript/semantic` directly instead.
 */
export function convertSemanticASTToAOT(node: SemanticASTNodeLike): ASTNode {
  if (_converter) return _converter(node);
  return node as ASTNode;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a SemanticParserAdapter by dynamically importing @lokascript/semantic.
 * Throws if the package is not available.
 */
export async function createSemanticAdapter(): Promise<SemanticParserAdapter> {
  const semantic = await import('@lokascript/semantic');
  const ASTBuilderClass = semantic.ASTBuilder;
  const parseWithConfidence = semantic.parseWithConfidence;
  const isLanguageRegistered = semantic.isLanguageRegistered;

  // Build a lightweight analyzer-like object — just supportsLanguage is read
  // by SemanticParserAdapter; analyze() goes through parseWithConfidence directly.
  const analyzer: SemanticAnalyzerLike = {
    analyze() {
      // Not used by SemanticParserAdapter; analysis goes through parseWithConfidenceFn.
      throw new Error('SemanticParserAdapter routes analyze() through parseWithConfidence.');
    },
    supportsLanguage(language: string) {
      return isLanguageRegistered(language);
    },
  };

  // Use the interchange converter from semantic
  const converter = (semantic as Record<string, unknown>).fromSemanticAST as InterchangeConverter;
  if (!converter) {
    throw new Error(
      '@lokascript/semantic does not export fromSemanticAST. ' +
        'Ensure @lokascript/semantic >= 1.3.0 is installed.'
    );
  }

  // Cache for standalone convertSemanticASTToAOT()
  _converter = converter;

  return new SemanticParserAdapter(
    analyzer,
    ASTBuilderClass as unknown as new () => ASTBuilderLike,
    parseWithConfidence as unknown as ParseWithConfidenceFn,
    converter
  );
}
