# About HyperFixi

HyperFixi is a **fully-featured hyperscript implementation** with two key additions:

1. **Modern architecture**: Tree-shakeable modules, TypeScript types, and configurable bundles (2 KB - 200 KB)
2. **Optional multilingual support**: Use hyperscript in 24 languages with native word order and grammar

The core engine (`@hyperfixi/*`) is a complete hyperscript runtime and parser that works independently. The multilingual features (`@lokascript/*`) are opt-in for projects that need them.

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

- Compatibility is one-way: official \_hyperscript code should work in HyperFixi, but HyperFixi's extended syntax (multilingual, flexible grammar) won't work in official \_hyperscript
- Bundle sizes are large for full multilingual support
- Language idioms are approximations, not yet verified by native speakers

## Current Status

| Package                                           | Tests        | Status |
| ------------------------------------------------- | ------------ | ------ |
| [@hyperfixi/core](../packages/core)               | 5700 passing | Stable |
| [@lokascript/semantic](../packages/semantic)      | 3553 passing | Stable |
| [@lokascript/i18n](../packages/i18n)              | 470 passing  | Stable |
| [@hyperfixi/vite-plugin](../packages/vite-plugin) | 163 passing  | Stable |

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

Six domain packages are built on the framework today: SQL, BDD, LLM, Todo, JSX, and BehaviorSpec. See the [Explicit Syntax IR docs](../packages/framework/docs/EXPLICIT_SYNTAX_IR.md) and [Domain Author Guide](../packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) for details.

## MCP Server

The `mcp-server` package exposes HyperFixi tools to LLM agents via [Model Context Protocol](https://modelcontextprotocol.io). This enables AI assistants to validate hyperscript, suggest commands, translate between languages, and explain code -- useful for both development and ongoing maintenance.

## Migration from v1.x

See [MIGRATION.md](../MIGRATION.md) for upgrading from `@lokascript/*` v1.x packages.
