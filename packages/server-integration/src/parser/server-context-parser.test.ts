/**
 * Tests for ServerContextParser - handles template variables in hyperscript
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ServerContextParser } from './server-context-parser.js';
import type { ParseContext } from '../types.js';

describe('ServerContextParser', () => {
  let parser: ServerContextParser;

  beforeEach(() => {
    parser = new ServerContextParser();
  });

  describe('Template Variable Processing', () => {
    it('should parse template variables in hyperscript', () => {
      const input = `
        on click
          fetch /api/users/{{userId}}
          put the result into #user-{{userId}}
      `;
      
      const context: ParseContext = {
        templateVars: { userId: '123' }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('/api/users/123');
      expect(processed).toContain('#user-123');
    });

    it('should handle multiple template variables', () => {
      const input = `
        on click
          fetch /api/{{resource}}/{{id}}
          put the result into {{target}}
      `;
      
      const context: ParseContext = {
        templateVars: { 
          resource: 'users',
          id: '456',
          target: '#content'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('/api/users/456');
      expect(processed).toContain('#content');
    });

    it('should handle missing template variables gracefully', () => {
      const input = `
        on click
          fetch /api/users/{{userId}}
          put the result into {{missing}}
      `;
      
      const context: ParseContext = {
        templateVars: { userId: '123' }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('/api/users/123');
      expect(processed).toContain('{{missing}}'); // Should remain unchanged
    });

    it('should work without template variables', () => {
      const input = `
        on click
          fetch /api/users
          put the result into #content
      `;

      const processed = parser.preprocessTemplate(input);
      
      expect(processed).toBe(input);
    });

    it('should handle nested template expressions', () => {
      const input = `
        on click
          fetch /api/{{type}}/{{id}}/{{action}}
          put the result into {{container}}-{{id}}
      `;
      
      const context: ParseContext = {
        templateVars: { 
          type: 'products',
          id: '789',
          action: 'details',
          container: '#product'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('/api/products/789/details');
      expect(processed).toContain('#product-789');
    });

    it('should handle complex object values', () => {
      const input = `
        on click
          fetch {{apiUrl}}
          put the result into {{selector}}
      `;
      
      const context: ParseContext = {
        templateVars: { 
          apiUrl: '/api/complex/endpoint?param=value',
          selector: '#complex-selector[data-id="test"]'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('/api/complex/endpoint?param=value');
      expect(processed).toContain('#complex-selector[data-id="test"]');
    });

    it('should preserve hyperscript syntax while replacing variables', () => {
      const input = `
        on keyup from {{inputSelector}}
          if the event's key is "Enter"
            fetch {{searchUrl}} with {query: target.value}
            put the result into {{resultsContainer}}
          else
            debounce 300ms then 
              fetch {{previewUrl}}?q={target.value}
              put the result into {{previewContainer}}
          end
      `;
      
      const context: ParseContext = {
        templateVars: { 
          inputSelector: '#search-input',
          searchUrl: '/api/search',
          resultsContainer: '#search-results',
          previewUrl: '/api/preview',
          previewContainer: '#search-preview'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      expect(processed).toContain('on keyup from #search-input');
      expect(processed).toContain('fetch /api/search');
      expect(processed).toContain('put the result into #search-results');
      expect(processed).toContain('fetch /api/preview?q={target.value}');
      expect(processed).toContain('put the result into #search-preview');
      
      // Should preserve hyperscript syntax
      expect(processed).toContain('if the event\'s key is "Enter"');
      expect(processed).toContain('debounce 300ms then');
      expect(processed).toContain('end');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      const processed = parser.preprocessTemplate('');
      expect(processed).toBe('');
    });

    it('should handle null/undefined template variables', () => {
      const input = 'on click fetch {{url}}';
      
      const processed1 = parser.preprocessTemplate(input, null);
      const processed2 = parser.preprocessTemplate(input, undefined);
      
      expect(processed1).toBe(input);
      expect(processed2).toBe(input);
    });

    it('should handle malformed template syntax', () => {
      const input = `
        on click
          fetch /api/{{incomplete
          put {{}} into #test
          get {single} from somewhere
      `;
      
      const context: ParseContext = {
        templateVars: { incomplete: 'users' }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      // Should not crash and leave malformed syntax unchanged
      expect(processed).toContain('{{incomplete');
      expect(processed).toContain('{{}}');
      expect(processed).toContain('{single}');
    });
  });

  describe('Security Considerations', () => {
    it('should not execute template variables as code', () => {
      const input = 'on click fetch {{maliciousUrl}}';
      
      const context: ParseContext = {
        templateVars: { 
          maliciousUrl: 'javascript:alert("xss")'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      // Should treat as literal string, not executable code
      expect(processed).toContain('fetch javascript:alert("xss")');
    });

    it('should handle potential injection attempts', () => {
      const input = 'on click put {{content}} into #output';
      
      const context: ParseContext = {
        templateVars: { 
          content: '<script>alert("injection")</script>'
        }
      };

      const processed = parser.preprocessTemplate(input, context.templateVars);
      
      // Should insert as literal content
      expect(processed).toContain('put <script>alert("injection")</script> into #output');
    });
  });
});