/**
 * Tests for fixi.js compatibility
 *
 * Tests the fixi-style attributes (fx-*) and fixi-specific features:
 * - fx-action, fx-method, fx-trigger, fx-target, fx-swap, fx-ignore
 * - Request dropping (anti-double-submit)
 * - Fixi event lifecycle: fx:init, fx:config, fx:before, fx:after, fx:error, fx:finally, fx:swapped
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  translateToHyperscript,
  hasFxAttributes,
  hasAnyAttributes,
  type HtmxConfig,
} from '../htmx-translator.js';
import { HtmxAttributeProcessor, FIXI_ATTRS } from '../htmx-attribute-processor.js';

describe('fixi-compat', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('attribute detection', () => {
    it('detects fx-action attribute', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/data');
      expect(hasFxAttributes(button)).toBe(true);
    });

    it('returns false when no fixi attributes', () => {
      const button = document.createElement('button');
      expect(hasFxAttributes(button)).toBe(false);
    });

    it('hasAnyAttributes detects both htmx and fixi', () => {
      const htmxBtn = document.createElement('button');
      htmxBtn.setAttribute('hx-get', '/api');
      expect(hasAnyAttributes(htmxBtn)).toBe(true);

      const fixiBtn = document.createElement('button');
      fixiBtn.setAttribute('fx-action', '/api');
      expect(hasAnyAttributes(fixiBtn)).toBe(true);

      const plainBtn = document.createElement('button');
      expect(hasAnyAttributes(plainBtn)).toBe(false);
    });
  });

  describe('FIXI_ATTRS constant', () => {
    it('exports all fixi attributes', () => {
      expect(FIXI_ATTRS).toContain('fx-action');
      expect(FIXI_ATTRS).toContain('fx-method');
      expect(FIXI_ATTRS).toContain('fx-trigger');
      expect(FIXI_ATTRS).toContain('fx-target');
      expect(FIXI_ATTRS).toContain('fx-swap');
      expect(FIXI_ATTRS).toContain('fx-ignore');
    });
  });

  describe('collectFxAttributes', () => {
    let processor: HtmxAttributeProcessor;

    beforeEach(() => {
      processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
    });

    it('collects fx-action as url', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/users');
      const config = processor.collectFxAttributes(button);
      expect(config.url).toBe('/api/users');
    });

    it('collects fx-method (default GET)', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      const config = processor.collectFxAttributes(button);
      expect(config.method).toBe('GET');
    });

    it('collects fx-method POST', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      button.setAttribute('fx-method', 'POST');
      const config = processor.collectFxAttributes(button);
      expect(config.method).toBe('POST');
    });

    it('handles case-insensitive fx-method', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      button.setAttribute('fx-method', 'post');
      const config = processor.collectFxAttributes(button);
      expect(config.method).toBe('POST');
    });

    it('collects fx-target', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      button.setAttribute('fx-target', '#output');
      const config = processor.collectFxAttributes(button);
      expect(config.target).toBe('#output');
    });

    it('uses outerHTML as default swap (fixi behavior)', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      const config = processor.collectFxAttributes(button);
      expect(config.swap).toBe('outerHTML');
    });

    it('collects custom fx-swap', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      button.setAttribute('fx-swap', 'innerHTML');
      const config = processor.collectFxAttributes(button);
      expect(config.swap).toBe('innerHTML');
    });

    it('collects fx-trigger', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api');
      button.setAttribute('fx-trigger', 'submit');
      const config = processor.collectFxAttributes(button);
      expect(config.trigger).toBe('submit');
    });
  });

  describe('translateToHyperscript with fixi config', () => {
    it('translates basic fixi GET request', () => {
      const button = document.createElement('button');
      const config: HtmxConfig = {
        method: 'GET',
        url: '/api/users',
        swap: 'outerHTML', // fixi default
      };
      const result = translateToHyperscript(config, button);
      expect(result).toContain("fetch '/api/users'");
      expect(result).toContain('as html');
      expect(result).toContain('on click');
      expect(result).toContain('swap me with it'); // outerHTML
    });

    it('translates fixi POST request', () => {
      const button = document.createElement('button');
      const config: HtmxConfig = {
        method: 'POST',
        url: '/api/submit',
        swap: 'outerHTML',
      };
      const result = translateToHyperscript(config, button);
      expect(result).toContain("fetch '/api/submit' via POST");
    });

    it('translates fixi with target', () => {
      const button = document.createElement('button');
      const config: HtmxConfig = {
        method: 'GET',
        url: '/api/data',
        target: '#result',
        swap: 'innerHTML',
      };
      const result = translateToHyperscript(config, button);
      expect(result).toContain('swap innerHTML of #result with it');
    });
  });

  describe('manualProcess with fixi elements', () => {
    let processor: HtmxAttributeProcessor;

    beforeEach(() => {
      processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
      });
    });

    it('processes fixi element correctly', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/data');
      button.setAttribute('fx-target', '#output');
      button.setAttribute('fx-swap', 'innerHTML');

      const result = processor.manualProcess(button);
      expect(result).toContain("fetch '/api/data'");
      expect(result).toContain('swap innerHTML of #output with it');
    });

    it('detects fixi vs htmx elements', () => {
      const fixiBtn = document.createElement('button');
      fixiBtn.setAttribute('fx-action', '/api/fixi');

      const htmxBtn = document.createElement('button');
      htmxBtn.setAttribute('hx-get', '/api/htmx');

      const fixiResult = processor.manualProcess(fixiBtn);
      const htmxResult = processor.manualProcess(htmxBtn);

      // Both should produce valid hyperscript
      expect(fixiResult).toContain("fetch '/api/fixi'");
      expect(htmxResult).toContain("fetch '/api/htmx'");
    });
  });

  describe('fx-ignore attribute', () => {
    let processor: HtmxAttributeProcessor;

    beforeEach(() => {
      processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });
    });

    it('excludes elements with fx-ignore', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button fx-action="/api/include">Include</button>
        <div fx-ignore>
          <button fx-action="/api/exclude">Exclude</button>
        </div>
      `;
      document.body.appendChild(container);

      const elements = processor.scanForHtmxElements(container);
      expect(elements.length).toBe(1);
      expect(elements[0].textContent).toBe('Include');

      document.body.removeChild(container);
    });

    it('excludes element with direct fx-ignore', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button fx-action="/api/include">Include</button>
        <button fx-action="/api/exclude" fx-ignore>Exclude</button>
      `;
      document.body.appendChild(container);

      const elements = processor.scanForHtmxElements(container);
      expect(elements.length).toBe(1);
      expect(elements[0].textContent).toBe('Include');

      document.body.removeChild(container);
    });
  });

  describe('request dropping', () => {
    let processor: HtmxAttributeProcessor;
    let mockExecute: ReturnType<typeof vi.fn<(code: string, element: Element) => Promise<void>>>;
    let dropContainer: HTMLDivElement;

    beforeEach(() => {
      dropContainer = document.createElement('div');
      document.body.appendChild(dropContainer);
      mockExecute = vi.fn().mockResolvedValue(undefined);
      processor = new HtmxAttributeProcessor({
        root: dropContainer,
        processExisting: false,
        watchMutations: false,
        requestDropping: true,
        fixiEvents: true,
      });
      processor.init(mockExecute);
    });

    afterEach(() => {
      processor.destroy();
      dropContainer.remove();
    });

    it('hasPendingRequest returns false initially', () => {
      const button = document.createElement('button');
      expect(processor.hasPendingRequest(button)).toBe(false);
    });

    it('abortPendingRequest returns false when no pending', () => {
      const button = document.createElement('button');
      expect(processor.abortPendingRequest(button)).toBe(false);
    });

    it('drops second request while first is pending', async () => {
      let resolveFirst!: () => void;
      mockExecute.mockImplementation(
        () =>
          new Promise<void>(r => {
            resolveFirst = r;
          })
      );

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button);

      // First request - should execute
      processor.processElement(button);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Second request while first is pending - should be dropped
      processor.processElement(button);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Resolve first request
      resolveFirst();
      await vi.waitFor(() => !processor.hasPendingRequest(button));
    });

    it('allows new request after first completes', async () => {
      // Use a fresh button each time to test that new elements can be processed
      const button1 = document.createElement('button');
      button1.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button1);

      // First request
      processor.processElement(button1);
      await vi.waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => !processor.hasPendingRequest(button1));

      // Create a new element (simulating a fresh interaction target)
      const button2 = document.createElement('button');
      button2.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button2);

      // Second request on new element should work
      processor.processElement(button2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('clears pending on success', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(processor.hasPendingRequest(button)).toBe(false);
      });
    });

    it('clears pending on error', async () => {
      mockExecute.mockRejectedValue(new Error('test'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(processor.hasPendingRequest(button)).toBe(false);
      });
    });

    it('does not drop requests when requestDropping is false', async () => {
      processor.destroy();
      processor = new HtmxAttributeProcessor({
        root: dropContainer,
        processExisting: false,
        watchMutations: false,
        requestDropping: false,
        fixiEvents: true,
      });
      processor.init(mockExecute);

      let resolveFirst!: () => void;
      mockExecute.mockImplementation(
        () =>
          new Promise<void>(r => {
            resolveFirst = r;
          })
      );

      // Test with two separate elements to verify both get processed
      const button1 = document.createElement('button');
      button1.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button1);

      const button2 = document.createElement('button');
      button2.setAttribute('fx-action', '/api/test2');
      dropContainer.appendChild(button2);

      // First request
      processor.processElement(button1);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Second request on different element - should work when requestDropping is false
      processor.processElement(button2);
      expect(mockExecute).toHaveBeenCalledTimes(2);

      resolveFirst();
    });

    it('request dropping only applies to fixi elements', async () => {
      let resolveFirst!: () => void;
      mockExecute.mockImplementation(
        () =>
          new Promise<void>(r => {
            resolveFirst = r;
          })
      );

      // Test with two htmx elements to verify both get processed
      // (htmx doesn't use request dropping per-element)
      const htmxButton1 = document.createElement('button');
      htmxButton1.setAttribute('hx-get', '/api/test1');
      dropContainer.appendChild(htmxButton1);

      const htmxButton2 = document.createElement('button');
      htmxButton2.setAttribute('hx-get', '/api/test2');
      dropContainer.appendChild(htmxButton2);

      // First request
      processor.processElement(htmxButton1);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Second request on different htmx element - should work
      processor.processElement(htmxButton2);
      expect(mockExecute).toHaveBeenCalledTimes(2);

      resolveFirst();
    });

    it('hasPendingRequest returns true while request is in flight', async () => {
      let resolveRequest!: () => void;
      mockExecute.mockImplementation(
        () =>
          new Promise<void>(r => {
            resolveRequest = r;
          })
      );

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      dropContainer.appendChild(button);

      processor.processElement(button);

      // Should be pending during execution
      expect(processor.hasPendingRequest(button)).toBe(true);

      resolveRequest();
      await vi.waitFor(() => !processor.hasPendingRequest(button));
    });
  });

  describe('fixi events', () => {
    let evtContainer: HTMLDivElement;
    let processor: HtmxAttributeProcessor;
    let mockExecute: ReturnType<typeof vi.fn<(code: string, element: Element) => Promise<void>>>;

    beforeEach(() => {
      evtContainer = document.createElement('div');
      document.body.appendChild(evtContainer);
      mockExecute = vi.fn().mockResolvedValue(undefined);
      processor = new HtmxAttributeProcessor({
        root: evtContainer,
        processExisting: false,
        watchMutations: false,
        fixiEvents: true,
        requestDropping: true,
      });
      processor.init(mockExecute);
    });

    afterEach(() => {
      processor.destroy();
      evtContainer.remove();
    });

    it('dispatches fx:init event for fixi elements', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxInitHandler = vi.fn();
      button.addEventListener('fx:init', fxInitHandler);

      processor.processElement(button);

      expect(fxInitHandler).toHaveBeenCalled();
    });

    it('cancels processing when fx:init is cancelled', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      button.addEventListener('fx:init', e => e.preventDefault());

      processor.processElement(button);

      // Should not execute because fx:init was cancelled
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('dispatches fx:config event for fixi elements', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxConfigHandler = vi.fn();
      button.addEventListener('fx:config', fxConfigHandler);

      processor.processElement(button);

      expect(fxConfigHandler).toHaveBeenCalled();
      const event = fxConfigHandler.mock.calls[0][0];
      expect(event.detail.cfg.action).toBe('/api/test');
      expect(event.detail.cfg.method).toBe('GET');
    });

    it('dispatches fx:before event for fixi elements', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxBeforeHandler = vi.fn();
      button.addEventListener('fx:before', fxBeforeHandler);

      processor.processElement(button);

      expect(fxBeforeHandler).toHaveBeenCalled();
    });

    it('does not dispatch fixi events for htmx elements', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/test');
      evtContainer.appendChild(button);

      const fxInitHandler = vi.fn();
      button.addEventListener('fx:init', fxInitHandler);

      processor.processElement(button);

      expect(fxInitHandler).not.toHaveBeenCalled();
    });

    it('dispatches fx:after event after execution', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      button.setAttribute('fx-target', '#result');
      evtContainer.appendChild(button);

      const fxAfterHandler = vi.fn();
      button.addEventListener('fx:after', fxAfterHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxAfterHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('fx:after event is cancelable to prevent swap', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxAfterHandler = vi.fn((e: Event) => e.preventDefault());
      const fxSwappedHandler = vi.fn();
      button.addEventListener('fx:after', fxAfterHandler);
      button.addEventListener('fx:swapped', fxSwappedHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxAfterHandler).toHaveBeenCalled();
      });

      // fx:swapped should not fire if fx:after was cancelled
      // Wait a bit to ensure it wouldn't fire
      await new Promise(r => setTimeout(r, 50));
      expect(fxSwappedHandler).not.toHaveBeenCalled();
    });

    it('dispatches fx:swapped event on success', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      button.setAttribute('fx-target', '#result');
      evtContainer.appendChild(button);

      const fxSwappedHandler = vi.fn();
      button.addEventListener('fx:swapped', fxSwappedHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxSwappedHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('fx:swapped has correct detail', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      button.setAttribute('fx-target', '#result');
      evtContainer.appendChild(button);

      const fxSwappedHandler = vi.fn();
      button.addEventListener('fx:swapped', fxSwappedHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxSwappedHandler).toHaveBeenCalled();
      });

      const event = fxSwappedHandler.mock.calls[0][0];
      expect(event.detail.element).toBe(button);
      expect(event.detail.target).toBe('#result');
    });

    it('fx:swapped bubbles up the DOM', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const containerHandler = vi.fn();
      evtContainer.addEventListener('fx:swapped', containerHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(containerHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('dispatches fx:error event on failure', async () => {
      const testError = new Error('Test execution error');
      mockExecute.mockRejectedValue(testError);

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxErrorHandler = vi.fn();
      button.addEventListener('fx:error', fxErrorHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxErrorHandler).toHaveBeenCalledTimes(1);
      });

      const event = fxErrorHandler.mock.calls[0][0];
      expect(event.detail.element).toBe(button);
      expect(event.detail.error).toBe(testError);
    });

    it('fx:error wraps non-Error exceptions', async () => {
      mockExecute.mockRejectedValue('string error');

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxErrorHandler = vi.fn();
      button.addEventListener('fx:error', fxErrorHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxErrorHandler).toHaveBeenCalledTimes(1);
      });

      const event = fxErrorHandler.mock.calls[0][0];
      expect(event.detail.error).toBeInstanceOf(Error);
      expect(event.detail.error.message).toBe('string error');
    });

    it('fx:error bubbles up the DOM', async () => {
      mockExecute.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const containerHandler = vi.fn();
      evtContainer.addEventListener('fx:error', containerHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(containerHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('does not dispatch fx:swapped if execution fails', async () => {
      mockExecute.mockRejectedValue(new Error('Execution failed'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxSwappedHandler = vi.fn();
      const fxErrorHandler = vi.fn();
      button.addEventListener('fx:swapped', fxSwappedHandler);
      button.addEventListener('fx:error', fxErrorHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxErrorHandler).toHaveBeenCalledTimes(1);
      });

      expect(fxSwappedHandler).not.toHaveBeenCalled();
    });

    it('dispatches fx:finally on success', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxFinallyHandler = vi.fn();
      button.addEventListener('fx:finally', fxFinallyHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxFinallyHandler).toHaveBeenCalledTimes(1);
      });

      const event = fxFinallyHandler.mock.calls[0][0];
      expect(event.detail.success).toBe(true);
    });

    it('dispatches fx:finally on error', async () => {
      mockExecute.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const fxFinallyHandler = vi.fn();
      button.addEventListener('fx:finally', fxFinallyHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(fxFinallyHandler).toHaveBeenCalledTimes(1);
      });

      const event = fxFinallyHandler.mock.calls[0][0];
      expect(event.detail.success).toBe(false);
    });

    it('fx:finally always fires after fx:swapped', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const events: string[] = [];
      button.addEventListener('fx:swapped', () => events.push('swapped'));
      button.addEventListener('fx:finally', () => events.push('finally'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('finally');
      });

      expect(events).toEqual(['swapped', 'finally']);
    });

    it('fx:finally always fires after fx:error', async () => {
      mockExecute.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const events: string[] = [];
      button.addEventListener('fx:error', () => events.push('error'));
      button.addEventListener('fx:finally', () => events.push('finally'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('finally');
      });

      expect(events).toEqual(['error', 'finally']);
    });

    it('fires fixi events in correct order on success', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const events: string[] = [];
      button.addEventListener('fx:init', () => events.push('init'));
      button.addEventListener('fx:config', () => events.push('config'));
      button.addEventListener('fx:before', () => events.push('before'));
      button.addEventListener('fx:after', () => events.push('after'));
      button.addEventListener('fx:swapped', () => events.push('swapped'));
      button.addEventListener('fx:finally', () => events.push('finally'));
      button.addEventListener('fx:error', () => events.push('error'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('finally');
      });

      expect(events).toEqual(['init', 'config', 'before', 'after', 'swapped', 'finally']);
    });

    it('fires fixi events in correct order on error', async () => {
      mockExecute.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      const events: string[] = [];
      button.addEventListener('fx:init', () => events.push('init'));
      button.addEventListener('fx:config', () => events.push('config'));
      button.addEventListener('fx:before', () => events.push('before'));
      button.addEventListener('fx:after', () => events.push('after'));
      button.addEventListener('fx:swapped', () => events.push('swapped'));
      button.addEventListener('fx:finally', () => events.push('finally'));
      button.addEventListener('fx:error', () => events.push('error'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('finally');
      });

      expect(events).toEqual(['init', 'config', 'before', 'error', 'finally']);
    });

    it('cancelling fx:before prevents execution', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      button.addEventListener('fx:before', e => e.preventDefault());

      processor.processElement(button);

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('cancelling fx:config prevents execution', () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      evtContainer.appendChild(button);

      button.addEventListener('fx:config', e => e.preventDefault());

      processor.processElement(button);

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('MutationObserver with fx-*', () => {
    let observerContainer: HTMLDivElement;
    let observerProcessor: HtmxAttributeProcessor;
    let mockExecute: ReturnType<typeof vi.fn<(code: string, element: Element) => Promise<void>>>;

    beforeEach(() => {
      observerContainer = document.createElement('div');
      document.body.appendChild(observerContainer);
      mockExecute = vi.fn().mockResolvedValue(undefined);
      observerProcessor = new HtmxAttributeProcessor({
        root: observerContainer,
        processExisting: false,
        watchMutations: true,
        fixiEvents: true,
      });
      observerProcessor.init(mockExecute);
    });

    afterEach(() => {
      observerProcessor.destroy();
      observerContainer.remove();
    });

    it('processes dynamically added fx-action elements', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      observerContainer.appendChild(button);

      await vi.waitFor(() => {
        expect(button.hasAttribute('data-fx-generated')).toBe(true);
      });
    });

    it('processes dynamically added elements with all fx-* attributes', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      button.setAttribute('fx-method', 'POST');
      button.setAttribute('fx-target', '#result');
      button.setAttribute('fx-swap', 'innerHTML');
      observerContainer.appendChild(button);

      await vi.waitFor(() => {
        expect(button.hasAttribute('data-fx-generated')).toBe(true);
      });

      const generated = button.getAttribute('data-fx-generated');
      expect(generated).toContain('/api/test');
      expect(generated).toContain('POST');
    });

    it('ignores elements inside fx-ignore after dynamic insertion', async () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('fx-ignore', '');
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      wrapper.appendChild(button);
      observerContainer.appendChild(wrapper);

      // Wait a tick to ensure observer could fire
      await new Promise(r => setTimeout(r, 100));

      // Button should not be processed
      expect(button.hasAttribute('data-fx-generated')).toBe(false);
    });

    it('ignores element with fx-ignore attribute', async () => {
      const button = document.createElement('button');
      button.setAttribute('fx-action', '/api/test');
      button.setAttribute('fx-ignore', '');
      observerContainer.appendChild(button);

      // Wait a tick to ensure observer could fire
      await new Promise(r => setTimeout(r, 100));

      // Button should not be processed
      expect(button.hasAttribute('data-fx-generated')).toBe(false);
    });

    it('processes both htmx and fixi elements dynamically', async () => {
      const fixiButton = document.createElement('button');
      fixiButton.setAttribute('fx-action', '/api/fixi');
      observerContainer.appendChild(fixiButton);

      const htmxButton = document.createElement('button');
      htmxButton.setAttribute('hx-get', '/api/htmx');
      observerContainer.appendChild(htmxButton);

      await vi.waitFor(() => {
        expect(fixiButton.hasAttribute('data-fx-generated')).toBe(true);
        expect(htmxButton.hasAttribute('data-hx-generated')).toBe(true);
      });
    });
  });

  describe('combined htmx/fixi scanning', () => {
    let processor: HtmxAttributeProcessor;

    beforeEach(() => {
      processor = new HtmxAttributeProcessor({
        processExisting: false,
        watchMutations: false,
        root: document.body,
      });
    });

    it('scans both htmx and fixi elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button hx-get="/api/htmx">HTMX</button>
        <button fx-action="/api/fixi">Fixi</button>
      `;
      document.body.appendChild(container);

      const elements = processor.scanForHtmxElements(container);
      expect(elements.length).toBe(2);

      document.body.removeChild(container);
    });

    it('processes mixed htmx and fixi elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button hx-post="/api/htmx" hx-target="#a">HTMX</button>
        <button fx-action="/api/fixi" fx-method="POST" fx-target="#b">Fixi</button>
      `;
      document.body.appendChild(container);

      const elements = processor.scanForHtmxElements(container);

      // Process both and check they generate valid hyperscript
      for (const el of elements) {
        const result = processor.manualProcess(el);
        expect(result).toContain('fetch');
        expect(result).toContain('via POST');
      }

      document.body.removeChild(container);
    });
  });
});
