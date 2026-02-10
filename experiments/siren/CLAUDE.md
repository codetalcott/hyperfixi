# CLAUDE.md - @lokascript/siren

This file provides guidance for working with the `@lokascript/siren` package.

## Package Overview

Siren hypermedia plugin for LokaScript. Makes Siren API responses drive DOM behavior declaratively — the server's affordances (actions, links, entities) become the engine of UI state.

**66 tests** | **2 commands** | **1 context provider** | **1 behavior**

## Architecture

```
src/
├── index.ts                    # Barrel exports + auto-register for <script> usage
├── plugin.ts                   # Plugin wiring, fetch response type registration
├── types.ts                    # Siren type definitions (standalone, no deps)
├── siren-client.ts             # HTTP client, module-level singleton state
├── siren-context.ts            # Context provider (siren.* in hyperscript)
├── siren-agent.d.ts            # Ambient types for optional siren-agent dep
├── util.ts                     # resolveUrl, reconcileFields, classifyError
├── commands/
│   ├── follow.ts               # follow siren link <rel>
│   └── execute-action.ts       # execute siren action <name> [with <data>]
└── behaviors/
    └── siren-affordance.ts     # Show/hide based on available affordances

test/
├── siren-client.test.ts        # Client fetch, state, events
├── siren-context.test.ts       # Context provider accessors
├── commands.test.ts            # follow + execute commands
├── siren-affordance.test.ts    # Affordance behavior
├── util.test.ts                # Utility functions
└── plugin-sirenbin.test.ts     # SirenBin integration + plugin structure
```

## Essential Commands

```bash
# Run tests
npm test --prefix packages/siren

# Build
npm run build --prefix packages/siren

# Type-check
npm run typecheck --prefix packages/siren
```

## Key Design Decisions

### PluginShape local interface

`plugin.ts` defines a local `PluginShape` interface instead of importing `LokaScriptPlugin` from core. This avoids `TypedExecutionContext` constraints — the commands use `Record<string, unknown>` for loose context typing. At runtime, the registry accepts any object with `name`, `commands`, etc.

### Module-level singleton

`siren-client.ts` uses module-level `currentEntity` / `currentUrl` state. One entity at a time. The context provider reads this state lazily (getters, `cache: false`) so expressions always see the latest entity.

### Optional siren-agent probe

`plugin.ts` dynamically imports `siren-agent/siren-tools` at setup time. The probe is async (fire-and-forget), cached after first run. If siren-agent is not installed, the handler falls back to `response.json()`. The `_resetProbe()` export allows tests to clear the cached result.

### ASTNodeLike interfaces

Command files define minimal `ASTNodeLike` interfaces (`{ type?, name?, value? }`) instead of importing core AST types. This keeps the plugin loosely coupled to core internals.

### CustomEvents on document

All events (`siren:entity`, `siren:blocked`, `siren:error`) are dispatched as standard `CustomEvent` on `document`. LokaScript handles `on siren:entity` natively via DOM event listening — no formal EventSource needed.

## Build Dependencies

Core must be built first — the plugin imports `registerFetchResponseType` from `@lokascript/core/commands`. If core dist is stale, the siren package will fail to type-check.

```bash
# Rebuild core before siren if needed
npm run build:browser --prefix packages/core
npm run build --prefix packages/siren
```

## Testing

Tests use vitest with happy-dom. Mock `globalThis.fetch` for HTTP tests. The `resetClient()` and `_resetProbe()` helpers reset module-level state between tests.

```bash
# Run all tests
npm test --prefix packages/siren

# Single file
npm test --prefix packages/siren -- --run test/siren-client.test.ts
```

## Important Files

| File                                | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/plugin.ts`                     | Plugin entry point, fetch type registration, siren-agent probe |
| `src/siren-client.ts`               | HTTP client, state management, event dispatch                  |
| `src/siren-context.ts`              | `siren.*` context provider                                     |
| `src/types.ts`                      | Siren type definitions (standalone)                            |
| `src/commands/follow.ts`            | `follow siren link <rel>` command                              |
| `src/commands/execute-action.ts`    | `execute siren action <name>` command                          |
| `src/behaviors/siren-affordance.ts` | Affordance-driven element visibility                           |
| `src/siren-agent.d.ts`              | Ambient types for optional `siren-agent` dependency            |
