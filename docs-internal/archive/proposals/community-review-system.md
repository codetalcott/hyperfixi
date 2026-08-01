# Community Review System — Design

**Status:** Approved design, not yet implemented. Targets the business plan's Days 46–90
`/community` window (see `~/projects/ideas/lokascript-business-plan-2026-07.md`, which
commits to the reviewer program and "verified by native speakers" badges but specs no
UI, flows, or tiers — this document is that spec).
**Date:** 2026-07-20.

## 1. Context & goals

Multilingual pattern/vocab quality now depends on review the founder cannot do alone:
the machine gates (9-signal fidelity ratchet, vocab validate V1–V4) prove *structure* —
faithful roles, valid canonical renders — but cannot judge *naturalness or idiom*, and
the founder can't read most of the 24 languages. The missing input is (a) native-speaker
developers and (b) LLM-agent sweeps, both reviewing the rendered patterns and the
vocabulary itself.

Goals:

1. Web pages where language speakers can **read and propose edits** to pattern
   translations and **scan the full vocabulary**.
2. **Not all users may edit** a language's vocabulary — but collective input must be
   captured, aggregated, and visibly responded to.
3. **Targeted, trusted users** get a way to make direct vocab edits.
4. LLM agents participate as first-class reviewers and as triage assistants.
5. Founder hours per language must **fall** over time (a stated business-plan metric).

## 2. Constraints

From the business plan (binding):

- **No new npm packages, no new domains** for 12 months. Everything ships as pages/API
  routes on the existing `lokascript-docs` Fly app (`lokascript.org/community` subpath)
  or as internal workspace code in this repo. LokaScript branding throughout.
- **Named reviewers** — native-speaker *developers*; sign-off is a hard gate for the
  public badge. Reviewer incentives already defined (credit, honorarium, free
  lokascript-learn classroom seats for educators).
- **Per-language opt-in/exclusion flags** — some languages have exclusive commercial
  translation deals ("excluded-unless-opt-in", adopt their glossaries).

From the codebase (structural):

- **Vocabulary is authored across 5 surfaces** (~7,000 entries): S1 semantic profiles
  (`packages/semantic/src/generators/profiles/*.ts`, the documented source of truth),
  S2 command-schema marker tables, S3 i18n dictionaries, S4 i18n grammar profiles,
  S5 tokenizer EXTRAS + event names. The cross-surface model and `validate`/`dump`
  tooling already exist: `packages/testing-framework/src/vocab/{model,types,checks,dump,cli}.ts`.
- **Pattern translations are derived data.** `pattern_translations` (patterns.db,
  ~3,936 rows, `UNIQUE(code_example_id, language)`) is generated from S1 + the i18n
  GrammarTransformer by `packages/patterns-reference/scripts/sync-translations.ts`,
  which inserts/updates rows in place. A native speaker seeing a bad ja translation is
  seeing the *composition* of S1 word choices × S4 render rules × the English
  `raw_code`. Their feedback cannot be applied to the translation row — someone must
  diagnose which surface produces the wrong token, fix it there, and regenerate.
- **The apply path already exists**: `apps/profile-editor` is a founder-local edit
  overlay over S1 (SQLite `edits` table keyed `UNIQUE(language, section, field_path)`
  + `audit_log`; `getMergedProfile()`; `src/export.ts` regenerates byte-compatible
  profile TS for a PR).
- **The docs site** (`_hyper_min/sites/lokascript-docs`): Eleventy + Express +
  better-sqlite3 on Fly.io. Build runs `scripts/export-patterns.js`, which reads this
  repo's patterns-reference (DB + dist API) and emits `patterns.json`,
  `translations.json`, and a runtime `patterns.db`. No feedback affordances exist
  today. **`fly.toml` has no `[mounts]`** — anything written at runtime dies on
  redeploy; a Fly volume is required before any server-side intake.

## 3. Tier model — one pipeline, trust decides triage

