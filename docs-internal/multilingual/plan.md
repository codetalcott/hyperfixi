# Plan: Semantic Package → Framework Integration

## Context

The `@lokascript/framework` (42 files, 308–1388 LOC per key module) was extracted from
the semantic package to be a reusable, domain-agnostic DSL toolkit. Today the semantic
package imports from framework in only **5 files** — all for extractor types/classes.
The two packages have **parallel implementations** of four major subsystems:

| Subsystem           | Semantic (LOC) | Framework (LOC) | Relationship                                                                      |
| ------------------- | -------------- | --------------- | --------------------------------------------------------------------------------- |
| BaseTokenizer       | 799            | 777             | Near-identical copies with different import paths                                 |
| PatternMatcher      | 1,240          | 1,388           | Fork — framework version has `isValidReference()` stub, semantic has real impl    |
| PatternGenerator    | 776            | 308             | Semantic is superset (SOV/VSO event handlers)                                     |
| GrammarTransformer  | (none)         | 159             | Framework has simple version; i18n has 1,370-line version                         |
| CommandSchema types | custom         | 109             | Near-identical interfaces, semantic adds `CommandPrecondition`, `CommandCategory` |

**Goal:** Eliminate the parallel implementations so the framework becomes the single
source of truth for shared algorithms, tested by semantic's 3,100+ tests. The semantic
package shrinks to only hyperscript-specific logic.

---

## Phase 1: Type Alignment (Low Risk)

### 1.1 Export `KeywordEntry` and `TokenizerProfile` from framework

**Files to change:**

- `packages/framework/src/core/tokenization/base-tokenizer.ts` — already exports `KeywordEntry` (re-export from interfaces)
- `packages/framework/src/index.ts` — ensure `KeywordEntry`, `TokenizerProfile` in barrel

**Verify:** `TokenizerProfile` in framework (line 41) is structurally identical to semantic (line 42). Both have `keywords`, `references`, `roleMarkers`, `possessive`.

### 1.2 Align `CommandSchema` / `RoleSpec` interfaces

**Problem:** Semantic's `CommandSchema` has extra fields (`CommandPrecondition`, `CommandCategory` enum, `errorCodes`, `recoveryHints`). Framework's is a clean subset.

**Action:**

- Keep framework's `CommandSchema` as the base interface
- In semantic, extend it: `interface HyperscriptCommandSchema extends CommandSchema { preconditions: ...; errorCodes: ...; }`
- Semantic's 47 command definitions keep using the extended type
- Semantic imports `defineCommand()` / `defineRole()` from framework for the base fields

**Files to change:**

- `packages/semantic/src/generators/command-schemas.ts` — change `CommandSchema` to extend framework's, import `defineCommand`/`defineRole`
- `packages/framework/src/schema/command-schema.ts` — no changes (already correct)

### 1.3 Align `PatternMatcherProfile`

**Problem:** Framework defines `PatternMatcherProfile` (code + possessive) in its pattern-matcher.ts. Semantic uses `LanguageProfile` from its own generators/profiles/types.

**Action:**

- Framework exports `PatternMatcherProfile` from its barrel
- Semantic's `LanguageProfile` should satisfy `PatternMatcherProfile` structurally (it already does — `code` + `possessive.keywords`)
- No code changes needed if TypeScript structural typing handles it; add explicit `extends` if not

**Files to change:**

- `packages/framework/src/index.ts` — export `PatternMatcherProfile`

### Validation

```bash
npm run typecheck --prefix packages/framework
npm run typecheck --prefix packages/semantic
npm run test:check --prefix packages/semantic   # All 3,100+ tests pass
```

---

## Phase 2: Deduplicate BaseTokenizer (Low Risk)

### 2.1 Audit differences between the two copies

The two files are near-identical (799 vs 777 lines). Key differences:

| Aspect                          | Semantic                                           | Framework                                  |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Imports `ValueExtractor` from   | `./value-extractor-types` (re-exports framework)   | `../../interfaces/value-extractor` (local) |
| Imports `KeywordEntry` from     | local definition                                   | `../../interfaces/value-extractor`         |
| Imports `PossessiveConfig` from | `../generators/profiles/types`                     | (not imported)                             |
| Imports extractors from         | `./extractors` (local)                             | `./extractors` (local)                     |
| `isContextAwareExtractor` from  | `./context-aware-extractor` (re-exports framework) | `../../interfaces/value-extractor` (local) |

