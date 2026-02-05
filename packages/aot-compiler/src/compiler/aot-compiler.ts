/**
 * AOT Compiler
 *
 * Main orchestrator for the Ahead-of-Time compilation process.
 * Coordinates extraction, parsing, analysis, optimization, and code generation.
 */

import type {
  ASTNode,
  ExtractedScript,
  CompileOptions,
  CompilationResult,
  BatchCompilationResult,
  CodegenContext,
  CodegenOptions,
  AnalysisResult,
  CompiledHandler,
  FallbackScript,
  EventHandlerNode,
} from '../types/aot-types.js';
import { HTMLScanner, VueScanner, SvelteScanner, JSXScanner } from '../scanner/html-scanner.js';
import { Analyzer } from './analyzer.js';
import { OptimizationPipeline } from '../optimizations/index.js';
import { ExpressionCodegen, sanitizeIdentifier } from '../transforms/expression-transforms.js';
import { EventHandlerCodegen } from '../transforms/event-transforms.js';

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_COMPILE_OPTIONS: Required<CompileOptions> = {
  language: 'en',
  confidenceThreshold: 0.7,
  debug: false,
  codegen: {
    target: 'es2020',
    mode: 'esm',
    minify: false,
    sourceMaps: true,
    runtimeImport: '@lokascript/aot-compiler/runtime',
    preserveComments: false,
    debugMode: false,
  },
  optimizationLevel: 2,
};

const DEFAULT_CODEGEN_OPTIONS: CodegenOptions = {
  target: 'es2020',
  mode: 'esm',
  minify: false,
  sourceMaps: true,
  runtimeImport: '@lokascript/aot-compiler/runtime',
  preserveComments: false,
  debugMode: false,
};

// =============================================================================
// PARSER INTERFACE
// =============================================================================

/**
 * Parser interface for parsing hyperscript.
 * Can be backed by traditional or semantic parser.
 */
interface Parser {
  parse(code: string, language?: string): ASTNode;
}

/**
 * Optional semantic parser integration.
 */
interface SemanticParser {
  analyze(
    code: string,
    language: string
  ): { node?: unknown; confidence: number; errors?: string[] };
  buildAST(node: unknown): { ast: ASTNode; warnings: string[] };
  supportsLanguage(language: string): boolean;
}

// =============================================================================
// AOT COMPILER CLASS
// =============================================================================

/**
 * Main AOT compiler class.
 */
export class AOTCompiler {
  private parser: Parser | null = null;
  private semanticParser: SemanticParser | null = null;
  private analyzer = new Analyzer();
  private optimizer = new OptimizationPipeline();

  private usedIds = new Set<string>();

  /**
   * Set the traditional parser instance.
   */
  setParser(parser: Parser): void {
    this.parser = parser;
  }

  /**
   * Set the semantic parser for multilingual support.
   */
  setSemanticParser(parser: SemanticParser): void {
    this.semanticParser = parser;
  }

  /**
   * Reset compiler state between compilations.
   */
  reset(): void {
    this.usedIds.clear();
  }

  // ===========================================================================
  // EXTRACTION
  // ===========================================================================

  /**
   * Extract hyperscript from source code.
   */
  extract(source: string, filename: string): ExtractedScript[] {
    const scanner = this.createScanner(filename);
    return scanner.extract(source, filename);
  }

  /**
   * Create appropriate scanner for file type.
   */
  private createScanner(filename: string): HTMLScanner | JSXScanner {
    if (filename.endsWith('.vue')) {
      return new VueScanner();
    }
    if (filename.endsWith('.svelte')) {
      return new SvelteScanner();
    }
    if (filename.match(/\.(jsx|tsx)$/)) {
      return new JSXScanner();
    }
    return new HTMLScanner();
  }

  // ===========================================================================
  // PARSING
  // ===========================================================================

