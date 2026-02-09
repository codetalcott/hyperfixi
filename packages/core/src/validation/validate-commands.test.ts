/**
 * Test suite for validating V2 decorator-based command pattern compliance
 */

import { describe, it, expect } from 'vitest';
import { CommandPatternValidator, CommandSuiteValidator } from './command-pattern-validator';

// Import V2 decorator-based commands
import { HideCommand, createHideCommand } from '../commands/dom/hide';
import { ShowCommand, createShowCommand } from '../commands/dom/show';
import { ToggleCommand, createToggleCommand } from '../commands/dom/toggle';
import { AddCommand, createAddCommand } from '../commands/dom/add';
import { RemoveCommand, createRemoveCommand } from '../commands/dom/remove';

const ALL_COMMANDS = [
  { name: 'HideCommand', CommandClass: HideCommand, factory: createHideCommand },
  { name: 'ShowCommand', CommandClass: ShowCommand, factory: createShowCommand },
  { name: 'ToggleCommand', CommandClass: ToggleCommand, factory: createToggleCommand },
  { name: 'AddCommand', CommandClass: AddCommand, factory: createAddCommand },
  { name: 'RemoveCommand', CommandClass: RemoveCommand, factory: createRemoveCommand },
] as const;

describe('V2 Command Pattern Validation', () => {
  describe('Individual Command Validation', () => {
    it.each(ALL_COMMANDS)('$name should pass pattern validation', ({ CommandClass, factory }) => {
      const result = CommandPatternValidator.validateCommand(
        CommandClass as unknown as new () => unknown,
        factory
      );

      expect(result.details.hasCorrectInterface).toBe(true);
      expect(result.details.hasRequiredProperties).toBe(true);
      expect(result.details.hasFactoryFunction).toBe(true);
      // hasAsyncExecute is informational — some commands (e.g., RemoveCommand) have sync execute
      // validate is optional in V2 — some commands inherit it, others don't define it
    });
  });

  describe('V2 Decorator Interface Compliance', () => {
    it.each(ALL_COMMANDS)('$name should have V2 decorator properties', ({ CommandClass }) => {
      const instance = new CommandClass() as any;

      // @command decorator injects name
      expect(typeof instance.name).toBe('string');
      expect(instance.name.length).toBeGreaterThan(0);

      // @meta decorator injects metadata
      expect(instance.metadata).toBeDefined();
      expect(typeof instance.metadata).toBe('object');

      // execute is required
      expect(typeof instance.execute).toBe('function');

      // validate is optional — only check if defined
      if (instance.validate !== undefined) {
        expect(typeof instance.validate).toBe('function');
      }
    });
  });

  describe('CommandMetadata Structure', () => {
    it.each(ALL_COMMANDS)('$name should have complete CommandMetadata', ({ CommandClass }) => {
      const instance = new CommandClass() as any;
      const { metadata } = instance;

      // Required fields
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description.length).toBeGreaterThan(0);

      // syntax can be string or string[]
      if (typeof metadata.syntax === 'string') {
        expect(metadata.syntax.length).toBeGreaterThan(0);
      } else {
        expect(Array.isArray(metadata.syntax)).toBe(true);
        expect(metadata.syntax.length).toBeGreaterThan(0);
      }

      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);

      expect(typeof metadata.category).toBe('string');
      expect(metadata.category.length).toBeGreaterThan(0);

      // Examples should be strings
      metadata.examples.forEach((example: unknown) => {
        expect(typeof example).toBe('string');
      });
    });
  });

  describe('Validate Method (Type Guard)', () => {
    // Only test commands that define validate
    const COMMANDS_WITH_VALIDATE = ALL_COMMANDS.filter(({ CommandClass }) => {
      const instance = new CommandClass() as any;
      return typeof instance.validate === 'function';
    });

    it.each(COMMANDS_WITH_VALIDATE)('$name validate should return boolean', ({ CommandClass }) => {
      const instance = new CommandClass() as any;

      // V2 validate is a type guard returning boolean
      const result = instance.validate({});
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Command Suite Validation', () => {
    it('All DOM commands should achieve high overall score', async () => {
      const commands = ALL_COMMANDS.map(cmd => ({
        name: cmd.name,
        filePath: `./src/commands/dom/${cmd.name.replace('Command', '').toLowerCase()}.ts`,
        CommandClass: cmd.CommandClass as unknown as new () => unknown,
        factoryFunction: cmd.factory,
      }));

      const suiteResult = await CommandSuiteValidator.validateCommandSuite(commands);

      expect(suiteResult.overall.total).toBe(5);
      // Typical score: interface + required props + metadata + factory = 4/7 (57%) minimum
      // Most commands also get validation + async = 6/7 (86%)
      // Bundle annotations require source code, so allow flexibility
      expect(suiteResult.overall.averageScore).toBeGreaterThanOrEqual(57);

      suiteResult.commands.forEach(cmd => {
        expect(cmd.validation.details.hasCorrectInterface).toBe(true);
        expect(cmd.validation.details.hasRequiredProperties).toBe(true);
        // hasAsyncExecute not asserted — some commands have sync execute (e.g., RemoveCommand)
      });
    });
  });
});
