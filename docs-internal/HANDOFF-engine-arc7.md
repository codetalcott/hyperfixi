# Arc 7 brief — operators as table entries (step 4), re-measured

> Written 2026-09-04 on the tree that closes Arc 4c's numbered steps. Arc 7's
> steps 1–3 are done (step 1 rescoped the arc to one file, step 2 deleted the
> prose, step 3 landed with Arc 4c's opt-in tracker). What remains is step 4 —
> "operators as table entries with `compile`; the `ExpressionRegistry` on the
> scope goes away; tree-shaking is by fragment import" — and this brief
> scores its premises: **six claims: three hold, two are false, one is
> materially incomplete.** The false ones are the arc's stated MECHANISM
> for tree-shaking and its stated SIZE, and together they move step 4 from
> "small-medium" to a dependency of Arc 5.
>
> Nothing here has been started. Re-measure before costing; when a
> measurement falsifies a written claim, correct the doc in the same PR,
> struck through in place.

## How to re-measure

```bash
cd packages/core
grep -c "getExpr(" src/parser/runtime.ts                                               # 61 (28 inside evaluateBinaryExpression)
grep -n "case '" src/parser/runtime.ts | awk -F: '$1>945 && $1<1117' | wc -l           # 60 case labels, ~24 arms
grep -rn "_FRAGMENT\b" src/parser/pratt-parser.ts | grep "const"                       # 3 fragments, merged once into PARSER_TABLE
grep -rn "createExpressionRegistry(\|createFullExpressionRegistry(\|createCoreRegistry(\|createCommonRegistry(" src/compatibility/browser-bundle-*.ts | cut -d: -f1,2
grep -rn "collectionExpressions" src --include='*.ts' | grep -v test | grep -v "collection/index.ts"   # none — never registered
grep -rn "context\.registry" src --include='*.ts' | grep -v "test\|//\|\*"              # parser/runtime.ts + runtime-base.ts only
```

## The plan's claims, scored

| #   | Arc 7 step 4 claim                                                                                                                           | measured 2026-09-04                                                                                                                                                                                                                                                                                                                                                                                                                                                | verdict               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | "`evaluateBinaryExpression` switches on the operator string and then calls `getExpr('equals')` — the registry is indirection over a switch" | Holds, and it is bigger than one switch: `parser/runtime.ts:797-1117`, five `if` guards then a `switch` with 60 `case` labels (~24 arms, the rest aliases) and 28 `getExpr` calls; `getExpr` (`:74-87`) throws when `context.registry` lacks the name. **61 `getExpr` sites in the file** — the other 33 are in `evaluateIdentifier`, `evaluateUnaryExpression`, `evaluateCallExpression`, `evaluateSelector`, `evaluateContextReference`, `evaluateAsExpressionNode`, `evaluateBetweenExpression` and the possessive resolvers. | holds (61, not 28)    |
| 2   | "Fold the switch INTO the Pratt entries (`{ token, bp, compile }`)"                                                                          | No `compile` exists on any Pratt entry or expression implementation (grepped `parser/` and `expressions/`). The Pratt table is one file, `pratt-parser.ts` (879 lines), entries `{ prefix?: { bp, handler }, infix?: { bp, handler } }`. The binary switch is NOT the only semantic dispatch: `is a`/`is an` go to a `typeCheckExpression` node, `is between` to a `betweenExpression` node, `sorted by`/`mapped to`/`split by`/`joined by` to a `CollectionExpressionNode` — **four dispatch paths** beside the registry-backed switch. | materially incomplete |
| 3   | "The `ExpressionRegistry` on the scope goes away"                                                                                            | Its production readers are confined to `parser/runtime.ts` (`getExpr`, the `loadFullRegistry` fallback at `:655`) and `runtime-base.ts` (`prepareContext` injects it; two `evaluateExpression` sites thread it). Feasible on the reader side.                                                                                                                                                                                                                       | holds                 |
| 4   | "tree-shaking is by fragment import, which is how the Pratt fragments already shake"                                                         | **False.** Three fragments exist (`CORE_FRAGMENT`, `PARSER_COMPARISON_FRAGMENT`, `ASSIGNMENT_FRAGMENT`) and `mergeFragments` merges all three unconditionally into one `PARSER_TABLE` that `parser.ts:635` imports whole; the per-tier files the fragment doc comment names (`core.ts`, `blocks.ts`, `positional.ts`, `full.ts`) do not exist. Nothing shakes by fragment today. What DOES shake is the registry: `minimal-v2` builds `createCoreRegistry()` (3 categories), `standard-v2` `createCommonRegistry()` (5), the two `classic` bundles 6 of 7, `multilingual`/`semantic-complete` all 7 — and the seven hybrid/lite bundles use no registry at all. Step 4 deletes the one mechanism that shakes and depends on one that does not exist. | **false**             |
| 5   | Arc size "small-medium"                                                                                                                      | With claim 4, step 4 needs the evaluator split into per-category fragments FIRST (so a bundle can import `core` semantics without `positional`'s), and that is Arc 5's "tiers as fragment subsets" — extra-large, conditional. Step 4 alone, done as written, would pull all 77 implementations into every registry-using bundle and trip the bundle-size gate upward, or break the small bundles. | **false**             |
| 6   | Gate: "the bundle-size snapshot in both directions; the expression parity corpus"                                                            | Both exist: `scripts/bundle-size-snapshot.mjs --check` (±5 %) and `baselines/ast-equivalence.json` (229 fingerprints over `parser/__tests__/engine-corpus.ts`), plus the parity tests (`compatibility/expression-parity-phase{a,b,c}`, `logical/comparators-parity`). Note the AST-equivalence gate sees PARSE shape only; an operator's semantics moving from a registry entry to a table entry is invisible to it — the parity tests and the core suite are the semantic gate. | holds (with a caveat) |

## Findings the census turned up on the way (not in the plan)

- **`collection` is a registry-shaped category nobody registers.** Its five
  implementations (`where`, `sortedBy`, `mappedTo`, `splitBy`, `joinedBy`) are
  exported in the same shape as the others and never passed to
  `createExpressionRegistry`; `parser/runtime.ts:31-37` imports their
  evaluators directly. A second dispatch mechanism, already in the shape step
  4 wants — evidence that direct import works, and a dead registry shape to
  delete either way.
- **`special` and `mathematical` both define `addition` and `multiplication`.**
  `createFullExpressionRegistry` merges seven categories with last-write-wins,
  so `mathematical`'s clobber `special`'s in the full bundles, while the two
  `classic` bundles (which omit `mathematical`) run `special`'s. **They differ
  (measured 2026-09-04, step 0's first row):** `mathematical`'s wraps the
  result in `ensureFinite` (a non-finite sum or product is a failure) and
  validates `canBeNumeric` on both operands; `special`'s returns the raw
  `leftNum + rightNum` and only tracks. So `Infinity + 1` succeeds in the two
  `classic` bundles and fails in every full bundle — `+` means two things
  across bundles today.
- **The two `classic` bundles omit `mathematical` silently.** They still
  evaluate `+` because of the duplicate above. Delete the duplicate and they
  break — which is the kind of thing the bundle-compatibility matrix exists
  to catch, so add the row before touching it.

## The real shape of the work

Step 4 has a cheap half and an expensive half, and the plan wrote them as
one.

**The cheap half (do now, in Arc 7):** delete the indirection where no
tree-shaking depends on it. The `getExpr` lookups outside the binary switch
(33 sites: identifiers, unary, call, selector, context references, `as`,
`between`, possessives) resolve names that every registry-using bundle
registers (`references`, `logical`, `special` are in `createCoreRegistry`) —
those can import their implementations directly, the way `collection`
already does, with no bundle change. Then delete the `collection` registry
shape, resolve the `special`/`mathematical` duplicate (measure first), and
give the `classic` bundles an explicit `mathematical` so the omission is a
decision, not an accident. `context.registry` stays for the binary switch.

**The expensive half (Arc 5):** the binary switch's 28 lookups are what the
small bundles shake by. Folding them into table entries with `compile`
requires the semantic side to be composable per bundle — per-category
evaluator fragments merged like the Pratt fragments claim to be — and that is
Arc 5's tiering work. Until then `context.registry` and the switch stay,
because they are the shaking mechanism, however indirect.

## Decisions to put to the owner before the first PR

> **All three DECIDED 2026-09-04, each as recommended** (split; keep
> `mathematical`'s; delete `collection`'s shape). Steps 1 and 2 shipped the
> same day; step 3 follows.

1. **Split step 4** into the cheap half (Arc 7, now) and the expensive half
   (folded into Arc 5, conditional as Arc 5 is). Recommended: split. The
   alternative — doing it as written — trades a working shake for a
   nonexistent one.
2. **The `special`/`mathematical` duplicate**: keep `mathematical`'s (the
   dedicated category, and the stricter one — recommended) and delete
   `special`'s, adding `mathematical` to the two `classic` bundles; or keep
   `special`'s and delete the `mathematical` pair. They differ (finite-ness),
   so this is a behaviour choice for the `classic` bundles, not a cleanup.
3. **`collection`'s registry shape**: delete it (recommended — direct import
   is the shape step 4 wants and it is already the live path) or register it.

## Recommended order

| step | does                                                                                                                                                                                                                             | gate it leaves                                                              | size |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 0    | ~~Measure: do the two `addition`/`multiplication` pairs behave identically?~~ (measured: no — finite-ness). Which wins in each bundle is measured too (`mathematical` in full, `special` in `classic`). Left: add a bundle-compatibility row for `+`/`*` in every registry-using bundle. | the matrix row; the numbers in the plan                                     | S    |
| 1 ✅  | Resolve the duplicate (decision 2) and make the `classic` bundles' category list explicit.                                                                                                                                       | bundle-size snapshot (both directions); the new matrix row                  | S    |
| 2 ✅  | Delete the `collection` registry shape; its direct-import path is the documented one.                                                                                                                                            | escape/layering ratchets                                                    | S    |
| 3 ✅  | ~~Direct-import the 33 non-switch `getExpr` sites; `getExpr` shrinks to the binary switch's 28~~ — 23 core-set sites went static; 10 stay (`as`/`first`/`last`/`possessive` are bundle-omittable, three are dynamic name lookups). `getExpr` is 38.                                                                                                                                    | parity tests; core suite; bundle-size unchanged (same categories)           | M    |
| 4    | FILE the binary switch → table-entries fold under Arc 5, with this brief's claim 4 as the reason.                                                                                                                                 | plan text                                                                   | —    |

## Traps

- **A bundle's expression set is its registry call, not its imports.** Before
  deleting any `getExpr`, list which bundles register the name (`grep
  createExpressionRegistry(` per bundle); a name absent from `createCoreRegistry`
  cannot be direct-imported without growing the minimal bundle.
- **Last-write-wins in `createExpressionRegistry`.** Two categories exporting
  the same name is silent; grep for duplicate keys across
  `expressions/*/index.ts` exports before adding a category to a bundle.
- **The AST-equivalence gate sees parse shape only.** Moving semantics
  between a registry entry and a direct import leaves every fingerprint
  identical; only the parity tests and the core suite see it.
- **A probe on a stacked branch under-reports.** These numbers are from the
  tree with Arc 4c steps 2–5 applied; re-run the greps on `main`.
