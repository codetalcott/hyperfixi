import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandRuntime } from './command-runtime';
import type { ExecutionContext } from './types/core';
import type { CommandNode } from './hyperscript-parser';

describe('CommandRuntime - Simple Tests', () => {
  let runtime: CommandRuntime;
  let context: ExecutionContext;

  beforeEach(() => {
    runtime = new CommandRuntime();
    context = {
      me: {} as Element,
      it: null,
      event: null,
      locals: new Map(),
      result: null,
    };
  });

  describe('LOG command', () => {
    it('should execute log command with string literal', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const command: CommandNode = {
        type: 'command',
        name: 'log',
        args: [
          {
            type: 'expression',
            value: 'Hello World',
          },
        ],
        source: 'log "Hello World"',
      };

      await runtime.executeCommand(command, context);

      expect(logSpy).toHaveBeenCalledWith('Hello World');
      logSpy.mockRestore();
    });

    it('should execute log command with variable', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Set a variable in context
      (context as any).testVar = 'Test Value';

      const command: CommandNode = {
        type: 'command',
        name: 'log',
        args: [
          {
            type: 'expression',
            value: 'testVar',
          },
        ],
        source: 'log testVar',
      };

      await runtime.executeCommand(command, context);

      expect(logSpy).toHaveBeenCalledWith('Test Value');
      logSpy.mockRestore();
    });
  });

  describe('SET command', () => {
    it('should set variable value', async () => {
      const command: CommandNode = {
        type: 'command',
        name: 'set',
        args: [
          {
            type: 'expression',
            value: 'myVar',
          },
          {
            type: 'expression',
            value: 'Hello',
          },
        ],
        source: 'set myVar to "Hello"',
      };

      await runtime.executeCommand(command, context);

      expect((context as any).myVar).toBe('Hello');
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown command', async () => {
      const command: CommandNode = {
        type: 'command',
        name: 'unknownCommand',
        args: [],
        source: 'unknownCommand',
      };

      await expect(runtime.executeCommand(command, context)).rejects.toThrow(
        'Unknown command: unknownCommand'
      );
    });
  });

  describe('expression evaluation', () => {
    it('should evaluate context variables', async () => {
      context.it = 'test value';

      const result = await (runtime as any).evaluateExpression(
        {
          type: 'expression',
          value: 'it',
        },
        context
      );

      expect(result).toBe('test value');
    });

    it('should evaluate me context', async () => {
      const testElement = { id: 'test' };
      context.me = testElement as any;

      const result = await (runtime as any).evaluateExpression(
        {
          type: 'expression',
          value: 'me',
        },
        context
      );

      expect(result).toBe(testElement);
    });

    it('should evaluate literal values', async () => {
      const result = await (runtime as any).evaluateExpression(
        {
          type: 'expression',
          value: 'Hello World',
        },
        context
      );

      expect(result).toBe('Hello World');
    });

    it('should handle possessive expressions', async () => {
      const testObj = { prop: 'test value' };
      (context as any).myObj = testObj;

      const result = await (runtime as any).evaluateExpression(
        {
          type: 'expression',
          operator: 'possessive',
          operands: [
            { type: 'expression', value: 'myObj' },
            { type: 'expression', value: 'prop' },
          ],
        },
        context
      );

      expect(result).toBe('test value');
    });
  });

  describe('fragment conversion', () => {
    beforeEach(() => {
      // Mock global document for fragment tests
      const mockFragment = {
        append: vi.fn(),
      };
      const mockTemplate = {
        innerHTML: '',
        content: mockFragment,
      };

      globalThis.document = {
        createDocumentFragment: vi.fn(() => mockFragment),
        createElement: vi.fn(() => mockTemplate),
        head: { innerHTML: '' },
        body: { innerHTML: '' },
      } as any;
    });

    it('should convert string to fragment', () => {
      const result = (runtime as any).convertToFragment('Hello');

      expect(globalThis.document.createDocumentFragment).toHaveBeenCalled();
      expect(globalThis.document.createElement).toHaveBeenCalledWith('template');
    });

    it('should handle Node values', () => {
      const mockNode = { nodeType: 1 };
      const result = (runtime as any).convertToFragment(mockNode);

      // The mock fragment should have been called to append the node
      expect(globalThis.document.createDocumentFragment).toHaveBeenCalled();
    });
  });
});
