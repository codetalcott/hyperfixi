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
import { componentsPlugin, registerTemplateComponent } from './index';
import { _resetRegisteredForTest } from './register';

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
  });

  afterEach(() => {
    registry.restore(baseline);
    // Clean up any test-added elements from <body>.
    document.body.innerHTML = '';
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
