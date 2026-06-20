# Word order across 24 languages: the phenomena the engine solves

> One behavior, radically different surfaces. `toggle .active on #button` is
> verb-second in German, verb-final in Japanese, verb-initial in Arabic, and
> particle-marked in Korean. The semantic engine's job is to recover the **same
> structure** — the same command, the same roles — from all of them. This catalog
> names the hard linguistic phenomena that makes that difficult, and links each to
> the **executable guard test** that proves it stays solved.

This is the qualitative companion to [`FIDELITY.md`](./FIDELITY.md) (which measures
_whether_ meaning is preserved); this doc explains _what is hard about preserving
it_ across word orders. Every phenomenon below is enforced by a `describe(...)`
block in
[`packages/semantic/test/multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
— the titles in **`guard:`** lines are greppable, and the multilingual
`--regression` gate ratchets the same behavior across the full corpus. The catalog
can't drift into marketing: if a claim here breaks, a test goes red.

## The four word orders (and the rest)

The canonical `toggle .active on #button`:

| Order   | Languages                                  | Surface shape                     | Example                              |
| ------- | ------------------------------------------ | --------------------------------- | ------------------------------------ |
| **SVO** | en, es, fr, pt, it, id, ms, sw, zh, vi, tl | verb leads                        | `on click toggle .active on #button` |
| **SOV** | ja, ko, tr, qu, hi, bn                     | verb last; particles mark roles   | ja `#button で .active を トグル`    |
| **VSO** | ar                                         | verb first                        | ar `بدّل .active على #button`        |
| **V2**  | de                                         | finite verb second, particle last | de `schalte .active auf #button um`  |
| other   | ru, uk, pl, th, he                         | mixed / case-marked               | —                                    |

A faithful parse of all of these collapses to the **same** semantic node
(`toggle`, patient `.active`, destination `#button`). The phenomena below are the
ways that collapse goes wrong — and how the engine handles each. Mechanisms live in
[`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts),
[`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts), and the
per-language [`tokenizers/`](../packages/semantic/src/tokenizers/); the inverse
transform is [`i18n/.../transformer.ts`](../packages/i18n/src/grammar/transformer.ts).

---

## 1. Verb position — final _and_ medial (SOV)

**Challenge.** SOV puts the verb last (`.active を トグル`), but the grammar
transform often emits a verb _between_ roles for two-role commands
(`destination を verb patient に`). A pattern matcher that expects strict
verb-final order matches neither.

**Mechanism.** `parseSOVClauseByVerbAnchoring` finds the verb token, then assigns
the marked tokens on each side to roles by their particle — order-independent.
`sovCommandStartsAt` lets boundary detection _recognize_ a verb-medial command
head (a value+marker run leading to a verb) that `matchBest` can't anchor.

**guard:** `SOV put-into verb-final reorder — ko/tr/bn (Track 5)` ·
`SOV verb-first event-body reorder — modifier-prefixed bodies (Track 5)`

## 2. Fronted markers & leading clauses (VSO / Austronesian)

**Challenge.** VSO fronts a handler's `from <source>` clause _ahead_ of the event
marker (`on click from triggerEl` → ar `من triggerEl عند نقر`), and fronts a
loop's keyword ahead of its `on <event>` (mid-stream event). No event pattern
anchors on the leading source marker, so the whole handler + body can drop.

**Mechanism.** The parse entry detects a leading `source`-marker followed by an
`on`-marker (VSO-gated), moves the from-clause to _after_ the event, and re-parses
the normalized `on <event> from <source>` order the SVO path already handles. The
source is moved, never dropped, so role fidelity is intact.

**guard:** `VSO from-first event-handler head — ar/tl (behavior-removable/sortable)` ·
`VSO/Austronesian repeat-* mid-stream event reorder — ar/tl (Track 5)` ·
`event-head source clause — profile markers, both orders (focus-trap pl/uk/zh/bn/hi)`

## 3. Nested-block bodies — the trailing-command problem

**Challenge.** A handler body like `if … end / trigger … / remove …` must keep the
commands _after_ a nested block. In SOV/VSO the handler's leading (unconsumed)
clause left the body's pending buffer non-empty at the first `if`, so the block
never folded — and the body parser then treated the nested block's `end` as the
_body's_ terminator, dropping everything after it.

**Mechanism.** `parseBodyWithClauses` tracks nested-block opener depth
(`if`/`unless`/`while`/`for`/`repeat`); while inside a block, `end` is content, not
the body terminator. The SOV/VSO analogue of the earlier fused-body fixes.

**guard:** `Depth-aware end: command after a nested block in SOV bodies (A2b)` ·
`if/else block-body in event handlers — Track 5 Tier 1` ·
`SOV repeat-* loop-body reorder — ko/bn/qu (Track 5)`

## 4. Conditional boundaries — the verb-medial then-branch

**Challenge.** Splitting `if <cond> <then-branch>` requires finding where the
condition ends. The boundary detector used a plain `matchBest`, which can't see an
SOV **verb-medial** command (`triggerEl を 設定 私 に` = `set triggerEl to me`) — so
the then-branch command was swallowed into the condition and lost. (Notably _not_ a
copula problem: a selector-patient then-branch survives even with a copula
condition; a verb-medial one drops even with a trivial condition.)

**Mechanism.** The split also recognizes a verb-medial command head
(`sovCommandStartsAt`), so the then-branch boundary is found and the command is
handed to the branch parser, which already handled it.

**guard:** `Verb-medial SOV command head in a conditional body (A2a init set drop)` ·
`generated if/unless condition accepts reference + selector conditions (universal if drop)`

## 5. Juxtaposed commands without `then`

**Challenge.** Behavior bodies chain commands by newline, not `then`. When a
verb-medial SOV command (`set X to me`, `trigger E on me`) is juxtaposed _before_ a
matchable one (`toggle .y`), `matchBest` skipped the verb-medial command one token
at a time and it vanished — the whole-clause fallback never fired because a later
command _did_ match.

**Mechanism.** `parseClause` collects each skipped run and recovers verb-medial
commands from it (value-led + real-schema-with-roles filter; defers to the
whole-clause fallback when nothing matched, so a single verb-final command isn't
fragmented). This also cleared the SOV `trigger … on me` "trigger-tail."

**guard:** `Juxtaposed verb-medial SOV command in a body (parseClause gap recovery)` ·
`Juxtaposed multi-command event bodies — Track 5`

## 6. Agglutinative & boundary tokenization

**Challenge.** The keyword table injects English canonical fallbacks (`me`, `it`,
`you`, `in`, …) into _every_ language. A naive word reader splits native words
around them: Quechua `init` → `in` + `it`; `ñit'iy` → `ñ` + `it` + `'iy`. Japanese
must not split a longer keyword either (`もし` / "if" must not become `も` + `し`).

**Mechanism.** Per-language boundary rules: the Quechua reader breaks only on real
case-marker suffixes (`-ta`/`-man`/`-pi`…), never on a fallback substring
(`quechuaSuffixStartsAt`); the Japanese reader matches longest-keyword-first so a
particle never splits a longer word.

**guard:** `Quechua word reader does not split native words at English fallbacks (init)` ·
`ja particle reading must not split a longer keyword (もし → も+し)`

## 7. Homonyms & disambiguation

**Challenge.** A surface form can mean two things. Portuguese `para` is _both_ the
`for`-loop keyword _and_ the dative "to" marker — counted as a loop opener it
corrupted block depth. `empty` is a command _and_ an adjective (`is empty`). A
fronted literal/URL can be mistaken for an event (`on /api/data …`). The locative
`in <scope>` collides with the temporal `in`.

**Mechanism.** Trust the tokenizer's _normalized role_ over the colliding surface
form (`isBlockOpener` counts an opener only when the token's normalized form is an
opener action); an event-anchor guard rejects selectors/URLs/literals as event
names; predicate keywords (`empty`) are profile alternatives, not structural verbs,
in condition position.

**guard:** `Block depth tracking ignores marker/opener homonyms (pt para, sw)` ·
`` `is empty` predicate alignment (verb vs adjective) `` ·
`temporal in must not swallow a locative in <scope> (first-in-parent / B1)`

## 8. Dict ↔ tokenizer ↔ transformer alignment

**Challenge.** The three components must agree on every native surface form. The
transform emits a word the tokenizer didn't list (Malay `bind ke`, Swahili input
event `ingizo`, Korean fetch `가져오기` vs loanword `패치`) → it tokenizes as a bare
identifier and the command silently degrades. This is the single largest _class_ of
guards — most "keyword alignment" tests.

**Mechanism.** Register the emitted native form as a tokenizer alternative aligned
to the same normalized action; keep schema markers, profile markers, and tokenizer
entries in sync (the `sync-keywords` tooling + per-language profiles).

**guard:** `Korean fetch keyword alignment (가져오기)` ·
`qu/sw increment keyword alignment (yapachiy / ongezeko)` ·
`ms (Malay) profile: event handler + set + fetch` _(…and ~30 siblings)_

---

## The recurring meta-pattern

Every phenomenon above is one shape of a single root cause:

> **The SOV/VSO/V2 surface form is structurally different from what a matcher or
> heuristic implicitly assumed** — verb-medial vs verb-final, a fronted marker, an
> unconsumed leading clause, a fallback substring inside a native word, a homonymous
> surface form, a dict/tokenizer mismatch.

That is why a handful of complex **behaviors** (draggable/sortable/removable) were
such efficient probes: each stacks many of these shapes into one pattern, so fixing
it hardens the _general_ engine, not the behavior. And because each fix is gated by
**word-order / token-shape**, never by pattern name, it accrues to every future
behavior and every hand-written multilingual program. See
[`FIDELITY.md`](./FIDELITY.md) for how each fix is proven not to regress.
