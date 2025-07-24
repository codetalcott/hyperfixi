/**
 * Measure Command Tests
 * Test DOM element measurement capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { MeasureCommand } from './measure.js';
import type { ExecutionContext } from '../../types/core.js';

describe('Measure Command', () => {
  let measureCommand: MeasureCommand;
  let context: ExecutionContext;
  let mockElement: HTMLElement;

  beforeEach(() => {
    measureCommand = new MeasureCommand();
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
    context = {
      me: mockElement,
      locals: new Map(),
    };
    
    // Set up element with dimensions for testing
    mockElement.style.width = '100px';
    mockElement.style.height = '50px';
    mockElement.style.position = 'absolute';
    mockElement.style.top = '10px';
    mockElement.style.left = '20px';
    mockElement.style.margin = '5px';
    mockElement.style.padding = '3px';
    mockElement.style.border = '2px solid black';
  });

  afterEach(() => {
    if (mockElement.parentNode) {
      document.body.removeChild(mockElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(measureCommand.name).toBe('measure');
      expect(measureCommand.isBlocking).toBe(false);
      expect(typeof measureCommand.syntax).toBe('string');
      expect(typeof measureCommand.description).toBe('string');
    });
  });

  describe('Basic Measurements', () => {
    it('should measure width by default', async () => {
      const result = await measureCommand.execute(context);
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should measure specific dimensions', async () => {
      const width = await measureCommand.execute(context, 'width');
      const height = await measureCommand.execute(context, 'height');
      
      expect(typeof width).toBe('number');
      expect(typeof height).toBe('number');
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it('should measure position properties', async () => {
      const top = await measureCommand.execute(context, 'top');
      const left = await measureCommand.execute(context, 'left');
      
      expect(typeof top).toBe('number');
      expect(typeof left).toBe('number');
    });

    it('should measure offset properties', async () => {
      const offsetWidth = await measureCommand.execute(context, 'offsetWidth');
      const offsetHeight = await measureCommand.execute(context, 'offsetHeight');
      
      expect(typeof offsetWidth).toBe('number');
      expect(typeof offsetHeight).toBe('number');
      expect(offsetWidth).toBeGreaterThan(0);
      expect(offsetHeight).toBeGreaterThan(0);
    });
  });

  describe('Element Targeting', () => {
    it('should measure specific element', async () => {
      const targetElement = document.createElement('span');
      targetElement.style.width = '200px';
      targetElement.style.height = '100px';
      document.body.appendChild(targetElement);
      
      const result = await measureCommand.execute(context, targetElement, 'width');
      
      expect(typeof result).toBe('number');
      
      document.body.removeChild(targetElement);
    });

    it('should measure element from CSS selector', async () => {
      mockElement.id = 'test-element';
      
      const result = await measureCommand.execute(context, '#test-element', 'height');
      
      expect(typeof result).toBe('number');
    });

    it('should measure element with class selector', async () => {
      mockElement.className = 'test-class';
      
      const result = await measureCommand.execute(context, '.test-class', 'width');
      
      expect(typeof result).toBe('number');
    });
  });

  describe('Variable Assignment', () => {
    it('should set measurement in variable', async () => {
      const result = await measureCommand.execute(context, 'width', 'and', 'set', 'elementWidth');
      
      expect(result).toBe(mockElement); // Should return element when setting variable
      expect(context.locals?.get('elementWidth')).toBeTypeOf('number');
      expect(context.locals?.get('elementWidth')).toBeGreaterThan(0);
    });

    it('should set height measurement in variable', async () => {
      await measureCommand.execute(context, 'height', 'and', 'set', 'elementHeight');
      
      const height = context.locals?.get('elementHeight');
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThan(0);
    });

    it('should measure specific element and set variable', async () => {
      const targetElement = document.createElement('div');
      targetElement.style.width = '300px';
      targetElement.id = 'target';
      document.body.appendChild(targetElement);
      
      await measureCommand.execute(context, '#target', 'width', 'and', 'set', 'targetWidth');
      
      const width = context.locals?.get('targetWidth');
      expect(typeof width).toBe('number');
      
      document.body.removeChild(targetElement);
    });
  });

  describe('Comprehensive Measurements', () => {
    it('should measure client dimensions', async () => {
      const clientWidth = await measureCommand.execute(context, 'clientWidth');
      const clientHeight = await measureCommand.execute(context, 'clientHeight');
      
      expect(typeof clientWidth).toBe('number');
      expect(typeof clientHeight).toBe('number');
    });

    it('should measure scroll dimensions', async () => {
      const scrollWidth = await measureCommand.execute(context, 'scrollWidth');
      const scrollHeight = await measureCommand.execute(context, 'scrollHeight');
      
      expect(typeof scrollWidth).toBe('number');
      expect(typeof scrollHeight).toBe('number');
    });

    it('should measure margin properties', async () => {
      const marginTop = await measureCommand.execute(context, 'margin-top');
      const marginLeft = await measureCommand.execute(context, 'margin-left');
      
      expect(typeof marginTop).toBe('number');
      expect(typeof marginLeft).toBe('number');
      expect(marginTop).toBe(5); // From style.margin = '5px'
      expect(marginLeft).toBe(5);
    });

    it('should measure padding properties', async () => {
      const paddingTop = await measureCommand.execute(context, 'padding-top');
      const paddingLeft = await measureCommand.execute(context, 'padding-left');
      
      expect(typeof paddingTop).toBe('number');
      expect(typeof paddingLeft).toBe('number');
      expect(paddingTop).toBe(3); // From style.padding = '3px'
      expect(paddingLeft).toBe(3);
    });

    it('should measure border properties', async () => {
      const borderTopWidth = await measureCommand.execute(context, 'border-top-width');
      const borderLeftWidth = await measureCommand.execute(context, 'border-left-width');
      
      expect(typeof borderTopWidth).toBe('number');
      expect(typeof borderLeftWidth).toBe('number');
      expect(borderTopWidth).toBe(2); // From style.border = '2px solid black'
      expect(borderLeftWidth).toBe(2);
    });
  });

  describe('Kebab-case vs camelCase Properties', () => {
    it('should handle kebab-case property names', async () => {
      const offsetWidth = await measureCommand.execute(context, 'offset-width');
      const offsetHeight = await measureCommand.execute(context, 'offset-height');
      
      expect(typeof offsetWidth).toBe('number');
      expect(typeof offsetHeight).toBe('number');
    });

    it('should handle camelCase property names', async () => {
      const offsetWidth = await measureCommand.execute(context, 'offsetWidth');
      const clientHeight = await measureCommand.execute(context, 'clientHeight');
      
      expect(typeof offsetWidth).toBe('number');
      expect(typeof clientHeight).toBe('number');
    });

    it('should handle scroll properties in both formats', async () => {
      const scrollTop1 = await measureCommand.execute(context, 'scroll-top');
      const scrollTop2 = await measureCommand.execute(context, 'scrollTop');
      
      expect(typeof scrollTop1).toBe('number');
      expect(typeof scrollTop2).toBe('number');
      expect(scrollTop1).toBe(scrollTop2);
    });
  });

  describe('Error Handling', () => {
    it('should handle element not found', async () => {
      await expect(measureCommand.execute(context, '#non-existent', 'width'))
        .rejects.toThrow('Measure target not found');
    });

    it('should handle unknown properties gracefully', async () => {
      const result = await measureCommand.execute(context, 'unknown-property');
      
      expect(typeof result).toBe('number');
      expect(result).toBe(0); // Should return 0 for unknown properties
    });

    it('should handle missing target element', async () => {
      const contextWithoutMe = { locals: new Map() } as ExecutionContext;
      
      await expect(measureCommand.execute(contextWithoutMe))
        .rejects.toThrow('No target element available');
    });
  });

  describe('Advanced Measurement Cases', () => {
    it('should measure elements with transforms', async () => {
      mockElement.style.transform = 'scale(2)';
      
      const width = await measureCommand.execute(context, 'width');
      
      expect(typeof width).toBe('number');
      expect(width).toBeGreaterThan(0);
    });

    it('should measure hidden elements', async () => {
      mockElement.style.display = 'none';
      
      const width = await measureCommand.execute(context, 'offsetWidth');
      
      expect(typeof width).toBe('number');
      // Hidden elements typically have 0 dimensions
      expect(width).toBe(0);
    });

    it('should measure elements with percentage dimensions', async () => {
      mockElement.style.width = '50%';
      mockElement.style.height = '25%';
      
      const width = await measureCommand.execute(context, 'width');
      const height = await measureCommand.execute(context, 'height');
      
      expect(typeof width).toBe('number');
      expect(typeof height).toBe('number');
    });
  });

  describe('Multiple Measurements', () => {
    it('should measure and store multiple properties', async () => {
      await measureCommand.execute(context, 'width', 'and', 'set', 'w');
      await measureCommand.execute(context, 'height', 'and', 'set', 'h');
      await measureCommand.execute(context, 'top', 'and', 'set', 't');
      await measureCommand.execute(context, 'left', 'and', 'set', 'l');
      
      expect(typeof context.locals?.get('w')).toBe('number');
      expect(typeof context.locals?.get('h')).toBe('number');
      expect(typeof context.locals?.get('t')).toBe('number');
      expect(typeof context.locals?.get('l')).toBe('number');
    });

    it('should handle complex measurement workflows', async () => {
      // Measure container dimensions
      const containerWidth = await measureCommand.execute(context, 'width');
      
      // Create child element
      const child = document.createElement('span');
      child.style.width = '50%';
      mockElement.appendChild(child);
      
      // Measure child relative to container
      const childWidth = await measureCommand.execute(context, child, 'width');
      
      expect(typeof containerWidth).toBe('number');
      expect(typeof childWidth).toBe('number');
      expect(childWidth).toBeLessThanOrEqual(containerWidth);
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      expect(measureCommand.validate([])).toBeNull();
      expect(measureCommand.validate(['width'])).toBeNull();
      expect(measureCommand.validate(['width', 'and', 'set', 'w'])).toBeNull();
      expect(measureCommand.validate([mockElement, 'height'])).toBeNull();
      expect(measureCommand.validate(['#selector', 'width', 'and', 'set', 'value'])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(measureCommand.validate(['width', 'and', 'set'])).toContain('Variable name required');
      expect(measureCommand.validate(['width', 'and', 'set', 123])).toContain('Variable name must be a string');
      expect(measureCommand.validate(['width', 'invalid'])).toContain('Invalid measure syntax');
    });

    it('should handle edge cases in validation', () => {
      expect(measureCommand.validate(['width', 'and'])).toContain('Invalid measure syntax');
      expect(measureCommand.validate(['width', 'and', 'invalid'])).toContain('Invalid measure syntax');
    });
  });
});