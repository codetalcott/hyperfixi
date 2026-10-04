# Packages

LokaScript is organized as a monorepo with multiple packages. Each package can be used independently or together.

## Core Packages

| Package                                       | Description                                       | Size   |
| --------------------------------------------- | ------------------------------------------------- | ------ |
| [@lokascript/core](/en/packages/core)         | Main runtime, parser, and 43 commands             | 224 KB |
| [@lokascript/semantic](/en/packages/semantic) | Semantic-first multilingual parser (23 languages) | 61 KB  |
| [@lokascript/i18n](/en/packages/i18n)         | Grammar transformation (13 languages)             | 68 KB  |

## Integration

| Package                                                             | Description                                                   | Size       |
| ------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [@lokascript/hyperscript-adapter](/en/packages/hyperscript-adapter) | Multilingual plugin for original \_hyperscript (24 languages) | 85--568 KB |

## Build Tools

| Package                                             | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| [@lokascript/vite-plugin](/en/packages/vite-plugin) | Zero-config Vite plugin with automatic bundle generation |

## Choosing Packages

### Web Project (Client-Side Only)

```bash
npm install @lokascript/core
```

Or use the Vite plugin for automatic optimization:

```bash
npm install @lokascript/core @lokascript/vite-plugin
```

### Multilingual Support

```bash
npm install @lokascript/core @lokascript/semantic @lokascript/i18n
```

### Existing \_hyperscript Project (Add i18n)

```bash
npm install @lokascript/hyperscript-adapter
```

Or use a CDN bundle -- no npm required:

```html
<script src="_hyperscript.js"></script>
<script src="hyperscript-i18n-es.global.js"></script>
```

## Bundle Comparison

All packages provide multiple bundle options:

```
Full Bundle (224 KB)
├── lokascript-browser.js         # All features
├── lokascript-multilingual.js    # i18n support (250 KB)
└── lokascript-semantic.browser.global.js  # Semantic parser (61 KB)

(The 3.x small prebuilts — lite, lite-plus, hybrid-complete, hybrid-hx — are
retired; the script-tag bundle is @hyperfixi/engine's hyperfixi-hs.js.)
```
