/**
 * Comprehensive Test Suite for Unified Command System
 * Tests async execution, context management, error handling, and debugging features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UnifiedCommandSystem,
  CommandContextManager,
  AsyncCommandExecutor,
  CommandErrorHandler,
  CommandDebugger,
  type CommandExecutionOptions,
  type CommandExecutionResult,
} from './unified-command-system';

describe('Unified Command System', () => {
  let commandSystem: UnifiedCommandSystem;

  beforeEach(() => {
    commandSystem = new UnifiedCommandSystem();
  });

  afterEach(() => {
    commandSystem.clearContext();
  });

  describe('Basic Command Execution', () => {
    it('should execute a simple command successfully', async () => {
      const result = await commandSystem.execute('set', ['testVar', 'to', 'testValue']);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.context.commandName).toBe('set');
      expect(result.context.args).toEqual(['testVar', 'to', 'testValue']);
    });

    it('should handle command not found error', async () => {
      const result = await commandSystem.execute('nonExistentCommand');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Command not found');
    });

    it('should record execution history', async () => {
      await commandSystem.execute('set', ['var1', 'to', '1']);
      await commandSystem.execute('set', ['var2', 'to', '2']);

      const history = commandSystem.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].context.args[0]).toBe('var1');
      expect(history[1].context.args[0]).toBe('var2');
    });
  });

  describe('Async Command Execution', () => {
    it('should execute command with timeout', async () => {
      const result = await commandSystem.execute('set', ['x', 'to', '1'], {
        timeout: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(1000);
    });

    it('should handle timeout error', async () => {
      // Mock a slow command
      const slowCommand = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));

      const result = await commandSystem.execute('slowCommand', [], {
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });

    it('should retry failed commands', async () => {
      let attempts = 0;
      const flakeyCommand = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await commandSystem.execute('flakeyCommand', [], {
        retryCount: 3,
        retryDelay: 10,
      });

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
    });

    it('should execute with progress callback', async () => {
      const progressValues: number[] = [];

      await commandSystem.execute('set', ['x', 'to', '1'], {
        onProgress: progress => progressValues.push(progress),
      });

      expect(progressValues).toContain(100);
    });
  });

  describe('Context Management', () => {
    it('should maintain separate contexts', async () => {
      await commandSystem.execute('set', ['x', 'to', '1'], { contextId: 'ctx1' });
      await commandSystem.execute('set', ['x', 'to', '2'], { contextId: 'ctx2' });

      const ctx1 = commandSystem.getContext('ctx1');
      const ctx2 = commandSystem.getContext('ctx2');

      expect(ctx1.locals.get('x')).toBe('1');
      expect(ctx2.locals.get('x')).toBe('2');
    });

    it('should update context with command results', async () => {
      await commandSystem.execute('set', ['x', 'to', '42']);
      const context = commandSystem.getContext();

      expect(context.result).toBeDefined();
    });

    it('should clear context on demand', async () => {
      await commandSystem.execute('set', ['x', 'to', '1'], { contextId: 'temp' });
      commandSystem.clearContext('temp');

      const context = commandSystem.getContext('temp');
      expect(context.locals.has('x')).toBe(false);
    });
  });

  describe('Sequential and Parallel Execution', () => {
    it('should execute commands in sequence', async () => {
      const commands = [
        { name: 'set', args: ['a', 'to', '1'] },
        { name: 'set', args: ['b', 'to', '2'] },
        { name: 'set', args: ['c', 'to', '3'] },
      ];

      const results = await commandSystem.executeSequence(commands);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      const context = commandSystem.getContext();
      expect(context.locals.get('a')).toBe('1');
      expect(context.locals.get('b')).toBe('2');
      expect(context.locals.get('c')).toBe('3');
    });

    it('should stop sequence on error by default', async () => {
      const commands = [
        { name: 'set', args: ['a', 'to', '1'] },
        { name: 'nonExistent', args: [] },
        { name: 'set', args: ['c', 'to', '3'] },
      ];

      const results = await commandSystem.executeSequence(commands);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should execute commands in parallel', async () => {
      const commands = [
        { name: 'set', args: ['x', 'to', '1'] },
        { name: 'set', args: ['y', 'to', '2'] },
        { name: 'set', args: ['z', 'to', '3'] },
      ];

      const startTime = performance.now();
      const results = await commandSystem.executeParallel(commands);
      const executionTime = performance.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // Parallel execution should be faster than sequential
      expect(executionTime).toBeLessThan(results.reduce((sum, r) => sum + r.executionTime, 0));
    });
  });

  describe('Error Handling', () => {
    it('should use command-specific error handler', async () => {
      const errorHandler = vi.fn();
      commandSystem.onError('testCommand', errorHandler);

      await commandSystem.execute('testCommand', []);

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should use global error handler as fallback', async () => {
      const globalHandler = vi.fn();
      commandSystem.onError(globalHandler);

      await commandSystem.execute('nonExistent', []);

      expect(globalHandler).toHaveBeenCalled();
    });

    it('should call error callback in options', async () => {
      const onError = vi.fn();

      await commandSystem.execute('nonExistent', [], { onError });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Debugging Features', () => {
    it('should watch command execution', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      commandSystem.debug.watch('set');
      await commandSystem.execute('set', ['x', 'to', '1']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Command Watch]'),
        expect.any(String),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should support step mode debugging', async () => {
      commandSystem.debug.stepMode(true);

      // In a real environment, this would trigger debugger breakpoints
      await commandSystem.execute('set', ['x', 'to', '1']);

      commandSystem.debug.stepMode(false);
    });

    it('should set and remove breakpoints', () => {
      commandSystem.debug.setBreakpoint('set');
      commandSystem.debug.setBreakpoint('get');

      // Commands should be tracked internally
      commandSystem.debug.removeBreakpoint('set');

      // Verify through execution (would trigger debugger in real environment)
      expect(() => commandSystem.debug.setBreakpoint('test')).not.toThrow();
    });
  });

  describe('Debug Mode and Tracing', () => {
    it('should log debug information when enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await commandSystem.execute('set', ['x', 'to', '1'], {
        debug: true,
        trace: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Command Debug]'),
        expect.any(String),
        expect.objectContaining({ traceId: expect.any(String) })
      );

      consoleSpy.mockRestore();
    });

    it('should generate unique trace IDs', async () => {
      const result1 = await commandSystem.execute('set', ['x', 'to', '1'], { trace: true });
      const result2 = await commandSystem.execute('set', ['y', 'to', '2'], { trace: true });

      expect(result1.context.traceId).toBeDefined();
      expect(result2.context.traceId).toBeDefined();
      expect(result1.context.traceId).not.toBe(result2.context.traceId);
    });
  });

  describe('Performance Profiling Integration', () => {
    it('should profile command execution when enabled', async () => {
      commandSystem.performance.enable();
      commandSystem.performance.clearMetrics();

      const result = await commandSystem.execute('set', ['x', 'to', '1'], { profile: true });

      expect(result.success).toBe(true);

      const stats = commandSystem.performance.getStats('set');
      expect(stats).toBeDefined();
      expect(stats?.executionCount).toBe(1);
      expect(stats?.averageTime).toBeGreaterThan(0);

      commandSystem.performance.disable();
    });

    it('should not profile when profiling is disabled', async () => {
      commandSystem.performance.disable();
      commandSystem.performance.clearMetrics();

      await commandSystem.execute('set', ['x', 'to', '1'], { profile: true });

      const stats = commandSystem.performance.getStats('set');
      expect(stats).toBeNull();
    });

    it('should access performance utilities', () => {
      expect(commandSystem.performance.enable).toBeDefined();
      expect(commandSystem.performance.disable).toBeDefined();
      expect(commandSystem.performance.getStats).toBeDefined();
      expect(commandSystem.performance.identifyBottlenecks).toBeDefined();
      expect(commandSystem.performance.generateOptimizations).toBeDefined();
      expect(commandSystem.performance.generateReport).toBeDefined();
    });

    it('should profile both successful and failed commands', async () => {
      commandSystem.performance.enable();
      commandSystem.performance.clearMetrics();

      // Success case
      await commandSystem.execute('set', ['x', 'to', '1'], { profile: true });

      // Error case
      await commandSystem.execute('nonExistentCommand', [], { profile: true });

      const allStats = commandSystem.performance.getStats();
      expect(allStats.length).toBeGreaterThan(0);

      commandSystem.performance.disable();
    });
  });

  describe('History Management', () => {
    it('should limit history size', async () => {
      // Execute many commands to exceed history limit
      for (let i = 0; i < 1005; i++) {
        await commandSystem.execute('set', [`var${i}`, 'to', i.toString()]);
      }

      const history = commandSystem.getHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should retrieve limited history', async () => {
      for (let i = 0; i < 10; i++) {
        await commandSystem.execute('set', [`var${i}`, 'to', i.toString()]);
      }

      const limitedHistory = commandSystem.getHistory(5);
      expect(limitedHistory).toHaveLength(5);
      expect(limitedHistory[0].context.args[0]).toBe('var5');
      expect(limitedHistory[4].context.args[0]).toBe('var9');
    });
  });
});

describe('Command Context Manager', () => {
  let contextManager: CommandContextManager;

  beforeEach(() => {
    contextManager = new CommandContextManager();
  });

  it('should create default context', () => {
    const context = contextManager.getContext();

    expect(context.me).toBeNull();
    expect(context.locals).toBeInstanceOf(Map);
    expect(context.halted).toBe(false);
    expect(context.evaluationHistory).toEqual([]);
  });

  it('should update context properties', () => {
    contextManager.updateContext('test', {
      me: document.createElement('div'),
      result: 42,
    });

    const context = contextManager.getContext('test');
    expect(context.me).toBeInstanceOf(HTMLElement);
    expect(context.result).toBe(42);
  });

  it('should maintain separate contexts', () => {
    const ctx1 = contextManager.getContext('ctx1');
    const ctx2 = contextManager.getContext('ctx2');

    ctx1.locals.set('x', 1);
    ctx2.locals.set('x', 2);

    expect(contextManager.getContext('ctx1').locals.get('x')).toBe(1);
    expect(contextManager.getContext('ctx2').locals.get('x')).toBe(2);
  });
});

describe('Command Error Handler', () => {
  let errorHandler: CommandErrorHandler;

  beforeEach(() => {
    errorHandler = new CommandErrorHandler();
  });

  it('should create detailed error report', () => {
    const error = new Error('Test error');
    const result: CommandExecutionResult = {
      success: false,
      error,
      executionTime: 100,
      context: {
        commandName: 'testCommand',
        args: ['arg1', 'arg2'],
        timestamp: Date.now(),
        traceId: 'test-trace-123',
      },
    };

    const report = errorHandler.createErrorReport(error, result);

    expect(report).toContain('Command Execution Error Report');
    expect(report).toContain('testCommand');
    expect(report).toContain('test-trace-123');
    expect(report).toContain('Test error');
    expect(report).toContain('arg1');
  });

  it('should use command-specific handler', () => {
    const handler = vi.fn();
    errorHandler.registerErrorHandler('test', handler);

    const error = new Error('Test');
    errorHandler.handleError(error, 'test', {});

    expect(handler).toHaveBeenCalledWith(error, {});
  });

  it('should fall back to global handler', () => {
    const globalHandler = vi.fn();
    errorHandler.setGlobalErrorHandler(globalHandler);

    const error = new Error('Test');
    errorHandler.handleError(error, 'unknown', {});

    expect(globalHandler).toHaveBeenCalledWith(error, {});
  });
});

describe('Command Debugger', () => {
  let commandDebugger: CommandDebugger;

  beforeEach(() => {
    commandDebugger = new CommandDebugger();
  });

  it('should manage breakpoints', () => {
    commandDebugger.setBreakpoint('cmd1');
    commandDebugger.setBreakpoint('cmd2');

    expect(commandDebugger.shouldBreak('cmd1')).toBe(true);
    expect(commandDebugger.shouldBreak('cmd2')).toBe(true);
    expect(commandDebugger.shouldBreak('cmd3')).toBe(false);

    commandDebugger.removeBreakpoint('cmd1');
    expect(commandDebugger.shouldBreak('cmd1')).toBe(false);
  });

  it('should handle step mode', () => {
    commandDebugger.setStepMode(true);

    expect(commandDebugger.shouldBreak('anyCommand')).toBe(true);

    commandDebugger.setStepMode(false);
    expect(commandDebugger.shouldBreak('anyCommand')).toBe(false);
  });

  it('should log watched commands', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    commandDebugger.watchCommand('test');
    commandDebugger.logIfWatched('test', 'start', { data: 'test' });

    expect(consoleSpy).toHaveBeenCalledWith('[Command Watch] test - start:', { data: 'test' });

    commandDebugger.logIfWatched('other', 'start', {});
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
