/**
 * Behavior Definitions Tests
 * TDD implementation of _hyperscript behavior system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test-setup.js';
import type { ExecutionContext } from '../../types/core.js';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup.js';

describe('Behavior Definitions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement);
    document.body.appendChild(testElement);
  });

  describe('Basic Behavior Definition', () => {
    it('should define a simple behavior with no parameters', async () => {
      const behaviorCode = `
        behavior SimpleBehavior
          init
            set my.message to "initialized"
          end
          
          on click
            log "clicked"
          end
        end
      `;

      // This should parse and register the behavior
      const behavior = await parseAndDefineBehavior(behaviorCode);
      
      expect(behavior).toBeDefined();
      expect(behavior.name).toBe('SimpleBehavior');
      expect(behavior.parameters).toEqual([]);
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.eventHandlers).toHaveLength(1);
      expect(behavior.eventHandlers[0].event).toBe('click');
    });

    it('should define a behavior with parameters', async () => {
      const behaviorCode = `
        behavior Removable(removeButton)
          init
            if no removeButton set the removeButton to me
          end
          
          on click from removeButton
            remove me
          end
        end
      `;

      const behavior = await parseAndDefineBehavior(behaviorCode);
      
      expect(behavior).toBeDefined();
      expect(behavior.name).toBe('Removable');
      expect(behavior.parameters).toEqual(['removeButton']);
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.eventHandlers).toHaveLength(1);
    });

    it('should define a behavior with multiple parameters', async () => {
      const behaviorCode = `
        behavior ToggleButton(toggleClass, targetElement)
          init
            if no toggleClass set the toggleClass to "active"
            if no targetElement set the targetElement to me
          end
          
          on click
            toggle the toggleClass on targetElement
          end
        end
      `;

      const behavior = await parseAndDefineBehavior(behaviorCode);
      
      expect(behavior).toBeDefined();
      expect(behavior.name).toBe('ToggleButton');
      expect(behavior.parameters).toEqual(['toggleClass', 'targetElement']);
    });
  });

  describe('Behavior Installation', () => {
    it('should install a simple behavior on an element', async () => {
      // First define the behavior
      const behaviorCode = `
        behavior Clickable
          init
            set my.clickCount to 0
          end
          
          on click
            increment my.clickCount
            put my.clickCount into me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      // Then install it
      const installCode = 'install Clickable';
      await executeHyperscript(installCode, testElement, context);
      
      // Verify behavior was installed
      expect(testElement.clickCount).toBe(0);
      
      // Simulate click to test behavior
      testElement.click();
      expect(testElement.clickCount).toBe(1);
      expect(testElement.textContent).toBe('1');
    });

    it('should install a behavior with parameters', async () => {
      const behaviorCode = `
        behavior Removable(removeButton)
          init
            if no removeButton set the removeButton to me
          end
          
          on click from removeButton
            remove me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      // Create remove button
      const removeBtn = createTestElement('<button id="remove-btn">Remove</button>');
      document.body.appendChild(removeBtn);
      
      // Install behavior with parameter
      const installCode = 'install Removable(removeButton: #remove-btn)';
      await executeHyperscript(installCode, testElement, context);
      
      // Verify behavior works
      expect(document.body.contains(testElement)).toBe(true);
      removeBtn.click();
      expect(document.body.contains(testElement)).toBe(false);
    });

    it('should install behavior with default parameter values', async () => {
      const behaviorCode = `
        behavior ToggleClass(className)
          init
            if no className set the className to "active"
          end
          
          on click
            toggle the className on me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      // Install without specifying className parameter
      const installCode = 'install ToggleClass';
      await executeHyperscript(installCode, testElement, context);
      
      // Test default behavior
      expect(testElement.classList.contains('active')).toBe(false);
      testElement.click();
      expect(testElement.classList.contains('active')).toBe(true);
    });
  });

  describe('Multiple Behaviors', () => {
    it('should allow multiple behaviors on same element', async () => {
      const behavior1 = `
        behavior Highlighter
          on mouseenter add .highlight to me
          on mouseleave remove .highlight from me
        end
      `;

      const behavior2 = `
        behavior Counter
          init
            set my.count to 0
          end
          
          on click
            increment my.count
            put "Clicked " + my.count + " times" into me
          end
        end
      `;

      await parseAndDefineBehavior(behavior1);
      await parseAndDefineBehavior(behavior2);
      
      // Install both behaviors
      await executeHyperscript('install Highlighter', testElement, context);
      await executeHyperscript('install Counter', testElement, context);
      
      // Test first behavior
      testElement.dispatchEvent(new MouseEvent('mouseenter'));
      expect(testElement.classList.contains('highlight')).toBe(true);
      
      // Test second behavior
      testElement.click();
      expect(testElement.textContent).toBe('Clicked 1 times');
      expect(testElement.count).toBe(1);
    });

    it('should handle behavior conflicts gracefully', async () => {
      const behavior1 = `
        behavior FirstBehavior
          on click put "First" into me
        end
      `;

      const behavior2 = `
        behavior SecondBehavior
          on click put "Second" into me
        end
      `;

      await parseAndDefineBehavior(behavior1);
      await parseAndDefineBehavior(behavior2);
      
      await executeHyperscript('install FirstBehavior', testElement, context);
      await executeHyperscript('install SecondBehavior', testElement, context);
      
      // Both handlers should execute (last one wins for content)
      testElement.click();
      expect(testElement.textContent).toBe('Second');
    });
  });

  describe('Behavior Lifecycle', () => {
    it('should execute init block when behavior is installed', async () => {
      const behaviorCode = `
        behavior InitTester
          init
            set my.initialized to true
            set my.initTime to Date.now()
            add .initialized to me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      const beforeInstall = Date.now();
      await executeHyperscript('install InitTester', testElement, context);
      const afterInstall = Date.now();
      
      expect(testElement.initialized).toBe(true);
      expect(testElement.initTime).toBeGreaterThanOrEqual(beforeInstall);
      expect(testElement.initTime).toBeLessThanOrEqual(afterInstall);
      expect(testElement.classList.contains('initialized')).toBe(true);
    });

    it('should handle complex init logic', async () => {
      const behaviorCode = `
        behavior ComplexInit(config)
          init
            if no config set config to {}
            if no config.theme set config.theme to "default"
            if no config.timeout set config.timeout to 1000
            
            set my.behaviorConfig to config
            add ("theme-" + config.theme) to me
            
            wait config.timeout ms then add .ready to me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      const config = { theme: "dark", timeout: 100 };
      await executeHyperscript('install ComplexInit(config: {theme: "dark", timeout: 100})', testElement, context);
      
      expect(testElement.behaviorConfig).toEqual(config);
      expect(testElement.classList.contains('theme-dark')).toBe(true);
      
      // Wait for async init to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(testElement.classList.contains('ready')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed behavior definitions', async () => {
      const malformedCode = `
        behavior BadBehavior
          init
            this is not valid hyperscript
          end
        end
      `;

      await expect(parseAndDefineBehavior(malformedCode))
        .rejects.toThrow('Invalid behavior definition');
    });

    it('should handle installing undefined behaviors', async () => {
      await expect(executeHyperscript('install NonExistentBehavior', testElement, context))
        .rejects.toThrow('Behavior "NonExistentBehavior" is not defined');
    });

    it('should handle parameter type mismatches', async () => {
      const behaviorCode = `
        behavior TypeSensitive(element)
          init
            if element matches Element then add .valid to me
            else add .invalid to me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      // Install with invalid parameter type
      await executeHyperscript('install TypeSensitive(element: "not-an-element")', testElement, context);
      expect(testElement.classList.contains('invalid')).toBe(true);
    });
  });

  describe('Behavior Reuse', () => {
    it('should allow same behavior on multiple elements', async () => {
      const behaviorCode = `
        behavior Badge
          init
            set my.badgeCount to 0
            put my.badgeCount into me
          end
          
          on increment
            increment my.badgeCount
            put my.badgeCount into me
          end
        end
      `;

      await parseAndDefineBehavior(behaviorCode);
      
      const element1 = createTestElement('<div id="badge1"></div>');
      const element2 = createTestElement('<div id="badge2"></div>');
      
      document.body.appendChild(element1);
      document.body.appendChild(element2);
      
      // Install behavior on both elements
      await executeHyperscript('install Badge', element1, createMockHyperscriptContext(element1));
      await executeHyperscript('install Badge', element2, createMockHyperscriptContext(element2));
      
      // Test independent state
      expect(element1.textContent).toBe('0');
      expect(element2.textContent).toBe('0');
      
      element1.dispatchEvent(new CustomEvent('increment'));
      expect(element1.textContent).toBe('1');
      expect(element2.textContent).toBe('0'); // Should remain unchanged
      
      element2.dispatchEvent(new CustomEvent('increment'));
      element2.dispatchEvent(new CustomEvent('increment'));
      expect(element1.textContent).toBe('1'); // Should remain unchanged
      expect(element2.textContent).toBe('2');
    });
  });
});

// Import actual implementations
import { parseAndDefineBehavior, executeHyperscript } from './index.js';