The actual class body (methods, logic) is identical — the only differences are import paths and the `PossessiveConfig` type used in one spot.

### 2.2 Make semantic's BaseTokenizer re-export framework's

**Action:**

- Delete `packages/semantic/src/tokenizers/base-tokenizer.ts` (799 lines)
- Create thin re-export file:
  ```typescript
  // packages/semantic/src/tokenizers/base-tokenizer.ts
  export {
    BaseTokenizer,
    type KeywordEntry,
    type TokenizerProfile,
  } from '@lokascript/framework/core/tokenization';
  ```
- Ensure `PossessiveConfig` is handled: either add it to framework's `TokenizerProfile` (it's a legitimate generic concept — languages have possessives) or keep a local type extension

**Risk:** All 24 language tokenizers import `BaseTokenizer` from `../base-tokenizer` or `./base`. The re-export keeps import paths stable.

**Files to change:**

- `packages/semantic/src/tokenizers/base-tokenizer.ts` — replace with re-export
- `packages/semantic/src/tokenizers/base.ts` — update if it re-exports from base-tokenizer
- `packages/framework/src/core/tokenization/base-tokenizer.ts` — add `PossessiveConfig` to `TokenizerProfile` if not present

### 2.3 Deduplicate shared extractors

**Problem:** Both packages have `extractors.ts` files with `extractCssSelector`, `extractStringLiteral`, `extractNumber`, `extractUrl`. If identical, semantic should import from framework.

**Action:**

- Compare `packages/semantic/src/tokenizers/extractors.ts` with `packages/framework/src/core/tokenization/extractors.ts`
- If identical: semantic re-exports from framework
- If semantic has extras (likely — hyperscript-specific extractors): keep semantic's extras, import shared functions from framework

**Files to change:**

- `packages/semantic/src/tokenizers/extractors.ts` or `extractors/index.ts` — import shared extractors from framework

### 2.4 Deduplicate token-utils

Same approach — compare `token-utils.ts` in both. `createToken`, `createPosition`, `isWhitespace`, `isDigit`, `isAsciiIdentifierChar`, `TokenStreamImpl` should be importable from framework.

### Validation

```bash
npm run typecheck --prefix packages/semantic
npm run test:check --prefix packages/semantic   # 3,100+ tests still pass
npm run test:check --prefix packages/framework  # Framework tests still pass
```

---

## Phase 3: Deduplicate PatternMatcher (Medium Risk)

### 3.1 Identify the fork point

Both `PatternMatcher` classes have the same structure:

- `matchPattern(tokens, pattern)` → `matchTokenSequence()` → `applyExtractionRules()` → `calculateConfidence()`
- `matchBest(tokens, patterns)` → iterate, track best match

**Key divergence points:**

1. `isValidReference()` — framework returns `false` (no built-in refs); semantic imports real impl from `../types` that knows about `me`, `you`, `it`, etc.
2. `currentProfile` type — framework uses `PatternMatcherProfile`; semantic uses `LanguageProfile`
3. Confidence scoring — semantic tracks `stemMatchCount`, `totalKeywordMatches`
4. Framework has `safeToLowerCase()` helper; semantic may or may not
5. Framework uses `createLogger()`; semantic doesn't

### 3.2 Make framework's PatternMatcher extensible

**Action in framework:**

