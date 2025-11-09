/**
 * End-to-End Integration Tests for Hyperscript
 * Tests complete hyperscript programs with real DOM elements and events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';

describe('End-to-End Hyperscript Integration', () => {
  let container: HTMLElement;
  let button: HTMLButtonElement;
  let target: HTMLElement;
  let form: HTMLFormElement;

  beforeEach(() => {
    // Create a realistic DOM structure for testing
    document.body.innerHTML = '';

    container = document.createElement('div');
    container.id = 'test-container';
    container.className = 'container';

    button = document.createElement('button');
    button.id = 'test-button';
    button.textContent = 'Click me';
    button.className = 'btn primary';

    target = document.createElement('div');
    target.id = 'target-element';
    target.textContent = 'Target content';
    target.className = 'target hidden';
    target.style.display = 'none';

    form = document.createElement('form');
    form.id = 'test-form';

    const input = document.createElement('input');
    input.name = 'username';
    input.value = 'testuser';
    input.type = 'text';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Submit';
    submitBtn.id = 'submit-button';

    form.appendChild(input);
    form.appendChild(submitBtn);

    container.appendChild(button);
    container.appendChild(target);
    container.appendChild(form);

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('DOM Manipulation Integration', () => {
    it('should hide and show elements with real DOM', async () => {
      // Test hiding an element
      const context = hyperscript.createContext(target);

      // Element should start visible (removing display: none for test)
      target.style.display = 'block';
      expect(target.style.display).toBe('block');

      // Execute hide command
      await hyperscript.run('hide me', context);
      expect(target.style.display).toBe('none');

      // Execute show command
      await hyperscript.run('show me', context);
      expect(target.style.display).toBe('block');
    });

    it('should hide and show elements by selector', async () => {
      const context = hyperscript.createContext(button);

      // Start with target visible
      target.style.display = 'block';
      expect(target.style.display).toBe('block');

      // Hide by ID selector
      await hyperscript.run('hide "#target-element"', context);
      expect(target.style.display).toBe('none');

      // Show by class selector
      await hyperscript.run('show ".target"', context);
      expect(target.style.display).toBe('block');
    });

    it('should add and remove CSS classes', async () => {
      const context = hyperscript.createContext(target);

      expect(target.classList.contains('active')).toBe(false);

      // Add class
      await hyperscript.run('add ".active"', context);
      expect(target.classList.contains('active')).toBe(true);

      // Remove class
      await hyperscript.run('remove ".active"', context);
      expect(target.classList.contains('active')).toBe(false);
    });

    it('should manipulate element content', async () => {
      const context = hyperscript.createContext(target);

      expect(target.textContent).toBe('Target content');

      // Change text content
      await hyperscript.run('put "New content" into me', context);
      expect(target.textContent).toBe('New content');
    });

    it('should work with wait command for timing', async () => {
      const context = hyperscript.createContext(target);

      const startTime = Date.now();

      // Wait for 100ms
      await hyperscript.run('wait 100', context);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have waited approximately 100ms (allow some tolerance)
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Event Handling Integration', () => {
    it('should handle click events with hyperscript', async () => {
      let clickExecuted = false;

      // Set up click handler
      const context = hyperscript.createContext(button);

      button.addEventListener('click', async () => {
        clickExecuted = true;
        await hyperscript.run('add ".clicked"', context);
      });

      // Simulate click
      button.click();

      // Allow for async execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(clickExecuted).toBe(true);
      expect(button.classList.contains('clicked')).toBe(true);
    });

    it('should handle form input events', async () => {
      const input = form.querySelector('input') as HTMLInputElement;
      let inputChanged = false;

      const context = hyperscript.createContext(input);

      input.addEventListener('input', async () => {
        inputChanged = true;
        await hyperscript.run('add ".modified"', context);
      });

      // Simulate input change
      input.value = 'newvalue';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Allow for async execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(inputChanged).toBe(true);
      expect(input.classList.contains('modified')).toBe(true);
    });

    it('should handle keyboard events', async () => {
      const input = form.querySelector('input') as HTMLInputElement;
      let keyPressed = false;

      const context = hyperscript.createContext(input);

      input.addEventListener('keydown', async e => {
        if (e.key === 'Enter') {
          keyPressed = true;
          await hyperscript.run('add ".enter-pressed"', context);
        }
      });

      // Simulate Enter key press
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      input.dispatchEvent(keyEvent);

      // Allow for async execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(keyPressed).toBe(true);
      expect(input.classList.contains('enter-pressed')).toBe(true);
    });
  });

  describe('Context Management Integration', () => {
    it('should handle element targeting with me context', async () => {
      const context = hyperscript.createContext(target);

      // Start with element visible
      target.style.display = 'block';

      // Hide 'me' (current context element)
      await hyperscript.run('hide me', context);
      expect(target.style.display).toBe('none');

      // Show 'me' again
      await hyperscript.run('show me', context);
      expect(target.style.display).toBe('block');
    });

    it('should handle context variable access', async () => {
      const context = hyperscript.createContext(button);

      // Set variables directly in context for testing
      if (!context.variables) context.variables = new Map();
      context.variables.set('testVar', 'test value');

      // Test that we can access context variables through evaluation
      const result = await hyperscript.run('testVar', context);
      expect(result).toBe('test value');
    });

    it('should handle context inheritance', async () => {
      const parentContext = hyperscript.createContext();
      parentContext.globals?.set('globalVar', 'global-value');

      const childContext = hyperscript.createChildContext(parentContext, button);
      childContext.locals?.set('localVar', 'local-value');

      // Verify globals are shared
      expect(childContext.globals?.get('globalVar')).toBe('global-value');

      // Verify locals are separate
      expect(childContext.locals?.get('localVar')).toBe('local-value');
      expect(parentContext.locals?.has('localVar')).toBe(false);
    });
  });

  describe('Sequential Operations', () => {
    it('should execute multiple commands sequentially', async () => {
      const context = hyperscript.createContext(button);

      // Test sequential execution by calling multiple commands
      await hyperscript.run('add ".step1"', context);
      expect(button.classList.contains('step1')).toBe(true);

      await hyperscript.run('add ".step2"', context);
      expect(button.classList.contains('step2')).toBe(true);

      await hyperscript.run('put "Updated text" into me', context);
      expect(button.textContent).toBe('Updated text');
    });

    it('should handle arithmetic expressions in context', async () => {
      const context = hyperscript.createContext(button);

      // Test basic arithmetic (using expression evaluator)
      const result = await hyperscript.run('5 + 3', context);
      expect(result).toBe(8);

      const result2 = await hyperscript.run('10 * 2', context);
      expect(result2).toBe(20);
    });

    it('should handle context variables in expressions', async () => {
      const context = hyperscript.createContext(button);

      // Set variables directly in context for testing
      if (!context.variables) context.variables = new Map();
      context.variables.set('counter', 1);
      context.variables.set('message', 'Hello');

      // Test variable evaluation
      const counterResult = await hyperscript.run('counter', context);
      expect(counterResult).toBe(1);

      const messageResult = await hyperscript.run('message', context);
      expect(messageResult).toBe('Hello');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing context element gracefully', async () => {
      const context = hyperscript.createContext(null);

      // Try to manipulate null context element
      await expect(hyperscript.run('hide me', context)).rejects.toThrow(
        'Context element "me" is null'
      );
    });

    it('should handle invalid syntax gracefully', async () => {
      const context = hyperscript.createContext(button);

      // Try invalid syntax - should fail at compilation
      await expect(hyperscript.run('invalidCommand me', context)).rejects.toThrow(
        'Compilation failed'
      );
    });

    it('should handle compilation errors gracefully', async () => {
      const context = hyperscript.createContext(button);

      // Try invalid syntax
      await expect(hyperscript.run('invalid @@ syntax', context)).rejects.toThrow(
        'Compilation failed'
      );
    });

    it('should handle undefined variables gracefully', async () => {
      const context = hyperscript.createContext(button);

      // Try to access undefined variable - should return undefined/name
      const result = await hyperscript.run('undefinedVariable', context);
      expect(result).toBe('undefinedVariable'); // Parser returns identifier name if not found
    });
  });

  describe('Performance Integration', () => {
    it('should execute basic commands efficiently', async () => {
      const context = hyperscript.createContext(button);

      // Measure performance of basic operations
      const startTime = performance.now();

      // Execute multiple commands
      for (let i = 0; i < 100; i++) {
        await hyperscript.run('add ".test"', context);
        await hyperscript.run('remove ".test"', context);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000); // 1 second max for 100 operations
    });

    it('should handle rapid sequential commands', async () => {
      const context = hyperscript.createContext(button);

      // Execute rapid sequence of commands
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(hyperscript.run(`add ".batch${i}"`, context));
      }

      await Promise.all(promises);

      // Verify all classes were added
      for (let i = 0; i < 10; i++) {
        expect(button.classList.contains(`batch${i}`)).toBe(true);
      }
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should implement simple show/hide toggle functionality', async () => {
      // Create modal structure
      const modal = document.createElement('div');
      modal.id = 'modal';
      modal.className = 'modal';
      modal.style.display = 'none';

      const openBtn = document.createElement('button');
      openBtn.id = 'open-modal';
      openBtn.textContent = 'Open Modal';

      const closeBtn = document.createElement('button');
      closeBtn.id = 'close-modal';
      closeBtn.textContent = 'Close';

      modal.appendChild(closeBtn);
      container.appendChild(modal);
      container.appendChild(openBtn);

      // Set up modal functionality with sequential commands
      openBtn.addEventListener('click', async () => {
        const context = hyperscript.createContext(openBtn);
        await hyperscript.run('show "#modal"', context);
        await hyperscript.run('add ".active"', { ...context, me: modal });
      });

      closeBtn.addEventListener('click', async () => {
        const context = hyperscript.createContext(closeBtn);
        await hyperscript.run('hide "#modal"', context);
        await hyperscript.run('remove ".active"', { ...context, me: modal });
      });

      // Test modal opening
      openBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(modal.style.display).toBe('block');
      expect(modal.classList.contains('active')).toBe(true);

      // Test modal closing
      closeBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(modal.style.display).toBe('none');
      expect(modal.classList.contains('active')).toBe(false);
    });

    it('should implement basic button state management', async () => {
      const statusDiv = document.createElement('div');
      statusDiv.id = 'status';
      statusDiv.textContent = 'Ready';

      const actionBtn = document.createElement('button');
      actionBtn.id = 'action-btn';
      actionBtn.textContent = 'Start Action';

      container.appendChild(statusDiv);
      container.appendChild(actionBtn);

      actionBtn.addEventListener('click', async () => {
        const btnContext = hyperscript.createContext(actionBtn);
        const statusContext = hyperscript.createContext(statusDiv);

        // Update button state
        await hyperscript.run('add ".loading"', btnContext);
        await hyperscript.run('put "Working..." into me', statusContext);

        // Simulate work with wait
        await hyperscript.run('wait 100', btnContext);

        // Reset state
        await hyperscript.run('remove ".loading"', btnContext);
        await hyperscript.run('put "Complete!" into me', statusContext);
      });

      // Test the workflow
      actionBtn.click();

      // Check immediate state
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(actionBtn.classList.contains('loading')).toBe(true);
      expect(statusDiv.textContent).toBe('Working...');

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(actionBtn.classList.contains('loading')).toBe(false);
      expect(statusDiv.textContent).toBe('Complete!');
    });

    it('should implement basic form interaction', async () => {
      const input = form.querySelector('input') as HTMLInputElement;
      const feedback = document.createElement('div');
      feedback.id = 'feedback';
      feedback.className = 'feedback';
      feedback.style.display = 'none';
      form.appendChild(feedback);

      input.addEventListener('input', async () => {
        const context = hyperscript.createContext(feedback);

        if (input.value.length > 0) {
          await hyperscript.run('show me', context);
          await hyperscript.run('put "Typing..." into me', context);
        } else {
          await hyperscript.run('hide me', context);
        }
      });

      // Test typing
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(feedback.style.display).toBe('block');
      expect(feedback.textContent).toBe('Typing...');

      // Test clearing
      input.value = '';
      input.dispatchEvent(new Event('input'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(feedback.style.display).toBe('none');
    });
  });
});
