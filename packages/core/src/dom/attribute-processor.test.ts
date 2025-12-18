/**
 * Attribute Processor Tests
 * Tests for hyperscript system events: hyperscript:ready and load
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../test-setup.js';
import { AttributeProcessor } from './attribute-processor';

describe('AttributeProcessor System Events', () => {
  let processor: AttributeProcessor;
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    // Create test container
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);

    // Create processor without auto-initialization
    processor = new AttributeProcessor({
      autoScan: false, // We'll manually control scanning for tests
    });
  });

  afterEach(() => {
    // Clean up
    processor.destroy();
    if (testContainer.parentNode) {
      document.body.removeChild(testContainer);
    }
  });

  describe('hyperscript:ready Event', () => {
    it('should dispatch hyperscript:ready event on document after processing', async () => {
      // Create elements with hyperscript attributes
      testContainer.innerHTML = `
        <div id="elem1" _="on click add .clicked"></div>
        <div id="elem2" _="on load add .loaded"></div>
        <div id="elem3" _="on mouseover toggle .hover"></div>
      `;

      let eventFired = false;
      let processedCount = 0;

      const readyPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          (event: Event) => {
            eventFired = true;
            const customEvent = event as CustomEvent;
            processedCount = customEvent.detail.processedElements;

            // Verify event properties
            expect(customEvent.bubbles).toBe(true);
            expect(customEvent.detail.processedElements).toBeGreaterThan(0);
            expect(customEvent.detail.timestamp).toBeTypeOf('number');

            resolve();
          },
          { once: true }
        );
      });

      // Process all elements (this should trigger the ready event)
      // Must await the async operation
      await processor.scanAndProcessAll();

      // Manually dispatch since we're not using init()
      processor['dispatchReadyEvent']();

      await readyPromise;

      // The event should have been fired
      expect(eventFired).toBe(true);
    });

    it('should include correct processed element count in event detail', async () => {
      // Create specific number of elements
      testContainer.innerHTML = `
        <div _="on click log 'one'"></div>
        <div _="on click log 'two'"></div>
        <div _="on click log 'three'"></div>
      `;

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          (event: Event) => {
            const customEvent = event as CustomEvent;
            expect(customEvent.detail.processedElements).toBe(3);
            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;
    });

    it('should only dispatch hyperscript:ready event once', async () => {
      testContainer.innerHTML = `<div _="on click log 'test'"></div>`;

      let eventCount = 0;
      document.addEventListener('hyperscript:ready', () => {
        eventCount++;
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();
      processor['dispatchReadyEvent'](); // Try to dispatch again
      processor['dispatchReadyEvent'](); // And again

      // Give a small delay for any potential duplicate events
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(eventCount).toBe(1);
    });

    it('should dispatch even when no elements are processed', async () => {
      // Empty container - no hyperscript elements
      testContainer.innerHTML = `
        <div id="no-hyperscript"></div>
        <p>Regular content</p>
      `;

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          (event: Event) => {
            const customEvent = event as CustomEvent;
            expect(customEvent.detail.processedElements).toBe(0);
            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;
    });

    it('should include timestamp in event detail', async () => {
      testContainer.innerHTML = `<div _="on click log 'test'"></div>`;

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          (event: Event) => {
            const customEvent = event as CustomEvent;
            const timestamp = customEvent.detail.timestamp;

            expect(timestamp).toBeTypeOf('number');
            expect(timestamp).toBeGreaterThan(0);
            expect(timestamp).toBeLessThanOrEqual(Date.now());

            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;
    });
  });

  describe('load Event (on element)', () => {
    it('should dispatch load event on each processed element', async () => {
      const elem1 = document.createElement('div');
      elem1.id = 'elem1';
      elem1.setAttribute('_', 'on click add .clicked');
      testContainer.appendChild(elem1);

      const elem2 = document.createElement('div');
      elem2.id = 'elem2';
      elem2.setAttribute('_', 'on load add .loaded');
      testContainer.appendChild(elem2);

      let loadCount = 0;
      const loadedElements: string[] = [];

      elem1.addEventListener('load', () => {
        loadCount++;
        loadedElements.push('elem1');
      });

      elem2.addEventListener('load', () => {
        loadCount++;
        loadedElements.push('elem2');
      });

      // Use async version and await it
      await processor.scanAndProcessAll();

      expect(loadCount).toBe(2);
      expect(loadedElements).toContain('elem1');
      expect(loadedElements).toContain('elem2');
    });

    it('should dispatch load event after element processing is complete', async () => {
      const elem = document.createElement('div');
      elem.setAttribute('_', 'on click add .clicked');
      testContainer.appendChild(elem);

      let loadFired = false;

      elem.addEventListener('load', () => {
        loadFired = true;
      });

      // Use async version and await it
      await processor.processElementAsync(elem);

      // Load event should have fired after processing
      expect(loadFired).toBe(true);
    });

    it('should not bubble load events', async () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      child.setAttribute('_', 'on click log "child"');
      parent.appendChild(child);
      testContainer.appendChild(parent);

      let parentGotEvent = false;
      parent.addEventListener('load', () => {
        parentGotEvent = true;
      });

      let childGotEvent = false;
      child.addEventListener('load', () => {
        childGotEvent = true;
      });

      await processor.processElementAsync(child);

      expect(childGotEvent).toBe(true);
      expect(parentGotEvent).toBe(false);
    });

    it('should dispatch load event only on successful processing', async () => {
      const goodElem = document.createElement('div');
      goodElem.id = 'good';
      goodElem.setAttribute('_', 'on click add .clicked');
      testContainer.appendChild(goodElem);

      const badElem = document.createElement('div');
      badElem.id = 'bad';
      badElem.setAttribute('_', 'on click invalid syntax!!!');
      testContainer.appendChild(badElem);

      let goodLoadFired = false;
      let badLoadFired = false;

      goodElem.addEventListener('load', () => {
        goodLoadFired = true;
      });

      badElem.addEventListener('load', () => {
        badLoadFired = true;
      });

      await processor.scanAndProcessAll();

      expect(goodLoadFired).toBe(true);
      expect(badLoadFired).toBe(false);
    });

    it('should dispatch load event for event handler syntax', async () => {
      const elem = document.createElement('button');
      elem.setAttribute('_', 'on click log "clicked"');
      testContainer.appendChild(elem);

      let loadFired = false;
      elem.addEventListener('load', () => {
        loadFired = true;
      });

      await processor.processElementAsync(elem);

      expect(loadFired).toBe(true);
    });

    it('should dispatch load event for command execution syntax', async () => {
      const elem = document.createElement('div');
      // Use a simple command syntax that will compile successfully
      elem.setAttribute('_', 'log "test"');
      testContainer.appendChild(elem);

      let loadFired = false;
      elem.addEventListener('load', () => {
        loadFired = true;
      });

      await processor.processElementAsync(elem);

      expect(loadFired).toBe(true);
    });

    it('should dispatch load event with correct event properties', async () => {
      const elem = document.createElement('div');
      elem.setAttribute('_', 'on click add .clicked');
      testContainer.appendChild(elem);

      let capturedEvent: Event | null = null;
      elem.addEventListener('load', (event: Event) => {
        capturedEvent = event;
      });

      await processor.processElementAsync(elem);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent!.type).toBe('load');
      expect(capturedEvent!.bubbles).toBe(false);
      expect(capturedEvent!.cancelable).toBe(false);
      expect(capturedEvent!.target).toBe(elem);
    });

    it('should handle multiple elements with load events', async () => {
      const elements: HTMLElement[] = [];
      const loadedElements: number[] = [];

      // Create 5 elements
      for (let i = 0; i < 5; i++) {
        const elem = document.createElement('div');
        elem.setAttribute('_', `on click log '${i}'`);
        elem.addEventListener('load', () => {
          loadedElements.push(i);
        });
        elements.push(elem);
        testContainer.appendChild(elem);
      }

      await processor.scanAndProcessAll();

      expect(loadedElements).toHaveLength(5);
      expect(loadedElements).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Integration: hyperscript:ready and load events together', () => {
    it('should dispatch load events before hyperscript:ready', async () => {
      testContainer.innerHTML = `
        <div id="elem1" _="on click log 'one'"></div>
        <div id="elem2" _="on click log 'two'"></div>
      `;

      const loadOrder: string[] = [];

      document.getElementById('elem1')!.addEventListener('load', () => {
        loadOrder.push('load-elem1');
      });

      document.getElementById('elem2')!.addEventListener('load', () => {
        loadOrder.push('load-elem2');
      });

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          () => {
            loadOrder.push('hyperscript:ready');
            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;

      // Verify load events happened first
      expect(loadOrder).toEqual(['load-elem1', 'load-elem2', 'hyperscript:ready']);
    });

    it('should have correct processed count after all load events', async () => {
      testContainer.innerHTML = `
        <div _="on click log '1'"></div>
        <div _="on click log '2'"></div>
        <div _="on click log '3'"></div>
      `;

      let loadEventCount = 0;

      testContainer.querySelectorAll('[_]').forEach(elem => {
        elem.addEventListener('load', () => {
          loadEventCount++;
        });
      });

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          (event: Event) => {
            const customEvent = event as CustomEvent;

            // All load events should have fired
            expect(loadEventCount).toBe(3);
            // Ready event should report same count
            expect(customEvent.detail.processedElements).toBe(3);

            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;
    });

    it('should allow hooking into page initialization flow', async () => {
      testContainer.innerHTML = `
        <div id="myElement" _="on click add .clicked"></div>
      `;

      let elementLoaded = false;
      let pageReady = false;

      document.getElementById('myElement')!.addEventListener('load', () => {
        elementLoaded = true;
        expect(pageReady).toBe(false); // Ready should not have fired yet
      });

      const eventPromise = new Promise<void>(resolve => {
        document.addEventListener(
          'hyperscript:ready',
          () => {
            pageReady = true;
            expect(elementLoaded).toBe(true); // Element should be loaded
            resolve();
          },
          { once: true }
        );
      });

      await processor.scanAndProcessAll();
      processor['dispatchReadyEvent']();

      await eventPromise;
    });
  });
});
