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
npm run sync:translations  # Regenerate every foreign row (semantic renderer)

# There is ONE renderer: @lokascript/semantic's render(parse_en(en), L). The
# `PATTERNS_RENDERER` env, the `--renderer` flag and the three modes
# (i18n | semantic | best) were retired with @lokascript/i18n's GrammarTransformer
# on 2026-08-28, after the `i18n-kept-rows` baseline they existed to burn down
# reached zero. A row the renderer cannot render keeps its ENGLISH and is reported
# as an "English fallback" at the end of the run — that count must stay 0.
npm run seed:llm           # Generate 212 LLM examples
npm run validate           # Structural checks (read-only; verified_parses is measured by sync)
npm run verify:engines     # Re-verify the engine column (see below)

# Development
npm run typecheck          # TypeScript validation
npm run test:run           # Run vitest tests
npm run build              # Build package
```

## Engine verification (`code_examples.engine`)

The `engine` column ('both' | 'lokascript' | 'hyperscript' | NULL) is filled
**mechanically** by [scripts/verify-engines.ts](scripts/verify-engines.ts),
which runs every pattern's en `raw_code` against both engines:

Each engine runs with its official extensions:

- **lokascript** — `compileSync()` via `@hyperfixi/core` (the exact call the
  browser `_=` attribute path makes) with `@hyperfixi/reactivity` and
  `@hyperfixi/realtime` (both pre-installed in `hyperfixi.js`) and
  `@hyperfixi/components` installed, plus a jsdom top-level install smoke
  (synthesized `#id`/`.class` fixtures; no rejection within 500 ms and nothing
  logged in the 50 ms after, when `live`/`when` first runs happen; then torn
  down so no effect outlives its pattern).
- **hyperscript** — upstream `_hyperscript` (pinned `hyperscript.org`
  devDependency) with its official socket/worker/eventsource/component
  extensions; parse-level for plain sources: zero recovered parse errors.
- **HTML-markup patterns** — every `_=`/`hx-live`/script-tag source,
  including those inside component template bodies, is verified on both
  legs. Template components are RENDERED on both legs and must show what
  `COMPONENT_FIXTURES` declares (upstream reads `attrs.X` as an expression,
  `@hyperfixi/components` as a raw string, so `component-with-attrs` parses on
  both and renders on one). `hx-live`/`sse-*`/`ws-*` markup is hyperfixi-only
  (blocks the upstream claim) and earns lokascript credit only by running in
  `dist/hyperfixi-hx-v4.js` in an isolated jsdom: each `sse-swap` event must
  land in its `hx-target`, each `ws-send` form must reach the socket, each
  `hx-live` element must re-render. A row with no source earns no credit.
- Every one of those checks has been shown to redden its row under a mutation
  (2026-09-25); keep it that way when changing the harness.

Results are written to `data/engine-verification.json` (committed;
`init-db.ts` seeds the column from it, so `npm run populate` needs no core
build) and, with `--update-db`, stamped into `data/patterns.db` directly
(this also refreshes `patterns.db.stamp`, since the JSON is a stamped DB
input). The harness reads its rows from `SEED_EXAMPLES` (the source), not
from the DB. Re-run after parser/plugin changes, and after adding or editing
a pattern:

```bash
npm run verify:engines --prefix packages/patterns-reference        # regenerate + stamp the DB
npm run verify:engines:check --prefix packages/patterns-reference  # compare only (what CI runs)
```

- **Gated.** CI's `browser-tests` job runs `verify:engines:check`: it fails
  when any committed verdict no longer reproduces, a pattern has no verdict,
  a verdict names a deleted pattern, or the `engines` map contradicts its own
  `details` (a hand edit). It compares verdicts only — error text and
  versions are informational — so a parser-message tweak or a release bump
  never reddens an unrelated PR. The gate exists because the JSON once sat a
  month stale (generated before #1026, when core still discarded input
  silently) and over-claimed 10 rows.
- **Refuses stale builds** (exit 2) when core/reactivity/realtime/components
  have `src/` newer than `dist/`, or `core/dist/hyperfixi-hx-v4.js` is older
  than the source it bundles: a stale build verifies code that differs from
  the checkout. `npm run check:fresh` rebuilds the packages;
  `npm run build:browser:hybrid-hx-v4 --prefix packages/core` the bundle.
- **The JSON is the only source of the engine column.** Seeds carry no
  `engine` field; a pattern missing from the JSON is stored as NULL
  ("Unverified") and `init-db` warns. (The old heuristic
  `verify-engine-compat.ts`, which guessed 'both' from semantic canParse +
  extension-syntax scans, was removed in favor of this harness.)

## Database Contents

After running `npm run populate`:

| Table                | Rows  | Description                                    |
| -------------------- | ----- | ---------------------------------------------- |
| code_examples        | 166   | Patterns covering all hyperscript commands     |
| pattern_translations | 3,984 | 166 patterns × 24 languages                    |
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

1. Edit `scripts/init-db.ts` - add to `SEED_EXAMPLES` array (no `engine`
   field — verdicts come only from the harness)
2. Run `npm run populate` to regenerate database
3. Run `npm run verify:engines` and commit `data/engine-verification.json` —
   CI's `verify:engines:check` fails on a pattern with no committed verdict
4. Run `npm run validate` for the structural checks

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
4. Validate: `npm run validate`

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
