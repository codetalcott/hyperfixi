/**
 * Tests for exit command
 * Exit early from event handlers and behaviors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExitCommand } from './exit';
import type { TypedExecutionContext } from '../../types/command-types';

describe('Exit Command', () => {
  let command: ExitCommand;

  beforeEach(() => {
    command = new ExitCommand();
  });

  describe('Command Metadata', () => {
    it('should have correct metadata', () => {
      expect(command.metadata.name).toBe('exit');
      expect(command.metadata.description).toContain('terminates execution');
      expect(command.metadata.category).toBe('flow');
    });

    it('should have examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toBe('exit');
    });
  });

  describe('Validation', () => {
    it('should validate with no input', () => {
      const result = command.validation.validate(undefined);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate with empty object input', () => {
      const result = command.validation.validate({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Execution', () => {
    it('should throw an exit error when executed', async () => {
      const context = {} as TypedExecutionContext;

      await expect(
        command.execute({}, context)
      ).rejects.toThrow('EXIT_COMMAND');
    });

    it('should throw error with isExit flag', async () => {
      const context = {} as TypedExecutionContext;

      try {
        await command.execute({}, context);
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.isExit).toBe(true);
        expect(error.returnValue).toBe(undefined);
      }
    });

    it('should have returnValue as undefined', async () => {
      const context = {} as TypedExecutionContext;

      try {
        await command.execute({}, context);
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.returnValue).toBe(undefined);
      }
    });
  });

  describe('Integration Patterns', () => {
    it('should exit from event handler pattern', async () => {
      const context = {} as TypedExecutionContext;
      let afterExit = false;

      try {
        // Simulate: on click if disabled exit end
        const disabled = true;
        if (disabled) {
          await command.execute({}, context);
        }
        afterExit = true;
      } catch (error: any) {
        if (error.isExit) {
          // Exit caught - handler stops
          expect(afterExit).toBe(false);
        }
      }
    });

    it('should work in conditional context', async () => {
      const context = {} as TypedExecutionContext;

      try {
        // Simulate: if no draggedItem exit end
        const draggedItem = null;
        if (!draggedItem) {
          await command.execute({}, context);
        }
        throw new Error('Should not reach this');
      } catch (error: any) {
        expect(error.isExit).toBe(true);
      }
    });
  });
});