**Core decision: every contribution is a row in the same suggestion queue.** An
anonymous flag, an identified proposer's edit, a trusted reviewer's "direct edit", and
an LLM-agent finding are all the same record type. Tier determines only (a) which
states a row can enter without founder involvement and (b) who may adjudicate others'
rows — never who merges, and never which CI checks run. This collapses what could be
four subsystems (feedback form, review queue, hosted editor, agent harness) into one
schema, one API, one UI, one export loop. Promotion to trusted is a column update, not
onboarding to a different tool.

| Tier | Who | Auth | Capabilities |
| --- | --- | --- | --- |
| **T0 anonymous** | anyone | none | Read everything (patterns browser, vocabulary browser, provenance, open-suggestion status). One-click "reads unnatural" **category flags** — counters only, no free text (anonymous free text is founder-hours poison), rate-limited. |
| **T1 identified proposer** | self-serve | GitHub OAuth | File structured suggestions (proposed value + rationale), endorse (+1) existing suggestions, track own suggestions. Cannot change anything. |
| **T2 trusted per-language reviewer** | named, invited; scoped to explicit language codes | GitHub OAuth *or* founder-issued invite-token link | Their suggestions for their language(s) are **born `accepted`** (skip triage) — this is the "direct vocab edit". Adjudicate T0/T1/agent suggestions for their language (accept / reject / merge-dup). Sign off patterns and vocab rows (badges, §6). |
| **T3 maintainer** | founder | admin invite token | Everything, plus: batch-apply `accepted` rows via the local profile-editor, run regeneration + PR + merge, manage users/tiers/invites and per-language flags. |

**Why "direct edit" = auto-approved suggestion, not a hosted editor:** a T2 edit
cannot reach users until the founder regenerates translations and CI passes *anyway* —
web-immediate editing is an illusion of immediacy that costs a second authed production
service with an internet-exposed path toward source commits. Auto-approval gives
reviewers the thing that matters: **their judgment is final; the founder's role is
mechanical application.** The profile-editor stays founder-local as the apply tool.
(Revisit hosting it only if reviewer feedback demands a richer editing surface.)

**Auth:** GitHub OAuth for T1 (developer audience, spam-resistant, zero email
infrastructure; hand-rolled callback + signed HTTP-only session cookies, ~100 lines) +
**invite-token links** for T2/T3 (the founder is already personally corresponding with
every named reviewer — the link goes in that email/DM; covers educators without
GitHub). No magic-link email system unless T1 friction proves it necessary.

**Per-language flags** (commercial exclusions) live in committed site config
(`src/_data/community-config.json` in the sites repo), enforced at build time (no
suggest UI rendered) and at the API (submissions rejected). Excluded languages remain
browsable.

## 4. Architecture overview

```
  T0/T1/T2 humans ──┐                                        ┌─▶ public /patterns badges
  LLM sweep agents ─┴─▶ site suggestion queue (community.db, │   (computed from hash join)
                        Fly volume — intake/workflow ONLY)   │
                              │ pull.ts (idempotent)         │
                              ▼                              │
                 git ledgers: data/review/                   │
                 suggestions/ · verifications.json ·         │
                 language-status.json · changesets/          │
                              │ agent triage (render probe)  │
                              ▼                              │
                 profile-editor overlay (S1 edits,           │
                 founder-local) + changeset S3/S5 patches    │
                              │ export.ts → one PR           │
                              ▼                              │
                 CI: fidelity ratchet (9 signals) +          │
                 vocab validate V1–V4                        │
                              │ founder merge                │
                              ▼                              │
                 sync-translations regenerate ───────────────┘
                 (joins verifications → verified_native cols;
                  hash re-check auto-resolves linked suggestions)
```

**Storage split (load-bearing):** the site SQLite is intake and workflow state only —
**git is the system of record.** Pulled suggestions are materialized one-file-per-
suggestion (merge-conflict-free, human-diffable, agent-greppable; status transitions
are ordinary commits, so git history is the audit log) alongside committed ledgers, all
under `packages/patterns-reference/data/review/`:

```
data/review/
  suggestions/<ulid>.json      # pulled from site; lifecycle lives here after pull
  verifications.json           # pattern sign-offs (badge ledger), keyed "pattern|lang"
  vocab-verifications.json     # vocab sign-offs, keyed "lang|concept"
  language-status.json         # per-language review-stage ladder (§8)
  changesets/<id>.json         # one logical vocab change → N surface edits (§7)
```

