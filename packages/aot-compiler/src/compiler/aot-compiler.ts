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
  CommandNode,
} from '../types/aot-types.js';
import { HTMLScanner, VueScanner, SvelteScanner, JSXScanner } from '../scanner/html-scanner.js';
import { Analyzer } from './analyzer.js';
import { OptimizationPipeline } from '../optimizations/index.js';
import { ExpressionCodegen, sanitizeIdentifier } from '../transforms/expression-transforms.js';
import { EventHandlerCodegen } from '../transforms/event-transforms.js';
import {
  isExplicitSyntax,
  parseExplicit,
  jsonToSemanticNode,
  type SemanticNode,
  type EventHandlerSemanticNode,
  type SemanticValue,
} from '@lokascript/framework';

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
    runtimeImport: '@hyperfixi/aot-compiler/runtime',
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
  runtimeImport: '@hyperfixi/aot-compiler/runtime',
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
   * Supports natural language, explicit bracket syntax, and JSON input.
   */
  parse(code: string, options: CompileOptions = {}): ASTNode | null {
    const { language = 'en', confidenceThreshold = 0.7, debug = false } = options;

    let ast: ASTNode | null = null;

    // Try explicit bracket syntax (language-agnostic, no parsers needed)
    if (isExplicitSyntax(code)) {
      try {
        const node = parseExplicit(code);
        ast = this.semanticNodeToAOT(node);
        if (debug) {
          console.log(`[aot] Parsed explicit syntax: "${code}"`);
        }
      } catch (error) {
        if (debug) {
          console.log(`[aot] Explicit parse error for "${code}":`, error);
        }
      }
      if (ast) return this.ensureEventHandler(ast);
    }

    // Try JSON input
    if (this.looksLikeJSON(code)) {
      try {
        const json = JSON.parse(code.trim());
        const node = jsonToSemanticNode(json);
        ast = this.semanticNodeToAOT(node);
        if (debug) {
          console.log(`[aot] Parsed JSON input: "${code.slice(0, 80)}..."`);
        }
      } catch (error) {
        if (debug) {
          console.log(`[aot] JSON parse error for "${code.slice(0, 80)}":`, error);
        }
      }
      if (ast) return this.ensureEventHandler(ast);
    }

    // Try semantic parser for non-English
    if (language !== 'en' && this.semanticParser?.supportsLanguage(language)) {
      const result = this.semanticParser.analyze(code, language);

      if (result.node && result.confidence >= confidenceThreshold) {
        const { ast: semanticAst, warnings } = this.semanticParser.buildAST(result.node);

        if (debug && warnings.length > 0) {
          console.log(`[aot] Semantic warnings for "${code}":`, warnings);
        }

        ast = semanticAst;
      } else if (debug) {
        console.log(
          `[aot] Semantic parse failed for "${code}": ${result.errors?.join(', ') || 'low confidence'}`
        );
      }
    }

    // Fall back to traditional parser
    if (!ast && this.parser) {
      try {
        ast = this.parser.parse(code, language);
      } catch (error) {
        if (debug) {
          console.log(`[aot] Parse error for "${code}":`, error);
        }
      }
    }

    // No parser available - create a simple AST wrapper
    if (!ast) {
      ast = this.createSimpleAST(code);
    }

    return this.ensureEventHandler(ast);
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

    // show/hide/focus/blur
    if (/^show$/i.test(trimmed)) {
      return { type: 'command', name: 'show', args: [] };
    }
    if (/^hide$/i.test(trimmed)) {
      return { type: 'command', name: 'hide', args: [] };
    }
    if (/^focus$/i.test(trimmed)) {
      return { type: 'command', name: 'focus', args: [] };
    }
    if (/^blur$/i.test(trimmed)) {
      return { type: 'command', name: 'blur', args: [] };
    }

    // set :var to value
    const setMatch = /^set\s+:(\w+)\s+to\s+(.+)$/i.exec(trimmed);
    if (setMatch) {
      const [, varName, valueStr] = setMatch;
      return {
        type: 'command',
        name: 'set',
        args: [{ type: 'variable', name: ':' + varName, scope: 'local' }],
        modifiers: { to: this.parseSimpleValue(valueStr) },
      };
    }

    // increment/decrement :var
    const incrMatch = /^(increment|decrement)\s+:(\w+)$/i.exec(trimmed);
    if (incrMatch) {
      const [, cmd, varName] = incrMatch;
      return {
        type: 'command',
        name: cmd.toLowerCase(),
        args: [{ type: 'variable', name: ':' + varName, scope: 'local' }],
      };
    }

    // wait Nms / wait Ns
    const waitMatch = /^wait\s+(\d+(?:\.\d+)?)(ms|s)$/i.exec(trimmed);
    if (waitMatch) {
      const [, value, unit] = waitMatch;
      const ms = unit.toLowerCase() === 's' ? parseFloat(value) * 1000 : parseFloat(value);
      return {
        type: 'command',
        name: 'wait',
        args: [{ type: 'literal', value: ms }],
      };
    }

    // log "string" or log value
    const logMatch = /^log\s+(.+)$/i.exec(trimmed);
    if (logMatch) {
      return {
        type: 'command',
        name: 'log',
        args: [this.parseSimpleValue(logMatch[1])],
      };
    }

    // send "event" [to target]
    const sendMatch = /^send\s+"([^"]+)"(?:\s+to\s+(\w+))?$/i.exec(trimmed);
    if (sendMatch) {
      const [, eventName, target] = sendMatch;
      const node: ASTNode = {
        type: 'command',
        name: 'send',
        args: [{ type: 'literal', value: eventName }],
      };
      if (target) {
        (node as Record<string, unknown>).target = { type: 'identifier', value: target };
      }
      return node;
    }

    // fetch url [as json/text/html]
    const fetchMatch = /^fetch\s+(\S+)(?:\s+as\s+(\w+))?$/i.exec(trimmed);
    if (fetchMatch) {
      const [, url, format] = fetchMatch;
      const node: ASTNode = {
        type: 'command',
        name: 'fetch',
        args: [{ type: 'literal', value: url }],
      };
      if (format) {
        (node as Record<string, unknown>).modifiers = { as: format };
      }
      return node;
    }

    // put value into target
    const putMatch = /^put\s+"([^"]+)"\s+(into|before|after)\s+(\S+)$/i.exec(trimmed);
    if (putMatch) {
      const [, content, position, target] = putMatch;
      return {
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: content }],
        modifiers: { position, [position]: this.parseSimpleValue(target) },
      };
    }

    return null;
  }

  /**
   * Parse a simple value string to an AST node.
   */
  private parseSimpleValue(valueStr: string): ASTNode {
    const trimmed = valueStr.trim();

    // Quoted string
    const strMatch = /^"([^"]*)"$/.exec(trimmed) ?? /^'([^']*)'$/.exec(trimmed);
    if (strMatch) {
      return { type: 'literal', value: strMatch[1] };
    }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'literal', value: parseFloat(trimmed) };
    }

    // Boolean
    if (trimmed === 'true') return { type: 'literal', value: true };
    if (trimmed === 'false') return { type: 'literal', value: false };

    // Selector (#id or .class)
    if (/^[#.][a-zA-Z_]/.test(trimmed)) {
      return { type: 'selector', value: trimmed };
    }

    // Local variable
    if (trimmed.startsWith(':')) {
      return { type: 'variable', name: trimmed, scope: 'local' };
    }

    // Identifier
    return { type: 'identifier', value: trimmed };
  }

  // ===========================================================================
  // EXPLICIT / JSON INPUT HELPERS
  // ===========================================================================

  /**
   * Check if input looks like JSON (LLM JSON format).
   */
  private looksLikeJSON(code: string): boolean {
    const trimmed = code.trim();
    return trimmed.startsWith('{') && trimmed.includes('"action"');
  }

  /**
   * Ensure top-level node is always an event handler.
   * The codegen pipeline (EventHandlerCodegen) requires this.
   */
  private ensureEventHandler(ast: ASTNode | null): ASTNode | null {
    if (ast && ast.type !== 'event') {
      return {
        type: 'event',
        event: 'click',
        modifiers: {},
        body: [ast],
      } as EventHandlerNode;
    }
    return ast;
  }

  /**
   * Convert a framework SemanticNode to an AOT ASTNode.
   * Handles the simple cases produced by explicit/JSON parsing.
   */
  private semanticNodeToAOT(node: SemanticNode): ASTNode {
    if (node.kind === 'event-handler') {
      const eh = node as EventHandlerSemanticNode;
      const eventValue = eh.roles.get('event');
      const eventName = eventValue && 'value' in eventValue ? String(eventValue.value) : 'click';
      return {
        type: 'event',
        event: eventName,
        modifiers: {},
        body: (eh.body ?? []).map((child: SemanticNode) => this.semanticNodeToAOT(child)),
      } as EventHandlerNode;
    }

    // Command node
    const roles: Record<string, ASTNode> = {};
    const args: ASTNode[] = [];

    for (const [roleName, value] of node.roles) {
      const astValue = this.semanticValueToAOT(value);
      roles[roleName] = astValue;
      args.push(astValue);
    }

    return {
      type: 'command',
      name: node.action,
      args,
      roles,
    } as CommandNode;
  }

  /**
   * Convert a SemanticValue to an ASTNode.
   */
  private semanticValueToAOT(value: SemanticValue): ASTNode {
    switch (value.type) {
      case 'selector':
        return { type: 'selector', value: value.value as string };
      case 'reference':
        return { type: 'identifier', value: value.value as string };
      case 'literal': {
        const lit = value as { value: unknown; dataType?: string };
        if (lit.dataType === 'duration') {
          // Parse duration to ms
          const str = String(lit.value);
          const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(str);
          if (match) {
            const ms = match[2] === 's' ? parseFloat(match[1]) * 1000 : parseFloat(match[1]);
            return { type: 'literal', value: ms };
          }
        }
        return { type: 'literal', value: lit.value as string | number | boolean | null };
      }
      default:
        return { type: 'literal', value: String((value as { value?: unknown }).value ?? '') };
    }
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

    // Merge codegen-reported imports with context-required helpers
    const allHelpers = new Set([...ctx.requiredHelpers, ...generated.imports]);

    // Silent-failure detection: warn if event handler has body commands
    // but generated code has no actual command output
    if (optimized.type === 'event') {
      const eventNode = optimized as EventHandlerNode;
      const bodyLen = eventNode.body?.length ?? 0;
      if (bodyLen > 0 && generated.code) {
        const handlerMatch = /function\s+_handler_\w+\(_event\)\s*\{([\s\S]*)\}\s*$/.exec(
          generated.code
        );
        if (handlerMatch) {
          const bodyContent = handlerMatch[1]
            .replace(/const _ctx\s*=\s*[^;]*;/g, '')
            .replace(/const _el\s*=\s*[^;]*;/g, '')
            .trim();
          if (!bodyContent) {
            analysis.warnings.push(
              `Event handler body appears empty despite ${bodyLen} parsed command(s). ` +
                `This may indicate a code generation failure for: "${code}"`
            );
          }
        }
      }
    }

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
        needsRuntime: allHelpers.size > 0,
        runtimeHelpers: Array.from(allHelpers),
      },
    };
  }

  /**
   * Compile a pre-parsed AST to JavaScript.
   * Skips parsing entirely — accepts an interchange-format ASTNode directly.
   * Use this when the AST has already been produced by a semantic parser,
   * explicit syntax parser, or other external source.
   */
  compileAST(ast: ASTNode, options: CompileOptions = {}): CompilationResult {
    const mergedOptions = { ...DEFAULT_COMPILE_OPTIONS, ...options };

    // Normalize: ensure top-level node is an event handler
    let normalized = ast;
    if (normalized.type !== 'event') {
      normalized = {
        type: 'event',
        event: 'click',
        modifiers: {},
        body: [normalized],
      } as EventHandlerNode;
    }

    // Analyze
    const analysis = this.analyze(normalized);

    // Optimize
    const optimized = this.optimizer.optimize(
      normalized,
      analysis,
      mergedOptions.optimizationLevel ?? 2
    );

    // Generate handler ID (use JSON hash since we have no source string)
    const sourceHint = JSON.stringify(ast).slice(0, 200);
    const handlerId = this.generateHandlerId(optimized, sourceHint);

    // Create codegen context
    const ctx = this.createCodegenContext(handlerId, analysis, mergedOptions);

    // Generate code
    const generated = this.generateCode(optimized, ctx, analysis);

    // Merge helpers
    const allHelpers = new Set([...ctx.requiredHelpers, ...generated.imports]);

    // Silent-failure detection
    if (optimized.type === 'event') {
      const eventNode = optimized as EventHandlerNode;
      const bodyLen = eventNode.body?.length ?? 0;
      if (bodyLen > 0 && generated.code) {
        const handlerMatch = /function\s+_handler_\w+\(_event\)\s*\{([\s\S]*)\}\s*$/.exec(
          generated.code
        );
        if (handlerMatch) {
          const bodyContent = handlerMatch[1]
            .replace(/const _ctx\s*=\s*[^;]*;/g, '')
            .replace(/const _el\s*=\s*[^;]*;/g, '')
            .trim();
          if (!bodyContent) {
            analysis.warnings.push(
              `Event handler body appears empty despite ${bodyLen} parsed command(s). ` +
                `This may indicate a code generation failure for pre-parsed AST.`
            );
          }
        }
      }
    }

    return {
      success: true,
      code: generated.code,
      warnings: analysis.warnings,
      metadata: {
        handlerId,
        parserUsed: 'traditional', // pre-parsed, no parser involved
        language: mergedOptions.language,
        commandsUsed: Array.from(analysis.commandsUsed),
        optimizationsApplied: (optimized as { _optimizations?: string[] })._optimizations ?? [],
        needsRuntime: allHelpers.size > 0,
        runtimeHelpers: Array.from(allHelpers),
      },
    };
  }

  /**
   * Compile explicit bracket syntax or LLM JSON to JavaScript.
   * Uses the framework IR directly — no semantic or traditional parser needed.
   */
  compileExplicit(code: string, options: CompileOptions = {}): CompilationResult {
    try {
      const ast = isExplicitSyntax(code)
        ? this.semanticNodeToAOT(parseExplicit(code))
        : this.semanticNodeToAOT(jsonToSemanticNode(JSON.parse(code.trim())));

      return this.compileAST(ast, options);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        metadata: {
          handlerId: '',
          parserUsed: 'traditional',
          commandsUsed: [],
          optimizationsApplied: [],
          needsRuntime: false,
          runtimeHelpers: [],
        },
      };
    }
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

    // Ensure 'ready' is always included (binding code requires it)
    const allImports = [...new Set([...imports, 'ready'])];

    // Import statement and runtime alias
    const importList = allImports.join(', ');
    if (codegenOptions.mode === 'iife') {
      lines.push('(function() {');
      lines.push("var _ls = typeof lokascriptRuntime !== 'undefined' ? lokascriptRuntime : {};");
      lines.push('var _rt = { ' + allImports.map(i => `${i}: _ls.${i}`).join(', ') + ' };');
    } else {
      if (codegenOptions.mode === 'esm') {
        lines.push(`import { ${importList} } from '${codegenOptions.runtimeImport}';`);
      } else if (codegenOptions.mode === 'cjs') {
        lines.push(`const { ${importList} } = require('${codegenOptions.runtimeImport}');`);
      }
      lines.push('const _rt = { ' + allImports.map(i => `${i}: ${i}`).join(', ') + ' };');
    }
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

    // Close IIFE wrapper
    if (codegenOptions.mode === 'iife') {
      lines.push('})();');
    }

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
      getValues: 180,
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

/**
 * Create an AOT compiler with both core and semantic parsers wired up.
 * Dynamically imports @hyperfixi/core and @lokascript/semantic if available.
 */
export async function createMultilingualCompiler(): Promise<AOTCompiler> {
  const compiler = new AOTCompiler();

  try {
    const { createCoreParserAdapter } = await import('./core-parser-adapter.js');
    compiler.setParser(await createCoreParserAdapter());
  } catch {
    /* @hyperfixi/core not available */
  }

  try {
    const { createSemanticAdapter } = await import('./semantic-adapter.js');
    compiler.setSemanticParser(await createSemanticAdapter());
  } catch {
    /* @lokascript/semantic not available */
  }

  return compiler;
}

export default AOTCompiler;
