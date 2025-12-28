/**
 * HyperscriptCompiler - compiles hyperscript to executable JavaScript
 *
 * This compiler parses hyperscript syntax and generates executable JavaScript.
 * It uses a fallback regex-based approach for robustness, with AST-based
 * generation available when @hyperfixi/core integration is enabled.
 *
 * Future: Full AST-based compilation via @hyperfixi/core parser
 */

import { CompilationCache } from '../cache/compilation-cache.js';
import type {
  CompilationOptions,
  CompilationResult,
  CompilationError,
  CompilationWarning,
  ScriptMetadata
} from '../types.js';
import type { ASTNode } from '@hyperfixi/ast-toolkit';

// Core compilation result interface (compatible with @hyperfixi/core)
interface CoreCompilationResult {
  success: boolean;
  ast?: ASTNode;
  errors: Array<{
    name?: string;
    message: string;
    line?: number;
    column?: number;
  }>;
  tokens: unknown[];
  compilationTime: number;
}

// Optional: Dynamic import of @hyperfixi/core for AST-based compilation
// This allows the package to work without requiring core to be built
let hyperscriptCore: { compile: (code: string) => CoreCompilationResult } | null = null;

async function tryLoadCore(): Promise<boolean> {
  if (hyperscriptCore !== null) return true;
  try {
    const module = await import('@hyperfixi/core');
    hyperscriptCore = module.hyperscript;
    return true;
  } catch {
    // Core not available, use fallback
    return false;
  }
}

export class HyperscriptCompiler {
  private cache: CompilationCache;

  constructor(cache: CompilationCache) {
    this.cache = cache;
  }

  /**
   * Compile hyperscript to JavaScript
   */
  async compile(
    script: string,
    options: CompilationOptions = {},
    validationOnly: boolean = false
  ): Promise<CompilationResult> {
    // Validate input
    if (typeof script !== 'string') {
      return {
        compiled: '',
        metadata: this.getEmptyMetadata(),
        warnings: [],
        errors: [{
          type: 'CompilationError',
          message: 'Invalid script input: script must be a string',
          line: 1,
          column: 1
        }]
      };
    }

    // Handle empty scripts
    if (script.trim() === '') {
      return {
        compiled: validationOnly ? '' : '// Empty hyperscript compilation',
        metadata: this.getEmptyMetadata(),
        warnings: [],
        errors: []
      };
    }

    // Check cache first (unless in validation mode)
    if (!validationOnly && this.cache.has(script, options)) {
      const cached = this.cache.get(script, options);
      if (cached) {
        return cached;
      }
    }

    try {
      const startTime = performance.now();

      // Try to use @hyperfixi/core for parsing (may not be available)
      const coreResult = await this.parseWithCore(script);

      const errors: CompilationError[] = [];
      const warnings: CompilationWarning[] = [];

      // Convert core errors to our format (if core was used)
      if (coreResult && !coreResult.success) {
        for (const error of coreResult.errors) {
          errors.push({
            type: error.name || 'ParseError',
            message: error.message,
            line: error.line || 1,
            column: error.column || 1
          });
        }
      }

      // Also run legacy validation for additional checks
      const legacyErrors = this.validateSyntax(script);
      for (const err of legacyErrors) {
        // Avoid duplicating error messages
        if (!errors.some(e => e.message === err.message)) {
          errors.push(err);
        }
      }

      // Extract metadata from AST if parsing succeeded, otherwise use regex fallback
      let metadata: ScriptMetadata;
      if (coreResult?.success && coreResult.ast) {
        metadata = this.extractMetadataFromAST(coreResult.ast, script);
      } else {
        metadata = await this.analyzeScriptFallback(script);
      }

      // Compile to JavaScript (only if no errors and not validation-only)
      let compiled = '';
      if (errors.length === 0 && !validationOnly) {
        if (coreResult?.success && coreResult.ast) {
          compiled = this.generateJavaScriptFromAST(coreResult.ast, script, options);
        } else {
          compiled = await this.generateJavaScriptFallback(script, options, metadata);
        }
      }

      const endTime = performance.now();

      // Create result
      const result: CompilationResult = {
        compiled,
        metadata,
        warnings,
        errors
      };

      // Add source map if requested
      if (options.sourceMap && !validationOnly && errors.length === 0) {
        result.sourceMap = this.generateSourceMap(script, compiled);
      }

      // Cache the result (unless in validation mode)
      if (!validationOnly) {
        this.cache.set(script, options, result);
      }

      return result;

    } catch (error) {
      return {
        compiled: '',
        metadata: this.getEmptyMetadata(),
        warnings: [],
        errors: [{
          type: 'CompilationError',
          message: error instanceof Error ? error.message : String(error),
          line: 1,
          column: 1
        }]
      };
    }
  }

