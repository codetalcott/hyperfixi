# Architecture

HyperFixi is organized as a monorepo with two npm scopes:

- **`@hyperfixi/*`** -- Core engine: runtime, parser, commands, bundling, tooling
- **`@lokascript/*`** -- Multilingual layer: semantic parser and translator, per-language vocabulary, domain DSLs

Use `@hyperfixi/*` packages by default. Add `@lokascript/*` packages only if you need multilingual support.

## Package Map

```text
packages/
├── core/               # @hyperfixi/core — Hyperscript runtime, parser, 43 commands
│   ├── parser/         # AST parser (~3800 lines)
│   ├── runtime/        # Execution engine
│   ├── commands/       # Command implementations
│   └── commands-v2/    # Standalone command modules (tree-shakeable)
│
├── vite-plugin/        # @hyperfixi/vite-plugin — Zero-config Vite integration
│   ├── scanner/        # Hyperscript detection in HTML/Vue/Svelte/JSX
│   └── generator/      # Minimal bundle generation
│
├── behaviors/          # @hyperfixi/behaviors — Reusable behaviors (draggable, sortable, etc.)
├── mcp-server/         # @hyperfixi/mcp-server — MCP tools for LLM integration
├── patterns-reference/ # @hyperfixi/patterns-reference — Queryable patterns database
│
├── semantic/           # @lokascript/semantic — Semantic-first multilingual parsing (24 languages)
│   ├── tokenizers/     # 24 language-specific tokenizers
│   ├── patterns/       # Command pattern generation
│   └── parser/         # Semantic parser with confidence scoring
│
├── i18n/               # @lokascript/i18n — Per-language vocabulary (translation moved to semantic)
│   ├── dictionaries/   # Keyword dictionaries (24 languages)
│   └── grammar/        # Word-order profiles with markers
│
├── framework/          # @lokascript/framework — Generic DSL framework
│                       # (createMultilingualDSL, DomainRegistry, CrossDomainDispatcher)
│
├── compilation-service/# @lokascript/compilation-service — Multi-target codegen
├── hyperscript-adapter/# @lokascript/hyperscript-adapter — Plugin for original _hyperscript
├── language-server/    # @lokascript/language-server — LSP implementation (24 languages)
├── aot-compiler/       # @hyperfixi/aot-compiler — Ahead-of-time compiler
├── server-bridge/      # @hyperfixi/server-bridge — Server-side route extraction
│
├── language-server-hyperscript/ # @hyperscript-tools/language-server — LSP for original _hyperscript
├── multilingual-hyperscript/    # @hyperscript-tools/multilingual — Plugin for original _hyperscript
├── vscode-extension/            # VSCode extension for LokaScript
└── vscode-extension-hyperscript/# VSCode extension for original _hyperscript
```

## Bundle Tiers

**Prebuilt bundles** (script-tag users; Vite users let the plugin choose):

| Bundle                   | Size (gzip) | Use Case                                           |
| ------------------------ | ----------- | -------------------------------------------------- |
| hyperfixi-hs.js (engine) | ~34 KB      | Hyperscript only, every module, upstream's grammar |
| hyperfixi.js             | ~34 KB      | The same file, under `@hyperfixi/core`'s name      |

`hyperfixi-hs.js` is `@hyperfixi/engine`'s; since Phase C3 (C-R4b) `@hyperfixi/core` ships it as
`hyperfixi.js` too, for one major. Phase C3 retired every bundle core built itself
(`hyperfixi-hx-v4.js`, `hyperfixi-hx.js`, `hyperfixi-hybrid-complete.js`, then
`hyperfixi-multilingual.js`, `classic-i18n` and `modular` — non-English hyperscript runs on
`hyperfixi-hs.js` with `@lokascript/hyperscript-adapter` — and core's ~352 KB full
`hyperfixi.js`); the lite / lite-plus / minimal / standard names went in the 4.0 cycle.

**Semantic bundles** (optional, for multilingual support; gzipped, measured locally 2026-09-30):

| Bundle                                  | Size    | Languages              |
| --------------------------------------- | ------- | ---------------------- |
| browser-en.en.global.js                 | ~111 KB | English only           |
| browser-western.western.global.js       | ~128 KB | en, es, pt, fr, de, it |
| browser-east-asian.east-asian.global.js | ~106 KB | ja, zh, ko             |
| browser-priority.priority.global.js     | ~151 KB | 11 priority            |
| browser.global.js                       | ~260 KB | All 24 languages       |

See [packages/core/bundle-configs/README.md](../packages/core/bundle-configs/README.md) for custom bundle generation.

## Language-Specific Bundles

```bash
cd packages/semantic

# Preview size estimate
node scripts/generate-bundle.mjs --estimate ja ko zh

# Generate bundle for specific languages
node scripts/generate-bundle.mjs --auto es pt fr

# Use predefined groups: western, east-asian, priority
node scripts/generate-bundle.mjs --group western
```

## Usage Modes

### 1. CDN Script Tag (Simplest)

```html
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
<button _="on click toggle .active on me">Toggle</button>
```

### 2. Vite Plugin (Recommended for Production)

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';
export default { plugins: [hyperfixi()] };
```

### 3. Tree-Shakeable Imports

```typescript
import { createRuntime } from '@hyperfixi/core/runtime';
import { toggle, add, remove } from '@hyperfixi/core/commands';
import { references, logical } from '@hyperfixi/core/expressions';

const hyperscript = createRuntime({
  commands: [toggle, add, remove],
  expressions: [references, logical],
});
```

### 4. Multilingual (Optional)

```typescript
import { parse, translate } from '@hyperfixi/core/multilingual';

const node = await parse('クリック で .active を トグル', 'ja');
const english = await translate('クリック で .active を トグル', 'ja', 'en');
```

See [lokascript.org](https://lokascript.org) for multilingual documentation.
