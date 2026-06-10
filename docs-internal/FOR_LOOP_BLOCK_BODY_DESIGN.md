# `for`-loop block-body — Design Spike (Item C)

> **Status:** Design proposal for review. **No code yet** — this documents the
> problem, root-cause decomposition, options, and a recommended phased plan, per the
> multilingual sweep's agreement that the `for`-loop fix is structural and gated on a
> design review before implementation.
>
> **Prereq reading:** `ZH_BLOCK_BODY_SCOPE.md` (the #2 per-language `set` sweep this
> fell out of) and `MULTILINGUAL_ROADMAP.md` → Shipped.

## 1. Problem

`template-literal-list-build` is the last non-behavior, non-streaming pattern still
degenerate across languages. Its EN source:

```
on click set $html to "" then for item in $items set $html to `<li>${item.name}</li>` end then set #list.innerHTML to $html
```

After the #2 `set` sweep (zh/he/vi/qu/sw/ms), the surrounding `set`s recover, but the
**`for item in $items … end` loop body is still dropped** in the translated forms.
The EN reference parse itself only yields `{on, set, for}` — the loop's _inner_ `set`
isn't credited — so even EN is shallow here.

### Evidence (probe, `en → lang`, action sets)

| input                                                                     | result                                  |
| ------------------------------------------------------------------------- | --------------------------------------- |
| `for item in $items append item to #list end` (EN, standalone)            | `{for}` — **body dropped**              |
| `on click for item in $items append item to #list end` (EN, in event)     | `{on, for, append}` — **body recovers** |
| same, zh transform `为 把 item 在 $items 那么 追加 把 item 到 #list end`  | `{}` — **header doesn't parse**         |
| same, es transform `para item en $items entonces añadir item a #list end` | `{}`                                    |

Two distinct failures stack:

1. **EN/standalone:** the `for … end` _header_ parses (`for-en-basic`) but its **body
   is not attached** outside an event-handler context.
2. **Non-English:** the **header itself doesn't parse**, because the i18n transformer
   emits a mangled loop header.

## 2. Root-cause decomposition

### 2a. Transformer mangles the non-English loop header (i18n)

`GrammarTransformer` runs the `for item in $items` clause through its generic argument
parser, which:

- defaults the **loop variable** (`item`) to the `patient` role → marks it with the
  language's object marker. zh: `为 把 item 在 $items` — `item` wrongly gets `把`.
- inserts a spurious **then-connective** (`那么` zh / `entonces` es) _between the loop
  header and its body_ — there is no `then` in the English source; it's an artifact of
  how the clause boundary is rendered.

So the emitted header is, e.g., `为 把 item 在 $items 那么 …` instead of a clean
`为 item 在 $items …`. (`为` = `for`, `在` = `in`, `把` = object marker.)

### 2b. The semantic parser has no per-language `for`-header pattern (semantic)

Only English has a handcrafted `for` header pattern (`for-en-basic`:
`for {patient} in {source}`, `packages/semantic/src/patterns/en.ts:165`). Other
languages rely on the generated pattern from the `for` schema — which, given the
mangled header above (extra marker + spurious `then`), does not match. zh `for`-loops
**do not parse at all**, even with a hand-cleaned header (no `for-zh` pattern exists).

### 2c. Standalone loop bodies aren't attached (semantic, cross-language incl. EN)

The parser _does_ recover loop bodies — but only via the **event-extraction paths**
(`trySOVEventExtraction` / `tryMidStreamEventExtraction`, `semantic-parser.ts`
~L188–235), which are **gated to `BLOCK_BODY_ACTIONS` inside an event-handler**. A
`for … end` that sits in a **then-chain** (as in `template-literal-list-build`,
`… then for … end then …`) or **standalone** is matched as a bare `for` command and
its body is dropped. This is the same class as the documented "standalone then-chain
returns only the first command" limitation.

## 3. Why this is structural (not a contained pattern fix)

The per-language `set`/`fetch` fixes were contained because each was a single
handcrafted pattern absorbing a marker/keyword mismatch. The `for`-loop spans **both
packages and three mechanisms** (2a transformer, 2b per-language header patterns, 2c
loop-body attachment). Fixing only one leaves it degenerate:

- Fix 2b/2c without 2a → header still mangled, won't match.
- Fix 2a without 2b → clean header, but no per-language pattern to match it.
- Fix 2a+2b without 2c → header parses, but the body still drops in then-chains.

