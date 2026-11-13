# About HyperFixi

HyperFixi is a **hyperscript engine** with two additions:

1. **A typed, modular engine**: `@hyperfixi/engine` is a TypeScript port of upstream \_hyperscript, measured against upstream's own test suite (1,450 of 1,498 tests on 0.9.93). A bundle is the list of grammar modules you register: about 34 KB gzipped with all of them, 18 KB and up through the Vite plugin.
2. **Optional multilingual support**: Use hyperscript in 24 languages with native word order and grammar

The engine (`@hyperfixi/*`) works on its own. The multilingual features (`@lokascript/*`) are opt-in for projects that need them.

## Why Multilingual?

Hyperscript's readability is its key selling point. But that readability assumes you think in English. We explored what it would take to make `on click toggle .active` feel equally natural in Japanese, Arabic, or Korean.

**Approach**: Semantic role mapping. The parser identifies what each part represents (patient, destination, instrument, etc.), then generates language-specific output with proper word order:

- **English (SVO)**: `on click toggle .active`
- **Japanese (SOV)**: `クリック で .active を トグル`
- **Arabic (VSO)**: `بدّل .active عند النقر`

This requires language-specific patterns for each command. The multilingual packages are **fully optional** -- use core hyperscript without them, or load only the languages you need.

## About This Experiment

This project exists because LLM agents made it possible. I could not have built a 24-language semantic parser alone -- the linguistic knowledge required is beyond any individual. Ongoing maintenance will continue with LLM assistance.

The codebase is complex. The semantic role mapping, grammar transformations, and language-specific tokenizers add significant machinery compared to original hyperscript. Whether this complexity is worth the accessibility gains is an open question.

**Current gaps:**

- The engine follows upstream's grammar and adds two forms (`new X()`, `toggle <element>`); the tests of upstream's it does not pass are listed in `packages/engine/upstream-suite/known-failures.json`
- Bundle sizes are large for full multilingual support (about 90 to 260 KB for the semantic bundles)
- Language idioms are approximations, not yet verified by native speakers

## Current Status

The engine's status is its score on upstream's suite, above. The multilingual layer's is in [FIDELITY.md](./FIDELITY.md): what its gates measure, and what they do not.

**24 languages**: Arabic, Bengali, Chinese, English, French, German, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese

## Universal DSL Framework

Beyond hyperscript, the `@lokascript/framework` package lets you build **any multilingual DSL** using the same architecture. Define command schemas, add keyword translations, and get parsing in 24+ languages, MCP tools, and cross-language translation for free.

The **Explicit Syntax IR** is the universal interchange format:

```text
[toggle patient:.active destination:#button]   -- Hyperscript
[select patient:name source:users]             -- SQL
[ask patient:"summarize" source:#article]      -- LLM prompts
[given patient:#button condition:exists]        -- BDD tests
```

A family of domain DSLs is built on the framework — SQL, LLM prompts, Todo, BehaviorSpec, Flow and Voice — shipped from the [lokascript-domains](https://github.com/codetalcott/lokascript-domains) repo as the `@lokascript/domains` aggregate. See the [Explicit Syntax IR docs](../packages/framework/docs/EXPLICIT_SYNTAX_IR.md) and [Domain Author Guide](../packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) for details.

## MCP Server

The `mcp-server` package exposes HyperFixi tools to LLM agents via [Model Context Protocol](https://modelcontextprotocol.io). This enables AI assistants to validate hyperscript, suggest commands, translate between languages, and explain code -- useful for both development and ongoing maintenance.

## Migration

See [MIGRATION.md](../MIGRATION.md) for the steps between majors.
