# New Directions: Semantic + AOT Compiler

1. Cross-Framework Code Generation

The semantic layer captures intent (what to do, to what, where), not syntax. Instead of only compiling to vanilla JS event handlers, the same semantic nodes could compile to:

React hooks — [toggle patient:.active destination:#btn] → useState + className toggle
Vue composables — semantic roles → reactive refs + template bindings
Svelte actions — use:toggle directives generated from semantic nodes
Alpine.js — x-on:click directives with x-bind:class
Web Components — self-contained custom elements with shadow DOM
The key insight: semantic roles map cleanly to framework idioms because they describe what not how. A patient role of .active always means "the thing being toggled" — the codegen just changes whether that's classList.toggle(), a React state update, or a Svelte class directive.

Effort: Medium-high. New codegen backends per framework, but the adapter/interchange architecture already supports pluggable code generators.

1. LLM-Optimized Behavior Synthesis

LLMs are notoriously bad at generating correct syntax but good at structured output. The explicit syntax [toggle patient:.active destination:#btn] is trivially reliable for LLM generation — it's just labeled JSON-like roles.

Pipeline:

User prompt (any language)
→ LLM outputs explicit syntax / semantic JSON
→ Semantic parser validates (schema + role checks)
→ AOT compiler produces optimized JS
This is not a wrapper around an LLM — it's using the semantic layer as a validation and normalization gateway for LLM output, with the AOT compiler as the final production step. The 45 command schemas with required/optional role definitions are basically a type system for LLM output.

Effort: Low-medium. The explicit syntax parser and schemas already exist. Need a thin integration layer.

1. Behavior-Level Test Generation

Semantic roles tell you exactly what a behavior does and what the expected state transitions are:

Semantic: toggle patient:.active destination:#btn trigger:click
From this, you can mechanically generate:

Click #btn → assert .active is present
Click #btn again → assert .active is absent
Assert no other classes changed
Assert only #btn was affected (not other elements)
The AOT compiler already does static analysis (variables, selectors, control flow). Combined with semantic roles, you get automatic behavioral test suites from hyperscript source — no human test writing needed for standard patterns.

Effort: Medium. New codegen target that emits Playwright/Testing Library assertions instead of event handlers.

1. Progressive Enhancement Compiler

Semantic roles are rich enough to generate both JS-enhanced behavior and no-JS HTML fallbacks:

Semantic JS Output No-JS Fallback
[go destination:/page] location.href = '/page' <a href="/page">
[put source:input destination:#target] target.textContent = input.value <form action="..." method="POST">
[toggle patient:.visible destination:#panel] classList.toggle('visible') <details><summary>
[fetch source:/api destination:#list] fetch() + DOM update Server-rendered content
The AOT compiler emits both layers. The semantic layer provides the intent mapping that makes the no-JS translation possible — you can't derive <details> from classList.toggle(), but you can derive it from [toggle visibility of panel].

Effort: Medium. New codegen pass that emits HTML alongside JS.

1. Semantic Diffing & Behavioral Migration
   Two hyperscript snippets that look different might do the same thing:

# English

on click toggle .active on #menu

# Japanese

# menu の .active を クリック で 切り替え

# Refactored English

on click add .active to #menu if #menu does not match .active
otherwise remove .active from #menu
Semantic parsing normalizes all three to the same semantic representation. This enables:

Behavioral diff: PR review shows "no semantic change" even when syntax changed
Migration assistant: Convert hyperscript → framework code by going through semantic layer
Dead behavior detection: Find redundant/conflicting handlers across a codebase
Codebase-wide refactoring: Rename semantic patterns, not string patterns
Effort: Low-medium for diffing. The semantic nodes are already comparable. Migration to frameworks builds on direction #1.

1. Edge/Worker Compilation Service

Semantic parsing + AOT compilation is fast enough for edge deployment:

Request: POST /compile
Body: { code: "トグル .active", language: "ja" }

Response: {
js: "el.classList.toggle('active')",
confidence: 0.98,
helpers: [],
size: "42 bytes"
}
Use cases:

CMS/no-code platforms: Users write hyperscript in their language, edge compiles to JS on save
CDN-level compilation: Serve pre-compiled JS, fallback to runtime parser only if AOT fails
Dynamic theming: Compile user-customized behaviors at the edge per tenant
The confidence score is the key differentiator — the service can reject low-confidence parses and return helpful error messages using the schema validation.

Effort: Low. Both packages already work in Node. Need HTTP wrapper + caching layer.

1. Multi-Target Compilation (Beyond DOM)

The semantic layer is inherently target-agnostic — [toggle patient:.active] doesn't say anything about the DOM. New AOT codegen backends could target:

Target Patient .active becomes Destination #btn becomes
DOM classList.toggle('active') querySelector('#btn')
React Native setStyle({ active: !active }) ref.current
Terminal (Ink) Toggle ANSI style code Component ref
Game engine Toggle entity component Entity query
State machine Toggle state flag State node
This is the most ambitious direction but also the most transformative — it turns hyperscript from a DOM scripting language into a universal behavior description language.

Effort: High per target, but architecture supports it cleanly.

## Which to pursue?

The directions cluster by effort and impact:

Quick wins Medium investment Ambitious

# 2 LLM synthesis #3 Test generation #1 Cross-framework

# 6 Edge compilation #4 Progressive enhancement #7 Multi-target

# 5 Semantic diffing

The quick wins leverage existing infrastructure almost directly.

## The chain

LLM Synthesis (#2)
└─► Edge Service (#6) ← packages #2 as deployable
└─► Test Generation (#3) ← second codegen target, forces abstraction
└─► Cross-Framework (#1) ← fully abstract codegen
└─► Progressive Enhancement (#4) ← dual-target instance
└─► Multi-Target (#7) ← same abstraction, new targets

Semantic Diffing (#5) ← independent, but feeds into migration tooling for #1
The key architectural unlock is abstracting the codegen target. Right now the 45 command codegens in AOT each emit DOM JavaScript strings directly. The moment you make that pluggable, #1, #3, #4, and #7 all become instances of the same pattern.

### Phase 1: Semantic Compilation Service — DONE (57c686b9)

`@lokascript/compilation-service` — 31 tests, 3 input formats, semantic-keyed cache.

- `compileAST()` added to AOTCompiler (bypass parse step)
- Validator wired to all 54 command schemas (was 14)
- LLM JSON input format: `{ action, roles, trigger }`
- Every response returns normalized `SemanticJSON` for feedback loop
- Next: HTTP/edge wrapper, MCP tool integration (thin wrappers over the library)

### Phase 2: Test Generation — DONE (01ed709d)

`@lokascript/compilation-service` — 78 tests (31 existing + 47 new), 16 commands covered.

- Abstract operation layer: 20 op types in `AbstractOperation` union, `BehaviorSpec`, `TargetRef`
- `extractOperations()`: SemanticNode → BehaviorSpec (semantic roles → framework-agnostic ops)
- `PlaywrightRenderer`: generates complete Playwright test files with per-op assertion patterns
- HTML fixture generator: auto-generates minimal DOM from operation targets
- `generateTests()` on CompilationService: parse → validate → extract → render
- Zero changes to existing 45 JS codegens or 533 AOT tests
- Next: Phase 3 adds new renderers (React, Vue, Svelte) on the same `AbstractOperation` layer

### Phase 3: Cross-Framework Codegen

Pluggable framework targets (#1)

With the abstract operation layer from Phase 2, adding React/Vue/Svelte/Alpine targets becomes "just" writing new renderers. The semantic roles map naturally to framework idioms:

Role React Vue Svelte
patient:.active useState toggle ref toggle class:active
destination:#el useRef template ref bind:this
trigger:click onClick @click on:click
source:/api useEffect + fetch onMounted + fetch onMount + fetch
Why third: This is where the architecture pays off. Each new framework target is incremental effort, not a rewrite. And it repositions LokaScript from "hyperscript runtime" to "universal behavior language with compilation targets."

### Phase 4 (optional, builds on #3): Semantic Diffing + Progressive Enhancement

These fall out naturally once the abstract operation layer exists. Semantic diffing compares at the operation level. Progressive enhancement is just a dual-target build (JS renderer + HTML-fallback renderer).

### Where the real moat is

The combination that nobody else has: 24-language semantic parsing → validated schemas → compiled output in multiple targets. Each piece alone is useful; together they create a pipeline where:

Developers write behavior in their native language
LLMs generate reliable structured output (not fragile syntax)
The compiler validates, optimizes, and emits to whatever target the project uses
Tests are generated automatically from the semantic understanding
Phase 1 proves the pipeline. Phase 2 proves the abstraction. Phase 3 is the payoff.
