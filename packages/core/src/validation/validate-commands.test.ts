/**
 * Test suite for validating enhanced command pattern compliance
 */

import { describe, it, expect } from 'vitest';
import {
  CommandPatternValidator,
  CommandSuiteValidator,
  ValidationReporter,
} from './command-pattern-validator.ts';

// Import enhanced commands
import { HideCommand, createHideCommand } from '../commands/dom/hide.ts';
import { ShowCommand, createShowCommand } from '../commands/dom/show.ts';
import { ToggleCommand, createToggleCommand } from '../commands/dom/toggle.ts';
import { AddCommand, createAddCommand } from '../commands/dom/add.ts';
import { RemoveCommand, createRemoveCommand } from '../commands/dom/remove.ts';

describe('Enhanced Command Pattern Validation', () => {
  describe('Individual Command Validation', () => {
    it('HideCommand should pass enhanced pattern validation', () => {
      const result = CommandPatternValidator.validateCommand(HideCommand, createHideCommand);

      expect(result.isEnhanced).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasCorrectInterface).toBe(true);
      expect(result.details.hasRequiredProperties).toBe(true);
      expect(result.details.hasProperMetadata).toBe(true);
      expect(result.details.hasLLMDocumentation).toBe(true);
      expect(result.details.hasValidation).toBe(true);
      expect(result.details.hasFactoryFunction).toBe(true);
    });

    it('ShowCommand should pass enhanced pattern validation', () => {
      const result = CommandPatternValidator.validateCommand(ShowCommand, createShowCommand);

      expect(result.isEnhanced).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasCorrectInterface).toBe(true);
      expect(result.details.hasProperMetadata).toBe(true);
      expect(result.details.hasLLMDocumentation).toBe(true);
    });

    it('ToggleCommand should pass enhanced pattern validation', () => {
      const result = CommandPatternValidator.validateCommand(ToggleCommand, createToggleCommand);

      expect(result.isEnhanced).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasValidation).toBe(true);
    });

    it('AddCommand should pass enhanced pattern validation', () => {
      const result = CommandPatternValidator.validateCommand(AddCommand, createAddCommand);

      expect(result.isEnhanced).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasCorrectInterface).toBe(true);
    });

    it('RemoveCommand should pass enhanced pattern validation', () => {
      const result = CommandPatternValidator.validateCommand(RemoveCommand, createRemoveCommand);

      expect(result.isEnhanced).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasCorrectInterface).toBe(true);
    });
  });

  describe('Command Suite Validation', () => {
    it('All DOM commands should achieve high overall score', async () => {
      const commands = [
        {
          name: 'HideCommand',
          filePath: './src/commands/dom/hide.ts',
          CommandClass: HideCommand,
          factoryFunction: createHideCommand,
        },
        {
          name: 'ShowCommand',
          filePath: './src/commands/dom/show.ts',
          CommandClass: ShowCommand,
          factoryFunction: createShowCommand,
        },
        {
          name: 'ToggleCommand',
          filePath: './src/commands/dom/toggle.ts',
          CommandClass: ToggleCommand,
          factoryFunction: createToggleCommand,
        },
        {
          name: 'AddCommand',
          filePath: './src/commands/dom/add.ts',
          CommandClass: AddCommand,
          factoryFunction: createAddCommand,
        },
        {
          name: 'RemoveCommand',
          filePath: './src/commands/dom/remove.ts',
          CommandClass: RemoveCommand,
          factoryFunction: createRemoveCommand,
        },
      ];

      const suiteResult = await CommandSuiteValidator.validateCommandSuite(commands);

      // All commands should be enhanced
      expect(suiteResult.overall.enhanced).toBe(5);
      expect(suiteResult.overall.total).toBe(5);
      expect(suiteResult.overall.averageScore).toBeGreaterThanOrEqual(80);
      expect(suiteResult.overall.needsWork).toBe(0);

      // Print detailed results
      console.log('\n📊 DOM Commands Validation Results:');
      ValidationReporter.printSuiteValidation(suiteResult);

      // Each command should have high individual scores
      suiteResult.commands.forEach(cmd => {
        expect(cmd.validation.score).toBeGreaterThanOrEqual(80);
        expect(cmd.validation.isEnhanced).toBe(true);
      });
    });
  });

  describe('Pattern Compliance Details', () => {
    it('Commands should have proper TypeScript interface compliance', () => {
      const commands = [HideCommand, ShowCommand, ToggleCommand, AddCommand, RemoveCommand];

      commands.forEach(CommandClass => {
        const instance = new CommandClass();

        // Check interface compliance
        expect(typeof instance.name).toBe('string');
        expect(typeof instance.syntax).toBe('string');
        expect(typeof instance.description).toBe('string');
        expect(typeof instance.outputType).toBe('string');
        expect(instance.inputSchema).toBeDefined();
        expect(typeof instance.execute).toBe('function');
        expect(typeof instance.validate).toBe('function');
        expect(instance.metadata).toBeDefined();
        expect(instance.documentation).toBeDefined();
      });
    });

    it('Commands should have comprehensive metadata', () => {
      const commands = [HideCommand, ShowCommand, ToggleCommand, AddCommand, RemoveCommand];

      commands.forEach(CommandClass => {
        const instance = new CommandClass();
        const { metadata } = instance;

        expect(typeof metadata.category).toBe('string');
        expect(['simple', 'medium', 'complex']).toContain(metadata.complexity);
        expect(Array.isArray(metadata.sideEffects)).toBe(true);
        expect(Array.isArray(metadata.examples)).toBe(true);
        expect(Array.isArray(metadata.relatedCommands)).toBe(true);

        // Check examples structure
        metadata.examples.forEach((example: any) => {
          expect(typeof example.code).toBe('string');
          expect(typeof example.description).toBe('string');
          expect(example.expectedOutput).toBeDefined();
        });
      });
    });

    it('Commands should have LLM-friendly documentation', () => {
      const commands = [HideCommand, ShowCommand, ToggleCommand, AddCommand, RemoveCommand];

      commands.forEach(CommandClass => {
        const instance = new CommandClass();
        const { documentation } = instance;

        expect(typeof documentation.summary).toBe('string');
        expect(Array.isArray(documentation.parameters)).toBe(true);
        expect(typeof documentation.returns).toBe('object');
        expect(Array.isArray(documentation.examples)).toBe(true);
        expect(Array.isArray(documentation.seeAlso)).toBe(true);
        expect(Array.isArray(documentation.tags)).toBe(true);

        // Check parameter structure
        documentation.parameters.forEach((param: any) => {
          expect(typeof param.name).toBe('string');
          expect(typeof param.type).toBe('string');
          expect(typeof param.description).toBe('string');
          expect(typeof param.optional).toBe('boolean');
          expect(Array.isArray(param.examples)).toBe(true);
        });
      });
    });

    it('Commands should have proper validation methods', () => {
      const commands = [HideCommand, ShowCommand, ToggleCommand, AddCommand, RemoveCommand];

      commands.forEach(CommandClass => {
        const instance = new CommandClass();

        // Test validation method
        const validResult = instance.validate([]);
        expect(typeof validResult).toBe('object');
        expect(typeof validResult.isValid).toBe('boolean');
        expect(Array.isArray(validResult.errors)).toBe(true);
        expect(Array.isArray(validResult.suggestions)).toBe(true);
      });
    });
  });

  describe('Individual Command Analysis', () => {
    it('Should provide detailed analysis for each command', () => {
      const commands = [
        { name: 'HideCommand', CommandClass: HideCommand, factory: createHideCommand },
        { name: 'ShowCommand', CommandClass: ShowCommand, factory: createShowCommand },
        { name: 'ToggleCommand', CommandClass: ToggleCommand, factory: createToggleCommand },
        { name: 'AddCommand', CommandClass: AddCommand, factory: createAddCommand },
        { name: 'RemoveCommand', CommandClass: RemoveCommand, factory: createRemoveCommand },
      ];

      commands.forEach(({ name, CommandClass, factory }) => {
        const result = CommandPatternValidator.validateCommand(CommandClass, factory);

        console.log(`\n🔍 ${name} Analysis:`);
        console.log(`📊 Score: ${result.score}/100`);
        console.log(`✅ Enhanced: ${result.isEnhanced}`);
        console.log(`📋 Passed: ${result.passed.length} checks`);
        console.log(`❌ Failed: ${result.failed.length} checks`);

        if (result.failed.length > 0) {
          console.log('❌ Issues:', result.failed);
          console.log('💡 Suggestions:', result.suggestions);
        }

        // All our enhanced commands should pass
        expect(result.isEnhanced).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(85); // High bar for our enhanced commands
      });
    });
  });
});
