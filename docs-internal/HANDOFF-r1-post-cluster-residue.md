# Handoff — R1 residue after the five-cluster triage (fronted repeat-while · sw kama homonym · singletons)

> **STATUS UPDATE (2026-07-06, session 8): two spurious en-noise families
> LANDED — #588 (go ×21: en optional to-marker + he/zh patient-particle
> markerVariants) and the add drill in this PR (add ×22→×11: patient literal
> admission cleared the repeat-times half).** Post-session state: probe mean
> R1 **0.9829** (held), baseline avgPrecision **0.9851 → 0.9891** (+0.0040
> across the two drills), parse 3696/3696, degenerate/lossy 0, R2 1.0.
> Per-(lang,pattern) A/B across both PRs: **32 spurious entries cleared,
> 0 new**; parse-coverage census identical before/after (3404 pairs).
>
> 1. **#588 — go ×21 (en-noise, built as diagnosed — but the pre-probe showed
>    THREE droppers, not one).** en renders go's destination bare
>    (`renderOverride: ''` → `go back`) while the generated go-en pattern
>    REQUIRED the `to` literal — en PARSE NULL in isolation; 21 languages
>    captured `destination="back"` via lax event-fused paths. he/zh were the
>    other two droppers, sibling reason: the transformer renders `back` with
>    their PATIENT particle (`לך את back` / `前往 把 back`) while go-url keeps
>    the destination marker (`על` / `到`). Three aligned pieces, all scoped to
>    goSchema.destination: (a) the pattern-generator markerOverride branch now
>    honors per-command `markerOptional` (marker words wrap in an optional
>    group) — en `go back` and `go to url "/page"` both parse; (b) the
>    default-marker branch + extraction rules merge per-command
>    `markerVariants[code]` as marker alternatives (the SOV two-role
>    generators already did); (c) `markerOptional: { en: true }`,
>    `markerVariants: { he: ['את'], zh: ['把'] }`. All three enriched
>    together — zero honest dips. No pre-existing schema hits the new
>    default-branch merge (put-en / set-tr markerVariants sit on
>    override-branch roles). 6 guard tests (3 stash-verified fail-without-fix;
>    3 lock the marked forms).
> 2. **add repeat-times ×11 (this PR) — the session-7 "loop-body attachment"
>    guess was WRONG.** Probed: `repeat forever toggle .pulse` composes fine
>    (head-only repeat + sibling via the clause loop), and en
>    `add "hello" to me` is NULL in ISOLATION — the patient slot
>    (`expectedTypes: ['selector']`) rejected ANY string literal.
>    addSchema.patient += 'literal' (transition/append precedent) cleared en +
>    the 12 generated-path languages together (ar/de/es/fr/he/id/ms/pt/sw/th/
>    tl/zh — the remove.source shared-schema pattern again); the 11 lax-path
>    languages' captures now match. 3 guard tests (2 stash-verified).
>
> **Residue updated after session 8:**
>
> - **behavior-draggable add ×11 (the other half of add ×22) is a DIFFERENT
>   mechanism — deferred, do not conflate with the cleared repeat-times
>   half.** The style-object patient `add { left: ${clientX - xoff}px; … }`
>   shatters into ~12 identifier tokens in en (a standalone `{` identifier —
>   NO collision with `.{cls}`, which tokenizes as ONE selector token), so the
>   generated pattern can't capture it; needs a brace-run literal fold in
>   matchRoleToken. BUT an en-only fold trades spurious ×11 for missing ×11:
>   the lax-path languages carry junk roles there (ja
>   `source=(clientX,clientY)またはpointerup…` wait-line leak +
>   `destination=literal:"draggable:move"` next-line grab vs en's
>   destination=reference:"me" schema default → type mismatch → new missing
>   entries). The fold and the SOV junk-role cleanup must land TOGETHER.
> - **default ×9 — probed deeper, still open.** defaultSchema.destination +
>   'property-path' fixes en `default my @data-count to "0"` (parallel to
>   set-en-possessive; verified at src level) but ONLY en: all 13
>   currently-dropping languages stay NULL on their rendered possessive+marker
>   shapes (de `standard mein @data-count zu "0"`, es `predeterminar mi
@data-count a "0"`, …) — their generated patterns demand profile markers
>   the render omits, and their possessive shapes don't fold. An en-only
>   enrichment would mint ~26 honest-dip A/B entries. Needs the full
>   default-value drill (per-language markers + possessive matching).
>   In-code NOTE at defaultSchema.destination.
> - **morph ×18 — untouched this session** (probe the render with-phrase
>   before diagnosing, per the session-7 note below).
> - Everything else from the session-7 block below stands (tr remove.patient
>   block-walk leak; spurious empty tr/hi/bn + sortable hi/tr
>   transformer-side; wait-line param leak ja; SOV halt ×6 stretch).

