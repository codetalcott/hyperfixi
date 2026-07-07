# CLAUDE.md - patterns-reference Package

This file provides guidance to Claude Code when working with the patterns-reference package.

## Package Overview

The `@hyperfixi/patterns-reference` package provides a queryable SQLite database for hyperscript patterns, multilingual translations, and LLM few-shot learning examples.

### Key Value Propositions

1. **For LokaScript Users**: Searchable pattern library with examples for all commands
2. **For Developers**: Clean API for querying patterns and translations
3. **For LLM Code Agents**: 212+ few-shot examples for hyperscript code generation

## Package Structure

```
packages/patterns-reference/
├── src/
│   ├── api/              # Pattern, translation, LLM query APIs
│   ├── adapters/         # LLM adapter for @lokascript/core integration
│   ├── database/         # SQLite connection management
│   ├── registry/         # Patterns provider for @lokascript/semantic
│   ├── sync/             # Sync stubs (actual logic in scripts/)
│   ├── types.ts          # Type definitions
│   ├── index.ts          # Main exports
│   └── semantic-bridge.ts # Bridge to @lokascript/semantic registry
├── scripts/
│   ├── init-db.ts        # Database initialization with 53 seed patterns
│   ├── sync-translations.ts # Generate translations for 24 languages
│   ├── seed-llm-examples.ts # Generate LLM few-shot examples
│   └── validate-all.ts   # Validate all patterns parse correctly
├── data/
│   └── patterns.db       # SQLite database (created by populate script)
└── package.json
```

## Essential Commands

```bash
# Full database setup (recommended)
npm run populate

# Individual steps
npm run db:init:force      # Initialize with 53 patterns
npm run sync:translations  # Generate 689 translations
npm run seed:llm           # Generate 212 LLM examples
npm run validate:fix       # Validate and update verified_parses

# Development
npm run typecheck          # TypeScript validation
npm run test:run           # Run vitest tests
npm run build              # Build package
```

## Database Contents

After running `npm run populate`:

| Table                | Rows  | Description                                    |
| -------------------- | ----- | ---------------------------------------------- |
| code_examples        | 164   | Patterns covering all hyperscript commands     |
| pattern_translations | 3,936 | 164 patterns × 24 languages                    |
| llm_examples         | ~600  | Few-shot examples with quality scores (varies) |

### Supported Languages (24)

| Word Order | Languages                                  |
| ---------- | ------------------------------------------ |
| SVO        | en, es, fr, pt, it, id, ms, sw, zh, vi, tl |
| SOV        | ja, ko, tr, qu, hi, bn                     |
| VSO        | ar                                         |
| V2         | de                                         |
| Other      | ru, uk, pl, th, he                         |

Languages are derived dynamically from `KNOWN_PROFILES` in
`@lokascript/semantic`; adding a profile there automatically picks up
in the next `npm run sync:translations`.

### Non-Translatable Patterns

5 patterns (`hx-live-attribute`, `hx-live-with-mutator`,
`sse-connect-swap`, `sse-multi-event`, `ws-connect-send`) are flagged
`translatable=0` because their `raw_code` is HTML markup — the
attribute names (`hx-live`, `sse-connect`, etc.) are language-agnostic
and resolved at runtime by vocab modules. `sync-translations.ts` emits
identity rows (raw English text) for these across all 24 languages.

## Integration Points

### 1. @lokascript/semantic Integration

The package provides patterns to the semantic registry:

```typescript
import { initializeSemanticIntegration } from '@hyperfixi/patterns-reference';

await initializeSemanticIntegration();
// Patterns now available in semantic parser
```

Key files:

- [semantic-bridge.ts](src/semantic-bridge.ts) - Bridge module
- [registry/patterns-provider.ts](src/registry/patterns-provider.ts) - Database provider

### 2. @lokascript/core Integration

The package provides a unified LLM adapter:

