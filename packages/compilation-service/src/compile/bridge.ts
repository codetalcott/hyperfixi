/**
 * Compilation bridge.
 *
 * Converts a validated SemanticNode to AOT-compatible ASTNode
 * and compiles it to JavaScript.
 */

// =============================================================================
// Dynamic imports
// =============================================================================

/** AST building functions, injected by CompilationService.create() */
export interface BridgeFunctions {
  ASTBuilder: new () => { build(node: unknown): unknown; warnings: string[] };
  fromSemanticAST: (node: unknown) => unknown;
}

/** AOT compiler interface */
export interface AOTCompilerLike {
  compileAST(
    ast: unknown,
    options?: Record<string, unknown>
  ): {
    success: boolean;
    code?: string;
    warnings: string[];
    metadata: {
      handlerId: string;
      parserUsed: string;
      language?: string;
      commandsUsed: string[];
      optimizationsApplied: string[];
      needsRuntime: boolean;
      runtimeHelpers: string[];
    };
    errors?: string[];
  };
}

let _bridge: BridgeFunctions | null = null;
let _compiler: AOTCompilerLike | null = null;

/** Initialize with AST building functions and compiler. */
export function initBridge(bridge: BridgeFunctions, compiler: AOTCompilerLike): void {
  _bridge = bridge;
  _compiler = compiler;
}

// =============================================================================
// Bridge
// =============================================================================

export interface BridgeResult {
  success: boolean;
  code?: string;
  helpers: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Compile a SemanticNode to JavaScript via the AOT pipeline.
 *
 * SemanticNode → ASTBuilder.build() → fromSemanticAST() → compiler.compileAST()
 */
export function compileSemanticNode(
  node: unknown,
  options: {
    language?: string;
    optimization?: 0 | 1 | 2;
    target?: 'esm' | 'iife';
    minify?: boolean;
  } = {}
): BridgeResult {
  if (!_bridge || !_compiler) {
    throw new Error('Bridge not initialized. Call initBridge() first.');
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Build semantic AST
  let semanticAST: unknown;
  try {
    const builder = new _bridge.ASTBuilder();
    semanticAST = builder.build(node);
    warnings.push(...builder.warnings);
  } catch (error) {
    errors.push(`AST build failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, helpers: [], warnings, errors };
  }

  // Step 2: Convert to interchange format
  let interchangeAST: unknown;
  try {
    interchangeAST = _bridge.fromSemanticAST(semanticAST);
  } catch (error) {
    errors.push(
      `Interchange conversion failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { success: false, helpers: [], warnings, errors };
  }

  // Step 3: Compile via AOT
  try {
    const result = _compiler.compileAST(interchangeAST, {
      language: options.language ?? 'en',
      optimizationLevel: options.optimization ?? 2,
      codegen: {
        mode: options.target ?? 'esm',
        minify: options.minify ?? false,
      },
    });

    if (!result.success) {
      return {
        success: false,
        helpers: [],
        warnings: [...warnings, ...result.warnings],
        errors: [...errors, ...(result.errors ?? ['Compilation failed'])],
      };
    }

    return {
      success: true,
      code: result.code,
      helpers: result.metadata.runtimeHelpers,
      warnings: [...warnings, ...result.warnings],
      errors,
    };
  } catch (error) {
    errors.push(
      `AOT compilation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { success: false, helpers: [], warnings, errors };
  }
}
