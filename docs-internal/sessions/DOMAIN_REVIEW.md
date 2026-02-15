# Domain Package Review & Architecture Analysis

**Date:** 2026-02-15
**Packages reviewed:** `domain-sql`, `domain-bdd`, `domain-jsx`
**Tests:** 195 total (32 + 107 + 56), all passing

---

## Fixes Applied

### 1. BDD renderer word order bug (domain-bdd)

**File:** `generators/bdd-renderer.ts`

`renderGiven()`, `renderWhen()`, and `renderThen()` hard-coded `lang === 'ja'` for SOV rendering and `lang === 'ar'` for VSO. Korean (`ko`) and Turkish (`tr`) — both SOV languages — fell through to the SVO default, producing incorrect word order when rendering BDD steps.

**Fix:** Replaced language-specific checks with `isSOV(lang)` / `isVSO(lang)` helpers backed by `SOV_LANGUAGES` and `VSO_LANGUAGES` sets. Any future SOV/VSO language added to these sets will automatically render correctly.

### 2. JSX generator missing string escaping (domain-jsx)

**File:** `generators/jsx-generator.ts`

`generateRender()` interpolated raw values directly into `document.getElementById("${targetStr}")` with no escaping. A target ID containing a double quote would generate broken JavaScript.

**Fix:** Added `escapeForString()` helper and applied it to the interpolation sites in `generateRender()`.

### 3. Removed debug.test.ts (domain-sql)

**File:** `src/__test__/debug.test.ts`

Diagnostic file that only `console.log`s pattern tokens and tokenization output. Not a real test — 6 tests that test nothing. Removed.

### 4. Removed unused singleton tokenizer exports (domain-sql)

**File:** `tokenizers/index.ts` lines 221-224

Four module-level `new XxxTokenizer()` singletons (`englishTokenizer`, `spanishTokenizer`, etc.) were exported but never imported anywhere. Removed.

---

## Cross-Cutting Issues Found (Not Fixed)

### A. `extractValue()` duplicated 5 times

The exact same function appears in:

- `domain-sql/src/generators/sql-generator.ts`
- `domain-jsx/src/generators/jsx-generator.ts`
- `domain-bdd/src/generators/playwright-generator.ts`
- `domain-bdd/src/parser/scenario-parser.ts`
- `domain-bdd/src/generators/bdd-renderer.ts`

**Recommendation:** Export from `@lokascript/framework` as a utility. All domain generators need it.

### B. `as any` casts on SemanticValue

All generators cast `node.roles.get('...')` to `any` before calling `extractValue()`. This suggests that `SemanticValue` as defined in the framework doesn't have `raw` and `value` properties on its base union type — the generators need to access them via duck-typing.

**Recommendation:** Either:

1. Add a framework utility `extractValueFromRole(node, roleName): string` that does the cast internally, or
2. Ensure `SemanticValue` types have a common base with `raw?` and `value?` fields.

### C. Tokenizer boilerplate is nearly identical

Every tokenizer follows the exact same pattern:

1. Extend `BaseTokenizer`
2. Define a `const XX_KEYWORDS = new Set([...])`
3. Optionally define `XX_KEYWORD_EXTRAS: KeywordEntry[]`
4. In constructor: register extractors, optionally call `initializeKeywordsFromProfile()`
5. Implement `classifyToken()` with identical logic (keyword set check, isKeyword check, selector check, digit check, quote check, return 'identifier')

The only variation is whether operators are supported (SQL yes, BDD/JSX no) and whether to `toLowerCase()` before keyword lookup.

**Recommendation:** Provide a `createSimpleTokenizer(config)` factory in the framework:

```typescript
const EnglishSQLTokenizer = createSimpleTokenizer({
  language: 'en',
  keywords: ['select', 'insert', ...],
  caseInsensitive: true,
  includeOperators: true,
});
```

This would eliminate ~80% of tokenizer code per language.

---

## Architecture Assessment

### What works well

1. **Schema-driven pattern generation** — Define schemas once, get patterns for all languages. This is the framework's killer feature and all three domains use it correctly.

2. **Separation of concerns** — Each domain cleanly separates schemas, profiles, tokenizers, and generators. Adding a new language to any domain is straightforward.

3. **`markerOverride` on roles** — Per-command, per-language markers are more flexible than profile-level markers. All three domains use this effectively.

4. **BDD domain maturity** — The BDD domain is significantly more mature than SQL/JSX: 8 languages, scenario parsing, feature parsing, named scenarios, escaping, a renderer, and extensive tests. It's a good reference implementation.

### What needs improvement

#### 1. No domain scaffold/template tool

Creating a new domain package requires manually copying and adapting 6-8 files. Compare this to the semantic package's `npm run add-language` CLI which generates all boilerplate.

**Proposal:** `npx @lokascript/framework create-domain --name=MyDSL --commands=foo,bar --languages=en,es,ja`