```typescript
import { findRelevantExamples, buildFewShotContextSync } from '@hyperfixi/patterns-reference';
```

Key files:

- [adapters/llm-adapter.ts](src/adapters/llm-adapter.ts) - Unified adapter
- Replaces deprecated [core/context/llm-examples-query.ts](../core/src/context/llm-examples-query.ts)

## Adding New Patterns

1. Edit `scripts/init-db.ts` - add to `SEED_EXAMPLES` array
2. Run `npm run populate` to regenerate database
3. Run `npm run validate:fix` to verify patterns

Pattern structure:

```typescript
{
  id: 'pattern-id',           // Unique kebab-case ID
  title: 'Pattern Title',      // Human-readable title
  raw_code: 'on click toggle .active',  // Hyperscript code
  description: 'Description of what this does',
  feature: 'class-manipulation',  // Category
}
```

## Adding New Languages

Languages are derived from `KNOWN_PROFILES` in `@lokascript/semantic`.
To add support here:

1. Add the language profile in `packages/semantic/src/generators/profiles/`
   and register it (see `packages/semantic/CLAUDE.md`).
2. Rebuild semantic: `npm run build --prefix packages/semantic`
3. Re-sync translations: `npm run sync:translations` (orphan-language
   rows from removed profiles are also deleted automatically).
4. Validate: `npm run validate:fix`

## CI/CD

GitHub Actions workflow at `.github/workflows/patterns-reference.yml`:

- Runs on changes to `packages/patterns-reference/**`
- Tests: typecheck, vitest, populate, validate
- Build: Creates dist artifacts

## Key Files Reference

| File                                                       | Purpose                           |
| ---------------------------------------------------------- | --------------------------------- |
| [src/index.ts](src/index.ts)                               | Main exports and factory function |
| [src/api/patterns.ts](src/api/patterns.ts)                 | Pattern query functions           |
| [src/api/translations.ts](src/api/translations.ts)         | Translation query functions       |
| [src/api/llm.ts](src/api/llm.ts)                           | LLM example query functions       |
| [src/adapters/llm-adapter.ts](src/adapters/llm-adapter.ts) | Unified LLM adapter               |
| [src/semantic-bridge.ts](src/semantic-bridge.ts)           | Semantic registry integration     |
| [scripts/init-db.ts](scripts/init-db.ts)                   | Database schema and seed data     |

## Testing

```bash
# Run all tests
npm run test:run

# Test files
src/api/patterns.test.ts      # 22 tests
src/api/llm.test.ts           # 16 tests
src/database/connection.test.ts # 11 tests
```

## DB freshness guard (provenance stamp)

`sync:translations` writes a `data/patterns.db.stamp` sidecar — a SHA-256 of the
**source** that determines the DB's content (the i18n + semantic `src` trees, the
seed `init-db.ts`, and `sync-translations.ts`). The multilingual `--regression` gate
checks it before comparing against the committed baseline:

- **stale** (source changed since the last sync) → the gate **refuses to run** and
  tells you to re-sync. This prevents the cross-branch "phantom regression" footgun:
  a `patterns.db` synced on one branch, then used on another, silently mis-compares
  against that branch's baseline.
- **unstamped** (DB predates the guard, e.g. a fresh checkout of the committed DB) →
  the gate warns once; re-sync to get a stamp.

The stamp is **local** (gitignored) — it records "what source produced _my_ DB". CI
re-syncs (`npm run populate`) before gating, so it always sees a fresh stamp.
Util: `src/sync/db-stamp.ts` (`writeDbStamp` / `checkDbStamp`).

## Common Issues

### Database not found

Run `npm run populate` to create the database.

### Validation failures

Check for unbalanced quotes/brackets in translations. Run `npm run validate --verbose` for details.

### TypeScript errors with @lokascript/semantic

The semantic-bridge.ts uses `as any` cast for dynamic imports since the semantic package may not have the latest types.