## 5. Addressing & provenance

**Pattern-translation address** — durable identity = `(patternId, language)` (the DB's
natural key; never the autoincrement row id, which does not survive `db:init:force`).
Version pin = `textHash = sha256₁₆(NFC(trim(hyperscript)))`, plus
`sourceHash = sha256₁₆` of the English `raw_code` at filing time. The `sourceHash` is
the drift-attribution diagnostic: on a later mismatch, *textHash changed + sourceHash
changed* → the English pattern was edited (all 23 languages go stale together,
expected); *textHash changed + sourceHash same* → a vocab/grammar change altered this
language's render — exactly the event the review system cares about.

The hash function lives in **one exported util in patterns-reference**
(`src/review/text-hash.ts`) used by all three consumers (sync join, multilingual CLI,
site export). Hash-normalization drift between consumers is the main correctness risk
in this design; centralizing kills it.

**Vocab-entry address** — aligns exactly with the profile-editor overlay key, so a
vocab suggestion address IS a valid overlay edit:

```jsonc
{ "kind": "vocab", "surface": "S1", "language": "ko",
  "fieldPath": "keywords.toggle.primary",   // = edits(language, section, field_path)
  "currentValue": "전환" }                   // value snapshot plays the textHash role
```

**Re-anchor rule (never silently close):** on every regeneration, recompute each open
suggestion's / sign-off's current hash. Unchanged → nothing. Changed → flag
`targetDrifted` with attribution; if the suggestion's *linked fix* just merged and the
new render matches the suggested text → auto-resolve; otherwise the record stays open,
re-anchored to the new text, queued for a "does your complaint still apply?" re-check.
A wrong-vocab complaint usually survives unrelated regens — auto-staling would throw
away reviewer labor. Deleted patterns → `closed-orphaned`.

## 6. Sign-offs & badges — computed, never stored

A sign-off record (in `verifications.json`, latest-wins per `pattern|language` key,
history in git):

```jsonc
{ "patternId": "toggle-class-click", "language": "ja",
  "textHash": "a1b2c3d4e5f60718",
  "text": "クリック時 .active を切り替える",        // snapshot for human diffing when stale
  "sourceHash": "9f8e7d6c5b4a3921",
  "reviewer": { "id": "yuki-t", "name": "Yuki T.", "kind": "human" },
  "date": "2026-07-20",
  "provenance": { "gitCommit": "abc1234", "dbStamp": "eaca7bd0…" },  // diagnostic only
  "notes": "natural; formal register appropriate for docs" }
```

> **Badge invariant:** the "verified by native speakers" badge renders for
> `(pattern, language)` iff the ledger entry's `textHash` equals the hash of the
> *current* rendered text. No process ever "updates a badge" — validity is a pure
> function of (ledger × current DB).

Consequences that fall out for free:

- Regeneration that changes text **auto-invalidates** the badge; regeneration that
  reproduces identical text keeps it. Zero invalidation bookkeeping.
- A reviewer physically cannot mint a badge for text the generator doesn't currently
  produce.
- `patterns.db.stamp` is local/gitignored (a hash of generator source trees) — it is
  **diagnostic provenance only**, never the validity mechanism.

**Plumbing:** `sync-translations.ts` joins the ledger after generating each row and
writes three new `pattern_translations` columns — `verified_native` (0/1),
`verified_native_by`, `verified_native_stale` (sign-off exists, hash mismatches) — so
the existing site export path (`export-patterns.js` → `translations.json` → runtime
API) carries badge state with a trivial row-shape change. Do **not** overload the
machine columns (`verified_parses`, `verified_executes`) — human sign-off is a separate
join, and only `reviewer.kind: "human"` counts for badges. *Stale* is an internal
triage state (re-request sign-off, show the reviewer the diff), never a public badge —
an honest badge is the whole product claim. The multilingual CLI gains
`--verified-coverage` (per-language verified/stale/unverified counts — the wave-progress
dashboard).

