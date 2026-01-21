# CLAUDE.md - Core Package

This file provides guidance for working with the `@lokascript/core` package.

## Package Purpose

Main hyperscript runtime, parser, and 43 command implementations. This is the primary package for LokaScript development.

## Essential Commands

```bash
# Quick validation (recommended after changes)
npm run test:quick --prefix packages/core           # Build + test (<10 sec)
npm run test:comprehensive --prefix packages/core   # Full browser suite

# Unit tests
npm test --prefix packages/core                     # Run vitest (2700+ tests)
npm test --prefix packages/core -- --run src/expressions/  # Test specific module

# Build
npm run build:browser --prefix packages/core        # Build browser bundle
npm run typecheck --prefix packages/core            # TypeScript validation

# Browser testing (Playwright)
cd packages/core && npx playwright test src/compatibility/
```

## Architecture

```
src/
├── parser/             # Hyperscript parser (~3000 lines)
│   ├── parser.ts       # Main parser with ParserContext
│   ├── commands/       # Command-specific parsers (pure functions)
│   └── ast-helpers.ts  # AST node builders
├── runtime/            # Execution engine
│   └── runtime.ts      # Main runtime (extends RuntimeBase)
├── commands/           # Command implementations (legacy)
├── commands-v2/        # Standalone command modules (tree-shakeable)
│   ├── toggle.ts       # Example: toggle command
│   └── index.ts        # Command registry
├── expressions/        # 6 expression categories
│   ├── references/     # me, you, it, CSS selectors
│   ├── logical/        # Comparisons, boolean logic
│   ├── conversion/     # as keyword, type conversion
│   ├── positional/     # first, last, array navigation
│   ├── properties/     # Possessive syntax
│   └── special/        # Literals, math operations
├── registry/           # Registry system
│   └── browser-types.ts
├── api/                # API v2 implementation
│   └── hyperscript-api.ts
└── multilingual/       # MultilingualHyperscript unified API
    ├── index.ts
    └── bridge.ts       # SemanticGrammarBridge
```

## Command Pattern

All 43 commands use `CommandImplementation<TInput, TOutput, TypedExecutionContext>`:

```typescript
// packages/core/src/commands-v2/increment.ts
export class IncrementCommand implements CommandImplementation<IncrementInput, void, TypedExecutionContext> {
  parseInput(node: CommandNode, ctx: TypedExecutionContext): IncrementInput { ... }
  async execute(input: IncrementInput, ctx: TypedExecutionContext): Promise<void> { ... }
}
```

## Adding a New Command

1. Create implementation in `src/commands-v2/{command}.ts`
2. Register in `src/commands-v2/index.ts`
3. Add parser support in `src/parser/commands/`
4. Write tests in `src/commands-v2/{command}.test.ts`

## API v2 (Recommended)

```javascript
import { hyperscript } from 'lokascript';

// Compile (sync)
const result = hyperscript.compileSync('toggle .active');

// Compile + execute
await hyperscript.eval('add .clicked to me', element);

// Validation
const validation = await hyperscript.validate('toggle .active');
```

See [docs/API.md](docs/API.md) for complete documentation.

## Important Files

| File                         | Purpose                        |
| ---------------------------- | ------------------------------ |
| `src/runtime/runtime.ts`     | Main runtime                   |
| `src/parser/parser.ts`       | Hyperscript parser             |
| `src/commands-v2/`           | All 43 command implementations |
| `src/registry/`              | Registry system                |
| `src/api/hyperscript-api.ts` | API v2 implementation          |
| `docs/API.md`                | API documentation              |
| `docs/EXAMPLES.md`           | HTML-first patterns            |

## Browser Bundles

| Bundle                          | Size   | Use Case                           |
| ------------------------------- | ------ | ---------------------------------- |
| `lokascript-lite.js`            | 8 KB   | Minimal (8 commands, regex parser) |
| `lokascript-hybrid-complete.js` | 28 KB  | Recommended (~85% coverage)        |
| `lokascript-browser.js`         | 912 KB | Everything                         |

## Custom Bundle Generation

```bash
cd packages/core

# Generate from command line
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --output src/my-bundle.ts

# Build with Rollup
npx rollup -c rollup.browser-custom.config.mjs
```

See [bundle-configs/README.md](bundle-configs/README.md) for full options.
