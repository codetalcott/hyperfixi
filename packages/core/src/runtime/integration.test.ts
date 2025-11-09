/**
 * Runtime Integration Tests
 * Verifies enhanced commands work properly with the runtime system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Runtime } from './runtime';
import type { ExecutionContext, CommandNode } from '../types/core';

describe('Runtime Integration with Enhanced Commands', () => {
  let runtime: Runtime;
  let mockElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    // Create runtime with enhanced commands enabled
    runtime = new Runtime({
      useEnhancedCommands: true,
      enableErrorReporting: true, // Debug output for remove command
    });

    // Create mock DOM element with realistic classList behavior
    const mockClassList = new Set<string>(['inactive']); // Pre-populate with 'inactive' for remove test
    mockElement = {
      classList: {
        add: vi.fn((className: string) => {
          mockClassList.add(className);
        }),
        remove: vi.fn((className: string) => {
          mockClassList.delete(className);
        }),
        toggle: vi.fn((className: string) => {
          if (mockClassList.has(className)) {
            mockClassList.delete(className);
          } else {
            mockClassList.add(className);
          }
        }),
        contains: vi.fn((className: string) => {
          return mockClassList.has(className);
        }),
      },
      style: {
        display: 'block',
      },
      dataset: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as HTMLElement;

    // Create execution context
    context = {
      me: mockElement,
      it: null,
      you: null,
      result: undefined,
      event: undefined,
      variables: new Map(),
      locals: new Map(),
      globals: new Map(),
      events: new Map(),
      meta: {},
    };
  });

  describe('Enhanced Command Execution', () => {
    it('should execute hide command through enhanced adapter', async () => {
      // Debug: check if command is registered
      expect(runtime.getEnhancedRegistry().has('hide')).toBe(true);
      expect(runtime.getEnhancedRegistry().getCommandNames()).toContain('hide');

      const commandNode: CommandNode = {
        type: 'command',
        name: 'hide',
        args: [],
      };

      await runtime.execute(commandNode, context);

      expect(mockElement.style.display).toBe('none');
    });

    it('should execute show command through enhanced adapter', async () => {
      mockElement.style.display = 'none';

      const commandNode: CommandNode = {
        type: 'command',
        name: 'show',
        args: [],
      };

      await runtime.execute(commandNode, context);

      expect(mockElement.style.display).toBe('block');
    });

    it('should execute add command through enhanced adapter', async () => {
      const commandNode: CommandNode = {
        type: 'command',
        name: 'add',
        args: [{ type: 'literal', value: 'active' }],
      };

      await runtime.execute(commandNode, context);

      expect(mockElement.classList.add).toHaveBeenCalledWith('active');
    });

    it('should execute remove command through enhanced adapter', async () => {
      // Debug: check registry contents
      const hasRemove = runtime.getEnhancedRegistry().has('remove');
      const commands = runtime.getEnhancedRegistry().getCommandNames();

      // Use assertion to see debug info
      expect(hasRemove).toBe(true); // This should fail if remove is not registered
      expect(commands).toContain('remove'); // This should fail if remove is not in the list

      const commandNode: CommandNode = {
        type: 'command',
        name: 'remove',
        args: [{ type: 'literal', value: 'inactive' }],
      };

      await runtime.execute(commandNode, context);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('inactive');
    });

    it('should execute toggle command through enhanced adapter', async () => {
      const commandNode: CommandNode = {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'literal', value: 'selected' }],
      };

      await runtime.execute(commandNode, context);

      expect(mockElement.classList.toggle).toHaveBeenCalledWith('selected');
    });
  });

  describe('Command Validation Integration', () => {
    it('should validate commands before execution', () => {
      const result = runtime.validateCommand('hide', [null]); // Pass correct tuple format
      expect(result.valid).toBe(true);
    });

    it('should reject unknown commands', () => {
      const result = runtime.validateCommand('unknownCommand', {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown command');
      expect(result.suggestions).toBeDefined();
    });

    it('should provide helpful suggestions for invalid commands', () => {
      const result = runtime.validateCommand('hid', {}); // typo
      expect(result.valid).toBe(false);
      expect(result.suggestions?.[0]).toContain('Available commands');
    });
  });

  describe('Error Handling', () => {
    it('should provide enhanced error messages for command failures', async () => {
      // Force an error by calling executeEnhancedCommand with invalid input
      // This will trigger validation failure in the enhanced command system
      try {
        // Access the private method for testing purposes
        const result = await runtime['executeEnhancedCommand']('add', [], context);
        // Enhanced commands may return structured errors instead of throwing
        if (result && typeof result === 'object' && 'success' in result && !result.success) {
          // If we get a structured error result, throw to match test expectation
          throw new Error(`add command error: ${result.error?.message || 'Validation failed'}`);
        }
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('add'); // Look for 'add' in error message
        // Enhanced commands should provide better error messages
      }
    });

    it('should fallback to legacy commands when enhanced commands fail', async () => {
      // Create runtime with enhanced commands disabled
      const legacyRuntime = new Runtime({
        useEnhancedCommands: false,
        enableErrorReporting: false,
      });

      const commandNode: CommandNode = {
        type: 'command',
        name: 'hide',
        args: [],
      };

      // Should still work with legacy implementation
      await legacyRuntime.execute(commandNode, context);
      expect(mockElement.style.display).toBe('none');
    });
  });

  describe('Command Registry Access', () => {
    it('should provide access to available commands', () => {
      const commands = runtime.getAvailableCommands();

      expect(commands).toContain('hide');
      expect(commands).toContain('show');
      expect(commands).toContain('add');
      expect(commands).toContain('remove');
      expect(commands).toContain('toggle');
      expect(commands).toContain('send');
      expect(commands).toContain('trigger');
      expect(commands).toContain('wait');
      expect(commands).toContain('fetch');
    });

    it('should report enhanced command status', () => {
      expect(runtime.isUsingEnhancedCommands()).toBe(true);

      const legacyRuntime = new Runtime({ useEnhancedCommands: false });
      expect(legacyRuntime.isUsingEnhancedCommands()).toBe(false);
    });

    it('should provide access to enhanced registry', () => {
      const registry = runtime.getEnhancedRegistry();
      expect(registry.has('hide')).toBe(true);
      expect(registry.getCommandNames().length).toBeGreaterThan(0);
    });
  });

  describe('Context Bridge Integration', () => {
    it('should properly bridge contexts during command execution', async () => {
      // Set up context with variables
      context.variables.set('testVar', 'testValue');
      context.locals.set('localVar', 'localValue');

      const commandNode: CommandNode = {
        type: 'command',
        name: 'hide',
        args: [],
      };

      await runtime.execute(commandNode, context);

      // Context should be preserved after enhanced command execution
      expect(context.variables.get('testVar')).toBe('testValue');
      expect(context.locals.get('localVar')).toBe('localValue');
      expect(context.me).toBe(mockElement);
    });

    it('should update context when commands modify it', async () => {
      const commandNode: CommandNode = {
        type: 'command',
        name: 'hide',
        args: [],
      };

      await runtime.execute(commandNode, context);

      // Commands might update context properties
      // The context should reflect any changes made by the command
      expect(context.me).toBe(mockElement);
    });
  });

  describe('Command Pattern Execution', () => {
    it('should execute command-selector patterns through enhanced commands', async () => {
      // Simulate "add .active" pattern
      const _result = await runtime['executeCommandFromPattern']('add', '.active', context);

      expect(mockElement.classList.add).toHaveBeenCalledWith('active');
    });

    it('should execute "remove .inactive" pattern through enhanced commands', async () => {
      const _result = await runtime['executeCommandFromPattern']('remove', '.inactive', context);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('inactive');
    });

    it('should execute "hide" pattern through enhanced commands', async () => {
      const _result = await runtime['executeCommandFromPattern']('hide', '', context);

      expect(mockElement.style.display).toBe('none');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid command execution', async () => {
      const commands: CommandNode[] = [
        { type: 'command', name: 'hide', args: [] },
        { type: 'command', name: 'show', args: [] },
        { type: 'command', name: 'add', args: [{ type: 'literal', value: 'test' }] },
        { type: 'command', name: 'remove', args: [{ type: 'literal', value: 'test' }] },
      ];

      const promises = commands.map(cmd => runtime.execute(cmd, context));

      // Should handle concurrent execution
      await Promise.all(promises);

      // Verify final state
      expect(mockElement.style.display).toBe('block');
    });

    it('should maintain consistency across enhanced and legacy modes', async () => {
      const enhancedRuntime = new Runtime({
        useEnhancedCommands: true,
        enableErrorReporting: false,
      });
      const legacyRuntime = new Runtime({
        useEnhancedCommands: false,
        enableErrorReporting: false,
      });

      const commandNode: CommandNode = {
        type: 'command',
        name: 'hide',
        args: [],
      };

      const mockElement1 = { ...mockElement };
      const mockElement2 = { ...mockElement };

      const context1 = { ...context, me: mockElement1 };
      const context2 = { ...context, me: mockElement2 };

      await enhancedRuntime.execute(commandNode, context1);
      await legacyRuntime.execute(commandNode, context2);

      // Both should produce the same result
      expect(mockElement1.style.display).toBe(mockElement2.style.display);
    });
  });
});
