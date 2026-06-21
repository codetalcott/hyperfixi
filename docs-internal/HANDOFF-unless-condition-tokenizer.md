# Handoff — `unless-condition` is a tokenizer-layer cluster, not block-scoping

> Written 2026-06-21 while landing the **tr** slice of the `unless-condition`
> cluster (the biggest non-behavior lossy cluster — handoff item #3 in
> [`HANDOFF-multilingual-priorities.md`](HANDOFF-multilingual-priorities.md)).
> This doc records the **empirical** root cause, which **overturns** that handoff's
> guess, and tees up scope for the remaining langs. Read the methodology lessons in
> the priorities handoff first (reproduce through `ml.parse` on the DB translation,
> verify the layer empirically).

## The premise was wrong

`HANDOFF-multilingual-priorities.md` framed `unless-condition` as an `unless … end`
**block-body scoping** fix ("the flat path scopes the `unless … end` body across
SOV/SVO"). **There is no block here.** The pattern is an inline guard:

```
en rawCode:  on click unless I match .disabled toggle .selected
en parse:    on → compound[ unless, toggle ]      (fidelity reference set = {on, toggle, unless})
```

The en `unless` action comes from the hand-crafted `unlessEnglish` pattern
(`unless {condition}`) matched inside `parseBodyWithClauses` → `parseClause`. The
schema-generated per-language `unless` patterns key their literal off the **profile
`unless` keyword**, so a profile with no `unless` keyword can't match it — and even
when it can, the marker must first **tokenize** as a single `unless` token.

## Root cause is the **tokenizer**, and it differs per language

Verified with a token probe (`tokenize(text, lang)`) over the DB translations. The
`unless` action is lost for a **different reason in each language**:

| Lang   | marker                        | tokenizes as      | cause                                                                                                |
| ------ | ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **tr** | `değilse`                     | `unless` ✓        | clean single Latin word → **faithful (this PR)**                                                     |
| **zh** | `除非`                        | `unless` ✓        | clean token, **but still lossy** — pure **structural**: front marker, condition mid-`把 … 切换`      |
| **ja** | ~~`でなければ`~~ → `ない限り` | `unless` ✓        | was split by leading `で` particle; **fixed** by moving to `ない限り` (`な`-initial) → **faithful**  |
| **ko** | ~~`아니면`~~ → `아니라면`     | `unless` ✓        | was the `else` primary (collision); **fixed** via `아니라면` + trailing-guard → **faithful**         |
| **hi** | `जब_तक_नहीं`                  | `जब`(when) + … ✗  | **keyword-prefix collision** (`जब`=when) + the `_` join splits                                       |
| **vi** | (DB renders spaced)           | `trừ` `khi`(on) ✗ | space split + `khi`→on (the underscore form `trừ_khi` is in the profile but the dict renders spaced) |
| **bn** | (en `unless` leaks)           | literal `unless`  | i18n dict has no `unless` entry                                                                      |
| **he** | (en `unless` leaks)           | body collapses    | **degenerate** — RTL + **untranslated English condition** `I match .disabled`; not the marker        |

Key proof the gap is **not** keyword/dict alignment: adding `unless: でなければ` to the
ja profile left ja at **0.67** (marker still split by `で`); zh has the keyword in
**both** layers and is **also** 0.67. Keyword alignment alone moved **zero** lossy
passes — only tr (which already tokenized cleanly) went faithful.

## What landed in this PR

- `packages/semantic/src/generators/profiles/turkish.ts`: one line —
  `unless: { primary: 'değilse', normalized: 'unless' }`. (The tr i18n dict already
  emitted `değilse`; only the profile keyword was missing.)
- Guard: `Turkish unless keyword alignment (değilse)` in
  `packages/semantic/test/multilingual-roadmap-fixes.test.ts` (verified red without
  the line: parse drops to `{on, toggle}`).
- Baseline: tr `unless-condition` moved out of `lossyPasses` (→ faithful 1.0). Gate
  clean, parse-rate steady 3695/3696.

## Follow-up landed (2026-06-21) — ko + bn + ja via a **structural** trailing-guard

> This overturns _this doc's own_ "Remaining work #3 (ko)" framing the same way the
> doc overturned the priorities handoff: **the ko collision swap was necessary but
> NOT sufficient.** Verified empirically (raw parse-tree dumps through `ml.parse`).

**What the ko swap alone did and didn't do.** Renaming ko `unless` `아니면`→`아니라면`
(i18n dict + semantic profile, distinct from else `아니면`) made the marker tokenize
cleanly as a single `unless` token (probe-confirmed) and fixed the toggle patient —
**but ko still dropped the `unless` action.** Root cause is **not** the tokenizer:
the `unless` schema's `condition` role is **required**, and under the verb-final
reorder the marker renders **clause-FINAL** (`… 토글 .selected 를 아니라면`) with its
condition **fronted** ahead of the guarded command. `tryParseConditionalBlock` only
folds a **leading** marker, so the trailing marker never anchored and the fronted
condition was orphaned.

**tr was faithful-by-luck.** Its "faithful" parse was structurally wrong —
`toggle.patient = .disabled` (the _condition's_ selector) and `unless` carrying a
bogus `event:.selected` role — but it happened to emit the action _names_
`{on,toggle,unless}`, so recall-fidelity read 1.0. (Reminder: parse-rate/recall ≠
correctness.)

**The fix (structural, general).** `parseClause`
(`packages/semantic/src/parser/semantic-parser.ts`) now detects a **clause-final
`unless` marker**, strips it, parses the body without it (ko's toggle stays correct),
captures the **fronted condition** from the clause head, and re-emits
`[unless(condition), …body]` — en-parity. `unless`-only (an `if` would relabel to a
conditional node and desync the action set); fires only when a real body command
parsed **and** a condition was captured (precision-safe — can't inject a phantom
`unless`). Behavior is byte-identical when no trailing marker is present (SVO/en
never hit it — their last token isn't the marker).

- ko parse is now the **most correct of the three**: `unless(condition:"I match
.disabled") + toggle(.selected)`. tr's `unless` also gained a real `condition` role
  (was the bogus `event`) — a small R1 gain.
- **Bonus: bn** also moved faithful — its English-literal `unless` leaks at the tail,
  which the same trailing-guard catches (no bn dict change needed).
- **ja** (second commit) moved faithful the same way once its marker was taken off the
  `で` particle: `でなければ` → **`ない限り`** (i18n dict + semantic profile). `で` is
  peeled by the particle extractor and shatters `でなければ` into `で`+`なければ` —
  registering it as a keyword does NOT beat the particle extractor (a prior attempt
  confirmed this). `ない限り` starts with `な` (not a particle), so it tokenizes as a
  single `unless` token (the same reason else `そうでなければ` tokenizes clean), and the
  trailing-guard recovers it. ja parse is now the most-correct form too:
  `unless(condition:"I match .disabled") + toggle(.selected)`.
- Guard: the "Trailing SOV unless guard recovery (unless-condition, ko/bn/ja)" describe
  in `multilingual-roadmap-fixes.test.ts` (each case red without its enabling change —
  parser for ko/bn, profile marker for ja; incl. a Map-aware structural assertion).
  Pruned the now-stale `ko:unless:아니면` and `ja:unless:でなければ` entries from
  `lexicon-emit-mismatch.test.ts`.
- Baseline: lossy band **52 → 49** (ko + bn + ja out of `lossyPasses`). Gate clean,
  zero regressions, parse-rate steady, degenerate unchanged (he remains).

## Remaining `unless-condition` work — ranked by leverage

> **Updated 2026-06-21 (post ko/bn):** the **trailing-`unless` guard now exists** in
> `parseClause`. So for any lang whose marker renders/tokenizes as a **single
> clause-final `unless` token**, the guard recovers it automatically — these langs
> now need **only** clean tokenization, not parser work. zh (front marker) and he
> (degenerate) are unaffected by the guard (it handles **trailing** markers only).

1. **Underscore-split tokenizer fix — MEASURED INERT, do NOT pursue as framed.** The
   original hypothesis was that the tokenizer emits underscore as its own token,
   shattering joined markers (hi `जब_तक_नहीं`, ru `двойной_клик`), so making underscore
   a word char looked high-leverage. **A spike (2026-06-21) flipped underscore to a
   word char in three places** — the cyrillic keyword classifier, the vietnamese
   keyword classifier, and the generic `UnicodeIdentifierExtractor` walk
   (`packages/framework/src/interfaces/value-extractor.ts`) — then rebuilt,
   repopulated, and ran the gate. **Result: ZERO band movement and ZERO signal
   movement across all 24 languages** (parse-rate steady 3695/3696). The change is
   **safe (no regressions) but useless (no improvements)** for the priority bundle.
   Why it's inert:
   - The markers that **do** render with underscores still fail for a **different**
     reason — a **keyword-prefix collision** (hi `जब_तक_नहीं`: the matcher grabs
     `जब`=when, a registered prefix, before reaching the underscore). The boundary
     char was never the blocker.
   - The markers the flip **does** rescue either render with a **space** in the actual
     DB translation (vi renders `trừ khi`, not `trừ_khi` — spaces always split) or were
     already faithful (ru/uk `unless` is not lossy).

   **The underscore convention is effectively obsolete.** The base tokenizer already
   has a profile-driven **`tryMultiWordKeyword` (#416)** that matches **natural spaced**
   multi-word keywords as a single token _before any extractor runs_ (see the comment
   in `extractors/vietnamese-keyword.ts`: `chuyển đổi`=toggle, `cho đến khi`=until are
   spaced profile keywords today). So the correct path for a multi-word `unless` marker
   is to **register the spaced form as a profile keyword** (vi `trừ khi`, hi
   `जब तक नहीं`) and lean on `tryMultiWordKeyword` + longest-match (longest-match also
   beats the `जब` prefix collision) — **not** to touch underscore handling. Verify with
   a token probe that the spaced marker emits one `unless` token; that is the real next
   experiment for hi/vi. **For hi (SOV/marker-final), once `जब तक नहीं` emits a single
   trailing `unless` token, the trailing-guard (landed 2026-06-21) recovers the clause —
   tokenization is the ONLY remaining hi work.** For vi, first confirm marker position:
   if it renders clause-leading (vi is SVO), the schema-generated `unless {condition}`
   pattern handles it directly once tokenized (the guard is trailing-only).

2. **ja `でなければ` particle collision — ✅ DONE (2026-06-21).** Resolved by moving the
   marker off the `で` particle: `でなければ` → `ない限り` (i18n dict + semantic profile).
   `ない限り` starts with `な` (not a particle) so it tokenizes as a single `unless`
   token, and the trailing-guard recovers the clause. ja `unless-condition` is faithful.
   **The pattern for hi (and any SOV laggard): the only work left is finding a marker
   that tokenizes as ONE clause-final `unless` token — avoid particle/keyword-prefix
   collisions; the guard does the rest.**
3. **ko `아니면` = else collision — ✅ DONE (2026-06-21).** Resolved via the dict/profile
   swap (`아니라면`, distinct from else `아니면`) **plus** the structural trailing-guard —
   see "Follow-up landed" above. ko `unless-condition` is faithful; bn came along free.
4. **zh structural (front marker + `把`).** zh tokenizes `除非` cleanly yet drops the
   clause — the fused event pattern captures `toggle` and the mid-stream `除非 把 …`
   condition is never reattached. This is the SVO analogue of the SOV event-anchor
   work (priorities handoff item #5); shares shape with vi once vi tokenizes cleanly.
5. **he degenerate (separate defect).** Not the marker — the **untranslated English
   condition** in RTL context collapses the body. Belongs with the transformer
   expression-translation / bidi work, not this cluster.

## Gate-faithful repro (recreate, then delete — not committed)

Throwaways used this session lived under `packages/patterns-reference/scripts/`
(`_repro-unless.ts` walks DB translation → `ml.parse` → `collectActions`;
`_probe-tokens.ts` dumps `tokenize()` output). Recreate from the template in
`HANDOFF-multilingual-priorities.md` ("Gate-faithful repro"); set
`PATTERN=unless-condition`. Build deps + `populate` first (the gate refuses a stale
DB). The token probe is the fast diagnostic — it shows _why_ a marker is lost before
you touch the parser.
