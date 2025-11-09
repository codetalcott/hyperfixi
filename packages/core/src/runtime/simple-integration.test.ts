/**
 * Simple Integration Test
 * Verifies basic enhanced command integration works
 */

import { describe, it, expect } from 'vitest';
import { Runtime } from './runtime';
import { ContextBridge, EnhancedCommandRegistry } from './command-adapter';

describe('Simple Integration Test', () => {
  it('should create runtime with enhanced commands enabled', () => {
    const runtime = new Runtime({ useEnhancedCommands: true });
    expect(runtime.isUsingEnhancedCommands()).toBe(true);
  });

  it('should create runtime with enhanced commands disabled', () => {
    const runtime = new Runtime({ useEnhancedCommands: false });
    expect(runtime.isUsingEnhancedCommands()).toBe(false);
  });

  it('should have ContextBridge functionality', () => {
    const context = {
      me: null,
      it: null,
      you: null,
      result: undefined,
      event: undefined,
    };

    const typedContext = ContextBridge.toTyped(context);
    expect(typedContext.validationMode).toBe('strict');
    expect(Array.isArray(typedContext.errors)).toBe(true);
  });

  it('should create enhanced command registry', () => {
    const registry = new EnhancedCommandRegistry();
    expect(registry.getCommandNames()).toEqual([]);
  });

  it('should provide available commands list', () => {
    const runtime = new Runtime({ useEnhancedCommands: true });
    const commands = runtime.getAvailableCommands();

    // Should at least have basic legacy commands
    expect(commands).toContain('hide');
    expect(commands).toContain('show');
    expect(commands).toContain('put');
    expect(commands).toContain('set');
  });
});
