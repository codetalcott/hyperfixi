/**
 * Simple Deno Integration Tests
 * Tests the simplified Deno-compatible module
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.210.0/assert/mod.ts';
import {
  isDeno,
  isNode,
  isBrowser,
  getRuntimeInfo,
  getLLMRuntimeInfo,
  createMinimalRuntime,
  HideCommand,
  createHideCommand,
  logger,
  performance,
} from './deno-mod.ts';

// ============================================================================
// Environment Detection Tests
// ============================================================================

Deno.test('Environment Detection - Should detect Deno runtime', () => {
  assertEquals(isDeno, true);
  assertEquals(isNode, false);
  assertEquals(isBrowser, false);
});

Deno.test('Runtime Info - Should provide correct Deno info', () => {
  const info = getRuntimeInfo();

  assertEquals(info.name, 'deno');
  assertEquals(info.typescript, true);
  assertExists(info.version);
});

Deno.test('LLM Runtime Info - Should provide enhanced info for LLM agents', () => {
  const info = getLLMRuntimeInfo();

  assertEquals(info.runtime, 'deno');
  assertEquals(info.typescript, true);
  assertEquals(info.features.builtinTypescript, true);
  assertEquals(info.features.jsr, true);
  assertEquals(info.patterns.imports, 'url-based');
  assertEquals(info.patterns.testing, 'deno-test');
});

// ============================================================================
// Command Tests
// ============================================================================

Deno.test('Hide Command - Should instantiate correctly', () => {
  const hideCommand = new HideCommand();

  assertEquals(hideCommand.name, 'hide');
  assertEquals(hideCommand.syntax, 'hide [<target-expression>]');
  assertEquals(hideCommand.outputType, 'element-list');
  assertEquals(hideCommand.metadata.category, 'dom-manipulation');
  assertEquals(hideCommand.metadata.complexity, 'simple');
});

Deno.test('Hide Command - Should validate inputs', () => {
  const hideCommand = new HideCommand();

  // Valid: no arguments
  const validResult1 = hideCommand.validate([]);
  assertEquals(validResult1.isValid, true);
  assertEquals(validResult1.errors.length, 0);

  // Valid: one argument
  const validResult2 = hideCommand.validate(['#test']);
  assertEquals(validResult2.isValid, true);

  // Invalid: too many arguments
  const invalidResult = hideCommand.validate(['arg1', 'arg2']);
  assertEquals(invalidResult.isValid, false);
  assertEquals(invalidResult.errors.length, 1);
  assertEquals(invalidResult.errors[0].type, 'invalid-arguments');
});

Deno.test('Factory Function - Should create hide command', () => {
  const hideCommand = createHideCommand();

  assertExists(hideCommand);
  assertEquals(hideCommand.name, 'hide');
  assertEquals(typeof hideCommand.execute, 'function');
  assertEquals(typeof hideCommand.validate, 'function');
});

// ============================================================================
// Runtime Tests
// ============================================================================

Deno.test('Minimal Runtime - Should create and manage commands', () => {
  const runtime = createMinimalRuntime();

  assertExists(runtime.commands);
  assertEquals(runtime.environment.name, 'deno');
  assertEquals(runtime.listCommands().length, 0);

  // Add command
  const hideCommand = new HideCommand();
  runtime.addCommand(hideCommand);

  assertEquals(runtime.listCommands().length, 1);
  assertEquals(runtime.listCommands()[0], 'hide');

  // Get command
  const retrievedCommand = runtime.getCommand('hide');
  assertExists(retrievedCommand);
  assertEquals(retrievedCommand.name, 'hide');
});

// ============================================================================
// Utility Tests
// ============================================================================

Deno.test('Logger - Should provide logging functions', () => {
  assertExists(logger.info);
  assertExists(logger.warn);
  assertExists(logger.error);
  assertExists(logger.debug);

  // These shouldn't throw
  logger.info('Test info message');
  logger.warn('Test warning message');
  logger.error('Test error message');
  logger.debug('Test debug message');
});

Deno.test('Performance - Should provide timing functions', () => {
  assertExists(performance.now);
  assertExists(performance.mark);
  assertExists(performance.measure);

  const start = performance.now();
  assertEquals(typeof start, 'number');
  assertEquals(start > 0, true);

  // These shouldn't throw
  performance.mark('test-mark');
  performance.measure('test-measure');
});

// ============================================================================
// TypeScript Integration Tests
// ============================================================================

Deno.test('TypeScript - Should have proper type information', () => {
  const hideCommand = new HideCommand();

  // Verify metadata structure
  assertEquals(typeof hideCommand.metadata, 'object');
  assertEquals(Array.isArray(hideCommand.metadata.sideEffects), true);
  assertEquals(Array.isArray(hideCommand.metadata.examples), true);
  assertEquals(Array.isArray(hideCommand.metadata.relatedCommands), true);

  // Verify documentation structure
  assertEquals(typeof hideCommand.documentation, 'object');
  assertEquals(typeof hideCommand.documentation.summary, 'string');
  assertEquals(Array.isArray(hideCommand.documentation.parameters), true);
  assertEquals(Array.isArray(hideCommand.documentation.examples), true);
  assertEquals(Array.isArray(hideCommand.documentation.tags), true);
});

// ============================================================================
// Execution Tests (Simulated)
// ============================================================================

Deno.test('Hide Command - Should handle execution without DOM', async () => {
  const hideCommand = new HideCommand();

  const mockContext = {
    me: null,
    you: null,
    it: null,
    locals: new Map(),
    globals: new Map(),
    result: null,
  };

  // Should not throw even without DOM
  const result = await hideCommand.execute(mockContext);

  assertEquals(result.success, true);
  assertEquals(Array.isArray(result.value), true);
  assertEquals(result.value?.length, 0); // No elements to hide
  assertEquals(result.type, 'element-list');
});

// ============================================================================
// Bundle Size Tests
// ============================================================================

Deno.test('Bundle Information - Should provide LLM metadata', () => {
  const hideCommand = createHideCommand();

  // Check that LLM-friendly documentation exists
  assertExists(hideCommand.documentation.summary);
  assertEquals(hideCommand.documentation.summary.length > 0, true);

  // Check parameters documentation
  assertEquals(hideCommand.documentation.parameters.length, 1);
  assertEquals(hideCommand.documentation.parameters[0].name, 'target');
  assertEquals(hideCommand.documentation.parameters[0].optional, true);

  // Check examples
  assertEquals(hideCommand.documentation.examples.length, 1);
  assertExists(hideCommand.documentation.examples[0].title);
  assertExists(hideCommand.documentation.examples[0].code);

  // Check tags for categorization
  assertEquals(Array.isArray(hideCommand.documentation.tags), true);
  assertEquals(hideCommand.documentation.tags.includes('dom'), true);
});
