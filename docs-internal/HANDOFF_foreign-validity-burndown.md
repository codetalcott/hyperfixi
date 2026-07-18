# Handoff: foreign→English validity burndown (Phase 11 — post Phase 10)

Paste the block below into a fresh session to continue the arc. Everything above the
`---` is orientation for a human; the prompt itself starts after it.

**Arc state:** Phases 1a (#707), 1b + 3 (#711), **2 (the operator/copula slice, #718)**,
**4 (`no` + `references` drift + the condition locative, #719)**, **5 (the context
globals `document`/`window`/`detail`, #721)**, **6 (the `as` connective zh/hi + the
`beep!` possessive glue+leak, #723)**, **7 (three structural fixes: id `punya`
possessive-in-expression, focus-trap event-source-leak drop, swap SOV patient-first
with-word binding, #724)**, **8 (modal-close-escape pl/uk — hide's literal-only
`style` slot rejecting a reference, #725)**, **9 (qu/ru/uk null/undefined value-literals
the tokenizer never bound)**, and **10 (id/ko undefined value-literals + the qu
connector-joined dot-member possessive)** shipped. Foreign→English render validity
**90.7 % → 3000/3059 (≈98.1 %)**. **59 pairs across ~16 patterns** remain.
Companion scope doc: `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md`. Memory:
`foreign-validity-burndown-phase1.md`.

> **PHASE 10 SHIPPED (2 commits on `fix/foreign-validity-phase9`, 5 pairs, 2995→3000).
> The residual's own triage was wrong AGAIN — a 10th consecutive mis-filing.** Rebuilding
> the batch harness on the current 64 surfaced two clusters this doc filed as opaque:
>
> - **id `tidak_terdefinisi`→`undefined` (2: behavior-removable/sortable).** Filed under
>   "structural (no leak)"; actually the Phase-9 value-literal shape verbatim — the
>   underscore compound shattered into tidak(→not) + `_ terdefinisi` and rendered the
>   invalid `is not _ terdefinisi`. Whole-token EXTRAS entry; the id extractor's
>   underscore-recovery has NO length cap (unlike qu's), so the entry alone sufficed.
>   The registered sibling `tidakdidefinisikan` never fires — corpus authors the `_` form.
> - **ko `정의안됨`→`undefined` (2: behavior-removable/sortable).** Filed as an opaque
>   "ko 정" single; actually the same shape — 널→null was already registered and renders
>   in the SAME row, only the undefined half was absent. Whole-token EXTRAS entry;
>   4 chars fits the ko longest-first cap (6).
> - **qu `chaypaq.error` condition-seam possessive (1: fetch-error-handling).** The
>   Phase-7 `punya` connector-skip in `joinExpressionTokens` declines a DOT-MEMBER
>   property (`.error` fails `isBareWordHead`), so the connector leaked glued to the
>   member: `if it paq.error` ("Pseudo-commands must be function calls"). The value-slot
>   matcher (`tryMatchPossessiveExpression`) accepts the `.`-selector shape and strips
>   the dot — the put path in the SAME row already rendered `put its error into #error`.
>   Fix: the seam now fires the possessive anchor when a skipped connector is
>   source-adjacent to a dot-member (`its error`), gated on BOTH the connector and
>   adjacency so the no-connector glue path (`it.prop`, valid) and spaced class
>   selectors stay byte-identical. Guard tests in
>   `packages/semantic/test/expression-lexicon.test.ts` (Phase 10 block).
>
> All three: exact-2/exact-1 corpus occurrence verified, phantom-safe. Gates: foreign
> (CLEARED=5, ADDED=0) + en green; fidelity ratchet clean on all 8 signals; semantic
> suite 7366; test:affected green (domain-toolkit 0-test artifact only).
> **HARNESS FOOTGUN (fixed post-Phase-10 by the validity-infra PR): `loadCanonicalParser`'s
> validate used to have TWO failure channels — it RETURNED an error array (empty = valid)
> AND threw on tokenizer-level unknown tokens — so a try/catch-only harness misclassified
> 38/64 pairs as VALID. The contract is now single-channel: validate NEVER throws; the
> tokenizer throw folds into the returned array as a `threw: …` entry. Check
> `.length === 0`. The triage harness is also now COMMITTED
> (`packages/testing-framework/tools/triage-foreign-residual.ts`) — do not rebuild it
> from a recipe.**

> **PHASE 9 SHIPPED (1 commit `fix/foreign-validity-phase9`, 4 pairs, 2991→2995). It took
> a path THIS DOC DID NOT LIST — 4 clean value-literal data wins the doc mis-filed as
> "genuinely-blocked ambiguous-vocab" / dismissed as "scatter" (ru/uk `nothing` weren't
> even in the singles table).** The governing lesson, again: the doc's own triage of what
> is "blocked" vs "tractable" was wrong. Register the null/undefined value-literal the
> corpus author used in an `is null`/`is undefined` comparison — it leaked verbatim because
> the tokenizer never bound it:
>
> - ru `ничего`→`null` (behavior-sortable/ru), uk `нічого`→`null` (behavior-sortable/uk) —
>   plain-missing tokenizer EXTRAS entries; sibling `неопределено`/`невизначено`→undefined
>   was already registered, only the null half was absent.
> - qu `mana_riqsisqa`→`undefined` (behavior-removable/qu + behavior-sortable/qu) — the
>   underscore compound, `mana_kanchu`/`hatun_kay` precedent. **The EXTRAS entry alone did
>   NOTHING** (necessary-but-insufficient, like Phase 6): `quechua-keyword.ts`'s longest-first
>   scan caps at `maxKeywordLen = 12`, but `mana_riqsisqa` is 13 chars, so its whole-token
>   entry was never reached and it still shattered at `_` into `mana`(→false)+`_`+`riqsisqa`.
>   Second fix: bump the cap to 13. (`mana_kanchu`=11 fit the cap, which masked the bug.)
>
> Each of the three words occurs in exactly ONE corpus row (verified) and `null`/`undefined`
> are value literals not ActionTypes → phantom-safe.
>
> **CORRECTION to this doc's Phase-9 framing: window-keydown is NOT "lower-risk than swap."**
> Probed its AST: the ar/tl `if-event-<lang>-vso-verb-first` fused pattern has no event-SOURCE
> slot, and when `actionValue==='if'` the parser (`semantic-parser.ts` ~L1741) rewinds to the
> `if` keyword and re-parses `all.slice(ifIdx)` to END — in verb-first order (`if COND
> from-window on EVENT then BODY`) that re-swallows the already-captured `on keydown[..]` event
> head into the condition, emitting the DUPLICATE. That rewind-fold is SHARED by
> behavior-removable/sortable (the fused-if-event fidelity story); a fix risks the fold. Real
> regression risk for 2 pairs. **Both remaining named structural sub-bugs (window-keydown,
> swap) touch fidelity-critical shared paths — neither is a low-risk pick.**

> **PHASE 8 SHIPPED (1 commit on `fix/foreign-validity-phase8`, 2 pairs). It took the
> first of Phase 7's three deferred sub-bugs (modal-close-escape pl/uk) and, true to the
> arc, the handoff's own premise was wrong on the load-bearing detail.**
>
> - **modal-close-escape pl/uk (2 pairs).** Source `... ukryj .modal z okno ...` /
>   `... сховати .modal з вікно ...` = "hide .modal **from window**" rendered the invalid
>   `hide .modal with window`. Root cause: the handcrafted `hide-pl-full` / `hide-uk-full`
>   patterns (`packages/semantic/src/patterns/hide.ts`) carry an optional `z {style}` /
>   `з {style}` group whose `style` role token **omits the schema's `expectedTypes:
>   ['literal']`**. Polish `z` and Ukrainian `з` mean BOTH "with" (instrumental style) AND
>   "from" (ablative source), so `z okno` matched the style marker; with no type guard the
>   reference `window` (a reference since Phase 5) bound the literal-only style slot. Adding
>   `expectedTypes: ['literal']` to the two style tokens makes the reference fail the type
>   check → the optional group backtracks → `z okno` is left unconsumed and **dropped**,
>   which is exactly what es/de/en already do (en's `from window` is an event source the
>   parser discards by design; es/de leave `de ventana`/`von fenster` unconsumed because
>   their "from" word ≠ their "with" marker). Render becomes `hide .modal` — valid.
> - **The handoff's caveat was FALSE.** It said "`isTypeCompatible('reference',['literal'])`
>   is already false, so `okno` binds as a literal/identifier, not a reference — check the
>   captured type." Measured: `okno` binds as a **reference** (`{type:'reference',
>   value:'window'}`), and the type check never fired **because the handcrafted style token
>   had no `expectedTypes` at all** — the guard is present in the matcher (pattern-matcher.ts
>   line ~892) but skipped when the token declares no types. So the fix was not "override the
>   schema guard" but "give the token the constraint the schema already declares."
> - **PROBE FOOTGUN that hid this for a while: `node.roles` is a `Map`, and
>   `JSON.stringify(node)` renders a Map as `{}`.** A naive node dump shows every command with
>   `"roles": {}` and looks like the values live elsewhere; they don't. Deserialize Maps
>   (walk with `x instanceof Map`) before trusting a role dump — otherwise you cannot see the
>   captured `style: reference window` that IS the bug.
> - **it/ru/vi have the SAME latent gap** (their `hide-*-full` style tokens also omit
>   `expectedTypes`) but do not manifest: Italian `con`, Russian `с`, Vietnamese `với` are
>   "with" only; their corpora say "from window" with a different word (ru `из`), so the
>   style group never matches. Left untouched (no failing pair, no collision). If a future
>   corpus row collides there, apply the same one-line constraint.

> **PHASE 7 SHIPPED (3 commits on `fix/foreign-validity-phase7`, 10 pairs).** It
> refuted this doc's own "no shared root cause / accept 97.4 % as the practical
> ceiling" verdict — a batch triage harness (render+validate SEPARATELY, then cluster
> by the true leaked token/complaint) surfaced shared clusters the per-row prose triage
> hid. The efficient loop that found them: build the harness once, cluster, fix the
> largest true cluster, re-run the harness for an instant all-pairs delta, then gate.
>
> - **id `punya` possessive (4 pairs: computed-value/if-empty/input-validation/
>   two-way-binding).** `saya punya nilai` = "my value" rendered `my punya nilai` in
>   every `if`/`+`/paren expression: the value-slot matcher skips the
>   `possessive.connectors` word, but `joinExpressionTokens` (the raw-expression seam)
>   did not. Taught it to skip the connector. No-connector path byte-identical.
> - **focus-trap ar/tl (2 pairs).** KEY REFRAME: the parser drops a handler's
>   `from <source>` phrase BY DESIGN — en `on keydown[..] from .modal if …` itself
>   renders `on keydown[..] if …`. The foreign rows only differed by LEAKING the
>   untranslated source token (`source .modal` / `من window`). Excise the
>   `<source-marker> <value>` clause when it sits before the `<on-marker> <event>` head
>   and re-parse. Gated to CONDITION-LED heads (`arr[0]` → `if`) so a COMMAND source
>   (tl `alisin .active mula_sa .items kapag click`) is never touched — the looser
>   first cut regressed exactly those 4 tests.
> - **swap bn/hi/tr/qu (4 pairs).** `swap #a with #b`: the SOV patient-first pattern
>   binds the trailing element (#b) to `destination`, but its group only carried the
>   locative dest-marker — the corpus marks #b with the WITH-word (`#b से`/`#b দিয়ে`),
>   which never matched, so #b dropped (`swap with #a`). Added the 4 missing SOV
>   with-words to the swap `patient` markerOverride + merged that word into the
>   trailing group's alternatives for swap. ja/ko were unaffected (no override; already
>   valid via the coincidental instrumental で/로).
>
> **The arc's governing lesson held a 7th and 8th time.** Phase 7's own chosen target
> ("event-source fix, B+C = 6 pairs, one root cause") fragmented on probing into THREE
> separate bugs; only the leak-drop (focus-trap) shared the true root cause. And the
> swap "one renderer role-binding bug" was actually a pattern-GENERATION marker gap,
> split by pattern type (patient-first vs vso-verb-first). Probe the fix's PREMISE.

## What Phase 8 left — 2 named structural sub-bugs (4 pairs), each measured

These are NOT one root cause. Each is a distinct deeper bug, diagnosed but deferred.
(Phase 8 took the third — modal-close-escape pl/uk — see the PHASE 8 block above.)

- **swap ar/tl (2) — vso-verb-first pattern.** Unlike the SOV patient-first langs, the
  `swap-event-{ar,tl}-vso-verb-first` pattern puts the destination group BEFORE the
  event, but the corpus's with-element comes AFTER it (`استبدل #a عند نقر بـ#b`,
  `palitan_pwesto #a kapag click nang #b`). ar additionally glues `بـ#b` (bi-prefix).
  So the Phase 7 patient-first fix does not reach them. Needs the vso-verb-first swap
  pattern to admit a post-event with-element (+ ar `بـ`-glue tokenization). **Probed in
  Phase 8:** the pattern binds `#a`→`patient` and drops `بـ#b`/`nang #b` as unconsumed,
  rendering `swap with #a`; en binds `#a`→`destination`, `#b`→`patient` (`swap #a with
  #b`). Highest fidelity risk of the three (touches pattern GENERATION), so deferred.
- **window-keydown tl/ar (2) — event-DUPLICATION.** Phase 7 drops their source leak,
  but exposes a pre-existing bug: a condition-led VSO handler `if <cond> on <event>`
  emits the event twice — `on keydown[key=="s"] if event.ctrlKey on keydown [key=="s"]
  halt`. The event trigger is fronted AND left in the body. (focus-trap escapes this
  because its condition is a `matches` expr, parsed differently.) Reproduce with the
  bare reduced input `kung event.ctrlKey kapag keydown[key=="s"] pagkatapos huminto …`.

> **PHASE 6 SHIPPED — and, true to this doc's own governing lesson, BOTH its fix-site
> claims were incomplete; a probe caught each.**
>
> - **`as` connective (zh + hi), 2 pairs.** The reverse `CONNECTIVE_LEXICON` entries always
>   existed; the tokenizer shattered the compound before lookup. zh `作为` cleared with a
>   whole-token `CHINESE_EXTRAS` entry (longest-first beats the 1-char `为`→`for`). **hi
>   `के_रूप_में` did NOT clear from the EXTRAS entry alone** — the handoff's "only the
>   registration is missing" was wrong. `के` is a possessive PARTICLE, so
>   `HindiParticleExtractor` (registered ahead of `HindiKeywordExtractor`) peeled `के` off
>   before the underscore-recovery could see the whole run. The `आकार_बदलें` precedent works
>   only because its head `आकार` is not a particle. Fix = teach `HindiParticleExtractor` to
>   DECLINE when the run is an underscore-joined REGISTERED keyword
>   (`hindi-particle.ts` `underscoreJoinedKeyword`), so the keyword extractor claims it.
> - **`beep!` possessive glue+leak (bn/hi/ja/ko/tr), 5 pairs.** The handoff said "start from
>   `joinExpressionTokens`'s possessive anchor" — the anchor is INNOCENT and was never
>   called. The value took the SOV verb-anchoring fallback, whose `tokensToSemanticValue`
>   empty-string-glued the tokens AND skipped translation. Fix = route only the multi-token
>   fall-through through `joinExpressionTokens` (`semantic-parser.ts`). But that surfaced a
>   SECOND defect the handoff missed entirely: `beep!` tokenizes as `beep` + `!`, and the
>   canonical parser REJECTS the spaced `beep !` ("Unexpected Token : !"). So the join had to
>   GAIN a rule, not just preserve spaces — a source-adjacent leading `!` now glues like the
>   `.`-member rule (`expression-lexicon.ts`). **en is separately, pre-existingly broken**
>   (`set $x to beep! my value` → `set $x to beep`; `matchRoleToken` single-token capture
>   drops the tail) — DEFERRED, out of the foreign gate's scope. See § "What Phase 6 shipped".

> **PHASE 5 SHIPPED — and it disproved this doc's OWN Phase-5 diagnosis, which is why the
> two correction blocks that used to sit here are deleted, not preserved.** Every claim the
> deleted blocks made was measured false against the authored corpus:
>
> - **The fix site was NOT `matchRoleToken` / "role capture."** The doc's marquee claim —
>   "`repeat`'s `source` role captures the raw surface while `put`'s `destination` captures
>   the normalized English, in the same tree" — is a confound. Holding the role constant,
>   `repeat.source` renders `ボディ`→`body` perfectly. The comparison varied *registration*,
>   not *role*. The role is innocent; `matchRoleToken` was untouched.
> - **The real cause was one seven-name Set.** `DEFAULT_REFERENCES`
>   (`packages/intent/src/ir/references.ts`) knew `me/you/it/result/event/target/body` and
>   nothing else. A foreign `document` surface lexed as a keyword, failed `isValidReference`,
>   degraded to a `literal`, was rejected by the slot's `expectedTypes`, and leaked. `body`
>   round-trips because it is in that Set AND every profile; `document` was in neither. Fix =
>   widen the Set + the `ReferenceValue` union + add the surface to 20 profiles. **Zero logic
>   change.** (The "spiked and reverted, data alone insufficient" verdict was also a
>   confound: the spike registered the profile surface but never widened the Set.)
> - **It was 7 validity pairs, not 17; `window` was 0; `detail` was preventive.** The "17"
>   counted rows where `document` *appears*; most had unrelated blockers. `window`'s three
>   rows are structural (role misattachment / `من` leak / no-dict mangling), not data —
>   identical fail-set with and without it. `detail` never occurs as a bare reference in the
>   corpus (only `event.detail.message`), so it cleared nothing; it was registered for drift
>   reconciliation (it is already in core's `REFERENCE_KEYWORDS`).
> - **The real prize was invisible to the gate.** 58 corpus rows changed their render; only
>   7 flipped validity. The other 51 were already "valid" and silently wrong — es
>   `from documento` parses clean but listens on an undefined element. No R0–R3 signal and
>   no gate sees a bare-identifier role value; only the new unit test
>   (`packages/semantic/test/context-globals-references.test.ts`) does.
>
> **This is the arc's lesson one level deeper than the doc reached: it wrote "probe the fix,
> not just the claim," then shipped a fix-site claim that a five-minute probe refutes. Probe
> the fix's PREMISE too.** See the deleted-render-validity follow-ups and the § "What is
> left" table (now 87 pairs) below.

---

MISSION: Phase 11 of the foreign→English validity burndown. Authored non-English LokaScript
currently renders canonically-valid English **3000/3059 (≈98.1 %)**; **59 pairs across ~16
patterns** remain. Phases 2, 4, 5, 6, 7, 8, 9, and 10 are DONE. **The residual is fully
triaged** — the table in § "What is left" was produced by rendering all pairs and clustering
them by the canonical parser's actual complaint, so it is measured, not estimated. (The
ground-truth counts in `baselines/foreign-canonical-validity.json` —
`validAtGeneration`/`checkedAtGeneration` — are authoritative, not the prose percentage.)
After Phase 10 the residual is, per the fresh harness clustering: pick-text-range 23; the
blocked-vocab throw families (th `เป็น` 6, hi `है` 5, ja `空` 2, bn 6, plus singles hi
`नहीं`/`बदलने`, zh `没`/`执`, th `ป` — 24 total); ar `هو` copula 5; swap ar/tl 2;
window-keydown ar/tl 2; behavior-draggable tl 1 (`walang`, also structurally degraded);
if-exists tl/tr 2 (`may`/`var` exists-exclusions). Every named-tractable row is now shipped —
what remains is blocked vocab, the pick family (~3 arcs), and the two risky structural
sub-bugs.

> **EFFICIENT ITERATION — the Phase 7/8 engine, reuse it.** The fast inner loop is a batch
> triage harness (`packages/testing-framework/triage.ts`, deleted after each phase — recreate
> from the § "Reproduce the triage" recipe) that renders AND validates every residual pair
> SEPARATELY (the gate discards the render on a validate-throw), then auto-clusters by the
> true leaked token / parser complaint. Run it (~2 s, no gate) → attack the largest true
> cluster → re-run for an instant all-pairs delta (catches collateral clears AND
> regressions) → only when a cluster fully clears, run the slow outer loop (populate →
> `test:canonical` → fidelity ratchet → prune baseline → commit). This beats the per-row
> manual probing the earlier phases used, and it is what refuted the "no shared root cause"
> claim. **Phase 8 footgun to bake in: dump roles with a Map-aware serializer** — `node.roles`
> is a `Map`, so `JSON.stringify` shows `{}` and hides the very binding you are hunting.

**The vocabulary/expression slices are exhausted** and Phases 7–8 cleared the shared structural
clusters they found (id `punya`, focus-trap event-source-leak, swap patient-first, modal-close
hide-style-binding). What remains is: the **2 named structural sub-bugs above** (swap ar/tl
vso-verb-first, window-keydown event-duplication — 4 pairs, each a distinct deeper fix), the
**~24 deliberately-blocked ambiguous-vocab exclusions** (th `เป็น`, hi `है`, ar `هو`,
ja `空`, tl/tr/bn/hi/zh singles — genuinely hard, honest calls), the **23-pair
`pick-text-range`** family (spike verdict below: ~3 arcs, not one PR), and a scatter of
one-off per-row rows (bn `অথবা`/`এ` locative, qu/zh/hi singles). The realistic Phase 9 framing:
either take one of the 2 named structural sub-bugs (window-keydown is lower-risk than swap —
swap touches pattern GENERATION and its fidelity), or judge ≈97.8 % the practical ceiling and
pivot to the two preserved infra follow-ups (fold validity in as an R4 ratchet signal; bake
the parse-check into the `@hyperscript-tools/i18n` transpiler). **`form-submit-prevent` ar
was mis-diagnosed by earlier handoffs as mechanical — it is the ar `هو`→`it` copula exclusion
(renders `if result it false`), a genuinely-blocked ambiguity, not a registration-order win.**

**Phase 5 registered `document`/`window`/`detail` in one shared Set + 20 profiles — DO NOT
re-plan it.** It is drift reconciliation (core's `REFERENCE_KEYWORDS` and the parser's
`PROPERTY_ACCESS_BASES` already listed all three; only `DEFAULT_REFERENCES` and the semantic
`ReferenceValue` union lagged). Cleared 7 pairs and 51 gate-invisible silent corrections.
Named follow-ups it left, all preserved below: (a) three more desynced reference lists
(`semantic-parser.ts:4149` live; two `isBuiltInReference` copies test-only); (b) the
`window's scrollY` lossy-possessive round-trip; (c) `detail` bare-reference has no corpus
row yet.

**THE ARC'S GOVERNING LESSON, which this doc has itself violated four times: PROBE THE
CLAIM BEFORE YOU PLAN AROUND IT — AND PROBE THE FIX'S PREMISE.** Every phase found a
load-bearing falsehood in its own handoff — a "case-sensitive" lookup that lowercases, a
cautionary example that does not reproduce, three "dead on arrival" languages that all
worked, a defect count 5× too high, a 17-pair family that was 7, and a marquee "role
capture" fix-site that a single same-slot probe (`ボディ`→`body`) refutes. Each was one probe
away from being caught. **Including the claims in this paragraph.**

READ FIRST (in order):

1. § "What is left" below — the triage. It supersedes every earlier prose estimate.
2. `packages/testing-framework/baselines/foreign-canonical-validity.json` — the
   committed allowlist (68 pairs / ~17 patterns after Phase 8). It ratchets BOTH ways: a
   pair you clear must be pruned, or the gate fails on a stale entry.
3. `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` — the spec, § "Where the
   burndown stands".
4. `packages/semantic/src/parser/utils/expression-lexicon.ts` — the shared expression
   seam. Phase 4 closed its last call-site gap; **it is unlikely you need to touch it.**

## What Phase 2 established (do not re-derive)

- **The fix was profile DATA, not a new mechanism.** `surfaceOf`
  (`expression-lexicon.ts:371-372`) emits a token's `normalized` English form **iff it
  lexed as a keyword**; anything else leaks verbatim. So the whole copula/operator gap
  was *missing `profile.keywords` entries*. No slot parameter, no `COPULA_LEXICON`, no
  renderer change. Three PRs, zero logic changes (bar one dead-code removal), 70 pairs:
  `matches` ×13 profiles → 15 pairs, `exists` ×13 → 13, `is` ×10 → 42.
- **A slot parameter would not have worked anyway.** `es` is Spanish `is`
  (`spanish.ts`) but German `it` (`german.ts`). That is a *language* axis, not a slot
  axis; the profile is already the per-language axis.
- **`is`/`exists`/`matches`/`no` are phantom-SAFE**, unlike `empty`. `empty` is both an
  ActionType (`types.ts`) and a command schema (`command-schemas.ts`) — that is why ja
  `空` injected a phantom command (`japanese.ts:108-111`). The operators are neither, so
  no pattern is generated from them. Verify for any new word; don't assume.
- **`CONDITION_COPULAS_SURFACE` (`semantic-parser.ts`) is down to 3 entries** (ar هو /
  th เป็น / hi है) — exactly the three the copula slice could not register, because each
  is ambiguous with another sense. It is no longer a general mechanism.
- **Deliberate exclusions, each ambiguous with another sense** (all cost real pairs; all
  are the honest call): ar هو=`it`, hi है=`has/have`, th เป็น=`as` (copula); bn আছে=`has`,
  tl `may`/tr `var`=`has/have` (exists). ar is *structurally* impossible regardless:
  `profile.references` is registered AFTER `keywords` (`base-tokenizer.ts`), so an ar
  `is` entry is silently overwritten.
- ja `である` does **NOT** split, contrary to an earlier claim. It is registered and clears.
- **The ratchet's tolerances can hide a small regression.** `avgFidelity` tolerance 0.02
  averaged over ~133 patterns cannot see one pattern dropping to fid 0.75 (0.25/133 ≈
  0.002), and the lossy-flip counter has tolerance 3. When a change has a *named*
  single-pattern hazard, probe that pattern directly. (Phase 2 did: the copula slice
  removed ja/bn's escape from the ko-class "guard swallows the then-branch verb" bug.)

## What Phase 4 shipped (three PRs, 30 pairs, 124 → 94)

All three are DONE. Recorded here because each corrected something this doc asserted —
**the doc's own claims were the least reliable input to the arc.** Every correction below
was verified against the AUTHORED corpus rows, not reasoned from the code.

**1. `no` — `behavior-draggable` 20 → 9 (11 pairs).** Pure profile data, Phase 2's shape.
Registered in 16 languages.

- **The "dead on arrival" call was wrong for all three.** id `tidak_ada` and qu
  `mana_kanchu` clear via a whole-token tokenizer EXTRAS entry (the `ubah_ukuran` /
  `hatun_kay` precedent — the keyword walk sorts longest-first, so the compound beats the
  `_` split); ar `لا يوجد` clears via the base tokenizer's multi-word keyword walk (the hi
  `मेل खाता` precedent). **id and qu cleared the gate outright.** The lesson: "the
  tokenizer splits it" is not a reason to give up — check for a whole-token precedent.
- **The ja `ない` hazard is real in principle but does not fire.** `ない` has blast radius 3
  and the dict's `not` (`ではない`) is unregistered, so the particle extractor peels で/は and
  can land on a bare `ない`. Probed: `unless-condition` (protected by `ない限り`, longest-first)
  and `fetch-do-not-throw` both render byte-identically before and after.
- **bn is not lexical.** Its dict has no `no`, so its row already carries literal English
  `no` and renders it correctly; it fails structurally. The ceiling was 19, not 20.
- The hi/zh/tl exclusions stand, but the reason is **dict-level**, not a profile
  collision: those profiles never register the surface — the DICT maps two senses to one
  (`hi not:'नहीं'` AND `no:'नहीं'`), so registering it as `no` would mistranslate every
  `not`/`without` in those corpora. es `not:'no'` was a non-issue as written.

**2. `references` drift — `modal-close-backdrop` 2 → 0, `focus-trap` ja (3 pairs).** Three
tokenizer EXTRAS lines + `matches` for ar/ja. **Both reasons this doc gave for deferring it
as a CODE change are FALSE:**

- **The lookup is NOT case-sensitive.** `lookupKeyword`/`isKeyword` both `.toLowerCase()`
  (`packages/framework/src/core/tokenization/base-tokenizer.ts` — note this doc pointed at
  a path that does not exist; `packages/semantic/src/parser/base-tokenizer.ts` is a
  re-export). The cited `:633-634` is a COMMENT inside `tryMultiWordKeyword`, which only
  handles space-containing keywords and which German never reaches. **The whole de
  sub-family was a non-issue** — de renders `body`/`target` correctly today.
- **No type change was needed.** The per-language `*_EXTRAS` array already supports
  alternates and overrides profile entries (precedent: `japanese.ts` `私`→me).
- **The stated cautionary example does not exist.** de/fr/pt `if-exists` do NOT "clear
  while still leaking `körper`/`ça`/`isso`" — probed against the authored rows, all three
  render byte-identically to en (`körper` via the case-insensitive lookup, `ça`/`isso` via
  existing EXTRAS).
- Of the 16 "drifted" entries only **3 actually leak** (ar `نتيجة`/`هدف`, ja `対象`); the
  rest are absorbed by the case-insensitive lookup, EXTRAS, `possessive.keywords`, or a
  profile keyword. 16 was right as a text-diff and ~5× too high as a defect count.

**The operand+operator coupling was REAL, and is the arc's one durable lesson.** The
condition is captured as a raw string; ar/ja's *unparsed* condition was silently dropped,
so `hide` ran unconditionally and coincidentally matched the en DOM effect —
`modal-close-backdrop` ar/ja passed R2 **by accident**. `matches` alone would parse the
condition into a real comparison whose operand evaluates to undefined, stopping `hide` and
flipping R2 pass→fail at tolerance 0. Both together render byte-identical to en. Only R2
can see this class.

**3. Condition locative — `focus-trap` 19 → 3 (16 pairs, incl. a `last-in-collection tr`
bonus).** The diagnosis in this doc was RIGHT; two details were not.

- **`surfaceOf` has THREE failure modes, not two:** verbatim leak, role-name leak, and
  wrong-sense-normalized leak (bn `শেষ`→`end`, out of scope — a dict realign).
- **The prescription omitted anchor ORDER, which is load-bearing.** The new anchor must sit
  AFTER the of-possessive anchor so it can only claim runs the earlier anchors declined
  (provably additive). Positional-first would flip `<positional> <sel> <of-marker> <sel>`
  away from `<sel> of <sel>`, and for a marker absent from `LOCATIVE_SURFACES` (zh `的`,
  ja `の`) `toEnglishLocative` falls through to the VERBATIM surface — worse than the leak.
- No data was added: `toEnglishLocative` / `LOCATIVE_SURFACES` /
  `ROLE_CONCEPT_TO_ENGLISH_LOCATIVE` already covered both classes. It was purely a
  call-site gap. `matchPositionalRun` now serves both seams.
- The run returns `{text, token}` pairs, not strings: the two callers join differently
  (role seam = plain space; the raw join needs SOURCE POSITION for `.`-glue). Bare strings
  would silently render `previous <input/> .value` inside conditions.

## What is left (68 pairs after Phase 8; **59 after Phase 10** — net out behavior-removable id/ko, behavior-sortable id/ko, fetch-error-handling qu, and note the "ko `정`" single was really `정의안됨`) — MEASURED, not estimated

Produced by rendering all allowlisted pairs and clustering by the canonical parser's actual
complaint. **Reproduce it before trusting it** (recipe at the end of this section). Phase 5
removed the `document` row (7 pairs); `window` proved structural, not data. Phase 6 removed
the `beep!` row (5) and the zh/hi half of the `as` row (2). **Phase 7 removed id `punya`
(4: computed-value/if-empty/input-validation/two-way-binding), focus-trap ar/tl (2), and swap
bn/hi/tr/qu (4)** — 10 pairs. **Phase 8 removed modal-close-escape pl/uk (2).** The table below
is the PRE-Phase-7 snapshot; net-out the 12 Phase-7/8 clears and the two remaining deferred
sub-bugs (swap ar/tl, window-keydown tl/ar) documented at the top when reading it. A FRESH
Phase-8 triage of the current 68 confirmed the clustering: pick-text-range 23 (`pick
characters` 17 + `pick 0` 5 + qu 1), th `เป็น` 6, hi `है` 5, then 2s and singles.

| # | Family | Kind | Where |
| --- | --- | --- | --- |
| 23 | `pick-text-range` | deferred, ~3 arcs | all but en |
| 21 | structural (no leak) | per-row | see list below (modal-close-escape pl/uk cleared in Phase 8) |
| 5 | hi `है` (=has/have) | blocked | `behavior-removable`, `behavior-sortable`, `form-submit-prevent`, `if-empty`, `input-validation` |
| 5 | th `เป็น` (=as/is) | blocked | same five patterns |
| 2 | `window` — structural, NOT data | per-row | `window-keydown` ar · `window-resize` th (modal-close-escape uk cleared Phase 8) |
| 2 | ja `空` (=empty) | phantom-blocked | `if-empty`, `input-validation` |
| 2 | bn `অথবা` | ? | `behavior-draggable`, `behavior-sortable` |
| 2 | bn `এ` (locative) | dict realign | `focus-trap`, `last-in-collection` |
| 1 | th `เป็น` (=as, copula) | blocked | `computed-value` th (id is separate structural, below) |
| 7 | singles | various | hi `नहीं`, ko `정`, bn `এর`/`আছে`, ar `من`, zh `执行`, hi `बदलने` |

### 1. DONE (Phase 5) — `document`/`window`/`detail` context globals — 7 pairs, pure data

**Shipped. Left here so no future session re-spikes the wrong fix.** Cleared 7 validity pairs
(`behavior-draggable` ar/ja/ko/ru/uk, `behavior-sortable` ja/zh) plus **51 gate-invisible
silent corrections** (es `from documento` → `from document`, etc.). Validity 96.9 % → 97.2 %.

**The fix, in full:** widen `DEFAULT_REFERENCES` (`packages/intent/src/ir/references.ts`) with
`document`/`window`/`detail`; extend the `ReferenceValue` union (`packages/semantic/src/types.ts`);
add the three surfaces to `references` in the 20 profiles whose dict carries them (skip
bn/he/th/vi — no dict entry; they author literal English `document` and already round-trip).
Update the count assertion in `packages/framework/src/ir/references.test.ts` (7 → 10). Guard:
`packages/semantic/test/context-globals-references.test.ts`. **Zero logic change.**

**Named follow-ups (do NOT fold into a `beep!`/`as` PR):** three more desynced reference
lists — `semantic-parser.ts:4149` (LIVE if-chain), and two `isBuiltInReference` copies
(`packages/semantic/src/parser/utils/type-validation.ts:142`,
`packages/framework/src/core/pattern-matching/utils/type-validation.ts:132`, test-only) —
none on the fix's path, but they should route through `isValidReference` so the next widening
can't desync; the five parallel `protocol/` lists (ts/py/rust + ABNF, out of the workspace,
nothing breaks but the sense now differs); and the `window's scrollY` lossy-possessive
round-trip (`set x to body's scrollTop` → `set x to body` — pre-existing for `body`, now
extended to window/document; no corpus row exercises it, `window-scroll` keeps it in an `if`
condition, verified VALID). `detail` has no bare-reference corpus row — its registration is
preventive drift-reconciliation only.

