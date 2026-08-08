# Framework Pattern Matcher: Backtracking Investigation & Plan

## Problem Statement

When an **unmarked optional role** appears immediately before a **keyword literal** in a generated pattern, the matcher greedily consumes the keyword token into the optional role. The subsequent literal match fails because its expected token was already consumed.

```
Pattern:  [columns?] 'from' [source]
Input:    "from users"
Expected: columns=empty, source="users"
Actual:   columns="from" → next literal 'from' fails → no match
```

This is currently **worked around** by always giving optional roles a marker, creating `[marker {role}]` optional groups that are skipped when the marker is absent. The workaround is documented in MEMORY.md and applied in both SQL and BDD domains.

---

## Current Architecture

### Token consumption flow

`matchPattern()` → `matchTokenSequence()` → `matchPatternToken()` → `matchRoleToken()` / `matchLiteralToken()` / `matchGroupToken()`

### Where backtracking already exists

1. **`matchGroupToken()` (line ~855)**: Marks position before attempting group. On failure, resets position and cleans up captured roles. This is the only place backtracking exists today.

2. **`TokenStream.mark()/reset()`**: Already implemented in `token-utils.ts`. Saves and restores stream position. No data structure changes needed.

3. **`matchLiteralToken()` (line ~277)**: Uses `getMatchType()` to compare token against literal + alternatives + stem. Returns false on mismatch but does NOT backtrack — just returns false, caller handles it.

### Where backtracking is missing

**`matchTokenSequence()` (line ~224)**: Iterates pattern tokens linearly. When an optional role succeeds (consumes a token), there is no mechanism to undo that consumption if a later required token fails.

```typescript
// Current code (simplified):
for (const patternToken of patternTokens) {
  const matched = this.matchPatternToken(tokens, patternToken, captured);
  if (!matched) {
    if (this.isOptional(patternToken)) {
      continue; // Skip optional — but if it DID match and consumed a token, too late
    }
    return false;
  }
}
```

The issue: when `matched` is `true` for an optional role, the token is already consumed. If the NEXT pattern token (a literal) fails, there's no way to go back and un-consume the optional role's token.

---

## Approaches Considered

### Option A: Lookahead before optional role consumption

Before allowing an optional unmarked role to consume a token, peek ahead and check if that token matches the next pattern element (a literal).

**Mechanism:** In `matchTokenSequence()`, when processing an optional role, check if the current input token would match the next pattern token. If yes, skip the optional role.

**Pros:**

- Simple to implement (~40 lines)
- No actual backtracking needed — just smarter forward decisions
- Zero performance cost (single peek)

**Cons:**

- Only handles the specific case of `[optional role] [literal]`
- Doesn't generalize to `[optional role] [optional role] [literal]`
- Requires pattern introspection (looking at `patternTokens[i+1]`)

**Complexity:** Low (~40 lines, 1 file)

### Option B: Save/restore on optional role match

When an optional role successfully matches, save a restore point. If the immediately following pattern token fails, restore and retry without the optional role.

**Mechanism:** After an optional role matches, mark the stream. Try the next pattern token. If it fails, reset and re-process with the optional role skipped.

**Pros:**

- Handles the exact failure case
- Uses existing mark/reset infrastructure
- Bounded — only backtracks one step

**Cons:**

- Adds complexity to `matchTokenSequence()` inner loop
- Needs captured-role cleanup on backtrack (delete the role we just captured)
- Must handle edge case: what if the optional role matched via a complex expression (possessive, method call) that consumed multiple tokens?

**Complexity:** Medium (~80 lines, 1 file)

### Option C: Full sequence-level backtracking

Rewrite `matchTokenSequence()` to support arbitrary backtracking across multiple optional roles.

**Mechanism:** Track all optional-role consumption points as a stack. On any failure, pop the stack and retry from the most recent optional consumption.

**Pros:**

