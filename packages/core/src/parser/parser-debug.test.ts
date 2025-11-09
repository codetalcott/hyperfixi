/**
 * Focused test to understand parser API and fix type mismatches
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Parser API Investigation', () => {
  it('should understand actual parser return structure', () => {
    // Test basic literal
    const result1 = parse('42');
    console.log('42 result:', JSON.stringify(result1, null, 2));

    // Let's check the structure by asserting on known properties
    expect(result1.success).toBeDefined();
    if (result1.success) {
      expect(result1.node?.type).toBeDefined();
      expect(result1.node?.type).toBe('literal'); // Based on previous failures
    }

    // Test binary expression
    const result2 = parse('x + y');
    console.log('x + y result:', JSON.stringify(result2, null, 2));

    if (result2.success) {
      expect(result2.node?.type).toBe('binaryExpression'); // Based on previous failures
    }

    // Just pass for now to see output
    expect(true).toBe(true);
  });
});
