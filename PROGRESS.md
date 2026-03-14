# Refactoring Progress

Tracking implementation of [parser-ecosystem-plan-v3.md](/Users/williamtalcott/projects/ideas/parser-ecosystem-plan-v3.md).

## Workflow

Each phase: implement → validate (typecheck + tests + bundle sizes) → commit → push → proceed to next phase.

## Phase 1: LSE as Canonical IR

- [x] 1.0 Dependency Spike — `df7d4b7d` (2026-03-14)
- [x] 1.1 Bridge LSE to Core Runtime — `179652e4` (2026-03-14)
- [x] 1.2 LSE Diagnostics — `3d3c4f03` (2026-03-14)
- [x] 1.3 LSE API Surface — `7fc62aea` (2026-03-14)

## Phase 2: Core Parser Improvements

- [x] 2.1 Tokenizer Migration — `c71b522c` (2026-03-14)
- [x] 2.2 Pratt Parser — `2211a82c` (2026-03-14)
- [x] 2.2b Expression Eval Consolidation — `976c9704` (2026-03-14)
- [x] 2.3 Resilient Parsing — `af760a80` (2026-03-14)
- [x] 2.4 ParserContext Slim-Down — `pending` (2026-03-14)

## Phase 3: Semantic Parser Improvements

- [ ] 3.1 Morphology Base
- [ ] 3.2 Pattern Consolidation
- [ ] 3.3 Confidence Model
- [ ] 3.4 Error Reporting

## Phase 4: Profile-Driven Pipeline

- [ ] 4.1 Profile Single Source
- [ ] 4.2 Asset Generation
- [ ] 4.3 Vite Plugin Language Selection

## Phase 5: Advanced Parser Integration

- [ ] 5.1 Nearley Language Detection
- [ ] 5.2 Chevrotain LSP

## Phase 6: Performance

- [ ] 6.1 Selective Memoization
- [ ] 6.2 Binding Power Tree-Shake

## Phase 7: Open the Doors

- [ ] 7.1 LSE Protocol Publication
- [ ] 7.2 Interactive Playground
- [ ] 7.3 Localized DX
- [ ] 7.4 Domain Creation Pipeline
- [ ] 7.5 LLM-Native LSE

## Blocked

- ~~2.3 Resilient Parsing → needs 1.2 (LSE Diagnostics)~~ ✅ unblocked
- ~~3.4 Error Reporting → needs 1.2 (LSE Diagnostics)~~ ✅ unblocked

## Decisions Log

- **2026-03-14 — Phase 1.0: Option A (peer dep + separate entry point)** — `@lokascript/framework` as optional peer dep with `@hyperfixi/core/lse` subpath. Imports from root `@lokascript/framework` (not subpaths) because core uses `moduleResolution: "node"`. Dynamic `import()` for zero bundle overhead.
