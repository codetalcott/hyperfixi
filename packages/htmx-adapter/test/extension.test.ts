import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, resetRegistry } from '../src/registry.js';
import {
  EXTENSION_NAME,
  createExtension,
  registerWith,
  installAutoSweep,
} from '../src/extension.js';
import {
  setBodyExecutor,
  resetBodyHooks,
  setCanonicalClaimMode,
  canonicalClaimMode,
} from '../src/hx-on.js';

const ES = {
  hyperfixi: {
    attrs: { 'hx-obtener': 'hx-get' },
    events: { clic: 'click' },
  },
};

beforeEach(() => {
  resetRegistry();
  resetBodyHooks();
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

describe('registerWith selects the canonical claim mode', () => {
  it("v4 → 'preserve' (the cancelable before:on:init hook is the guard)", () => {
    registerWith({ registerExtension: vi.fn() });
    expect(canonicalClaimMode()).toBe('preserve');
  });

  it("v2 → 'remove' (no cancelable per-node hx-on hook exists)", () => {
    registerWith({ defineExtension: vi.fn() });
    expect(canonicalClaimMode()).toBe('remove');
  });
});

describe('v4 hook: htmx_before_on_init (executor double-execution guard)', () => {
  type Ext = {
    htmx_before_process(elt: Element): void;
    htmx_before_on_init(elt: Element): boolean | undefined;
  };

  it('is inert without an executor — htmx binds hx-on itself', () => {
    const ext = createExtension() as Ext;
    document.body.innerHTML = `<button hx-on:click="doIt()"></button>`;
    const btn = document.querySelector('button')!;
    expect(ext.htmx_before_on_init(btn)).toBeUndefined();
    expect(btn.getAttribute('hx-on:click')).toBe('doIt()');
  });

  it('cancels binding when every hx-on attr is the claimed colon form; attrs stay', () => {
    setCanonicalClaimMode('preserve');
    const executor = vi.fn();
    setBodyExecutor(executor);
    const ext = createExtension() as Ext;
    document.body.innerHTML = `<button hx-on:click="toggle .x"></button>`;
    const btn = document.querySelector('button')!;

    ext.htmx_before_process(document.body); // the sweep that claims
    expect(btn.getAttribute('hx-on:click')).toBe('toggle .x'); // preserved

    expect(ext.htmx_before_on_init(btn)).toBe(false); // htmx skips the node
    expect(btn.getAttribute('hx-on:click')).toBe('toggle .x'); // still preserved

    btn.dispatchEvent(new Event('click', { bubbles: true }));
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('falls back to removal on a mixed node (legacy composite hx-on) and lets htmx proceed', () => {
    setCanonicalClaimMode('preserve');
    setBodyExecutor(vi.fn());
    const ext = createExtension() as Ext;
    document.body.innerHTML = `<button hx-on:click="toggle .x" hx-on="blur -> doB()"></button>`;
    const btn = document.querySelector('button')!;

    ext.htmx_before_process(document.body);
    expect(ext.htmx_before_on_init(btn)).toBeUndefined(); // htmx proceeds (composite)
    expect(btn.hasAttribute('hx-on:click')).toBe(false); // claimed form removed
    expect(btn.getAttribute('hx-on')).toBe('blur -> doB()'); // untouched for htmx
  });

  it('data-hx-on* spellings also take the removal fallback', () => {
    setCanonicalClaimMode('preserve');
    setBodyExecutor(vi.fn());
    const ext = createExtension() as Ext;
    document.body.innerHTML = `<button hx-on:click="toggle .x" data-hx-on:change="js()"></button>`;
    const btn = document.querySelector('button')!;

    ext.htmx_before_process(document.body);
    expect(ext.htmx_before_on_init(btn)).toBeUndefined();
    expect(btn.hasAttribute('hx-on:click')).toBe(false);
    expect(btn.getAttribute('data-hx-on:change')).toBe('js()');
  });

  it('leaves nodes without hx-on attributes alone', () => {
    setBodyExecutor(vi.fn());
    const ext = createExtension() as Ext;
    document.body.innerHTML = `<button hx-get="/x"></button>`;
    expect(ext.htmx_before_on_init(document.querySelector('button')!)).toBeUndefined();
  });

  it('full v4 flow: registerWith flips the mode, sweep preserves, hook cancels', () => {
    let captured: Ext | undefined;
    registerWith({
      registerExtension: (_name: string, ext: object) => {
        captured = ext as Ext;
      },
    });
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<button hx-on:click="toggle .x"></button>`;
    const btn = document.querySelector('button')!;

    captured!.htmx_before_process(document.body);
    expect(btn.getAttribute('hx-on:click')).toBe('toggle .x');
    expect(captured!.htmx_before_on_init(btn)).toBe(false);

    btn.dispatchEvent(new Event('click', { bubbles: true }));
    expect(executor).toHaveBeenCalledTimes(1);
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
