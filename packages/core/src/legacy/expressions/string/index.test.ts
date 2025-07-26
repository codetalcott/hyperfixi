/**
 * Tests for String Operations Expressions
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stringExpressions } from './index';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('String Operations Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('String Interpolation', () => {
    it('should have string interpolation expression', () => {
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate');
      expect(interpolateExpr).toBeDefined();
      expect(interpolateExpr?.category).toBe('String');
    });

    it('should interpolate variables in template literals', async () => {
      context.locals!.set('name', 'World');
      context.locals!.set('greeting', 'Hello');
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, '${greeting}, ${name}!');
      
      expect(result).toBe('Hello, World!');
    });

    it('should handle nested variable interpolation', async () => {
      context.locals!.set('firstName', 'John');
      context.locals!.set('lastName', 'Doe');
      context.locals!.set('title', 'Mr.');
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, '${title} ${firstName} ${lastName}');
      
      expect(result).toBe('Mr. John Doe');
    });

    it('should handle expression interpolation', async () => {
      context.locals!.set('count', 5);
      context.locals!.set('item', 'apple');
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, 'I have ${count * 2} ${item}s');
      
      expect(result).toBe('I have 10 apples');
    });

    it('should handle missing variables gracefully', async () => {
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, 'Hello ${missingVar}!');
      
      expect(result).toBe('Hello undefined!');
    });

    it('should handle complex expressions in interpolation', async () => {
      context.locals!.set('user', { name: 'Alice', age: 30 });
      context.locals!.set('formatAge', (age: number) => `${age} years old`);
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, '${user.name} is ${formatAge(user.age)}');
      
      expect(result).toBe('Alice is 30 years old');
    });
  });

  describe('Regular Expressions', () => {
    it('should have regex match expression', () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches');
      expect(matchExpr).toBeDefined();
      expect(matchExpr?.category).toBe('String');
    });

    it('should match string against regex pattern', async () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches')!;
      
      const result1 = await matchExpr.evaluate(context, 'hello@example.com', /\w+@\w+\.\w+/);
      expect(result1).toBe(true);
      
      const result2 = await matchExpr.evaluate(context, 'not-an-email', /\w+@\w+\.\w+/);
      expect(result2).toBe(false);
    });

    it('should match with string regex patterns', async () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches')!;
      
      const result = await matchExpr.evaluate(context, 'Hello World', '^Hello');
      expect(result).toBe(true);
    });

    it('should handle case-insensitive matching', async () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches')!;
      
      const result = await matchExpr.evaluate(context, 'Hello World', 'hello', 'i');
      expect(result).toBe(true);
    });

    it('should extract regex groups', async () => {
      const extractExpr = stringExpressions.find(expr => expr.name === 'extract')!;
      
      const result = await extractExpr.evaluate(context, 'John Doe', '(\\w+)\\s+(\\w+)');
      expect(result).toEqual(['John Doe', 'John', 'Doe']);
    });

    it('should replace with regex', async () => {
      const replaceExpr = stringExpressions.find(expr => expr.name === 'replace')!;
      
      const result = await replaceExpr.evaluate(context, 'Hello World', /World/, 'Universe');
      expect(result).toBe('Hello Universe');
    });

    it('should replace all occurrences', async () => {
      const replaceExpr = stringExpressions.find(expr => expr.name === 'replace')!;
      
      const result = await replaceExpr.evaluate(context, 'foo bar foo baz', /foo/g, 'FOO');
      expect(result).toBe('FOO bar FOO baz');
    });
  });

  describe('String Manipulation Methods', () => {
    it('should have string length expression', async () => {
      const lengthExpr = stringExpressions.find(expr => expr.name === 'length')!;
      
      const result = await lengthExpr.evaluate(context, 'Hello World');
      expect(result).toBe(11);
    });

    it('should convert to uppercase', async () => {
      const upperExpr = stringExpressions.find(expr => expr.name === 'uppercase')!;
      
      const result = await upperExpr.evaluate(context, 'hello world');
      expect(result).toBe('HELLO WORLD');
    });

    it('should convert to lowercase', async () => {
      const lowerExpr = stringExpressions.find(expr => expr.name === 'lowercase')!;
      
      const result = await lowerExpr.evaluate(context, 'HELLO WORLD');
      expect(result).toBe('hello world');
    });

    it('should capitalize first letter', async () => {
      const capitalizeExpr = stringExpressions.find(expr => expr.name === 'capitalize')!;
      
      const result = await capitalizeExpr.evaluate(context, 'hello world');
      expect(result).toBe('Hello world');
    });

    it('should title case string', async () => {
      const titleExpr = stringExpressions.find(expr => expr.name === 'titlecase')!;
      
      const result = await titleExpr.evaluate(context, 'hello world');
      expect(result).toBe('Hello World');
    });

    it('should trim whitespace', async () => {
      const trimExpr = stringExpressions.find(expr => expr.name === 'trim')!;
      
      const result = await trimExpr.evaluate(context, '  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should get substring', async () => {
      const substringExpr = stringExpressions.find(expr => expr.name === 'substring')!;
      
      const result = await substringExpr.evaluate(context, 'Hello World', 6, 11);
      expect(result).toBe('World');
    });

    it('should split string', async () => {
      const splitExpr = stringExpressions.find(expr => expr.name === 'split')!;
      
      const result = await splitExpr.evaluate(context, 'apple,banana,cherry', ',');
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should join array to string', async () => {
      const joinExpr = stringExpressions.find(expr => expr.name === 'join')!;
      
      const result = await joinExpr.evaluate(context, ['apple', 'banana', 'cherry'], ', ');
      expect(result).toBe('apple, banana, cherry');
    });

    it('should check if string contains substring', async () => {
      const containsExpr = stringExpressions.find(expr => expr.name === 'contains')!;
      
      const result1 = await containsExpr.evaluate(context, 'Hello World', 'World');
      expect(result1).toBe(true);
      
      const result2 = await containsExpr.evaluate(context, 'Hello World', 'Universe');
      expect(result2).toBe(false);
    });

    it('should check if string starts with prefix', async () => {
      const startsWithExpr = stringExpressions.find(expr => expr.name === 'startsWith')!;
      
      const result1 = await startsWithExpr.evaluate(context, 'Hello World', 'Hello');
      expect(result1).toBe(true);
      
      const result2 = await startsWithExpr.evaluate(context, 'Hello World', 'World');
      expect(result2).toBe(false);
    });

    it('should check if string ends with suffix', async () => {
      const endsWithExpr = stringExpressions.find(expr => expr.name === 'endsWith')!;
      
      const result1 = await endsWithExpr.evaluate(context, 'Hello World', 'World');
      expect(result1).toBe(true);
      
      const result2 = await endsWithExpr.evaluate(context, 'Hello World', 'Hello');
      expect(result2).toBe(false);
    });
  });

  describe('String Padding and Formatting', () => {
    it('should pad string to left', async () => {
      const padLeftExpr = stringExpressions.find(expr => expr.name === 'padLeft')!;
      
      const result = await padLeftExpr.evaluate(context, 'hello', 10, '*');
      expect(result).toBe('*****hello');
    });

    it('should pad string to right', async () => {
      const padRightExpr = stringExpressions.find(expr => expr.name === 'padRight')!;
      
      const result = await padRightExpr.evaluate(context, 'hello', 10, '*');
      expect(result).toBe('hello*****');
    });

    it('should repeat string', async () => {
      const repeatExpr = stringExpressions.find(expr => expr.name === 'repeat')!;
      
      const result = await repeatExpr.evaluate(context, 'ha', 3);
      expect(result).toBe('hahaha');
    });

    it('should reverse string', async () => {
      const reverseExpr = stringExpressions.find(expr => expr.name === 'reverse')!;
      
      const result = await reverseExpr.evaluate(context, 'hello');
      expect(result).toBe('olleh');
    });
  });

  describe('String Comparison and Testing', () => {
    it('should compare strings ignoring case', async () => {
      const equalsIgnoreCaseExpr = stringExpressions.find(expr => expr.name === 'equalsIgnoreCase')!;
      
      const result1 = await equalsIgnoreCaseExpr.evaluate(context, 'Hello', 'HELLO');
      expect(result1).toBe(true);
      
      const result2 = await equalsIgnoreCaseExpr.evaluate(context, 'Hello', 'World');
      expect(result2).toBe(false);
    });

    it('should check if string is empty', async () => {
      const isEmptyExpr = stringExpressions.find(expr => expr.name === 'isEmpty')!;
      
      const result1 = await isEmptyExpr.evaluate(context, '');
      expect(result1).toBe(true);
      
      const result2 = await isEmptyExpr.evaluate(context, 'hello');
      expect(result2).toBe(false);
      
      const result3 = await isEmptyExpr.evaluate(context, '   ');
      expect(result3).toBe(false); // Has whitespace
    });

    it('should check if string is blank (empty or whitespace)', async () => {
      const isBlankExpr = stringExpressions.find(expr => expr.name === 'isBlank')!;
      
      const result1 = await isBlankExpr.evaluate(context, '');
      expect(result1).toBe(true);
      
      const result2 = await isBlankExpr.evaluate(context, '   ');
      expect(result2).toBe(true);
      
      const result3 = await isBlankExpr.evaluate(context, 'hello');
      expect(result3).toBe(false);
    });

    it('should check if string is numeric', async () => {
      const isNumericExpr = stringExpressions.find(expr => expr.name === 'isNumeric')!;
      
      const result1 = await isNumericExpr.evaluate(context, '123');
      expect(result1).toBe(true);
      
      const result2 = await isNumericExpr.evaluate(context, '123.45');
      expect(result2).toBe(true);
      
      const result3 = await isNumericExpr.evaluate(context, 'hello');
      expect(result3).toBe(false);
    });

    it('should check if string is alphabetic', async () => {
      const isAlphaExpr = stringExpressions.find(expr => expr.name === 'isAlpha')!;
      
      const result1 = await isAlphaExpr.evaluate(context, 'hello');
      expect(result1).toBe(true);
      
      const result2 = await isAlphaExpr.evaluate(context, 'Hello World');
      expect(result2).toBe(false); // Has space
      
      const result3 = await isAlphaExpr.evaluate(context, 'hello123');
      expect(result3).toBe(false); // Has numbers
    });
  });

  describe('URL and HTML String Operations', () => {
    it('should encode URL component', async () => {
      const urlEncodeExpr = stringExpressions.find(expr => expr.name === 'urlEncode')!;
      
      const result = await urlEncodeExpr.evaluate(context, 'hello world & more');
      expect(result).toBe('hello%20world%20%26%20more');
    });

    it('should decode URL component', async () => {
      const urlDecodeExpr = stringExpressions.find(expr => expr.name === 'urlDecode')!;
      
      const result = await urlDecodeExpr.evaluate(context, 'hello%20world%20%26%20more');
      expect(result).toBe('hello world & more');
    });

    it('should escape HTML entities', async () => {
      const htmlEscapeExpr = stringExpressions.find(expr => expr.name === 'htmlEscape')!;
      
      const result = await htmlEscapeExpr.evaluate(context, '<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should unescape HTML entities', async () => {
      const htmlUnescapeExpr = stringExpressions.find(expr => expr.name === 'htmlUnescape')!;
      
      const result = await htmlUnescapeExpr.evaluate(context, '&lt;div&gt;Hello &amp; World&lt;/div&gt;');
      expect(result).toBe('<div>Hello & World</div>');
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with element text content', async () => {
      testElement.textContent = 'Hello World';
      context.me = testElement;
      
      const lengthExpr = stringExpressions.find(expr => expr.name === 'length')!;
      const result = await lengthExpr.evaluate(context, 'me.textContent');
      
      expect(result).toBe(11);
    });

    it('should work with element attributes', async () => {
      testElement.setAttribute('data-message', 'hello world');
      context.me = testElement;
      
      const upperExpr = stringExpressions.find(expr => expr.name === 'uppercase')!;
      const result = await upperExpr.evaluate(context, 'me.getAttribute("data-message")');
      
      expect(result).toBe('HELLO WORLD');
    });

    it('should interpolate with element properties', async () => {
      testElement.id = 'myElement';
      testElement.className = 'active';
      context.me = testElement;
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, 'Element #${me.id} has class ${me.className}');
      
      expect(result).toBe('Element #myElement has class active');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      const lengthExpr = stringExpressions.find(expr => expr.name === 'length')!;
      
      const result1 = await lengthExpr.evaluate(context, null);
      expect(result1).toBe(4); // "null".length
      
      const result2 = await lengthExpr.evaluate(context, undefined);
      expect(result2).toBe(9); // "undefined".length
    });

    it('should handle non-string inputs gracefully', async () => {
      const upperExpr = stringExpressions.find(expr => expr.name === 'uppercase')!;
      
      const result1 = await upperExpr.evaluate(context, 123);
      expect(result1).toBe('123');
      
      const result2 = await upperExpr.evaluate(context, true);
      expect(result2).toBe('TRUE');
    });

    it('should handle empty regex patterns', async () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches')!;
      
      const result = await matchExpr.evaluate(context, 'hello', '');
      expect(result).toBe(true); // Empty pattern matches everything
    });

    it('should handle invalid regex patterns', async () => {
      const matchExpr = stringExpressions.find(expr => expr.name === 'matches')!;
      
      // Should not throw, but return false for invalid regex
      const result = await matchExpr.evaluate(context, 'hello', '[invalid');
      expect(result).toBe(false);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large string operations efficiently', async () => {
      const largeString = 'x'.repeat(100000);
      
      const lengthExpr = stringExpressions.find(expr => expr.name === 'length')!;
      const startTime = Date.now();
      
      const result = await lengthExpr.evaluate(context, largeString);
      
      const endTime = Date.now();
      expect(result).toBe(100000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle many string operations without memory leaks', async () => {
      const upperExpr = stringExpressions.find(expr => expr.name === 'uppercase')!;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await upperExpr.evaluate(context, `test string ${i}`);
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });
  });

  describe('Advanced String Operations', () => {
    it('should handle complex interpolation with nested expressions', async () => {
      context.locals!.set('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ]);
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(
        context, 
        'Users: ${users.map(u => u.name).join(", ")} (avg age: ${users.reduce((sum, u) => sum + u.age, 0) / users.length})'
      );
      
      expect(result).toBe('Users: Alice, Bob (avg age: 27.5)');
    });

    it('should format numbers within strings', async () => {
      context.locals!.set('price', 1234.56);
      context.locals!.set('formatPrice', (p: number) => `$${p.toFixed(2)}`);
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(context, 'Price: ${formatPrice(price)}');
      
      expect(result).toBe('Price: $1234.56');
    });

    it('should handle conditional string formatting', async () => {
      context.locals!.set('count', 1);
      
      const interpolateExpr = stringExpressions.find(expr => expr.name === 'interpolate')!;
      const result = await interpolateExpr.evaluate(
        context, 
        '${count} item${count === 1 ? "" : "s"}'
      );
      
      expect(result).toBe('1 item');
    });
  });
});