**Vocab sign-offs stay separate** (`vocab-verifications.json`, keyed `lang|concept`,
pinning raw values). A native speaker approving the *word* 切り替える says nothing about
whether an assembled sentence reads naturally, so vocab sign-offs never imply pattern
verification. The link is one-way and advisory: patterns whose keywords all carry valid
vocab sign-offs get triage priority as likely-quick pattern sign-offs. Invalidation
flows *down* automatically (an S1 edit invalidates the vocab sign-off by value mismatch
and, via regeneration, any pattern sign-off whose text changes).

## 7. Suggestion lifecycle & the triage pipeline

Suggestion record (site intake, then materialized to `data/review/suggestions/`):

```jsonc
{ "id": "01J0X9GN3QK7",
  "target": { /* pattern or vocab address, §5 */ },
  "kind": "edit",                      // or "flag" (T0 category counter)
  "complaint": "「時」 here reads stiff; UI register is 「で」",
  "suggestedText": "クリックで .active を切り替え",   // optional
  "author": { "kind": "human", "id": "yuki-t" },      // or "agent", §7b
  "status": "open", "targetDrifted": false,
  "endorsements": 3,
  "triage": null,                      // agent-filled: surface diagnosis + evidence
  "fix": null,                         // { overlayEdits, changesetId, pr }
  "resolution": null,
  "links": { "duplicateOf": null, "relatedSuggestions": [] } }
```

**States:**

```
open ─agent─▶ triaged ─agent─▶ fix-proposed ─founder─▶ in-pr ─▶ merged-awaiting-regen
  │              │                  └─founder─▶ rejected (with note)      │
  │              └─▶ needs-info                              ┌───auto─────┘
  ├─▶ closed-duplicate (linked)                              ▼
  ├─▶ closed-orphaned                          resolved-auto | resolved-confirmed
  └─ (targetDrifted can attach to any open state)
```

T2 submissions for their trusted language are born `accepted` (≙ `fix-proposed` with
triage skipped). **`resolved-auto` requires the causal link** — the linked fix merged
AND the new render matches `suggestedText`. A hash change without a linked fix never
auto-resolves (re-anchor, §5).

**Automation boundary:**

| Step | Actor |
| --- | --- |
| Intake, dedup, endorsement aggregation, pull into repo | automated |
| Triage — diagnose responsible surface S1–S5 | automated (agent, §7b), incl. the **render probe**: apply the candidate S1/S4 edit in a scratch overlay, re-render that one pattern, check whether the suggested text is produced; probe result committed as evidence |
| Writing the proposed edit into the profile-editor overlay | automated, marked `proposedBy: agent` — the overlay is already a staging area by design |
| Batch review of overlay → `export.ts` → PR | **founder-gated** (the existing flow; no second path) |
| Merge | **founder-gated**, behind full CI |
| Post-merge regen, hash re-check, auto-resolve, reply drafting | automated (replies to humans: agent-drafted, founder-approved at first) |

**Collective input** surfaces as aggregation: the public queue groups by target, ranked
by distinct suggestions + endorsements; multiple people flagging the same translation
bubble to one line. "Responded to" = the row's status + note is visible on the pattern
page itself — no notification system in v1. T2 reviewers adjudicate their own
language's queue, which is the main founder-hours reduction: **the founder stops being
the judge and becomes the applier.**

### 7b. LLM agents — first-class, but two distinct artifact types

1. **Sweep suggestions** — a founder-local script (`scripts/community/agent-sweep.ts`)
   feeds `vocab dump --format json` tables and sampled translations to Claude with a
   naturalness/consistency rubric and POSTs findings under an agent user (service
   token). Extra fields: `author.kind: "agent"`, model id, versioned `sweepConfig`
   path, `confidence`, and `evidence` (reparse round-trip + role fidelity, render-probe
   result, rationale). Founder-local rather than on-Fly: cost control, prompts
   versioned next to the vocab model, no cron infrastructure. Run before each triage
   session and before onboarding a language's reviewer (pre-seeds their queue).
2. **Triage attachments** on existing (usually human) suggestions — written into that
   record's `triage` field, never filed as duplicates. When a sweep would file against
   a target with an open human suggestion, it attaches instead.

