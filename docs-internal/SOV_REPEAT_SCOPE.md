# SOV `repeat-*` Loop-Body Reorder — Project Scope

> **Status:** Scoped, not started. Handoff-ready for a fresh session.
> **Track:** Multilingual parse-fidelity (Track 5 in `MULTILINGUAL_ROADMAP.md`).
> **Prereq reading:** `SOV_REORDER_SCOPE.md` (the verb-first event-body reorder
> project — SHIPPED in #298) and `MULTILINGUAL_ROADMAP.md` → Shipped (the if/else
> block-body fix; the SOV verb-first reorder fix; the put-into verb-final fix). This
> project is the **loop sibling** of those: the same "a block keyword is matched as a
> bare command and the body is discarded" failure, but for `repeat`/`while`/`for`/
> `forever`/`until` instead of `if`/event-verbs.

## TL;DR

For SOV languages, an event handler whose body is a **block loop** —
`repeat forever … end`, `repeat while <cond> … end`, `repeat for <x> in <y> …` —
is emitted by the i18n transformer in an order where the loop keyword (`反復`/`반복`/
`tekrarla`/`পুনরাবৃত্তি` = repeat) surfaces ahead of its body. The semantic parser
matches the bare loop keyword as a **standalone `repeat` command** (Stage 2), returns
`{ action: 'repeat', roles: {} }`, and the loop variant + body + event are all
discarded (degenerate parse). **Korean is the worst** (no event-marker particle, so
SOV event extraction can't anchor); **bn** and **qu** also degrade; **ja/tr mostly
recover** (proof the parser _can_ assemble SOV loop bodies — the gap is per-language).

Reachable yield: **~6 SOV degenerate instances** — `ko` (repeat-for-each,
repeat-forever, repeat-while), `qu` (repeat-for-each, repeat-while), `bn`
(repeat-while). Non-SOV repeat degenerates (`ar`, `tl`, `zh`, `sw`) are **separate**
(different word orders) and out of scope here. Lower yield per unit effort than the
event-body work; multi-PR, per-language.

## Failure modes (probe evidence)

Probe = `maskSpans → GrammarTransformer('en',lang) → unmaskSpans → parseSemantic`
(the harness pipeline). Reproduce with the probe script at the bottom.

### Mode A — loop keyword matched as a bare command (the core problem)

```
on load repeat forever toggle .pulse wait 1s end
  ko → 로드 반복 forever .pulse 를 토글 그러면 1s 를 대기 끝
       parsed: { action: 'repeat', roles: {} }   actions {repeat}   fid 0.33 DEGEN

on click repeat while #counter.innerText < 10 increment #counter wait 200ms end
  ko → 동안 #counter.innerText < 10 를 클릭 반복 그러면 #counter 를 증가 …
       actions {while}   fid 0.00 DEGEN
  bn → যতক্ষণ #counter.innerText < 10 কে ক্লিক … actions {while}   fid 0.00 DEGEN
```

The loop keyword (`반복`) — or, for the `while` variant, the leading `while` keyword
(`동안`/`যতক্ষণ`) — is consumed as a bare command/condition and the rest (the event
`로드`/`클릭`, the variant, the body `toggle`/`increment`/`wait`) is dropped. Korean is
hit hardest: it has **no event-marker particle**, so the Stage-3 SOV event extraction
(which is marker-gated for ja `で` / qu `pi` / bn `এ`) can't anchor the event, and the
loop collapses entirely.

### Mode B — partial recovery (ja/tr; not degenerate, residue only)

```
on click repeat while #counter.innerText < 10 increment #counter wait 200ms end
  ja → の間 #counter.innerText < 10 を クリック で 繰り返し それから #counter を 増加 …
       actions {on,while,repeat,increment}   fid 0.75   (drops trailing `wait`)
  tr → iken #counter.innerText < 10 i tıklama de tekrarla sonra #counter i artır …
       actions {on,click,repeat,increment}   fid 0.75   (spurious `click`; drops `wait`)
```

ja/tr **do** assemble the event + while-loop + body (recover `increment`), losing only
the trailing `wait` — a then-chain tail issue, not a full collapse. This proves the
parser's SOV loop-body path works **when the event anchors**; the project is to make it
anchor for the marker-less / weaker languages (ko especially) and tidy the tail.

### Contrast — counted loop (`repeat N times`) already works

```
on click repeat 3 times add "<p>Line</p>" to me
  ja/ko/tr/bn → … 繰り返し/반복/tekrarla/পুনরাবৃত্তি … それから/그러면/sonra/তারপর <body>
       actions {on,repeat,add}   fid 1.00
```

The **non-block** counted variant (`repeat N times <body>`, no `end`) reorders to a
then-chain the shipped juxtaposed/then-chain fixes already recover. Only the **block**
variants (`forever`/`while`/`for`/`until`, terminated by `end`) collapse. `qu` is the
exception even here (`repeat 3 times` → `{on,toggle,add}` fid 0.50): its `kutichiy`
(repeat) keyword is mis-parsed as `toggle`/`return`/`add`, a **separate qu keyword
collision** (see Risks).

## Root cause (two layers — mirror the if/else fix, where the parser was the real blocker)

1. **i18n transformer** (`packages/i18n/src/grammar/transformer.ts`,
   `tryTransformEventWithBlockBody` + `transformBlockBody`). The event-handler
   block-body path (shipped for `if`/`unless`) covers `repeat`/`while`/`for` too
   (`BLOCK_BODY_KEYWORDS`), and emits **event-clause first, then the block**. For SOV
   the block itself reorders so the loop keyword leads the body and the loop _variant_
   (`forever`/`while <cond>`/`for <x> in <y>`) sits between the keyword and the body —
   an order the parser's loop assembly doesn't fully consume. Verify whether the
   variant/condition placement (e.g. leading `while`/`の間`/`동안` vs. trailing) is what
   strands the body.

2. **semantic parser** (`packages/semantic/src/parser/semantic-parser.ts`). A bare loop
   keyword matches the generated `repeat` **command** pattern at **Stage 2** and returns
   `{ action: 'repeat', roles: {} }` before the loop/block-body and SOV event-extraction
   logic runs. The loop node assembly (`LoopSemanticNode`, `createLoopNode`,
   variants `forever`/`while`/`for`/`until`) and `trySOVEventExtraction` exist but
   (a) Stage-2 shadows them for the marker-less ko case, and (b) the `while`-condition /
   `for … in …` clause isn't being attached to the loop body. This is the same shape as
   the if/else Tier-1 fix (a fused pattern captured the block keyword as the action and
   dropped the body) — expect the **parser** to be the real blocker, not just the
   transform.

## Fix approaches (pick during execution)

### Approach A — Parser: don't let a bare loop keyword shadow the SOV loop/event path

Gate the Stage-2 `repeat`-command match so it does **not** win when the token stream
also contains a loop variant (`forever`/`while`/`for`/`until` keyword) and/or a
mid-stream event keyword — fall through to the loop-body + SOV event-extraction path
instead. Mirror the shipped `buildEventHandler`/if-block fix: parse the trailing block
body rather than accepting the bare keyword. Extend `trySOVEventExtraction` (or the loop
assembler) to recognize a **marker-less ko event** before a loop keyword (it already
handles the marker-less event-before-verb case for simple bodies).

- **Pro:** parser-only, generalizes across languages at once.
- **Con:** must not regress the working `repeat N times` counted variant or ja/tr's
  partial recovery; gate strictly on "a loop variant keyword is present."

### Approach B — Transformer: keep the loop variant/condition adjacent to the body

Make the SOV block-body reorder emit the loop in an order the parser already consumes
(e.g. event-clause first, then `<variant> <body> <end>` as a self-contained unit with
the variant kept adjacent to the body, not split by the event). Mirror
`tryTransformEventWithBlockBody`'s event-first emission, but verify the `while <cond>` /
`for <x> in <y>` clause placement per word order.

- **Pro:** routes SOV loops into the already-working ja/tr shape.
- **Con:** transformer loop reorder is fiddly; the `while`-condition and `for`-binder are
  multi-token clauses that mask/reorder differently than a simple patient.

> A hybrid is likely (as with the event-body project): the parser recognizes the loop +
> event and re-parses the body; the transformer tidies the variant/condition placement.
> Validate which single side suffices per pattern before doing both.

## Affected patterns / expected yield (verify against a fresh regen)

SOV degenerate instances in the committed baseline (`browser-priority`, all 24 tracked):

| Language | Degenerate repeat-\* instances                |
| -------- | --------------------------------------------- |
| ko       | repeat-for-each, repeat-forever, repeat-while |
| qu       | repeat-for-each, repeat-while                 |
| bn       | repeat-while                                  |

**Out of scope (non-SOV, separate word-order issues):** `ar` (VSO: repeat-for-each,
repeat-while), `tl` (Austronesian: repeat-for-each, repeat-while), `zh` (SVO:
repeat-forever), `sw` (SVO: repeat-until-event). Cross-check the live degenerate list at
execution time — counts drift as other fixes land.

**Compounded for qu:** the `kutichiy` (repeat) keyword mis-parses as `toggle`/`return`/
`add` even in the counted variant — a **keyword-alignment** issue (cf. the ja `取得`/`get`
and ko `가져오기`/`fetch` collisions). Fix qu's repeat keyword alignment **first** (likely a
quick win, separate from the structural reorder), then re-measure qu's repeat-\* set.

