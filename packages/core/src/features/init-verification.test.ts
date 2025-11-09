/**
 * Verification test to isolate the complex initialization issue
 * This replicates the exact same scenario without fake timers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initFeature } from './init';
import { createMockHyperscriptContext, createTestElement } from '../test-setup';
import { ExecutionContext } from '../types/core';

describe('Init Feature - Complex Initialization Verification', () => {
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    testElement = createTestElement('<div>Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  it('VERIFICATION: should set attribute immediately without fake timers', async () => {
    // Same exact commands as the failing test
    const commands = [
      { type: 'command', name: 'add', args: ['.initializing'] },
      { type: 'command', name: 'set', args: ['attribute', 'data-version', '1.0'] },
      // No wait command - test immediate execution
    ];
    initFeature.registerElement(testElement, commands, false);

    // Process completely and wait
    await initFeature.processElement(testElement, context);

    // Both should work
    expect(testElement.classList.contains('initializing')).toBe(true);
    expect(testElement.getAttribute('data-version')).toBe('1.0');
  });

  it('VERIFICATION: should set attribute with wait command but no fake timers', async () => {
    // Same exact commands as the failing test
    const commands = [
      { type: 'command', name: 'add', args: ['.initializing'] },
      { type: 'command', name: 'set', args: ['attribute', 'data-version', '1.0'] },
      { type: 'command', name: 'wait', args: [10] },
      { type: 'command', name: 'remove', args: ['.initializing'] },
      { type: 'command', name: 'add', args: ['.initialized'] },
    ];
    initFeature.registerElement(testElement, commands, false);

    // Process completely and wait (with real timers)
    await initFeature.processElement(testElement, context);

    // All should work after completion
    expect(testElement.classList.contains('initialized')).toBe(true);
    expect(testElement.getAttribute('data-version')).toBe('1.0');
    expect(testElement.classList.contains('initializing')).toBe(false);
  });

  it('VERIFICATION: compare working attribute test vs failing one', async () => {
    // This is from the working test "should execute set commands for attributes and variables"
    const workingCommands = [
      { type: 'command', name: 'set', args: ['attribute', 'data-init', 'completed'] },
    ];

    // This is from the failing test
    const failingCommands = [
      { type: 'command', name: 'set', args: ['attribute', 'data-version', '1.0'] },
    ];

    // Test working pattern
    const workingElement = createTestElement('<div>Working</div>');
    initFeature.registerElement(workingElement, workingCommands, false);
    await initFeature.processElement(workingElement, context);
    expect(workingElement.getAttribute('data-init')).toBe('completed');

    // Test failing pattern
    const failingElement = createTestElement('<div>Failing</div>');
    initFeature.registerElement(failingElement, failingCommands, false);
    await initFeature.processElement(failingElement, context);
    expect(failingElement.getAttribute('data-version')).toBe('1.0');
  });
});
