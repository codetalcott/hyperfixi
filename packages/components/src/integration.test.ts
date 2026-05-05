/**
 * End-to-end integration — full scan + customElements.define + instantiate.
 *
 * Each test uses a unique tag name because customElements.define is
 * process-wide and cannot be un-defined. The module-level `REGISTERED` set
 * is reset per-test via `_resetRegisteredForTest` so our idempotency check
 * doesn't short-circuit (the real registry still remembers, but happy-dom's
 * registry is per-document here).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime, installPlugin, getParserExtensionRegistry } from '@hyperfixi/core';
import { reactivityPlugin, reactive } from '@hyperfixi/reactivity';
import { componentsPlugin, registerTemplateComponent } from './index';
import { _resetRegisteredForTest } from './register';
import { _resetInjectedStylesForTest } from './scope-css';

/** Drain microtasks + the setTimeout queue so reactive effects settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

// Unique tag suffix per-test to avoid collision with customElements registry.
let _counter = 0;
function uniqueTag(prefix = 'hf-comp'): string {
  return `${prefix}-${++_counter}`;
}

describe('@hyperfixi/components — integration', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;

  beforeEach(() => {
    baseline = registry.snapshot();
    _resetRegisteredForTest();
    _resetInjectedStylesForTest();
  });

  afterEach(() => {
    registry.restore(baseline);
    // Clean up any test-added elements from <body>.
    document.body.innerHTML = '';
    _resetInjectedStylesForTest();
  });

  it('registers a template component and stamps its content on instantiation', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}">
        <p>hello from component</p>
      </template>
    `;

    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    const registered = componentsPlugin.scan(document);
    expect(registered).toBeGreaterThanOrEqual(1);

    // Instantiate and attach to the DOM so connectedCallback fires.
    const instance = document.createElement(tag);
    document.body.appendChild(instance);

    expect(instance.innerHTML).toContain('hello from component');
  });

  it('interpolates ${attrs.*} values from component attributes', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}">
        <p>count: \${attrs.initialCount}, flag: \${attrs.isOn}</p>
      </template>
    `;
    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    componentsPlugin.scan(document);

    const instance = document.createElement(tag);
    instance.setAttribute('initial-count', '7');
    instance.setAttribute('is-on', 'true');
    document.body.appendChild(instance);

    expect(instance.innerHTML).toContain('count: 7');
    expect(instance.innerHTML).toContain('flag: true');
  });

  it('substitutes default slot content from children', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}">
        <div class="wrapper"><slot/></div>
      </template>
    `;
    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    componentsPlugin.scan(document);

    const instance = document.createElement(tag);
    instance.innerHTML = '<span>user content</span>';
    document.body.appendChild(instance);

    expect(instance.querySelector('.wrapper')).toBeTruthy();
    expect(instance.querySelector('.wrapper')!.innerHTML).toContain('<span>user content</span>');
  });

  it('substitutes named slots', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}">
        <header><slot name="title"/></header>
        <main><slot/></main>
      </template>
    `;
    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    componentsPlugin.scan(document);

    const instance = document.createElement(tag);
    instance.innerHTML = '<h1 slot="title">My Title</h1><p>Body text</p>';
    document.body.appendChild(instance);

    const header = instance.querySelector('header');
    const main = instance.querySelector('main');
    expect(header).toBeTruthy();
    expect(main).toBeTruthy();
    expect(header!.innerHTML).toContain('<h1>My Title</h1>'); // slot= stripped
    expect(main!.innerHTML).toContain('<p>Body text</p>');
  });

  it('rejects tag names without a dash', () => {
    const errors: unknown[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      document.body.innerHTML = '<template component="nodash"><p>bad</p></template>';
      const runtime = new Runtime();
      installPlugin(runtime, componentsPlugin);
      const count = componentsPlugin.scan(document);
      expect(count).toBe(0);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(String(errors[0])).toMatch(/dash/);
    } finally {
      console.error = origError;
    }
  });

  it('is idempotent for re-registration of the same tag', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}"><p>once</p></template>
    `;
    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    const first = componentsPlugin.scan(document);
    const second = componentsPlugin.scan(document);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBe(0); // already registered
  });

  it('registerTemplateComponent can be called directly (no plugin install)', () => {
    const tag = uniqueTag();
    document.body.innerHTML = `
      <template component="${tag}"><p>direct</p></template>
    `;
    const t = document.querySelector('template')!;
    const ok = registerTemplateComponent(t as HTMLTemplateElement);
    expect(ok).toBe(true);

    const instance = document.createElement(tag);
    document.body.appendChild(instance);
    expect(instance.innerHTML).toContain('direct');
  });

  describe('v2: reactive ^var rendering', () => {
    it("interpolates ${^var} from the host element's caret-var storage", async () => {
      const tag = uniqueTag();
      document.body.innerHTML = `
        <template component="${tag}">
          <span class="readout">Count: \${^count}</span>
        </template>
      `;
      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);

      // Seed ^count on the host directly (no init script in this test).
      reactive.writeCaret(instance, 'count', 7, instance);
      await settle();

      expect(instance.innerHTML).toContain('Count: 7');
    });

    it('re-renders when a tracked ^var is updated', async () => {
      const tag = uniqueTag();
      document.body.innerHTML = `
        <template component="${tag}">
          <span class="readout">Count: \${^count}</span>
        </template>
      `;
      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);

      reactive.writeCaret(instance, 'count', 0, instance);
      await settle();
      expect(instance.innerHTML).toContain('Count: 0');

      reactive.writeCaret(instance, 'count', 42, instance);
      await settle();
      expect(instance.innerHTML).toContain('Count: 42');
    });

    it('runs an init script from `_=` on <template>', async () => {
      const tag = uniqueTag();
      // The init script seeds ^count to 5 once on connectedCallback.
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^count to 5');
      tmpl.innerHTML = '<span class="readout">v=${^count}</span>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      await settle();

      // After init runs and effect re-renders, ^count = 5 should appear.
      expect(instance.innerHTML).toContain('v=5');
    });

    it('preserves init script from <script type="text/hyperscript-template" _="...">', async () => {
      const tag = uniqueTag();
      const script = document.createElement('script');
      script.setAttribute('type', 'text/hyperscript-template');
      script.setAttribute('component', tag);
      script.setAttribute('_', 'set ^value to "hello"');
      script.textContent = '<span class="readout">${^value}</span>';
      document.body.appendChild(script);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      await settle();

      expect(instance.innerHTML).toContain('hello');
    });

    it('full click-counter scenario: init + button click + reactive re-render', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^count to 0');
      tmpl.innerHTML =
        '<button _="on click increment ^count">+</button>' +
        '<span class="readout">Clicks: ${^count}</span>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      await settle();

      // Initial render after init: count = 0
      expect(instance.innerHTML).toContain('Clicks: 0');

      // Simulate clicks. Re-query the button after each settle — the
      // reactive re-render replaces innerHTML, so the previous reference
      // is detached. Settle between clicks — rapid synchronous clicks race
      // with the async hyperscript event handler chain (a pre-existing
      // runtime behavior, not specific to components).
      instance.querySelector('button')!.click();
      await settle();
      expect(instance.innerHTML).toContain('Clicks: 1');

      instance.querySelector('button')!.click();
      await settle();
      expect(instance.innerHTML).toContain('Clicks: 2');

      instance.querySelector('button')!.click();
      await settle();
      expect(instance.innerHTML).toContain('Clicks: 3');
    });

    it('init script can read attrs.X as a hyperscript local', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^title to attrs.title');
      tmpl.innerHTML = '<h3>${^title}</h3>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      instance.setAttribute('title', 'Hello, attrs!');
      document.body.appendChild(instance);
      await settle();

      expect(instance.innerHTML).toContain('Hello, attrs!');
    });

    it("descendants' _= attributes do not see attrs (design choice — copy via ^vars)", async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      // Init copies attrs.label into ^label so descendants can read it.
      tmpl.setAttribute('_', 'set ^label to attrs.label');
      tmpl.innerHTML = '<button _="on click set my textContent to ^label">click</button>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      instance.setAttribute('label', 'Saved!');
      document.body.appendChild(instance);
      await settle();

      const button = instance.querySelector('button')!;
      button.click();
      await settle();
      expect(button.textContent).toBe('Saved!');
    });

    it("nested components don't leak ^vars across the dom-scope boundary", async () => {
      const outerTag = uniqueTag('outer-counter');
      const innerTag = uniqueTag('inner-counter');

      const outerTmpl = document.createElement('template');
      outerTmpl.setAttribute('component', outerTag);
      outerTmpl.setAttribute('_', 'set ^count to 99');
      outerTmpl.innerHTML = `<span class="outer">outer:\${^count}</span><${innerTag}></${innerTag}>`;
      document.body.appendChild(outerTmpl);

      const innerTmpl = document.createElement('template');
      innerTmpl.setAttribute('component', innerTag);
      // Note: NO init script — inner doesn't define ^count.
      innerTmpl.innerHTML = '<span class="inner">inner:${^count}</span>';
      document.body.appendChild(innerTmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const outer = document.createElement(outerTag);
      document.body.appendChild(outer);
      await settle();

      // Outer renders with count=99.
      expect(outer.querySelector('.outer')!.textContent).toBe('outer:99');
      // Inner doesn't define ^count and the boundary blocks the walk —
      // ${^count} resolves to undefined, which renders as empty string.
      expect(outer.querySelector('.inner')!.textContent).toBe('inner:');
    });

    it('isolated state: each instance has its own ^var storage', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^count to 0');
      tmpl.innerHTML =
        '<button _="on click increment ^count">+</button>' +
        '<span class="readout">${^count}</span>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const a = document.createElement(tag);
      const b = document.createElement(tag);
      document.body.appendChild(a);
      document.body.appendChild(b);
      await settle();

      a.querySelector('button')!.click();
      await settle();
      a.querySelector('button')!.click();
      await settle();

      expect(a.querySelector('.readout')!.textContent).toBe('2');
      expect(b.querySelector('.readout')!.textContent).toBe('0');
    });
  });

  describe('v2.1: scoped CSS (@scope lifting)', () => {
    it('lifts <style> blocks out of the template into <head> wrapped in @scope', () => {
      const tag = uniqueTag();
      document.body.innerHTML = `
        <template component="${tag}">
          <style>.btn { color: red; }</style>
          <button class="btn">click</button>
        </template>
      `;
      const runtime = new Runtime();
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const headStyle = document.head.querySelector(`style[data-component="${tag}"]`);
      expect(headStyle).toBeTruthy();
      expect(headStyle!.textContent).toContain(`@scope (${tag})`);
      expect(headStyle!.textContent).toContain('.btn { color: red; }');

      // Instance HTML should not include the original <style>.
      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      expect(instance.innerHTML).not.toContain('<style');
      expect(instance.innerHTML).toContain('<button');
    });

    it('dedupes head injection when the same component is registered twice', () => {
      const tag = uniqueTag();
      document.body.innerHTML = `
        <template component="${tag}"><style>.x{color:red}</style><p>p</p></template>
      `;
      const runtime = new Runtime();
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);
      componentsPlugin.scan(document); // second scan — already registered

      const matches = document.head.querySelectorAll(`style[data-component="${tag}"]`);
      expect(matches.length).toBe(1);
    });

    it('emits distinct head styles for distinct components', () => {
      const a = uniqueTag('hf-a');
      const b = uniqueTag('hf-b');
      document.body.innerHTML = `
        <template component="${a}"><style>.a{}</style><p/></template>
        <template component="${b}"><style>.b{}</style><p/></template>
      `;
      const runtime = new Runtime();
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      expect(document.head.querySelector(`style[data-component="${a}"]`)).toBeTruthy();
      expect(document.head.querySelector(`style[data-component="${b}"]`)).toBeTruthy();
    });

    it('does nothing when the template has no <style>', () => {
      const tag = uniqueTag();
      document.body.innerHTML = `<template component="${tag}"><p>plain</p></template>`;
      const runtime = new Runtime();
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);
      expect(document.head.querySelector(`style[data-component="${tag}"]`)).toBeNull();
    });
  });

  describe('v2: template directives (#if / #for / #else / #end)', () => {
    it('renders #if branch when condition is truthy', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.innerHTML =
        '<header>${attrs.title}</header>\n' +
        '#if attrs.showBadge\n' +
        '  <span class="badge">VIP</span>\n' +
        '#end';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const a = document.createElement(tag);
      a.setAttribute('title', 'Hello');
      a.setAttribute('show-badge', 'true');
      document.body.appendChild(a);
      await settle();
      expect(a.innerHTML).toContain('Hello');
      expect(a.innerHTML).toContain('VIP');

      const b = document.createElement(tag);
      b.setAttribute('title', 'Hi');
      // show-badge omitted → coerces falsy
      document.body.appendChild(b);
      await settle();
      expect(b.innerHTML).toContain('Hi');
      expect(b.innerHTML).not.toContain('VIP');
    });

    it('renders #else branch when #if condition is falsy', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.innerHTML =
        '#if attrs.online\n' +
        '  <span class="status">online</span>\n' +
        '#else\n' +
        '  <span class="status">offline</span>\n' +
        '#end';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const offline = document.createElement(tag);
      document.body.appendChild(offline);
      await settle();
      expect(offline.innerHTML).toContain('offline');
      expect(offline.innerHTML).not.toContain('>online<');
    });

    it('renders #for over an iterable from a ^var', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^items to ["alpha","beta","gamma"]');
      tmpl.innerHTML =
        '<ul>\n' + '#for item in ^items\n' + '  <li>${item}</li>\n' + '#end\n' + '</ul>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      await settle();
      expect(instance.innerHTML).toContain('<li>alpha</li>');
      expect(instance.innerHTML).toContain('<li>beta</li>');
      expect(instance.innerHTML).toContain('<li>gamma</li>');
    });

    it('renders #for #else when iterable is empty', async () => {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.setAttribute('_', 'set ^items to []');
      tmpl.innerHTML =
        '<ul>\n' +
        '#for item in ^items\n' +
        '  <li>${item}</li>\n' +
        '#else\n' +
        '  <li class="empty">no items</li>\n' +
        '#end\n' +
        '</ul>';
      document.body.appendChild(tmpl);

      const runtime = new Runtime();
      installPlugin(runtime, reactivityPlugin);
      installPlugin(runtime, componentsPlugin);
      componentsPlugin.scan(document);

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      await settle();
      expect(instance.innerHTML).toContain('no items');
    });
  });

  it('watch() registers dynamically-added templates', async () => {
    const runtime = new Runtime();
    installPlugin(runtime, componentsPlugin);
    const stop = componentsPlugin.watch();

    try {
      const tag = uniqueTag();
      const tmpl = document.createElement('template');
      tmpl.setAttribute('component', tag);
      tmpl.innerHTML = '<p>dynamic</p>';
      document.body.appendChild(tmpl);

      // Give the MutationObserver microtask a chance to fire.
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      const instance = document.createElement(tag);
      document.body.appendChild(instance);
      expect(instance.innerHTML).toContain('dynamic');
    } finally {
      stop();
    }
  });
});