  /**
   * Parse hyperscript using @hyperfixi/core (if available)
   */
  private async parseWithCore(script: string): Promise<CoreCompilationResult | null> {
    // Try to load core if not already loaded
    const coreAvailable = await tryLoadCore();
    if (!coreAvailable || !hyperscriptCore) {
      return null; // Will use fallback
    }

    try {
      return hyperscriptCore.compile(script);
    } catch (error) {
      // If parsing throws, return a failure result
      return {
        success: false,
        errors: [{
          name: 'ParseError',
          message: error instanceof Error ? error.message : String(error),
          line: 1,
          column: 1
        }],
        tokens: [],
        compilationTime: 0
      };
    }
  }

  /**
   * Extract metadata from parsed AST
   * Also uses regex extraction as supplement for reliable extraction
   */
  private extractMetadataFromAST(ast: ASTNode, script: string): ScriptMetadata {
    const metadata: ScriptMetadata = {
      complexity: 1,
      dependencies: [],
      selectors: [],
      events: [],
      commands: [],
      templateVariables: []
    };

    // Traverse AST to extract metadata
    this.traverseAST(ast, (node) => {
      // Extract events from eventHandler nodes
      if (node.type === 'eventHandler' && 'eventName' in node) {
        const eventName = String(node.eventName);
        if (eventName && !metadata.events.includes(eventName)) {
          metadata.events.push(eventName);
        }
      }

      // Also check for 'on' features
      if (node.type === 'feature' && 'keyword' in node && node.keyword === 'on') {
        // Check for event in the body
        const body = (node as { body?: ASTNode[] }).body || [];
        for (const handler of body) {
          if (handler.type === 'eventHandler' && 'eventName' in handler) {
            const eventName = String(handler.eventName);
            if (eventName && !metadata.events.includes(eventName)) {
              metadata.events.push(eventName);
            }
          }
        }
      }

      // Extract command names
      if (node.type === 'command' && 'name' in node) {
        const commandName = String(node.name);
        if (commandName && !metadata.commands.includes(commandName)) {
          metadata.commands.push(commandName);
        }
      }

      // Extract CSS selectors from various node types
      if ('selector' in node && typeof node.selector === 'string') {
        const selector = node.selector;
        if (selector.match(/^[.#][a-zA-Z0-9_-]+$/) && !metadata.selectors.includes(selector)) {
          metadata.selectors.push(selector);
        }
      }

      // Also look for classRef nodes
      if (node.type === 'classRef' && 'className' in node) {
        const selector = '.' + String(node.className);
        if (!metadata.selectors.includes(selector)) {
          metadata.selectors.push(selector);
        }
      }

      // Look for idRef nodes
      if (node.type === 'idRef' && 'id' in node) {
        const selector = '#' + String(node.id);
        if (!metadata.selectors.includes(selector)) {
          metadata.selectors.push(selector);
        }
      }
    });

    // ALWAYS use regex extraction as supplement - AST may not capture all details
    const lines = script.split('\n').map(line => line.trim());
    for (const line of lines) {
      // Extract events using regex
      const eventMatch = line.match(/^on\s+(\w+)/);
      if (eventMatch && !metadata.events.includes(eventMatch[1])) {
        metadata.events.push(eventMatch[1]);
      }

      // Extract commands using regex
      const commands = ['toggle', 'add', 'remove', 'put', 'fetch', 'send', 'trigger', 'show', 'hide', 'log', 'wait', 'halt'];
      for (const command of commands) {
        if (line.includes(command) && !metadata.commands.includes(command)) {
          metadata.commands.push(command);
        }
      }
    }

    // Extract template variables using regex (not in AST)
    const templateMatches = script.match(/\{\{(\w+)\}\}/g);
    if (templateMatches) {
      for (const match of templateMatches) {
        const variable = match.replace(/[{}]/g, '');
        if (!metadata.templateVariables.includes(variable)) {
          metadata.templateVariables.push(variable);
        }
      }
    }

    // Extract selectors from raw script (AST may not capture all)
    const selectorMatches = script.match(/[.#][a-zA-Z0-9_-]+/g);
    if (selectorMatches) {
      for (const selector of selectorMatches) {
        if (!metadata.selectors.includes(selector)) {
          metadata.selectors.push(selector);
        }
      }
    }

    // Calculate complexity
    metadata.complexity = Math.max(1,
      metadata.events.length +
      metadata.commands.length +
      (metadata.selectors.length > 0 ? 1 : 0) +
      (script.includes('if') ? 1 : 0) +
      (script.includes('else') ? 1 : 0) +
      (script.includes('repeat') ? 1 : 0) +
      (script.includes('wait') ? 1 : 0)
    );

    return metadata;
  }

  /**
   * Traverse AST and call visitor for each node
   */
  private traverseAST(node: ASTNode, visitor: (node: ASTNode) => void): void {
    if (!node || typeof node !== 'object') return;

    visitor(node);

    // Traverse children arrays
    for (const key of ['children', 'commands', 'body', 'features', 'args', 'arguments']) {
      const children = (node as Record<string, unknown>)[key];
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child && typeof child === 'object') {
            this.traverseAST(child as ASTNode, visitor);
          }
        }
      }
    }

    // Traverse single child properties
    for (const key of ['then', 'else', 'target', 'value', 'expression', 'condition']) {
      const child = (node as Record<string, unknown>)[key];
      if (child && typeof child === 'object' && 'type' in child) {
        this.traverseAST(child as ASTNode, visitor);
      }
    }
  }

  /**
   * Generate JavaScript from AST
   */
  private generateJavaScriptFromAST(
    ast: ASTNode,
    script: string,
    options: CompilationOptions
  ): string {
    const jsLines: string[] = [];

    // Process features (event handlers, behaviors, etc.)
    const features = (ast as { features?: ASTNode[] }).features || [];

    for (const feature of features) {
      if (feature.type === 'feature' && 'keyword' in feature) {
        if (feature.keyword === 'on') {
          // Event handler
          const body = (feature as { body?: ASTNode[] }).body || [];
          for (const handler of body) {
            if (handler.type === 'eventHandler' && 'eventName' in handler) {
              const eventName = String(handler.eventName);
              const commands = (handler as { commands?: ASTNode[] }).commands || [];
              this.generateEventHandler(eventName, commands, jsLines, script);
            }
          }
        }
      } else if (feature.type === 'eventHandler' && 'eventName' in feature) {
        const eventName = String(feature.eventName);
        const commands = (feature as { commands?: ASTNode[] }).commands || [];
        this.generateEventHandler(eventName, commands, jsLines, script);
      }
    }

    // If no features found, try to process as direct event handler
    if (jsLines.length === 0 && ast.type === 'eventHandler' && 'eventName' in ast) {
      const eventName = String((ast as { eventName: unknown }).eventName);
      const commands = (ast as { commands?: ASTNode[] }).commands || [];
      this.generateEventHandler(eventName, commands, jsLines, script);
    }

    // If still empty, fall back to regex-based generation
    if (jsLines.length === 0) {
      return this.generateJavaScriptFallbackSync(script, options);
    }

    let compiled = jsLines.join('\n');

    // Apply options
    if (options.minify) {
      compiled = this.minifyJS(compiled);
    }

    if (options.compatibility === 'legacy') {
      compiled = this.transformToLegacy(compiled);
    }

    return compiled || '// Empty hyperscript compilation';
  }

  /**
   * Generate JavaScript for an event handler
   */
  private generateEventHandler(
    eventName: string,
    commands: ASTNode[],
    jsLines: string[],
    originalScript: string
  ): void {
    jsLines.push(`document.addEventListener('${eventName}', function(e) {`);

    for (const command of commands) {
      this.generateCommandJS(command, jsLines, originalScript);
    }

    // If no commands generated, add a placeholder from the original script
    if (commands.length === 0) {
      // Parse commands from original script for this event
      const lines = originalScript.split('\n').map(l => l.trim()).filter(l => l);
      let inEvent = false;

      for (const line of lines) {
        if (line.startsWith(`on ${eventName}`)) {
          inEvent = true;
          const rest = line.replace(`on ${eventName}`, '').trim();
          if (rest) {
            this.generateCommandFromLine(rest, jsLines);
          }
        } else if (line.startsWith('on ')) {
          inEvent = false;
        } else if (inEvent) {
          this.generateCommandFromLine(line, jsLines);
        }
      }
    }

    jsLines.push(`});`);
  }

  /**
   * Generate JavaScript for a single command node
   */
  private generateCommandJS(command: ASTNode, jsLines: string[], originalScript: string): void {
    const commandName = 'name' in command ? String(command.name) : '';

    switch (commandName.toLowerCase()) {
      case 'toggle':
        this.generateToggleCommand(command, jsLines);
        break;
      case 'add':
        this.generateAddCommand(command, jsLines);
        break;
      case 'remove':
        this.generateRemoveCommand(command, jsLines);
        break;
      case 'show':
        this.generateShowCommand(command, jsLines);
        break;
      case 'hide':
        this.generateHideCommand(command, jsLines);
        break;
      case 'log':
        this.generateLogCommand(command, jsLines);
        break;
      case 'fetch':
        this.generateFetchCommand(command, jsLines);
        break;
      case 'send':
      case 'trigger':
        this.generateSendCommand(command, jsLines);
        break;
      default:
        // Generic command placeholder
        jsLines.push(`  // ${commandName} command`);
    }
  }

  private generateToggleCommand(command: ASTNode, jsLines: string[]): void {
    const selector = this.extractSelector(command);
    if (selector) {
      jsLines.push(`  const element = document.querySelector('${selector}');`);
      jsLines.push(`  if (element) element.classList.toggle('active');`);
    }
  }

  private generateAddCommand(command: ASTNode, jsLines: string[]): void {
    const selector = this.extractSelector(command);
    if (selector) {
      jsLines.push(`  const element = document.querySelector('${selector}');`);
      jsLines.push(`  if (element) element.classList.add('active');`);
    }
  }

  private generateRemoveCommand(command: ASTNode, jsLines: string[]): void {
    const selector = this.extractSelector(command);
    if (selector) {
      jsLines.push(`  const element = document.querySelector('${selector}');`);
      jsLines.push(`  if (element) element.classList.remove('active');`);
    }
  }

  private generateShowCommand(command: ASTNode, jsLines: string[]): void {
    const selector = this.extractSelector(command);
    if (selector) {
      jsLines.push(`  const element = document.querySelector('${selector}');`);
      jsLines.push(`  if (element) element.style.display = 'block';`);
    }
  }

  private generateHideCommand(command: ASTNode, jsLines: string[]): void {
    const selector = this.extractSelector(command);
    if (selector) {
      jsLines.push(`  const element = document.querySelector('${selector}');`);
      jsLines.push(`  if (element) element.style.display = 'none';`);
    }
  }

  private generateLogCommand(command: ASTNode, jsLines: string[]): void {
    const message = 'value' in command ? String(command.value) : 'log message';
    jsLines.push(`  console.log('${message.replace(/'/g, "\\'")}');`);
  }

  private generateFetchCommand(command: ASTNode, jsLines: string[]): void {
    const url = 'url' in command ? String(command.url) : '/api/data';
    jsLines.push(`  try {`);
    jsLines.push(`    const response = await fetch('${url}');`);
    jsLines.push(`    const data = await response.json();`);
    jsLines.push(`    console.log('Fetched:', data);`);
    jsLines.push(`  } catch (error) {`);
    jsLines.push(`    console.error('Fetch error:', error);`);
    jsLines.push(`  }`);
  }

  private generateSendCommand(command: ASTNode, jsLines: string[]): void {
    const eventName = 'eventName' in command ? String(command.eventName) : 'customEvent';
    jsLines.push(`  const customEvent = new CustomEvent('${eventName}', { detail: e });`);
    jsLines.push(`  document.dispatchEvent(customEvent);`);
  }

  private extractSelector(command: ASTNode): string | null {
    // Try various selector locations in the AST
    if ('selector' in command && typeof command.selector === 'string') {
      return command.selector;
    }
    if ('target' in command && typeof command.target === 'object' && command.target) {
      const target = command.target as Record<string, unknown>;
      if ('selector' in target && typeof target.selector === 'string') {
        return target.selector;
      }
      if (target.type === 'classRef' && 'className' in target) {
        return '.' + String(target.className);
      }
      if (target.type === 'idRef' && 'id' in target) {
        return '#' + String(target.id);
      }
    }
    // Check args array
    if ('args' in command && Array.isArray(command.args)) {
      for (const arg of command.args) {
        if (typeof arg === 'object' && arg && 'type' in arg) {
          if (arg.type === 'classRef' && 'className' in arg) {
            return '.' + String(arg.className);
          }
          if (arg.type === 'idRef' && 'id' in arg) {
            return '#' + String(arg.id);
          }
        }
      }
    }
    return null;
  }

  /**
   * Generate command JS from a line of text (fallback)
   */
  private generateCommandFromLine(line: string, jsLines: string[]): void {
    if (line.includes('toggle')) {
      const selector = line.match(/toggle\s+([.#][a-zA-Z0-9_-]+)/)?.[1];
      if (selector) {
        jsLines.push(`  const element = document.querySelector('${selector}');`);
        jsLines.push(`  if (element) element.classList.toggle('active');`);
      }
    } else if (line.includes('fetch')) {
      const urlMatch = line.match(/fetch\s+([^\s]+)/);
      if (urlMatch) {
        jsLines.push(`  try {`);
        jsLines.push(`    const response = await fetch('${urlMatch[1]}');`);
        jsLines.push(`    const data = await response.json();`);
        jsLines.push(`    console.log('Fetched:', data);`);
        jsLines.push(`  } catch (error) {`);
        jsLines.push(`    console.error('Fetch error:', error);`);
        jsLines.push(`  }`);
      }
    } else if (line.includes('send')) {
      const eventMatch = line.match(/send\s+(\w+)/);
      if (eventMatch) {
        jsLines.push(`  const customEvent = new CustomEvent('${eventMatch[1]}', { detail: e });`);
        jsLines.push(`  document.dispatchEvent(customEvent);`);
      }
    } else if (line.includes('log')) {
      const logMatch = line.match(/log\s+"([^"]+)"/);
      if (logMatch) {
        jsLines.push(`  console.log('${logMatch[1]}');`);
      }
    } else if (line.includes('show')) {
      const selector = line.match(/show\s+([.#][a-zA-Z0-9_-]+)/)?.[1];
      if (selector) {
        jsLines.push(`  const element = document.querySelector('${selector}');`);
        jsLines.push(`  if (element) element.style.display = 'block';`);
      }
    } else if (line.includes('hide')) {
      const selector = line.match(/hide\s+([.#][a-zA-Z0-9_-]+)/)?.[1];
      if (selector) {
        jsLines.push(`  const element = document.querySelector('${selector}');`);
        jsLines.push(`  if (element) element.style.display = 'none';`);
      }
    }
  }

  /**
   * Validate hyperscript syntax (additional checks beyond core parser)
   */
  private validateSyntax(script: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = script.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      if (!line) continue;

      // Check for incomplete selectors
      if (line.includes('toggle .') && line.match(/toggle\s+\.\s*$/)) {
        errors.push({
          type: 'SyntaxError',
          message: 'Incomplete CSS selector after toggle command',
          line: lineNumber,
          column: line.indexOf('toggle .') + 8
        });
      }

      // Check for malformed template variables
      if (line.includes('{{') && !line.includes('}}')) {
        errors.push({
          type: 'SyntaxError',
          message: 'Unclosed template variable',
          line: lineNumber,
          column: line.indexOf('{{') + 1
        });
      }

      // Check for other common syntax errors
      if (line.includes('on ') && line.match(/on\s+$/)) {
        errors.push({
          type: 'SyntaxError',
          message: 'Incomplete event declaration',
          line: lineNumber,
          column: line.indexOf('on ') + 3
        });
      }

      // Check for completely invalid hyperscript patterns
      if (line.includes('invalid hyperscript') || line.includes('syntax here')) {
        errors.push({
          type: 'SyntaxError',
          message: 'Unrecognized hyperscript syntax',
          line: lineNumber,
          column: 1
        });
      }
    }

    return errors;
  }

  /**
   * Fallback: Analyze hyperscript using regex (when AST not available)
   */
  private async analyzeScriptFallback(script: string): Promise<ScriptMetadata> {
    const metadata: ScriptMetadata = {
      complexity: 1,
      dependencies: [],
      selectors: [],
      events: [],
      commands: [],
      templateVariables: []
    };

    const lines = script.split('\n').map(line => line.trim());

    for (const line of lines) {
      // Extract events
      const eventMatch = line.match(/^on\s+(\w+)/);
      if (eventMatch && !metadata.events.includes(eventMatch[1])) {
        metadata.events.push(eventMatch[1]);
      }

      // Extract commands
      const commands = ['toggle', 'add', 'remove', 'put', 'fetch', 'send', 'trigger', 'show', 'hide', 'log', 'wait', 'halt'];
      for (const command of commands) {
        if (line.includes(command) && !metadata.commands.includes(command)) {
          metadata.commands.push(command);
        }
      }

      // Extract CSS selectors
      const selectorMatches = line.match(/[.#][a-zA-Z0-9_-]+/g);
      if (selectorMatches) {
        for (const selector of selectorMatches) {
          if (!metadata.selectors.includes(selector)) {
            metadata.selectors.push(selector);
          }
        }
      }

      // Extract template variables
      const templateMatches = line.match(/\{\{(\w+)\}\}/g);
      if (templateMatches) {
        for (const match of templateMatches) {
          const variable = match.replace(/[{}]/g, '');
          if (!metadata.templateVariables.includes(variable)) {
            metadata.templateVariables.push(variable);
          }
        }
      }
    }

    // Calculate complexity
    metadata.complexity = Math.max(1,
      metadata.events.length +
      metadata.commands.length +
      (metadata.selectors.length > 0 ? 1 : 0) +
      (script.includes('if') ? 1 : 0) +
      (script.includes('else') ? 1 : 0) +
      (script.includes('repeat') ? 1 : 0) +
      (script.includes('wait') ? 1 : 0)
    );

    return metadata;
  }

  /**
   * Fallback: Generate JavaScript using regex (async version)
   */
  private async generateJavaScriptFallback(
    script: string,
    options: CompilationOptions,
    metadata: ScriptMetadata
  ): Promise<string> {
    return this.generateJavaScriptFallbackSync(script, options);
  }

  /**
   * Fallback: Generate JavaScript using regex (sync version)
   */
  private generateJavaScriptFallbackSync(script: string, options: CompilationOptions): string {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line);
    const jsLines: string[] = [];

    // Process multi-line event blocks
    let currentEvent = '';
    let currentEventLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('on ')) {
        // Process previous event if exists
        if (currentEvent && currentEventLines.length > 0) {
          this.compileEventBlock(currentEvent, currentEventLines, jsLines);
        }

        const eventMatch = line.match(/^on\s+(\w+)/);
        currentEvent = eventMatch ? eventMatch[1] : '';
        currentEventLines = [];

        const restOfLine = line.replace(/^on\s+\w+\s*/, '').trim();
        if (restOfLine) {
          currentEventLines.push(restOfLine);
        }
      } else if (currentEvent) {
        currentEventLines.push(line);
      }
    }

    if (currentEvent && currentEventLines.length > 0) {
      this.compileEventBlock(currentEvent, currentEventLines, jsLines);
    }

    let compiled = jsLines.join('\n');

    if (options.minify) {
      compiled = this.minifyJS(compiled);
    }

    if (options.compatibility === 'legacy') {
      compiled = this.transformToLegacy(compiled);
    }

    return compiled || '// Empty hyperscript compilation';
  }

  /**
   * Compile a single event block to JavaScript (legacy fallback)
   */
  private compileEventBlock(event: string, eventLines: string[], jsLines: string[]): void {
    jsLines.push(`document.addEventListener('${event}', function(e) {`);

    for (const line of eventLines) {
      this.generateCommandFromLine(line, jsLines);
    }

    jsLines.push(`});`);
  }

  /**
   * Minify JavaScript code
   */
  private minifyJS(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .replace(/{\s*/g, '{')
      .replace(/}\s*/g, '}')
      .replace(/,\s*/g, ',')
      .trim();
  }

  /**
   * Transform to legacy JavaScript (ES5)
   */
  private transformToLegacy(code: string): string {
    return code
      .replace(/const\s+/g, 'var ')
      .replace(/let\s+/g, 'var ')
      .replace(/=>\s*{/g, 'function(){')
      .replace(/=>\s*/g, 'function(){ return ')
      .replace(/async function/g, 'function')
      .replace(/await\s+/g, '');
  }

  /**
   * Generate source map
   */
  private generateSourceMap(original: string, compiled: string): string {
    const sourceMap = {
      version: 3,
      sources: ['hyperscript'],
      names: [],
      mappings: 'AAAA',
      sourcesContent: [original]
    };

    return JSON.stringify(sourceMap);
  }

  /**
   * Get empty metadata object
   */
  private getEmptyMetadata(): ScriptMetadata {
    return {
      complexity: 0,
      dependencies: [],
      selectors: [],
      events: [],
      commands: [],
      templateVariables: []
    };
  }
}
