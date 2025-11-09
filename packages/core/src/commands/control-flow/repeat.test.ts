/**
 * Tests for repeat command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepeatCommand } from './repeat';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Repeat Command', () => {
  let command: RepeatCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new RepeatCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('repeat');
      expect(command.syntax).toBe(
        'repeat for <identifier> in <expression> [index <identifier>] { <command> } end'
      );
      expect(command.description).toBe(
        'The repeat command provides iteration in the hyperscript language.'
      );
    });
  });

  describe('Basic For Loop - repeat for ... in', () => {
    it('should iterate over array with explicit variable', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');
      const items = ['a', 'b', 'c'];

      await command.execute(context, 'for', 'item', 'in', items, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
      // Check that 'item' variable was set for each iteration
      expect(mockCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          locals: expect.any(Map),
        })
      );
    });

    it('should iterate over NodeList with explicit variable', async () => {
      const parent = createTestElement('<div><p>1</p><p>2</p><p>3</p></div>');
      const paragraphs = parent.querySelectorAll('p');
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'for', 'p', 'in', paragraphs, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
    });

    it('should set iterator variable in local scope', async () => {
      const items = ['first', 'second', 'third'];
      const capturedLocals: Map<string, any>[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedLocals.push(new Map(ctx.locals));
        return Promise.resolve('executed');
      });

      await command.execute(context, 'for', 'item', 'in', items, mockCommand);

      expect(capturedLocals).toHaveLength(3);
      expect(capturedLocals[0].get('item')).toBe('first');
      expect(capturedLocals[1].get('item')).toBe('second');
      expect(capturedLocals[2].get('item')).toBe('third');
    });

    it('should support index tracking', async () => {
      const items = ['a', 'b', 'c'];
      const capturedContexts: ExecutionContext[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedContexts.push({ ...ctx, locals: new Map(ctx.locals) });
        return Promise.resolve('executed');
      });

      await command.execute(context, 'for', 'item', 'in', items, 'index', 'i', mockCommand);

      expect(capturedContexts).toHaveLength(3);
      expect(capturedContexts[0].locals.get('i')).toBe(0);
      expect(capturedContexts[1].locals.get('i')).toBe(1);
      expect(capturedContexts[2].locals.get('i')).toBe(2);
    });
  });

  describe('Implicit For Loop - repeat in', () => {
    it('should iterate using "it" variable implicitly', async () => {
      const items = ['x', 'y', 'z'];
      const capturedContexts: ExecutionContext[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedContexts.push({ ...ctx });
        return Promise.resolve('executed');
      });

      await command.execute(context, 'in', items, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
      expect(capturedContexts[0].it).toBe('x');
      expect(capturedContexts[1].it).toBe('y');
      expect(capturedContexts[2].it).toBe('z');
    });

    it('should support index with implicit iteration', async () => {
      const items = ['x', 'y'];
      const capturedLocals: Map<string, any>[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedLocals.push(new Map(ctx.locals));
        return Promise.resolve('executed');
      });

      await command.execute(context, 'in', items, 'index', 'idx', mockCommand);

      expect(capturedLocals[0].get('idx')).toBe(0);
      expect(capturedLocals[1].get('idx')).toBe(1);
    });
  });

  describe('While Loops - repeat while', () => {
    it('should loop while condition is true', async () => {
      let counter = 0;
      const mockCondition = vi.fn().mockImplementation(() => {
        counter++;
        return counter <= 3;
      });
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'while', mockCondition, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
      expect(mockCondition).toHaveBeenCalledTimes(4); // Called one extra time to check false
    });

    it('should not execute if condition is initially false', async () => {
      const mockCondition = vi.fn().mockReturnValue(false);
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'while', mockCondition, mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
      expect(mockCondition).toHaveBeenCalledTimes(1);
    });

    it('should support index in while loop', async () => {
      let counter = 0;
      const mockCondition = () => ++counter <= 2;
      const capturedIndices: number[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedIndices.push(ctx.locals!.get('i'));
        return Promise.resolve('executed');
      });

      await command.execute(context, 'while', mockCondition, 'index', 'i', mockCommand);

      expect(capturedIndices).toEqual([0, 1]);
    });
  });

  describe('Until Loops - repeat until', () => {
    it('should loop until condition becomes true', async () => {
      let counter = 0;
      const mockCondition = vi.fn().mockImplementation(() => {
        counter++;
        return counter >= 3;
      });
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'until', mockCondition, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3); // Stops when condition becomes true
      expect(mockCondition).toHaveBeenCalledTimes(3);
    });

    it('should execute at least once if condition starts true', async () => {
      const mockCondition = vi.fn().mockReturnValue(true);
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'until', mockCondition, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe('Times Loop - repeat N times', () => {
    it('should loop specified number of times', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 5, 'times', mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(5);
    });

    it('should support index in times loop', async () => {
      const capturedIndices: number[] = [];
      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedIndices.push(ctx.locals!.get('i'));
        return Promise.resolve('executed');
      });

      await command.execute(context, 3, 'times', 'index', 'i', mockCommand);

      expect(capturedIndices).toEqual([0, 1, 2]);
    });

    it('should handle zero times', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 0, 'times', mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle negative times gracefully', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, -1, 'times', mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });
  });

  describe('Forever Loop - repeat forever', () => {
    it('should loop forever (until break)', async () => {
      let counter = 0;
      const mockCommand = vi.fn().mockImplementation(ctx => {
        counter++;
        if (counter >= 3) {
          ctx.flags = { ...ctx.flags, breaking: true };
        }
        return Promise.resolve('executed');
      });

      await command.execute(context, 'forever', mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
    });
  });

  describe('Until Event Loop', () => {
    it('should loop until specific event occurs', async () => {
      let eventFired = false;
      let counter = 0;

      // Mock event system
      const mockEventCheck = vi.fn().mockImplementation(() => {
        counter++;
        if (counter >= 3) {
          eventFired = true;
        }
        return eventFired;
      });

      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'until', 'event', mockEventCheck, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(2); // Stops when event fires
    });
  });

  describe('Multiple Commands in Loop', () => {
    it('should execute multiple commands in each iteration', async () => {
      const command1 = vi.fn().mockResolvedValue('cmd1');
      const command2 = vi.fn().mockResolvedValue('cmd2');
      const commands = [command1, command2];

      await command.execute(context, 3, 'times', commands);

      expect(command1).toHaveBeenCalledTimes(3);
      expect(command2).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loop Control Flow', () => {
    it('should handle break flag', async () => {
      let counter = 0;
      const mockCommand = vi.fn().mockImplementation(ctx => {
        counter++;
        if (counter === 2) {
          ctx.flags = { ...ctx.flags, breaking: true };
        }
        return Promise.resolve('executed');
      });

      await command.execute(context, 5, 'times', mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(2);
    });

    it('should handle continue flag', async () => {
      let callCount = 0;
      const mockCommand = vi.fn().mockImplementation(ctx => {
        callCount++;
        if (callCount === 2) {
          ctx.flags = { ...ctx.flags, continuing: true };
          return Promise.resolve('skipped');
        }
        return Promise.resolve('executed');
      });

      await command.execute(context, 3, 'times', mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
    });

    it('should handle return flag', async () => {
      let counter = 0;
      const mockCommand = vi.fn().mockImplementation(ctx => {
        counter++;
        if (counter === 2) {
          ctx.flags = { ...ctx.flags, returning: true };
        }
        return Promise.resolve('executed');
      });

      await command.execute(context, 5, 'times', mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('Validation', () => {
    it('should validate for-in syntax', () => {
      const error = command.validate(['for', 'item', 'in', ['a', 'b'], vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate implicit in syntax', () => {
      const error = command.validate(['in', ['a', 'b'], vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate while syntax', () => {
      const error = command.validate(['while', vi.fn(), vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate until syntax', () => {
      const error = command.validate(['until', vi.fn(), vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate times syntax', () => {
      const error = command.validate([5, 'times', vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate forever syntax', () => {
      const error = command.validate(['forever', vi.fn()]);
      expect(error).toBe(null);
    });

    it('should require minimum arguments', () => {
      const error = command.validate([]);
      expect(error).toBe('Repeat command requires at least 2 arguments');
    });

    it('should reject invalid syntax', () => {
      const error = command.validate(['invalid', 'syntax']);
      expect(error).toBe('Invalid repeat syntax');
    });

    it('should require "in" keyword for for loops', () => {
      const error = command.validate(['for', 'item', 'invalid', []]);
      expect(error).toBe('For loop requires "in" keyword');
    });

    it('should require "times" keyword for numeric loops', () => {
      const error = command.validate([5, 'invalid', vi.fn()]);
      expect(error).toBe('Numeric repeat requires "times" keyword');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors', async () => {
      const failingCommand = vi.fn().mockRejectedValue(new Error('Command failed'));

      await expect(async () => {
        await command.execute(context, 2, 'times', failingCommand);
      }).rejects.toThrow('Command failed');
    });

    it('should handle empty iterables', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'in', [], mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle non-iterable values', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await expect(async () => {
        await command.execute(context, 'in', null, mockCommand);
      }).rejects.toThrow();
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle basic for loop example', async () => {
      // From LSP: repeat for p in <p/> add .example to p end
      const paragraphs = [
        createTestElement('<p>1</p>'),
        createTestElement('<p>2</p>'),
        createTestElement('<p>3</p>'),
      ];

      const mockAddCommand = vi.fn().mockImplementation(ctx => {
        const p = ctx.locals!.get('p') as HTMLElement;
        p.classList.add('example');
        return Promise.resolve('added');
      });

      await command.execute(context, 'for', 'p', 'in', paragraphs, mockAddCommand);

      expect(mockAddCommand).toHaveBeenCalledTimes(3);
      paragraphs.forEach(p => {
        expect(p.classList.contains('example')).toBe(true);
      });
    });

    it('should handle implicit iteration example', async () => {
      // From LSP: repeat in <p/> add .example to it end
      const paragraphs = [createTestElement('<p>1</p>'), createTestElement('<p>2</p>')];

      const mockAddCommand = vi.fn().mockImplementation(ctx => {
        const p = ctx.it as HTMLElement;
        p.classList.add('example');
        return Promise.resolve('added');
      });

      await command.execute(context, 'in', paragraphs, mockAddCommand);

      expect(mockAddCommand).toHaveBeenCalledTimes(2);
      paragraphs.forEach(p => {
        expect(p.classList.contains('example')).toBe(true);
      });
    });

    it('should handle times loop example', async () => {
      // From LSP: repeat 5 times put "Fun " before end of #div.innerHTML end
      let output = '';
      const mockPutCommand = vi.fn().mockImplementation(() => {
        output += 'Fun ';
        return Promise.resolve('put');
      });

      await command.execute(context, 5, 'times', mockPutCommand);

      expect(mockPutCommand).toHaveBeenCalledTimes(5);
      expect(output).toBe('Fun Fun Fun Fun Fun ');
    });
  });

  describe('Object Property Iteration (New Official _hyperscript Feature)', () => {
    it('should iterate over object properties for non-iterable objects', async () => {
      // Official example: set x to {foo:1, bar:2, baz:3} for prop in x put x[prop] at end of me end
      const testObject = { foo: 1, bar: 2, baz: 3 };
      const capturedProps: string[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        const prop = ctx.locals!.get('prop') as string;
        capturedProps.push(prop);
        return Promise.resolve('executed');
      });

      await command.execute(context, 'for', 'prop', 'in', testObject, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
      expect(capturedProps.sort()).toEqual(['bar', 'baz', 'foo']);
    });

    it('should iterate over object properties with implicit iteration', async () => {
      const testObject = { alpha: 10, beta: 20 };
      const capturedProps: string[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedProps.push(ctx.it as string);
        return Promise.resolve('executed');
      });

      await command.execute(context, 'in', testObject, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(2);
      expect(capturedProps.sort()).toEqual(['alpha', 'beta']);
    });

    it('should prioritize Symbol.iterator over object keys', async () => {
      const iterableObject = {
        foo: 1,
        bar: 2,
        [Symbol.iterator]: function* () {
          yield 'custom1';
          yield 'custom2';
        },
      };

      const capturedValues: string[] = [];
      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedValues.push(ctx.it as string);
        return Promise.resolve('executed');
      });

      await command.execute(context, 'in', iterableObject, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(2);
      expect(capturedValues).toEqual(['custom1', 'custom2']);
    });

    it('should handle empty objects gracefully', async () => {
      const emptyObject = {};
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'for', 'prop', 'in', emptyObject, mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle objects with numeric properties', async () => {
      const numericObject = { 0: 'zero', 1: 'one', 2: 'two' };
      const capturedProps: string[] = [];

      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedProps.push(ctx.locals!.get('key') as string);
        return Promise.resolve('executed');
      });

      await command.execute(context, 'for', 'key', 'in', numericObject, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(3);
      expect(capturedProps.sort()).toEqual(['0', '1', '2']);
    });

    it('should handle complex objects with mixed property types', async () => {
      const complexObject = {
        stringProp: 'value',
        numberProp: 42,
        booleanProp: true,
        objectProp: { nested: true },
        arrayProp: [1, 2, 3],
      };

      const capturedProps: string[] = [];
      const mockCommand = vi.fn().mockImplementation(ctx => {
        capturedProps.push(ctx.it as string);
        return Promise.resolve('executed');
      });

      await command.execute(context, 'in', complexObject, mockCommand);

      expect(mockCommand).toHaveBeenCalledTimes(5);
      expect(capturedProps.sort()).toEqual([
        'arrayProp',
        'booleanProp',
        'numberProp',
        'objectProp',
        'stringProp',
      ]);
    });
  });
});
