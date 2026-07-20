import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, resetRegistry } from '../src/registry.js';
import { canonicalizeTree } from '../src/canonicalize.js';
import {
  attributeResolver,
  additionalAttributeSelectors,
  installResolverMode,
  isResolverMode,
  setResolverMode,
} from '../src/resolver.js';

const ES = {
  hyperfixi: {
    attrs: {
      'hx-obtener': 'hx-get',
      'hx-objetivo': 'hx-target',
      'hx-en': 'hx-on',
    },
    events: { clic: 'click' },
  },
};

beforeEach(() => {
  resetRegistry();
  setResolverMode(false);
  document.body.innerHTML = '';
});

describe('attributeResolver', () => {
  it('returns the localized name present on the element for its lang scope', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/x"></button></section>`;
    const btn = document.querySelector('button')!;
    expect(attributeResolver(btn, 'hx-get')).toBe('hx-obtener');
    expect(attributeResolver(btn, 'hx-target')).toBeNull(); // mapped but not present
    expect(attributeResolver(btn, 'hx-swap')).toBeNull(); // not mapped
  });

  it('returns null for English scopes and unregistered languages', () => {
    register('es', ES);
    document.body.innerHTML = `
      <button id="en" hx-obtener="/x"></button>
      <section lang="de"><button id="de" hx-obtener="/x"></button></section>`;
    expect(attributeResolver(document.getElementById('en')!, 'hx-get')).toBeNull();
    expect(attributeResolver(document.getElementById('de')!, 'hx-get')).toBeNull();
  });
});

describe('additionalAttributeSelectors', () => {
  it('unions localized names across languages, excluding the hx-on family', () => {
    register('es', ES);
    register('ja', { hyperfixi: { attrs: { 'hx-取得': 'hx-get' } } });
    const selectors = additionalAttributeSelectors();
    expect(selectors).toContain('[hx-obtener]');
    expect(selectors).toContain('[hx-objetivo]');
    expect(selectors).toContain('[hx-取得]');
    expect(selectors).not.toContain('[hx-en]');
  });
});

describe('installResolverMode', () => {
  it('wires config, refreshes selectors on vocab registration, and uninstalls cleanly', () => {
    register('es', ES);
    const htmx = { config: {} as Record<string, unknown> };
    const uninstall = installResolverMode(htmx);

    expect(isResolverMode()).toBe(true);
    expect(htmx.config.attributeResolver).toBe(attributeResolver);
    expect(htmx.config.additionalAttributeSelectors).toContain('[hx-obtener]');

    register('ja', { hyperfixi: { attrs: { 'hx-取得': 'hx-get' } } });
    expect(htmx.config.additionalAttributeSelectors).toContain('[hx-取得]');

    uninstall();
    expect(isResolverMode()).toBe(false);
    expect(htmx.config.attributeResolver).toBeNull();
    register('de', { hyperfixi: { attrs: { 'hx-holen': 'hx-get' } } });
    expect(htmx.config.additionalAttributeSelectors).toEqual([]);
  });

  it('throws on an htmx object without config', () => {
    expect(() => installResolverMode({} as never)).toThrow(/config not found/);
  });

  it('stands the canonicalization shim down (zero mutation)', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/x"></button></section>`;
    setResolverMode(true);
    expect(canonicalizeTree(document.body)).toBe(0);
    expect(document.querySelector('button')!.hasAttribute('hx-get')).toBe(false);
  });

  it('vi sanity: resolver never mutates while resolving', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/x"></button></section>`;
    const btn = document.querySelector('button')!;
    const spy = vi.spyOn(btn, 'setAttribute');
    attributeResolver(btn, 'hx-get');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
