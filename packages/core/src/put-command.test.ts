import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandRuntime } from './command-runtime';
import type { ExecutionContext, CommandNode } from './types/core';

// Create a simple CommandNode type for testing
interface TestCommandNode {
  type: 'command';
  name: string;
  args: any[];
  source: string;
}

describe('PUT Command Implementation', () => {
  let runtime: CommandRuntime;
  let context: ExecutionContext;
  let mockElement: any;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new CommandRuntime();

    mockElement = {
      innerHTML: '',
      textContent: '',
      style: {},
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      prepend: vi.fn(),
      append: vi.fn(),
      before: vi.fn(),
      after: vi.fn(),
    };

    context = {
      me: mockElement,
      it: null,
      event: null,
      locals: new Map(),
      result: null,
    };

    // Mock document
    globalThis.document = {
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      createDocumentFragment: vi.fn(() => ({
        append: vi.fn(),
        appendChild: vi.fn(),
      })),
      createElement: vi.fn(() => ({
        innerHTML: '',
        content: {
          cloneNode: vi.fn(() => mockElement),
        },
      })),
    } as any;
  });

  describe('put X into Y', () => {
    it('should put string into element', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello World' },
          { type: 'expression', value: 'me' },
        ],
        source: 'put "Hello World" into me',
      };

      await runtime.executeCommand(command, context);

      expect(globalThis.document.createDocumentFragment).toHaveBeenCalled();
      expect(mockElement.appendChild).toHaveBeenCalled();
    });

    it('should put into variable', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'test value' },
          { type: 'expression', value: 'myVar' },
        ],
        source: 'put "test value" into myVar',
      };

      await runtime.executeCommand(command, context);

      expect((context as any).myVar).toBe('test value');
    });

    it('should put into element property', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'test content' },
          {
            type: 'expression',
            operator: 'possessive',
            operands: [
              { type: 'expression', value: 'me' },
              { type: 'expression', value: 'innerHTML' },
            ],
          },
        ],
        source: 'put "test content" into my innerHTML',
      };

      await runtime.executeCommand(command, context);

      expect(mockElement.innerHTML).toBe('test content');
    });

    it('should put into attribute', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'test-value' },
          { type: 'expression', value: '@data-test' },
        ],
        source: 'put "test-value" into @data-test',
      };

      await runtime.executeCommand(command, context);

      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-test', 'test-value');
    });

    it('should put into style property', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'red' },
          { type: 'expression', value: '*color' },
        ],
        source: 'put "red" into *color',
      };

      await runtime.executeCommand(command, context);

      expect(mockElement.style.color).toBe('red');
    });
  });

  describe('put X before Y', () => {
    it('should put content before element', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello' },
          { type: 'expression', value: 'me' },
        ],
        source: 'put "Hello" before me',
      };

      // Mock hasKeyword to return true for 'before'
      (runtime as any).hasKeyword = vi.fn((cmd, keyword) => keyword === 'before');

      await runtime.executeCommand(command, context);

      expect(mockElement.before).toHaveBeenCalled();
    });
  });

  describe('put X after Y', () => {
    it('should put content after element', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello' },
          { type: 'expression', value: 'me' },
        ],
        source: 'put "Hello" after me',
      };

      // Mock hasKeyword to return true for 'after'
      (runtime as any).hasKeyword = vi.fn((cmd, keyword) => keyword === 'after');

      await runtime.executeCommand(command, context);

      expect(mockElement.after).toHaveBeenCalled();
    });
  });

  describe('put X at start/end of Y', () => {
    it('should put content at start of element', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello' },
          { type: 'expression', value: 'me' },
        ],
        source: 'put "Hello" at start of me',
      };

      // Mock hasKeyword to return true for 'at' and 'start'
      (runtime as any).hasKeyword = vi.fn(
        (cmd, keyword) => keyword === 'at' || keyword === 'start'
      );

      await runtime.executeCommand(command, context);

      expect(mockElement.prepend).toHaveBeenCalled();
    });

    it('should put content at end of element', async () => {
      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello' },
          { type: 'expression', value: 'me' },
        ],
        source: 'put "Hello" at end of me',
      };

      // Mock hasKeyword to return true for 'at' and 'end'
      (runtime as any).hasKeyword = vi.fn((cmd, keyword) => keyword === 'at' || keyword === 'end');

      await runtime.executeCommand(command, context);

      expect(mockElement.append).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle null targets gracefully', async () => {
      globalThis.document.getElementById = vi.fn(() => null);

      const command: TestCommandNode = {
        type: 'command',
        name: 'put',
        args: [
          { type: 'expression', value: 'Hello' },
          { type: 'expression', value: '#nonexistent' },
        ],
        source: 'put "Hello" into #nonexistent',
      };

      // Should not throw
      await expect(runtime.executeCommand(command, context)).resolves.toBeUndefined();
    });
  });
});
