/**
 * Bind Command Tests
 * Test event-based two-way data binding
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { BindCommand, unbind, unbindVariable, getActiveBindings } from './bind';
import type { TypedExecutionContext } from '../../types/command-types';

describe('Bind Command', () => {
  let bindCommand: BindCommand;
  let context: TypedExecutionContext;
  let testElement: HTMLInputElement;

  beforeEach(() => {
    bindCommand = new BindCommand();
    testElement = document.createElement('input');
    testElement.type = 'text';
    testElement.id = 'test-input';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map()
    } as TypedExecutionContext;
  });

  afterEach(() => {
    document.body.removeChild(testElement);
    // Clean up all bindings
    const bindings = getActiveBindings();
    bindings.forEach(b => unbind(b.id));
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(bindCommand.name).toBe('bind');
      expect(bindCommand.metadata.name).toBe('bind');
      expect(bindCommand.metadata.category).toBe('data');
      expect(bindCommand.metadata.version).toBe('1.0.0');
    });

    it('should have correct syntax and description', () => {
      expect(bindCommand.metadata.syntax).toContain('bind');
      expect(bindCommand.metadata.description).toContain('binding');
      expect(bindCommand.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('Bind To (Element → Variable)', () => {
    it('should bind input value to variable', async () => {
      const result = await bindCommand.execute({
        variable: ':username',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      expect(result.success).toBe(true);
      expect(result.variable).toBe('username');
      expect(result.direction).toBe('to');

      // Change input value
      testElement.value = 'Alice';
      testElement.dispatchEvent(new Event('input'));

      // Variable should be updated
      expect(context.locals.get('username')).toBe('Alice');
    });

    it('should bind without : prefix', async () => {
      await bindCommand.execute({
        variable: 'email',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      testElement.value = 'alice@example.com';
      testElement.dispatchEvent(new Event('input'));

      expect(context.locals.get('email')).toBe('alice@example.com');
    });

    it('should bind checkbox checked state', async () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      document.body.appendChild(checkbox);

      context.me = checkbox;

      await bindCommand.execute({
        variable: ':agreed',
        target: checkbox,
        property: 'checked',
        direction: 'to'
      }, context);

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(context.locals.get('agreed')).toBe(true);

      document.body.removeChild(checkbox);
    });

    it('should bind textContent', async () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);

      context.me = div;

      await bindCommand.execute({
        variable: ':content',
        target: div,
        property: 'textContent',
        direction: 'to'
      }, context);

      div.textContent = 'Updated content';
      div.dispatchEvent(new Event('input'));

      expect(context.locals.get('content')).toBe('Updated content');

      document.body.removeChild(div);
    });
  });

  describe('Bind From (Variable → Element)', () => {
    it('should bind variable to input value', async () => {
      // Set initial variable value
      context.locals.set('username', 'Bob');

      await bindCommand.execute({
        variable: ':username',
        target: testElement,
        property: 'value',
        direction: 'from'
      }, context);

      // Element should have initial value
      expect(testElement.value).toBe('Bob');

      // Update variable and dispatch event
      context.locals.set('username', 'Charlie');
      const event = new CustomEvent('variable:username:change', {
        detail: { value: 'Charlie', source: 'variable' }
      });
      testElement.dispatchEvent(event);

      // Element should be updated
      expect(testElement.value).toBe('Charlie');
    });

    it('should bind variable to textContent', async () => {
      const span = document.createElement('span');
      document.body.appendChild(span);

      context.me = span;
      context.locals.set('message', 'Hello');

      await bindCommand.execute({
        variable: ':message',
        target: span,
        property: 'textContent',
        direction: 'from'
      }, context);

      expect(span.textContent).toBe('Hello');

      document.body.removeChild(span);
    });

    it('should update element when variable changes', async () => {
      context.locals.set('count', 0);

      await bindCommand.execute({
        variable: ':count',
        target: testElement,
        property: 'value',
        direction: 'from'
      }, context);

      // Update variable
      context.locals.set('count', 5);
      testElement.dispatchEvent(new CustomEvent('variable:count:change', {
        detail: { value: 5, source: 'variable' }
      }));

      expect(testElement.value).toBe('5');
    });
  });

  describe('Bidirectional Binding', () => {
    it('should sync both ways', async () => {
      context.locals.set('text', 'initial');

      const result = await bindCommand.execute({
        variable: ':text',
        target: testElement,
        property: 'value',
        direction: 'bidirectional'
      }, context);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('bidirectional');

      // Initial sync (variable → element)
      expect(testElement.value).toBe('initial');

      // Change element (element → variable)
      testElement.value = 'changed by user';
      testElement.dispatchEvent(new Event('input'));
      expect(context.locals.get('text')).toBe('changed by user');

      // Change variable (variable → element)
      context.locals.set('text', 'changed by code');
      testElement.dispatchEvent(new CustomEvent('variable:text:change', {
        detail: { value: 'changed by code', source: 'variable' }
      }));
      expect(testElement.value).toBe('changed by code');
    });

    it('should prevent infinite loops', async () => {
      let eventCount = 0;
      testElement.addEventListener('variable:data:change', () => {
        eventCount++;
      });

      await bindCommand.execute({
        variable: ':data',
        target: testElement,
        property: 'value',
        direction: 'bidirectional'
      }, context);

      // Change element
      testElement.value = 'test';
      testElement.dispatchEvent(new Event('input'));

      // Should only fire once, not create infinite loop
      expect(eventCount).toBe(1);
    });
  });

  describe('Element Resolution', () => {
    it('should resolve "me" reference', async () => {
      await bindCommand.execute({
        variable: ':value',
        target: 'me',
        property: 'value',
        direction: 'to'
      }, context);

      testElement.value = 'from me';
      testElement.dispatchEvent(new Event('input'));

      expect(context.locals.get('value')).toBe('from me');
    });

    it('should resolve element by ID selector', async () => {
      const otherInput = document.createElement('input');
      otherInput.id = 'other-input';
      document.body.appendChild(otherInput);

      await bindCommand.execute({
        variable: ':other',
        target: '#other-input',
        property: 'value',
        direction: 'to'
      }, context);

      otherInput.value = 'other value';
      otherInput.dispatchEvent(new Event('input'));

      expect(context.locals.get('other')).toBe('other value');

      document.body.removeChild(otherInput);
    });

    it('should handle HTMLElement directly', async () => {
      await bindCommand.execute({
        variable: ':direct',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      testElement.value = 'direct';
      testElement.dispatchEvent(new Event('input'));

      expect(context.locals.get('direct')).toBe('direct');
    });
  });

  describe('Property Handling', () => {
    it('should default to value property', async () => {
      await bindCommand.execute({
        variable: ':test',
        target: testElement,
        direction: 'to'
      }, context);

      testElement.value = 'default';
      testElement.dispatchEvent(new Event('input'));

      expect(context.locals.get('test')).toBe('default');
    });

    it('should handle attribute syntax', async () => {
      await bindCommand.execute({
        variable: ':title',
        target: testElement,
        property: '@title',
        direction: 'from'
      }, context);

      context.locals.set('title', 'Test Title');
      testElement.dispatchEvent(new CustomEvent('variable:title:change', {
        detail: { value: 'Test Title', source: 'variable' }
      }));

      expect(testElement.getAttribute('title')).toBe('Test Title');
    });

    it('should handle nested properties', async () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      context.me = div;
      context.locals.set('color', 'red');

      await bindCommand.execute({
        variable: ':color',
        target: div,
        property: 'style.color',
        direction: 'from'
      }, context);

      expect(div.style.color).toBe('red');

      document.body.removeChild(div);
    });
  });

  describe('Events', () => {
    it('should dispatch bind:created event', async () => {
      let eventFired = false;
      let eventDetail: any = null;

      testElement.addEventListener('bind:created', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      await bindCommand.execute({
        variable: ':test',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      expect(eventFired).toBe(true);
      expect(eventDetail.variable).toBe('test');
      expect(eventDetail.direction).toBe('to');
    });

    it('should dispatch variable:change events', async () => {
      let changeEventFired = false;

      testElement.addEventListener('variable:username:change', () => {
        changeEventFired = true;
      });

      await bindCommand.execute({
        variable: ':username',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      testElement.value = 'test';
      testElement.dispatchEvent(new Event('input'));

      expect(changeEventFired).toBe(true);
    });
  });

  describe('Binding Management', () => {
    it('should track active bindings', async () => {
      const initialCount = getActiveBindings().length;

      await bindCommand.execute({
        variable: ':test',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      expect(getActiveBindings().length).toBe(initialCount + 1);
    });

    it('should unbind by ID', async () => {
      const result = await bindCommand.execute({
        variable: ':test',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      const bindingId = result.bindingId;
      expect(unbind(bindingId)).toBe(true);
      expect(unbind(bindingId)).toBe(false); // Already unbound
    });

    it('should unbind by variable name', async () => {
      await bindCommand.execute({
        variable: ':email',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      const count = unbindVariable('email');
      expect(count).toBeGreaterThan(0);
    });

    it('should cleanup event listeners on unbind', async () => {
      const result = await bindCommand.execute({
        variable: ':test',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      unbind(result.bindingId);

      // Change value after unbinding
      testElement.value = 'after unbind';
      testElement.dispatchEvent(new Event('input'));

      // Variable should not be updated
      expect(context.locals.get('test')).not.toBe('after unbind');
    });
  });

  describe('Input Validation', () => {
    it('should validate correct input', () => {
      const result = bindCommand.validate({
        variable: ':test',
        target: 'me',
        property: 'value',
        direction: 'to'
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty variable', () => {
      const result = bindCommand.validate({
        variable: '',
        target: 'me',
        direction: 'to'
      });
      expect(result.isValid).toBe(false);
    });

    it('should use default direction', () => {
      const result = bindCommand.validate({
        variable: ':test',
        target: 'me'
      });
      expect(result.isValid).toBe(true);
    });

    it('should provide helpful suggestions on error', () => {
      const result = bindCommand.validate({ invalid: 'data' });
      expect(result.isValid).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s: string) => s.includes('bind'))).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support form input binding', async () => {
      const form = document.createElement('form');
      const nameInput = document.createElement('input');
      nameInput.name = 'name';
      const emailInput = document.createElement('input');
      emailInput.name = 'email';

      form.appendChild(nameInput);
      form.appendChild(emailInput);
      document.body.appendChild(form);

      context.me = form;

      // Bind both inputs
      await bindCommand.execute({
        variable: ':name',
        target: nameInput,
        property: 'value',
        direction: 'to'
      }, context);

      await bindCommand.execute({
        variable: ':email',
        target: emailInput,
        property: 'value',
        direction: 'to'
      }, context);

      // Fill form
      nameInput.value = 'Alice';
      nameInput.dispatchEvent(new Event('input'));
      emailInput.value = 'alice@example.com';
      emailInput.dispatchEvent(new Event('input'));

      // Variables should be updated
      expect(context.locals.get('name')).toBe('Alice');
      expect(context.locals.get('email')).toBe('alice@example.com');

      document.body.removeChild(form);
    });

    it('should support real-time display update', async () => {
      const input = document.createElement('input');
      const display = document.createElement('span');
      document.body.appendChild(input);
      document.body.appendChild(display);

      context.me = input;

      // Bidirectional binding
      await bindCommand.execute({
        variable: ':message',
        target: input,
        property: 'value',
        direction: 'bidirectional'
      }, context);

      await bindCommand.execute({
        variable: ':message',
        target: display,
        property: 'textContent',
        direction: 'from'
      }, context);

      // Type in input
      input.value = 'Hello World';
      input.dispatchEvent(new Event('input'));

      // Display should update
      display.dispatchEvent(new CustomEvent('variable:message:change', {
        detail: { value: 'Hello World', source: 'element' }
      }));

      expect(display.textContent).toBe('Hello World');

      document.body.removeChild(input);
      document.body.removeChild(display);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined variable values', async () => {
      context.locals.set('nullable', null);

      await bindCommand.execute({
        variable: ':nullable',
        target: testElement,
        property: 'value',
        direction: 'from'
      }, context);

      expect(testElement.value).toBe('null');
    });

    it('should handle rapid updates', async () => {
      await bindCommand.execute({
        variable: ':rapid',
        target: testElement,
        property: 'value',
        direction: 'to'
      }, context);

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        testElement.value = `value-${i}`;
        testElement.dispatchEvent(new Event('input'));
      }

      expect(context.locals.get('rapid')).toBe('value-99');
    });

    it('should handle element removal', async () => {
      const tempElement = document.createElement('input');
      document.body.appendChild(tempElement);

      const result = await bindCommand.execute({
        variable: ':temp',
        target: tempElement,
        property: 'value',
        direction: 'to'
      }, context);

      // Remove element
      document.body.removeChild(tempElement);

      // Should not throw when trying to unbind
      expect(() => unbind(result.bindingId)).not.toThrow();
    });
  });
});
