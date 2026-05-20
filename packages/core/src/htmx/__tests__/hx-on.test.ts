/**
 * hx-on:* handler-registration tests
 *
 * Phase 8-pre of htmx-v4-reactive-streaming.md. The original htmx-compat
 * translation path wrapped hx-on:* bodies as `on EVENT body` text and
 * shipped them through executeCallback, which parsed them fine but never
 * reached the runtime path that calls addEventListener — so listeners
 * silently no-op'd. The processor now installs real DOM listeners
 * directly via installOnHandlers; these tests assert the contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HtmxAttributeProcessor } from '../htmx-attribute-processor.js';

describe('hx-on:* handler registration', () => {
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

  it('registers a real click listener for hx-on:click', () => {
    const button = document.createElement('button');
    button.setAttribute('hx-on:click', "put 'clicked' into me");
    container.appendChild(button);

    processor.processElement(button);
    button.click();

    expect(executeCallback).toHaveBeenCalledTimes(1);
    expect(executeCallback).toHaveBeenCalledWith("put 'clicked' into me", button);
  });

  it('registers multiple listeners on one element', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-on:mouseenter', 'add .hover to me');
    el.setAttribute('hx-on:mouseleave', 'remove .hover from me');
    container.appendChild(el);

    processor.processElement(el);

    el.dispatchEvent(new Event('mouseenter'));
    el.dispatchEvent(new Event('mouseleave'));

    expect(executeCallback).toHaveBeenCalledTimes(2);
    expect(executeCallback).toHaveBeenNthCalledWith(1, 'add .hover to me', el);
    expect(executeCallback).toHaveBeenNthCalledWith(2, 'remove .hover from me', el);
  });

  it('wires hx-on:* even when no other htmx attributes are present', () => {
    // Without a paired hx-get/etc., the early-skip used to bail out
    // before installOnHandlers ran. Verify the install happens first.
    const button = document.createElement('button');
    button.setAttribute('hx-on:click', 'log "click"');
    container.appendChild(button);

    processor.processElement(button);
    button.click();

    expect(executeCallback).toHaveBeenCalledOnce();
  });

  it('discovers hx-on-only elements on subtree scan', () => {
    // CSS attribute selectors can't match by attribute-name prefix; the
    // scanner walks the subtree to find elements bearing hx-on:* without
    // any other htmx attribute.
    const button = document.createElement('button');
    button.setAttribute('hx-on:click', 'log "scanned"');
    container.appendChild(button);

    const found = processor.scanForHtmxElements(container);
    expect(found).toContain(button);
  });

  it('cleans up listeners when the element is removed via mutation', async () => {
    const button = document.createElement('button');
    button.setAttribute('hx-on:click', 'log "click"');
    container.appendChild(button);

    // Watch mutations for this test only — fresh processor.
    processor.destroy();
    processor = new HtmxAttributeProcessor({
      root: container,
      processExisting: true,
      watchMutations: true,
    });
    processor.init(executeCallback);

    // Initial click works.
    button.click();
    expect(executeCallback).toHaveBeenCalledTimes(1);

    // Remove the element — observer detaches its listeners.
    container.removeChild(button);
    // Allow the MutationObserver microtask to flush.
    await new Promise(r => setTimeout(r, 0));

    // After detach, dispatching click should not invoke the callback.
    button.click();
    expect(executeCallback).toHaveBeenCalledTimes(1);
  });

  it('re-installing replaces the previous listener (idempotent)', () => {
    const button = document.createElement('button');
    button.setAttribute('hx-on:click', "log 'v1'");
    container.appendChild(button);

    processor.processElement(button);
    button.click();
    expect(executeCallback).toHaveBeenLastCalledWith("log 'v1'", button);

    // Simulate an attribute change + re-processing.
    button.setAttribute('hx-on:click', "log 'v2'");
    processor.processElement(button);
    button.click();

    // Two calls total — v1 from the first click, v2 from the second.
    // If the old listener weren't removed, we'd see three (v1+v2 on the
    // second click).
    expect(executeCallback).toHaveBeenCalledTimes(2);
    expect(executeCallback).toHaveBeenLastCalledWith("log 'v2'", button);
  });

  it('logs but does not throw when the executeCallback rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    executeCallback.mockRejectedValueOnce(new Error('boom'));

    const button = document.createElement('button');
    button.setAttribute('hx-on:click', 'broken');
    container.appendChild(button);

    processor.processElement(button);
    button.click();

    // Let the rejected promise settle.
    await new Promise(r => setTimeout(r, 0));

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('hx-on:click execution failed'),
      expect.any(Error)
    );
    consoleError.mockRestore();
  });
});