## Risks / gotchas

- **Don't regress the counted variant or ja/tr partial recovery.** `repeat N times` and
  the ja/tr `while`/`forever` loops already parse (fid 0.75–1.00). Guard any change to
  fire only on the SOV block-loop collapse shape.
- **Korean has no event-marker particle.** The Stage-3 SOV event extractor is
  marker-gated for ja/qu/bn/tr; ko relies on "event identifier immediately precedes a
  command verb." A loop keyword (`반복`) counts as that verb, so the extractor may need to
  treat a loop keyword like any other body verb. This is the crux for the 3 ko instances.
- **qu keyword collision is a confound.** `kutichiy` mis-parsing inflates qu's degenerate
  count independent of the reorder. Separate the two: a qu keyword PR, then the structural
  PR. Don't let qu noise mask a real ko/bn structural win.
- **Fidelity is recall-based** — won't catch over-generation (note tr's spurious `click`
  in Mode B). After any parser change run the **semantic role-extraction suite**
  (`npm test --prefix packages/semantic`) in addition to the regen.
- **Validate with the `--regression` gate**, not raw counts; trust a controlled A/B
  (same DB, build toggled) over a single run. Restore the binary `patterns.db` before
  committing (CI repopulates from source).

## Validation playbook (same as the shipped fixes)

