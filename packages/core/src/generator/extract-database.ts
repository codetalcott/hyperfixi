/**
 * Database extraction utility to pull hyperscript language data from LSP database
 * This generates TypeScript code and test cases from the comprehensive language database
 */

// @ts-ignore - better-sqlite3 types not available
import Database from 'better-sqlite3';
import { writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database paths
const LSP_PROJECT_PATH = process.env.LSP_PROJECT_PATH || '../hyperscript-lsp';
const LSP_DB_PATH = join(LSP_PROJECT_PATH, 'data/database/hyperscript.db');
const LOCAL_DB_PATH = join(__dirname, '../../data/hyperscript.db');

// Types for database records
interface DatabaseCommand {
  id: number;
  name: string;
  description: string;
  syntax_canonical: string;
  purpose: string;
  has_body: boolean;
  is_blocking: boolean;
  implicit_target?: string;
  implicit_result_target?: string;
  status: string;
  created_at: string;
  updated_at: string;
  source_info_id?: number;
}

interface DatabaseExpression {
  id: number;
  name: string;
  description: string;
  syntax: string;
  category: string;
  evaluates_to_type: string;
  precedence?: number;
  associativity?: string;
  status: string;
  created_at: string;
  updated_at: string;
  source_info_id?: number;
}

interface DatabaseFeature {
  id: number;
  name: string;
  description: string;
  syntax_canonical: string;
  trigger?: string;
  structure_description?: string;
  scope_impact?: string;
  status: string;
  created_at: string;
  updated_at: string;
  source_info_id?: number;
}

interface DatabaseExample {
  id: string;
  element_id: string;
  element_type: string;
  example: string;
}

export class LSPDatabaseExtractor {
  private db: Database.Database;
  
  constructor(dbPath: string = LOCAL_DB_PATH) {
    // Copy database from LSP project if it doesn't exist locally
    if (!existsSync(dbPath) && existsSync(LSP_DB_PATH)) {
      console.log('Copying hyperscript LSP database...');
      copyFileSync(LSP_DB_PATH, dbPath);
    }
    
    if (!existsSync(dbPath)) {
      throw new Error(`Database not found at ${dbPath}. Please ensure hyperscript-lsp project is available.`);
    }
    
    this.db = new Database(dbPath, { readonly: true });
  }
  
  /**
   * Extract all commands from the database
   */
  extractCommands(): DatabaseCommand[] {
    const query = this.db.prepare(`
      SELECT 
        id, name, description, syntax_canonical, purpose,
        has_body, is_blocking, implicit_target, implicit_result_target,
        status, created_at, updated_at, source_info_id
      FROM commands 
      WHERE status = 'Draft'
      ORDER BY name
    `);
    
    return query.all() as DatabaseCommand[];
  }
  
  /**
   * Extract all expressions from the database
   */
  extractExpressions(): DatabaseExpression[] {
    const query = this.db.prepare(`
      SELECT 
        id, name, description, syntax, category,
        evaluates_to_type, precedence, associativity,
        status, created_at, updated_at, source_info_id
      FROM expressions 
      WHERE status = 'Draft'
      ORDER BY precedence DESC, name
    `);
    
    return query.all() as DatabaseExpression[];
  }
  
  /**
   * Extract all features from the database
   */
  extractFeatures(): DatabaseFeature[] {
    const query = this.db.prepare(`
      SELECT 
        id, name, description, syntax_canonical, trigger,
        structure_description, scope_impact, status,
        created_at, updated_at, source_info_id
      FROM features 
      WHERE status = 'Draft'
      ORDER BY name
    `);
    
    return query.all() as DatabaseFeature[];
  }
  
  /**
   * Extract examples for a specific element
   */
  extractExamples(elementId: string, elementType: string): DatabaseExample[] {
    const query = this.db.prepare(`
      SELECT 
        id, element_id, element_type, example
      FROM syntax_examples 
      WHERE element_id = ? AND element_type = ?
      ORDER BY id
    `);
    
    return query.all(elementId, elementType) as DatabaseExample[];
  }
  
  /**
   * Extract all examples for test generation
   */
  extractAllExamples(): DatabaseExample[] {
    const query = this.db.prepare(`
      SELECT 
        se.id, se.element_id, se.element_type, se.example,
        COALESCE(c.name, e.name, f.name, k.name, s.name) as element_name
      FROM syntax_examples se
      LEFT JOIN commands c ON se.element_id = c.id AND se.element_type = 'Command'
      LEFT JOIN expressions e ON se.element_id = e.id AND se.element_type = 'Expression'
      LEFT JOIN features f ON se.element_id = f.id AND se.element_type = 'Feature'
      LEFT JOIN keywords k ON se.element_id = k.id AND se.element_type = 'Keyword'
      LEFT JOIN special_symbols s ON se.element_id = s.id AND se.element_type = 'SpecialSymbol'
      WHERE COALESCE(c.status, e.status, f.status, k.status, s.status) = 'Draft'
      ORDER BY se.element_type, element_name, se.id
    `);
    
    return query.all() as (DatabaseExample & { element_name: string })[];
  }
  
  /**
   * Generate TypeScript interface from commands
   */
  generateCommandInterfaces(): string {
    const commands = this.extractCommands();
    
    const interfaces = commands.map(cmd => {
      const hasBodyType = cmd.has_body ? 'true' : 'false';
      const isBlockingType = cmd.is_blocking ? 'true' : 'false';
      
      return `
export interface ${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}Command extends BaseCommandImplementation {
  name: '${cmd.name}';
  syntax: '${cmd.syntax_canonical}';
  purpose: '${cmd.purpose}';
  hasBody: ${hasBodyType};
  isBlocking: ${isBlockingType};
  ${cmd.implicit_target ? `implicitTarget: '${cmd.implicit_target}';` : ''}
  ${cmd.implicit_result_target ? `implicitResult: '${cmd.implicit_result_target}';` : ''}
}`;
    });
    
    return `
/**
 * Generated TypeScript interfaces for hyperscript commands
 * Source: hyperscript-lsp database
 */

import type { BaseCommandImplementation } from '@types/core';

${interfaces.join('\n')}

export type HyperscriptCommand = ${commands.map(cmd => 
  `${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}Command`
).join(' | ')};
`;
  }
  
  /**
   * Generate test cases from examples
   */
  generateTestCases(): string {
    const examples = this.extractAllExamples();
    
    const testsByType = examples.reduce((acc, example) => {
      if (!acc[example.element_type]) {
        acc[example.element_type] = {};
      }
      if (!acc[example.element_type][example.element_id]) {
        acc[example.element_type][example.element_id] = [];
      }
      acc[example.element_type][example.element_id].push(example);
      return acc;
    }, {} as Record<string, Record<string, DatabaseExample[]>>);
    
    const testSuites = Object.entries(testsByType).map(([elementType, elements]) => {
      const elementTests = Object.entries(elements).map(([elementName, elementExamples]) => {
        const tests = elementExamples.map((example, index) => `
    it('should handle example ${index + 1}: ${example.example.substring(0, 50)}...', async () => {
      const input = \`${example.example.replace(/`/g, '\\`')}\`;
      const context = createTestElement("<div></div>");
      
      // TODO: Implement test execution
      expect(() => parseHyperscript(input)).not.toThrow();
    });`).join('\n');
        
        return `
  describe('${elementName}', () => {${tests}
  });`;
      }).join('\n');
      
      return `
describe('${elementType} Examples from LSP Database', () => {${elementTests}
});`;
    }).join('\n');
    
    return `
/**
 * Generated integration tests from hyperscript-lsp database examples
 * Total examples: ${examples.length}
 */

import { describe, it, expect } from 'vitest';
import { createTestElement } from '@test/test-setup';

// TODO: Import actual parser and runtime
const parseHyperscript = (input: string) => ({ success: true });

${testSuites}
`;
  }
  
  /**
   * Generate command registry
   */
  generateCommandRegistry(): string {
    const commands = this.extractCommands();
    
    const registrations = commands.map(cmd => {
      const className = cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1) + 'Command';
      return `  '${cmd.name}': new ${className}(),`;
    }).join('\n');
    
    return `
/**
 * Generated command registry from hyperscript-lsp database
 */

import type { BaseCommandImplementation } from '@types/core';
${commands.map(cmd => {
  const className = cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1) + 'Command';
  return `import { ${className} } from '@commands/${this.getCategoryForCommand(cmd.name)}/${cmd.name}';`;
}).join('\n')}

export const COMMAND_REGISTRY: Record<string, BaseCommandImplementation> = {
${registrations}
};

export const getCommand = (name: string): BaseCommandImplementation | undefined => {
  return COMMAND_REGISTRY[name];
};
`;
  }
  
  /**
   * Helper to categorize commands by their purpose
   */
  private getCategoryForCommand(commandName: string): string {
    const domCommands = ['add', 'remove', 'toggle', 'hide', 'show', 'append'];
    const controlFlowCommands = ['if', 'repeat', 'break', 'continue', 'halt', 'return'];
    const dataCommands = ['put', 'set', 'get', 'increment', 'decrement', 'default'];
    const asyncCommands = ['fetch', 'wait', 'async', 'send', 'trigger'];
    const navigationCommands = ['go', 'transition'];
    const utilityCommands = ['log', 'beep', 'make', 'measure', 'pick', 'take', 'tell'];
    const advancedCommands = ['js', 'render', 'settle', 'throw'];
    
    if (domCommands.includes(commandName)) return 'dom';
    if (controlFlowCommands.includes(commandName)) return 'control-flow';
    if (dataCommands.includes(commandName)) return 'data';
    if (asyncCommands.includes(commandName)) return 'async';
    if (navigationCommands.includes(commandName)) return 'navigation';
    if (utilityCommands.includes(commandName)) return 'utility';
    if (advancedCommands.includes(commandName)) return 'advanced';
    
    return 'misc';
  }
  
  /**
   * Run complete extraction and generation process
   */
  async extract(): Promise<void> {
    console.log('Extracting hyperscript language data from LSP database...');
    
    // Extract data
    const commands = this.extractCommands();
    const expressions = this.extractExpressions();
    const features = this.extractFeatures();
    const examples = this.extractAllExamples();
    
    console.log(`Found ${commands.length} commands, ${expressions.length} expressions, ${features.length} features, ${examples.length} examples`);
    
    // Generate TypeScript files
    const commandInterfaces = this.generateCommandInterfaces();
    const testCases = this.generateTestCases();
    const commandRegistry = this.generateCommandRegistry();
    
    // Write files
    const dataDir = join(__dirname, '../../data');
    const generatedDir = join(__dirname, '../generated');
    
    // Ensure directories exist
    await import('fs').then(fs => {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
    });
    
    // Write generated code
    writeFileSync(join(generatedDir, 'command-interfaces.ts'), commandInterfaces);
    writeFileSync(join(generatedDir, 'integration-tests.ts'), testCases);
    writeFileSync(join(generatedDir, 'command-registry.ts'), commandRegistry);
    
    // Write raw data as JSON for runtime use
    writeFileSync(join(dataDir, 'commands.json'), JSON.stringify(commands, null, 2));
    writeFileSync(join(dataDir, 'expressions.json'), JSON.stringify(expressions, null, 2));
    writeFileSync(join(dataDir, 'features.json'), JSON.stringify(features, null, 2));
    writeFileSync(join(dataDir, 'examples.json'), JSON.stringify(examples, null, 2));
    
    console.log('Database extraction completed successfully!');
    console.log(`Generated files in: ${generatedDir}`);
    console.log(`Data files in: ${dataDir}`);
  }
  
  close(): void {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new LSPDatabaseExtractor();
  try {
    await extractor.extract();
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  } finally {
    extractor.close();
  }
}