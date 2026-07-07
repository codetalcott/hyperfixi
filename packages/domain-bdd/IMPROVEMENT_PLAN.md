# domain-bdd Improvement Plan

> **Status (2026-07-06): COMPLETE except Phase 5c.** Everything below has landed:
> escaping helpers (`escapeForString`/`escapeForRegex` in `playwright-generator.ts`),
> AND-step error reporting (`scenario-parser.ts`), named `Scenario:`/`Feature:`
> blocks with `Background:` → `beforeEach`, the `render()` path
> (`generators/bdd-renderer.ts` + roundtrip tests), and 8 languages
> (en/es/ja/ar/ko/zh/tr/fr). Current state: ~115 tests across 3 suites.
> **Still open: Phase 5c** — wire `packages/domain-bdd` into `.github/workflows/ci.yml`
> (tracked as part of the framework↔semantic bridge arc, which covers CI for all
> domain packages). The phases below are kept for historical context.

## Current State (historical, pre-plan)

39 tests passing, 4 languages (EN/ES/JA/AR), 3 BDD commands + AND continuation, Playwright code generation, MCP tools registered. Functional but has production gaps in code generation, test coverage, and scenario composition.

---

## Phase 1: Correctness (High Priority)

### 1a. Quote/string escaping in Playwright output

**Problem:** `playwright-generator.ts` interpolates selectors and values directly into template strings with no escaping. Input like `type "O'Reilly" into #input` generates broken JS.

**Fix:**

- Add `escapeSelector(s)` and `escapeValue(s)` helpers that escape single quotes and backslashes
- Apply to all `page.locator('${target}')` and `.fill('${value}')` interpolations
- ~15 lines of utility code, touch ~8 interpolation sites

**Tests to add:**

- Selector with single quote: `given #it's-ok is visible`
- Value with single quote: `when type O'Reilly into #name`
- Selector with special chars: `then .my-class\:hover has .active`

### 1b. Silent AND failure

**Problem:** `scenario-parser.ts` silently drops AND steps when content role is empty. No error, no warning.

**Fix:**

- Add explicit check: if AND step has no content, push an error to the errors array
- Add check: if AND step appears with no preceding given/when/then, push error

**Tests to add:**

- Leading `and visible` with no preceding step
- Empty AND: `given #button is visible, and`
- Double AND: `and X, and Y` chaining

### 1c. Complete Spanish action aliases

**Problem:** Only `clic` is aliased for Spanish. Missing: `escribir`, `navegar`, `enviar`, `sobrevolar`.

**Fix:** Add remaining Spanish aliases to the switch cases in `generateWhen()`. JA and AR already have full coverage.

---

## Phase 2: Test Coverage

### 2a. Validate generated Playwright code syntax

Add tests that verify complete generated output (not just `.toContain()` spot checks):

- Parse a GIVEN step, check full output line matches `await expect(page.locator('#button')).toBeVisible();`
- Parse a WHEN step, check full output matches `await page.locator('#button').click();`
- Parse a THEN step with expected_value, check full assertion

### 2b. Edge case tests

- CSS attribute selectors: `[data-testid="submit"]`
- Multi-word values: `when type hello world into #input`
- Numeric selectors: `then #list has count 5`
- Empty target: `when click` (should produce meaningful error or default)
- Very long scenarios (10+ steps)

### 2c. Cross-language scenario tests

- Full scenario in each language (not just single steps)
- Mixed-language detection (should reject gracefully)

---

## Phase 3: Scenario Composition

### 3a. Full scenario parsing with names

Extend the scenario parser to handle named scenarios:

```
Scenario: Login flow
  Given #login-form is visible
  When type admin into #username
  And type secret into #password
  And click on #submit
  Then #dashboard is visible
```

**Changes:**

- Add `Scenario:` header detection (multilingual: Escenario/シナリオ/سيناريو)
- Extract scenario name for the Playwright `test()` description
- Indent body steps

### 3b. Describe block / feature grouping

```
Feature: Authentication
  Scenario: Login
    Given ...
  Scenario: Logout
    Given ...
```

Compiles to:

```typescript
test.describe('Authentication', () => {
  test('Login', async ({ page }) => { ... });
  test('Logout', async ({ page }) => { ... });
});
```

### 3c. Before/After hooks

Support `Background:` sections that compile to `test.beforeEach()`:

```
Background:
  Given /login is loaded
```

---

## Phase 4: Richer Assertions & Actions

### 4a. More assertion types

| BDD               | Playwright            |
| ----------------- | --------------------- |
| `is disabled`     | `toBeDisabled()`      |
| `is checked`      | `toBeChecked()`       |
| `is focused`      | `toBeFocused()`       |
| `has value X`     | `toHaveValue('X')`    |
| `contains text X` | `toContainText('X')`  |
| `matches /regex/` | `toHaveText(/regex/)` |

### 4b. More action types

| BDD                     | Playwright                      |
| ----------------------- | ------------------------------- |
| `double-click on X`     | `x.dblclick()`                  |
| `right-click on X`      | `x.click({ button: 'right' })`  |
| `press Escape`          | `page.keyboard.press('Escape')` |
| `drag X to Y`           | `x.dragTo(y)`                   |
| `select "option" in X`  | `x.selectOption('option')`      |
| `check X` / `uncheck X` | `x.check()` / `x.uncheck()`     |
| `wait for X`            | `x.waitFor()`                   |

### 4c. Configurable mappings

Move hardcoded state/action/assertion mappings out of generator functions into a declarative config object. This allows domain consumers to extend mappings without forking the generator.

---

## Phase 5: MCP & Integration

### 5a. Deduplicate MCP compile logic

The `compile_bdd` MCP tool manually splits and wraps multi-step scenarios, duplicating `scenario-parser.ts` and `playwright-generator.ts`. Refactor to call `dsl.compile()` on the full scenario and use the generator's `generateScenario()` directly.

### 5b. Add render() API for true translation

Currently `translate_bdd` only parses and compiles to Playwright. Add a `render(node, language)` method that produces natural-language BDD in the target language. This would make the translate tool genuinely useful.

### 5c. Wire into CI

Add `packages/domain-bdd` to `.github/workflows/ci.yml` and the root `test:check` script.

---

## Phase 6: More Languages

Low effort given the existing 4-language infrastructure:

| Language     | Word Order | Markers          | Effort                          |
| ------------ | ---------- | ---------------- | ------------------------------- |
| Korean (ko)  | SOV        | 이/가, 을/를, 에 | Low (follows JA pattern)        |
| Chinese (zh) | SVO        | 的, 在, 了       | Low (follows EN pattern)        |
| Turkish (tr) | SOV        | -de, -i, -e      | Medium (agglutinative suffixes) |
| French (fr)  | SVO        | est, a, sur      | Low (follows ES pattern)        |

---

## Priority Order

1. **Phase 1** (correctness) — bugs that produce broken output
2. **Phase 2** (tests) — catch regressions before adding features
3. **Phase 5c** (CI) — quick win, prevents regressions
4. **Phase 3a** (named scenarios) — highest user-value feature
5. **Phase 4** (richer actions) — incremental, can be done piecemeal
6. **Phase 5a-b** (MCP cleanup) — code quality
7. **Phase 3b-c** (features/hooks) — nice-to-have
8. **Phase 6** (languages) — incremental, demand-driven