- Fully general — handles `[opt1] [opt2] [literal]` chains
- Future-proof for complex patterns

**Cons:**

- Significant complexity
- Performance risk for patterns with many optional roles
- Overkill for current domains (SQL, BDD, hyperscript all use markers)

**Complexity:** High (~200 lines, possible refactor of inner loop)

---

## Recommendation: Option B (bounded single-step backtracking)

Option A is too narrow (doesn't handle multi-token consumption or expression-type optional roles). Option C is overkill for observed patterns. Option B hits the sweet spot: solves the actual problem with bounded complexity.

### Implementation Plan

#### Step 1: Add backtracking to matchTokenSequence()

```typescript
private matchTokenSequence(
  tokens: TokenStream,
  patternTokens: PatternToken[],
  captured: Map<SemanticRole, SemanticValue>
): boolean {
  // ... existing conjunction skip ...

  for (let i = 0; i < patternTokens.length; i++) {
    const patternToken = patternTokens[i];

    // Save state before attempting optional role
    const isOptionalRole = patternToken.type === 'role' && patternToken.optional;
    const mark = isOptionalRole ? tokens.mark() : null;
    const capturedRole = isOptionalRole ? patternToken.role : null;

    const matched = this.matchPatternToken(tokens, patternToken, captured);

    if (!matched) {
      if (this.isOptional(patternToken)) {
        continue;
      }

      // BACKTRACK: If previous token was an optional role that consumed
      // a token, undo it and retry current token
      if (i > 0) {
        const prevToken = patternTokens[i - 1];
        if (prevToken.type === 'role' && prevToken.optional && mark) {
          tokens.reset(mark);
          captured.delete(capturedRole!);

          // Retry current pattern token from restored position
          const retryMatched = this.matchPatternToken(tokens, patternToken, captured);
          if (retryMatched) continue;
        }
      }

      return false;
    }
  }

  return true;
}
```

**Problem with above:** `mark` is only saved for the current iteration, but we need it from the PREVIOUS iteration. Need to track previous mark.

#### Revised Step 1: Track previous optional state

```typescript
private matchTokenSequence(
  tokens: TokenStream,
  patternTokens: PatternToken[],
  captured: Map<SemanticRole, SemanticValue>
): boolean {
  // ... existing conjunction skip ...

  let prevOptionalMark: StreamMark | null = null;
  let prevOptionalRole: SemanticRole | null = null;

  for (let i = 0; i < patternTokens.length; i++) {
    const patternToken = patternTokens[i];

    // Before matching, save position if this is an optional role
    const isOptionalRole = patternToken.type === 'role' && patternToken.optional;
    const markBefore = isOptionalRole ? tokens.mark() : null;

    const matched = this.matchPatternToken(tokens, patternToken, captured);

    if (matched) {
      // Track this as the most recent optional consumption
      if (isOptionalRole) {
        prevOptionalMark = markBefore;
        prevOptionalRole = patternToken.role;
      } else {
        // Non-optional match succeeded — clear backtrack state
        prevOptionalMark = null;
        prevOptionalRole = null;
      }
      continue;
    }

    // Match failed
    if (this.isOptional(patternToken)) {
      continue;
    }

    // Required token failed — try backtracking
    if (prevOptionalMark && prevOptionalRole) {
      tokens.reset(prevOptionalMark);
      captured.delete(prevOptionalRole);
      prevOptionalMark = null;
      prevOptionalRole = null;

      // Retry current (failed) pattern token from restored position
      const retryMatched = this.matchPatternToken(tokens, patternToken, captured);
      if (retryMatched) {
        continue;
      }
    }

    return false;
  }

  return true;
}
```

#### Step 2: Tests

Add to `pattern-matcher.test.ts`:

```typescript
describe('backtracking', () => {
  it('should skip optional unmarked role when next literal needs the token', () => {
    // Pattern: [columns? (expression)] 'from' [source (expression)]
    // Input: "from users"
    // Expected: columns=undefined, source="users"
  });

  it('should still capture optional role when token is not the literal', () => {
    // Pattern: [columns? (expression)] 'from' [source (expression)]
    // Input: "name from users"
    // Expected: columns="name", source="users"
  });

  it('should handle optional role consuming multi-token expression', () => {
    // Pattern: [target? (expression)] 'to' [destination (expression)]
    // Input: "to #output"
    // Expected: target=undefined, destination="#output"
  });

  it('should handle consecutive optional roles before literal', () => {
    // Pattern: [a? (expression)] [b? (expression)] 'marker' [c (expression)]
    // Input: "marker value"
    // Expected: a=undefined, b=undefined, c="value"
    // Note: Only backtracks ONE step — b gets skipped, then marker matches
    //       If a consumed "marker", this is the nested case (Option C territory)
  });
});
```

#### Step 3: Verify no regressions

```bash
npm run test:check --prefix packages/framework    # 86 tests
npm run test:check --prefix packages/domain-sql    # 38 tests
npm run test:check --prefix packages/domain-bdd    # 39 tests
npm run test:check --prefix packages/semantic      # 3100+ tests (uses framework)
```

#### Step 4: Remove workarounds (optional)

Once backtracking works, domain authors could choose to use unmarked optional roles. The marker workaround remains valid and arguably more readable. No urgent need to change existing schemas.

---

## Scope & Limitations of Option B

**What it solves:**

- Single optional unmarked role consuming the next literal's token
- The most common failure pattern in practice

**What it does NOT solve:**

- Two consecutive optional unmarked roles before a literal (only the last one backtracks)
- Optional role consuming via complex expression match (possessive, method call, property access) — these consume multiple tokens and mark/reset might not fully clean up
- Deeply nested group backtracking

**Risk assessment:**

- Low risk to existing tests — adds a new code path that only activates when a required token fails after an optional role succeeded
- The backtrack-retry path is new code that could have bugs, but bounded to a single retry
- Confidence scoring: a backtracked match should not affect scoring since the optional role ends up uncaptured (same as if it never matched)

---

## Decision Points

1. **Should we implement this now?** The marker workaround is clean and well-documented. Backtracking is a correctness improvement but no domain currently requires it.

2. **If yes, Option B or Option A?** Option A is simpler but less general. If the goal is "fix the framework properly," Option B is better. If the goal is "unblock specific patterns," Option A suffices.

3. **Should backtracking affect confidence?** Probably not — an uncaptured optional role is the same whether skipped or backtracked. But worth confirming with `calculateConfidence()`.

---

## Estimated Effort

| Task                                         | Lines    | Time       |
| -------------------------------------------- | -------- | ---------- |
| Implement Option B in `matchTokenSequence()` | ~50      | 30min      |
| Add 4 backtracking tests                     | ~80      | 30min      |
| Run full regression suite                    | —        | 15min      |
| Update MEMORY.md                             | ~5       | 5min       |
| **Total**                                    | **~135** | **~1.5hr** |

---

## Implementation Status: COMPLETE

Option B was implemented as part of the domain-bdd expansion work (commit `c07a90d7`).

**What was done:**

- Bounded single-step backtracking in `matchTokenSequence()` (`pattern-matcher.ts:203-285`)
- `prevOptionalMark` / `prevOptionalRole` tracking with `mark()`/`reset()` on `TokenStream`
- Backtracking tests in `pattern-matcher.test.ts` (lines 370-540): unmarked optional before literal, with/without value, keyword-as-identifier, marker-group no-backtrack
- All regressions green: framework (90), domain-sql (38), domain-bdd (107)
- MEMORY.md updated with design pattern documentation

**Limitation confirmed:** Only the most recent optional role is backtracked (single-step). Multiple consecutive unmarked optional roles before a literal still require markers on all but the last. This is documented in MEMORY.md under "Framework Design Patterns for Domain Authors".
