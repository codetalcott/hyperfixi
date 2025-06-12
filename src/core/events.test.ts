/**
 * Test suite for Event System
 * Hyperscript relies heavily on custom events and event delegation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestElement, waitForEvent } from '../test-setup';
import type { HyperscriptEvent } from '../types/core';
import {
  type HyperscriptEventManager,
  createEventManager,
  registerEventListener,
  unregisterEventListener,
  dispatchCustomEvent,
  createHyperscriptEvent,
  setupEventDelegation,
  cleanupEventDelegation,
  registerManagerForDelegation,
} from './events';

describe('Event System', () => {
  let eventManager: HyperscriptEventManager;
  let testElement: HTMLElement;
  let containerElement: HTMLElement;

  beforeEach(() => {
    containerElement = createTestElement('<div id="container"></div>');
    testElement = createTestElement('<button id="test-btn">Test Button</button>');
    containerElement.appendChild(testElement);
    document.body.appendChild(containerElement);
    
    eventManager = createEventManager();
    registerManagerForDelegation(eventManager);
  });

  afterEach(() => {
    cleanupEventDelegation();
    document.body.innerHTML = '';
  });

  describe('Event Manager Creation', () => {
    it('should create an event manager with proper initial state', () => {
      expect(eventManager).toHaveProperty('listeners');
      expect(eventManager).toHaveProperty('delegatedListeners');
      expect(eventManager.listeners).toBeInstanceOf(Map);
      expect(eventManager.delegatedListeners).toBeInstanceOf(Map);
    });

    it('should allow multiple event managers', () => {
      const manager2 = createEventManager();
      expect(manager2).not.toBe(eventManager);
      expect(manager2.listeners).not.toBe(eventManager.listeners);
    });
  });

  describe('Event Registration', () => {
    it('should register event listeners correctly', () => {
      const handler = vi.fn();
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        handler
      );

      expect(typeof listenerId).toBe('string');
      expect(eventManager.listeners.has(listenerId)).toBe(true);
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const id1 = registerEventListener(eventManager, testElement, 'click', handler1);
      const id2 = registerEventListener(eventManager, testElement, 'click', handler2);
      
      expect(id1).not.toBe(id2);
      expect(eventManager.listeners.has(id1)).toBe(true);
      expect(eventManager.listeners.has(id2)).toBe(true);
    });

    it('should register listeners with options', () => {
      const handler = vi.fn();
      const options = { once: true, passive: true };
      
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        handler,
        options
      );
      
      expect(eventManager.listeners.has(listenerId)).toBe(true);
      const listenerInfo = eventManager.listeners.get(listenerId);
      expect(listenerInfo?.options).toEqual(options);
    });
  });

  describe('Event Unregistration', () => {
    it('should unregister event listeners correctly', () => {
      const handler = vi.fn();
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        handler
      );

      expect(eventManager.listeners.has(listenerId)).toBe(true);
      
      const unregistered = unregisterEventListener(eventManager, listenerId);
      expect(unregistered).toBe(true);
      expect(eventManager.listeners.has(listenerId)).toBe(false);
    });

    it('should handle unregistering non-existent listeners', () => {
      const unregistered = unregisterEventListener(eventManager, 'non-existent-id');
      expect(unregistered).toBe(false);
    });

    it('should clean up DOM event listeners when unregistering', () => {
      const removeEventListenerSpy = vi.spyOn(testElement, 'removeEventListener');
      
      const handler = vi.fn();
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        handler
      );
      
      unregisterEventListener(eventManager, listenerId);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch custom events correctly', async () => {
      const eventType = 'hyperscript:test';
      const eventData = { test: 'data' };
      
      const eventPromise = waitForEvent(testElement, eventType);
      
      dispatchCustomEvent(testElement, eventType, eventData);
      
      const event = await eventPromise;
      expect(event.type).toBe(eventType);
      expect((event as CustomEvent).detail).toEqual(eventData);
    });

    it('should create hyperscript events with proper structure', () => {
      const context = { me: testElement, it: null, you: null, result: null };
      const hsEvent = createHyperscriptEvent('test-command', {
        element: testElement,
        context: context as any,
        result: 'test-result',
      });

      expect(hsEvent.type).toBe('hyperscript:test-command');
      expect(hsEvent.detail.element).toBe(testElement);
      expect(hsEvent.detail.context).toBe(context);
      expect(hsEvent.detail.result).toBe('test-result');
    });

    it('should dispatch events with proper bubbling', async () => {
      const containerHandler = vi.fn();
      const elementHandler = vi.fn();
      
      containerElement.addEventListener('test-bubble', containerHandler);
      testElement.addEventListener('test-bubble', elementHandler);
      
      dispatchCustomEvent(testElement, 'test-bubble', { bubbles: true });
      
      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(elementHandler).toHaveBeenCalled();
      expect(containerHandler).toHaveBeenCalled();
    });
  });

  describe('Event Delegation', () => {
    it('should set up event delegation correctly', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      setupEventDelegation();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true }
      );
    });

    it('should handle delegated event listeners', () => {
      setupEventDelegation();
      
      const handler = vi.fn();
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        handler,
        { delegated: true }
      );
      
      expect(eventManager.delegatedListeners.has('click')).toBe(true);
      
      // Simulate click
      testElement.click();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should clean up delegation when requested', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      setupEventDelegation();
      cleanupEventDelegation();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = vi.fn();
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      // Set up error handling
      window.addEventListener('error', errorHandler);
      
      const listenerId = registerEventListener(
        eventManager,
        testElement,
        'click',
        faultyHandler
      );
      
      // This should not throw
      expect(() => testElement.click()).not.toThrow();
      
      window.removeEventListener('error', errorHandler);
    });

    it('should dispatch error events for failed handlers', async () => {
      const errorEventPromise = waitForEvent(testElement, 'hyperscript:error');
      
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      registerEventListener(eventManager, testElement, 'click', faultyHandler);
      
      testElement.click();
      
      const errorEvent = await errorEventPromise;
      expect(errorEvent.type).toBe('hyperscript:error');
      expect((errorEvent as HyperscriptEvent).detail.error).toBeInstanceOf(Error);
    });
  });

  describe('Performance', () => {
    it('should handle many event listeners efficiently', () => {
      const startTime = performance.now();
      
      // Register many listeners
      const listenerIds: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const handler = vi.fn();
        const id = registerEventListener(eventManager, testElement, 'click', handler);
        listenerIds.push(id);
      }
      
      const registrationTime = performance.now() - startTime;
      expect(registrationTime).toBeLessThan(100); // Should be fast
      
      // Clean up
      listenerIds.forEach(id => unregisterEventListener(eventManager, id));
    });

    it('should not leak memory with repeated registration/unregistration', () => {
      for (let i = 0; i < 100; i++) {
        const handler = vi.fn();
        const id = registerEventListener(eventManager, testElement, 'click', handler);
        unregisterEventListener(eventManager, id);
      }
      
      expect(eventManager.listeners.size).toBe(0);
    });
  });

  describe('Integration with Context', () => {
    it('should properly integrate events with execution context', async () => {
      const context = {
        me: testElement,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        flags: { halted: false, breaking: false, continuing: false, returning: false, async: false },
      };
      
      const contextHandler = vi.fn((event: HyperscriptEvent) => {
        expect(event.detail.context.me).toBe(testElement);
      });
      
      testElement.addEventListener('hyperscript:command', contextHandler);
      
      const hsEvent = createHyperscriptEvent('command', {
        element: testElement,
        context,
        command: 'test',
      });
      
      testElement.dispatchEvent(hsEvent);
      
      expect(contextHandler).toHaveBeenCalled();
    });
  });
});