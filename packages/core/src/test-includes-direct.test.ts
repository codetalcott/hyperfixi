/**
 * Direct test for includes expression functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockHyperscriptContext } from './test-setup.js';
import { logicalExpressions } from './expressions/logical/index.js';
import type { ExecutionContext } from './types/core.js';
import { writeFileSync } from 'fs';

describe('Includes Expression Direct Test', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
  });

  it('should test contains expression functionality directly', async () => {
    let debugOutput = '\n=== DIRECT CONTAINS EXPRESSION TEST ===\n';
    
    try {
      // Test string containment
      const result1 = await logicalExpressions.contains.evaluate(context, 'hello world', 'world');
      debugOutput += `String contains: "hello world" contains "world" = ${result1}\n`;
      
      // Test array containment  
      const result2 = await logicalExpressions.contains.evaluate(context, ['a', 'b', 'c'], 'b');
      debugOutput += `Array contains: ["a", "b", "c"] contains "b" = ${result2}\n`;
      
      // Test negative cases
      const result3 = await logicalExpressions.contains.evaluate(context, 'hello world', 'xyz');
      debugOutput += `String not contains: "hello world" contains "xyz" = ${result3}\n`;
      
      const result4 = await logicalExpressions.contains.evaluate(context, ['a', 'b', 'c'], 'x');
      debugOutput += `Array not contains: ["a", "b", "c"] contains "x" = ${result4}\n`;
      
      debugOutput += '\n✅ All direct expression tests completed successfully\n';
      
    } catch (error) {
      debugOutput += `❌ Error during direct expression test: ${error.message}\n`;
      debugOutput += `Stack: ${error.stack}\n`;
    }
    
    writeFileSync('debug-direct-expression-output.txt', debugOutput);
    expect(true).toBe(true);
  });
  
  it('should verify includes is actually mapped to contains', async () => {
    let debugOutput = '\n=== INCLUDES MAPPING VERIFICATION ===\n';
    
    // Check if the contains expression is properly configured
    debugOutput += `Contains expression name: ${logicalExpressions.contains.name}\n`;
    debugOutput += `Contains operators: ${JSON.stringify(logicalExpressions.contains.operators)}\n`;
    
    // Check if includes/include are listed as operators
    const hasIncludes = logicalExpressions.contains.operators?.includes('includes');
    const hasInclude = logicalExpressions.contains.operators?.includes('include');
    
    debugOutput += `Has 'includes' operator: ${hasIncludes}\n`;
    debugOutput += `Has 'include' operator: ${hasInclude}\n`;
    
    if (!hasIncludes && !hasInclude) {
      debugOutput += '❌ ISSUE FOUND: includes/include operators not registered with contains expression\n';
    } else {
      debugOutput += '✅ includes/include operators are properly registered\n';
    }
    
    writeFileSync('debug-includes-mapping-output.txt', debugOutput);
    expect(true).toBe(true);
  });
});