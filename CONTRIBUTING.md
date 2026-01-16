# Contributing to HyperFixi

Thank you for your interest in contributing to HyperFixi! This document provides guidelines and technical information for contributors.

## Build System Rationale

HyperFixi uses **different build tools for different packages** based on their specific needs.

| Package                 | Build Tool(s)                      | Rationale                                                                                                                                      |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **@hyperfixi/core**     | Rollup                             | Complex multi-bundle builds (9 browser bundles). Rollup provides fine-grained control over IIFE, UMD, ESM formats with excellent tree-shaking. |
| **@hyperfixi/semantic** | tsup (Node) + tsup IIFE (browser)  | Simple, fast builds. tsup's zero-config approach works well for straightforward needs.                                                         |
| **@hyperfixi/i18n**     | tsup (Node) + Rollup UMD (browser) | Hybrid: tsup for fast Node.js builds, Rollup UMD for browser compatibility.                                                                    |

**Why Not Standardize?** Each tool is optimized for its package's specific requirements. The inconsistency is deliberate and beneficial.

## Getting Started

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces

# Clean test outputs (coverage, reports)
npm run clean:test
```

## Adding a New Language

HyperFixi has two systems for multilingual support. Most contributions will use the semantic package.

### Semantic Parsing (Recommended)

The semantic package supports 23 languages with keyword-based parsing. Use the CLI to scaffold a new language:

```bash
cd packages/semantic

# Scaffold the language
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
```

**Options:**

- `--code`: ISO 639-1 language code (e.g., `es`, `ja`, `ar`)
- `--wordOrder`: `SVO`, `SOV`, or `VSO`
- `--direction`: `ltr` or `rtl`
- `--marking`: `preposition`, `postposition`, or `particle`
- `--usesSpaces`: `true` for space-delimited languages, `false` for CJK

**After scaffolding:**

1. Fill in keyword translations in `src/generators/profiles/{code}.ts`
2. For non-Latin scripts, add character classification in `src/tokenizers/{code}.ts`
3. Sync keywords to vite-plugin: `npm run sync-keywords --prefix packages/vite-plugin`
4. Run tests: `npm test --prefix packages/semantic`

### Grammar Transformation (i18n)

The i18n package supports 13 languages with word order transformation (SVO→SOV, SVO→VSO). This requires more work:

1. Create dictionary in `packages/i18n/src/dictionaries/{code}.ts`
2. Add language profile in `packages/i18n/src/grammar/profiles/index.ts`
3. Define markers (particles, prepositions) and word order rules
4. Export from `packages/i18n/src/dictionaries/index.ts`
5. Run tests: `npm test --prefix packages/i18n`

See existing dictionaries (e.g., `ja.ts`, `ar.ts`) for examples.

## Testing Requirements

- All new code must have tests
- Run `npm test --prefix packages/{package}` before submitting
- For language additions: test with real phrases, not just keyword swaps
- Verify both parsing and translation work correctly

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/add-language-xx`)
3. Make changes with comprehensive tests
4. Run `npm test --workspaces` to verify all tests pass
5. Submit PR with description of changes
6. For language contributions: include native speaker verification if possible

## Code Style

- TypeScript for all packages
- Use existing patterns in the codebase
- Keep functions focused and testable
- Document non-obvious logic with comments
