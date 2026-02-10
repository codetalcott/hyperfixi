/**
 * @hyperfixi/aot-compiler
 *
 * Ahead-of-Time compiler for LokaScript/hyperscript.
 * Transforms hyperscript to optimized JavaScript at build time.
 *
 * @example
 * ```typescript
 * import { AOTCompiler, compileHyperscript } from '@hyperfixi/aot-compiler';
 *
 * // Simple usage
 * const js = await compileHyperscript('on click toggle .active');
 *
 * // Full compiler usage
 * const compiler = new AOTCompiler();
 * const scripts = compiler.extract(htmlSource, 'index.html');
 * const result = compiler.compile(scripts, { language: 'en' });
 * console.log(result.code);
 * ```
 */

// =============================================================================
// MAIN EXPORTS
// =============================================================================

export {
  AOTCompiler,
  createCompiler,
  compileHyperscript,
  createMultilingualCompiler,
} from './compiler/aot-compiler.js';

export { Analyzer, analyze } from './compiler/analyzer.js';

export { SemanticParserAdapter, createSemanticAdapter } from './compiler/semantic-adapter.js';

export { CoreParserAdapter, createCoreParserAdapter } from './compiler/core-parser-adapter.js';

export {
  OptimizationPipeline,
  ConstantFoldingPass,
  SelectorCachingPass,
  DeadCodeEliminationPass,
  LoopUnrollingPass,
  createOptimizer,
  optimize,
} from './optimizations/index.js';

// =============================================================================
// SCANNER EXPORTS
// =============================================================================

export {
  HTMLScanner,
  VueScanner,
  SvelteScanner,
  JSXScanner,
  scanFiles,
  createScanner,
} from './scanner/html-scanner.js';

// =============================================================================
// TRANSFORM EXPORTS
// =============================================================================

export {
  ExpressionCodegen,
  generateExpression,
  sanitizeClassName,
  sanitizeSelector,
  sanitizeIdentifier,
} from './transforms/expression-transforms.js';

export {
  commandCodegens,
  generateCommand,
  generateIf,
  generateRepeat,
  generateForEach,
  generateWhile,
} from './transforms/command-transforms.js';

export {
  EventHandlerCodegen,
  generateEventHandler,
  generateBindings,
  generateInitialization,
} from './transforms/event-transforms.js';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Source extraction
  SourceLocation,
  ExtractedScript,
  ScannerOptions,
  ScanResult,

  // AST types
  ASTNode,
  EventHandlerNode,
  CommandNode,
  LiteralNode,
  IdentifierNode,
  SelectorNode,
  VariableNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  MemberExpressionNode,
  PossessiveNode,
  CallExpressionNode,
  PositionalNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,

  // Event modifiers
  EventModifiers,

  // Analysis
  VariableInfo,
  SelectorInfo,
  AnalysisResult,

  // Code generation
  CodegenOptions,
  GeneratedExpression,
  GeneratedHandler,
  GeneratedCode,
  CodegenContext,
  SourceMap,

  // Optimization
  OptimizationPass,
  OptimizedAST,

  // Compilation
  CompileOptions,
  ParseResult,
  ParseError,
  CompilationResult,
  BatchCompilationResult,
  CompiledHandler,
  FallbackScript,

  // Runtime
  ExecutionContext,
  CompiledBehavior,

  // CLI
  CLICompileOptions,
  CLIAnalyzeOptions,
} from './types/aot-types.js';

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = '1.0.0';