### 2. DONE (Phase 6) — The `as` connective — zh + hi cleared (2 pairs); th deferred

**Shipped.** zh `作为` (rendered `作 for Number`) and hi `के_रूप_में` (rendered
`के _ रूप _ में`) now render `as Number`. The reverse `CONNECTIVE_LEXICON` entries already
existed; the tokenizer shattered the compound before lookup.

- **zh** — whole-token `CHINESE_EXTRAS` entry `{作为→as}`; longest-first beats the 1-char
  `为`→`for`. Pure data, as expected.
- **hi** — the EXTRAS entry `{के_रूप_में→as}` was **necessary but NOT sufficient** (the
  "`ubah_ukuran`/`mana_kanchu` precedent is the fix" claim was wrong). `के` is a possessive
  PARTICLE, so `HindiParticleExtractor` (registered ahead of `HindiKeywordExtractor`) peeled
  it off before the underscore-recovery ran. `आकार_बदलें` works only because `आकार` is not a
  particle. Second fix: `HindiParticleExtractor.underscoreJoinedKeyword` declines when the
  run is an underscore-joined REGISTERED keyword, ceding it to the keyword extractor.
- **th `เป็น` — still deferred.** BOTH `as` and copula `is`; a blanket entry rewrites every
  Thai `is`. `computed-value` th remains allowlisted (1 pair). Would need slot-sensitive
  disambiguation (resolve to `as` only before a type name) — NOT attempted.