This would generate:

- `package.json` with framework dependency
- `src/schemas/index.ts` with stub schemas
- `src/profiles/index.ts` with language profiles
- `src/tokenizers/index.ts` with tokenizer stubs
- `src/generators/xxx-generator.ts` with generator skeleton
- `src/index.ts` with `createXxxDSL()` factory
- `src/__test__/xxx-domain.test.ts` with standard test structure
- `vitest.config.ts`, `tsconfig.json`, `tsup.config.ts`

#### 2. No shared test utilities

All three domains repeat the same test pattern: create DSL, parse in each language, check action/roles, compile and check output, validate, cross-language equivalence, error handling.

**Proposal:** `@lokascript/framework/testing` module:

```typescript
import { createDomainTestSuite } from '@lokascript/framework/testing';

createDomainTestSuite({
  name: 'SQL Domain',
  factory: createSQLDSL,
  cases: [
    {
      input: 'select name from users',
      language: 'en',
      action: 'select',
      roles: { columns: 'name', source: 'users' },
    },
    { input: 'seleccionar nombre de usuarios', language: 'es', action: 'select' },
  ],
});
```

This would auto-generate: parse tests, compile tests, validate tests, cross-language equivalence tests, and error handling tests.

#### 3. No renderer framework

The BDD domain has a hand-written renderer (`bdd-renderer.ts`) with 340+ lines of lookup tables. This is effectively the inverse of parsing — semantic node back to natural language. The framework should support this natively.

**Proposal:** `renderNode(node, language, config)` in the framework, using the same schemas and profiles that drive pattern generation. If the framework knows how to parse `"given #button is visible"` → `{action: 'given', roles: {target: '#button', state: 'visible'}}`, it should be able to reverse it.

#### 4. Code generator interface is too thin

The `CodeGenerator` interface is just `{ generate(node: SemanticNode): string }`. Every domain reimplements:

- Value extraction with `extractValue()`
- String escaping
- Per-action dispatch with a switch statement
- Fallback/error handling for unknown actions

**Proposal:** `AbstractCodeGenerator<TActions extends string>` base class:

```typescript
class SQLCodeGenerator extends AbstractCodeGenerator<'select' | 'insert' | 'update' | 'delete'> {
  protected generators = {
    select: (node, extract) => `SELECT ${extract('columns')} FROM ${extract('source')}`,
    insert: (node, extract) =>
      `INSERT INTO ${extract('destination')} VALUES (${extract('values')})`,
    // ...
  };
}
```

The base class would handle dispatch, value extraction, error messages, and optionally escaping.

#### 5. Domain packages not in CI

Neither `domain-sql`, `domain-bdd`, nor `domain-jsx` appear in `.github/workflows/ci.yml`. The improvement plan (Phase 5c) notes this for BDD. All three should be added.

---

## Per-Package Recommendations

### domain-sql (32 tests, 4 languages)

- **Maturity:** Proof-of-concept, minimal. No renderer, no scenario composition.
- **Missing:** UPDATE tests are thin (no compile verification), no WHERE clause compilation test for UPDATE/DELETE.
- **No-ops needed:** None critical. Package is stable and serves its purpose as a framework demo.

### domain-bdd (107 tests, 8 languages)

- **Maturity:** Production-ready. Most complete domain with escaping, rendering, scenarios, features, and 8 languages.
- **Remaining items from IMPROVEMENT_PLAN.md:**
  - Phase 4c (configurable mappings) — move hardcoded `STATE_MAPPINGS`/`ACTION_MAPPINGS`/`ASSERTION_MAPPINGS` to a pluggable config
  - Phase 5a (MCP deduplication) — `compile_bdd` MCP tool manually reimplements scenario logic
  - Phase 5c (CI integration)
  - Phase 6 (more languages) — incremental, demand-driven

### domain-jsx (56 tests, 4 languages)

- **Maturity:** Proof-of-concept, clean but limited.
- **Missing:** No documentation (no README.md). No renderer.
- **Fragility:** `parseProps()` in the generator splits on whitespace, which fails for quoted values with spaces (`className "my app"`). Not tested.
- **No-ops needed:** As a proof-of-concept, this is fine. If promoted to production use, needs proper prop parsing and edge case tests.

---

## Summary: Priority Order

1. **Export `extractValue` from framework** — Immediate, removes 5 duplications
2. **Add domain packages to CI** — Quick win, catches regressions
3. **Create domain scaffold CLI** — High leverage for onboarding new domains
4. **Add `createSimpleTokenizer` factory** — Removes most tokenizer boilerplate
5. **Framework-level renderer** — High value, but significant design work
6. **Shared test utilities** — Reduces test boilerplate across domains
7. **`AbstractCodeGenerator` base class** — Nice-to-have, moderate value
