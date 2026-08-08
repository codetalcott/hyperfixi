# About HyperFixi / LokaScript

This project is a **multilingual programming-language engine**. Its thesis: a
programming language's surface syntax can be genuinely native in 24 human
languages — real word order, case particles, agglutinative morphology — while
parsing to one semantic structure whose equivalence is _measured_, not assumed.

The engine is proven against a real workload: a complete, tree-shakeable
[\_hyperscript](https://hyperscript.org) runtime (`@hyperfixi/*`). Every
translation must survive parsing, structural comparison against the English
reference, and — for a curated subset — actual DOM execution. The multilingual
layer (`@lokascript/*`) is fully optional for users who just want the runtime.

## Why Multilingual?

Hyperscript's readability is its key selling point. But that readability assumes
you think in English. We built what it takes to make `on click toggle .active`
feel equally natural in Japanese, Arabic, or Korean.

**Approach**: Semantic role mapping. The parser identifies what each part
represents (patient, destination, instrument, etc.), then generates
language-specific output with proper word order:

- **English (SVO)**: `on click toggle .active`
- **Japanese (SOV)**: `クリック で .active を トグル`
- **Arabic (VSO)**: `بدّل .active عند النقر`

This requires language-specific patterns for each command. The multilingual
packages are **fully optional** — use core hyperscript without them, or load
only the languages you need.

## The design position

Earlier versions of this page called the complexity-for-accessibility trade an
open question. It is now a settled position:

**The complexity is the product, and it is held honest by measurement.** The
semantic role mapping, grammar transformations, and per-language tokenizers are
substantial machinery — and the reason they don't rot is the
[structural fidelity ratchet](./FIDELITY.md): eleven CI-gated signals
(recall, precision, multiset recall, role fidelity, value recall, execution
equivalence, canonical validity, per-pattern parse, …) that fail the build when
any language silently loses meaning. The committed baseline currently records
the full corpus **faithful (fidelity 1.0) in all 24 priority languages**, with
zero degenerate and zero lossy passes. The remaining headroom is thin,
role-level, and enumerated in the internal queue — not hand-waved.

**Known gaps, stated plainly:**

- Compatibility is one-way: official \_hyperscript code should work in
  HyperFixi, but HyperFixi's extended syntax (multilingual, flexible grammar)
  won't work in official \_hyperscript
- Bundle sizes are large for full multilingual support (regional subsets and
  the vite-plugin mitigate this)
- Language idioms are approximations, not yet verified by native speakers —
  the ratchet proves _structural_ fidelity, not idiomatic naturalness

## Current Status

Rounded counts — the authoritative numbers are whatever
`npm run test:check` and the committed baseline
(`packages/testing-framework/baselines/multilingual-priority.json`) report at
HEAD:

| Package                                           | Tests          | Status |
| ------------------------------------------------- | -------------- | ------ |
| [@hyperfixi/core](../packages/core)               | 8,100+ passing | Stable |
| [@lokascript/semantic](../packages/semantic)      | 6,500+ passing | Stable |
| [@lokascript/i18n](../packages/i18n)              | 900+ passing   | Stable |
| [@hyperfixi/vite-plugin](../packages/vite-plugin) | 160+ passing   | Stable |

**24 languages**: Arabic, Bengali, Chinese, English, French, German, Hebrew,
Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese,
Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian,
Vietnamese

## Universal DSL Framework

Beyond hyperscript, the `@lokascript/framework` package lets you build **any
multilingual DSL** using the same architecture. Define command schemas, add
keyword translations, and get parsing in 24+ languages, MCP tools, and
cross-language translation for free.

The **Explicit Syntax IR** is the universal interchange format:

```text
[toggle patient:.active destination:#button]   -- Hyperscript
[select patient:name source:users]             -- SQL
[ask patient:"summarize" source:#article]      -- LLM prompts
[given patient:#button condition:exists]        -- BDD tests
```

Nine domain packages are built on the framework today: SQL, BDD, BehaviorSpec,
JSX, LLM, Todo, Flow, Voice, and Learn. See the
[Explicit Syntax IR docs](../packages/framework/docs/EXPLICIT_SYNTAX_IR.md) and
[Domain Author Guide](../packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) for
details.

## About This Experiment

This project exists because LLM agents made it possible. I could not have built
a 24-language semantic parser alone — the linguistic knowledge required is
beyond any individual. Ongoing maintenance will continue with LLM assistance.

## MCP Server

The `mcp-server` package exposes HyperFixi tools to LLM agents via
[Model Context Protocol](https://modelcontextprotocol.io). This enables AI
assistants to validate hyperscript, suggest commands, translate between
languages, and explain code — useful for both development and ongoing
maintenance.

## Migration from v1.x

See [MIGRATION.md](../MIGRATION.md) for upgrading from `@lokascript/*` v1.x
packages.
