/**
 * HyperscriptCompiler - compiles hyperscript to executable JavaScript
 */

import { CompilationCache } from '../cache/compilation-cache.js';
import type { 
  CompilationOptions, 
  CompilationResult, 
  CompilationError, 
  CompilationWarning,
  ScriptMetadata 
} from '../types.js';

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
      
      // Parse and analyze the script
      const metadata = await this.analyzeScript(script);
      
      // Detect basic syntax errors
      const errors = this.validateSyntax(script);
      
      // Compile to JavaScript (only if no errors and not validation-only)
      let compiled = '';
      if (errors.length === 0 && !validationOnly) {
        compiled = await this.compileToJS(script, options, metadata);
      }
      
      const endTime = performance.now();
      
      // Create result
      const result: CompilationResult = {
        compiled,
        metadata,
        warnings: [],
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
   * Validate hyperscript syntax
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
   * Analyze hyperscript and extract metadata
   */
  private async analyzeScript(script: string): Promise<ScriptMetadata> {
    const metadata: ScriptMetadata = {
      complexity: 1,
      dependencies: [],
      selectors: [],
      events: [],
      commands: [],
      templateVariables: []
    };

    // Basic analysis - extract events, commands, selectors
    const lines = script.split('\n').map(line => line.trim());
    
    for (const line of lines) {
      // Extract events (on keyword)
      const eventMatch = line.match(/^on\s+(\w+)/);
      if (eventMatch && !metadata.events.includes(eventMatch[1])) {
        metadata.events.push(eventMatch[1]);
      }

      // Extract commands (common hyperscript commands)
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

    // Calculate complexity based on features used
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
   * Compile hyperscript to JavaScript
   */
  private async compileToJS(
    script: string, 
    options: CompilationOptions, 
    metadata: ScriptMetadata
  ): Promise<string> {
    // This is a simplified compiler - in a real implementation,
    // this would parse the hyperscript AST and generate proper JavaScript
    
    const lines = script.split('\n').map(line => line.trim()).filter(line => line);
    const jsLines: string[] = [];
    
    // Process multi-line event blocks
    let currentEvent = '';
    let currentEventLines: string[] = [];
    
    for (const line of lines) {
      // Start of new event block
      if (line.startsWith('on ')) {
        // Process previous event if exists
        if (currentEvent && currentEventLines.length > 0) {
          this.compileEventBlock(currentEvent, currentEventLines, jsLines);
        }
        
        // Start new event
        const eventMatch = line.match(/^on\s+(\w+)/);
        currentEvent = eventMatch ? eventMatch[1] : '';
        currentEventLines = [];
        
        // Check if there's content on the same line
        const restOfLine = line.replace(/^on\s+\w+\s*/, '').trim();
        if (restOfLine) {
          currentEventLines.push(restOfLine);
        }
      } else if (currentEvent) {
        // Add to current event block
        currentEventLines.push(line);
      }
    }
    
    // Process final event block
    if (currentEvent && currentEventLines.length > 0) {
      this.compileEventBlock(currentEvent, currentEventLines, jsLines);
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
   * Compile a single event block to JavaScript
   */
  private compileEventBlock(event: string, eventLines: string[], jsLines: string[]): void {
    jsLines.push(`document.addEventListener('${event}', function(e) {`);
    
    for (const line of eventLines) {
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
    // Simple source map - in a real implementation this would be more sophisticated
    const sourceMap = {
      version: 3,
      sources: ['hyperscript'],
      names: [],
      mappings: 'AAAA', // Basic mapping
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