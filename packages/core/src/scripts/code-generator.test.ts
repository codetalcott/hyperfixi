/**
 * TDD Tests for LSP Code Generator
 * Write tests first, then implement functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CodeGenerator, 
  LSPCommand, 
  LSPFeature, 
  GeneratedCommand, 
  GeneratedTest 
} from './code-generator';

describe('CodeGenerator', () => {
  let generator: CodeGenerator;
  
  beforeEach(() => {
    generator = new CodeGenerator();
  });

  describe('Command Generation', () => {
    it('should parse LSP command JSON correctly', () => {
      const commandData: LSPCommand = {
        id: "test-id",
        name: "put",
        description: "The put command allows you to put content into elements",
        syntax_canonical: "put <expression> into <target>",
        example_usage: [
          "<div _=\"on click put 'Hello' into #target\">Click</div>"
        ],
        elementType: "Command"
      };

      const parsed = generator.parseCommand(commandData);
      
      expect(parsed.name).toBe('put');
      expect(parsed.syntax).toBe('put <expression> into <target>');
      expect(parsed.description).toBe('The put command allows you to put content into elements');
      expect(parsed.examples).toHaveLength(1);
    });

    it('should generate TypeScript command interface', () => {
      const commandData: LSPCommand = {
        id: "test-id",
        name: "put",
        description: "Put content into elements",
        syntax_canonical: "put <expression> into <target>",
        example_usage: [],
        elementType: "Command"
      };

      const generated = generator.generateCommandInterface(commandData);
      
      expect(generated.code).toContain('export class PutCommand implements CommandImplementation');
      expect(generated.code).toContain('name = \'put\'');
      expect(generated.code).toContain('syntax = \'put <expression> into <target>\'');
      expect(generated.code).toContain('async execute(context: ExecutionContext, ...args: any[])');
    });

    it('should generate test file from examples', () => {
      const commandData: LSPCommand = {
        id: "test-id",
        name: "put",
        description: "Put content",
        syntax_canonical: "put <expression> into <target>",
        example_usage: [
          "<div _=\"on click put 'Hello' into #target\">Click</div>",
          "<button _=\"on click put my.value into #output\">Submit</button>"
        ],
        elementType: "Command"
      };

      const generated = generator.generateCommandTest(commandData);
      
      expect(generated.code).toContain('describe(\'Put Command\'');
      expect(generated.code).toContain('it(\'should handle example 1');
      expect(generated.code).toContain('expect(');
      expect(generated.testCases).toHaveLength(2);
    });
  });

  describe('Feature Generation', () => {
    it('should parse LSP feature JSON correctly', () => {
      const featureData: LSPFeature = {
        id: "test-id",
        name: "def",
        description: "Function definitions",
        syntax_canonical: "def <name>(<params>) <body> end",
        example_usage: [
          "def greet(name) log 'Hello ' + name end"
        ],
        elementType: "Feature"
      };

      const parsed = generator.parseFeature(featureData);
      
      expect(parsed.name).toBe('def');
      expect(parsed.syntax).toBe('def <name>(<params>) <body> end');
    });
  });

  describe('File Generation', () => {
    it('should generate correct file paths', () => {
      const paths = generator.generateFilePaths('put', 'command');
      
      expect(paths.implementation).toBe('src/commands/dom/put.ts');
      expect(paths.test).toBe('src/commands/dom/put.test.ts');
    });

    it('should categorize commands correctly', () => {
      expect(generator.categorizeCommand('put')).toBe('dom');
      expect(generator.categorizeCommand('if')).toBe('control-flow');
      expect(generator.categorizeCommand('set')).toBe('data');
      expect(generator.categorizeCommand('fetch')).toBe('async');
    });
  });
});