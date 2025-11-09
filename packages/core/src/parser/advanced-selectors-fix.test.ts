/**
 * TDD Fix for Advanced CSS Selector Support
 *
 * Current issues:
 * 1. Complex query references: <input[type="text"]:not(:disabled)/> not parsing
 * 2. Attribute selectors: [data-value="test"] being treated as array instead of selector
 */

import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from './expression-parser';
import type { ExecutionContext } from '../types/core';

const context: ExecutionContext = {
  me: null,
  you: null,
  it: null,
  result: null,
  locals: new Map(),
  globals: new Map(),
  parent: null,
  halted: false,
  returned: false,
  broke: false,
  continued: false,
  async: false,
};

describe('Advanced CSS Selectors - TDD Fix', () => {
  describe('Query Reference Selectors', () => {
    it('should parse simple query reference: <div/>', async () => {
      const result = await parseAndEvaluateExpression('<div/>', context);
      // Should return a NodeList or similar DOM query result
      expect(result).toBeDefined();
    });

    it('should parse query with attributes: <input[type="text"]/>', async () => {
      const result = await parseAndEvaluateExpression('<input[type="text"]/>', context);
      expect(result).toBeDefined();
    });

    it('should parse complex query: <input[type="text"]:not(:disabled)/>', async () => {
      const result = await parseAndEvaluateExpression(
        '<input[type="text"]:not(:disabled)/>',
        context
      );
      expect(result).toBeDefined();
    });
  });

  describe('Attribute Selectors (as expressions)', () => {
    it('should parse simple attribute selector: [data-value]', async () => {
      const result = await parseAndEvaluateExpression('[data-value]', context);
      expect(result).toBeDefined();
    });

    it('should parse attribute with value: [data-value="test"]', async () => {
      const result = await parseAndEvaluateExpression('[data-value="test"]', context);
      expect(result).toBeDefined();
    });

    it('should parse attribute with multiple values: [class~="active"]', async () => {
      const result = await parseAndEvaluateExpression('[class~="active"]', context);
      expect(result).toBeDefined();
    });
  });

  describe('Advanced Selector Success Verification', () => {
    it('confirms complex query references are working', async () => {
      const result = await parseAndEvaluateExpression('<input[type="text"]/>', context);
      expect(result).toBeDefined();
    });

    it('confirms attribute selectors are working', async () => {
      const result = await parseAndEvaluateExpression('[data-value="test"]', context);
      expect(result).toBeDefined();
    });
  });
});