  /**
   * Parse a hyperscript string to AST.
   */
  parse(code: string, options: CompileOptions = {}): ASTNode | null {
    const { language = 'en', confidenceThreshold = 0.7, debug = false } = options;

    // Try semantic parser for non-English
    if (language !== 'en' && this.semanticParser?.supportsLanguage(language)) {
      const result = this.semanticParser.analyze(code, language);

      if (result.node && result.confidence >= confidenceThreshold) {
        const { ast, warnings } = this.semanticParser.buildAST(result.node);

        if (debug && warnings.length > 0) {
          console.log(`[aot] Semantic warnings for "${code}":`, warnings);
        }

        return ast;
      }

      if (debug) {
        console.log(
          `[aot] Semantic parse failed for "${code}": ${result.errors?.join(', ') || 'low confidence'}`
        );
      }
    }

    // Fall back to traditional parser
    if (this.parser) {
      try {
        return this.parser.parse(code, language);
      } catch (error) {
        if (debug) {
          console.log(`[aot] Parse error for "${code}":`, error);
        }
        return null;
      }
    }

    // No parser available - create a simple AST wrapper
    // This allows the compiler to work without a full parser for testing
    return this.createSimpleAST(code);
  }

  /**
   * Create a simple AST from code (for testing without full parser).
   */
  private createSimpleAST(code: string): ASTNode | null {
    // Try to detect basic patterns
    const eventMatch = /^on\s+(\w+)(?:\.(\w+))?\s+(.+)$/i.exec(code.trim());

    if (eventMatch) {
      const [, eventName, modifier, body] = eventMatch;
      return {
        type: 'event',
        event: eventName,
        modifiers: modifier ? { [modifier]: true } : {},
        body: [this.parseSimpleCommand(body)].filter(Boolean),
      } as EventHandlerNode;
    }

    // Try as simple command
    const cmd = this.parseSimpleCommand(code);
    if (cmd) {
      return {
        type: 'event',
        event: 'click',
        body: [cmd],
      } as EventHandlerNode;
    }

    return null;
  }

  /**
   * Parse a simple command (for testing).
   */
  private parseSimpleCommand(code: string): ASTNode | null {
    const trimmed = code.trim();

    // toggle .class
    const toggleMatch = /^toggle\s+\.([a-zA-Z_][a-zA-Z0-9_-]*)$/i.exec(trimmed);
    if (toggleMatch) {
      return {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.' + toggleMatch[1] }],
      };
    }

    // add .class
    const addMatch = /^add\s+\.([a-zA-Z_][a-zA-Z0-9_-]*)$/i.exec(trimmed);
    if (addMatch) {
      return {
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.' + addMatch[1] }],
      };
    }

    // remove .class
    const removeMatch = /^remove\s+\.([a-zA-Z_][a-zA-Z0-9_-]*)$/i.exec(trimmed);
    if (removeMatch) {
      return {
        type: 'command',
        name: 'remove',
        args: [{ type: 'selector', value: '.' + removeMatch[1] }],
      };
    }

    // show/hide
    if (/^show$/i.test(trimmed)) {
      return { type: 'command', name: 'show', args: [] };
    }
    if (/^hide$/i.test(trimmed)) {
      return { type: 'command', name: 'hide', args: [] };
    }

    return null;
  }

  // ===========================================================================
  // ANALYSIS
  // ===========================================================================

  /**
   * Analyze an AST for optimization and code generation.
   */
  analyze(ast: ASTNode): AnalysisResult {
    return this.analyzer.analyze(ast);
  }

  // ===========================================================================
  // COMPILATION
  // ===========================================================================

  /**
   * Compile a single hyperscript string to JavaScript.
   */
  compileScript(code: string, options: CompileOptions = {}): CompilationResult {
    const mergedOptions = { ...DEFAULT_COMPILE_OPTIONS, ...options };

    // Parse
    const ast = this.parse(code, mergedOptions);
    if (!ast) {
      return {
        success: false,
        errors: ['Failed to parse hyperscript'],
        warnings: [],
        metadata: {
          handlerId: '',
          parserUsed: 'traditional',
          commandsUsed: [],
          optimizationsApplied: [],
          needsRuntime: true,
          runtimeHelpers: [],
        },
      };
    }

    // Analyze
    const analysis = this.analyze(ast);

    // Optimize
    const optimized = this.optimizer.optimize(ast, analysis, mergedOptions.optimizationLevel ?? 2);

    // Generate handler ID
    const handlerId = this.generateHandlerId(ast, code);

    // Create codegen context
    const ctx = this.createCodegenContext(handlerId, analysis, mergedOptions);

    // Generate code
    const generated = this.generateCode(optimized, ctx, analysis);

    return {
      success: true,
      code: generated.code,
      warnings: analysis.warnings,
      metadata: {
        handlerId,
        parserUsed: mergedOptions.language !== 'en' ? 'semantic' : 'traditional',
        language: mergedOptions.language,
        commandsUsed: Array.from(analysis.commandsUsed),
        optimizationsApplied: (optimized as { _optimizations?: string[] })._optimizations ?? [],
        needsRuntime: ctx.requiredHelpers.size > 0,
        runtimeHelpers: Array.from(ctx.requiredHelpers),
      },
    };
  }