- **`computed-value` id is unrelated** — it renders `as Number` fine; it fails on the
  possessive tail `my punya nilai` (structural, § 5), so it stays allowlisted.

### 3. DONE (Phase 6) — `beep!` possessive glue+leak — all 5 cleared

**Shipped.** `beep-debug-expression` bn/hi/ja/ko/tr now render the canonical `beep! my value`.
The handoff's premise was doubly wrong:

- **`joinExpressionTokens`'s possessive anchor is INNOCENT and was never called** for this
  value. The `beep!`-headed run fails every generated `set` pattern, so the clause takes the
  SOV verb-anchoring fallback, whose `tokensToSemanticValue` empty-string-glued the tokens
  (`beep!私の値`) AND skipped translation. Fix = route only the multi-token fall-through
  through `joinExpressionTokens` (`semantic-parser.ts`); the possessive anchor then fires.
- **A second defect the handoff missed:** `beep!` tokenizes as `beep` + `!`, and the
  canonical parser REJECTS the spaced `beep !` ("Unexpected Token : !"). So the join had to
  GAIN a rule — a source-adjacent leading `!` glues like the `.`-member rule
  (`expression-lexicon.ts`). "The join loses its spaces" was only half the story; it also had
  to STOP adding one.
- **en is separately, pre-existingly broken and DEFERRED.** `set $x to beep! my value` →
  `set $x to beep` (the `matchRoleToken` single-token slot capture drops `! my value`;
  `beep` alone is a valid canonical identifier, so en is not in the en-render allowlist).
  Fixing it means folding `beep! <expr>` as an expression prefix in
  `pattern-matcher.ts` value-slot capture — a different root cause on the primary parse path
  for all languages. Named follow-up; clears **0** foreign gate pairs (the foreign gate never
  renders en→en).

