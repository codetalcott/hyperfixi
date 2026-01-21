# LokaScript

[![CI](https://github.com/codetalcott/lokascript/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/lokascript/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/lokascript/graph/badge.svg)](https://codecov.io/gh/codetalcott/lokascript)
[![npm version](https://img.shields.io/npm/v/@lokascript/core.svg)](https://www.npmjs.com/package/@lokascript/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

DOM scripting in Japanese, Korean, Arabic, Spanish—23 languages total.

A multilingual extension of [\_hyperscript](https://hyperscript.org) by Carson Gross et al.

## About This Project

This is an experiment in finding a path toward multiple hyperscript dialects—each supporting native idiomatic patterns for different languages. It's not intended to replace \_hyperscript, but to explore what multilingual scripting could look like.

Hyperscript's readability is its key selling point. But that readability assumes you think in English. This project asks: what if `on click toggle .active` could feel equally natural in Japanese, Arabic, or Korean?

One approach to internationalization would be to treat English hyperscript as the canonical language and others as translations from it. We're trying something different by parsing all languages into a common semantic representation. We think this can unlock hyperscript's strength for speakers of almost any language.

### Why Multilingual Hyperscript?

Three iterations to get here:

1. **Keyword translation**: `toggle` → `alternar` (Spanish), `トグル` (Japanese). Results read awkwardly—English grammar through foreign vocabulary.

2. **Grammar order transformation**: Languages structure differently—SVO (English), SOV (Japanese, Korean, Turkish), VSO (Arabic). Added transformations so `on click toggle .active` becomes `クリック で .active を トグル` with proper Japanese word order. Better, but still not idiomatic.

3. **Semantic role mapping**: Built a parser that identifies what each part of a command represents (agent, patient, instrument, etc.), then generates language-specific idiomatic output. This requires handwritten idiom support per language—practical only with LLM assistance or community contribution.

The result is more complex than original hyperscript. To keep bundle size reasonable, it's fully modular—load only the languages and commands you need.

## Current Status

| Package                                           | Tests        | Status |
| ------------------------------------------------- | ------------ | ------ |
| [@lokascript/core](./packages/core)               | 3316 passing | Stable |
| [@lokascript/semantic](./packages/semantic)       | 1984 passing | Stable |
| [@lokascript/i18n](./packages/i18n)               | 309 passing  | Stable |
| [@lokascript/vite-plugin](./packages/vite-plugin) | 163 passing  | Stable |

### Language Support

**23 languages**: Arabic, Bengali, Chinese, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese

### Bundle Sizes

The full bundle is large because it includes 23 language tokenizers, grammar transformation, and the complete AST parser. Most projects should use the hybrid bundle or vite-plugin for automatic tree-shaking.

| Bundle                        | Size   | Use Case                           |
| ----------------------------- | ------ | ---------------------------------- |
| lokascript-lite.js            | 8 KB   | Minimal (8 commands, regex parser) |
| lokascript-hybrid-complete.js | 28 KB  | Recommended (~85% coverage)        |
| lokascript-browser.js         | 912 KB | Everything (rarely needed)         |
| Semantic (English only)       | 84 KB  | Single-language parsing            |
| Semantic (all 23 languages)   | 260 KB | Full multilingual                  |

## Quick Start

### Browser (CDN)

```html
<script src="lokascript-hybrid-complete.js"></script>
<button _="on click toggle .active">Toggle</button>
```

### Vite Projects

```bash
npm install @lokascript/vite-plugin
```

```javascript
// vite.config.js
import { lokascript } from '@lokascript/vite-plugin';

export default {
  plugins: [lokascript()],
};
```

The plugin scans your files for `_="..."` attributes and generates a minimal bundle with only the commands you use.

### Multilingual Usage

```typescript
import { MultilingualHyperscript } from '@lokascript/core';

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

**[Full Documentation](https://lokascript.dev)** — guides, API reference, and cookbook

For LLM agents (Claude Code, etc.): see [CLAUDE.md](./CLAUDE.md) and package-level CLAUDE.md files.

## Architecture

```text
packages/
├── core/           # Hyperscript runtime, parser, 43 commands
│   ├── parser/     # AST parser (~3800 lines)
│   ├── runtime/    # Execution engine
│   └── commands/   # Command implementations
│
├── semantic/       # Semantic-first multilingual parsing
│   ├── tokenizers/ # 23 language-specific tokenizers
│   ├── patterns/   # Command pattern generation
│   └── parser/     # Semantic parser with confidence scoring
│
├── i18n/           # Grammar transformation
│   ├── grammar/    # SOV/VSO word order transformation
│   └── profiles/   # 13 language profiles with markers
│
├── vite-plugin/    # Zero-config Vite integration
│   ├── scanner/    # Hyperscript detection in HTML/Vue/Svelte/JSX
│   └── generator/  # Minimal bundle generation
│
└── mcp-server/     # Model Context Protocol server for LLM integration
```

### MCP Server

The `mcp-server` package exposes LokaScript tools to LLM agents via [Model Context Protocol](https://modelcontextprotocol.io). This enables AI assistants to validate hyperscript, suggest commands, translate between languages, and explain code—useful for both development and ongoing maintenance.

## Examples

Run locally:

```bash
# Start local server
npx http-server . -p 3000 -c-1

# Then visit:
# http://127.0.0.1:3000/examples/           # Gallery index
# http://127.0.0.1:3000/examples/multilingual/  # Multilingual demos
```

## Pattern Registry

The pattern registry documents all supported hyperscript patterns and their implementation status:

```bash
# View pattern coverage
node scripts/analysis/verify-patterns-coverage.mjs

# Analyze all patterns
node scripts/analysis/analyze-all-patterns.mjs
```

Registry location: [scripts/analysis/patterns-registry.mjs](scripts/analysis/patterns-registry.mjs)

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
| `browser.global.js`                       | 61 KB | All 13 languages   |

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

## About This Experiment

This project exists because LLM agents made it possible. I could not have built a 23-language semantic parser alone—the linguistic knowledge required is beyond any individual. Ongoing maintenance will continue with LLM assistance.

The codebase is complex. The semantic role mapping, grammar transformations, and language-specific tokenizers add significant machinery compared to original hyperscript. Whether this complexity is worth the accessibility gains is an open question.

**Current gaps:**

- Compatibility is one-way: official \_hyperscript code should work in LokaScript, but LokaScript's extended syntax (multilingual, flexible grammar) won't work in official \_hyperscript
- Bundle sizes are large for full multilingual support
- Language idioms are approximations, not yet verified by native speakers

## Contributing

This project is in early stages. If you're interested in contributing language support or have feedback, open an issue.

## License

MIT
