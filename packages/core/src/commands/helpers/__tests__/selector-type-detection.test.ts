/**
 * Tests for selector-type-detection helpers
 *
 * Covers:
 * - isCSSPropertySelectorNode detection
 * - isClassSelectorNode detection
 * - evaluateFirstArg extraction behavior
 */

import { describe, it, expect } from 'vitest';
import {
  isCSSPropertySelectorNode,
  isClassSelectorNode,
  isIdSelectorNode,
  extractSelectorValue,
  detectSelectorType,
  detectInputType,
} from '../selector-type-detection';

describe('selector-type-detection', () => {
  describe('isCSSPropertySelectorNode', () => {
    it('should return true for selector node with *display value', () => {
      const node = { type: 'selector', value: '*display' };
      expect(isCSSPropertySelectorNode(node)).toBe(true);
    });

    it('should return true for selector node with *opacity value', () => {
      const node = { type: 'selector', value: '*opacity' };
      expect(isCSSPropertySelectorNode(node)).toBe(true);
    });

    it('should return true for selector node with *visibility value', () => {
      const node = { type: 'selector', value: '*visibility' };
      expect(isCSSPropertySelectorNode(node)).toBe(true);
    });

    it('should return true for cssSelector node with *property value', () => {
      const node = { type: 'cssSelector', selector: '*background-color' };
      expect(isCSSPropertySelectorNode(node)).toBe(true);
    });

    it('should return true for cssProperty node', () => {
      const node = { type: 'cssProperty', value: '*opacity' };
      expect(isCSSPropertySelectorNode(node)).toBe(true);
    });

    it('should return false for class selector', () => {
      const node = { type: 'selector', value: '.active' };
      expect(isCSSPropertySelectorNode(node)).toBe(false);
    });

    it('should return false for ID selector', () => {
      const node = { type: 'selector', value: '#myElement' };
      expect(isCSSPropertySelectorNode(node)).toBe(false);
    });

    it('should return false for attribute selector', () => {
      const node = { type: 'selector', value: '@disabled' };
      expect(isCSSPropertySelectorNode(node)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isCSSPropertySelectorNode(null as any)).toBe(false);
      expect(isCSSPropertySelectorNode(undefined as any)).toBe(false);
    });

    it('should return false for non-selector node types', () => {
      const node = { type: 'identifier', name: '*display' };
      expect(isCSSPropertySelectorNode(node)).toBe(false);
    });
  });

  describe('isClassSelectorNode', () => {
    it('should return true for selector node with .class value', () => {
      const node = { type: 'selector', value: '.active' };
      expect(isClassSelectorNode(node)).toBe(true);
    });

    it('should return false for CSS property selector', () => {
      const node = { type: 'selector', value: '*display' };
      expect(isClassSelectorNode(node)).toBe(false);
    });

    it('should return false for ID selector', () => {
      const node = { type: 'selector', value: '#myElement' };
      expect(isClassSelectorNode(node)).toBe(false);
    });
  });

  describe('isIdSelectorNode', () => {
    it('should return true for selector node with #id value', () => {
      const node = { type: 'selector', value: '#myElement' };
      expect(isIdSelectorNode(node)).toBe(true);
    });

    it('should return false for CSS property selector', () => {
      const node = { type: 'selector', value: '*display' };
      expect(isIdSelectorNode(node)).toBe(false);
    });

    it('should return false for class selector', () => {
      const node = { type: 'selector', value: '.active' };
      expect(isIdSelectorNode(node)).toBe(false);
    });
  });

  describe('extractSelectorValue', () => {
    it('should extract value from selector node', () => {
      const node = { type: 'selector', value: '*display' };
      expect(extractSelectorValue(node)).toBe('*display');
    });

    it('should extract selector from cssSelector node', () => {
      const node = { type: 'cssSelector', selector: '.active' };
      expect(extractSelectorValue(node)).toBe('.active');
    });

    it('should extract name from identifier node', () => {
      const node = { type: 'identifier', name: 'myVar' };
      expect(extractSelectorValue(node)).toBe('myVar');
    });
  });

  describe('detectSelectorType', () => {
    it('should detect CSS property selector', () => {
      expect(detectSelectorType('*display')).toBe('css-property');
      expect(detectSelectorType('*opacity')).toBe('css-property');
      expect(detectSelectorType('*visibility')).toBe('css-property');
    });

    it('should detect class selector', () => {
      expect(detectSelectorType('.active')).toBe('class');
      expect(detectSelectorType('.my-class')).toBe('class');
    });

    it('should detect attribute selector', () => {
      expect(detectSelectorType('@disabled')).toBe('attribute');
      expect(detectSelectorType('[@required]')).toBe('attribute');
    });

    it('should detect element/ID selector', () => {
      expect(detectSelectorType('#myElement')).toBe('element');
    });
  });

  describe('detectInputType', () => {
    it('should detect css-property from *property strings', () => {
      expect(detectInputType('*display')).toBe('css-property');
      expect(detectInputType('*opacity')).toBe('css-property');
      expect(detectInputType('*visibility')).toBe('css-property');
      expect(detectInputType('*background-color')).toBe('css-property');
    });

    it('should detect classes from .class strings', () => {
      expect(detectInputType('.active')).toBe('classes');
      expect(detectInputType('.my-class')).toBe('classes');
    });

    it('should detect attribute from @attr strings', () => {
      expect(detectInputType('@disabled')).toBe('attribute');
      expect(detectInputType('[@required]')).toBe('attribute');
    });

    it('should detect element from #id strings', () => {
      expect(detectInputType('#myElement')).toBe('element');
    });
  });
});
