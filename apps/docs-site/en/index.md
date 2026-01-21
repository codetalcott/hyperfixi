---
layout: home

hero:
  name: 'LokaScript'
  text: 'Hyperscript for Everyone'
  tagline: Write interactive UI behaviors in your native language with 43 commands, 13 supported languages, and flexible bundle options.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/codetalcott/lokascript

features:
  - icon: 🌍
    title: Multilingual Support
    details: Write hyperscript in English, Spanish, Japanese, Chinese, Arabic, and 8 more languages with natural grammar transformation.
  - icon: ⚡
    title: Flexible Bundles
    details: From 1.9KB lite bundle to full-featured 224KB bundle. Use only what you need with the Vite plugin or custom bundle generator.
  - icon: 🎯
    title: 43 Commands
    details: Complete command set for DOM manipulation, animations, control flow, async operations, and more.
  - icon: 🔧
    title: Developer Tools
    details: Debug logging, compilation metadata, semantic parse events, and comprehensive test coverage with 2838+ tests.
---

<script setup>
import HyperscriptPlayground from '../.vitepress/theme/components/HyperscriptPlayground.vue'
</script>

## Try It Now

Experience hyperscript in your native language:

### English

<HyperscriptPlayground
  initial-code="on click toggle .active on me"
  initial-html='<button class="demo-button">Toggle Active</button>'
/>

### Spanish

<HyperscriptPlayground
  initial-code="en clic alternar .active en yo"
  initial-html='<button class="demo-button">Alternar Activo</button>'
  initial-language="es"
/>

### Japanese

<HyperscriptPlayground
  initial-code="クリック で 切り替え .active を 私"
  initial-html='<button class="demo-button">アクティブを切り替え</button>'
  initial-language="ja"
/>

### Arabic (RTL)

<HyperscriptPlayground
  initial-code="عند النقر بدّل .active على أنا"
  initial-html='<button class="demo-button" dir="rtl">تبديل النشط</button>'
  initial-language="ar"
/>

## Quick Start

### CDN (Simplest)

```html
<script src="https://unpkg.com/@lokascript/core/dist/lokascript-browser.js"></script>

<button _="on click toggle .active on me">Click me</button>
```

### npm + Vite (Recommended)

```bash
npm install @lokascript/core @lokascript/vite-plugin
```

```js
// vite.config.js
import { hyperfixi } from '@lokascript/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

```js
// main.js
import 'hyperfixi';
```

## Bundle Options

| Bundle                          | Size   | Commands | Use Case             |
| ------------------------------- | ------ | -------- | -------------------- |
| `lokascript-lite.js`            | 1.9 KB | 8        | Minimal interactions |
| `lokascript-hybrid-complete.js` | 6.7 KB | 21+      | Most projects        |
| `lokascript-browser.js`         | 224 KB | 43       | Full features        |

## Write in Your Language

LokaScript supports writing hyperscript in 13 languages with natural grammar:

```
English (SVO):  on click toggle .active on me
Japanese (SOV): クリック で .active を 切り替え
Arabic (VSO):   عند النقر بدّل .active على نفسي
Spanish (SVO):  al hacer clic alternar .active en mi
```

[Learn more about multilingual support →](/en/guide/multilingual)
