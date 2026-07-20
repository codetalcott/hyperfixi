import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, resetRegistry } from '../src/registry.js';
import {
  canonicalizeElement,
  canonicalizeTree,
  translateTriggerValue,
} from '../src/canonicalize.js';

const ES = {
  hyperfixi: {
    attrs: {
      'hx-obtener': 'hx-get',
      'hx-objetivo': 'hx-target',
      'hx-intercambiar': 'hx-swap',
      'hx-disparar': 'hx-trigger',
      'hx-en': 'hx-on',
      'sse-conectar': 'sse-connect',
      'ws-enviar': 'ws-send',
    },
    events: {
      clic: 'click',
      teclaabajo: 'keydown',
      cambiar: 'change',
    },
  },
};

beforeEach(() => {
  resetRegistry();
  document.body.innerHTML = '';
});

function esButton(attrs: string): HTMLElement {
  document.body.innerHTML = `<section lang="es"><button ${attrs}>x</button></section>`;
  return document.querySelector('button')!;
}

describe('translateTriggerValue', () => {
  const events = ES.hyperfixi.events;

  it('translates the leading event token of each spec', () => {
    expect(translateTriggerValue('clic', events)).toBe('click');
    expect(translateTriggerValue('clic, teclaabajo from:body', events)).toBe(
      'click, keydown from:body'
    );
  });

  it('preserves attached filters and modifiers', () => {
    expect(translateTriggerValue("clic[ctrlKey] delay:500ms", events)).toBe(
      "click[ctrlKey] delay:500ms"
    );
  });

  it('leaves unknown tokens alone and is idempotent', () => {
    expect(translateTriggerValue('every 2s', events)).toBe('every 2s');
    const once = translateTriggerValue('clic delay:500ms', events);
    expect(translateTriggerValue(once, events)).toBe(once);
  });
});

describe('canonicalizeElement', () => {
  it('adds the canonical attribute and keeps the localized one verbatim', () => {
    register('es', ES);
    const btn = esButton(`hx-obtener="/api/usuarios" hx-objetivo="#out"`);
    expect(canonicalizeElement(btn)).toBe(true);
    expect(btn.getAttribute('hx-get')).toBe('/api/usuarios');
    expect(btn.getAttribute('hx-target')).toBe('#out');
    // Devtools faithfulness: authored attributes untouched.
    expect(btn.getAttribute('hx-obtener')).toBe('/api/usuarios');
    expect(btn.getAttribute('hx-objetivo')).toBe('#out');
  });

  it('translates event names when writing the canonical hx-trigger', () => {
    register('es', ES);
    const btn = esButton(`hx-obtener="/x" hx-disparar="clic delay:500ms, cambiar"`);
    canonicalizeElement(btn);
    expect(btn.getAttribute('hx-trigger')).toBe('click delay:500ms, change');
    expect(btn.getAttribute('hx-disparar')).toBe('clic delay:500ms, cambiar');
  });

  it('translates an author-written canonical hx-trigger value in place', () => {
    register('es', ES);
    const btn = esButton(`hx-get="/x" hx-trigger="clic"`);
    expect(canonicalizeElement(btn)).toBe(true);
    expect(btn.getAttribute('hx-trigger')).toBe('click');
  });

  it('handles the hx-on colon family with event-suffix translation', () => {
    register('es', ES);
    const btn = esButton(`hx-en:clic="console.log(1)"`);
    canonicalizeElement(btn);
    expect(btn.getAttribute('hx-on:click')).toBe('console.log(1)');
    expect(btn.getAttribute('hx-en:clic')).toBe('console.log(1)');
  });

  it('never overwrites an existing canonical attribute', () => {
    register('es', ES);
    const btn = esButton(`hx-get="/canonical" hx-obtener="/localized"`);
    expect(canonicalizeElement(btn)).toBe(false);
    expect(btn.getAttribute('hx-get')).toBe('/canonical');
  });

  it('is idempotent — a second pass changes nothing', () => {
    register('es', ES);
    const btn = esButton(`hx-obtener="/x" hx-disparar="clic"`);
    expect(canonicalizeElement(btn)).toBe(true);
    expect(canonicalizeElement(btn)).toBe(false);
  });

  it('is a no-op for English scopes', () => {
    register('es', ES);
    document.body.innerHTML = `<button hx-obtener="/x">x</button>`; // no lang ancestor
    const btn = document.querySelector('button')!;
    expect(canonicalizeElement(btn)).toBe(false);
    expect(btn.hasAttribute('hx-get')).toBe(false);
  });

  it('is a no-op (with one warning) for a lang scope without vocab', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<section lang="de">
      <button id="a" hx-obtener="/x">x</button>
      <button id="b" hx-obtener="/y">y</button>
    </section>`;
    expect(canonicalizeElement(document.getElementById('a')!)).toBe(false);
    expect(canonicalizeElement(document.getElementById('b')!)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('ignores elements with no hx-/sse-/ws- attributes without resolving lang', () => {
    register('es', ES);
    const div = esButton(`class="plain"`);
    expect(canonicalizeElement(div)).toBe(false);
  });

  it('resolves per-element language on a mixed page', () => {
    register('es', ES);
    register('ja', {
      hyperfixi: { attrs: { 'hx-取得': 'hx-get' }, events: {} },
    });
    document.body.innerHTML = `
      <section lang="es"><button id="a" hx-obtener="/es"></button></section>
      <section lang="ja"><button id="b" hx-取得="/ja"></button></section>`;
    canonicalizeElement(document.getElementById('a')!);
    canonicalizeElement(document.getElementById('b')!);
    expect(document.getElementById('a')!.getAttribute('hx-get')).toBe('/es');
    expect(document.getElementById('b')!.getAttribute('hx-get')).toBe('/ja');
  });
});

describe('canonicalizeTree', () => {
  it('canonicalizes the root and all descendants, returning the change count', () => {
    register('es', ES);
    document.body.innerHTML = `<section lang="es" sse-conectar="/events">
      <button hx-obtener="/a"></button>
      <form ws-enviar=""></form>
      <span class="plain"></span>
    </section>`;
    const count = canonicalizeTree(document.querySelector('section')!);
    expect(count).toBe(3);
    expect(document.querySelector('section')!.hasAttribute('sse-connect')).toBe(true);
    expect(document.querySelector('button')!.getAttribute('hx-get')).toBe('/a');
    expect(document.querySelector('form')!.hasAttribute('ws-send')).toBe(true);
  });

  it('is a cheap no-op with no vocab registered', () => {
    document.body.innerHTML = `<section lang="es"><button hx-obtener="/a"></button></section>`;
    expect(canonicalizeTree(document.body)).toBe(0);
    expect(document.querySelector('button')!.hasAttribute('hx-get')).toBe(false);
  });

  it('tolerates a null root', () => {
    expect(canonicalizeTree(null)).toBe(0);
  });
});
