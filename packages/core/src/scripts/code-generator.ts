/**
 * Code Generator for converting LSP JSON data to TypeScript implementations
 * Generates command implementations, tests, and type definitions
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// LSP Data Interfaces
export interface LSPCommand {
  id: string;
  name: string;
  description: string;
  syntax_canonical: string;
  example_usage: string[];
  elementType: string;
  tags?: string[];
  status?: string;
  purpose?: string;
}

export interface LSPFeature {
  id: string;
  name: string;
  description: string;
  syntax_canonical: string;
  example_usage: string[];
  elementType: string;
  tags?: string[];
}

// Generated Code Interfaces  
export interface ParsedCommand {
  name: string;
  syntax: string;
  description: string;
  examples: string[];
  category: string;
}

export interface ParsedFeature {
  name: string;
  syntax: string;
  description: string;
  examples: string[];
}

export interface GeneratedCommand {
  code: string;
  filePath: string;
}

export interface GeneratedTest {
  code: string;
  filePath: string;
  testCases: string[];
}

export interface FilePaths {
  implementation: string;
  test: string;
}

export class CodeGenerator {
  private commandCategories: Record<string, string> = {
    // DOM Manipulation
    'put': 'dom',
    'add': 'dom', 
    'remove': 'dom',
    'toggle': 'dom',
    'hide': 'dom',
    'show': 'dom',
    'append': 'dom',
    'take': 'dom',
    'make': 'dom',
    
    // Control Flow
    'if': 'control-flow',
    'repeat': 'control-flow',
    'call': 'control-flow',
    'return': 'control-flow',
    'break': 'control-flow',
    'continue': 'control-flow',
    'halt': 'control-flow',
    
    // Data Operations
    'set': 'data',
    'get': 'data',
    'default': 'data',
    'increment': 'data',
    'decrement': 'data',
    'pick': 'data',
    
    // Async Operations
    'fetch': 'async',
    'wait': 'async',
    'send': 'async',
    'go': 'async',
    
    // Advanced
    'measure': 'advanced',
    'transition': 'advanced',
    'settle': 'advanced',
    'render': 'advanced',
    'beep': 'advanced',
    'throw': 'advanced',
    'js': 'advanced'
  };

  /**
   * Parse LSP command data into internal format
   */
  parseCommand(data: LSPCommand): ParsedCommand {
    return {
      name: data.name,
      syntax: data.syntax_canonical,
      description: data.description,
      examples: data.example_usage || [],
      category: this.categorizeCommand(data.name)
    };
  }

  /**
   * Parse LSP feature data into internal format
   */
  parseFeature(data: LSPFeature): ParsedFeature {
    return {
      name: data.name,
      syntax: data.syntax_canonical,
      description: data.description,
      examples: data.example_usage || []
    };
  }

  /**
   * Categorize command by name
   */
  categorizeCommand(commandName: string): string {
    return this.commandCategories[commandName] || 'misc';
  }

  /**
   * Generate file paths for implementation and test files
   */
  generateFilePaths(name: string, type: 'command' | 'feature'): FilePaths {
    if (type === 'command') {
      const category = this.categorizeCommand(name);
      return {
        implementation: `src/commands/${category}/${name}.ts`,
        test: `src/commands/${category}/${name}.test.ts`
      };
    } else {
      return {
        implementation: `src/features/${name}.ts`,
        test: `src/features/${name}.test.ts`
      };
    }
  }

  /**
   * Generate TypeScript command implementation
   */
  generateCommandInterface(data: LSPCommand): GeneratedCommand {
    const parsed = this.parseCommand(data);
    const className = this.capitalizeFirst(parsed.name) + 'Command';
    const paths = this.generateFilePaths(parsed.name, 'command');
    
    const code = `/**
 * ${parsed.description}
 * Generated from LSP data with manual implementation required
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class ${className} implements CommandImplementation {
  name = '${parsed.name}';
  syntax = '${parsed.syntax}';
  description = '${parsed.description}';
  isBlocking = true; // TODO: Determine from syntax analysis

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    // TODO: Implement ${parsed.name} command logic
    // Syntax: ${parsed.syntax}
    
    throw new Error('${className} not yet implemented');
  }

  validate(args: any[]): string | null {
    // TODO: Implement argument validation
    // Based on syntax: ${parsed.syntax}
    
    return null;
  }
}

export default ${className};
`;

    return {
      code,
      filePath: paths.implementation
    };
  }

  /**
   * Generate test file from LSP examples
   */
  generateCommandTest(data: LSPCommand): GeneratedTest {
    const parsed = this.parseCommand(data);
    const className = this.capitalizeFirst(parsed.name) + 'Command';
    const paths = this.generateFilePaths(parsed.name, 'command');
    
    const testCases = parsed.examples.map((example, index) => {
      return this.generateTestCase(parsed.name, example, index);
    });

    const code = `/**
 * Tests for ${parsed.name} command
 * Generated from LSP examples with manual test implementation required
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ${className} } from './${parsed.name}';
import { createContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('${this.capitalizeFirst(parsed.name)} Command', () => {
  let command: ${className};
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new ${className}();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('${parsed.name}');
      expect(command.syntax).toBe('${parsed.syntax}');
      expect(command.description).toBe('${parsed.description}');
    });
  });

  describe('Core Functionality', () => {
${testCases.join('\n\n')}
  });

  describe('Validation', () => {
    it('should validate arguments correctly', () => {
      // TODO: Implement argument validation tests
      expect(command.validate([])).toBe(null);
    });

    it('should handle invalid arguments', () => {
      // TODO: Test invalid argument scenarios
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      // TODO: Test error conditions
    });
  });
});
`;

    return {
      code,
      filePath: paths.test,
      testCases: testCases
    };
  }

  /**
   * Generate individual test case from example
   */
  private generateTestCase(commandName: string, example: string, index: number): string {
    // Extract the hyperscript from the example
    const hyperscriptMatch = example.match(/_="([^"]+)"/);
    const hyperscript = hyperscriptMatch ? hyperscriptMatch[1] : example;
    
    return `    it('should handle example ${index + 1}: ${this.escapeString(hyperscript)}', async () => {
      // TODO: Implement test for: ${this.escapeString(example)}
      // Expected behavior: ${commandName} command should execute successfully
      
      expect(true).toBe(false); // Placeholder - implement actual test
    });`;
  }

  /**
   * Load LSP JSON data
   */
  loadLSPData(): {
    commands: LSPCommand[];
    features: LSPFeature[];
  } {
    const scriptDir = dirname(new URL(import.meta.url).pathname);
    const commandsPath = join(scriptDir, '../../scripts/lsp-data', 'markdown_commands.json');
    const featuresPath = join(scriptDir, '../../scripts/lsp-data', 'markdown_features.json');
    
    const commands: LSPCommand[] = JSON.parse(readFileSync(commandsPath, 'utf-8'));
    const features: LSPFeature[] = JSON.parse(readFileSync(featuresPath, 'utf-8'));
    
    return { commands, features };
  }

  /**
   * Generate all missing commands based on current implementation
   */
  generateMissingCommands(): void {
    const { commands } = this.loadLSPData();
    const implementedCommands = [
      'hide', 'show', 'toggle', 'add', 'remove', 'fetch'
    ];
    
    const missingCommands = commands.filter(cmd => 
      !implementedCommands.includes(cmd.name)
    );

    console.log(`Generating ${missingCommands.length} missing commands...`);
    
    missingCommands.forEach(commandData => {
      const implementation = this.generateCommandInterface(commandData);
      const test = this.generateCommandTest(commandData);
      
      // Create directories if they don't exist
      mkdirSync(dirname(implementation.filePath), { recursive: true });
      mkdirSync(dirname(test.filePath), { recursive: true });
      
      // Write files
      writeFileSync(implementation.filePath, implementation.code);
      writeFileSync(test.filePath, test.code);
      
      console.log(`Generated: ${implementation.filePath}`);
      console.log(`Generated: ${test.filePath}`);
    });
  }

  // Utility methods
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new CodeGenerator();
  
  if (process.argv[2] === 'generate') {
    generator.generateMissingCommands();
  } else {
    console.log('Usage: node code-generator.js generate');
  }
}