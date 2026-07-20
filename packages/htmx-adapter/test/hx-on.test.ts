import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, resetRegistry } from '../src/registry.js';
import { canonicalizeElement, canonicalizeTree } from '../src/canonicalize.js';
import {
  setBodyExecutor,
  setBodyTranslator,
  hasBodyExecutor,
  hasBodyTranslator,
  autoDetectBodyHooks,
  resetBodyHooks,
} from '../src/hx-on.js';
import { installAutoSweep } from '../src/extension.js';

const ES = {
  hyperfixi: {
    attrs: { 'hx-obtener': 'hx-get', 'hx-en': 'hx-on' },
    events: { clic: 'click', cambiar: 'change' },
  },
};

beforeEach(() => {
  resetRegistry();
  resetBodyHooks();
  document.body.innerHTML = '';
});

function click(elt: Element): void {
  elt.dispatchEvent(new Event('click', { bubbles: true }));
}

describe('default mode (no executor)', () => {
  it('keeps v1 behavior: localized hx-on gets a canonical sibling, no listener', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="alternar .active"></button></section>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    expect(btn.getAttribute('hx-on:click')).toBe('alternar .active');
    expect(btn.getAttribute('hx-en:clic')).toBe('alternar .active');
  });
});

describe('executor mode: localized-named hx-on', () => {
  it('installs a listener, keeps the authored attr, and creates NO canonical sibling', () => {
    register('es', ES);
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="alternar .active"></button></section>`;
    const btn = document.querySelector('button')!;

    expect(canonicalizeElement(btn)).toBe(true);
    expect(btn.hasAttribute('hx-on:click')).toBe(false); // htmx never sees it
    expect(btn.getAttribute('hx-en:clic')).toBe('alternar .active'); // authored attr verbatim

    click(btn);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith('alternar .active', btn, expect.any(Event));
  });

  it('translates the body lazily through the translator, memoized across fires', () => {
    register('es', ES);
    const executor = vi.fn();
    const translator = vi.fn((body: string) => `toggle .active /* from ${body} */`);
    setBodyExecutor(executor);
    setBodyTranslator(translator);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="alternar .active"></button></section>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);

    expect(translator).not.toHaveBeenCalled(); // lazy — nothing until first fire
    click(btn);
    click(btn);
    expect(translator).toHaveBeenCalledTimes(1); // memoized
    expect(translator).toHaveBeenCalledWith('alternar .active', 'es');
    expect(executor).toHaveBeenLastCalledWith(
      'toggle .active /* from alternar .active */',
      btn,
      expect.any(Event)
    );
  });

  it('a translator registered after claiming still applies (first fire is the deadline)', () => {
    register('es', ES);
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="alternar .active"></button></section>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);

    setBodyTranslator(() => 'toggle .active');
    click(btn);
    expect(executor).toHaveBeenCalledWith('toggle .active', btn, expect.any(Event));
  });
});

describe('executor mode: canonical-named hx-on', () => {
  it('claims and REMOVES the attribute (htmx double-exec guard), listener still fires', () => {
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<button hx-on:click="toggle .active"></button>`; // English page, no vocab
    const btn = document.querySelector('button')!;

    expect(canonicalizeElement(btn)).toBe(true);
    expect(btn.hasAttribute('hx-on:click')).toBe(false);

    click(btn);
    expect(executor).toHaveBeenCalledWith('toggle .active', btn, expect.any(Event));
  });

  it('does not translate English-scope bodies even with a translator set', () => {
    const executor = vi.fn();
    const translator = vi.fn((b: string) => `XX ${b}`);
    setBodyExecutor(executor);
    setBodyTranslator(translator);
    document.body.innerHTML = `<button hx-on:click="toggle .active"></button>`;
    canonicalizeElement(document.querySelector('button')!);
    click(document.querySelector('button')!);
    expect(translator).not.toHaveBeenCalled();
    expect(executor).toHaveBeenCalledWith('toggle .active', expect.anything(), expect.any(Event));
  });

  it('maps the hx-on:: shorthand to the htmx: event namespace', () => {
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<button hx-on::after-swap="log it"></button>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    btn.dispatchEvent(new CustomEvent('htmx:after-swap'));
    expect(executor).toHaveBeenCalledWith('log it', btn, expect.any(Event));
  });

  it('claims multiple hx-on attributes on one element independently', () => {
    register('es', ES);
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<section lang="es"><button hx-on:click="a" hx-en:cambiar="b"></button></section>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    click(btn);
    btn.dispatchEvent(new Event('change'));
    expect(executor).toHaveBeenCalledTimes(2);
    expect(executor.mock.calls.map(c => c[0]).sort()).toEqual(['a', 'b']);
  });
});

