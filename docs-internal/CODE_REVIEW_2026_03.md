# HyperFixi Code Review & Next Steps — March 2026

## Overall Assessment: Strong (8.5/10)

HyperFixi is a mature, well-engineered monorepo with 8,100+ tests, 24-language support,
professional CI/CD, and thoughtful architecture. The codebase demonstrates clear vision
and solid execution. Below are specific findings and recommendations.

---

## What's Working Well

**Architecture**
- Clean command pattern (`CommandImplementation<TInput, TOutput, TypedExecutionContext>`) with 43 well-organized commands
- Semantic parser with confidence scoring — elegant fallback from semantic → traditional parsing
- Grammar transformation (SVO/SOV/VSO) is a genuinely novel contribution to the web ecosystem
- Bundle tiering from 1.9 KB (lite) to 203 KB (full) serves real use cases
- Environment-specific conditional types (Browser/Server/Universal) prevent misuse at compile time

**Testing**
- 521 test files covering unit, integration, browser (Playwright), and multilingual validation
- Bundle compatibility matrix that tests all 7 bundles against gallery examples
- CI runs 8 parallel jobs with shared build artifacts (40% faster than naive approach)

**Developer Experience**
- Excellent CLAUDE.md files at root and per-package level
- `test:check` for compact CI output, `test:quick` for fast iteration
- Custom bundle generator with config files
- MCP server integration for LLM-assisted development

---

## Issues & Technical Debt

### High Priority

1. **Parser is 3,981 lines** (`packages/core/src/parser/parser.ts`)
   - The largest file in the codebase by a wide margin
   - 20+ commands are explicitly skipped for semantic parsing (lines 2901-2939), falling back to the traditional parser
   - Consider extracting the `ParserContext` class methods into focused modules (expression parsing, command parsing, event handling)
   - The `skipSemanticParsing` list is a code smell — each entry represents a semantic parser gap

2. **`commands/` vs `commands-v2/` migration is incomplete**
   - `commands/` has 90+ files across 9 subdirectories (the active implementation)
   - `commands-v2/` directory referenced in CLAUDE.md and architecture docs doesn't exist
   - Documentation says "43 commands use CommandImplementation" but the actual commands live in `commands/`
   - This creates confusion for contributors — clarify which is canonical

3. **Swap executor tests blocked** (`packages/core/src/lib/__tests__/TODO_SWAP_EXECUTOR.md`)
   - 72 tests written but hanging due to mock/circular dependency issues
   - Blocking coverage for a ~330-line module
   - Root cause: `vi.mock()` for morph-adapter creating circular deps

4. **Expression parser bugs documented but unfixed**
   - `no` operator incorrectly handles empty strings and false values (`expressions-comprehensive.spec.ts:9-16`)
   - Possessive expression evaluation broken for toggle attributes (`toggle-attributes-comprehensive.spec.ts:162,193`)

### Medium Priority

5. **Behavior implementations incomplete**
   - `draggable.ts`, `sortable.ts`, `resizable.ts` exist but aren't fully implemented
   - CI marks these as `continue-on-error` rather than fixing or removing
   - 6 newer behaviors (Clipboard, AutoDismiss, ClickOutside, FocusTrap, ScrollReveal, Tabs) are well-implemented — suggests the older ones were prototypes

6. **SOV/VSO language pass rates are lower**
   - Japanese, Korean, Turkish marked as `continue-on-error` in CI
   - For a project whose differentiator is multilingual support, this deserves focused attention
   - 3 languages (Quechua, Bengali, Malay) excluded from CI entirely

7. **No built dist artifacts in repository**
   - `packages/core/dist/` only contains `tsconfig.tsbuildinfo`
   - `packages/semantic/dist/` and `packages/i18n/dist/` are empty
   - Users cloning the repo can't run examples without building first
   - Consider whether dist should be gitignored (npm publish handles it) or committed for demos

8. **esbuild daemon hang workaround**
   - Tests complete but Node process hangs — worked around with `timeout 120`
   - Exit code 124 (killed by timeout) treated as success
   - This masks real timeout failures and is fragile

### Low Priority

9. **Version string injected at runtime** (`hyperscript-api.ts:500`)
   - `TODO: Inject during build via rollup replace plugin`
   - Minor, but reflects incomplete build pipeline

10. **Single contributor bottleneck**
    - 49/51 commits from one developer
    - Excellent documentation mitigates this, but bus factor is 1

---

## Recommended Next Steps

### Immediate (Next Sprint)

1. **Fix the `no` operator bugs** — These are user-facing correctness issues:
   - `no ""` should be truthy (empty string = no content)
   - `no false` should be truthy
   - Located in expression evaluation, likely a simple truthiness check fix

