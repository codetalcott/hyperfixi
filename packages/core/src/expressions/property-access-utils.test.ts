import { describe, it, expect, beforeEach } from 'vitest';
import { accessAttribute } from './property-access-utils';

describe('accessAttribute', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('button');
  });

  describe('boolean attributes', () => {
    it('returns true when disabled attribute is present', () => {
      element.setAttribute('disabled', '');
      expect(accessAttribute(element, 'disabled')).toBe(true);
    });

    it('returns false when disabled attribute is absent', () => {
      expect(accessAttribute(element, 'disabled')).toBe(false);
    });

    it('returns true when required attribute is present', () => {
      const input = document.createElement('input');
      input.setAttribute('required', '');
      expect(accessAttribute(input, 'required')).toBe(true);
    });

    it('returns false when required attribute is absent', () => {
      const input = document.createElement('input');
      expect(accessAttribute(input, 'required')).toBe(false);
    });

    it('returns true for checked attribute when present', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('checked', '');
      expect(accessAttribute(checkbox, 'checked')).toBe(true);
    });

    it('returns false for checked attribute when absent', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      expect(accessAttribute(checkbox, 'checked')).toBe(false);
    });

    it('handles all standard boolean attributes', () => {
      const booleanAttrs = [
        'disabled',
        'readonly',
        'required',
        'checked',
        'selected',
        'hidden',
        'open',
        'autofocus',
        'autoplay',
        'controls',
        'loop',
        'muted',
        'multiple',
        'reversed',
        'defer',
        'async',
        'novalidate',
        'formnovalidate',
        'ismap',
      ];

      booleanAttrs.forEach(attr => {
        element.setAttribute(attr, '');
        expect(accessAttribute(element, attr)).toBe(true);
        element.removeAttribute(attr);
        expect(accessAttribute(element, attr)).toBe(false);
      });
    });

    it('is case-insensitive for attribute names', () => {
      element.setAttribute('disabled', '');
      expect(accessAttribute(element, 'DISABLED')).toBe(true);
      expect(accessAttribute(element, 'Disabled')).toBe(true);
    });
  });

  describe('regular attributes', () => {
    it('returns string value for data attributes', () => {
      element.setAttribute('data-foo', 'bar');
      expect(accessAttribute(element, 'data-foo')).toBe('bar');
    });

    it('returns string value for id attribute', () => {
      element.setAttribute('id', 'my-id');
      expect(accessAttribute(element, 'id')).toBe('my-id');
    });

    it('returns string value for class attribute', () => {
      element.setAttribute('class', 'foo bar');
      expect(accessAttribute(element, 'class')).toBe('foo bar');
    });

    it('returns null for absent regular attributes', () => {
      expect(accessAttribute(element, 'data-missing')).toBeNull();
    });

    it('returns empty string for attributes with no value', () => {
      element.setAttribute('data-empty', '');
      expect(accessAttribute(element, 'data-empty')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles attributes with hyphenated names', () => {
      element.setAttribute('aria-label', 'test');
      expect(accessAttribute(element, 'aria-label')).toBe('test');
    });

    it('handles custom boolean-like attributes as regular attributes', () => {
      element.setAttribute('data-enabled', 'true');
      expect(accessAttribute(element, 'data-enabled')).toBe('true'); // String, not boolean
    });
  });
});
