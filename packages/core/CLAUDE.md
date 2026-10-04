# CLAUDE.md - Core Package

This file provides guidance for working with the `@hyperfixi/core` package.

## Package Purpose

Main hyperscript runtime, parser, and 59 command implementations. This is the primary package for HyperFixi development.

## Essential Commands

```bash
# Quick validation (recommended after changes)
npm run test:quick --prefix packages/core           # Build + test (<10 sec)
npm run test:comprehensive --prefix packages/core   # Full browser suite

# Unit tests
npm test --prefix packages/core                     # Run vitest (7000+ tests)
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
└── multilingual/       # parse / render / translate / schemaRoleInferrer (on text)
    ├── index.ts
    └── bridge.ts       # the functions + SemanticGrammarBridge (core's direct path, until C6)
```

## Command Pattern

All commands implement `DecoratedCommand` via the `@command` decorator plus a type-visible `commandMeta` static:

```typescript
// packages/core/src/commands/data/increment.ts
@command({ name: 'increment' })
export class IncrementCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: '...', syntax: [...], examples: [...], sideEffects: [...], category: 'data',
  });
  get metadata() { return IncrementCommand.metadata; }
  declare readonly name: string;

  async parseInput(raw, evaluator, context): Promise<IncrementInput> { ... }
  async execute(input: IncrementInput, ctx: TypedExecutionContext): Promise<void> { ... }
}

export const createIncrementCommand = createFactory(IncrementCommand);
```

## Adding a New Command

> The list below is long because the command set is described in ~20
> hand-maintained places. That is a known structural defect with a staged fix —
> see `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md` before doing structural
> work here. Until then: **run `npm run verify:reference` locally before
> pushing.** It is the gate that catches the step you missed (it caught the
> `metadata.ts` counts during the `prepend` arc, #792).

1. Create implementation in `src/commands/{category}/{name}.ts`
2. Export a named factory in `src/commands/index.ts` and add the command name to the `COMMANDS` set in `src/parser/parser-constants.ts`
3. Register the factory in the runtime entry points that need it (`src/runtime/runtime.ts` and any `src/compatibility/browser-bundle-*.ts` that should ship the command)
4. Add parser support in `src/parser/command-parsers/{category}-commands.ts` only if the command needs non-generic parsing — simple commands use the default identifier-plus-args path
5. For custom-bundle coverage (`generate:bundle`, the `./bundle-generator` export), add cases to `src/bundle-generator/templates.ts` and `template-capabilities.ts`, then run `npm run generate:bundles` — the hybrid parser template is generated (parser rules go in `src/parser/hybrid/parser-core.ts`, never in `parser-templates.ts`'s generated region)
6. Add reference/LSP entries in `src/reference/index.ts` and `src/lsp-metadata.ts`
7. **No longer needed for the full-runtime counts** — `packageInfo.commands` and
   the `commandCount` of `browser` is derived from the
   manifest (`COMMAND_NAMES.length`) as of Arc A step 4.4, so adding a command
   updates them automatically. What you DO still update is any bundle you added
   the command to: each non-full bundle carries its own measured count, and
   `verify:reference` re-derives every one of them from the bundle source via
   `compatibility/bundle-sources.ts` (its `commands: [...]` array, its
   `createTreeShakeableRuntime` factory list, or the bundle it re-exports).
   Note `multilingual` is NOT a full-runtime bundle despite once claiming 59 —
   it hand-picks 52.
8. Write tests in `src/commands/{category}/__tests__/{name}.test.ts`
9. If the command should be available multilingually, sync `packages/semantic/`:
   - Add the action to the `ActionType` union in `packages/semantic/src/types.ts`
   - Add a schema (with `markerOverride` for any required keyword markers) to `packages/semantic/src/generators/command-schemas.ts` and append it to the `commandSchemas` registry
   - Add keyword entries (`primary`, optional `alternatives`, `normalized`) to all 24 language profiles in `packages/semantic/src/generators/profiles/*.ts`. Research each translation against `packages/i18n/src/dictionaries/` (which often already has it) and the existing profile's verb-form convention (infinitive vs. imperative vs. base). Avoid hyphens — many tokenizers split on them; prefer underscores for compounds.
   - Run `npm run sync-keywords --prefix packages/vite-plugin` to propagate keyword sets
   - Add tests in `packages/semantic/test/` — full role-extraction assertions for priority languages (en, es, ja, ar, ko) plus `canParse`-only smoke tests for the rest. SOV-language inputs (ja, ko, bn, hi, qu, tr) put roles before the verb (`<patient> url <verb>`); VSO/SVO put the verb first.

## API v2 (Recommended)

```javascript
import { hyperscript } from '@hyperfixi/core';

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

| Bundle                      | Size (gzip) | Use Case                                                 |
| --------------------------- | ----------- | -------------------------------------------------------- |
| `hyperfixi.js`              | ~352 KB     | Everything + bundled reactivity/realtime plugins         |
| `hyperfixi-multilingual.js` | ~93 KB      | Parser-free multilingual; pairs with the semantic bundle |

The script-tag bundle is the engine's `hyperfixi-hs.js` (`@hyperfixi/engine`), and Vite
projects use `@hyperfixi/vite-plugin` and never pick. Phase C3 retired core's small
prebuilts — `hyperfixi-hx-v4.js`, `hyperfixi-hx.js`, `hyperfixi-hybrid-complete.js` — and
`lite`, `lite-plus`, `minimal` and `standard` went as public names in the 4.0 cycle.

## Custom Bundle Generation

```bash
cd packages/core

# Generate from command line
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --output src/my-bundle.ts

# Build with Rollup
npx rollup -c rollup.browser-custom.config.mjs
```

See [bundle-configs/README.md](bundle-configs/README.md) for full options.

## htmx-compat layer (retired)

`src/htmx/` implemented an htmx + fixi attribute layer on core's runtime for `hyperfixi-hx.js`
and `hyperfixi-hx-v4.js`. It retired with them in Phase C3 (owner decision 2026-10-03): htmx 4 or
fixi run beside the engine instead, `hx-live` is the engine's `live` block, and localized
attribute names are `@lokascript/htmx-adapter`'s, whose package now holds the vocab modules and
their generator (see `packages/htmx-adapter/CLAUDE.md`). `examples/hx-v4-i18n/` and
`src/compatibility/browser-tests/i18n-htmx.spec.ts` cover that stack.
