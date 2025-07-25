/**
 * Server Context Parser - handles template variables in hyperscript
 */

import type { ParseContext, ProcessedScript, ScriptMetadata } from '../types.js';

export class ServerContextParser {
  /**
   * Parse hyperscript with server-side context
   */
  parse(input: string, context?: ParseContext): ProcessedScript {
    const processed = this.preprocessTemplate(input, context?.templateVars);
    
    return {
      original: input,
      processed,
      templateVars: context?.templateVars,
      metadata: this.extractMetadata(processed, context?.templateVars)
    };
  }

  /**
   * Preprocess template variables in hyperscript
   */
  preprocessTemplate(input: string, vars?: Record<string, any> | null): string {
    if (!input || !vars) {
      return input;
    }

    try {
      // Replace template variables using {{variable}} syntax
      return input.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = vars[key];
        return value !== undefined ? String(value) : match;
      });
    } catch (error) {
      // If replacement fails, return original input
      return input;
    }
  }

  /**
   * Extract metadata from processed script
   */
  private extractMetadata(script: string, templateVars?: Record<string, any>): ScriptMetadata {
    const events = this.extractEvents(script);
    const commands = this.extractCommands(script);
    const selectors = this.extractSelectors(script);
    const dependencies = this.extractDependencies(script);
    const templateVariables = this.extractTemplateVariables(script);

    return {
      complexity: this.calculateComplexity(script),
      dependencies,
      selectors,
      events,
      commands,
      templateVariables
    };
  }

  /**
   * Extract events from hyperscript
   */
  private extractEvents(script: string): string[] {
    const events = new Set<string>();
    
    // Match event patterns: "on eventName" or "on eventName from selector"
    const eventMatches = script.match(/\bon\s+(\w+)(?:\s+from|\s|$)/g);
    
    if (eventMatches) {
      eventMatches.forEach(match => {
        const eventMatch = match.match(/\bon\s+(\w+)/);
        if (eventMatch) {
          events.add(eventMatch[1]);
        }
      });
    }

    return Array.from(events);
  }

  /**
   * Extract commands from hyperscript
   */
  private extractCommands(script: string): string[] {
    const commands = new Set<string>();
    
    // Common hyperscript commands
    const commandPatterns = [
      /\b(add|remove|toggle)\s+/g,
      /\b(put|fetch|send|trigger)\s+/g,
      /\b(show|hide|wait|log)\s+/g,
      /\b(set|increment|decrement)\s+/g,
      /\b(if|unless|repeat|for)\s+/g,
      /\b(call|halt|return|throw)\s+/g
    ];

    commandPatterns.forEach(pattern => {
      const matches = script.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const command = match.trim().split(/\s+/)[0];
          commands.add(command);
        });
      }
    });

    return Array.from(commands);
  }

  /**
   * Extract selectors from hyperscript
   */
  private extractSelectors(script: string): string[] {
    const selectors = new Set<string>();
    
    // Match CSS selectors in various contexts
    const selectorPatterns = [
      /#[\w-]+/g,                    // ID selectors
      /\.[\w-]+/g,                   // Class selectors
      /\b[a-zA-Z][\w-]*(?:\[.*?\])?/g, // Element selectors with attributes
      /<[^>]+>/g                     // Template selectors
    ];

    selectorPatterns.forEach(pattern => {
      const matches = script.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Filter out non-selector matches
          if (this.isValidSelector(match)) {
            selectors.add(match);
          }
        });
      }
    });

    return Array.from(selectors);
  }

  /**
   * Extract dependencies from hyperscript
   */
  private extractDependencies(script: string): string[] {
    const dependencies = new Set<string>();
    
    // Look for external references like behaviors, functions, or imports
    const dependencyPatterns = [
      /\binstall\s+([\w-]+)/g,       // Behavior installations
      /\bcall\s+([\w-]+)/g,          // Function calls
      /\bsend\s+([\w-]+)/g           // Event sends
    ];

    dependencyPatterns.forEach(pattern => {
      const matches = script.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const parts = match.split(/\s+/);
          if (parts.length > 1) {
            dependencies.add(parts[1]);
          }
        });
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Extract template variables that were not replaced
   */
  private extractTemplateVariables(script: string): string[] {
    const variables = new Set<string>();
    
    const variableMatches = script.match(/\{\{(\w+)\}\}/g);
    
    if (variableMatches) {
      variableMatches.forEach(match => {
        const variable = match.slice(2, -2); // Remove {{ and }}
        variables.add(variable);
      });
    }

    return Array.from(variables);
  }

  /**
   * Calculate basic complexity score
   */
  private calculateComplexity(script: string): number {
    let complexity = 1; // Base complexity
    
    // Add complexity for control structures
    const controlStructures = [
      /\bif\b/g,
      /\bunless\b/g,
      /\brepeat\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bthen\b/g,
      /\belse\b/g
    ];

    controlStructures.forEach(pattern => {
      const matches = script.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    // Add complexity for nested structures
    const nestingLevel = this.calculateNestingLevel(script);
    complexity += nestingLevel;

    return complexity;
  }

  /**
   * Calculate nesting level of control structures
   */
  private calculateNestingLevel(script: string): number {
    let maxLevel = 0;
    let currentLevel = 0;
    
    const lines = script.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Increase level for opening structures
      if (/\b(if|unless|repeat|for|while)\b/.test(trimmed)) {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      }
      
      // Decrease level for closing structures
      if (/\bend\b/.test(trimmed)) {
        currentLevel = Math.max(0, currentLevel - 1);
      }
    }
    
    return maxLevel;
  }

  /**
   * Check if a string is a valid CSS selector
   */
  private isValidSelector(candidate: string): boolean {
    // Basic validation for CSS selectors
    if (!candidate || candidate.length === 0) {
      return false;
    }

    // Skip common keywords that aren't selectors
    const keywords = [
      'on', 'from', 'to', 'in', 'into', 'with', 'then', 'else', 'end',
      'if', 'unless', 'repeat', 'for', 'while', 'and', 'or', 'not',
      'add', 'remove', 'toggle', 'put', 'fetch', 'send', 'show', 'hide',
      'set', 'get', 'call', 'wait', 'log', 'halt', 'return', 'throw'
    ];

    if (keywords.includes(candidate.toLowerCase())) {
      return false;
    }

    // Must start with valid selector characters
    return /^[#.a-zA-Z]/.test(candidate);
  }
}