Rules: **humans outrank agents for attention; agents pre-chew.** Agent findings never
gate anything and never count toward badges (`author.kind`/`reviewer.kind` is
load-bearing in the badge query).

## 8. Fan-out: one logical vocab change = N surface edits

Filing only the S1 edit and letting `vocab validate` flag S3/S5 drift is *correct*
(nothing wrong merges) but operationally bad: every accepted change turns CI red until
someone hand-chases dictionaries and tokenizer EXTRAS — reviewer goodwill converted
into founder toil.

**Decision: model the changeset explicitly; V1–V4 stays the net, not the workflow.**
When triage lands a vocab-level fix, compute the fan-out set from the vocab model (the
`LangVocab` view already knows which of S2/S3/S5 contain the old form — it's exactly
what V1–V4 compare) and record it in `data/review/changesets/<id>.json`: the S1 edit
`via: "overlay"` plus agent-generated `via: "patch"` entries for S3/S5, all landing in
the **same export PR** so it is green-by-construction, with `vocab validate` in CI
confirming completeness. The changeset id threads complaint → N files → PR in the
suggestion's `fix` record and the PR body.

Keep the overlay itself S1-only (its export contract is byte-compatible profile
source); the multi-surface knowledge lives in the changeset layer. This degrades
gracefully when the planned S3 derive-flip lands: the fan-out computation simply
returns fewer patch entries until the changeset collapses to the S1 edit alone.

## 9. Glossary-first gate & per-language status

**The glossary IS the S1-derived dump.** `vocab dump keywords|markers|events
--language xx` is exactly the concept × native-form table a reviewer must agree to
before pattern review is meaningful — a separate glossary artifact would be a sixth
authoring surface. Glossary review = row-by-row vocab sign-offs (§6) over a **required
concept set** computed from the wave's pattern corpus.

Per-language ladder, tracked in `language-status.json` (committed; stages *recomputed*
from the two verification ledgers, with a CI assert that the committed stage matches):

```
unclaimed → glossary-in-review → glossary-approved → patterns-in-review → verified-wave-1 → …-wave-N
```

An S1 edit that invalidates one concept's sign-off drops only that row and degrades the
stage to `glossary-amended` (a sub-state of approved: pattern review continues; amended
rows queue for re-sign-off) rather than resetting the language.
`packages/semantic/NATIVE_REVIEW_NEEDED.md` eventually becomes a *generated* report
from suggestions + verifications + language-status (its hand-curated linguistic notes
migrate into per-language notes/waiver reasons); its current items get one-time
imported as seed suggestions so the old backlog and the new pipeline are one list.

## 10. Trust invariant

> **Nothing changes `main`, `patterns.db` content, or the public site except a
> founder-merged PR that passed the full CI gate (9-signal fidelity ratchet + vocab
> validate V1–V4). Reviewer trust level changes only who may author proposals without
> triage — never who merges, and never which checks run.**

Three independent gates, no path around any of them: **CI** (machine gate on
correctness), **founder merge** (human gate on intent), **the hash join** (structural
gate on badge honesty). "Trusted" concretely means: overlay edits and sign-offs skip
triage and go straight into the next export batch, and the reviewer's sign-off alone
suffices for the badge (no founder second opinion on naturalness — the founder usually
can't judge it; that's the point of the program). It never means merge rights.

## 11. Staged rollout (Days 46–90)

**Stage 1 — read surfaces (~15–20 h; no auth, no DB, no volume — pure build-time).**
`/community` landing (program description, incentives, recruitment CTA). Vocabulary
browser: build invokes `vocab dump --format json` from the sibling checkout →
`src/_data/vocab.json` → static `/community/vocabulary/{lang}/` pages. Provenance
display on `/patterns` (`translation_method`, `confidence` already exist — surface
them; "auto-generated, not yet verified by a native speaker" is itself the recruitment
pitch). Per-language exclusion flags honored at export. Ships value with zero
operational surface.

