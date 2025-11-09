/**
 * TDD Tests for LOG Command
 * Based on _hyperscript/test/commands/log.js patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll need to create these modules
import { executeCommand } from './command-executor';
import type { ExecutionContext } from '../types/core';

describe('LOG Command', () => {
  let consoleSpy: any;
  let context: ExecutionContext;

  beforeEach(() => {
    // Mock console.log to capture output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Set up basic execution context
    context = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
    };
  });

  it('should log a string literal', async () => {
    await executeCommand('log "hello world"', context);
    expect(consoleSpy).toHaveBeenCalledWith('hello world');
  });

  it('should log a variable', async () => {
    context.locals.set('myVar', 'test value');
    await executeCommand('log myVar', context);
    expect(consoleSpy).toHaveBeenCalledWith('test value');
  });

  it('should log a number', async () => {
    await executeCommand('log 42', context);
    expect(consoleSpy).toHaveBeenCalledWith(42);
  });

  it('should log the result of an expression', async () => {
    await executeCommand('log 2 + 3', context);
    expect(consoleSpy).toHaveBeenCalledWith(5);
  });

  it('should log property access', async () => {
    const testObj = { name: 'test', value: 123 };
    context.locals.set('obj', testObj);
    await executeCommand("log obj's name", context);
    expect(consoleSpy).toHaveBeenCalledWith('test');
  });

  it('should log multiple values', async () => {
    await executeCommand('log "hello", 42, true', context);
    expect(consoleSpy).toHaveBeenCalledWith('hello', 42, true);
  });

  it('should log context variables', async () => {
    const testElement = document.createElement('div');
    testElement.textContent = 'test content';
    context.me = testElement;

    await executeCommand('log me', context);
    expect(consoleSpy).toHaveBeenCalledWith(testElement);
  });

  it('should handle null/undefined values', async () => {
    context.locals.set('nullVar', null);
    context.locals.set('undefinedVar', undefined);

    await executeCommand('log nullVar', context);
    expect(consoleSpy).toHaveBeenCalledWith(null);

    await executeCommand('log undefinedVar', context);
    expect(consoleSpy).toHaveBeenCalledWith(undefined);
  });

  it('should handle async expressions', async () => {
    // Mock an async function
    const asyncFunc = vi.fn().mockResolvedValue('async result');
    context.globals.set('asyncFunc', asyncFunc);

    await executeCommand('log asyncFunc()', context);
    expect(consoleSpy).toHaveBeenCalledWith('async result');
  });

  it('should support complex expressions', async () => {
    context.locals.set('x', 10);
    context.locals.set('y', 5);

    await executeCommand('log x > y', context);
    expect(consoleSpy).toHaveBeenCalledWith(true);
  });
});