2. **Resolve swap-executor test hangs** — Try the suggested approaches in TODO_SWAP_EXECUTOR.md:
   - Use `vi.doMock()` with factory functions
   - Or restructure morph-adapter to avoid circular dependency

3. **Clarify commands/ vs commands-v2/ in documentation** — Update CLAUDE.md to reflect actual file layout. Either complete the migration to commands-v2/ or remove references to it.

### Short-term (1-2 Months)

4. **Break up parser.ts** — Extract into focused modules:
   - `parser-expressions.ts` — expression parsing (~1200 lines)
   - `parser-events.ts` — event handler parsing (~400 lines)
   - `parser-commands.ts` — command dispatch and parsing (~800 lines)
   - Keep `parser.ts` as orchestrator (~1500 lines)
   - This enables independent testing and reduces cognitive load

5. **Expand semantic parser coverage** — Tackle the `skipSemanticParsing` list:
   - Start with `increment`/`decrement` (simplest — just need `by` quantity role)
   - Then `add`/`remove` (high-usage commands)
   - Then `set`/`put` (complex but critical)
   - Each command removed from the skip list is a measurable improvement

6. **Fix SOV/VSO language pass rates** — Invest in Japanese/Korean/Turkish:
   - Audit which specific test cases fail
   - Likely grammar transformation edge cases around particle placement
   - This is your competitive differentiator — it should be rock solid

### Medium-term (3-6 Months)

7. **Complete or remove incomplete behaviors** — Either:
   - Implement draggable/sortable/resizable fully (significant effort)
   - Or mark them as experimental/remove from default exports
   - The 6 newer behaviors show the pattern works — apply it

8. **Fix the esbuild daemon hang properly** — Options:
   - Use `esbuild.stop()` in vitest teardown
   - Or switch to a different bundler for test builds
   - The timeout workaround is too fragile for long-term maintenance

9. **LSE protocol stabilization** — Recent commits show heavy LSE development:
   - v1.2 with pipe operator, match command, try/catch, multi-language ports
   - Write a specification document and conformance test suite
   - The Go/Rust/Python ports need their own CI validation

---

## Possible New Directions

### 1. Web Components Integration
HyperFixi's declarative syntax is a natural fit for Web Components. Consider:
```html
<hyper-counter _="on click increment :count then put :count into me">0</hyper-counter>
```
- Custom elements that self-initialize from `_=` attributes
- Shadow DOM scoping for styles affected by add/remove/toggle
- Integrates with existing attribute processor architecture

### 2. Server-Side Rendering (SSR) Pipeline
The AOT compiler and server-bridge packages suggest interest in SSR:
- Compile hyperscript to static HTML + minimal hydration JS
- Pre-render multilingual variants at build time
- Integrate with the Vite plugin for zero-config SSR

### 3. Visual Behavior Builder
The behaviors package + MCP server create an opportunity for:
- A visual editor that generates hyperscript from drag-and-drop interactions
- Could target the no-code/low-code market
- MCP tools already exist — expose them through a GUI

### 4. Accessibility-First Expansion
The `domain-voice` package hints at this direction:
- ARIA attribute management as first-class hyperscript commands
- Screen reader announcement commands (`announce "Item added" politely`)
- Focus management behaviors (FocusTrap is already implemented)
- This is an underserved niche where hyperscript's declarative syntax excels

### 5. Framework Adapters (React/Vue/Svelte)
The compilation service already generates framework components:
- Publish `@hyperfixi/react`, `@hyperfixi/vue`, `@hyperfixi/svelte` adapter packages
- Allow hyperscript in JSX: `<button _="on click toggle .active">Click</button>`
- Hooks/composables for imperative hyperscript execution
- The Vite plugin already scans `.vue`, `.svelte`, and `.jsx` files

### 6. Educational Platform
24-language support + semantic parsing creates unique educational value:
- Interactive tutorials that teach hyperscript in the learner's native language
- The `domain-learn` package already exists — build it into a web app
- Progressive disclosure: start with lite bundle concepts, graduate to full
- Code translation between languages as a learning tool

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Semantic parser coverage (commands not skipped) | ~23/43 (53%) | 35/43 (81%) |
| SOV/VSO language pass rate | ~70-80% | >90% |
| Parser.ts line count | 3,981 | <2,000 (after extraction) |
| Behavior implementations complete | 7/10 | 10/10 |
| Bundle size (hybrid-complete, gzip) | 7.3 KB | <7 KB |
| Test count | 8,100+ | 9,000+ |
