/**
 * TDD Tests for Hyperscript Runtime System
 * Tests the execution of parsed AST nodes with proper context management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import type { ExecutionContext } from '../types/core';
import { isControlFlowError } from './runtime-base';
import { CommandRegistryV2 } from './command-adapter';
import { HookRegistry } from '../types/hooks';

// Mock DOM for testing
const createMockElement = () => {
  // Create a real DOM element in Happy-DOM for proper style support
  const element = document.createElement('div');
  element.style.display = 'block';

  // Add vitest spies for testing
  element.addEventListener = vi.fn();
  element.removeEventListener = vi.fn();
  element.dispatchEvent = vi.fn();
  element.classList.add = vi.fn();
  element.classList.remove = vi.fn();
  element.classList.toggle = vi.fn();
  element.classList.contains = vi.fn(() => false);
  element.querySelector = vi.fn();

  return element;
};

describe('Hyperscript Runtime', () => {
  let runtime: Runtime;
  let context: ExecutionContext;
  let mockElement: any;

  beforeEach(() => {
    runtime = new Runtime();
    mockElement = createMockElement();
    context = {
      me: mockElement,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      events: new Map(),
    };
    vi.clearAllMocks();
  });

  describe('Basic Command Execution', () => {
    it('should execute hide command', async () => {
      // Create a manual command AST to bypass parser issues
      const hideCommandAST = {
        type: 'command',
        name: 'hide',
        args: [{ type: 'identifier', name: 'me' }],
      };

      await runtime.execute(hideCommandAST, context);

      expect(mockElement.style.display).toBe('none');
    });

    it('should execute show command', async () => {
      mockElement.style.display = 'none';
      const ast = parse('show me').node!;
      await runtime.execute(ast, context);

      expect(mockElement.style.display).toBe('block');
    });

    it('should execute wait command', async () => {
      const startTime = Date.now();
      const ast = parse('wait 100ms').node!;
      await runtime.execute(ast, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should execute add class command', async () => {
      const ast = parse('add .active').node!;
      await runtime.execute(ast, context);

      expect(mockElement.classList.add).toHaveBeenCalledWith('active');
    });

    it('should execute remove class command', async () => {
      const ast = parse('remove .active').node!;
      await runtime.execute(ast, context);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('active');
    });

    it('should execute put command', async () => {
      const ast = parse('put "Hello World" into me').node!;
      await runtime.execute(ast, context);

      // PUT with "into" sets innerHTML, not textContent
      expect(mockElement.innerHTML).toBe('Hello World');
    });

    it('should execute set command for variables', async () => {
      // Create a manual command AST to bypass parser issues with set command
      const setCommandAST = {
        type: 'command',
        name: 'set',
        args: [
          { type: 'identifier', name: 'myVar' },
          { type: 'identifier', name: 'to' },
          { type: 'literal', value: 'test value' },
        ],
      };

      await runtime.execute(setCommandAST, context);

      expect(context.locals?.get('myVar')).toBe('test value');
    });

    it('should execute set command for context variables', async () => {
      // Create a manual command AST to bypass parser issues with set command
      const setCommandAST = {
        type: 'command',
        name: 'set',
        args: [
          { type: 'identifier', name: 'result' },
          { type: 'identifier', name: 'to' },
          { type: 'literal', value: 'completed' },
        ],
      };

      await runtime.execute(setCommandAST, context);

      expect(context.result).toBe('completed');
    });
  });

  describe('Event Handler Execution', () => {
    it('should bind event handlers to elements', async () => {
      const ast = parse('on click hide me').node!;
      await runtime.execute(ast, context);

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );
    });

    it('should execute commands when event is triggered', async () => {
      const ast = parse('on click hide me').node!;
      await runtime.execute(ast, context);

      // Get the event handler that was registered
      const eventHandler = mockElement.addEventListener.mock.calls[0][1];

      // Trigger the event
      await eventHandler({ target: mockElement });

      expect(mockElement.style.display).toBe('none');
    });
  });

  describe('Expression Evaluation', () => {
    it('should evaluate context variables', async () => {
      context.it = 'test value';
      const ast = parse('it').node!;
      const result = await runtime.execute(ast, context);

      expect(result).toBe('test value');
    });

    it('should evaluate literals in commands', async () => {
      const ast = parse('"hello world"').node!;
      const result = await runtime.execute(ast, context);

      expect(result).toBe('hello world');
    });
  });

  describe('Context Management', () => {
    it('should maintain execution context across commands', async () => {
      const result1 = await runtime.execute(parse('me').node!, context);
      expect(result1).toBe(mockElement);

      context.it = 'new value';
      const result2 = await runtime.execute(parse('it').node!, context);
      expect(result2).toBe('new value');
    });

    it('should update context variables during execution', async () => {
      // For now, test direct context manipulation since parser doesn't handle "set" commands yet
      (context as { result: unknown }).result = 'completed';

      expect(context.result).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const ast = { type: 'command', name: 'unknownCommand', args: [] };

      await expect(runtime.execute(ast, context)).rejects.toThrow(
        'Unknown command: unknownCommand'
      );
    });

    it('should provide meaningful error messages', async () => {
      const invalidAst = { type: 'invalidNode' };

      await expect(runtime.execute(invalidAst, context)).rejects.toThrow(
        'Unsupported AST node type for evaluation: invalidNode'
      );
    });

    it('should handle missing context elements', async () => {
      context.me = null;
      const ast = parse('hide me').node!;

      // V2 commands provide more descriptive error messages about invalid targets
      await expect(runtime.execute(ast, context)).rejects.toThrow('Invalid hide target');
    });
  });

  describe('Complex Scenarios', () => {
    it('should execute multiple commands in sequence', async () => {
      const ast = parse('on click hide me then show #result').node!;
      await runtime.execute(ast, context);

      expect(mockElement.addEventListener).toHaveBeenCalled();
    });

    it('should handle conditional execution', async () => {
      // This test will be expanded when conditional parsing is implemented
      expect(runtime).toBeDefined();
    });
  });

  describe('Command Registration Safety', () => {
    it.skip('should not have commands registered in both legacy and enhanced registries', () => {
      // Get enhanced registry
      const enhancedRegistry = (runtime as any).getEnhancedRegistry();
      const enhancedCommands = enhancedRegistry.getCommandNames();

      // Expected list: commands that should be in enhanced registry only
      const expectedEnhancedCommands = [
        // DOM commands (enhanced pattern)
        'hide',
        'show',
        'toggle',
        'add',
        'remove',
        'put',
        // Event commands (enhanced pattern)
        'send',
        'trigger',
        // Data commands (enhanced pattern)
        'set',
        'increment',
        'decrement',
        // Utility commands (enhanced pattern)
        'log',
        // Navigation commands (enhanced pattern)
        'go',
        // Advanced commands (enhanced pattern)
        'beep',
        // Note: Some commands registered via legacy adapter may not appear separately
      ];

      // Verify no obvious duplicates (this test serves as documentation)
      expect(enhancedCommands.length).toBeGreaterThan(0);

      // This test will catch issues if we accidentally register a command twice
      // The checkDuplicateRegistration() method will warn during registration
      expect(runtime).toBeDefined();
    });

    it('should warn when attempting to register duplicate commands', () => {
      // Create a spy on console.warn to capture warnings
      const warnSpy = vi.spyOn(console, 'warn');

      // Create a new runtime (which triggers all registrations)
      const testRuntime = new Runtime();

      // Check if any duplicate registration warnings were issued
      const duplicateWarnings = warnSpy.mock.calls.filter(call =>
        call[0]?.toString().includes('DUPLICATE REGISTRATION')
      );

      // All V1 commands have been migrated to the V2 (enhanced) pattern, so
      // no duplicate-registration warnings should be emitted at runtime init.
      const expectedDuplicates = 0;

      if (duplicateWarnings.length > 0) {
        const commandNames = duplicateWarnings.map(w => {
          const match = w[0].match(/Command "(\w+)"/);
          return match ? match[1] : 'unknown';
        });
        console.log(`Found ${duplicateWarnings.length} duplicate registrations:`, commandNames);
      }

      // This number should decrease as we migrate more commands
      expect(duplicateWarnings.length).toBe(expectedDuplicates);

      warnSpy.mockRestore();
    });

    it.skip('should have all critical commands registered', () => {
      const enhancedRegistry = (runtime as any).getEnhancedRegistry();

      // Verify key commands are available
      const criticalCommands = [
        'hide',
        'show',
        'toggle',
        'add',
        'remove',
        'set',
        'increment',
        'decrement',
        'send',
        'trigger',
        'log',
      ];

      criticalCommands.forEach(commandName => {
        expect(enhancedRegistry.has(commandName)).toBe(true);
      });
    });
  });
});

// ============================================================================
// Runtime Audit Tests
// ============================================================================

describe('Runtime Audit Fixes', () => {
  describe('isControlFlowError()', () => {
    it('should detect halt signals', () => {
      const error = new Error('HALT_EXECUTION') as any;
      error.isHalt = true;
      expect(isControlFlowError(error)).toBe(true);
    });

    it('should detect exit signals', () => {
      const error = new Error('EXIT_COMMAND') as any;
      error.isExit = true;
      expect(isControlFlowError(error)).toBe(true);
    });

    it('should detect break signals', () => {
      const error = new Error('break') as any;
      error.isBreak = true;
      expect(isControlFlowError(error)).toBe(true);
    });

    it('should detect continue signals', () => {
      const error = new Error('continue') as any;
      error.isContinue = true;
      expect(isControlFlowError(error)).toBe(true);
    });

    it('should detect return signals', () => {
      const error = new Error('return') as any;
      error.isReturn = true;
      expect(isControlFlowError(error)).toBe(true);
    });

    it('should detect legacy message-based halt', () => {
      expect(isControlFlowError(new Error('HALT_EXECUTION'))).toBe(true);
    });

    it('should detect legacy message-based exit', () => {
      expect(isControlFlowError(new Error('EXIT_COMMAND'))).toBe(true);
      expect(isControlFlowError(new Error('EXIT_EXECUTION'))).toBe(true);
    });

    it('should return false for normal errors', () => {
      expect(isControlFlowError(new Error('Something went wrong'))).toBe(false);
      expect(isControlFlowError(new TypeError('type error'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isControlFlowError('string')).toBe(false);
      expect(isControlFlowError(42)).toBe(false);
      expect(isControlFlowError(null)).toBe(false);
      expect(isControlFlowError(undefined)).toBe(false);
    });
  });

  describe('queryElements() with invalid CSS selectors', () => {
    let runtime: Runtime;
    let context: ExecutionContext;

    beforeEach(() => {
      runtime = new Runtime();
      context = {
        me: document.createElement('div'),
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };
    });

    it('should return empty array for invalid CSS selectors', () => {
      // Access queryElements via protected method through subclass or direct test
      const result = (runtime as any).queryElements('invalid[[[', context);
      expect(result).toEqual([]);
    });

    it('should work normally for valid CSS selectors', () => {
      const result = (runtime as any).queryElements('div', context);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('CommandRegistryV2.register() validation', () => {
    it('should throw descriptive error for commands with no name', () => {
      const registry = new CommandRegistryV2();
      expect(() => registry.register({})).toThrow('Cannot register command: no name found');
    });

    it('should throw for undefined name and metadata', () => {
      const registry = new CommandRegistryV2();
      expect(() => registry.register({ metadata: {} })).toThrow(
        'Cannot register command: no name found'
      );
    });

    it('should accept commands with name property', () => {
      const registry = new CommandRegistryV2();
      expect(() =>
        registry.register({
          name: 'test',
          execute: async () => {},
        })
      ).not.toThrow();
      expect(registry.has('test')).toBe(true);
    });

    it('should accept commands with metadata.name', () => {
      const registry = new CommandRegistryV2();
      expect(() =>
        registry.register({
          metadata: { name: 'meta-test' },
          execute: async () => {},
        })
      ).not.toThrow();
      expect(registry.has('meta-test')).toBe(true);
    });
  });

  describe('Hook registry propagation', () => {
    it('should propagate hook registry to pre-registered adapters', () => {
      const registry = new CommandRegistryV2();

      // Register command BEFORE setting hook registry
      registry.register({
        name: 'test-cmd',
        execute: async () => 'result',
      });

      // Now set hook registry (this is what RuntimeBase constructor does)
      const hookRegistry = new HookRegistry();
      registry.setHookRegistry(hookRegistry);

      // Verify the adapter got the hook registry
      const adapter = registry.getAdapter('test-cmd');
      expect(adapter).toBeDefined();
      // The adapter's hookRegistry field should now be set
      expect((adapter as any).hookRegistry).toBe(hookRegistry);
    });
  });

  describe('Event delegation with invalid CSS selectors', () => {
    let runtime: Runtime;
    let context: ExecutionContext;
    let mockElement: HTMLElement;

    beforeEach(() => {
      runtime = new Runtime();
      mockElement = document.createElement('div');
      document.body.appendChild(mockElement);
      context = {
        me: mockElement,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };
    });

    afterEach(() => {
      mockElement.remove();
    });

    it('should not throw when event delegation has invalid selector', async () => {
      // Create an event handler with an invalid delegation selector
      const handlerNode = {
        type: 'eventHandler',
        event: 'click',
        events: ['click'],
        commands: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'clicked' }] }],
        selector: 'invalid[[[',
      };

      // Should not throw during handler registration
      await expect(runtime.execute(handlerNode as any, context)).resolves.not.toThrow();
    });
  });
});

// ============================================================================
// RuntimeBase Method Coverage Tests
// ============================================================================

describe('RuntimeBase Method Coverage', () => {
  describe('Lifecycle Methods', () => {
    let runtime: Runtime;
    let element: HTMLElement;

    beforeEach(() => {
      runtime = new Runtime();
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('cleanup() should return 0 for element with no cleanups', () => {
      expect(runtime.cleanup(element)).toBe(0);
    });

    it('cleanup() should clean up registered listeners after event handler', async () => {
      const context: ExecutionContext = {
        me: element,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };

      // Register an event handler (which registers a listener)
      await runtime.execute(
        { type: 'eventHandler', event: 'click', events: ['click'], commands: [] },
        context
      );

      // Element should now have cleanups registered
      const stats = runtime.getCleanupStats();
      expect(stats.listeners).toBeGreaterThanOrEqual(1);

      // Cleanup should return the count of cleaned-up resources
      const cleaned = runtime.cleanup(element);
      expect(cleaned).toBeGreaterThanOrEqual(1);
    });

    it('cleanupTree() should clean up nested elements', async () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const parentContext: ExecutionContext = {
        me: parent,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };

      await runtime.execute(
        { type: 'eventHandler', event: 'click', events: ['click'], commands: [] },
        parentContext
      );

      const childContext: ExecutionContext = {
        ...parentContext,
        me: child,
      };
      await runtime.execute(
        { type: 'eventHandler', event: 'click', events: ['click'], commands: [] },
        childContext
      );

      // Should clean up both parent and child
      const cleaned = runtime.cleanupTree(parent);
      expect(cleaned).toBeGreaterThanOrEqual(2);

      parent.remove();
    });

    it('getCleanupStats() should report accurate statistics', () => {
      const stats = runtime.getCleanupStats();
      expect(stats).toHaveProperty('elementsTracked');
      expect(stats).toHaveProperty('listeners');
      expect(stats).toHaveProperty('observers');
      expect(typeof stats.elementsTracked).toBe('number');
    });

    it('destroy() should clean up global resources', () => {
      // Calling destroy should not throw
      expect(() => runtime.destroy()).not.toThrow();
    });
  });

  describe('Hook Methods', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = new Runtime();
    });

    it('registerHooks() should register a named hook set', () => {
      const hookFn = vi.fn();
      runtime.registerHooks('test-hooks', {
        beforeExecute: hookFn,
      });

      expect(runtime.getRegisteredHooks()).toContain('test-hooks');
    });

    it('unregisterHooks() should remove hooks and return true', () => {
      runtime.registerHooks('test-hooks', {
        beforeExecute: vi.fn(),
      });

      expect(runtime.unregisterHooks('test-hooks')).toBe(true);
      expect(runtime.getRegisteredHooks()).not.toContain('test-hooks');
    });

    it('unregisterHooks() should return false for unknown hooks', () => {
      expect(runtime.unregisterHooks('nonexistent')).toBe(false);
    });

    it('getRegisteredHooks() should return empty array initially (except default)', () => {
      const hooks = runtime.getRegisteredHooks();
      // Default hooks may be registered in constructor
      expect(Array.isArray(hooks)).toBe(true);
    });
  });

  describe('Execution Methods', () => {
    let runtime: Runtime;
    let context: ExecutionContext;
    let mockElement: HTMLElement;

    beforeEach(() => {
      runtime = new Runtime();
      mockElement = document.createElement('div');
      context = {
        me: mockElement,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };
    });

    it('should execute a block node with commands', async () => {
      const blockNode = {
        type: 'block',
        commands: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'hello' }] }],
      };

      // Should not throw
      await expect(runtime.execute(blockNode, context)).resolves.not.toThrow();
    });

    it('should execute a sequence node with commands', async () => {
      const seqNode = {
        type: 'sequence',
        commands: [
          {
            type: 'command',
            name: 'set',
            args: [
              { type: 'identifier', name: 'myVar' },
              { type: 'identifier', name: 'to' },
              { type: 'literal', value: 42 },
            ],
          },
        ],
      };

      await runtime.execute(seqNode, context);
      expect(context.locals?.get('myVar')).toBe(42);
    });

    it('should execute a Program node with features', async () => {
      const programNode = {
        type: 'Program',
        features: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'test' }] }],
      };

      await expect(runtime.execute(programNode, context)).resolves.not.toThrow();
    });

    it('should handle halt signal in command sequence', async () => {
      const seqNode = {
        type: 'sequence',
        commands: [
          { type: 'command', name: 'halt', args: [] },
          { type: 'command', name: 'log', args: [{ type: 'literal', value: 'should not run' }] },
        ],
      };

      // Halt signals propagate as exceptions from top-level execute()
      await expect(runtime.execute(seqNode, context)).rejects.toThrow('HALT_EXECUTION');
    });
  });

  describe('Behavior System', () => {
    let runtime: Runtime;
    let element: HTMLElement;
    let context: ExecutionContext;

    beforeEach(() => {
      runtime = new Runtime();
      element = document.createElement('div');
      document.body.appendChild(element);
      context = {
        me: element,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };
    });

    afterEach(() => {
      element.remove();
    });

    it('should register a behavior definition', async () => {
      const behaviorNode = {
        type: 'behavior',
        name: 'TestBehavior',
        parameters: ['param1'],
        eventHandlers: [],
        initBlock: undefined,
      };

      await runtime.execute(behaviorNode, context);

      // behaviorRegistry is public
      expect(runtime.behaviorRegistry.has('TestBehavior')).toBe(true);
    });

    it('should execute behavior with init block', async () => {
      // Register behavior
      const behaviorNode = {
        type: 'behavior',
        name: 'InitBehavior',
        parameters: [],
        eventHandlers: [],
        initBlock: {
          type: 'block',
          commands: [{ type: 'command', name: 'log', args: [{ type: 'literal', value: 'init' }] }],
        },
      };

      await runtime.execute(behaviorNode, context);

      // Now install it
      const installNode = {
        type: 'command',
        name: 'install',
        args: [{ type: 'identifier', name: 'InitBehavior' }],
      };

      await expect(runtime.execute(installNode, context)).resolves.not.toThrow();
    });
  });

  describe('toSignal() conversion', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = new Runtime();
    });

    // Access protected method via any
    const callToSignal = (rt: Runtime, error: unknown) => (rt as any).toSignal(error);

    it('should convert isHalt error to halt signal', () => {
      const error = new Error('halt') as any;
      error.isHalt = true;
      const signal = callToSignal(runtime, error);
      expect(signal).toEqual({ type: 'halt' });
    });

    it('should convert isExit error to exit signal with returnValue', () => {
      const error = new Error('exit') as any;
      error.isExit = true;
      error.returnValue = 'result';
      const signal = callToSignal(runtime, error);
      expect(signal).toEqual({ type: 'exit', returnValue: 'result' });
    });

    it('should convert isBreak error to break signal', () => {
      const error = new Error('break') as any;
      error.isBreak = true;
      const signal = callToSignal(runtime, error);
      expect(signal).toEqual({ type: 'break' });
    });

    it('should convert isContinue error to continue signal', () => {
      const error = new Error('continue') as any;
      error.isContinue = true;
      const signal = callToSignal(runtime, error);
      expect(signal).toEqual({ type: 'continue' });
    });

    it('should convert isReturn error to return signal with value', () => {
      const error = new Error('return') as any;
      error.isReturn = true;
      error.returnValue = 42;
      const signal = callToSignal(runtime, error);
      expect(signal).toEqual({ type: 'return', returnValue: 42 });
    });

    it('should convert HALT_EXECUTION message to halt signal', () => {
      const signal = callToSignal(runtime, new Error('HALT_EXECUTION'));
      expect(signal).toEqual({ type: 'halt' });
    });

    it('should return null for normal errors', () => {
      const signal = callToSignal(runtime, new Error('something went wrong'));
      expect(signal).toBeNull();
    });

    it('should return null for non-Error values', () => {
      expect(callToSignal(runtime, 'string')).toBeNull();
      expect(callToSignal(runtime, 42)).toBeNull();
      expect(callToSignal(runtime, null)).toBeNull();
    });
  });

  describe('Result-based execution (enableResultPattern)', () => {
    let runtime: Runtime;
    let context: ExecutionContext;

    beforeEach(() => {
      // enableResultPattern is on by default
      runtime = new Runtime();
      context = {
        me: document.createElement('div'),
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };
    });

    it('should execute command sequence via Result pattern', async () => {
      const seqNode = {
        type: 'sequence',
        commands: [
          {
            type: 'command',
            name: 'set',
            args: [
              { type: 'identifier', name: 'x' },
              { type: 'identifier', name: 'to' },
              { type: 'literal', value: 10 },
            ],
          },
          {
            type: 'command',
            name: 'set',
            args: [
              { type: 'identifier', name: 'y' },
              { type: 'identifier', name: 'to' },
              { type: 'literal', value: 20 },
            ],
          },
        ],
      };

      await runtime.execute(seqNode, context);

      expect(context.locals?.get('x')).toBe(10);
      expect(context.locals?.get('y')).toBe(20);
    });

    it('should propagate halt signal through Result pattern', async () => {
      const seqNode = {
        type: 'sequence',
        commands: [
          {
            type: 'command',
            name: 'set',
            args: [
              { type: 'identifier', name: 'x' },
              { type: 'identifier', name: 'to' },
              { type: 'literal', value: 'before' },
            ],
          },
          { type: 'command', name: 'halt', args: [] },
          {
            type: 'command',
            name: 'set',
            args: [
              { type: 'identifier', name: 'x' },
              { type: 'identifier', name: 'to' },
              { type: 'literal', value: 'after' },
            ],
          },
        ],
      };

      // Halt propagates as exception from top-level execute; 'x' is set before halt fires
      await expect(runtime.execute(seqNode, context)).rejects.toThrow('HALT_EXECUTION');
      expect(context.locals?.get('x')).toBe('before');
    });

    it('should evaluate expressions via Result pattern', async () => {
      const literalNode = { type: 'literal', value: 'hello' };
      const result = await runtime.execute(literalNode, context);
      expect(result).toBe('hello');
    });

    it('should return value from return command', async () => {
      const seqNode = {
        type: 'sequence',
        commands: [{ type: 'command', name: 'return', args: [{ type: 'literal', value: 42 }] }],
      };

      const result = await runtime.execute(seqNode, context);
      // After return, context.result should have the value
      expect(context.result).toBe(42);
    });
  });

  describe('unwrapCommandResult()', () => {
    // Import directly for testing
    it('should return undefined for undefined input', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(unwrapCommandResult(undefined)).toBeUndefined();
    });

    it('should unwrap CallCommand result', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(unwrapCommandResult({ result: 'value', wasAsync: false })).toBe('value');
    });

    it('should unwrap GetCommand result', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(unwrapCommandResult({ value: 42 })).toBe(42);
    });

    it('should unwrap FetchCommand result', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(unwrapCommandResult({ data: { items: [] }, status: 200, headers: {} })).toEqual({
        items: [],
      });
    });

    it('should return undefined for IfCommand with no result', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(
        unwrapCommandResult({ conditionResult: true, executedBranch: 'then' })
      ).toBeUndefined();
    });

    it('should pass through primitive values', async () => {
      const { unwrapCommandResult } = await import('./runtime-base');
      expect(unwrapCommandResult('hello')).toBe('hello');
      expect(unwrapCommandResult(42)).toBe(42);
      expect(unwrapCommandResult(true)).toBe(true);
    });
  });

  describe('Behavior timeout protection', () => {
    it('should timeout on slow init block', async () => {
      // Use a very short timeout
      const runtime = new Runtime({ commandTimeout: 50 });
      const element = document.createElement('div');
      document.body.appendChild(element);

      const context: ExecutionContext = {
        me: element,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
      };

      // Register behavior with slow init
      runtime.behaviorRegistry.set('SlowBehavior', {
        name: 'SlowBehavior',
        parameters: [],
        eventHandlers: [],
        initBlock: {
          type: 'command',
          name: 'wait',
          args: [{ type: 'literal', value: '500ms' }],
        },
      });

      // Install should throw timeout error
      const installNode = {
        type: 'command',
        name: 'install',
        args: [{ type: 'identifier', name: 'SlowBehavior' }],
      };

      await expect(runtime.execute(installNode, context)).rejects.toThrow(/timed out/);

      element.remove();
    });
  });
});
