# Plan: `pick-text-range` — the last 23 pairs (post-v2.8.0 execution)

> **Status: PLANNED 2026-07-19, execution NOT started. Do not begin before the
> v2.8.0 release (07-25) — arc 3 regenerates both baselines and the corpus.**
> Companion to the closed foreign-validity burndown
> (`HANDOFF_foreign-validity-burndown.md`). After Phases 1a–12 + the beep! fold,
> the ENTIRE residual of both canonical-validity gates is this one pattern:
> `pick-text-range` — 23 foreign pairs (`foreign-canonical-validity.json`) plus
> the single en entry (`canonical-validity.json`). Landing all three arcs empties
> both allowlists: **3059/3059**.

## Ground truth (probed 2026-07-19, not inherited)

- **The schema models the wrong command.** `pickSchema`
  (`packages/semantic/src/generators/command-schemas.ts`) is "select a random
  element from a collection" (roles patient/source). Canonical
  `hyperscript.org@0.9.93` `PickCommand` (`dist/_hyperscript.js:5979-6090`) is:

  ```
  pick [the]
    first  <count>            (of|from) <root>
    last   <count>            (of|from) <root>
    random [<count>]          (of|from) <root>
    (item|items|character|characters) <range> (of|from) <root>
        range: [at|from] (start | <expr>) [(to|..) (end | <expr>)] [inclusive|exclusive]
    match   [of] <re> [| flags] (of|from) <root>
    matches [of] <re> [| flags] (of|from) <root>
  ```

- **The corpus row** (all 24 languages) is the range variant:
  en `on click pick characters 0 to 5 of #note`.
- **The 23 translations are themselves broken, two ways:** the range `to` was
  authored as a DESTINATION marker (es `0 a 5`, it `0 in 5`, vi `0 vào 5`,
  th `0 ใน 5`, ru `0 в 5`), and the SOV rows are scrambled (ja
  `characters 0 を クリック で 選択 5 の #note に` — the 5 stranded; qu/tr/bn/hi/ko
  similar). `characters` is literal English in every language — **no dict has
  the word.**
- **Failure clusters** (triage harness): 17 SVO `Unexpected value: <<<EOF>>>` +
  5 SOV `Unexpected Token : 0` + qu `Expected one of: 'of', 'from'`.

## Arc 1 — en-side schema remodel + parse/render (clears the 1 en allowlist entry)

1. **Replace `pickSchema`** with the canonical model. Design decision to probe
   FIRST (do not pre-commit): how to encode variant/unit/range in semantic
   roles. Candidate: `variant` as a literal role (or fold into the action
   metadata), `quantity` for count, `patient` for the regex, `source` for the
   `(of|from)` root (matches the existing source role), and the range as either
   (a) two new roles (`rangeStart`/`rangeEnd` — extends the SemanticRole union,
   R1 vocabulary changes) or (b) ONE structured expression value carrying the
   canonical surface (`0 to 5`), which keeps the role union untouched and
   renders trivially. **Lean (b) until a probe shows the AST builder needs the
   endpoints separated** — R1 comparisons are Set-based on `role:valueType`, so
   (b) also minimizes R1 churn.
2. **en handcrafted patterns** for the corpus-exercised variant first
   (`characters <n> to <m> of <sel>`), then the remaining five variants behind
   the same schema. The `of/from` source connector reuses the existing
   of-possessive/source machinery — probe for collisions with `set`'s
   property-path `of` anchor.
3. **Render**: emit the canonical surface verbatim (`pick characters 0 to 5 of
   #note`). Update the ast-builder pick mapper
   (`packages/semantic/src/ast-builder/command-mappers.ts`).
4. **Gates**: en-render vitest gate's allowlist shrinks 1 → 0 (empty!); foreign
   allowlist UNCHANGED at 23 (vocab still missing — expected; do NOT try to
   clear foreign rows in this arc). en reference changes → R0/R1 move for all
   24 languages on this row → `--save-baseline` in the same PR.
5. **Out of scope, file as follow-up**: core runtime execution of the new
   variants (semantic parse/render is what the gates measure; check what
   `packages/core` `pick` actually implements and whether R2's curated subset
   should ever include it).

## Arc 2 — vocabulary (24 languages)

Truly-new words are fewer than the spike implied — probe each for duals before
registering (the ja `空` / bn `শেষ` lessons):

| Word | Status | Hazard to probe |
| --- | --- | --- |
| `item(s)` / `character(s)` | absent everywhere | plain nouns, likely clean |
| `start` | absent as range-keyword | may collide with event/behavior `start` surfaces (`draggable:start`) |
| `end` | **registered as block-end in every language** | the bn `শেষ` dual class — range-`end` needs a context gate, NOT a re-registration |
| `inclusive` / `exclusive` | absent everywhere | plain, likely clean |
| range `to` | **collides with the destination marker by design** | the es `0 a 5` corpus bug IS this collision; the pattern must bind range-`to` positionally (between two numeric/expr endpoints), never via the marker table |
| `first` / `last` / `random` | positional `first`/`last` already registered | reuse; `random` new |
| `match(es)` | registered as comparison operators (Phase 2) | variant-keyword vs operator dual — context gate at the pattern head |

Authoring path per language: i18n dict → semantic profile → tokenizer EXTRAS
where compounds shatter → `sync-keywords` (vite-plugin). The ambiguous-sense
anchor (Phase 12, `AMBIGUOUS_SENSES` in `expression-lexicon.ts`) is available
for render-side duals if a tokenizer registration is unsafe.

## Arc 3 — corpus re-authoring + baseline coupling (clears the 23)

1. Re-author the 23 translations against the arc-2 vocabulary: fix the
   range-`to` mistranslations and unscramble the SOV rows (the i18n
   transformer needs per-command pick render rules — the
   `i18n-renders-semantic-patterns-coevolve` lesson: per-command profile rules
   + paired semantic pattern variants, never a wholesale canonicalOrder
   extension).
2. `corpus-rewrites-couple-to-fidelity` applies in full: after `init-db.ts`
   edits, resweep, inspect lossy/exec rows (don't trust exit 0), regenerate
   `multilingual-priority.json`, prune `foreign-canonical-validity.json`
   23 → 0 with ADDED=0.
3. End state: **both allowlists empty; 3059/3059.** Update the closed-arc
   record + memory.

## Sequencing & risk

- **After 07-25 only** (arc 3 rewrites the corpus + both baselines; arc 1
  moves the en reference — none of it belongs in a release window).
- Arcs are strictly ordered (1 → 2 → 3); each is its own PR with the standard
  loop (build → suite → populate → both gates → prune → 9-signal ratchet →
  regen where intentional).
- Probe-first discipline: this plan inherits the arc's record — 15 of its
  handoffs' filings were refuted by probes. Every "likely clean" above is a
  claim to probe, not a fact.
