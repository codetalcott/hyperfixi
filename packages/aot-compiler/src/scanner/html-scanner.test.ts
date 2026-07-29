/**
 * HTML Scanner Tests
 */

import { describe, it, expect } from 'vitest';
import { HTMLScanner, VueScanner, SvelteScanner, JSXScanner } from './html-scanner.js';

describe('HTMLScanner', () => {
  const scanner = new HTMLScanner();

  describe('extract()', () => {
    it('extracts from _ attribute with double quotes', () => {
      const html = '<button _="on click toggle .active">Click</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toBe('on click toggle .active');
    });

    it('extracts from _ attribute with single quotes', () => {
      const html = "<button _='on click toggle .active'>Click</button>";
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toBe('on click toggle .active');
    });

    it('extracts element ID', () => {
      const html = '<button id="my-btn" _="on click toggle .active">Click</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].elementId).toBe('my-btn');
    });

    it('builds selector from tag and classes', () => {
      const html = '<button class="btn primary" _="on click toggle .active">Click</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].elementSelector).toBe('button.btn.primary[_]');
    });

    it('extracts lang attribute', () => {
      const html = '<button lang="ja" _="クリック で .active を トグル">Click</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].language).toBe('ja');
    });

    it('extracts from data-hs attribute', () => {
      const html = '<div data-hs="on click add .clicked">Test</div>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toBe('on click add .clicked');
      expect(scripts[0].attributeName).toBe('data-hs');
    });

    it('extracts from data-hyperscript attribute', () => {
      const html = '<div data-hyperscript="on click remove .hidden">Test</div>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toBe('on click remove .hidden');
    });

    it('handles multiple scripts in same file', () => {
      const html = `
        <button _="on click toggle .a">A</button>
        <button _="on click toggle .b">B</button>
        <div data-hs="on mouseenter add .hover">C</div>
      `;
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(3);
    });

    it('decodes HTML entities', () => {
      const html = '<button _="on click set :x to &quot;value&quot;">Test</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].code).toBe('on click set :x to "value"');
    });

    it('decodes &amp;', () => {
      const html = '<button _="on click log &quot;a &amp; b&quot;">Test</button>';
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].code).toBe('on click log "a & b"');
    });

    it('calculates correct line numbers', () => {
      const html = `<html>
<body>
<button _="on click toggle .active">Test</button>
</body>
</html>`;
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts[0].location.line).toBe(3);
    });

    it('extracts from script tags with type="text/hyperscript"', () => {
      const html = `
        <script type="text/hyperscript">
          behavior Counter
            on click
              increment :count
            end
          end
        </script>
      `;
      const scripts = scanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toContain('behavior Counter');
    });
  });

  describe('with custom options', () => {
    it('respects custom attribute names', () => {
      const customScanner = new HTMLScanner({
        attributeNames: ['hs', 'hyperscript'],
      });

      const html =
        '<button hs="on click toggle .a">A</button><button hyperscript="toggle .b">B</button>';
      const scripts = customScanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(2);
    });

    it('respects includeScriptTags option', () => {
      const noScriptScanner = new HTMLScanner({
        includeScriptTags: false,
      });

      const html = `
        <button _="toggle .a">A</button>
        <script type="text/hyperscript">toggle .b</script>
      `;
      const scripts = noScriptScanner.extract(html, 'test.html');

      expect(scripts).toHaveLength(1);
      expect(scripts[0].code).toBe('toggle .a');
    });

    it('uses default language from options', () => {
      const esScanner = new HTMLScanner({
        defaultLanguage: 'es',
      });

      const html = '<button _="alternar .activo">Test</button>';
      const scripts = esScanner.extract(html, 'test.html');

      expect(scripts[0].language).toBe('es');
    });
  });
});

describe('VueScanner', () => {
  const scanner = new VueScanner();

  it('extracts from Vue template section', () => {
    const vue = `
<template>
  <button _="on click toggle .active">Click</button>
</template>

<script>
export default {
  name: 'MyButton'
}
</script>
`;
    const scripts = scanner.extract(vue, 'Button.vue');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click toggle .active');
  });

  it('ignores script and style sections', () => {
    const vue = `
<template>
  <button _="toggle .a">A</button>
</template>

<script>
const _="not hyperscript"
</script>

<style>
._ { color: red; }
</style>
`;
    const scripts = scanner.extract(vue, 'Button.vue');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('toggle .a');
  });
});

describe('SvelteScanner', () => {
  const scanner = new SvelteScanner();

  it('extracts from Svelte component', () => {
    const svelte = `
<script>
  let count = 0;
</script>

<button _="on click toggle .active">
  Click me
</button>

<style>
  button { color: blue; }
</style>
`;
    const scripts = scanner.extract(svelte, 'Button.svelte');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click toggle .active');
  });
});

describe('JSXScanner', () => {
  const scanner = new JSXScanner();

  it('extracts from JSX string attribute', () => {
    const jsx = `
function Button() {
  return <button _="on click toggle .active">Click</button>;
}
`;
    const scripts = scanner.extract(jsx, 'Button.jsx');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click toggle .active');
  });

  it('extracts from JSX expression with string', () => {
    const jsx = `
function Button() {
  return <button _={'on click toggle .active'}>Click</button>;
}
`;
    const scripts = scanner.extract(jsx, 'Button.jsx');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click toggle .active');
  });

  it('extracts from JSX template literal', () => {
    const jsx = `
function Button() {
  return <button _={\`on click toggle .active\`}>Click</button>;
}
`;
    const scripts = scanner.extract(jsx, 'Button.jsx');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click toggle .active');
  });
});
