/**
 * Tests for htmx lifecycle events
 *
 * Verifies that the HtmxAttributeProcessor dispatches lifecycle events
 * at the correct points and that they can be used to intercept/cancel processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HtmxAttributeProcessor,
  type HtmxConfiguringEventDetail,
  type HtmxBeforeRequestEventDetail,
  type HtmxAfterSettleEventDetail,
  type HtmxErrorEventDetail,
} from '../htmx-attribute-processor.js';

describe('htmx lifecycle events', () => {
  let container: HTMLDivElement;
  let processor: HtmxAttributeProcessor;
  let executeCallback: ReturnType<typeof vi.fn<(code: string, element: Element) => Promise<void>>>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    executeCallback = vi.fn().mockResolvedValue(undefined);
    processor = new HtmxAttributeProcessor({
      root: container,
      processExisting: false,
      watchMutations: false,
    });
    processor.init(executeCallback);
  });

  afterEach(() => {
    processor.destroy();
    container.remove();
  });

  describe('htmx:configuring event', () => {
    it('fires with correct detail', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      button.setAttribute('hx-target', '#result');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxConfiguringEventDetail>).detail;
        expect(detail.element).toBe(button);
        expect(detail.config.url).toBe('/api/data');
        expect(detail.config.method).toBe('GET');
        expect(detail.config.target).toBe('#result');
      });

      button.addEventListener('htmx:configuring', handler);
      processor.processElement(button);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled to prevent processing', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      button.addEventListener('htmx:configuring', e => {
        e.preventDefault();
      });

      processor.processElement(button);

      // executeCallback should not be called if event was cancelled
      expect(executeCallback).not.toHaveBeenCalled();
    });

    it('allows config modification', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      button.addEventListener('htmx:configuring', (e: Event) => {
        // Modify the config before translation
        (e as CustomEvent<HtmxConfiguringEventDetail>).detail.config.target = '#modified-target';
      });

      processor.processElement(button);

      // The generated hyperscript should use the modified target
      const generated = button.getAttribute('data-hx-generated');
      expect(generated).toContain('#modified-target');
    });

    it('bubbles up the DOM', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const containerHandler = vi.fn();
      container.addEventListener('htmx:configuring', containerHandler);

      processor.processElement(button);

      expect(containerHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('htmx:beforeRequest event', () => {
    it('fires with correct detail', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-post', '/api/submit');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxBeforeRequestEventDetail>).detail;
        expect(detail.element).toBe(button);
        expect(detail.url).toBe('/api/submit');
        expect(detail.method).toBe('POST');
      });

      button.addEventListener('htmx:beforeRequest', handler);
      processor.processElement(button);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled to prevent execution', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      button.addEventListener('htmx:beforeRequest', e => {
        e.preventDefault();
      });

      processor.processElement(button);

      // executeCallback should not be called if beforeRequest was cancelled
      expect(executeCallback).not.toHaveBeenCalled();
    });

    it('fires after htmx:configuring', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const events: string[] = [];
      button.addEventListener('htmx:configuring', () => events.push('configuring'));
      button.addEventListener('htmx:beforeRequest', () => events.push('beforeRequest'));

      processor.processElement(button);

      expect(events).toEqual(['configuring', 'beforeRequest']);
    });

    it('defaults method to GET when not specified', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxBeforeRequestEventDetail>).detail;
        expect(detail.method).toBe('GET');
      });

      button.addEventListener('htmx:beforeRequest', handler);
      processor.processElement(button);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('htmx:afterSettle event', () => {
    it('fires after successful execution', async () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      button.setAttribute('hx-target', '#result');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxAfterSettleEventDetail>).detail;
        expect(detail.element).toBe(button);
        expect(detail.target).toBe('#result');
      });

      button.addEventListener('htmx:afterSettle', handler);
      processor.processElement(button);

      // Wait for the async execution to complete
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('bubbles up the DOM', async () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const containerHandler = vi.fn();
      container.addEventListener('htmx:afterSettle', containerHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(containerHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('does not fire if execution fails', async () => {
      executeCallback.mockRejectedValue(new Error('Execution failed'));

      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const afterSettleHandler = vi.fn();
      const errorHandler = vi.fn();
      button.addEventListener('htmx:afterSettle', afterSettleHandler);
      button.addEventListener('htmx:error', errorHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalledTimes(1);
      });

      expect(afterSettleHandler).not.toHaveBeenCalled();
    });
  });

  describe('htmx:error event', () => {
    it('fires on execution failure', async () => {
      const testError = new Error('Test execution error');
      executeCallback.mockRejectedValue(testError);

      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxErrorEventDetail>).detail;
        expect(detail.element).toBe(button);
        expect(detail.error).toBe(testError);
      });

      button.addEventListener('htmx:error', handler);
      processor.processElement(button);

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('wraps non-Error exceptions', async () => {
      executeCallback.mockRejectedValue('string error');

      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const handler = vi.fn((e: Event) => {
        const detail = (e as CustomEvent<HtmxErrorEventDetail>).detail;
        expect(detail.error).toBeInstanceOf(Error);
        expect(detail.error.message).toBe('string error');
      });

      button.addEventListener('htmx:error', handler);
      processor.processElement(button);

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('bubbles up the DOM', async () => {
      executeCallback.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const containerHandler = vi.fn();
      container.addEventListener('htmx:error', containerHandler);

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(containerHandler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('event order', () => {
    it('fires events in correct order for successful execution', async () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const events: string[] = [];
      button.addEventListener('htmx:configuring', () => events.push('configuring'));
      button.addEventListener('htmx:beforeRequest', () => events.push('beforeRequest'));
      button.addEventListener('htmx:afterSettle', () => events.push('afterSettle'));
      button.addEventListener('htmx:error', () => events.push('error'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('afterSettle');
      });

      expect(events).toEqual(['configuring', 'beforeRequest', 'afterSettle']);
    });

    it('fires events in correct order for failed execution', async () => {
      executeCallback.mockRejectedValue(new Error('Test error'));

      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api/data');
      container.appendChild(button);

      const events: string[] = [];
      button.addEventListener('htmx:configuring', () => events.push('configuring'));
      button.addEventListener('htmx:beforeRequest', () => events.push('beforeRequest'));
      button.addEventListener('htmx:afterSettle', () => events.push('afterSettle'));
      button.addEventListener('htmx:error', () => events.push('error'));

      processor.processElement(button);

      await vi.waitFor(() => {
        expect(events).toContain('error');
      });

      expect(events).toEqual(['configuring', 'beforeRequest', 'error']);
    });
  });
});