> **STATUS UPDATE (2026-07-06, session 7): the en remove.source drill LANDED as
> #586** — batched with the es/pt remove.patient gate (same site). Post-session
> state: probe mean R1 **0.9829** (0.9825 → +0.0004), baseline avgPrecision
> **0.9851** (held), parse 3696/3696, degenerate/lossy 0, R2 1.0.
> Per-(lang,pattern) A/B: **16 fixed, 0 new**; parse-coverage census identical
> before/after (3404 pairs — run it whenever the probe's roleCount moves).
>
> 1. **remove.source ×12 — the en-noise diagnosis, built.** The source slot's
>    `expectedTypes: ['selector','reference']` rejected the bare identifier
>    (`item` types as `expression` via tokenToSemanticValue) and the optional
>    slot skipped → schema `me` default. THREE aligned pieces: (a) removeSchema
>    source += 'expression' — the pre-fix probe showed the 9 me-default
>    languages (ar/de/fr/he/id/ms/sw/tl/zh) defaulted for the SAME schema
>    reason as en, so the shared-schema fix enriched en and all nine together
>    (zero honest dips, better than the resizable-drill expectation); (b) the
>    marker-role collision gate below; (c) normalizeCommandRoles
>    bound-identifier retype extended destination → destination+source
>    (bn/hi/ja/ko/th typed `item` as bare literal on the SOV capture path).
>    All 24 languages now capture `source:expression="item"`.
> 2. **remove.patient es/pt — genitive/from-marker collision, gated.** The
>    mechanism was tryMatchPossessiveSelectorExpression (owner-first), NOT the
>    property-first of-possessive read the session-6 block guessed: es/pt `de`
>    (particle, normalized `source`) is the profile POSSESSIVE marker, so
>    `quitar .{dragClass} de item` folded as ".{dragClass}'s item" → phantom
>    property-path patient. New gate: reject the profile-possessive fold when
>    the marker normalizes to `source` AND the command's schema declares a
>    source role. **Deliberately source-ONLY**: the first draft gated on ANY
>    declared role and qu `pa` / tr `ın` (both normalize `destination`) killed
>    qu/tr bind-explicit-property + bind-non-form-display to NULL — invisible
>    to the missing/spurious A/B (a null parse just vanishes), caught only by
>    the coverage census. Guard test locks the bind folds. Collateral fix:
>    modal-close-escape es/pt hide.patient (the compound's trailing
>    `quitar .modal-open de cuerpo` un-poisoned the clause chain).
>
> 5 guard tests appended (4 stash-verified fail-without-fix; 1 locks qu/tr
> bind possessives against gate over-broadening).
>
> **Residue updated after session 7:**
>
> - **tr remove.patient (`expression:"last .{dragClass}"`) is NOT the es/pt
>   site — probed:** the tr line parses clean in ISOLATION (patient=selector,
>   remove-tr-generated-simple); in corpus the repeat-block's `son` (tr `end`,
>   ALSO tr's positional `last` — the bn শেষ / ar آخر family; `son` IS in
>   isEndKeyword's tr set, so this is walker bookkeeping, not the keyword set)
>   leaks into the remove clause head and fuses as a positional read
>   (`last .{dragClass}`). Block-walk desync, for a future arc — do NOT touch
>   the end-keyword sets for it.
> - behavior-sortable remove.source/remove.patient families are CLEARED
>   (×12 + es/pt); sortable's remaining flags are the spurious `empty` hi/tr
>   (transformer-side, locked) + bn `for`.
> - wait-line param leak (ja trigger.source junk literal) — unchanged, the
>   body-side sibling of the #584 head fix.
> - **The four spurious families were PROBED (not built) this session — ALL
>   FOUR are en-noise inversions** (#6–#9; en drops the command, the flagged
>   languages parse it): `go ×21` (en `go back` THROWS — go-en requires the
>   `to` marker; `go to top` parses), `default ×9` (en `default my @data-count
to "0"` THROWS in isolation), `add ×22` (one-line `repeat 3 times add … to
me` parses head-only in en — quantity+loopType, body dropped), `morph ×18`
>   (en drops the then-chained `morph #target to it` after `render … with
row: $data`; en's render also grabs a `style:expression="row"` role the
>   translations lack — probe the with-phrase when drilling). Each needs the
>   who-passes-via-what pre-probe before enriching en (this session's lesson:
>   same-schema languages can enrich together with en, zero honest dips).
> - Everything else from the session-6 block below stands (SOV halt ×6 —
>   stretch, compound-level fronted-role re-association).

> **STATUS UPDATE (2026-07-06, session 6): both planned drills LANDED — #583
> (then-boundary if fold, the behavior-resizable en-noise drill) and #584
> (event-head param-phrase consumption, the behavior-sortable drill).**
> Post-session state: probe mean R1 **0.9825** (0.9824 → held → +0.0001),
> baseline avgPrecision **0.9851**, parse 3696/3696, degenerate/lossy 0,
> R2 1.0. Per-(lang,pattern) A/B across both PRs: **12 fixed, 0 new**.
>
> 1. **#583 — then-boundary if fold (behavior-resizable, en-noise as
>    diagnosed).** The `then` between a mid-clause if-head and its branch is a
>    CONJUNCTION, so parseBodyWithClauses split the block at it: if-head
>    clause-FINAL → mid-clause fold nulls → flat `if` truncates the condition →
>    the owed `end` desyncs the debt bookkeeping → an `end` broke the walk at
>    the 3rd of 4 clamp ifs (en dropped the 4th clamp, both `set my
*width/*height`, the last two triggers — bn's "spurious" flags were en
>    deficits, the fourth en-noise inversion in a row). Fix: opener-KIND stack
>    parallel to pendingBlockDepth; while an `if` is open mid-clause, a
>    conjunction is block content — the whole `if … then … end` block reaches
>    parseClause's #576 fold. `unless` counts as 'other' (the fold only folds
>    `if`). A/B: 3 fixed (bn spurious set/trigger/if), 0 new.
> 2. **#584 — event-head param-phrase (behavior-sortable, exactly the
>    session-5 sharpened diagnosis).** Five aligned pieces, all at the event
>    HEAD: (a) matchEventParamPhrase consumes `( ident [, ident]* )` between
>    event keyword and marker (first pass + ko phrase branch +
>    hasSOVEventMarkerHead), captured as parameterNames; (b)
>    WAITABLE_EVENT_WORDS accepted alongside KNOWN_EVENTS in the SOV extraction
>    (pointerdown wasn't recognizable AT ALL — that's why the `)` anchored),
>    guarded so an event name directly after the `event` KEYWORD stays a
>    loop/wait payload (`repeat until event pointerup …`); (c) rendered
>    `from me` pair stripping — after event+marker (ja 私 から, ko 나 에서,
>    tr ben den, bn আমি থেকে, hi मैं से — new hi SOV_SOURCE_MARKERS entry) and
>    fronted (qu noqa manta), gated to pronoun/window references so
>    `triggerEl から` still reaches the body (behavior-removable's recovery);
>    (d) tryMatchPropertyAccessExpression folds a fused method call's parens
>    into the expression (`target.closest("li")`) — left in the stream they
>    broke the following SOV marker and set-XX-generated died to role-swapping
>    verb-anchoring; (e) skipNoiseWords skips `the` before a keyword-base
>    property access (`the target .closest …`). A/B: 9 fixed
>    (add.destination:expression ×5 bn/hi/ja/ko/tr + set.patient:expression ×4
>    ja/ko/qu/tr), 0 new.
>
> 7 guard tests appended to `packages/semantic/test/multilingual-roadmap-fixes.test.ts`
> (6 fail without the fixes — stash-verified; 1 locks the ko repeat-until-event
> head against the WAITABLE expansion).
>
> **Residue updated after session 6:**
>
> - **behavior-sortable remove.source:reference ×12
>   (bn/hi/it/ja/ko/pl/qu/ru/th/tr/uk/vi) is EN-NOISE, newly probed:** en's
>   `remove .{dragClass} from item` — even in ISOLATION — silently drops
>   `item` (the source slot rejects the bare identifier) and the source
>   DEFAULTS to `reference:"me"` (schema default, NOT a next-line grab).
>   Translations capturing `source:expression="item"` (it, and ja/ko
>   post-#584) are RIGHTER than the reference. A future en drill: make
>   remove-en-generated's source slot accept the identifier — but CHECK which
>   languages currently pass via the same me-default first (they'd flip to
>   missing when en enriches; the resizable-drill discipline).
> - **behavior-sortable remove.patient:selector ×3 (es/pt/tr), probed:** the
>   of-possessive matcher folds `quitar .{dragClass} de item` into
>   `patient = property-path:"undefined"` — es `de` is BOTH the genitive
>   connector (#580's marker table) and remove's from-marker. Needs a
>   command-schema gate on the of-possessive read (remove has no property-path
>   role), not a marker change.
> - **wait-line param leak (ja trigger.source spurious literal):** the
>   `wait pointermove(clientY) or pointerup(clientY) from document` line still
>   leaks `(clientY)またはpointerup(clientY)ドキュメント` into the FOLLOWING
>   trigger's source role — the wait event's param phrase is a body-side
>   sibling of the #584 head fix (matchRoleToken's event role, not
>   trySOVEventExtraction). Small, self-contained follow-up.
> - spurious `empty` tr/hi/bn ×6 + behavior-sortable hi/tr — transformer-side,
>   unchanged, locked for a transformer arc.
> - Everything else from the session-5 block below stands (SOV halt ×6,
>   set/A2 qu tail, template-literal-list-build SOV six, spurious
>   add/go/morph/default families — undrilled).

> **STATUS UPDATE (2026-07-05, session 5): the nested-behavior sub-parse drill
> LANDED as #582** (probe mean R1 **0.9812 → 0.9824**; per-(lang,pattern) A/B:
> **46 entries fixed, 0 new**; six-signal gate green; baseline regenerated).
> Five aligned mechanisms, all at the behavior-body sub-parse seam:
>
> 1. **Guard-clause `exit` never parsed anywhere** — exitSchema has zero roles
>    and the generator emits NO pattern for roleless schemas, so `if item is
null exit end` had an unparseable then-branch, the conditional fold
>    rejected (empty branch → null), and the flat if-head truncated the
>    condition; the leftover predicate re-anchored as `empty me` where it
>    doubles as the empty keyword. Fix: `bareKeyword: true` on exitSchema (the
>    existing `live` opt-in). Clears spurious `empty` ×4 (behavior-sortable
>    ar/id/sw/th), spurious `exit` ×2 (bn/qu — those two were parsing exit
>    while en dropped it), and enriches en itself (en now parses `exit` — the
>    guard-clause was an en deficit too, the #576/#577 en-noise pattern again).
> 2. **ja/ko dict exit realign** (the #569 precedent): the dict rendered exit
>    as 終了/종료 — the HISTORIC exit/end collision words, deliberately absent
>    from the end-keyword sets AND unknown to the tokenizers — so the rendered
>    exit was an inert identifier. Realigned to the profile primaries 退出 /
>    나가기 (both parse via exit-{ja,ko}-generated). Pruned the two
>    KNOWN_MISMATCHES allowlist entries (the staleness test caught them).
> 3. **In-branch transition roles bn/hi/ja/ko/qu/tr ×24 + qu standalone ×15**
>    (fade-out-remove, transition-color/opacity/transform — most of the
>    "transition.duration hi/qu" residue): the if-branch transition reaches
>    verb-anchoring, not the fused-event reclaims. Three aligned pieces:
>    normalizeCommandRoles relabels a schema-invalid literal destination →
>    absent goal (`0 に` — に is the generic destination particle; the
>    tell/#564 precedent) and retypes a bare-identifier literal patient →
>    expression (en types the bare CSS property as expression); and
>    extractRolesFromMarkedTokens reclaims a LONE trailing TIME literal
>    (`300ms`) → duration, schema-gated (the in-branch sibling of the fused
>    trailing-DURATION reclaim).
> 4. **STRUCTURAL_NEVER_EVENT guard (pattern-matcher):** the SOV verb-first
>    trigger pattern (`引き金 {event}`) swallowed the もし/যদি opening the NEXT
>    juxtaposed clause as event:literal="if" — fabricating a junk event AND
>    hiding the if from the folds (the transition branch then degraded to junk
>    verb-anchoring). An event payload is never if/unless/else/end/then, in any
>    command; `init` deliberately NOT listed (`trigger init` is a real event).
> 5. **bn fold terminator (isBlockEndToken):** bn renders `end` as শেষ, which
>    the curated isEndKeyword set can't list by value (শেষ is ALSO bn's
>    positional `last` — the ar آخر lesson), so a bn conditional fold NEVER
>    terminated: everything after an if nested into its branch (exposed at
>    behavior-removable when the junk trigger match stopped masking it). New
>    fold-scoped check: a KEYWORD token normalized to `end` terminates, except
>    when followed by a selector (the positional reading `শেষ <li/>`); curated
>    surface forms keep terminating unconditionally. Also killed bn's phantom
>    `for` at behavior-removable (the জন্য postposition now lands in a folded
>    branch where the zero-role `for` filter drops it).
>
> 7 guard tests appended to `packages/semantic/test/multilingual-roadmap-fixes.test.ts`
> (all fail without the fix — verified by stash round-trip).
>
> **Residue updated after session 5:**
>
> - **behavior-sortable ja/ko set + add.destination — NEW sharper diagnosis:**
>   the ja event pattern anchors `{event} で` at the `)` of
>   `pointerdown(clientY)` (event:literal=")"), and the leaked `私 から …` body
>   head makes the first skipped-run KEYWORD-led, so flushSkipped discards it —
>   the handler `set item to the target.closest("li")` dies there
>   (set.patient:expression ja/ko/qu/tr ×4), and with `item` never bound,
>   tryAttachTrailingRole's strict destination rejects `item に` after add
>   (add.destination:expression bn/hi/ja/ko/tr ×5). Needs an event-head
>   param-phrase fix (`(clientY)` consumption), not more body-side patching.
>   remove.source ×12 / remove.patient ×3 at the same site, likely same root.
> - spurious `empty` remainder: hi/tr at behavior-sortable + tr/hi/bn if-empty
>   ×6 — ALL transformer-side (predicate scrambled into the then-branch),
>   unchanged, locked for a transformer arc.
> - **behavior-resizable en-noise — probed post-#582, mechanism found (drill
>   still open):** the site is now R1 1.0 ×23 with bn-only spurious (set ×4,
>   trigger ×2, if ×1, for ×1) — all en deficits, bn parses MORE of the body.
>   en's `if newWidth < minWidth then set newWidth to minWidth end` folds fine
>   in ISOLATION, but in the body the ifs sit mid-clause after sets, and the
>   `then` CONJUNCTION splits the block across parseBodyWithClauses clause
>   boundaries — the if head lands clause-FINAL where the mid-clause fold has
>   no branch tokens (empty then-branch → fold nulls → flat truncated if), the
>   branch `set` becomes the next clause, and the owed `end`s desync the debt
>   bookkeeping until an `end` breaks the walk early: en drops the 4th
>   if-branch set, both `set my *width/*height`, and the last two triggers.
>   The needed machinery is a trailing flat-if fold ACROSS the then-boundary
>   (clause-tail flat `if` + following clause as its branch + one owed `end`),
>   distinct from #576's same-clause fold. Fix en first, then re-check bn's
>   flags — same discipline as #576/#577.
> - Everything else from the session-4 block below stands (SOV halt ×6,
>   set/A2 qu tail, template-literal-list-build SOV six).

> **STATUS UPDATE (2026-07-05, session 4): the set/A2 cluster and the spurious-`empty`
> family LANDED as #580 (set of-possessive + A2 operator-run assembly) and the
> follow-up copula PR.** Post-session state: probe mean R1 **0.9812** (was 0.9778),
> baseline avgPrecision mean **0.9849** (was 0.984), parse 3696/3696,
> degenerate/lossy 0, R2 1.0. Per-language A/B across both PRs: 11 languages up on
> R1 (ja/ko/tr/bn/hi +0.0084, it/pl/ru/th/uk +0.0072, qu +0.0016), 8 up on
> precision (+0.0026 each), zero meaningfully down.
>
> 1. **set/A2 (#580) — the re-probe changed the plan again (the #579 lesson
>    repeated):** set-color-variable ×11 was NOT multi-token assembly but an
>    of-possessive marker-coverage gap — 10 languages' genitive connectors
>    (it `di`→tell, pl `z`/uk `з`→style, th `ของ`, ja `の`, ko `의`, bn `র`,
>    hi `का`, qu `pa`/tr `nin`→destination) were invisible to the
>    normalized-form check, and the hand-crafted it/pl/ru/th/uk set destination
>    tokens never opted into property-path (set-es-full had it; its siblings
>    didn't). Two knock-on mechanisms: (a) once set-XX-generated became whole at
>    position 0, it beat the event stages and the trailing SOV event phrase
>    dropped — a Stage-2 guard now prefers trySOVEventExtraction when a command
>    match leaves a trailing remainder in an SOV language; (b) two-way-binding /
>    computed-value DID need the A2 theory: matchRoleToken now assembles
>    strictly-pairwise operator runs (`"Hello, " + my value`, parenthesized
>    groups, possessive-pair operands) — which also fixed the EN reference's own
>    silent `+ my value` tail drop. 58 (lang,pattern) entries fixed.
> 2. **Spurious `empty` ×28 → ×12 (copula PR) — mechanism NOT inverted this
>    time (unlike #577):** en was right; 8 languages grew a phantom `empty me`
>    because their rendered copulas tokenize as bare identifiers (fr `est`,
>    ru `есть`, pt `é`, uk `є`, tl `ay`, ms `adalah`, th `เป็น`) — or normalize
>    to an unrelated sense (ar `هو`→`it`) — so the condition split fired at the
>    predicate word, which doubles as the empty/null COMMAND keyword. New
>    `CONDITION_COPULAS_SURFACE` set, matched by surface value and gated to a
>    predicate continuation (norm empty/null/undefined) — the ar pronoun reading
>    (`إذا هو اضبط …` = `if it set …`) still splits at the command verb
>    (fetch-do-not-throw guard test locks it).
>
> **Residue updated after session 4:**
>
> - spurious `empty` remainder ×12: tr/hi/bn ×6 (transformer-side scrambling —
>   the predicate lands INSIDE the then-branch: tr `… ekle .error i boş ben e`;
>   parser-side copulas are behavior-neutral there, locked in the set for when
>   the render heals) + behavior-sortable ×6 ar/hi/id/sw/th/tr (nested behavior
>   sub-parse: the flat if-head truncates `jika item adalah kosong` and the
>   leftover `kosong` re-parses as an `empty` command — the same nested-behavior
>   drill site as behavior-removable's transition roles).
> - set/A2 residue: template-literal-list-build `set.patient:expression` SOV six
>   (the loop-BODY sub-parse can't match the now-enriched en middle set);
>   two-way-binding / computed-value qu (its render interposes the source phrase
>   `ta .quantity manta` mid-clause, so set-qu-generated can't match);
>   template-literal-interpolation qu (possessive-head destination in fallback).
> - **SOV halt.patient ×6 re-probed, shapes confirmed** (ja drops `halt`
>   entirely; tr captures `halt.patient:expression="the"` and crosses call/halt
>   roles) — still needs compound-level fronted-role re-association; untouched.
> - **NEW en-noise site discovered:** behavior-resizable en drops one of the four
>   `if`s and all four if-branch `set`s that bn (and likely others) now parse —
>   the bn "spurious" flags there are en deficits. A future behavior-body en
>   drill, same discipline as #576.

> **STATUS UPDATE (2026-07-05, session 3): two more residue items LANDED as #576
> (mid-clause if fold) and #577 (transition family alignment).** Post-#577
> state: probe mean R1 **0.9768**, avgPrecision mean **0.9764 → 0.9840** (every
> language up), parse 3696/3696, degenerate/lossy 0, R2 1.0.
>
> 1. **if.condition:reference ×14 (#576).** Mechanism as predicted (en-noise),
>    location wasn't the if-head PATTERN but the walker: a juxtaposed
>    `<cmd> … if <cond> <cmd>` clause (no `then` before the if) never reaches
>    the clause-boundary fold, so parseClause pattern-matched the flat
>    `if-en-basic` head and truncated the condition to its first token.
>    parseClause now mirrors the fused-body walker's fold hook (rewind a
>    flat-`if` matchBest result and fold the whole block). Probe mean R1
>    0.9771 → 0.9781, all 23 langs up. Collateral: focus-trap ko/qu, behavior-
>    removable js.patient ×6. The sw if-empty Phase-1a guard test was locking
>    the truncated-era shape (flat spurious `empty` action) — updated to the
>    folded shape, verified strictly more faithful.
> 2. **spurious transition ×66 (#577) — the drill found the family INVERTED:**
>    the 14 "spurious" languages parsed the command correctly; the en reference
>    (and 8 more languages) silently DROPPED it. The transition schema couldn't
>    match the corpus-idiomatic forms: literal-only patient rejected the bare
>    CSS property (identifier→expression) AND the style-property selector form
>    (`*background-color`); the goal markerOverride table disagreed with the
>    i18n-rendered markers in 11 languages (de auf≠zu, sw kwenye≠kwa, 9 absent);
>    sw's rendered verb `mpito` wasn't a profile keyword; zh `过渡` was SPLIT by
>    the particle extractor (过 aspect-particle beats the longer keyword —
>    extractor-order longest-match bug, now fixed generally); th เปลี่ยน and qu
>    tikray collided with `change`/`toggle` keywords (dict-side realign to
>    profile primaries เปลี่ยนผ่าน/pasay, the #569 precedent); and a #561-sibling
>    trailing TIME-literal reclaim recovers the SOV duration. Spurious ×66 → ×6.
>    17 languages at full en role parity; zero-lossy verified action-level in
>    all 24. NOTE the R1-mean mechanics: en gaining real transition.\* entries
>    LOWERS mean R1 (0.9781 → 0.9768) until the SOV six match them — the number
>    dips while meaning more; precision is the signal that moved (+0.0076).
>    Learned constraint: making transition.goal OPTIONAL to catch the goal-less
>    slide-toggle form verifiably clobbers goal+duration capture in every
>    marker language (optional marker group → value re-binds by particle
>    metadata) — do not repeat; the goal-less form is residue.
>
> Remaining residue from the menu below, updated: SOV halt ×6 (unchanged, needs
> fronted-role re-association); set/A2 cluster (~×46, next largest R1 seam);
> behavior-sortable deep add.destination ×5; spurious `empty` ×28, `add` ×22,
> `go` ×21, `morph` ×18, `default` ×9 (undrilled); NEW transition residue:
> slide-toggle goal-less spurious ×6, transition.duration hi/qu ×8,
> behavior-removable transition roles bn/hi/ja/ko/qu/tr (nested behavior
> sub-parse path, distinct from the fused-event reclaim site).

> **STATUS UPDATE (2026-07-05, follow-up session): the open residue from items
> 1–3 is largely LANDED** as one "R1 residue sweep 2" PR (four increments, each
> with fail-without-fix guard tests, per-(lang,pattern) A/B showing zero
> regressions, six-signal gate green, baseline regenerated against a fresh
> populate — corpus probe mean role-recall 0.9661 → 0.9771, all 23 languages
> up, none down; parse 3696/3696, R2 1.0):
>
> 1. **send en-reference noise (65 lang-patterns).** Two en defects: the
>    send schema's `[selector, reference]` destination rejected a
>    bare-identifier target (`send "hello" to ChatSocket` → destination
>    silently defaulted to `me`; socket-send ×23) — now admits `expression`
>    (the add.destination precedent); and the event role's bare-call fold skip
>    (an `on`-handler param-destructuring rule) truncated `send update(value:
>
> 42) to #target`to`event:literal="update"`and dropped the destination
(send-with-detail ×21) — the skip is now scoped to`currentPatternCommand === 'on'`. Both families cleared in all languages.
>
> 2. **tell role alignment (21).** The generated marker extraction bound
>    tell's element to the schema-unsanctioned `patient` and the dropped `to
<command>` body's verb to `destination` as a schema-invalid literal.
>    normalizeCommandRoles now relabels patient→destination over an
>    absent-or-junk-literal destination (the #564 schema-invalid-destination
>    precedent). NOTE: the `to show` BODY is still dropped in en AND all
>    translations (equal lossiness) — a future tell-body arc.
> 3. **wait for {event} — the diagnosed R2-touching arc (23 + 2).** Four
>    pieces: a hand-crafted en `wait-en-for-event` head (also registered in
>    buildEnglishPatterns — the per-command loaders are NOT auto-included
>    there, a footgun worth remembering); a known-event duration→event relabel
>    in normalizeCommandRoles gated on a new WAITABLE_EVENT_WORDS set (so
>    `wait 2s` / `wait delay` are never touched); a trailing event-name
>    reclaim in buildEventHandler (the #561/#563 sibling) for SOV verb-final
>    renders, which also drops the sov-simple `patient:reference=me` extraction
>    default leak and consumes a rendered for-postposition (bn `জন্য`, which
>    otherwise anchors a phantom bare `for` — a parseBodyWithClauses filter
>    catches stragglers, scoped to zero-role zero-body `for` ONLY: a bare
>    `repeat` is a legitimate loop-recovery intermediate); and the waitMapper
>    now emits the runtime's `modifiers.for`/`modifiers.from`, so event waits
>    EXECUTE as event waits (R2-honest; the curated R2 subset contains no
>    waits, so the ratchet is unaffected). tl needed a `wait-tl-from-first`
>    mirror of `wait-ar-from-first` (its transformer fronts the from-phrase).
>    A then-chain after `wait for X` in a handler body is no longer dropped.
> 4. **halt leaked-article patient (74 → 6).** `detener the evento llamar …`:
>    the leaked-article skip's §7y gate declined to fire when the ref-noun was
>    followed by a command VERB, so every verb-first language captured
>    `patient:expression="the"`. In SVO/VSO a ref-noun followed by a command
>    verb IS a clause boundary (the verb opens the next juxtaposed command) —
>    the skip now fires there via COMMAND_ACTION_KEYWORDS, SOV profiles
>    exempt (tr's fronted patient has its verb later — the original §7y
>    fragility, guard test rescoped to tr-only). form-submit-prevent cleared
>    in all 17 non-SOV languages + the three behaviors ×17 each.
>
> **Remaining residue after this sweep** (probe-grounded, next session's menu):
>
> - **SOV halt.patient ×6** (form-submit-prevent bn/hi/ja/ko/qu/tr): the
>   fronted `the <event-word>` sits ahead of OTHER commands' clauses
>   (compound-level scrambling); tr additionally crosses call/halt roles.
>   Needs fronted-role re-association machinery, not the article skip.
> - **if.condition:reference ×14** (form-submit-prevent, es/it/de/pl/…): the
>   en reference parses `if result is false` as `condition:reference="result"`
>   and DROPS the comparison; translations capture the full expression and
>   mismatch. en-noise, same discipline as this sweep: fix the en if-head to
>   capture the full condition, then re-check.
> - **set.destination:property-path ×46** (template-literal-list-build ×22 the
>   bulk) + `set.patient` families — cluster A2 (expression-valued set
>   patients, multi-token expression-run assembly in matchRoleToken).
> - **behavior-sortable deep add.destination ×5** (nested handler sub-parse
>   binding registry gap), `js.patient:expression` ×12,
>   `render.style:expression` ×14, `send.event` fine now but `add.patient`
>   form-disable-on-submit ×18, `toggle.patient:expression` accordion ×15.
> - Spurious-action families (R0-precision): `transition` ×66 (biggest),
>   `empty` ×28, `add` ×22, `go` ×21 (go-back every lang), `morph` ×18,
>   `default` ×9 — none touched this sweep; each needs its own drill.

> **Written 2026-07-05**, immediately after clusters D (#567) and E (#568) landed
> the same session (B/A1/C landed 2026-07-04 as #564/#565/#566 — see
> [HANDOFF-r1-residual.md](HANDOFF-r1-residual.md) for that triage and its
> status blocks). All five clusters from that triage are now done. This doc is
> the fresh grounding for what remains, from same-session probes against a
> fresh populate.

## Where things stand (2026-07-05 baseline, commit fb09542c)

Corpus mean R1 **0.9654** (was 0.9535 at the start of 2026-07-04). Worst six:
**qu 0.9347 · hi 0.9381 · ko 0.9428 · tr 0.9475 · ja 0.9479 · bn 0.9507**.
Worst precision: **bn 0.9344 · hi 0.9400 · ja/ko 0.9517**. Parse 3696/3696,
degenerate/lossy 0, R2 1.0 on the 47-pattern curated subset.

**PR stack state:** #567 (cluster D, based on main) ← #568 (cluster E, based
on #567). Both regenerate `multilingual-priority.json`; #568's copy supersedes
#567's, so merge #567 first, retarget #568 to main, merge. **Start the next
arc from merged main**, re-run the ordered build + populate, and re-probe
before trusting any number in this doc.

## The three remaining items (ranked by suggested order)

### 1. sw `kama` homonym — phantom `if` family (precision, sw-specific, smallest)

> **STATUS: DONE (2026-07-05).** Dict-side fix, option 1 as suggested: the i18n
> sw dict + grammar profile now emit `kuwa` ("to be/become" — the conversion
> sense, cf. `badilisha kuwa`) for `as`/method, and the semantic `fetch-sw`
> pattern reads `kuwa` as the responseType marker (hand-written `kama` still
> tolerated in as-marker position via a new `asMarkerAlternatives` param on
> `markerlessFetch`). A/B over all 8 kuwa-carrying sw translations: the 4
> phantom-if patterns (computed-value, event-debounce, fetch-with-headers,
> fetch-formdata) all reach precision 1.0, 4 unchanged, 0 regressed. sw
> avgPrecision 0.9855 → 0.9942. The non-kama singletons surfaced by the same
> probe (breakpoint-command `halt`, go-back `go`, behavior-sortable `empty`)
> remain — item 3 territory.

sw `kama` is both "as" and "if". The sw SEMANTIC parser reads a standalone
`kama` as an `if` command, so any translation carrying `kama <word>` grows a
phantom `if`. Probed spurious-action list for sw (multiset, vs en reference):

- `computed-value` → `["if","if"]` (precision 0.500 — one per `kama Number`;
  the second appeared when cluster E restored the dropped second operand — the
  knowingly-accepted −0.0011 in #568)
- `event-debounce`, `fetch-with-headers`, `fetch-formdata` → `["if"]` each
- (same probe also surfaced non-kama singletons: `breakpoint-command` →
  `["halt"]`, `go-back` → `["go"]`, `behavior-sortable` → `["empty"]`)

Fix options, in precedent order:

1. **Dict-side (pl get/pobierz precedent, cheapest):** make the i18n sw dict
   emit a non-homonym "as" word so the transformer output stops colliding.
   Check what natural sw uses — `kama` is the idiomatic "as/like", so verify an
   alternative reads acceptably before swapping; if none does, go parser-side.
2. **Parser-side:** make the sw `if` head require more than the bare keyword
   (e.g. reject `kama` when it is immediately followed by a bare
   identifier/number inside an expression run, or require a condition-shaped
   continuation). Riskier — touches sw if-parsing for all patterns.

Ratchet note: sw avgPrecision is 0.9842 — nowhere near the 0.02 per-language
ratchet, so this is opportunistic quality, not a gate risk. But it is the
single biggest identified phantom-action family with a known mechanism.

### 2. SOV fronted repeat-while (hi/qu/ko + likely ja/bn/tr; parser-side arc)

> **STATUS: DONE (2026-07-05).** All SIX suspects were affected (probe confirmed
> ja/bn split like hi; tr/qu never formed a `while` node at all). Two-part fix:
> (a) `foldFrontedWhileIntoRepeat` in semantic-parser.ts — at the end of
> `parseBodyWithClauses`, a flat `while{condition}` clause immediately followed
> by a flat condition-less `repeat` merges into one
> `repeat{loopType:"while", condition}` (junk numeric loopType from the
> comparison tail, ko/ja/tr `loopType:10`, is overwritten; loop nodes with
> bodies never enter the fold). (b) dict↔profile while-keyword alignment for
> the two languages whose fronted head never parsed: qu `kay_kaq`→`kaykamaqa`,
> tr `iken`→`süresince` (`iken` is the tr WHEN primary) — two
> `KNOWN_MISMATCHES` entries pruned. After the fix all six languages match the
> en reference role-for-role on repeat-while; fold blast radius corpus-wide is
> exactly {hi,bn,ja,ko,tr,qu}×repeat-while, and the qu/tr dict words appear in
> no other pattern. avgRoleFidelity +0.001–0.002 and avgPrecision +0.0013
> across the six; zero metric decreased anywhere.

Cluster D canonicalized en repeat-while to `repeat{loopType:literal="while",
condition:property-path}` and added verb-first while-heads (es/it/de/… now
match in full). The SOV translations front the while-phrase BEFORE the event
phrase:

- hi `जब तक #counter.innerText < 10 को क्लिक पर दोहराएं …`
- ko `동안 #counter.innerText < 10 를 클릭 할 때 반복 …`

These parse as a SEPARATE `while{condition:property-path}` node followed by a
bare `repeat{}` (ko's repeat carries `loopType:literal=10` — a value bug, but
the TYPE matches so ko only misses `condition`). Current misses: **hi/qu
condition+loopType (2 each) · ko condition (1)** — unchanged counts from
before cluster D (neutral by design; D deliberately left this shape alone).

Fix shape: this is FOLD machinery, not a head pattern — the fronted
`while{condition}` node needs to merge into the adjacent `repeat` (set
`loopType="while"`, move `condition`, drop the separate while node). Precedent:
the trailing-`unless` guard recovery in `parseBodyWithClauses`
(semantic-parser.ts) which re-associates a fronted condition with its body.
Alternative: transformer-side (emit the while-phrase after the verb in SOV) —
riskier, changes translations corpus-wide; probe first. Check ja/bn/tr/qu
shapes before scoping (only hi/qu/ko were probed this session).

Precision bonus: the merge removes the phantom standalone `while` action
(currently spurious vs the en reference for these patterns).

### 3. Singleton families (corpus-wide, opportunistic — batch or skip)

> **STATUS: PARTIAL (2026-07-05).** The suggested en-noise batch landed as one
> PR, resolving two of the three families:
>
> - **add.destination (for-body)** — three-part fix: (1) the add schema's
>   destination now admits `expression` (a loop binding var `item` tokenizes as
>   expression, so `[selector, reference]` rejected the marked `to item` and
>   defaulted to `me` in the EN reference and most translations alike); (2) a
>   parse-scoped bound-identifier registry (repeat/for patients + set
>   destinations) lets the strict trailing-destination reclaim admit `item に`
>   in SOV; (3) a bound identifier captured as a bare literal (ja/ko typing)
>   canonicalizes to expression in normalizeCommandRoles. repeat-for-each and
>   stagger-animation now match en in ALL languages; only behavior-sortable's
>   deep case remains for hi/bn/ja/ko/tr (its `set item` binding sits in a
>   nested handler sub-parse).
> - **trigger.event** — event NAMES canonicalize to `literal` on command nodes
>   (normalizeCommandRoles): en typed `trigger init` literal only because
>   `init` is an en keyword; untranslated names elsewhere typed expression, and
>   colon-split `sortable:start` fragments hid truncation behind a vacuous
>   expression:expression type match. Both the trigger-event 15-lang miss and
>   the behaviors' family are gone.
> - **wait.duration — NOT fixed, diagnosed:** en `wait for transitionend`
>   parses as `wait{duration:literal="for"}` — the KEYWORD is captured as the
>   duration and the event name is dropped (wait-en-generated). The honest fix
>   needs a `wait for {event}` head + an event role on the wait schema + AST
>   mapper support (the wait mapper reads only `duration`) + a duration→event
>   value-shape relabel for the marker-less translations (`esperar
transitionend`) — an R2-touching arc, out of scope for this sweep.
>
> Per-lang aggregate deltas from the honest-reference shift: 12 langs up
> (qu +0.0029, it/pl +0.0022, zh/he +0.0017, …), 5 langs slightly down
> (bn/hi −0.0010, ms/th/tl −0.0017 — vacuous matches of the old noise now
> visible as real drops); corpus mean up. Gate green on all six signals.

Carried over from the 2026-07-04 triage (counts per language unless noted),
plus new observations from the cluster D probes:

- `send.destination:reference` ×2 (send-with-detail, socket-send — every lang)
- `wait.duration:literal`, `tell.destination:selector`,
  `trigger.event:literal` singletons (every lang)
- `halt.patient:reference` ×4 (es/it/de only — ABSENT in the SOV trio; also
  the behaviors' `halt the event` line, seen again in the D probes)
- `js.patient:expression`; `render.style:expression` ×2 (trio)
- **NEW (D probes):** `add.destination:reference` en NOISE on for-body
  patterns — en `add .processed to item` parses `destination:reference=me`
  (the `to item` binding-var destination is dropped and defaulted), while
  it/qu produce the arguably-correct `destination:expression="item"` and get
  penalized for it. Same shape as the old repeat-head noise: fix the EN
  reference first (`to {identifier}` → destination:expression), then check
  which langs already match. Affects repeat-for-each + stagger-animation
  (it/qu missing lists).
- **Still open from the original triage:** cluster A2 — expression-valued
  `set` patients (`"Hello, " + my value`, two-way-binding) need multi-token
  expression-run assembly in matchRoleToken (greedy-capture risk; A/B per
  marker).

Each is small; none is a coherent arc on its own. Suggested treatment: batch
2–3 of the en-noise ones (add.destination, wait.duration, trigger.event) into
one "en-reference noise sweep" PR with the same discipline (probe → en fix →
per-lang check → gate → baseline regen).

## Working discipline (unchanged — it has worked for five clusters)

One increment per PR; fresh ordered build + populate before any probe (Node
24 via nvm — better-sqlite3 is compiled for it; the shell may default to Node
20); six-signal `--regression` gate + per-(lang,pattern) A/B per change;
guard tests that FAIL without the fix (verify via stash round-trip, then
REBUILD the stashed package — mtime staleness trips the gate); regenerate the
baseline only on intentional change against a fresh populate; never commit
patterns.db. Probe-writing notes: end `.mts` probes with `process.exit(0)`;
standalone statement parses only try patterns at position 0 (no skip-ahead);
value bugs are invisible to R0/R1 — check R2/execution probes for them.