  /**
   * Compile multiple extracted scripts.
   */
  compile(scripts: ExtractedScript[], options: CompileOptions = {}): BatchCompilationResult {
    const handlers: CompiledHandler[] = [];
    const fallbacks: FallbackScript[] = [];
    const allImports = new Set<string>();

    for (const script of scripts) {
      const scriptOptions = {
        ...options,
        language: script.language ?? options.language ?? 'en',
      };

      const result = this.compileScript(script.code, scriptOptions);

      if (result.success && result.code) {
        handlers.push({
          id: result.metadata.handlerId,
          source: script.code,
          events: this.extractEvents(result.code),
          code: result.code,
          binding: {
            elementId: script.elementId,
            elementSelector: script.elementSelector,
          },
        });

        for (const helper of result.metadata.runtimeHelpers) {
          allImports.add(helper);
        }
      } else {
        fallbacks.push({
          id: `fallback_${fallbacks.length}`,
          script: script.code,
          reason: result.errors?.join(', ') ?? 'Unknown error',
          location: script.location,
        });
      }
    }

    // Generate combined code
    const combinedCode = this.generateCombinedCode(handlers, Array.from(allImports), options);

    return {
      handlers,
      code: combinedCode,
      fallbacks,
      stats: {
        total: scripts.length,
        compiled: handlers.length,
        fallbacks: fallbacks.length,
        totalSize: combinedCode.length,
        runtimeSize: this.estimateRuntimeSize(allImports),
      },
    };
  }

  // ===========================================================================
  // CODE GENERATION
  // ===========================================================================

  /**
   * Generate JavaScript code from an optimized AST.
   */
  private generateCode(
    ast: ASTNode,
    ctx: CodegenContext,
    analysis: AnalysisResult
  ): { code: string; imports: string[] } {
    // Event handler
    if (ast.type === 'event') {
      const eventCodegen = new EventHandlerCodegen(ctx, analysis);
      const generated = eventCodegen.generate(ast as EventHandlerNode);
      return {
        code: generated.handlerCode,
        imports: generated.imports,
      };
    }

    // Command sequence or other
    const exprCodegen = new ExpressionCodegen(ctx);
    return {
      code: exprCodegen.generate(ast),
      imports: Array.from(ctx.requiredHelpers),
    };
  }

