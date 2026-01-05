# Packages

HyperFixi is organized as a monorepo with multiple packages. Each package can be used independently or together.

## Core Packages

| Package | Description | Size |
|---------|-------------|------|
| [@hyperfixi/core](/en/packages/core) | Main runtime, parser, and 43 commands | 224 KB |
| [@hyperfixi/semantic](/en/packages/semantic) | Semantic-first multilingual parser | 61 KB |
| [@hyperfixi/i18n](/en/packages/i18n) | Grammar transformation (13 languages) | 68 KB |

## Build Tools

| Package | Description |
|---------|-------------|
| [@hyperfixi/vite-plugin](/en/packages/vite-plugin) | Zero-config Vite plugin with automatic bundle generation |
| [@hyperfixi/smart-bundling](/en/packages/smart-bundling) | AI-driven bundle optimization |

## Server Integration

| Package | Description |
|---------|-------------|
| [@hyperfixi/server-integration](/en/packages/server-integration) | Server-side compilation API |
| [@hyperfixi/ssr-support](/en/packages/ssr-support) | Server-side rendering utilities |
| [hyperfixi-python](/en/packages/hyperfixi-python) | Python integration (Django, Flask, FastAPI) |

## Choosing Packages

### Web Project (Client-Side Only)

```bash
npm install @hyperfixi/core
```

Or use the Vite plugin for automatic optimization:

```bash
npm install @hyperfixi/core @hyperfixi/vite-plugin
```

### Multilingual Support

```bash
npm install @hyperfixi/core @hyperfixi/semantic @hyperfixi/i18n
```

### Server-Side Rendering

```bash
npm install @hyperfixi/core @hyperfixi/server-integration @hyperfixi/ssr-support
```

## Bundle Comparison

All packages provide multiple bundle options:

```
Full Bundle (224 KB)
├── hyperfixi-browser.js         # All features
├── hyperfixi-multilingual.js    # i18n support (250 KB)
└── hyperfixi-semantic.browser.global.js  # Semantic parser (61 KB)

Lite Bundles
├── hyperfixi-lite.js            # 1.9 KB - 8 commands
├── hyperfixi-lite-plus.js       # 2.6 KB - 14 commands
├── hyperfixi-hybrid-complete.js # 6.7 KB - 21+ commands
└── hyperfixi-hybrid-hx.js       # 9.7 KB - htmx compatibility
```
