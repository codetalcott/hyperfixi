# Contributing to HyperFixi

Thank you for your interest in contributing to HyperFixi! This document provides guidelines and technical information for contributors.

## Build System Rationale

HyperFixi uses **different build tools for different packages** based on their specific needs.

| Package                  | Build Tool(s)                      | Rationale                                                                                                                                      |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **@hyperfixi/core**      | Rollup                             | Complex multi-bundle builds (9 browser bundles). Rollup provides fine-grained control over IIFE, UMD, ESM formats with excellent tree-shaking. |
| **@lokascript/semantic** | tsup (Node) + tsup IIFE (browser)  | Simple, fast builds. tsup's zero-config approach works well for straightforward needs.                                                         |
| **@lokascript/i18n**     | tsup (Node) + Rollup UMD (browser) | Hybrid: tsup for fast Node.js builds, Rollup UMD for browser compatibility.                                                                    |

**Why Not Standardize?** Each tool is optimized for its package's specific requirements. The inconsistency is deliberate and beneficial.

## Getting Started

```bash
# Install dependencies
npm install

# Run the test gate — rebuilds any stale package first, then reports per package
npm run test:check

# Clean test outputs (coverage, reports)
npm run clean:test
```

`npm run build --workspaces` is **not** dependency-ordered — it builds in
`package.json` declaration order, so it fails on a cold tree. `test:check`
rebuilds what it needs; for a manual build of the multilingual stack use
`npm run test:multilingual:build-deps`.

## Improving an Existing Language

**[lokascript.org/community](https://lokascript.org/community/)** — Flag a bad
translation, fix vocabulary words, or apply as a language reviewer. Vocabulary is
best-effort for most languages, so native-speaker corrections are the
highest-value contribution we get. All you need is a GitHub account.

## Adding a New Language

Scaffold the new language with the CLI:

```bash
cd packages/semantic
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
```

| Option         | Values                                    |
| -------------- | ----------------------------------------- |
| `--code`       | ISO 639-1 (`es`, `ja`, `ar`)              |
| `--wordOrder`  | `SVO`, `SOV`, `VSO`                       |
| `--direction`  | `ltr`, `rtl`                              |
| `--marking`    | `preposition`, `postposition`, `particle` |
| `--usesSpaces` | `false` for CJK                           |

The CLI writes the semantic profile, the tokenizer, the i18n dictionary and the
vite-plugin keyword stub, registers all of them, and then **prints the remaining
steps**. Follow that output rather than a copy of it kept here — the copy is what
goes stale.

Two things it does not print:

- **Vocabulary consistency** is a required CI check that a new language will very
  likely trip:
  `cd packages/testing-framework && npx tsx src/vocab/cli.ts validate`
- **Native-speaker verification** — name your reviewer in the PR, or mark the
  vocabulary best-effort so it joins the community review queue above.

## Testing Requirements

- All new code must have tests
- Run `npm test --prefix packages/{package}` before submitting
- For language additions: test with real phrases, not just keyword swaps
- Verify both parsing and translation work correctly

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/add-language-xx`)
3. Make changes with comprehensive tests
4. Run `npm run test:check` to verify all tests pass
5. Submit PR with description of changes
6. For language contributions: include native speaker verification if possible

## Code Style

- TypeScript for all packages
- Use existing patterns in the codebase
- Keep functions focused and testable
- Document non-obvious logic with comments