1. Edit `packages/semantic/src/...` (and/or `packages/i18n/src/grammar/...`).
2. Rebuild: `cd packages/semantic && npx tsup` (and `packages/i18n` if touched:
   `npx tsup --format cjs,esm`).
3. Repopulate DB: `cd packages/patterns-reference && npm run db:init:force &&
npm run sync:translations` (confirm `pattern_translations` = 3936).
4. Regen to a temp baseline + diff vs committed:
   `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full
--bundle browser-priority --save-baseline --baseline /tmp/b.json`, then a node diff of
   per-language `degeneratePasses` / `avgFidelity` / `parseSuccess`.
5. `--regression` gate must say "No regression". Then `--save-baseline` to the committed
   path (`packages/testing-framework/baselines/multilingual-priority.json`).
6. Add locks in `packages/semantic/test/multilingual-roadmap-fixes.test.ts` (parse
   recovery) and, if the transform changed, `packages/i18n/src/grammar/grammar.test.ts`.
7. Restore `git checkout packages/patterns-reference/data/patterns.db`. Don't commit it.

## Probe script (drop at repo root, `npx tsx probe.ts "<en code>" ja ko tr bn qu`)

```ts
/* eslint-disable no-console */
import { GrammarTransformer } from './packages/i18n/src/grammar/transformer';
import * as SpanMaskNS from './packages/patterns-reference/src/sync/span-mask';
import { parseSemantic } from './packages/semantic/src/index';
const SpanMask = (SpanMaskNS as any).default ?? SpanMaskNS;
const { maskSpans, unmaskSpans } = SpanMask;
const [, , code, ...langs] = process.argv;
function transform(src: string, l: string): string {
  if (l === 'en') return src;
  const { masked, spans } = maskSpans(src);
  return unmaskSpans(new GrammarTransformer('en', l).transform(masked), spans);
}
function collect(node: unknown, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;
  if (typeof n.action === 'string' && n.action !== 'compound') acc.add(n.action);
  for (const k of [
    'body',
    'statements',
    'commands',
    'thenBranch',
    'elseBranch',
    'branches',
    'value',
    'node',
  ]) {
    const c = n[k];
    if (Array.isArray(c)) c.forEach(x => collect(x, acc));
    else if (c) collect(c, acc);
  }
}
function act(src: string, l: string): string[] {
  try {
    const r = parseSemantic(src, l) as any;
    const a = new Set<string>();
    collect(r.node ?? r, a);
    return [...a];
  } catch {
    return ['ERR'];
  }
}
const ref = act(code, 'en');
console.log(`EN ref {${ref.join(',')}}: ${code}`);
for (const l of langs) {
  const t = transform(code, l);
  const a = act(t, l);
  const fid = ref.length ? ref.filter(x => a.includes(x)).length / ref.length : 1;
  console.log(
    `  ${l} {${a.join(',')}} fid ${fid.toFixed(2)}${fid < 0.5 ? ' DEGEN' : ''}\n     ${t}`
  );
}
```

Corpus inputs to probe:
`on load repeat forever toggle .pulse wait 1s end`,
`on click repeat while #counter.innerText < 10 increment #counter wait 200ms end`,
`on click repeat for item in .items add .processed to item`,
`on click repeat 3 times add "<p>Line</p>" to me` (control — should stay faithful).

## Definition of done

SOV `repeat-forever` / `repeat-while` / `repeat-for-each` parse faithfully for ko/bn
(deg→faithful), qu's repeat-keyword collision resolved and its repeat-\* re-measured,
`--regression` gate green, role-extraction suite clean (no over-generation, incl. tr's
spurious-`click` residue), baseline regenerated, locking tests added.