## 4. Options

### Option A — Transformer-side header fix (2a) + per-language `for` patterns (2b) + extend loop-body attachment to then-chains (2c)

The complete fix. Sub-parts:

- **2a:** teach `GrammarTransformer` that `for`'s loop variable is **not** a fronted
  object (don't apply the object marker) and don't inject a `then` between the loop
  header and body. This is the **same family** as the shipped #1 `applyPrimaryRole`
  fix (which already suppresses spurious object markers for literal/measure primaries)
  — extend the idea to the `for` loop-variable role.
- **2b:** add handcrafted `for-{lang}` header patterns (mirror `for-en-basic`) for the
  priority languages, or make the generated `for` pattern tolerate the surviving
  marker forms.
- **2c:** generalize the loop-body attachment so a `for/while/repeat … end` block in a
  **then-chain or standalone** position re-parses its trailing tokens as the body
  (mirror the event-handler `BLOCK_BODY_ACTIONS` recovery, minus the event gate).

**Pros:** actually fixes the pattern across languages; 2a also improves _display_
quality of every translated loop (not just parsing). **Cons:** largest blast radius —
2a touches the transformer's role model (every language's loop rendering) and 2c
touches the core parse loop (every standalone block). Both need the full A/B +
over-generation discipline used this session, ×many languages.

### Option B — Parser-only: per-language `for` patterns that _absorb_ the mangled header (2b only, tolerate the junk)

Write `for-{lang}` patterns that explicitly tolerate the BA-marked loop variable and
the spurious `then` (e.g. zh `为 把? {patient} 在 {source} 那么?`). Plus 2c for the
body.

**Pros:** contained to the semantic package (no transformer change), lower blast
radius, mirrors the `*-zh-ba` convention already in use. **Cons:** bakes the transformer's
bug into the parser (every language needs its own junk-tolerant pattern); does nothing
for display quality; still needs 2c.

### Option C — Defer; document and stop

The `for`-loop is 1 pattern across ~5 languages, all of which are otherwise healthy
post-#2. Behaviors/streaming dominate the remaining degenerate count and are
out of scope anyway.

**Pros:** zero risk. **Cons:** leaves the known gap; the fidelity metric stays
slightly understated for these languages.

## 5. Recommendation

**Phased Option A, transformer-first, one language at a time behind the gate:**

1. **Phase 1 (2a — transformer):** stop object-marking the `for` loop variable and
   stop injecting the spurious `then`. Validate display output + `--regression --full`
   with the per-language A/B (this is the highest-leverage, highest-risk step — it
   changes loop rendering for _all_ languages, so it must clear the gate alone first).
2. **Phase 2 (2c — parser loop-body in then-chains):** generalize the existing
   `BLOCK_BODY_ACTIONS` recovery to non-event positions. Gate as "can only add
   parses, never break standalone" — the same guard shape the SOV/mid-stream paths
   already use.
3. **Phase 3 (2b — per-language headers):** only if Phases 1–2 leave specific
   languages unmatched; add `for-{lang}` patterns as needed.

Each phase is its own PR with the full A/B discipline. If Phase 1's transformer change
proves too broad (regressions that can't be contained), fall back to **Option B**
(parser-only junk-tolerant patterns) for a contained — if less elegant — result.

## 6. Risks & validation

- **Over-generation (recall-blind):** every phase needs the per-language A/B (new vs
  stashed-old, same DB) that caught the he/sw `behavior-sortable` flips — fidelity
  alone will not show a phantom loop/command.
- **EN reference shallowness:** the EN parse of `template-literal-list-build` yields
  only `{on, set, for}` (the loop's inner `set` isn't credited). Improving the loop
  body parse may not move the _metric_ much even when correct — measure the action set
  directly, not just the gate's pass/fail.
- **Baseline:** an intentional fidelity change here means regenerating the committed
  baseline once (as done for ms), with a clean A/B confirming only the intended rows
  move.

## 7. Definition of done

- `for item in $items … end` recovers its body in standalone, then-chain, and
  event-handler positions, for EN + the priority languages.
- `template-literal-list-build` clears the degenerate list for the affected languages.
- `--regression --full` gate green; per-language A/B shows no phantom commands;
  baseline regenerated if fidelity intentionally shifts.
- Locked by `multilingual-roadmap-fixes.test.ts`.
