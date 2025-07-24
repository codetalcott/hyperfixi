/**
 * Take Command Tests
 * Test moving classes, attributes, and properties between elements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { TakeCommand } from './take.js';
import type { ExecutionContext } from '../../types/core.js';

describe('Take Command', () => {
  let takeCommand: TakeCommand;
  let context: ExecutionContext;
  let sourceElement: HTMLElement;
  let targetElement: HTMLElement;

  beforeEach(() => {
    takeCommand = new TakeCommand();
    sourceElement = document.createElement('div');
    targetElement = document.createElement('span');
    document.body.appendChild(sourceElement);
    document.body.appendChild(targetElement);
    
    context = {
      me: targetElement,
      locals: new Map(),
    };
  });

  afterEach(() => {
    if (sourceElement.parentNode) {
      document.body.removeChild(sourceElement);
    }
    if (targetElement.parentNode) {
      document.body.removeChild(targetElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(takeCommand.name).toBe('take');
      expect(takeCommand.isBlocking).toBe(false);
      expect(typeof takeCommand.syntax).toBe('string');
      expect(typeof takeCommand.description).toBe('string');
    });
  });

  describe('CSS Classes', () => {
    it('should take specific class from source to current element', async () => {
      sourceElement.className = 'active selected';
      
      const result = await takeCommand.execute(context, '.active', 'from', sourceElement);
      
      expect(sourceElement.classList.contains('active')).toBe(false);
      expect(sourceElement.classList.contains('selected')).toBe(true);
      expect(targetElement.classList.contains('active')).toBe(true);
      expect(result).toBe(targetElement);
    });

    it('should take all classes from source to current element', async () => {
      sourceElement.className = 'active selected highlight';
      
      await takeCommand.execute(context, 'classes', 'from', sourceElement);
      
      expect(sourceElement.className).toBe('');
      expect(targetElement.classList.contains('active')).toBe(true);
      expect(targetElement.classList.contains('selected')).toBe(true);
      expect(targetElement.classList.contains('highlight')).toBe(true);
    });

    it('should take classes and put them on specific target', async () => {
      const explicitTarget = document.createElement('div');
      document.body.appendChild(explicitTarget);
      sourceElement.className = 'test-class';
      
      const result = await takeCommand.execute(context, 
        '.test-class', 'from', sourceElement, 
        'and', 'put', 'it', 'on', explicitTarget
      );
      
      expect(sourceElement.classList.contains('test-class')).toBe(false);
      expect(explicitTarget.classList.contains('test-class')).toBe(true);
      expect(targetElement.classList.contains('test-class')).toBe(false);
      expect(result).toBe(explicitTarget);
      
      document.body.removeChild(explicitTarget);
    });

    it('should handle non-existent classes gracefully', async () => {
      sourceElement.className = 'existing';
      
      await takeCommand.execute(context, '.non-existent', 'from', sourceElement);
      
      expect(sourceElement.className).toBe('existing');
      expect(targetElement.classList.contains('non-existent')).toBe(false);
    });
  });

  describe('Attributes', () => {
    it('should take id attribute', async () => {
      sourceElement.id = 'source-id';
      
      await takeCommand.execute(context, 'id', 'from', sourceElement);
      
      expect(sourceElement.id).toBe('');
      expect(targetElement.id).toBe('source-id');
    });

    it('should take title attribute', async () => {
      sourceElement.title = 'Source Title';
      
      await takeCommand.execute(context, 'title', 'from', sourceElement);
      
      expect(sourceElement.title).toBe('');
      expect(targetElement.title).toBe('Source Title');
    });

    it('should take data attributes', async () => {
      sourceElement.setAttribute('data-value', '123');
      
      await takeCommand.execute(context, 'data-value', 'from', sourceElement);
      
      expect(sourceElement.getAttribute('data-value')).toBeNull();
      expect(targetElement.getAttribute('data-value')).toBe('123');
    });

    it('should take attributes with @ prefix', async () => {
      sourceElement.setAttribute('custom-attr', 'test-value');
      
      await takeCommand.execute(context, '@custom-attr', 'from', sourceElement);
      
      expect(sourceElement.getAttribute('custom-attr')).toBeNull();
      expect(targetElement.getAttribute('custom-attr')).toBe('test-value');
    });

    it('should take arbitrary attributes', async () => {
      sourceElement.setAttribute('role', 'button');
      
      await takeCommand.execute(context, 'role', 'from', sourceElement);
      
      expect(sourceElement.getAttribute('role')).toBeNull();
      expect(targetElement.getAttribute('role')).toBe('button');
    });
  });

  describe('Form Values', () => {
    it('should take value from input elements', async () => {
      const sourceInput = document.createElement('input');
      const targetInput = document.createElement('input');
      sourceInput.value = 'test value';
      document.body.appendChild(sourceInput);
      document.body.appendChild(targetInput);
      
      const inputContext = { me: targetInput, locals: new Map() };
      
      await takeCommand.execute(inputContext, 'value', 'from', sourceInput);
      
      expect(sourceInput.value).toBe('');
      expect(targetInput.value).toBe('test value');
      
      document.body.removeChild(sourceInput);
      document.body.removeChild(targetInput);
    });

    it('should handle value on non-input elements gracefully', async () => {
      sourceElement.setAttribute('value', 'attr-value');
      
      await takeCommand.execute(context, 'value', 'from', sourceElement);
      
      expect(sourceElement.getAttribute('value')).toBeNull();
      expect(targetElement.getAttribute('value')).toBe('attr-value');
    });
  });

  describe('CSS Properties', () => {
    it('should take CSS properties with kebab-case names', async () => {
      sourceElement.style.backgroundColor = 'red';
      
      await takeCommand.execute(context, 'background-color', 'from', sourceElement);
      
      expect(sourceElement.style.backgroundColor).toBe('');
      expect(targetElement.style.backgroundColor).toBe('red');
    });

    it('should take CSS properties with camelCase names', async () => {
      sourceElement.style.fontSize = '16px';
      
      await takeCommand.execute(context, 'fontSize', 'from', sourceElement);
      
      expect(sourceElement.style.fontSize).toBe('');
      expect(targetElement.style.fontSize).toBe('16px');
    });

    it('should take multiple CSS properties', async () => {
      sourceElement.style.width = '100px';
      sourceElement.style.height = '50px';
      
      await takeCommand.execute(context, 'width', 'from', sourceElement);
      await takeCommand.execute(context, 'height', 'from', sourceElement);
      
      expect(sourceElement.style.width).toBe('');
      expect(sourceElement.style.height).toBe('');
      expect(targetElement.style.width).toBe('100px');
      expect(targetElement.style.height).toBe('50px');
    });

    it('should handle custom CSS properties', async () => {
      sourceElement.style.setProperty('--custom-color', 'blue');
      
      await takeCommand.execute(context, '--custom-color', 'from', sourceElement);
      
      expect(sourceElement.style.getPropertyValue('--custom-color')).toBe('');
      expect(targetElement.style.getPropertyValue('--custom-color')).toBe('blue');
    });
  });

  describe('Element Targeting', () => {
    it('should take from element by CSS selector', async () => {
      sourceElement.id = 'source';
      sourceElement.className = 'transfer-me';
      
      await takeCommand.execute(context, '.transfer-me', 'from', '#source');
      
      expect(sourceElement.classList.contains('transfer-me')).toBe(false);
      expect(targetElement.classList.contains('transfer-me')).toBe(true);
    });

    it('should put on element by CSS selector', async () => {
      const namedTarget = document.createElement('div');
      namedTarget.id = 'named-target';
      document.body.appendChild(namedTarget);
      sourceElement.className = 'move-me';
      
      await takeCommand.execute(context, 
        '.move-me', 'from', sourceElement,
        'and', 'put', 'it', 'on', '#named-target'
      );
      
      expect(sourceElement.classList.contains('move-me')).toBe(false);
      expect(namedTarget.classList.contains('move-me')).toBe(true);
      expect(targetElement.classList.contains('move-me')).toBe(false);
      
      document.body.removeChild(namedTarget);
    });

    it('should handle class selectors for targeting', async () => {
      sourceElement.className = 'test-source';
      targetElement.className = 'test-target';
      sourceElement.title = 'Source Title';
      
      await takeCommand.execute(context, 
        'title', 'from', '.test-source',
        'and', 'put', 'it', 'on', '.test-target'
      );
      
      expect(sourceElement.title).toBe('');
      expect(targetElement.title).toBe('Source Title');
    });
  });

  describe('Complex Transfer Operations', () => {
    it('should transfer multiple attributes in sequence', async () => {
      sourceElement.id = 'source-id';
      sourceElement.title = 'Source Title';
      sourceElement.setAttribute('data-value', '42');
      sourceElement.className = 'source-class';
      
      await takeCommand.execute(context, 'id', 'from', sourceElement);
      await takeCommand.execute(context, 'title', 'from', sourceElement);
      await takeCommand.execute(context, 'data-value', 'from', sourceElement);
      await takeCommand.execute(context, '.source-class', 'from', sourceElement);
      
      expect(sourceElement.id).toBe('');
      expect(sourceElement.title).toBe('');
      expect(sourceElement.getAttribute('data-value')).toBeNull();
      expect(sourceElement.classList.contains('source-class')).toBe(false);
      
      expect(targetElement.id).toBe('source-id');
      expect(targetElement.title).toBe('Source Title');
      expect(targetElement.getAttribute('data-value')).toBe('42');
      expect(targetElement.classList.contains('source-class')).toBe(true);
    });

    it('should handle style and class transfers together', async () => {
      sourceElement.style.color = 'red';
      sourceElement.style.fontSize = '20px';
      sourceElement.className = 'styled important';
      
      await takeCommand.execute(context, 'color', 'from', sourceElement);
      await takeCommand.execute(context, 'fontSize', 'from', sourceElement);
      await takeCommand.execute(context, 'classes', 'from', sourceElement);
      
      expect(sourceElement.style.color).toBe('');
      expect(sourceElement.style.fontSize).toBe('');
      expect(sourceElement.className).toBe('');
      
      expect(targetElement.style.color).toBe('red');
      expect(targetElement.style.fontSize).toBe('20px');
      expect(targetElement.classList.contains('styled')).toBe(true);
      expect(targetElement.classList.contains('important')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle source element not found', async () => {
      await expect(takeCommand.execute(context, 'class', 'from', '#non-existent'))
        .rejects.toThrow('Take element not found: #non-existent');
    });

    it('should handle target element not found', async () => {
      sourceElement.className = 'test';
      
      await expect(takeCommand.execute(context, 
        'class', 'from', sourceElement,
        'and', 'put', 'it', 'on', '#non-existent'
      )).rejects.toThrow('Take element not found: #non-existent');
    });

    it('should handle missing source gracefully', async () => {
      // No attributes or classes on source
      await takeCommand.execute(context, '.non-existent', 'from', sourceElement);
      
      // Should not throw, just no transfer occurs
      expect(targetElement.classList.contains('non-existent')).toBe(false);
    });

    it('should handle null values gracefully', async () => {
      // Taking a non-existent attribute should not crash
      await takeCommand.execute(context, 'non-existent-attr', 'from', sourceElement);
      
      expect(targetElement.getAttribute('non-existent-attr')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty class lists', async () => {
      sourceElement.className = '';
      
      await takeCommand.execute(context, 'classes', 'from', sourceElement);
      
      expect(sourceElement.className).toBe('');
      expect(targetElement.className).toBe('');
    });

    it('should handle empty CSS values', async () => {
      sourceElement.style.width = '';
      
      await takeCommand.execute(context, 'width', 'from', sourceElement);
      
      expect(targetElement.style.width).toBe('');
    });

    it('should preserve existing properties on target', async () => {
      targetElement.className = 'existing';
      targetElement.title = 'Existing Title';
      sourceElement.className = 'new-class';
      sourceElement.id = 'new-id';
      
      await takeCommand.execute(context, '.new-class', 'from', sourceElement);
      await takeCommand.execute(context, 'id', 'from', sourceElement);
      
      expect(targetElement.classList.contains('existing')).toBe(true);
      expect(targetElement.classList.contains('new-class')).toBe(true);
      expect(targetElement.title).toBe('Existing Title');
      expect(targetElement.id).toBe('new-id');
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      expect(takeCommand.validate(['class', 'from', sourceElement])).toBeNull();
      expect(takeCommand.validate(['.active', 'from', sourceElement])).toBeNull();
      expect(takeCommand.validate(['id', 'from', sourceElement, 'and', 'put', 'it', 'on', targetElement])).toBeNull();
      expect(takeCommand.validate(['title', 'from', '#source'])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(takeCommand.validate([])).toContain('requires property and source');
      expect(takeCommand.validate(['class'])).toContain('requires property and source');
      expect(takeCommand.validate(['class', 'from'])).toContain('Source element required');
      expect(takeCommand.validate(['class', 'invalid', sourceElement])).toContain('Expected "from" keyword');
      expect(takeCommand.validate([123, 'from', sourceElement])).toContain('Expected property name');
    });

    it('should reject incomplete "and put it on" syntax', () => {
      expect(takeCommand.validate(['class', 'from', sourceElement, 'and'])).toContain('Invalid take syntax');
      expect(takeCommand.validate(['class', 'from', sourceElement, 'and', 'put'])).toContain('Invalid take syntax');
      expect(takeCommand.validate(['class', 'from', sourceElement, 'and', 'put', 'it'])).toContain('Invalid take syntax');
      expect(takeCommand.validate(['class', 'from', sourceElement, 'and', 'put', 'it', 'on'])).toContain('Target element required');
    });
  });
});