**Stage 2 — suggestion capture + triage (~25–35 h).** Fly volume (mount at `/data`,
`community.db` there — **separate file and lifecycle from the image-baked
`patterns.db`**). GitHub OAuth + sessions + service token. Routes: flag / suggest /
endorse / per-target listing / admin disposition / NDJSON export (`?since=` cursor).
UI: affordances in `patterns-page.njk` and vocabulary pages; public queue with
statuses; `/community/admin` triage page. Founder-side: `pull.ts`, `agent-sweep.ts`,
seed the queue from `NATIVE_REVIEW_NEEDED.md`, first agent sweep, first batched triage
session proving the loop end-to-end.

**Stage 3 — trusted tier + badges (~20–30 h; the plan's Day-90 launch item).** Invite
tokens; T2 auto-accept + per-language adjudication; sign-off flow on pattern pages;
`pull.ts` → commit verifications ledger → sync-translations join → badge UI on
`/patterns`. `apps/profile-editor/scripts/import-suggestions.ts` pre-populates the
overlay from accepted rows → first batch-apply → PR → ratchet → regeneration —
demonstrating hash-based badge invalidation/retention live. Onboard Wave-1 reviewers
(es / pt-BR / tr — the book-pilot reviewers double as vocabulary reviewers; one
recruitment motion).

**Steady state per language:** send one invite link + one weekly mechanical batch-apply
pass shared across all languages. Judgment delegated to T2, filtering to agent sweeps,
correctness to CI, badge freshness to content hashing.

## 12. Repo placement

| Piece | Repo | Location |
| --- | --- | --- |
| `/community` pages, vocabulary browser, queue, admin UI | `_hyper_min` | `sites/lokascript-docs/src/community/` |
| Suggestion/auth API routes | `_hyper_min` | `sites/lokascript-docs/api/routes/community.js` (+ `api/middleware/auth.js`, `api/services/community-db.js`) |
| Suggest/flag/badge affordances on patterns browser | `_hyper_min` | `packages/layouts/includes/patterns-page.njk` |
| Per-language exclusion flags | `_hyper_min` | `sites/lokascript-docs/src/_data/community-config.json` |
| `vocab.json` + badge-state emission at build | `_hyper_min` | `sites/lokascript-docs/scripts/export-patterns.js` (extend) |
| Hash util | hyperfixi | `packages/patterns-reference/src/review/text-hash.ts` |
| Verification/suggestion/changeset/status ledgers | hyperfixi | `packages/patterns-reference/data/review/` |
| `verified_native*` columns + ledger join + re-anchor pass | hyperfixi | `packages/patterns-reference/scripts/{init-db,sync-translations}.ts` |
| Sweep + triage-assist + pull scripts, prompts | hyperfixi | `scripts/community/{agent-sweep,pull}.ts` |
| Overlay pre-population from accepted suggestions | hyperfixi | `apps/profile-editor/scripts/import-suggestions.ts` |
| `--verified-coverage` report | hyperfixi | `packages/testing-framework/src/multilingual/cli.ts` |

**Side note — repo rename:** `_hyper_min`'s real identity is its `@lokascript/*` site
packages; per the house naming rule ("Loka" prefix for anything new, nothing new named
hyperfixi), the natural rename is **`lokascript-sites`**. Out of scope here; do it
before the `/community` pages make the repo more publicly visible.

## 13. Open questions (deferred, not blockers)

- **Community-page UI i18n** — the docs site has 9-language UI i18n; the vocabulary
  browser and suggest forms are precisely the pages non-English speakers will use.
  Which stage localizes them, and into how many of the 24?
- **Endorsement spam** — v1 is a rate-limited fingerprint unique-constraint; is that
  enough, or do endorsements need T1 auth once volume appears?
- **Hosted profile-editor** — revisit only on demonstrated T2 demand for a richer
  editing surface than adjudication + auto-accepted suggestions (see §3 rationale).
- **Resolution notifications** — v1 is status-on-page; email/GitHub notification on
  `resolved-*` states is a later nicety.
- **Vocab-level badge surfacing** — vocab sign-offs power the glossary gate internally;
  whether/how to show per-word verification publicly on the vocabulary browser is a
  presentation question for stage 3+.
