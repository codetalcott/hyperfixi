# Architecture

HyperFixi is organized as a monorepo with two npm scopes:

- **`@hyperfixi/*`** -- Core engine: runtime, parser, commands, bundling, tooling
- **`@lokascript/*`** -- Multilingual layer: semantic parser, grammar transformation, domain DSLs

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
├── i18n/               # @lokascript/i18n — Grammar transformation
│   ├── grammar/        # SOV/VSO word order transformation
│   └── profiles/       # Language profiles with markers
│
├── framework/          # @lokascript/framework — Generic DSL framework
│                       # (createMultilingualDSL, DomainRegistry, CrossDomainDispatcher)
│
├── compilation-service/# @lokascript/compilation-service — Multi-target codegen
├── hyperscript-adapter/# @lokascript/hyperscript-adapter — Plugin for original _hyperscript
├── language-server/    # @lokascript/language-server — LSP implementation (21 languages)
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

| Bundle                    | Size (gzip) | Use Case                                                           |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| hyperfixi-hx.js           | ~21.5 KB    | The small one: hybrid AST parser (~85% coverage) + htmx/fixi attrs |
| hyperfixi.js              | ~310 KB     | Everything: full parser, reactivity/realtime plugins, 24 languages |
| hyperfixi-hx-v4.js        | ~342 KB     | Separate product: htmx v4 (`hx-live`, `bind`, `when`, SSE, WS)     |
| hyperfixi-multilingual.js | ~91 KB      | Separate product: parser-free multilingual, pairs with semantic    |

`hyperfixi-hybrid-complete.js` is still built for the Vite plugin's generated
fallback (`@hyperfixi/core/browser/hybrid-complete`); the lite / lite-plus /
minimal / standard names were retired in the 4.0 cycle.

**Semantic bundles** (optional, for multilingual support):

| Bundle                                  | Size  | Languages          |
| --------------------------------------- | ----- | ------------------ |
| browser-en.en.global.js                 | 20 KB | English only       |
| browser-western.western.global.js       | 30 KB | en, es, pt, fr, de |
| browser-east-asian.east-asian.global.js | 24 KB | ja, zh, ko         |
| browser-priority.priority.global.js     | 48 KB | 11 priority        |
| browser.global.js                       | 90 KB | All 24 languages   |

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
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hx.js"></script>
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
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';

const ml = new MultilingualHyperscript();
await ml.initialize();
await ml.parse('クリック で .active を トグル', 'ja');
```

See [lokascript.org](https://lokascript.org) for multilingual documentation.