### 4. Deliberately blocked (12) — do NOT "fix" without reading why

- hi `है` (5) and th `เป็น` (5) are the copula slice's **named ambiguous exclusions**
  (`है`=has/have, `เป็น`=as). Registering either mistranslates every `has`/`as` in those
  corpora. Only a slot-aware disambiguation helps, and Phase 2 established the slot axis
  is the WRONG axis (`es` is Spanish `is` but German `it`). Treat as genuinely hard.
- ja `空` (2) is the **phantom-injection word** (`japanese.ts:108-111`): `empty` is both an
  ActionType and a command schema, so registering `空` injects a phantom command. This is
  the one place the "register the surface" reflex is actively wrong.

### 5. Structural, no leak (23) — per-row, no shared root cause

**PRE-Phase-7 snapshot — net out the Phase 7/8 clears:** Phase 7 cleared focus-trap ar/tl,
swap bn/hi/tr/qu, id `punya` (computed-value/two-way-binding); Phase 8 cleared
modal-close-escape pl/uk. Phase 7 also refuted the "no shared root cause" header — several of
these DID cluster by symptom (leaked token / parser complaint) once triaged that way.

`behavior-removable` ar/id/qu · `behavior-sortable` qu · `computed-value` id ·
`fetch-error-handling` qu · `focus-trap` tl · `form-submit-prevent` ar · `if-empty` ar/id ·
`if-exists` tl/tr · `input-validation` ar/id · ~~`modal-close-escape` pl~~ (cleared Phase 8) ·
`swap-content` ar/bn/hi/qu/tl/tr · `two-way-binding` id · `window-keydown` tl

