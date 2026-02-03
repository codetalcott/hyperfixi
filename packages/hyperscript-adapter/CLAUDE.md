# CLAUDE.md — hyperscript-adapter

## What This Package Does

Adapter plugin that enables the **original \_hyperscript** runtime to accept hyperscript written in 24 languages. Works as a text preprocessor: intercepts `getScript()`, translates non-English input to English via `@lokascript/semantic`, then lets \_hyperscript parse normally.

## Structure

```
src/
├── index.ts              # Node.js entry — exports plugin, preprocess, types
├── browser.ts            # Browser IIFE entry — auto-registers with _hyperscript
├── browser-lite.ts       # Lite browser entry — expects external semantic global
├── plugin.ts             # _hyperscript.use() plugin factory + standalone preprocess()
├── slim-plugin.ts        # Slim plugin factory (imports from semantic/core)
├── preprocessor.ts       # Semantic translation with confidence gating (full)
├── slim-preprocessor.ts  # Slim preprocessor (imports from semantic/core + custom renderer)
├── hyperscript-renderer.ts  # Custom English renderer — no English lang data needed
├── language-resolver.ts  # Cascading lang detection (element → ancestor → document)
└── bundles/
    ├── shared.ts         # Shared setup: pattern generator wiring + auto-register
    ├── es.ts, ja.ts, …   # Per-language IIFE entries (10 languages)
    ├── western.ts        # Regional: es, pt, fr, de
    └── east-asian.ts     # Regional: ja, ko, zh
test/
├── preprocessor.test.ts       # 25 tests: 5 commands × 5 languages
├── slim-preprocessor.test.ts  # 8 tests: per-language bundle path integration
├── hyperscript-renderer.test.ts  # 36 tests: custom renderer unit tests
├── language-resolver.test.ts  # 8 tests: DOM attribute resolution
└── plugin.test.ts             # 10 tests: plugin registration and behavior
demo/
└── index.html            # Live demo with ES/JA/KO/ZH/FR examples
```

## Commands

```bash
npm run typecheck          # TypeScript validation
npm run test:run           # Vitest (87 tests, jsdom environment)
npm run build              # ESM + CJS + browser IIFE
```

## Key Design Decisions

- **Preprocessor, not AST mapping**: \_hyperscript AST nodes are closure objects tightly coupled to the parser — reproducing them from semantic data would mean reimplementing every command parser
- **Custom English renderer**: Per-language bundles use `hyperscript-renderer.ts` to render SemanticNodes to English \_hyperscript strings without needing English language data (tokenizer, profile, patterns), saving ~26 KB per bundle
- **Two preprocessor paths**: `preprocessor.ts` (full, imports `@lokascript/semantic`) for the all-language bundle; `slim-preprocessor.ts` (imports `@lokascript/semantic/core` + custom renderer) for per-language bundles
- **Confidence gating**: semantic analysis below threshold falls through to original text, avoiding bad translations
- **Per-language bundles**: 85-101 KB self-contained; full bundle ~568 KB

## Integration Point

The plugin overrides `runtime.getScript()` (\_hyperscript.js line 1809), which reads `_="..."` attributes and returns raw strings. The override translates non-English strings to English before they reach the lexer.
