/**
 * Deno Integration Tests
 * Tests HyperFixi compatibility with Deno runtime
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.210.0/assert/mod.ts';
import {
  isDeno,
  isNode,
  isBrowser,
  getEnvironmentInfo,
  createMinimalRuntime,
  HideCommand,
  createHideCommand,
} from './mod.ts';

// ============================================================================
// Environment Detection Tests
// ============================================================================

Deno.test('Environment Detection - Should detect Deno runtime', () => {
  assertEquals(isDeno, true);
  assertEquals(isNode, false);
  assertEquals(isBrowser, false);
});

Deno.test('Environment Info - Should provide correct runtime info', () => {
  const info = getEnvironmentInfo();

  assertEquals(info.runtime, 'deno');
  assertEquals(info.typescript, true);
  assertEquals(info.version, '1.0.0');
  assertExists(info.hasWebAPIs);
});

// ============================================================================
// Module Import Tests
// ============================================================================

Deno.test('Module Imports - Should import core modules without errors', () => {
  // Test that all core imports work
  assertExists(HideCommand);
  assertExists(createHideCommand);
  assertExists(createMinimalRuntime);
});

Deno.test('Factory Functions - Should create runtime successfully', () => {
  const runtime = createMinimalRuntime();

  assertExists(runtime.commands);
  assertExists(runtime.expressions);
  assertExists(runtime.environment);
  assertEquals(runtime.environment.runtime, 'deno');
});

// ============================================================================
// Command Instantiation Tests
// ============================================================================

Deno.test('Hide Command - Should instantiate with TypeScript types', () => {
  const hideCommand = new HideCommand();

  assertEquals(hideCommand.name, 'hide');
  assertEquals(hideCommand.syntax, 'hide [<target-expression>]');
  assertEquals(hideCommand.outputType, 'element-list');
  assertExists(hideCommand.metadata);
  assertExists(hideCommand.documentation);
});

Deno.test('Factory Function - Should create hide command', () => {
  const hideCommand = createHideCommand();

  assertExists(hideCommand);
  assertEquals(hideCommand.name, 'hide');
});

// ============================================================================
// Type Safety Tests
// ============================================================================

Deno.test('TypeScript Integration - Should have proper type information', () => {
  const hideCommand = new HideCommand();

  // Verify TypeScript compile-time information is preserved
  assertEquals(typeof hideCommand.validate, 'function');
  assertEquals(typeof hideCommand.execute, 'function');

  // Verify metadata structure
  assertEquals(hideCommand.metadata.category, 'dom-manipulation');
  assertEquals(hideCommand.metadata.complexity, 'simple');
  assertEquals(Array.isArray(hideCommand.metadata.sideEffects), true);
  assertEquals(Array.isArray(hideCommand.metadata.examples), true);
});

// ============================================================================
// Zod Validation Tests
// ============================================================================

Deno.test('Zod Integration - Should validate inputs correctly', () => {
  const hideCommand = new HideCommand();

  // Test valid inputs
  const validResult = hideCommand.validate([undefined]);
  assertEquals(validResult.isValid, true);

  const validStringResult = hideCommand.validate(['.test']);
  assertEquals(validStringResult.isValid, true);

  // Test multiple arguments (should fail)
  const invalidResult = hideCommand.validate(['arg1', 'arg2']);
  assertEquals(invalidResult.isValid, false);
  assertEquals(invalidResult.errors.length > 0, true);
});

// ============================================================================
// Bundle Size Information Tests
// ============================================================================

Deno.test('Bundle Information - Should provide LLM-friendly metadata', () => {
  const hideCommand = createHideCommand();

  // Verify LLM documentation exists
  assertExists(hideCommand.documentation.summary);
  assertExists(hideCommand.documentation.parameters);
  assertExists(hideCommand.documentation.returns);
  assertExists(hideCommand.documentation.examples);
  assertEquals(Array.isArray(hideCommand.documentation.tags), true);
});

// ============================================================================
// Cross-Platform Compatibility Tests
// ============================================================================

Deno.test('Cross-Platform - Should work with Web APIs', () => {
  // Verify Web APIs are available in Deno
  assertExists(globalThis.CustomEvent);
  assertExists(globalThis.Event);

  // These would be available with --allow-dom flag
  // assertExists(globalThis.document);
  // assertExists(globalThis.window);
});

Deno.test('Import Map - Should resolve imports correctly', async () => {
  // Test that our import map works
  try {
    const { z } = await import('zod');
    assertExists(z);
    assertExists(z.string);
  } catch (error) {
    // If this fails, import map configuration needs adjustment
    throw new Error(`Import map failed: ${error.message}`);
  }
});
