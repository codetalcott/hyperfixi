# HyperFixi

[![CI](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/hyperfixi/graph/badge.svg)](https://codecov.io/gh/codetalcott/hyperfixi)
[![npm version](https://img.shields.io/npm/v/@hyperfixi/core.svg)](https://www.npmjs.com/package/@hyperfixi/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modular, tree-shakeable implementation of [\_hyperscript](https://hyperscript.org) with optional multilingual support.

**Use it as:**

- **Pure hyperscript** - Fully typed, tree-shakeable, 2-200 KB bundles
- **With multilingual** - DOM scripting in Japanese, Korean, Arabic, Spanish, and 19 other languages

## About This Project

HyperFixi is a **fully-featured hyperscript implementation** with two key additions:

1. **Modern architecture**: Tree-shakeable modules, TypeScript types, and configurable bundles (2 KB - 200 KB)
2. **Optional multilingual support**: Use hyperscript in 24 languages with native word order and grammar

The core engine (`@hyperfixi/*`) is a complete hyperscript runtime and parser that works independently. The multilingual features (`@lokascript/*`) are opt-in for projects that need them.

### Why Multilingual?

Hyperscript's readability is its key selling point. But that readability assumes you think in English. We explored what it would take to make `on click toggle .active` feel equally natural in Japanese, Arabic, or Korean.

**Approach**: Semantic role mapping. The parser identifies what each part represents (patient, destination, instrument, etc.), then generates language-specific output with proper word order:

- **English (SVO)**: `on click toggle .active`
- **Japanese (SOV)**: `クリック で .active を トグル`
- **Arabic (VSO)**: `بدّل .active عند النقر`

This requires language-specific patterns for each command. The multilingual packages are **fully optional**—use core hyperscript without them, or load only the languages you need.

## Current Status

| Package                                          | Tests        | Status |
| ------------------------------------------------ | ------------ | ------ |
| [@hyperfixi/core](./packages/core)               | 5700 passing | Stable |
| [@lokascript/semantic](./packages/semantic)      | 3553 passing | Stable |
| [@lokascript/i18n](./packages/i18n)              | 470 passing  | Stable |
| [@hyperfixi/vite-plugin](./packages/vite-plugin) | 163 passing  | Stable |

### Language Support

**24 languages**: Arabic, Bengali, Chinese, English, French, German, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese

### Bundle Sizes

**Core bundles** (pure hyperscript, no multilingual):

| Bundle                       | Size (gzip) | Use Case                                    |
| ---------------------------- | ----------- | ------------------------------------------- |
| hyperfixi-lite.js            | 1.9 KB      | Minimal (8 commands, regex parser)          |
| hyperfixi-hybrid-complete.js | 7.2 KB      | **Recommended** (~85% hyperscript coverage) |
| hyperfixi-minimal.js         | 63 KB       | Full parser + 30 commands                   |
| hyperfixi.js                 | 200 KB      | Everything (all 47 commands)                |

**Semantic bundles** (optional, for multilingual support):

| Bundle                      | Size  | Use Case                                |
| --------------------------- | ----- | --------------------------------------- |
| Semantic (English only)     | 20 KB | Multilingual parsing (English only)     |
| Semantic (all 24 languages) | 90 KB | Multilingual parsing (all 24 languages) |

**Most projects should use:**

- **Browser/CDN**: `hyperfixi-hybrid-complete.js` (7.2 KB gzipped)
- **Vite/bundler**: `@hyperfixi/vite-plugin` for automatic tree-shaking
- **Node.js**: Import specific commands/expressions for optimal tree-shaking

## Quick Start

### Browser (CDN)

```html
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hybrid-complete.js"></script>
<button _="on click toggle .active">Toggle</button>
```

### Vite Projects

```bash
npm install @hyperfixi/vite-plugin
```

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

The plugin scans your files for `_="..."` attributes and generates a minimal bundle with only the commands you use.

## Universal DSL Framework

Beyond hyperscript, the `@lokascript/framework` package lets you build **any multilingual DSL** using the same architecture. Define command schemas, add keyword translations, and get parsing in 24+ languages, MCP tools, and cross-language translation for free.

The **Explicit Syntax IR** is the universal interchange format:

```text
[toggle patient:.active destination:#button]   -- Hyperscript
[select patient:name source:users]             -- SQL
[ask patient:"summarize" source:#article]      -- LLM prompts
[given patient:#button condition:exists]        -- BDD tests
```

Six domain packages are built on the framework today: SQL, BDD, LLM, Todo, JSX, and BehaviorSpec. See the [Explicit Syntax IR docs](./packages/framework/docs/EXPLICIT_SYNTAX_IR.md) and [Domain Author Guide](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) for details.

## Usage Modes

HyperFixi can be used in three ways:

### 1. Standalone Hyperscript (No Multilingual)

Pure hyperscript with full TypeScript types and tree-shakeable architecture:

```typescript
import { hyperscript } from '@hyperfixi/core';

// V2 API - clean, typed
const result = hyperscript.compileSync('toggle .active');
await hyperscript.eval('toggle .active', element);
```

**Tree-shakeable**: Import only what you need:

```typescript
import { createRuntime } from '@hyperfixi/core/runtime';
import { toggle, add, remove } from '@hyperfixi/core/commands';
import { references, logical } from '@hyperfixi/core/expressions';

const hyperscript = createRuntime({
  commands: [toggle, add, remove],
  expressions: [references, logical],
});

await hyperscript.run('toggle .active', element);
```

### 2. Vite Plugin (Auto Tree-Shaking)

The plugin scans your files and generates minimal bundles automatically:

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

### 3. Multilingual (Optional)

Add support for 24 languages when needed:

```typescript
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse from any supported language
await ml.parse('#button の .active を 切り替え', 'ja'); // Japanese
await ml.parse('토글 .active', 'ko'); // Korean
await ml.parse('alternar .active', 'es'); // Spanish

// Translate between languages
const arabic = await ml.translate('toggle .active', 'en', 'ar');
```

## Documentation

**[Full Documentation](https://github.com/codetalcott/hyperfixi#readme)** — guides, API reference, and cookbook

For LLM agents (Claude Code, etc.): see [CLAUDE.md](./CLAUDE.md) and package-level CLAUDE.md files.

## Architecture

```text
packages/
├── core/           # @hyperfixi/core — Hyperscript runtime, parser, 47 commands
│   ├── parser/     # AST parser (~3800 lines)
│   ├── runtime/    # Execution engine
│   └── commands/   # Command implementations
│
├── semantic/       # @lokascript/semantic — Semantic-first multilingual parsing
│   ├── tokenizers/ # 24 language-specific tokenizers
│   ├── patterns/   # Command pattern generation
│   └── parser/     # Semantic parser with confidence scoring
│
├── i18n/           # @lokascript/i18n — Grammar transformation
│   ├── grammar/    # SOV/VSO word order transformation
│   └── profiles/   # Language profiles with markers
│
├── vite-plugin/    # @hyperfixi/vite-plugin — Zero-config Vite integration
│   ├── scanner/    # Hyperscript detection in HTML/Vue/Svelte/JSX
│   └── generator/  # Minimal bundle generation
│
└── mcp-server/     # @lokascript/mcp-server — Model Context Protocol for LLM integration
```

### MCP Server

The `mcp-server` package exposes HyperFixi tools to LLM agents via [Model Context Protocol](https://modelcontextprotocol.io). This enables AI assistants to validate hyperscript, suggest commands, translate between languages, and explain code—useful for both development and ongoing maintenance.

## Examples

Run locally:

```bash
# Start local server
npx http-server . -p 3000 -c-1

# Then visit:
# http://127.0.0.1:3000/examples/           # Gallery index
# http://127.0.0.1:3000/examples/multilingual/  # Multilingual demos
```

## Language-Specific Bundles

### Semantic Parser (Regional Bundles)

Load only the languages you need:

```bash
cd packages/semantic

# Preview size estimate
node scripts/generate-bundle.mjs --estimate ja ko zh

# Generate bundle for specific languages
node scripts/generate-bundle.mjs --auto es pt fr

# Use predefined groups: western, east-asian, priority
node scripts/generate-bundle.mjs --group western
```

Pre-built regional bundles in `packages/semantic/dist/`:

| Bundle                                    | Size  | Languages          |
| ----------------------------------------- | ----- | ------------------ |
| `browser-en.en.global.js`                 | 20 KB | English only       |
| `browser-western.western.global.js`       | 30 KB | en, es, pt, fr, de |
| `browser-east-asian.east-asian.global.js` | 24 KB | ja, zh, ko         |
| `browser.global.js`                       | 90 KB | All 24 languages   |

### Core (Custom Command Bundles)

Generate bundles with only the commands you need:

```bash
cd packages/core

# Generate from command line
npm run generate:bundle -- --commands toggle,add,remove --output dist/my-bundle.ts

# Include blocks and positional expressions
npm run generate:bundle -- --commands toggle,set --blocks if,repeat --positional --output dist/my-bundle.ts

# Build with Rollup
npx rollup -c rollup.browser-custom.config.mjs
```

See [packages/core/bundle-configs/README.md](packages/core/bundle-configs/README.md) for full options.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test --prefix packages/core      # Core tests
npm test --prefix packages/semantic  # Semantic parser tests

# Build
npm run build:browser --prefix packages/core

# Start dev server
npm run dev  # Serves at http://127.0.0.1:3000
```

### Adding Language Support

```bash
# Scaffold a new language in the semantic package
cd packages/semantic
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr
```

Then fill in keyword translations in `src/generators/profiles/{code}.ts`.

## Migration from v1.x

See [MIGRATION.md](./MIGRATION.md) for upgrading from `@lokascript/*` v1.x packages.

## About This Experiment

This project exists because LLM agents made it possible. I could not have built a 24-language semantic parser alone—the linguistic knowledge required is beyond any individual. Ongoing maintenance will continue with LLM assistance.

The codebase is complex. The semantic role mapping, grammar transformations, and language-specific tokenizers add significant machinery compared to original hyperscript. Whether this complexity is worth the accessibility gains is an open question.

**Current gaps:**

- Compatibility is one-way: official \_hyperscript code should work in HyperFixi, but HyperFixi's extended syntax (multilingual, flexible grammar) won't work in official \_hyperscript
- Bundle sizes are large for full multilingual support
- Language idioms are approximations, not yet verified by native speakers

## Contributing

This project is in early stages. If you're interested in contributing language support or have feedback, open an issue.

## License

MIT