  /**
   * Generate combined code for multiple handlers.
   */
  private generateCombinedCode(
    handlers: CompiledHandler[],
    imports: string[],
    options: CompileOptions
  ): string {
    const codegenOptions = { ...DEFAULT_CODEGEN_OPTIONS, ...options.codegen };
    const lines: string[] = [];

    // Import statement
    if (imports.length > 0) {
      const importList = imports.join(', ');
      if (codegenOptions.mode === 'esm') {
        lines.push(`import { ${importList} } from '${codegenOptions.runtimeImport}';`);
      } else if (codegenOptions.mode === 'cjs') {
        lines.push(`const { ${importList} } = require('${codegenOptions.runtimeImport}');`);
      }
    }

    // Runtime alias
    lines.push('const _rt = { ' + imports.map(i => `${i}: ${i}`).join(', ') + ' };');
    lines.push('');

    // Handler functions
    for (const handler of handlers) {
      if (codegenOptions.preserveComments) {
        lines.push(`// Original: ${handler.source}`);
      }
      lines.push(handler.code);
      lines.push('');
    }

    // Binding code
    lines.push('// Bind handlers to elements');
    lines.push('_rt.ready(() => {');

    for (const handler of handlers) {
      const selector = handler.binding.elementId
        ? `#${handler.binding.elementId}`
        : (handler.binding.elementSelector ?? '[_]');

      for (const event of handler.events) {
        lines.push(`  document.querySelectorAll('${selector}').forEach(_el => {`);
        lines.push(`    _el.addEventListener('${event}', _handler_${handler.id});`);
        lines.push('  });');
      }
    }

    lines.push('});');

    return lines.join('\n');
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Generate a unique handler ID.
   */
  private generateHandlerId(ast: ASTNode, code: string): string {
    // Get event name if available
    const event = (ast as EventHandlerNode).event ?? 'handler';

    // Get primary command
    const body = (ast as { body?: ASTNode[] }).body ?? [];
    const firstCmd = body[0] as { name?: string } | undefined;
    const command = firstCmd?.name ?? 'action';

    // Hash the code for uniqueness
    let hash = 5381;
    for (let i = 0; i < code.length; i++) {
      hash = ((hash << 5) + hash) ^ code.charCodeAt(i);
    }
    const hashStr = Math.abs(hash).toString(36).slice(0, 4);

    // Generate ID
    let id = `${event}_${command}_${hashStr}`;

    // Handle collisions
    let suffix = 0;
    while (this.usedIds.has(id)) {
      id = `${event}_${command}_${hashStr}${suffix++}`;
    }

    this.usedIds.add(id);
    return id;
  }

  /**
   * Create a codegen context.
   */
  private createCodegenContext(
    handlerId: string,
    analysis: AnalysisResult,
    options: CompileOptions
  ): CodegenContext {
    const selectorCache = new Map<string, string>();
    const requiredHelpers = new Set<string>();
    let idCounter = 0;

    // Pre-populate selector cache
    for (const info of analysis.expressions.selectors) {
      if (info.canCache && info.usages.length > 1) {
        const cacheKey =
          '_sel_' + sanitizeIdentifier(info.selector).slice(0, 20) + '_' + idCounter++;
        selectorCache.set(info.selector, cacheKey);
      }
    }

    const exprCodegenRef: { current: ExpressionCodegen | null } = { current: null };

    const ctx: CodegenContext = {
      handlerId,
      generateId: (prefix = '_id') => `${prefix}_${idCounter++}`,
      generateExpression: (node: ASTNode) => {
        if (!exprCodegenRef.current) {
          exprCodegenRef.current = new ExpressionCodegen(ctx);
        }
        return exprCodegenRef.current.generate(node);
      },
      implicitTarget: '_ctx.me',
      localVarDeclarations: '',
      canCacheSelector: (selector: string) => selectorCache.has(selector),
      getCachedSelector: (selector: string) =>
        selectorCache.get(selector) ?? `document.querySelector('${selector}')`,
      requireHelper: (name: string) => {
        requiredHelpers.add(name);
      },
      requiredHelpers,
      analysis,
      options: { ...DEFAULT_CODEGEN_OPTIONS, ...options.codegen },
    };

    return ctx;
  }

  /**
   * Extract event names from generated code.
   */
  private extractEvents(code: string): string[] {
    const events: string[] = [];
    const match = /function\s+_handler_\w+\s*\(\s*_event\s*\)/.exec(code);
    if (match) {
      // Default to click if we can't determine
      events.push('click');
    }
    return events.length > 0 ? events : ['click'];
  }

  /**
   * Estimate runtime size based on required helpers.
   */
  private estimateRuntimeSize(imports: Set<string>): number {
    // Rough estimates in bytes
    const helperSizes: Record<string, number> = {
      createContext: 200,
      HALT: 50,
      EXIT: 50,
      globals: 100,
      toggle: 150,
      toggleAttr: 100,
      addClass: 80,
      removeClass: 80,
      getProp: 120,
      setProp: 120,
      contains: 150,
      matches: 50,
      debounce: 150,
      throttle: 150,
      wait: 80,
      send: 150,
      delegate: 200,
      fetchJSON: 150,
      fetchText: 150,
      fetchHTML: 180,
      ready: 100,
    };

    let total = 500; // Base runtime overhead
    for (const helper of imports) {
      total += helperSizes[helper] ?? 100;
    }
    return total;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Create a new AOT compiler instance.
 */
export function createCompiler(): AOTCompiler {
  return new AOTCompiler();
}

/**
 * Compile hyperscript code to JavaScript (convenience function).
 */
export async function compileHyperscript(code: string, options?: CompileOptions): Promise<string> {
  const compiler = new AOTCompiler();
  const result = compiler.compileScript(code, options);

  if (!result.success) {
    throw new Error(result.errors?.join(', ') ?? 'Compilation failed');
  }

  return result.code ?? '';
}

export default AOTCompiler;