Known shapes: `focus-trap` ar/tl (stray `من .modal`/`source .modal`, displaced
`[key=="Tab"]`) · `swap-content` ar `بـ#b` fusion · id `saya punya nilai` → `my punya nilai`
(the possessive head translated, the rest left) · `form-submit-prevent` ar, blocked by the
**registration ORDER** (`profile.references` registers AFTER `keywords`,
`base-tokenizer.ts:502` vs `:482`, so an ar `is` entry is silently overwritten — a code
change, plausibly the last mechanical win).

### Reproduce the triage

**The harness is now COMMITTED — do not rebuild it from a recipe:**

```bash
npm run populate --prefix packages/patterns-reference   # fresh DB first
npx tsx packages/testing-framework/tools/triage-foreign-residual.ts [--detail out.json]
```

It renders and validates every allowlisted pair SEPARATELY and clusters by the
canonical parser's actual complaint (~2 s, no gate). `--detail` dumps
source/rendered/errors per pair. Since the validity-infra PR, `validate` never
throws (tokenizer-level `Unknown token` throws fold into the returned error array
as `threw: …` entries) and the gate reports the render WITH the failure instead
of discarding it as `(threw)`.

Grep the render for non-ASCII to find the leak — in a 20-line behavior body the bad token
is one word on one line, and the parser only reports a single CHARACTER.

