# Refactoring Progress

Tracking implementation of [parser-ecosystem-plan-v3.md](/Users/williamtalcott/projects/ideas/parser-ecosystem-plan-v3.md).

## Phase 1: LSE as Canonical IR

- [ ] 1.0 Dependency Spike
- [ ] 1.1 Bridge LSE to Core Runtime
- [ ] 1.2 LSE Diagnostics
- [ ] 1.3 LSE API Surface

## Phase 2: Core Parser Improvements

- [ ] 2.1 Tokenizer Migration
- [ ] 2.2 Pratt Parser
- [ ] 2.2b Expression Eval Consolidation
- [ ] 2.3 Resilient Parsing
- [ ] 2.4 ParserContext Slim-Down

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

- 2.3 Resilient Parsing → needs 1.2 (LSE Diagnostics)
- 3.4 Error Reporting → needs 1.2 (LSE Diagnostics)

## Decisions Log

(key decisions made during implementation, with date and rationale)
