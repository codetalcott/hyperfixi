/**
 * Advanced Pattern Coverage Tests
 * Test template literals, nested access, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser';
import type { ExecutionContext } from '../types/core';

describe('Advanced Pattern Coverage', () => {
  let context: ExecutionContext;
  let testContainer: HTMLElement;

  beforeEach(() => {
    testContainer = document.createElement('div');
    testContainer.innerHTML = `
      <div id="app" data-title="My App">
        <input type="text" name="search" value="test query" placeholder="Search...">
        <div class="results" data-count="3">
          <div class="item" data-id="1">Item 1</div>
          <div class="item" data-id="2">Item 2</div>
          <div class="item" data-id="3">Item 3</div>
        </div>
      </div>
    `;
    document.body.appendChild(testContainer);

    context = {
      me: testContainer.querySelector('#app') as HTMLElement,
      you: testContainer.querySelector('.results') as HTMLElement,
      it: testContainer.querySelector('input') as HTMLElement,
      result: null,
      locals: new Map([
        ['appName', 'TestApp'],
        ['version', '1.2.3'],
        ['config', { 
          theme: 'dark', 
          features: { search: true, notifications: false },
          users: [
            { name: 'Alice', role: 'admin' },
            { name: 'Bob', role: 'user' }
          ]
        }]
      ]),
      globals: new Map([
        ['window', { location: { href: 'http://localhost:3000' } }]
      ]),
      parent: null,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false
    };
  });

  afterEach(() => {
    if (testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });

  describe('Template Literals and Interpolation', () => {
    it('should handle template literals with variables', async () => {
      const result = await parseAndEvaluateExpression('`Hello ${appName}`', context);
      expect(result).toBe('Hello TestApp');
    });

    it('should handle template literals with complex expressions', async () => {
      const result = await parseAndEvaluateExpression('`Version: ${version} - Theme: ${config.theme}`', context);
      expect(result).toBe('Version: 1.2.3 - Theme: dark');
    });

    it('should handle nested template literals', async () => {
      const result = await parseAndEvaluateExpression('`App: ${`${appName} v${version}`}`', context);
      expect(result).toBe('App: TestApp v1.2.3');
    });

    it('should handle template literals with function calls', async () => {
      // This tests advanced interpolation capabilities
      const result = await parseAndEvaluateExpression('`Length: ${appName.length}`', context);
      expect(result).toBe('Length: 7');
    });
  });

  describe('Deep Object Property Access', () => {
    it('should handle nested object property access', async () => {
      expect(await parseAndEvaluateExpression('config.theme', context)).toBe('dark');
      expect(await parseAndEvaluateExpression('config.features.search', context)).toBe(true);
      expect(await parseAndEvaluateExpression('config.features.notifications', context)).toBe(false);
    });

    it('should handle array access with object properties', async () => {
      expect(await parseAndEvaluateExpression('config.users[0].name', context)).toBe('Alice');
      expect(await parseAndEvaluateExpression('config.users[1].role', context)).toBe('user');
    });

    it('should handle computed property access', async () => {
      // This tests dynamic property access
      const result = await parseAndEvaluateExpression('config.users[0]["name"]', context);
      expect(result).toBe('Alice');
    });

    it('should handle method calls on nested objects', async () => {
      const result = await parseAndEvaluateExpression('config.users.length', context);
      expect(result).toBe(2);
    });
  });

  describe('Advanced CSS Selector Patterns', () => {
    it('should handle complex attribute selectors', async () => {
      const result = await parseAndEvaluateExpression('<[data-id][class*="item"]/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(3);
    });

    it('should handle pseudo-class selectors', async () => {
      const result = await parseAndEvaluateExpression('<.item:first-child/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1);
    });

    it('should handle descendant combinators', async () => {
      const result = await parseAndEvaluateExpression('<.results .item/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(3);
    });

    it('should handle attribute value selectors', async () => {
      const result = await parseAndEvaluateExpression('<[data-id="2"]/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1);
    });
  });

  describe('Expression Composition and Chaining', () => {
    it('should handle chained property access', async () => {
      const result = await parseAndEvaluateExpression('config.users[0].name.length', context);
      expect(result).toBe(5); // "Alice".length
    });

    it('should handle property access on CSS selector results', async () => {
      // Note: This might not work exactly like this, but tests the concept
      const result = await parseAndEvaluateExpression('my.querySelector("input").value', context);
      expect(result).toBe('test query');
    });

    it('should handle possessive syntax with complex expressions', async () => {
      const result = await parseAndEvaluateExpression("config's theme", context);
      expect(result).toBe('dark');
    });

    it('should handle type conversion on complex expressions', async () => {
      const result = await parseAndEvaluateExpression('config.users.length as String', context);
      expect(result).toBe('2');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null-safe property access', async () => {
      // This should not throw, but return null gracefully
      const result = await parseAndEvaluateExpression('config.nonexistent.property', context);
      expect(result).toBe(null);
    });

    it('should handle undefined variable gracefully', async () => {
      const result = await parseAndEvaluateExpression('nonExistentVar', context);
      expect(result).toBe(null);
    });

    it('should handle empty expressions', async () => {
      await expect(parseAndEvaluateExpression('', context)).rejects.toThrow();
    });

    it('should handle malformed expressions gracefully', async () => {
      await expect(parseAndEvaluateExpression('(((', context)).rejects.toThrow();
    });
  });

  describe('Performance and Complex Scenarios', () => {
    it('should handle deeply nested expressions efficiently', async () => {
      const complexExpr = 'config.features.search and config.users.length > 0 and appName.length > 3';
      const result = await parseAndEvaluateExpression(complexExpr, context);
      expect(result).toBe(true);
    });

    it('should handle mixed expression types', async () => {
      const mixedExpr = '`Count: ${config.users.length}` + " - " + (config.theme as String)';
      const result = await parseAndEvaluateExpression(mixedExpr, context);
      expect(result).toBe('Count: 2 - dark');
    });

    it('should handle large template literals', async () => {
      const largeTemplate = '`App: ${appName}, Version: ${version}, Theme: ${config.theme}, Users: ${config.users.length}, Search: ${config.features.search}`';
      const result = await parseAndEvaluateExpression(largeTemplate, context);
      expect(result).toBe('App: TestApp, Version: 1.2.3, Theme: dark, Users: 2, Search: true');
    });
  });

  describe('Hyperscript-Specific Features', () => {
    it('should handle "in" operator with arrays', async () => {
      const result = await parseAndEvaluateExpression('"Alice" in config.users[0].name', context);
      expect(result).toBe(true);
    });

    it('should handle "matches" operator', async () => {
      const result = await parseAndEvaluateExpression('appName matches "Test.*"', context);
      expect(result).toBe(true);
    });

    it('should handle "contains" operator', async () => {
      const result = await parseAndEvaluateExpression('appName contains "Test"', context);
      expect(result).toBe(true);
    });

    it('should handle multiple comparison operators', async () => {
      const result = await parseAndEvaluateExpression('config.users.length > 1 and config.users.length < 5', context);
      expect(result).toBe(true);
    });
  });
});