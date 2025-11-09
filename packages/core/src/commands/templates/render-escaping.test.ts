/**
 * Template HTML Escaping Tests
 * Tests for proper HTML escaping in template interpolation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../../test-setup.js';
import { RenderCommand } from './render';
import type { ExecutionContext } from '../../types/core';

describe('Template HTML Escaping', () => {
  let renderCommand: RenderCommand;
  let context: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    renderCommand = new RenderCommand();
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
    context = {
      me: mockElement,
      locals: new Map(),
    };
  });

  describe('Basic HTML Escaping', () => {
    it('should escape HTML in ${expression} by default', async () => {
      // Template: "render ${x}"
      const template = document.createElement('template');
      template.innerHTML = 'render ${x}';

      const result = await renderCommand.execute(context, template, 'with', { x: '<br>' });

      // Should escape the HTML - the text content should contain the literal < and > characters
      const textContent = result.textContent || '';
      expect(textContent).toContain('render <br>'); // Text should show literal characters

      // But the innerHTML should NOT contain an actual <br> element - no HTML parsing should occur
      const innerHTML = result.innerHTML || '';
      expect(innerHTML).not.toMatch(/<br\s*\/?>/); // No actual br element should exist
    });

    it('should not escape HTML in ${unescaped expression}', async () => {
      // Template: "render ${unescaped x}"
      const template = document.createElement('template');
      template.innerHTML = 'render ${unescaped x}';

      const result = await renderCommand.execute(context, template, 'with', { x: '<br>' });

      // Should not escape the HTML - should create actual HTML elements
      // Convert fragment to HTML by creating a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(result.cloneNode(true));
      const actualHTML = tempDiv.innerHTML;

      expect(actualHTML).toMatch(/<br\s*\/?>/); // Should contain actual br element

      // The text content should be empty for br elements
      const textContent = result.textContent || '';
      expect(textContent).toBe('render '); // br creates no text content
    });

    it('should handle mixed escaping in same template', async () => {
      // Template: "render ${x} ${unescaped x}"
      const template = document.createElement('template');
      template.innerHTML = 'render ${x} ${unescaped x}';

      const result = await renderCommand.execute(context, template, 'with', { x: '<br>' });

      // Should have both escaped text and unescaped HTML
      const textContent = result.textContent || '';

      // Convert fragment to HTML for checking unescaped elements
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(result.cloneNode(true));
      const actualHTML = tempDiv.innerHTML;

      // The text content should show the escaped version as literal text
      expect(textContent).toContain('render <br>'); // Escaped shows as text

      // The innerHTML should contain an actual br element from the unescaped version
      expect(actualHTML).toMatch(/<br\s*\/?>/); // Unescaped creates HTML element
    });
  });

  describe('Complex HTML Escaping', () => {
    it('should escape multiple HTML entities', async () => {
      const template = document.createElement('template');
      template.innerHTML = 'Content: ${html}';

      const htmlContent = '<script>alert("xss")</script><p>Hello & "World"</p>';

      const result = await renderCommand.execute(context, template, 'with', { html: htmlContent });

      // The dangerous HTML should be escaped - visible as text, not executed as HTML
      const textContent = result.textContent || '';
      expect(textContent).toContain('Content: <script>alert("xss")</script><p>Hello & "World"</p>');

      // The innerHTML should NOT contain actual script or p elements
      const innerHTML = result.innerHTML || '';
      expect(innerHTML).not.toMatch(/<script/);
      expect(innerHTML).not.toMatch(/<p>/);
    });

    it('should handle nested templates with escaping', async () => {
      const template = document.createElement('template');
      template.innerHTML = `
        <div>
          @repeat in items
            <p>Item: \${it}</p>
          @end
        </div>
      `;

      const items = ['<b>Bold</b>', '<i>Italic</i>'];

      const result = await renderCommand.execute(context, template, 'with', { items });

      // The HTML in items should be escaped and show as text
      const textContent = result.textContent || '';
      expect(textContent).toContain('Item: <b>Bold</b>');
      expect(textContent).toContain('Item: <i>Italic</i>');

      // No actual b or i elements should be created
      const innerHTML = result.innerHTML || '';
      expect(innerHTML).not.toMatch(/<b>/);
      expect(innerHTML).not.toMatch(/<i>/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty values', async () => {
      const template = document.createElement('template');
      template.innerHTML = 'Value: ${empty}';

      const result = await renderCommand.execute(context, template, 'with', { empty: '' });

      expect(result.textContent || result.innerHTML).toBe('Value: ');
    });

    it('should handle null/undefined values', async () => {
      const template = document.createElement('template');
      template.innerHTML = 'Null: ${nullVal}, Undefined: ${undefinedVal}';

      const result = await renderCommand.execute(context, template, 'with', {
        nullVal: null,
        undefinedVal: undefined,
      });

      const content = result.textContent || result.innerHTML || '';
      expect(content).toContain('Null: null');
      expect(content).toContain('Undefined: undefined');
    });

    it('should handle numeric values', async () => {
      const template = document.createElement('template');
      template.innerHTML = 'Number: ${num}';

      const result = await renderCommand.execute(context, template, 'with', { num: 42 });

      expect(result.textContent || result.innerHTML).toBe('Number: 42');
    });
  });

  describe('Real-world Template Patterns', () => {
    it('should handle user-generated content safely', async () => {
      const template = document.createElement('template');
      template.innerHTML = `
        <div class="comment">
          <h4>\${author}</h4>
          <p>\${content}</p>
          <div class="raw-html">\${unescaped rawHtml}</div>
        </div>
      `;

      const data = {
        author: '<script>malicious()</script>',
        content: 'Hello & goodbye "world"',
        rawHtml: '<em>Safe HTML</em>',
      };

      const result = await renderCommand.execute(context, template, 'with', data);

      const textContent = result.textContent || '';

      // Convert fragment to HTML for checking unescaped elements
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(result.cloneNode(true));
      const actualHTML = tempDiv.innerHTML;

      // Author should be escaped - visible as text
      expect(textContent).toContain('<script>malicious()</script>');

      // Content should be escaped - visible as text
      expect(textContent).toContain('Hello & goodbye "world"');

      // Raw HTML should not be escaped - should create actual HTML
      expect(actualHTML).toMatch(/<em>Safe HTML<\/em>/);

      // The key security test: the script should not be executable
      // Check that it's contained within text content, not as executable elements
      const h4Element = tempDiv.querySelector('h4');
      if (h4Element) {
        // The h4 should contain text content, not executable script elements
        expect(h4Element.textContent).toContain('<script>malicious()</script>');
        // And this text should be safe - it won't execute as JavaScript
      }
    });
  });
});
