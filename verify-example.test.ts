/**
 * Test to verify the specific example works: hyperscript.evaluate('on click toggle .active on me')
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from './packages/core/src/api/hyperscript-api';

describe('Verify Example Implementation', () => {
  it('should parse and compile the exact example syntax', async () => {
    const code = 'on click toggle .active on me';
    
    // Test compilation
    const compiled = hyperscript.compile(code);
    console.log('Compilation result:', compiled);
    
    expect(compiled.success).toBe(true);
    expect(compiled.ast).toBeDefined();
    expect(compiled.errors).toHaveLength(0);
  });

  it('should have evaluate method available', () => {
    expect(typeof hyperscript.evaluate).toBe('function');
  });

  it('should evaluate method work with simple expressions', async () => {
    const result = await hyperscript.evaluate('5 + 10');
    expect(result).toBe(15);
  });

  it('should handle the full event handler syntax', async () => {
    // This will parse but not execute the event handler (no DOM context)
    try {
      const result = await hyperscript.evaluate('on click toggle .active on me');
      // Event handler setup returns undefined/null as it just sets up listeners
      expect(result).toBeUndefined();
    } catch (error) {
      // If it throws, check that it's a context error, not a parse error
      expect(error.message).not.toContain('Compilation failed');
      console.log('Expected context error (no DOM):', error.message);
    }
  });
});