- Make `isValidReference()` a protected method that subclasses can override (it's already a standalone function — move it to a method)
- Make `calculateConfidence()` protected and overridable
- Make `currentProfile` typed as generic `P extends PatternMatcherProfile`
- Export the class for extension

**Files to change:**

- `packages/framework/src/core/pattern-matching/pattern-matcher.ts`:
  - `isValidReference()` → `protected isValidReference(value: string): boolean` (default: false)
  - `calculateConfidence()` → `protected calculateConfidence(...)` (keep existing logic as default)
  - Class becomes `PatternMatcher<P extends PatternMatcherProfile = PatternMatcherProfile>`

### 3.3 Semantic extends framework's PatternMatcher

**Action in semantic:**

- Replace `packages/semantic/src/parser/pattern-matcher.ts` (1,240 lines) with:

  ```typescript
  import { PatternMatcher as BasePatternMatcher } from '@lokascript/framework/core/pattern-matching';
  import { isValidReference } from '../types';

  export class PatternMatcher extends BasePatternMatcher<LanguageProfile> {
    protected override isValidReference(value: string): boolean {
      return isValidReference(value);
    }

    protected override calculateConfidence(pattern, captured): number {
      // Hyperscript-specific confidence with stemMatchCount
      ...
    }
  }
  ```

- Keep any semantic-specific private methods that don't exist in framework

**Estimated reduction:** ~800 lines removed from semantic, replaced by ~100-line subclass.

### Validation

```bash
npm run test:check --prefix packages/semantic   # Critical — pattern matching is the core algorithm
npm run test:check --prefix packages/framework
# Run specific pattern matcher tests:
npm test --prefix packages/semantic -- --run src/parser/pattern-matcher
```

---

## Phase 4: Converge Pattern Generation (Medium Risk)

### 4.1 Move shared generation logic to framework

**Problem:** Framework's generator is 308 lines (basic SVO/SOV/VSO token building). Semantic's is 776 lines (adds event handler variant generation for SOV/VSO). The first ~300 lines of semantic's generator are structurally similar to framework's.

**Action:**

- Expand framework's `generatePattern()` to handle the common cases:
  - SVO command patterns
  - SOV command patterns (role reordering)
  - VSO command patterns (verb-first)
  - Optional role variants (omit optional roles for shorter patterns)
- Keep event handler variant generation in semantic as a plugin/extension

### 4.2 Create generator plugin API in framework

**Action in framework:**

- Add `PatternGeneratorPlugin` interface:
  ```typescript
  interface PatternGeneratorPlugin {
    generateAdditionalPatterns(
      schema: CommandSchema,
      profile: PatternGenLanguageProfile,
      basePatterns: LanguagePattern[]
    ): LanguagePattern[];
  }
  ```
- `generatePatternsForCommand()` calls base generation, then each plugin

### 4.3 Semantic provides event handler plugins

**Action in semantic:**

- Move SOV event handler generators (`event-handlers-sov.ts`) into a plugin
- Move VSO event handler generators (`event-handlers-vso.ts`) into a plugin
- Import base `generatePattern` from framework
- Register plugins for event handler variant generation

**Files to change:**

- `packages/framework/src/generation/pattern-generator.ts` — expand base generation, add plugin API
- `packages/semantic/src/generators/pattern-generator.ts` — slim down to plugin registration + hyperscript-specific variants
- `packages/semantic/src/generators/event-handlers-sov.ts` — wrap as plugin (no logic changes)
- `packages/semantic/src/generators/event-handlers-vso.ts` — wrap as plugin (no logic changes)

**Estimated reduction:** ~300 lines removed from semantic generator, moved to framework.

### Validation

```bash
npm run test:check --prefix packages/semantic
npm run test:check --prefix packages/framework
# Pattern generation tests:
npm test --prefix packages/semantic -- --run src/generators
```

---

## Phase 5: Unify Grammar Transformation (Higher Risk, Cross-Package)

### 5.1 Audit i18n transformer vs framework transformer

**Current state:**

- Framework: 159 lines — single-statement `transform()` with naive `split(/\s+/)` parsing
- i18n: 1,370 lines — compound statement splitting, line structure preservation, indentation normalization, command boundary detection, "then" splitting

The framework's transformer is essentially a proof-of-concept. The i18n version is production-grade.

### 5.2 Create abstract multi-statement transformer in framework

**Action in framework:**

- Rename current `GrammarTransformer` to `SimpleGrammarTransformer` (keep for backward compat)
- Add abstract `MultiStatementGrammarTransformer`:

  ```typescript
  abstract class MultiStatementGrammarTransformer {
    // Template methods for subclasses
    protected abstract splitStatements(input: string): string[];
    protected abstract joinStatements(statements: string[], delimiter: string): string;

    // Concrete: single-statement transform (reuse existing logic)
    protected transformStatement(input: string, from: string, to: string): string { ... }

    // Public: multi-statement transform
    transform(input: string, from: string, to: string): string {
      const parts = this.splitStatements(input);
      return this.joinStatements(parts.map(p => this.transformStatement(p, from, to)));
    }
  }
  ```

### 5.3 i18n extends framework's abstract transformer

**Action in i18n:**

- Import `MultiStatementGrammarTransformer` from framework
- Implement `splitStatements()` using existing `splitCompoundStatement()` / `splitOnThen()` logic
- Implement `joinStatements()` using existing `reconstructWithLineStructure()` logic
- Keep hyperscript-specific features (command keyword detection, indentation normalization)

**Estimated change:** i18n's transformer becomes ~800 lines (from 1,370) by inheriting single-statement logic from framework.

### 5.4 Semantic gains translation capability

**Payoff:** Once the framework has a proper transformer and semantic's `LanguageProfile` provides the necessary `LanguageProfile` data, semantic can offer `translate()` without depending on i18n.

**Action in semantic:**

- Add optional `translate(input, fromLang, toLang)` method to semantic parser
- Uses framework's transformer internally
- This enables `MultilingualHyperscript.translate()` to go through semantic directly

**Files to change:**

- `packages/framework/src/grammar/transformer.ts` — add `MultiStatementGrammarTransformer` abstract class
- `packages/framework/src/grammar/index.ts` — export new class
- `packages/i18n/src/grammar/transformer.ts` — refactor to extend framework
- `packages/semantic/src/parser/semantic-parser.ts` — add optional `translate()` (uses framework transformer)

### Validation

```bash
npm run test:check --prefix packages/i18n       # 90+ grammar tests
npm run test:check --prefix packages/semantic    # 3,100+ tests
npm run test:check --prefix packages/framework
```

---

## Phase 6: Documentation & Cleanup

### 6.1 Update CLAUDE.md files

- `packages/framework/CLAUDE.md` — document that semantic package is the primary consumer and test surface
- `packages/semantic/CLAUDE.md` — document framework dependency, what's inherited vs overridden
- Root `CLAUDE.md` — update architecture diagram to show framework → semantic inheritance

### 6.2 Remove dead re-export shims

After phases 2–4, several re-export files in semantic become unnecessary:

- `packages/semantic/src/tokenizers/value-extractor-types.ts` — consumers can import framework directly
- `packages/semantic/src/tokenizers/context-aware-extractor.ts` — same
- `packages/semantic/src/tokenizers/generic-extractors.ts` — same

**Action:** Keep re-exports for now (they're tiny), mark with `@deprecated` comments, remove in next major version.

### 6.3 Update framework test suite

Framework currently has 72/85 tests passing. After phases 2–3, the framework's core algorithms (BaseTokenizer, PatternMatcher) gain indirect coverage from semantic's 3,100+ tests.

**Action:** Add integration test in framework that imports semantic's test fixtures:

```typescript
// packages/framework/src/__test__/semantic-compat.test.ts
// Verifies framework's base classes work with semantic's language implementations
```

---

## Execution Order & Risk Assessment

| Phase | Work                           | Lines Removed  | Lines Added | Risk     | Dependencies |
| ----- | ------------------------------ | -------------- | ----------- | -------- | ------------ |
| 1     | Type alignment                 | 0              | ~30         | Very low | None         |
| 2     | BaseTokenizer dedup            | ~750           | ~20         | Low      | Phase 1      |
| 3     | PatternMatcher dedup           | ~800           | ~150        | Medium   | Phase 1      |
| 4     | PatternGenerator convergence   | ~300           | ~100        | Medium   | Phase 1      |
| 5     | GrammarTransformer unification | ~500 (in i18n) | ~200        | Higher   | Phases 1, 3  |
| 6     | Documentation & cleanup        | ~50            | ~100        | Very low | Phases 1–5   |

**Total estimated reduction:** ~2,400 lines across semantic + i18n
**Total estimated addition:** ~600 lines in framework (making it production-grade)
**Net reduction:** ~1,800 lines

**Recommended stopping point:** After Phase 3. Phases 1–3 deliver 80% of the value (type safety + dedup of the two largest shared modules) with controlled risk. Phases 4–5 are optional and can be deferred.

---

## Test Strategy

Every phase must pass before proceeding:

```bash
# After each phase:
npm run test:check --prefix packages/framework
npm run test:check --prefix packages/semantic
npm run test:check --prefix packages/i18n        # Phase 5 only
npm run typecheck --prefix packages/framework
npm run typecheck --prefix packages/semantic
npm run typecheck --prefix packages/i18n          # Phase 5 only
```

No phase should introduce test regressions. If a phase causes failures, fix or revert before continuing.
