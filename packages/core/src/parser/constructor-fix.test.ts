import { describe, it, expect } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';

describe('Constructor Call Fix', () => {
  describe('Event Handler Compilation', () => {
    it('should compile event handlers with constructor calls', () => {
      const result = hyperscript.compile('on click set #output\'s textContent to new Date()');
      
      // For now, let's just check what the actual error is
      if (!result.success) {
        throw new Error(`Compilation failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }
    });

    it('should compile event handlers with other constructor calls', () => {
      const result = hyperscript.compile('on click set #result\'s textContent to new Array()');
      
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should still compile direct constructor calls', () => {
      const result = hyperscript.compile('set #output\'s textContent to new Date()');
      
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle Date() as function call if no new keyword', () => {
      const result = hyperscript.compile('on click set #output\'s textContent to Date()');
      
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Debugging Output', () => {
    it('should provide detailed error information when compilation fails', () => {
      // Test with intentionally broken syntax to see our enhanced error reporting
      const result = hyperscript.compile('on click set #output\'s textContent to InvalidConstructor(');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // The error should contain position information due to our enhanced debugging
      expect(result.errors[0].message).toContain('position');
    });
  });
});