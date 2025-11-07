/**
 * Integration tests for hyperscript expressions
 * Tests complex expression combinations using real LSP database examples
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

// Import all expression categories
import { referencesExpressions } from './references/index';
import { logicalExpressions } from './logical/index';
import { conversionExpressions } from './conversion/index';
import { positionalExpressions } from './positional/index';
import { propertiesExpressions } from './properties/index';
import { specialExpressions } from './special/index';

describe('Expression Integration Tests', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    context = createMockHyperscriptContext();
    
    // Create comprehensive test DOM structure with proper nesting
    document.body.innerHTML = `
      <div id="container" class="test-container">
        <section id="main-section" class="section active">
          <p id="text1" class="content">Hello World</p>
          <p id="text2" class="content hidden">Hidden Content</p>
          <div class="button-group">
            <button id="btn1" class="primary" data-value="10">Button 1</button>
            <button id="btn2" class="secondary" data-value="20">Button 2</button>
          </div>
        </section>
        <form id="test-form" class="form">
          <input id="input1" name="username" type="text" value="john" />
          <input id="input2" name="age" type="number" value="25" />
          <input id="checkbox1" name="active" type="checkbox" checked />
          <select id="select1" name="category">
            <option value="admin">Admin</option>
            <option value="user" selected>User</option>
          </select>
        </form>
        <div id="quotes">
          <blockquote data-author="Einstein">Quote 1</blockquote>
          <blockquote data-author="Tesla">Quote 2</blockquote>
        </div>
      </div>
    `;

    testElement = document.getElementById('btn1')!;
    context.me = testElement;
    context.it = { name: 'test', values: [1, 2, 3, 4, 5] };
    context.you = testElement;
  });

  describe('Reference + Property Combinations', () => {
    it('should handle "my attribute data-value"', async () => {
      const result = await propertiesExpressions.my.evaluate(context, 'data-value');
      expect(result).toBe('10');
    });

    it('should handle "the closest <section/>"', async () => {
      const result = await referencesExpressions.closest.evaluate(context, 'section');
      expect(result?.id).toBe('main-section');
    });

    it('should handle "my closest <section/>\'s className"', async () => {
      // Step 1: Get closest section to me
      const section = await referencesExpressions.closest.evaluate(context, 'section');
      
      // Step 2: Get its className property
      const result = await propertiesExpressions.possessive.evaluate(context, section, 'className');
      expect(result).toBe('section active');
    });

    it('should handle "#container\'s children"', async () => {
      // Step 1: Get element by ID
      const container = await propertiesExpressions.idReference.evaluate(context, 'container');
      
      // Step 2: Get its children property
      const children = await propertiesExpressions.possessive.evaluate(context, container, 'children');
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(3); // section, form, div#quotes
    });
  });

  describe('Positional + Reference Combinations', () => {
    it('should handle "first in <button/>"', async () => {
      // Step 1: Get all buttons
      const buttons = await referencesExpressions.elementWithSelector.evaluate(context, 'button');
      
      // Step 2: Get first button
      const firstButton = await positionalExpressions.first.evaluate(context, buttons);
      expect(firstButton.id).toBe('btn1');
    });

    it('should handle "last of <p/> in #container"', async () => {
      // Step 1: Get container
      const container = await propertiesExpressions.idReference.evaluate(context, 'container');
      
      // Step 2: Find paragraphs within container
      const paragraphs = Array.from(container!.querySelectorAll('p'));
      
      // Step 3: Get last paragraph
      const lastP = await positionalExpressions.last.evaluate(context, paragraphs);
      expect(lastP.id).toBe('text2');
    });

    it('should handle "next <button/> from me"', async () => {
      const result = await positionalExpressions.next.evaluate(context, 'button');
      expect(result?.id).toBe('btn2');
    });

    it('should handle "previous <button/> from #btn2"', async () => {
      const btn2 = await propertiesExpressions.idReference.evaluate(context, 'btn2');
      const result = await positionalExpressions.previous.evaluate(context, 'button', btn2 as HTMLElement);
      expect(result?.id).toBe('btn1');
    });
  });

  describe('Logical + Conversion Combinations', () => {
    it('should handle "my data-value as Int > 5"', async () => {
      // Step 1: Get my data-value
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      
      // Step 2: Convert to Int
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      
      // Step 3: Compare with 5
      const result = await logicalExpressions.greaterThan.evaluate(context, intValue, 5);
      expect(result).toBe(true); // 10 > 5
    });

    it('should handle "the closest <form/> as Values contains username"', async () => {
      // Use an input element as context so closest form will work
      const input = document.getElementById('input1')!;
      context.me = input;
      
      // Step 1: Get closest form
      const form = await referencesExpressions.closest.evaluate(context, 'form');
      
      // Step 2: Convert form to Values
      const formValues = await conversionExpressions.as.evaluate(context, form, 'Values');
      
      // Step 3: Check if it contains username
      const result = await logicalExpressions.contains.evaluate(context, formValues, 'username');
      expect(result).toBe(true);
      
      // Restore original context
      context.me = testElement;
    });

    it('should handle "\'10\' as Int == my data-value as Int"', async () => {
      // Step 1: Convert string to Int
      const leftValue = await conversionExpressions.as.evaluate(context, '10', 'Int');
      
      // Step 2: Get my data-value and convert to Int
      const myDataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const rightValue = await conversionExpressions.as.evaluate(context, myDataValue, 'Int');
      
      // Step 3: Compare
      const result = await logicalExpressions.equals.evaluate(context, leftValue, rightValue);
      expect(result).toBe(true);
    });
  });

  describe('Complex Property Access Chains', () => {
    it('should handle "window\'s location\'s href"', async () => {
      // Step 1: Get window
      const windowObj = await referencesExpressions.window.evaluate(context);
      
      // Step 2: Get location property
      const location = await propertiesExpressions.possessive.evaluate(context, windowObj, 'location');
      
      // Step 3: Get href property
      const href = await propertiesExpressions.possessive.evaluate(context, location, 'href');
      expect(typeof href).toBe('string');
      expect(href).toContain('://'); // Should be a valid URL
    });

    it('should handle "document\'s body\'s children\'s length"', async () => {
      // Step 1: Get document
      const doc = await referencesExpressions.document.evaluate(context);
      
      // Step 2: Get body
      const body = await propertiesExpressions.possessive.evaluate(context, doc, 'body');
      
      // Step 3: Get children
      const children = await propertiesExpressions.possessive.evaluate(context, body, 'children');
      
      // Step 4: Get length
      const length = await propertiesExpressions.possessive.evaluate(context, children, 'length');
      expect(typeof length).toBe('number');
      expect(length).toBeGreaterThan(0);
    });
  });

  describe('Array Operations with Conversions', () => {
    it('should handle "it\'s values\'s first as String"', async () => {
      // Step 1: Get it's values
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      
      // Step 2: Get first value
      const firstValue = await positionalExpressions.first.evaluate(context, values);
      
      // Step 3: Convert to String
      const result = await conversionExpressions.as.evaluate(context, firstValue, 'String');
      expect(result).toBe('1');
    });

    it('should handle "last of it\'s values > 3"', async () => {
      // Step 1: Get it's values
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      
      // Step 2: Get last value
      const lastValue = await positionalExpressions.last.evaluate(context, values);
      
      // Step 3: Compare with 3
      const result = await logicalExpressions.greaterThan.evaluate(context, lastValue, 3);
      expect(result).toBe(true); // 5 > 3
    });

    it('should handle "it\'s values at -2 == 4"', async () => {
      // Step 1: Get it's values
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      
      // Step 2: Get element at index -2 (second from end)
      const value = await positionalExpressions.at.evaluate(context, -2, values);
      
      // Step 3: Compare with 4
      const result = await logicalExpressions.equals.evaluate(context, value, 4);
      expect(result).toBe(true); // values[3] = 4
    });
  });

  describe('CSS Selector Complex Combinations', () => {
    it('should handle "<button:not(.secondary)/> contains \'Button 1\'"', async () => {
      // Step 1: Get buttons that are not secondary
      const buttons = await referencesExpressions.elementWithSelector.evaluate(context, 'button:not(.secondary)');
      
      // Step 2: Get first button's text content
      const firstButton = await positionalExpressions.first.evaluate(context, buttons);
      const textContent = await propertiesExpressions.possessive.evaluate(context, firstButton, 'textContent');
      
      // Step 3: Check if it contains 'Button 1'
      const result = await logicalExpressions.contains.evaluate(context, textContent, 'Button 1');
      expect(result).toBe(true);
    });

    it('should handle "<.content/> that match \'.hidden\'"', async () => {
      // Step 1: Get all content elements
      const contentElements = await referencesExpressions.elementWithSelector.evaluate(context, '.content');
      
      // Step 2: Check each one for .hidden class
      let hiddenCount = 0;
      for (const element of contentElements) {
        const hasHidden = await logicalExpressions.matches.evaluate(context, element, '.hidden');
        if (hasHidden) hiddenCount++;
      }
      
      expect(hiddenCount).toBe(1); // Only text2 has .hidden
    });
  });

  describe('Form Value Processing', () => {
    it('should handle "closest <form/> as Values:JSON"', async () => {
      // Use an input element as context so closest form will work
      const input = document.getElementById('input1')!;
      context.me = input;
      
      // Step 1: Get closest form
      const form = await referencesExpressions.closest.evaluate(context, 'form');
      
      // Step 2: Convert to Values:JSON
      const jsonValues = await conversionExpressions.as.evaluate(context, form, 'Values:JSON');
      
      // Step 3: Parse and verify
      const parsed = JSON.parse(jsonValues);
      expect(parsed.username).toBe('john');
      expect(parsed.age).toBe(25);
      expect(parsed.active).toBe(true);
      expect(parsed.category).toBe('user');
      
      // Restore original context
      context.me = testElement;
    });

    it('should handle "my closest <form/>\'s input[name=\'age\'] as Int"', async () => {
      // Use an input element as context so closest form will work
      const input = document.getElementById('input1')!;
      context.me = input;
      
      // Step 1: Get closest form
      const form = await referencesExpressions.closest.evaluate(context, 'form');
      
      // Step 2: Find age input within form
      const ageInput = form!.querySelector('input[name="age"]') as HTMLInputElement;
      
      // Step 3: Get its value and convert to Int
      const value = await propertiesExpressions.possessive.evaluate(context, ageInput, 'value');
      const intValue = await conversionExpressions.as.evaluate(context, value, 'Int');
      
      expect(intValue).toBe(25);
      
      // Restore original context
      context.me = testElement;
    });
  });

  describe('Mathematical Expression Combinations', () => {
    it('should handle "(my data-value as Int + 5) * 2"', async () => {
      // Step 1: Get my data-value and convert to Int
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      
      // Step 2: Add 5
      const sum = await specialExpressions.addition.evaluate(context, intValue, 5);
      
      // Step 3: Multiply by 2
      const result = await specialExpressions.multiplication.evaluate(context, sum, 2);
      
      expect(result).toBe(30); // (10 + 5) * 2 = 30
    });

    it('should handle "it\'s values\'s length mod 3"', async () => {
      // Step 1: Get it's values
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      
      // Step 2: Get length
      const length = await propertiesExpressions.possessive.evaluate(context, values, 'length');
      
      // Step 3: Modulo 3
      const result = await specialExpressions.modulo.evaluate(context, length, 3);
      
      expect(result).toBe(2); // 5 mod 3 = 2
    });
  });

  describe('String Template and Interpolation', () => {
    it('should handle string interpolation with property access', async () => {
      // Test string literal with interpolation
      const template = 'Button text: $text, ID: $id';
      const result = await specialExpressions.stringLiteral.evaluate(context, template);
      expect(result).toBe('Button text: [text], ID: [id]');
    });

    it('should handle template literal with expression', async () => {
      const template = 'Value: ${my.getAttribute("data-value")}';
      const result = await specialExpressions.stringLiteral.evaluate(context, template);
      expect(result).toBe('Value: [my.getAttribute("data-value")]');
    });
  });

  describe('Complex Conditional Logic', () => {
    it('should handle "if me matches .primary and my data-value as Int > 5"', async () => {
      // Step 1: Check if me matches .primary
      const matchesPrimary = await logicalExpressions.matches.evaluate(context, context.me, '.primary');
      
      // Step 2: Get my data-value and convert to Int
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      
      // Step 3: Check if value > 5
      const greaterThan5 = await logicalExpressions.greaterThan.evaluate(context, intValue, 5);
      
      // Step 4: Combine with AND
      const result = await logicalExpressions.and.evaluate(context, matchesPrimary, greaterThan5);
      
      expect(result).toBe(true); // Button has .primary class and data-value 10 > 5
    });

    it('should handle "if no <.missing/> or <.content/> exists"', async () => {
      // Step 1: Check if no .missing elements exist
      const missingElements = await referencesExpressions.elementWithSelector.evaluate(context, '.missing');
      const noMissing = await logicalExpressions.not.evaluate(context, missingElements.length > 0);
      
      // Step 2: Check if .content elements exist
      const contentElements = await referencesExpressions.elementWithSelector.evaluate(context, '.content');
      const hasContent = contentElements.length > 0;
      
      // Step 3: Combine with OR
      const result = await logicalExpressions.or.evaluate(context, noMissing, hasContent);
      
      expect(result).toBe(true); // No .missing elements AND .content elements exist
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('should handle form validation pattern', async () => {
      // Pattern: "if my closest <form/> as Values contains username and username is not empty"
      
      // Use an input element as context so closest form will work
      const input = document.getElementById('input1')!;
      context.me = input;
      
      // Step 1: Get closest form and convert to Values
      const form = await referencesExpressions.closest.evaluate(context, 'form');
      const formValues = await conversionExpressions.as.evaluate(context, form, 'Values');
      
      // Step 2: Check if contains username
      const hasUsername = await logicalExpressions.contains.evaluate(context, formValues, 'username');
      
      // Step 3: Check if username is not empty
      const username = formValues.username;
      const isNotEmpty = await logicalExpressions.not.evaluate(context, username === '');
      
      // Step 4: Combine conditions
      const result = await logicalExpressions.and.evaluate(context, hasUsername, isNotEmpty);
      
      expect(result).toBe(true);
      
      // Restore original context
      context.me = testElement;
    });

    it('should handle dynamic content filtering', async () => {
      // Pattern: "show <blockquote/> in #quotes when its data-author contains searchTerm"
      
      const searchTerm = 'Ein';
      
      // Step 1: Get quotes container
      const quotes = await propertiesExpressions.idReference.evaluate(context, 'quotes');
      
      // Step 2: Get all blockquotes
      const blockquotes = Array.from(quotes!.querySelectorAll('blockquote'));
      
      // Step 3: Filter by data-author containing search term
      const filteredQuotes = [];
      for (const quote of blockquotes) {
        const author = await propertiesExpressions.possessive.evaluate(context, quote, 'data-author');
        const matches = await logicalExpressions.contains.evaluate(context, author, searchTerm);
        if (matches) {
          filteredQuotes.push(quote);
        }
      }
      
      expect(filteredQuotes).toHaveLength(1);
      expect(filteredQuotes[0].getAttribute('data-author')).toBe('Einstein');
    });

    it('should handle complex navigation pattern', async () => {
      // Pattern: "next <button/> in closest <section/> with class primary"
      
      // Step 1: Get closest section
      const section = await referencesExpressions.closest.evaluate(context, 'section');
      
      // Step 2: Find next button within that section
      const nextButton = await positionalExpressions.nextWithin.evaluate(context, 'button', 'section', context.me);
      
      // Step 3: Check if it has primary class
      const hasPrimary = await logicalExpressions.matches.evaluate(context, nextButton, '.primary');
      
      expect(nextButton?.id).toBe('btn2');
      expect(hasPrimary).toBe(false); // btn2 has .secondary, not .primary
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined gracefully in chains', async () => {
      // Test accessing property of null element
      const result = await propertiesExpressions.possessive.evaluate(context, null, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle empty collections in positional expressions', async () => {
      const emptyArray: any[] = [];
      const first = await positionalExpressions.first.evaluate(context, emptyArray);
      const last = await positionalExpressions.last.evaluate(context, emptyArray);
      
      expect(first).toBeNull();
      expect(last).toBeNull();
    });

    it('should handle type conversion errors gracefully', async () => {
      // Try to convert invalid string to number
      await expect(conversionExpressions.as.evaluate(context, 'invalid-number', 'Int'))
        .resolves.toBe(0); // Should fallback to 0
    });

    it('should handle missing elements in selectors', async () => {
      const missing = await referencesExpressions.elementWithSelector.evaluate(context, '.nonexistent');
      expect(missing).toEqual([]);
      
      const first = await positionalExpressions.first.evaluate(context, missing);
      expect(first).toBeNull();
    });
  });

  describe('Performance and Optimization Cases', () => {
    it('should handle large collections efficiently', async () => {
      // Create large array
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      context.it = { values: largeArray };
      
      // Test positional access
      const first = await positionalExpressions.first.evaluate(context, largeArray);
      const last = await positionalExpressions.last.evaluate(context, largeArray);
      const middle = await positionalExpressions.at.evaluate(context, 500, largeArray);
      
      expect(first).toBe(0);
      expect(last).toBe(999);
      expect(middle).toBe(500);
    });

    it('should handle complex DOM traversal efficiently', async () => {
      // Create nested DOM structure
      const container = document.createElement('div');
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.className = i % 2 === 0 ? 'even' : 'odd';
        div.textContent = `Item ${i}`;
        container.appendChild(div);
      }
      document.body.appendChild(container);
      
      // Test selector performance
      const evenElements = await referencesExpressions.elementWithSelector.evaluate(context, '.even');
      expect(evenElements.length).toBe(50);
      
      // Cleanup
      document.body.removeChild(container);
    });
  });
});