## SPIKE VERDICT: `pick-text-range` — keep deferred, and the docs' reason was wrong

The old framing ("a named R1 deferral: pick range-role modeling", "one en-side fix
clears 23 foreign + 1 en") is **wrong on both counts**. It is not one fix, and it is not
range-roles. It is four coupled efforts:

1. **The schema models the wrong command.** `pickSchema` (`command-schemas.ts:2598`) is
   *"Select a random element from a collection"* with roles patient/source
   (`pick <item1>, <item2>` / `pick from <array>`). Canonical hyperscript's `pick`
   (`hyperscript.org@0.9.93`, `dist/_hyperscript.js:5979-6090`) is a different command
   with **6 variants** (`first`/`last`/`random`/`item(s)`/`character(s)`/`match(es)`),
   each with its own arg shape, plus a range sub-grammar
   `[at|from] (start|<expr>) [to (end|<expr>)] [inclusive|exclusive]`.
2. **The vocabulary does not exist in ANY language.** No dict defines `characters`,
   `items`, `random`, `start`, `end`, `inclusive`, or `exclusive`. The corpus proves it:
   all 23 translations leave `characters` in **literal English**.
3. **The corpus rows are themselves broken.** The range `to` was translated as a
   DESTINATION marker (es `0 a 5`, it `0 in 5`, vi `0 vào 5`, th `0 ใน 5`, ru `0 в 5`),
   and the SOV rows are scrambled (ja `characters 0 を クリック で 選択 5 の #note に`,
   qu, tr, bn, hi, ko). Re-authoring them couples to the fidelity baseline
   (memory: `corpus-rewrites-couple-to-fidelity`).
4. **R1 would move** — the roles change shape.

So the en fix alone clears **1** pair (the en allowlist entry), not 24; the 23 foreign
pairs additionally need (2) and (3). Budget it as ~3 arcs, not one PR. It remains the
sole entry in `baselines/canonical-validity.json`.

## Also true (verified, corrects the record)

- The residual is **20 patterns / 87 pairs** after Phase 5 (`document` cleared 7 across
  `behavior-draggable`/`behavior-sortable`, but neither pattern left the allowlist — both
  keep other-language failures). It was 20 patterns / 94 pairs after Phase 4, 21 before, and
  never the 19 the pre-Phase-2 handoff and the scope doc both claimed.
- The sibling **en-render burndown is DONE** — `canonical-validity.json` holds exactly
  **1** entry (`pick-text-range`), not the 22 that `HANDOFF_render-validity-burndown.md`
  described. That doc is deleted; its two still-live follow-ups are preserved below.
- `repeat-until-event` fr/it/zh/pl is **NOT** a real family — it was stale-dist/stale-DB
  noise. A freshly populated DB reproduces the committed baseline exactly.
- `marker-templates.ts` is dead code (zero importers) despite `semantic/CLAUDE.md`.
- **This doc has been the arc's least reliable input.** Phase 4 found a false premise in
  every family it touched (a "case-sensitive" lookup that lowercases; a cautionary example
  that does not reproduce; three "dead on arrival" languages that all work; a defect count
  ~5× too high). All were cheap to disprove with one probe against the authored corpus.
  **Probe the claim before you plan around it** — including the claims above.

## Preserved follow-ups (from the now-deleted render-validity handoff)

- ~~**Fold validity in as an R4 signal** on the ratchet CLI (`--regression`)~~ — **DONE**
  (validity-infra PR): the CLI's `--regression` now runs the foreign validity check
  against the committed allowlist as the R4 ratchet (new invalid pair OR stale
  allowlist entry both fail; full mode only). The en-side check remains vitest-only
  (its allowlist holds exactly 1 entry, pick-text-range).
- **Bake the parse-check into the build-time `@hyperscript-tools/i18n` transpiler**
  (roadmap §5).

## Probe recipe

Read translations from `patterns.db` (populate first) — never hand-write foreign source
(a hand-written `el valor` once suggested `the`→`el` needed translating; the real corpus
keeps `the` in English):

```ts
import Database from 'better-sqlite3';
import { parseSemantic, render } from '@lokascript/semantic';
const db = new Database('packages/patterns-reference/data/patterns.db', { readonly: true });
const r = db.prepare(
  "SELECT hyperscript FROM pattern_translations WHERE code_example_id=? AND language=?"
).get('focus-trap', 'ru');
render(parseSemantic(r.hyperscript, 'ru').node, 'en'); // what the gate validates
```

The probe file MUST live inside a package dir (e.g. `packages/testing-framework/`) — a
scratchpad outside the workspace cannot resolve `node_modules`. Delete it after.

## VERIFICATION PROTOCOL — run after EACH fix, before committing

- Rebuild: `npm run build --prefix packages/semantic`. **`dist/` staleness is silent** —
  a green run against a stale dist is vacuously green.
- `npm run test:affected` — a semantic change fans out to ~33 consumers incl.
  `hyperscript-adapter` (its own `preprocessToEnglish` + renderer). **`domain-toolkit`
  "fails" because it has 0 test files — pre-existing, ignore it.**
  **If `testing-framework` ALSO fails, it is almost certainly an ordering artifact, not
  your change:** `test:affected`'s `ensure-fresh` hook rebuilds a stale dep mid-run, which
  invalidates the `patterns.db` provenance stamp under the canonical gate. Run
  `npm run check:fresh && npm run populate --prefix packages/patterns-reference` FIRST,
  then re-run. (Bit Phase 4 once; a direct `npm test --prefix packages/testing-framework`
  passed while `test:affected` failed.)
- `npm run populate --prefix packages/patterns-reference` then
  `npm run test:canonical --prefix packages/testing-framework` (both gates; sets
  `FOREIGN_CANONICAL_VALIDITY=1`). The foreign gate reads authored translations from
  `patterns.db`, which the committed copy LAGS — you MUST populate first.
- Prune: `npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts`.
  **Confirm ADDED is 0.** It REWRITES the baseline every run, so a 2nd run always shows
  0/0; `git checkout --` it first to re-read a diff. Cross-check `failing == before −
  CLEARED + ADDED`.
- Fidelity ratchet: `cd packages/testing-framework && npx tsx src/multilingual/cli.ts
  --full --bundle browser-priority --regression`. **Re-populate AFTER any semantic
  rebuild** or it refuses with a provenance-stamp error (working as designed). Mind the
  tolerance blind spot above.
- The **en-render gate must stay green** (en is the target).

## Footguns

- **Never commit `packages/patterns-reference/data/patterns.db`** — `git checkout --` it.
  **But `git checkout --` on it reverts to the STALE committed copy**, so the next gate run
  fails for a reason that is not your change. Re-`populate` before any further gate/probe
  work. (Bit Phase 4: a green gate went red purely from the cleanup step.)
- ~~**`regen-foreign-baseline.ts` reformats the JSON**~~ — fixed (validity-infra PR): the
  tool now writes through prettier itself, so a no-change regen produces a zero diff.
- **Exit-code masking is real.** `cmd > log; echo $?; grep …` reports the GREP's status.
  Read the explicit `EXIT=` line, not the harness's summary.
- The foreign gate throwing `Unknown token: <char>` IS the signal, not a harness bug.
- **zsh does not word-split** `$vars` — `for p in $pkgs` iterates once. Use literal lists.
- **The MCP server is NOT a valid probe channel mid-arc** — but it now TELLS you instead of
  lying. `.mcp.json` runs `mcp-server/dist/index.js`, which does not bundle semantic: it
  resolves the workspace symlink to `packages/semantic/dist/` **at startup** and node caches
  the module graph, so every rebuild leaves it serving pre-change code. Since the freshness
  guard (`packages/mcp-server/src/freshness.ts`) landed, a tool call after a rebuild returns
  an `isError` refusal naming the rebuilt packages and telling you to restart the server,
  rather than answering from stale code. **A refusal there is the guard working, not a
  bug** — restart the server (`/mcp` → reconnect). The `patterns.db` half self-heals: the
  connection reopens when `populate` replaces the file. Still prefer the `tsx` probe recipe
  above mid-arc; it imports fresh each run and needs no restart.
- Do NOT open a docs-only PR — fold docs into the code PR.
- Ship one root cause per small PR, each gate-guarded.
