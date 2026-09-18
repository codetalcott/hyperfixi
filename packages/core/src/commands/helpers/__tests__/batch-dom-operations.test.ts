import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  batchApply,
  batchApplyItems,
  batchAddClasses,
  batchRemoveClasses,
  batchToggleClasses,
  batchSetAttribute,
  batchRemoveAttribute,
  batchToggleAttribute,
  toggleAttribute,
  batchSetStyles,
  batchRemoveStyles,
} from '../batch-dom-operations';

describe('Batch DOM Operations', () => {
  let elements: HTMLElement[];

  beforeEach(() => {
    elements = [
      document.createElement('div'),
      document.createElement('div'),
      document.createElement('div'),
    ];
    elements.forEach((el, i) => {
      el.id = `test-${i}`;
      document.body.appendChild(el);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('batchApply', () => {
    it('should apply operation to all elements', () => {
      const operation = (el: Element) => {
        el.classList.add('processed');
      };

      const result = batchApply(elements, operation);

      elements.forEach(el => {
        expect(el.classList.contains('processed')).toBe(true);
      });
      expect(result).toBe(elements);
    });

    it('should return the same array for chaining', () => {
      const operation = (el: Element) => {
        el.setAttribute('data-test', 'value');
      };

      const result = batchApply(elements, operation);

      expect(result).toBe(elements);
      expect(result).toHaveLength(3);
    });
  });

  describe('batchApplyItems', () => {
    it('should execute nested loop for elements and items', () => {
      const items = ['item-1', 'item-2'];
      const calls: string[] = [];

      const operation = (el: Element, item: string) => {
        calls.push(`${el.id}-${item}`);
      };

      const result = batchApplyItems(elements, items, operation);

      expect(calls).toEqual([
        'test-0-item-1',
        'test-0-item-2',
        'test-1-item-1',
        'test-1-item-2',
        'test-2-item-1',
        'test-2-item-2',
      ]);
      expect(result).toBe(elements);
    });

    it('should handle empty items array', () => {
      const calls: string[] = [];

      const operation = (el: Element, item: string) => {
        calls.push(`${el.id}-${item}`);
      };

      batchApplyItems(elements, [], operation);

      expect(calls).toEqual([]);
    });
  });

  describe('batchAddClasses', () => {
    it('should add classes to all elements', () => {
      const classes = ['class-1', 'class-2'];

      const result = batchAddClasses(elements, classes);

      elements.forEach(el => {
        expect(el.classList.contains('class-1')).toBe(true);
        expect(el.classList.contains('class-2')).toBe(true);
      });
      expect(result).toBe(elements);
    });

    it('should be idempotent and not duplicate classes', () => {
      const classes = ['duplicate'];

      elements[0].classList.add('duplicate');

      batchAddClasses(elements, classes);

      expect(elements[0].classList.length).toBe(1);
      expect(elements[0].className).toBe('duplicate');
    });
  });

  describe('batchRemoveClasses', () => {
    it('should remove classes from all elements', () => {
      const classes = ['remove-1', 'remove-2'];

      elements.forEach(el => {
        el.classList.add('remove-1', 'remove-2', 'keep');
      });

      const result = batchRemoveClasses(elements, classes);

      elements.forEach(el => {
        expect(el.classList.contains('remove-1')).toBe(false);
        expect(el.classList.contains('remove-2')).toBe(false);
        expect(el.classList.contains('keep')).toBe(true);
      });
      expect(result).toBe(elements);
    });

    it('should be safe when removing non-existent classes', () => {
      const classes = ['non-existent'];

      const result = batchRemoveClasses(elements, classes);

      elements.forEach(el => {
        expect(el.classList.length).toBe(0);
      });
      expect(result).toBe(elements);
    });
  });

  describe('batchToggleClasses', () => {
    it('should toggle classes on all elements', () => {
      const classes = ['toggle-1', 'toggle-2'];

      elements[0].classList.add('toggle-1');
      elements[1].classList.add('toggle-2');

      const result = batchToggleClasses(elements, classes);

      expect(elements[0].classList.contains('toggle-1')).toBe(false);
      expect(elements[0].classList.contains('toggle-2')).toBe(true);
      expect(elements[1].classList.contains('toggle-1')).toBe(true);
      expect(elements[1].classList.contains('toggle-2')).toBe(false);
      expect(elements[2].classList.contains('toggle-1')).toBe(true);
      expect(elements[2].classList.contains('toggle-2')).toBe(true);
      expect(result).toBe(elements);
    });
  });

  describe('batchSetAttribute', () => {
    it('should set attribute on all elements', () => {
      const result = batchSetAttribute(elements, 'data-test', 'value');

      elements.forEach(el => {
        expect(el.getAttribute('data-test')).toBe('value');
      });
      expect(result).toBe(elements);
    });

    it('should handle empty string values', () => {
      batchSetAttribute(elements, 'data-empty', '');

      elements.forEach(el => {
        expect(el.getAttribute('data-empty')).toBe('');
        expect(el.hasAttribute('data-empty')).toBe(true);
      });
    });
  });

  describe('batchRemoveAttribute', () => {
    it('should remove attribute from all elements', () => {
      elements.forEach(el => {
        el.setAttribute('data-remove', 'value');
      });

      const result = batchRemoveAttribute(elements, 'data-remove');

      elements.forEach(el => {
        expect(el.hasAttribute('data-remove')).toBe(false);
      });
      expect(result).toBe(elements);
    });
  });

  describe('toggleAttribute', () => {
    it('should toggle attribute presence when no value provided', () => {
      const el = elements[0];

      toggleAttribute(el, 'data-toggle');
      expect(el.hasAttribute('data-toggle')).toBe(true);

      toggleAttribute(el, 'data-toggle');
      expect(el.hasAttribute('data-toggle')).toBe(false);
    });

    it('should toggle attribute based on value match', () => {
      const el = elements[0];

      toggleAttribute(el, 'data-state', 'active');
      expect(el.getAttribute('data-state')).toBe('active');

      toggleAttribute(el, 'data-state', 'active');
      expect(el.hasAttribute('data-state')).toBe(false);
    });

    it('should set attribute when value does not match', () => {
      const el = elements[0];

      el.setAttribute('data-state', 'inactive');
      toggleAttribute(el, 'data-state', 'active');

      expect(el.getAttribute('data-state')).toBe('active');
    });
  });

  describe('batchToggleAttribute', () => {
    it('should toggle attribute on all elements without value', () => {
      elements[0].setAttribute('disabled', '');

      const result = batchToggleAttribute(elements, 'disabled');

      expect(elements[0].hasAttribute('disabled')).toBe(false);
      expect(elements[1].hasAttribute('disabled')).toBe(true);
      expect(elements[2].hasAttribute('disabled')).toBe(true);
      expect(result).toBe(elements);
    });

    it('should toggle attribute on all elements with value', () => {
      elements[0].setAttribute('data-mode', 'light');
      elements[1].setAttribute('data-mode', 'dark');

      const result = batchToggleAttribute(elements, 'data-mode', 'dark');

      expect(elements[0].getAttribute('data-mode')).toBe('dark');
      expect(elements[1].hasAttribute('data-mode')).toBe(false);
      expect(elements[2].getAttribute('data-mode')).toBe('dark');
      expect(result).toBe(elements);
    });
  });

  describe('batchSetStyles', () => {
    it('should set styles on all elements', () => {
      const styles: Record<string, string> = {
        color: 'red',
        fontSize: '16px',
        backgroundColor: 'blue',
      };

      const result = batchSetStyles(elements, styles);

      // camelCase keys (what `add {fontSize: '16px'}` produces) must land under
      // their CSS names — browsers ignore setProperty('fontSize', …).
      elements.forEach(el => {
        expect(el.style.getPropertyValue('color')).toBe('red');
        expect(el.style.getPropertyValue('font-size')).toBe('16px');
        expect(el.style.getPropertyValue('background-color')).toBe('blue');
      });
      expect(result).toBe(elements);
    });

    it('should handle CSS custom properties', () => {
      const styles: Record<string, string> = {
        '--primary-color': '#ff0000',
        '--spacing': '8px',
        // Custom properties are case-sensitive: must not be kebab-cased.
        '--brandColor': 'teal',
      };

      batchSetStyles(elements, styles);

      elements.forEach(el => {
        expect(el.style.getPropertyValue('--primary-color')).toBe('#ff0000');
        expect(el.style.getPropertyValue('--spacing')).toBe('8px');
        expect(el.style.getPropertyValue('--brandColor')).toBe('teal');
      });
    });

    it('should handle empty styles object', () => {
      batchSetStyles(elements, {});

      elements.forEach(el => {
        expect(el.style.length).toBe(0);
      });
    });
  });

  describe('batchRemoveStyles', () => {
    it('should remove styles from all elements', () => {
      elements.forEach(el => {
        el.style.setProperty('color', 'red');
        el.style.setProperty('font-size', '16px');
        el.style.setProperty('background-color', 'blue');
      });

      const result = batchRemoveStyles(elements, ['color', 'fontSize']);

      elements.forEach(el => {
        expect(el.style.getPropertyValue('color')).toBe('');
        expect(el.style.getPropertyValue('font-size')).toBe('');
        expect(el.style.getPropertyValue('background-color')).toBe('blue');
      });
      expect(result).toBe(elements);
    });

    it('should handle CSS custom properties removal', () => {
      elements.forEach(el => {
        el.style.setProperty('--primary-color', '#ff0000');
        el.style.setProperty('--spacing', '8px');
      });

      batchRemoveStyles(elements, ['--primary-color']);

      elements.forEach(el => {
        expect(el.style.getPropertyValue('--primary-color')).toBe('');
        expect(el.style.getPropertyValue('--spacing')).toBe('8px');
      });
    });

    it('should be safe when removing non-existent styles', () => {
      const result = batchRemoveStyles(elements, ['nonExistentStyle']);

      elements.forEach(el => {
        expect(el.style.length).toBe(0);
      });
      expect(result).toBe(elements);
    });
  });
});
