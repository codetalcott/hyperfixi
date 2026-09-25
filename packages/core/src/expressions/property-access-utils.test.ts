import { describe, it, expect, beforeEach } from 'vitest';
import { accessAttribute, getElementProperty } from './property-access-utils';

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

describe('getElementProperty - value', () => {
  // `my value` read `.value` on input/select/textarea only, so on a <button> —
  // the element the `beep!` corpus row runs on — it was undefined where
  // upstream returns the button's value. Every row here is what `me.value`
  // gives upstream.
  it.each([
    ['button', 'b1'],
    ['option', 'o1'],
    ['output', ''],
    ['data', 'd1'],
  ])('reads the live value of a <%s>', (tag, value) => {
    const el = document.createElement(tag) as HTMLElement & { value: string };
    if (value) el.value = value;
    expect(getElementProperty(el, 'value')).toBe(value);
  });

  it('reads an <li> value as the number it is', () => {
    const li = document.createElement('li');
    li.value = 3;
    expect(getElementProperty(li, 'value')).toBe(3);
  });

  it("reads an input's CURRENT value, not its attribute's initial one", () => {
    const input = document.createElement('input');
    input.setAttribute('value', 'initial');
    input.value = 'typed';
    expect(getElementProperty(input, 'value')).toBe('typed');
  });

  it('is undefined on an element with no value property', () => {
    expect(getElementProperty(document.createElement('div'), 'value')).toBeUndefined();
  });
});

describe('getElementProperty - values pseudo-property', () => {
  it('should return FormData from an HTMLFormElement', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'username';
    input.value = 'john';
    form.appendChild(input);

    const result = getElementProperty(form, 'values');
    expect(result).toBeInstanceOf(FormData);
    expect((result as FormData).get('username')).toBe('john');
  });

  it('should collect inputs from a non-form container', () => {
    const div = document.createElement('div');
    const input = document.createElement('input');
    input.name = 'email';
    input.value = 'test@example.com';
    div.appendChild(input);

    const result = getElementProperty(div, 'values');
    expect(result).toBeInstanceOf(FormData);
    expect((result as FormData).get('email')).toBe('test@example.com');
  });

  it('should return empty FormData for element with no inputs', () => {
    const div = document.createElement('div');
    const result = getElementProperty(div, 'values');
    expect(result).toBeInstanceOf(FormData);
    const entries = Array.from((result as FormData).entries());
    expect(entries).toHaveLength(0);
  });

  it('should collect multiple named inputs', () => {
    const form = document.createElement('form');
    const input1 = document.createElement('input');
    input1.name = 'first';
    input1.value = 'Alice';
    const input2 = document.createElement('input');
    input2.name = 'last';
    input2.value = 'Smith';
    form.appendChild(input1);
    form.appendChild(input2);

    const result = getElementProperty(form, 'values') as FormData;
    expect(result.get('first')).toBe('Alice');
    expect(result.get('last')).toBe('Smith');
  });

  it('should skip inputs without a name attribute', () => {
    const div = document.createElement('div');
    const named = document.createElement('input');
    named.name = 'keep';
    named.value = 'yes';
    const unnamed = document.createElement('input');
    unnamed.value = 'skip';
    div.appendChild(named);
    div.appendChild(unnamed);

    const result = getElementProperty(div, 'values') as FormData;
    expect(result.get('keep')).toBe('yes');
    const entries = Array.from(result.entries());
    expect(entries).toHaveLength(1);
  });
});