describe('executor mode: idempotency and lifecycle', () => {
  it('re-sweeping does not stack duplicate listeners', () => {
    register('es', ES);
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="x"></button></section>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    canonicalizeElement(btn);
    canonicalizeTree(document.body);
    click(btn);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('a late executor heals an already-canonicalized element via the auto-sweep re-run', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-en:clic="alternar .active"></button></section>`;
    const cleanup = installAutoSweep(document); // v1 sweep: creates hx-on:click sibling
    const btn = document.querySelector('button')!;
    expect(btn.getAttribute('hx-on:click')).toBe('alternar .active');

    const executor = vi.fn();
    setBodyExecutor(executor); // triggers re-sweep → canonical claimed & removed
    expect(btn.hasAttribute('hx-on:click')).toBe(false);
    click(btn);
    expect(executor).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('clearing the executor silences claimed listeners', () => {
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<button hx-on:click="x"></button>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    setBodyExecutor(null);
    click(btn);
    expect(executor).not.toHaveBeenCalled();
  });

  it('an executor error is contained and logged, not thrown', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    setBodyExecutor(() => {
      throw new Error('boom');
    });
    document.body.innerHTML = `<button hx-on:click="x"></button>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    expect(() => click(btn)).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('executor mode sweeps run even with no vocab registered', () => {
    const executor = vi.fn();
    setBodyExecutor(executor);
    document.body.innerHTML = `<button hx-on:click="x"></button>`;
    expect(canonicalizeTree(document.body)).toBe(1);
  });
});

describe('autoDetectBodyHooks', () => {
  it('wires _hyperscript.evaluate as executor and HyperscriptI18n.preprocess as translator', () => {
    const evaluate = vi.fn();
    const preprocess = vi.fn((src: string) => src.toUpperCase());
    const hs = Object.assign(vi.fn(), { evaluate });
    autoDetectBodyHooks({ _hyperscript: hs, HyperscriptI18n: { preprocess } });
    expect(hasBodyExecutor()).toBe(true);
    expect(hasBodyTranslator()).toBe(true);

    document.body.innerHTML = `<section lang="es"><button hx-on:click="alternar"></button></section>`;
    // No es vocab loaded — canonical-named claim still works.
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    click(btn);
    expect(preprocess).toHaveBeenCalledWith('alternar', 'es');
    expect(evaluate).toHaveBeenCalledWith('ALTERNAR', { me: btn, event: expect.any(Event) });
  });

  it('never overwrites explicitly configured hooks', () => {
    const mine = vi.fn();
    setBodyExecutor(mine);
    const evaluate = vi.fn();
    autoDetectBodyHooks({ _hyperscript: Object.assign(vi.fn(), { evaluate }) });
    document.body.innerHTML = `<button hx-on:click="x"></button>`;
    const btn = document.querySelector('button')!;
    canonicalizeElement(btn);
    click(btn);
    expect(mine).toHaveBeenCalledTimes(1);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('is a no-op when the globals are absent', () => {
    autoDetectBodyHooks({});
    expect(hasBodyExecutor()).toBe(false);
    expect(hasBodyTranslator()).toBe(false);
  });
});
