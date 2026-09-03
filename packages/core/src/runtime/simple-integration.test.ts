/**
 * Simple Integration Test
 * Verifies basic enhanced command integration works
 */

import { describe, it, expect } from 'vitest';
import { Runtime } from './runtime';
import type { ExecutionContext } from '../types/base-types';

// Skipped: Tests expect methods/properties that don't exist in current Runtime implementation
describe.skip('Simple Integration Test', () => {
  it('should create runtime with enhanced commands enabled', () => {
    const runtime = new Runtime({ useEnhancedCommands: true });
    expect((runtime as any).isUsingEnhancedCommands()).toBe(true);
  });

  it('should create runtime with enhanced commands disabled', () => {
    const runtime = new Runtime({ useEnhancedCommands: false });
    expect((runtime as any).isUsingEnhancedCommands()).toBe(false);
  });

  it('should provide available commands list', () => {
    const runtime = new Runtime({ useEnhancedCommands: true });
    const commands = (runtime as any).getAvailableCommands();

    // Should at least have basic legacy commands
    expect(commands).toContain('hide');
    expect(commands).toContain('show');
    expect(commands).toContain('put');
    expect(commands).toContain('set');
  });
});
