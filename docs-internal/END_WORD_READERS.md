# C3: one reader for an end word

Plan, 2026-10-13. Not started. M3's last item ([`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md) M3, "An end
word has nine readers"); with it done, the semantic work is done by the definition the owner confirmed on 2026-10-13,
and [`DOMAINS_RETHINK.md`](DOMAINS_RETHINK.md) is next.

## Why

The parser asks three questions of a word like `end` (es `fin`, tr `son`, ja `終わり`, bn `শেষ`):

1. **Does it close a block here?** (the block scanners, the clause walk, the fused handler's scan)
2. **Does a clause or a value stop here?** (the role capture, the value extent, the trailing-role scans)
3. **Is it a value here?** A variable spelled like it, as upstream reads `put end into #out` (es `poner fin en
   #out`).

Question 3 has one rule since PR 114: `endWordIsValue` (`parser/utils/expression-lexicon.ts`; `VALUE_READING.md`
C3). Questions 1 and 2 do not. Each scanner decides them itself, from one of nine definitions of "an end word", and
only some ask question 3 before answering. So each fix to the reading has had to find every reader:

- PR 114 found eight readers, and PR 117 found a ninth only by probing with the language's own loop verb;
- #1505 (`put … at end of me` in vi) had to change the role capture, the matcher and the custom-event pass;
- P58 is a reader that never got the `at end of` check the handler path has. `behavior B on click put "x" at end
  of me end` and `def f() put "x" at end of me end` are refused English to English (still true on 3ef6e5925);
- P53's `end` half: a variable named `end` fails all 12 of its value-matrix cells (505 pairs). `set x to end then
  put x into #out` is refused English to English.

The goal is one reader per question: one definition of the word, one function per question, and every scanner
calling them.

## Measured start (main 3ef6e5925)

**Nine definitions of an end word:**

| Definition | Where | Accepts |
| --- | --- | --- |
| `isEndKeyword(value)` | `clause-keywords.ts` | `end`, plus the curated set, or the profile's `end` words where no set is curated |
| `isEndWord(token)` | `utils/expression-lexicon.ts` | a keyword normalized `end`, or a curated word. No profile fallback |
| `isCuratedEndKeyword(value)` | `end-keywords.ts` | the curated set only |
| `isBlockEndToken`'s own test | `clause-keywords.ts` | `isEndKeyword`, or a keyword normalized `end` that no selector follows |
| `neverAValue`'s own test | `value-reading.ts` | a keyword normalized `end` that no selector follows, or a curated word |
| `isJsBlockTerminator` | `clause-keywords.ts` | `isEndKeyword` or the profile's `end` words (it scans raw JavaScript) |
| `isStrayTerminator` | `sov-clause.ts` | `isEndKeyword` or a normalized `end`; a selector after either keeps `last`; `closesTrackedBlock` wins |
| `keywordForms(language, 'end')` | `block-parser.ts` (8 uses) | `end` and the profile's words, by value or by normalized form, any token kind |
| `atClauseEnd` / `isValueBoundary` / `clauseEndsAt` | `pattern-matcher.ts`, `utils/value-extent.ts`, `value-reading.ts` | a keyword normalized `end`, or a curated word |

**About 60 call sites in 13 files.** Re-check: `grep -rnE
"isEndKeyword\(|isBlockEndToken\(|endWordIsValue\(|isCuratedEndKeyword\(|isEndWord\(|keywordForms\(language,
'end'\)|isJsBlockTerminator\(|isThenAt\(|neverAValue\(|endWordIsVariable\(|=== 'end'|!== 'end'" packages/semantic/src/parser`.
69 lines match, a few of them definitions or another `end` (pattern-matcher's range endpoint). By question:

- **Closes a block.**
  - Ask question 3 (through `isBlockEndToken`): `clause-walk.ts` (block collect, body depth, branch depth, the
    loop close), `event-handler-builder.ts` (the fused clause scan, three sites) and `loop-walk.ts`.
  - Have their own copy: `clause-walk.ts`'s body-walk `isEnd`, and the `at end of` check, three times.
  - Never ask it: `event-handler-builder.ts`'s `hasBlockBody`, `hasTrailingBody` and `closesLeadingLoop`,
    `sov-clause.ts`, and every `block-parser.ts` scanner (program split, behavior, def, feature, reactive `when`).
    The block-parser scanners are P58.
- **Stops a clause or value.**
  - Ask question 3: `neverAValue` (the role capture), the operator run (`pattern-matcher.ts`) and the fused
    handler's `isClauseBoundary`.
  - Never ask it: `atClauseEnd`, `isValueBoundary`, `clauseEndsAt`, `trailing-roles.ts` (twice),
    `clause-walk.ts`'s trailing scan, `event-handler-builder.ts`'s until-event scan, `coverage.ts` (twice).
- **Is a value.**
  - Use the one rule, `endWordIsValue`: the capture (`endWordIsVariable`), the join and the sense words
    (`expression-lexicon.ts`, four sites), tl's `tapos` (`isThenAt`).
  - Two of them build the place by hand. The sense-word site shifts the window by one (`{ prev: token,
    beforePrev: prev, next: afterNext }`).
  - The `at end of` copies read the word before from different windows: the pending clause (`clause-walk.ts`
    body walk) or the stream.

**Probes (re-check with the commands in Phase 0):**

- `endprobe-place.mts` (PR 114's whole-value places, 9 curated languages, plain render): 4 of 484 misread, all qu
  `repeat tukuy times`, read as an empty loop. Verified render: 0 of 484. Its `LOCALREPEAT=1` mode probes nothing
  now (0 cases), so Phase 0 repairs it.
- P58: 2 forms refused in en, es and ja (behavior and def). P53's `end` half: 505 failing value-matrix pairs
  (OPEN_ITEMS, 2026-10-06; re-measure in Phase 0).
- `semantic-parser.ts`: 751 lines.

## Target

- **One module**, `parser/end-words.ts`. It holds the curated sets from `end-keywords.ts` (with their audit notes)
  and every predicate below. It stays a leaf: registry, types, the `at end of` words from `patterns/put.ts`, and
  `endWordIsValue` (which stays where its helpers are, unless the import graph allows the move).
- **One definition**, `endWordKind(token, language)`, returning one of:
  - `'curated'`: by value, never the positional `last` (the audited sets);
  - `'end'`: a keyword normalized `end`, or a profile word. Before a selector it is the positional `last`
    (bn `শেষ <li/>`);
  - `null`.
- **One positional reading**, `isPositionalEnd(tokens, i, language)`: `last` before a selector (for `'end'` only),
  and the noun of `at end of` (English `at`/`at the` … `of`, and each language's words, vi `của tôi` among them).
- **Three questions, three functions**, each reading a place built by `endWordPlace(tokens, i)` only:
  - `closesBlockAt(tokens, i, language)`: an end word, not positional, not a value, or a token the clause walk
    marked `closesTrackedBlock`;
  - `endsClauseAt(tokens, i, language)`: a conjunction, `then` where it stands (`isThenAt`), or `closesBlockAt`;
  - `endWordIsValue(place, language)`, unchanged.
- **Named exceptions**, each with a comment saying why:
  - the js block's terminator, which scans raw JavaScript, where bn `শেষ` cannot be `last`;
  - anything Phase 0 shows is load-bearing.

## Method

- **Measure before moving.** For each phase, a temporary shadow patch computes the old answer and the new one at
  every site it touches, over every parity input and every probe, and logs where they differ: the site, the
  input, and both answers. The log decides whether the phase is behavior-preserving. Delete the patch before
  committing.
- **The oracles:**
  - `packages/semantic/scripts/parse-parity.ts`: 27,194 parses of every command-shape case and its render in
    every language. Save at the base, check on the branch;
  - the command-shape dry run (`tools/regen-command-shapes-baseline.ts --dry-run`);
  - the value matrix (its shards in testing-framework's suite);
  - `endprobe-place.mts`, plain render, and with the language's own loop verb;
  - the full local gate script, one job at a time, with the memory sampler running.
- **A behavior-preserving phase** shows 0 parity differences.
- **A behavior-changing phase** lists every parity difference in its PR, and each must be a reading that was wrong
  before: a variable now read as one, a P58 form now reading. It needs 0 command-shape pairs worse, 0 new
  value-matrix failures, and no rise in probe misreads.
- **Reader only.** No render changes while native review is out. The parity inputs include every render, so a
  changed render shows up as a changed input.
- **One PR per phase**, merged on green. Each PR records `semantic-parser.ts`'s line count, the definition count,
  and the C3 row in `VALUE_READING.md` as it stands.
- **Measure each site's change alone** and drop the edits that move nothing. PR 117 dropped two.

## Phases

**Phase 0: harness (scratch, nothing committed).**

- Repair `endprobe-place.mts`'s `LOCALREPEAT=1` mode and widen its templates to the block readers: an end word as
  a value inside an `if` body, a loop body, a behavior and a def. Add P58's forms.
- Write the shadow patch's logging helper.
- Save the parity snapshot at the base.
- Re-measure P53's `end` half: a scratch value-matrix run with `end` in `KEYWORD_NAMES`.
- Stamp every number above again on the base the arc starts from.

**Phase 1: one module, no behavior change.**

- Move the predicates into `parser/end-words.ts`, with bodies unchanged and call sites re-pointed.
- Fold the three `at end of` copies into `isPositionalEnd` only where the shadow log shows they agree. The
  clause walk's copy reads the pending clause, not the stream.
- Expected: 0 parity differences, and 9 definitions still (now in one file).

**Phase 2: one definition.**

- Replace the nine definitions with `endWordKind`. The differences the shadow log has to settle:
  - the profile fallback, which `isEndKeyword` has and `isEndWord` lacks (it, ru, th, vi, he, hi, ms, pl, uk);
  - block-parser accepting any token kind;
  - the selector lookahead (`isBlockEndToken` applies it to normalized words only, `sov-clause.ts` to both).
- Take the union where the log shows no disagreement. Where one definition is load-bearing, keep it as a named
  option on `endWordKind`, with the case that needs it.
- Exit: 1 definition, plus the named options.

**Phase 3: "closes a block" through `closesBlockAt`.**

- 3a: the readers already on `isBlockEndToken`, plus the clause walk's own copy. Expected: 0 parity differences.
- 3b: the readers that never asked question 3. Expected moves:
  - P58 reads (block-parser gains the position check);
  - an end-word variable inside a behavior or def body reads;
  - the fused handler's `hasBlockBody` / `hasTrailingBody` / `closesLeadingLoop` follow the clause walk.

  This is the riskiest step, because a block boundary decides which pattern wins (PR 117:
  `repeat-event-es-vso` is accepted only when an end word follows). Trace a surprising move by logging
  `new Error().stack` in the reader for that input.

**Phase 4: "stops a clause" through `endsClauseAt`.**

- Readers: `atClauseEnd`, `isValueBoundary`, `clauseEndsAt`, the trailing-role scans, the clause walk's trailing
  scan, the until-event scan, `coverage.ts`, `neverAValue` and the operator run.
- Expected: hand-written end-word variables read in more places (probe misreads fall), and nothing else moves.
- Watch cost: these run per token, and `endWordIsValue` reads the profile and the language's patterns
  (`markersAfterVerb` is memoized). Time the semantic suite before and after.

**Phase 5: places by index.**

- The join, the sense-word test and the capture build their place with `endWordPlace(tokens, i)`.
- Expected: 0 parity differences, or only the sense-word site's shifted window, each difference listed.

**Phase 6: docs and the exit stamp.**

- `VALUE_READING.md` C3: its Where column names one function per question.
- M3's "readers per question" stamped.
- OPEN_ITEMS: P58 closed if it reads; P53's `end` half re-measured. Add `end` to the matrix's `KEYWORD_NAMES` only
  if every lane passes; otherwise keep it out, with the new count.
- The roadmap says C3 done.

Phases 3b and 4 may each split again if the shadow log shows unrelated moves.

## Exit metrics

| Metric | Start | Target |
| --- | --- | --- |
| Definitions of an end word | 9 | 1 (+ named options) |
| Sites with their own "closes a block" test | 14 (9 more share `isBlockEndToken`) | 0: every one calls `closesBlockAt` |
| Sites with their own "stops a clause" test | 12 | 0: every one calls `endsClauseAt` |
| Of those, sites that never ask question 3 | 22 (13 block, 9 clause) | 0, except the named exceptions |
| Places built by hand | 2 | 0 |
| `endprobe-place.mts` misreads, plain render | 4 / 484 | ≤ 4, on the widened templates too |
| P58 forms refused | 2 | 0 |
| P53 `end` failing pairs | 505 (2026-10-06) | measured, lower |
| `semantic-parser.ts` | 751 | unchanged |

## Traps

- bn `শেষ` and ar `آخر` mean both "end" and the positional `last`; ja `終了`, ko `종료` and de `beenden` mean `exit`.
  The curated sets leave them out by audit. A definition that adds the profile's words for a curated language
  puts them back. Keep `'curated'` and `'end'` apart.
- tl `tapos` is both `then` and an end word (`isThenAt`).
- The `at end of` noun has a form per language, and `put.ts`'s `ofMe` is in it (#1505).
- Probe hand-written text with the plain render; the verified render writes `(fin)` and hides the misread. Probe
  with the language's own loop verb as well.
- `pattern-matcher.ts` cannot import `semantic-parser.ts`, so keep `end-words.ts` a leaf.
- A boundary change changes which pattern wins: permissive capture has done this before, so trust the parity
  diff, not the intent.
- Serialize heavy jobs and keep the memory sampler on. The semantic suite peaks near 3.7 GB, and the root
  `test:check` near 5 GB.

## Out of scope

- `if` as a variable (P53's other half).
- The fused handler path reading less than the clause walk (P60).
- `then` and `else`, which have the same kind of fragmentation but no open failures pointing at it.
