import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, resetRegistry } from '../src/registry.js';
import {
  EXTENSION_NAME,
  createExtension,
  registerWith,
  installAutoSweep,
} from '../src/extension.js';

const ES = {
  hyperfixi: {
    attrs: { 'hx-obtener': 'hx-get' },
    events: { clic: 'click' },
  },
};

beforeEach(() => {
  resetRegistry();
  document.body.innerHTML = '';
});

describe('registerWith', () => {
  it('prefers the htmx v4 registerExtension API', () => {
    const registerExtension = vi.fn();
    const defineExtension = vi.fn();
    expect(registerWith({ registerExtension, defineExtension })).toBe('v4');
    expect(registerExtension).toHaveBeenCalledWith(EXTENSION_NAME, expect.any(Object));
    expect(defineExtension).not.toHaveBeenCalled();
  });

  it('falls back to the v1/v2 defineExtension API', () => {
    const defineExtension = vi.fn();
    expect(registerWith({ defineExtension })).toBe('v2');
    expect(defineExtension).toHaveBeenCalledWith(EXTENSION_NAME, expect.any(Object));
  });

  it('returns null for a missing or unknown htmx global', () => {
    expect(registerWith(null)).toBeNull();
    expect(registerWith(undefined)).toBeNull();
    expect(registerWith({})).toBeNull();
  });
});

describe('v4 hook: htmx_before_process (verified name on 4.0.0-beta5)', () => {
  it('canonicalizes the processed subtree', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const ext = createExtension() as { htmx_before_process(elt: Element): void };
    ext.htmx_before_process(document.querySelector('section')!);
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
  });

  it('does not cancel processing (returns undefined — false would abort process())', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const ext = createExtension() as { htmx_before_process(elt: Element): unknown };
    expect(ext.htmx_before_process(document.querySelector('section')!)).toBeUndefined();
  });

  it('keeps the per-node defensive alias for other v4 prereleases', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const ext = createExtension() as { htmx_before_process_node(elt: Element): void };
    ext.htmx_before_process_node(document.querySelector('section')!);
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
  });
});

describe('v2 hook: onEvent(htmx:beforeProcessNode)', () => {
  it('canonicalizes via the event detail element', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const ext = createExtension() as { onEvent(name: string, evt: CustomEvent): void };
    const evt = new CustomEvent('htmx:beforeProcessNode', {
      detail: { elt: document.querySelector('section')! },
    });
    ext.onEvent('htmx:beforeProcessNode', evt);
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
  });

  it('ignores unrelated events', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const ext = createExtension() as { onEvent(name: string, evt: CustomEvent): void };
    ext.onEvent('htmx:afterSwap', new CustomEvent('htmx:afterSwap', { detail: {} }));
    expect(document.querySelector('button')!.hasAttribute('hx-get')).toBe(false);
  });
});

describe('installAutoSweep', () => {
  it('sweeps immediately when the document is ready', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const cleanup = installAutoSweep(document);
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
    cleanup();
  });

  it('re-sweeps when vocab registers after the initial sweep', () => {
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const cleanup = installAutoSweep(document); // no vocab yet — sweep is a no-op
    expect(document.querySelector('button')!.hasAttribute('hx-get')).toBe(false);
    register('es', ES); // late vocab registration triggers a re-sweep
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
    cleanup();
  });

  it('stops re-sweeping after cleanup', () => {
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    const cleanup = installAutoSweep(document);
    cleanup();
    register('es', ES);
    expect(document.querySelector('button')!.hasAttribute('hx-get')).toBe(false);
  });
});
