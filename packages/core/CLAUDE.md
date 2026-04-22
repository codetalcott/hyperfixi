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
├── commands/           # All command implementations (tree-shakeable factories)
│   ├── dom/            # toggle, add, remove, show, hide, put, make, empty, swap, morph
│   ├── execution/      # call, pseudo-command, focus, blur
│   ├── data/           # set, get, increment, decrement, default
│   ├── control-flow/   # if, unless, repeat, break, continue, halt, return, exit, throw
│   ├── async/          # wait, fetch
│   ├── events/         # send, trigger
│   ├── navigation/     # go, push-url, replace-url, scroll-to
│   ├── animation/      # transition, measure, settle, take
│   ├── utility/        # log, tell, copy, pick, beep
│   ├── advanced/       # js, async
│   ├── content/        # append
│   ├── templates/      # render
│   ├── behaviors/      # install
│   └── index.ts        # Named factory exports (tree-shakeable)
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

All commands use `CommandImplementation<TInput, TOutput, TypedExecutionContext>` via the `@command`/`@meta` decorators:

```typescript
// packages/core/src/commands/data/increment.ts
@meta({ description: '...', syntax: [...], examples: [...], sideEffects: [...] })
@command({ name: 'increment', category: 'data' })
export class IncrementCommand implements DecoratedCommand {
  async parseInput(raw, evaluator, context): Promise<IncrementInput> { ... }
  async execute(input: IncrementInput, ctx: TypedExecutionContext): Promise<void> { ... }
}

export const createIncrementCommand = createFactory(IncrementCommand);
```

## Adding a New Command

1. Create implementation in `src/commands/{category}/{name}.ts`
2. Export a named factory in `src/commands/index.ts` and add the command name to the `COMMANDS` set in `src/parser/parser-constants.ts`
3. Register the factory in the runtime entry points that need it (`src/runtime/runtime.ts` and any `src/compatibility/browser-bundle-*.ts` that should ship the command)
4. Add parser support in `src/parser/command-parsers/{category}-commands.ts` only if the command needs non-generic parsing — simple commands use the default identifier-plus-args path
5. For lite/hybrid bundle coverage, add cases to `src/bundle-generator/templates.ts`, `parser-templates.ts`, and `template-capabilities.ts`
6. Add reference/LSP entries in `src/reference/index.ts` and `src/lsp-metadata.ts`
7. Write tests in `src/commands/{category}/__tests__/{name}.test.ts`

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

| File                         | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `src/runtime/runtime.ts`     | Main runtime                              |
| `src/parser/parser.ts`       | Hyperscript parser                        |
| `src/commands/`              | All command implementations (by category) |
| `src/registry/`              | Registry system                           |
| `src/api/hyperscript-api.ts` | API v2 implementation                     |
| `docs/API.md`                | API documentation                         |
| `docs/EXAMPLES.md`           | HTML-first patterns                       |

## Browser Bundles

| Bundle                         | Size (gzip) | Use Case                           |
| ------------------------------ | ----------- | ---------------------------------- |
| `hyperfixi-lite.js`            | 1.9 KB      | Minimal (8 commands, regex parser) |
| `hyperfixi-hybrid-complete.js` | 7.2 KB      | Recommended (~85% coverage)        |
| `hyperfixi.js`                 | 200 KB      | Everything                         |

## Custom Bundle Generation

```bash
cd packages/core

# Generate from command line
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --output src/my-bundle.ts

# Build with Rollup
npx rollup -c rollup.browser-custom.config.mjs
```

See [bundle-configs/README.md](bundle-configs/README.md) for full options.
