# Non-SOV `repeat-*` Loop-Body + Tail Residue — Project Scope

> **Status:** ✅ SHIPPED (the structural slice). Two parser-side fixes —
> the **`end`-mid-stream tail merge** (#3) and the **`for`-binding `repeat`-keyword
> recovery** (#2) — together cleared the last degenerate `repeat-*` (zh
> `repeat-forever`, #1) and lifted the `for`-binding (#2), `wait`-after-`end` (#3),
> and sw leading-clause (#4) residues. **Degenerate passes 135 → 132 (−3), parse
> rate 3678 → 3679 (+1, he), 0 regressions** (`--regression` gate green; zero
> faithful→degenerate flips). Cleared zh `repeat-forever` (deg→faithful) + sw
> `repeat-until-event` + bonus `focus-trap` (sw/tr); for-each ar/tl/zh 0.67→1.0;
> while ja/ko/tr 0.75→1.0, qu 0.50→0.75; sw while 0.50→0.75. Locked by
> `multilingual-roadmap-fixes.test.ts` ("Non-SOV repeat-\* loop-body + tail
> residue"). **Follow-up keyword tracks (both now ✅ SHIPPED):** the qu/sw
> `add`-vs-`increment` overlap (qu `yapachiy` / sw `ongezeko` dict alignment + a
> handcrafted qu SOV increment pattern; qu/sw `repeat-while` → 1.0), and the zh
> `wait` BA-marked duration (`等待 把 1s` — a handcrafted `wait-zh-ba` pattern;
> zh `repeat-forever` 0.67 → 1.0). The "zh `wait` SVO gap / `等待 1s`" framing was a
> probe artifact — bare `等待 1s` always parsed; the `把` object-marker on the
> duration was the real blocker. The deeper transformer root cause is scoped in
> [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md). See `MULTILINGUAL_ROADMAP.md` → Shipped.
> **Prereq reading:** `SOV_REPEAT_SCOPE.md` (the SOV sibling, SHIPPED) and
> `MULTILINGUAL_ROADMAP.md` → Shipped (SOV repeat-\* loop-body reorder; VSO
> mid-stream event reorder).

## What shipped (this arc)

Both fixes live in `packages/semantic/src/parser/semantic-parser.ts`, parser-side,
no transformer change (as predicted below):

1. **`end`-mid-stream tail merge** (`parseBodyWithClauses`). The verb-final SOV
   reorder strands a trailing command's argument before `end` and its verb after
   (`… 200ms 終わり を 待つ`). The `end`-break now tolerates a single trailing clause:
   it collects the post-`end` tokens up to the next then/end boundary and parses
   them — merging with the stranded pre-`end` argument when those tokens parsed to
   nothing on their own. Recovered the trailing `wait` for ja/ko/tr (→1.0) and qu
   (→0.75), and (bonus) cleared `focus-trap` for tr.
2. **`for`-binding `repeat`-keyword recovery** (`parseClause`). The transformer
   drops the `for` binder keyword (`repeat for x in y` → `repeat x in y`), so the
   bare `repeat` carries no matchable variant and matchBest can't anchor it. When
   matchBest fails on a token normalized to `repeat`, the clause parser now emits
   the `repeat` action directly. Lifted for-each ar/tl/zh to 1.0, cleared the zh
   `repeat-forever` degenerate, and recovered sw's leading `rudia`(repeat) clause.

## Earlier in this arc (VSO/Austronesian slice)

- **VSO/Austronesian mid-stream event (ar/tl).** For VSO the transformer surfaces the
  loop keyword first and the event clause mid-stream (`كرر عند نقر …` =
  `repeat on click …`); the trailing-event extractor couldn't see it, so the bare
  loop keyword won Stage 2. `tryMidStreamEventExtraction` (parser) strips the
  `<on-marker> <event>` pair and re-parses the rest as the loop body. Gated to
  block/loop actions. **Cleared ar `repeat-for-each`/`repeat-while` + bonus
  `focus-trap`/`window-keydown`, tl `repeat-for-each`/`repeat-while`** (−6 degenerate,
  148→135 cumulative with the SOV fix). Locked by `multilingual-roadmap-fixes.test.ts`
  ("VSO/Austronesian repeat-\* mid-stream event reorder — ar/tl").

## TL;DR — what the four residues were (all now addressed)

| #   | Issue                                         | Languages          | Was                             | Now                            |
| --- | --------------------------------------------- | ------------------ | ------------------------------- | ------------------------------ |
| 1   | **zh circumfix + block-body collapse**        | zh                 | `repeat-forever` 0.33 **DEGEN** | 0.67 faithful ✅ (deg cleared) |
| 2   | **`for`-binding drops the `repeat` keyword**  | ar, tl, ko, zh     | `repeat-for-each` 0.67          | 1.0 ✅                         |
| 3   | **then-chain tail drop (`wait` after `end`)** | ja, tr, ko, qu, zh | `repeat-while` 0.50–0.75        | ja/ko/tr 1.0, qu 0.75 ✅       |
| 4   | **sw `repeat-while` leading clause drop**     | sw                 | `repeat-while` 0.50             | 0.75 ✅ (`rudia` recovered)    |

#1 was the only degenerate; recovering the bare `repeat` keyword (#2's fix) lifted it
above the 0.5 threshold. The residual gaps to full 1.0 fidelity — zh `wait`
(`等待 1s` doesn't parse, a zh SVO pattern gap), qu/sw `increment` (parsed as `add`,
keyword overlap) — are **deferred keyword-alignment tracks**, called out below as
out of scope for this structural arc.

> The remainder of this file is the **original problem analysis** (probe evidence,
> root causes, sequencing) kept for the record; the failure modes below describe the
> pre-fix behavior.

## Failure modes (probe evidence)

Probe = `maskSpans → GrammarTransformer('en',lang) → unmaskSpans → parseSemantic`.
Reproduce with the probe script at the bottom.

### #1 — zh circumfix event + block-body collapse (the only remaining degenerate)

```
on load repeat forever toggle .pulse wait 1s end
  zh → 当 加载 时 重复 forever 切换 把 .pulse 那么 等待 把 1s 结束
       parsed: {on,toggle}   fid 0.33 DEGEN  (drops repeat + wait)
```

zh wraps the event in a **circumfix** `当 … 时` (`on load` → `当 加载 时`), so the
Stage-1 zh event pattern _does_ anchor (the `on` survives) — unlike the SOV/VSO cases,
this is **not** an event-extraction problem. The body
`重复 forever 切换 把 .pulse 那么 等待 把 1s 结束` collapses: only `切换`(toggle) is
recovered; the leading `重复`(repeat) + English `forever`, and the trailing
`等待 把 1s 结束`(wait … end), are dropped. This is a **zh block-body parse gap** — the
same family as the deferred zh `fetch`-in-event-block gap noted in the roadmap (zh's
block-body body parser is the recurring zh blocker). Likely needs the body re-parse to
(a) tolerate the leading `重复 forever` as a repeat clause and (b) not let `结束`(end)
mid-stream truncate the trailing `等待`(wait) — see #3.

### #2 — `for`-binding drops the `repeat` keyword (shared, ar/tl/ko/zh)

```
on click repeat for item in .items add .processed to item
  ar → كرر عند نقر item في .items ثم أضف .processed إلى item
       {on,add}  fid 0.67   (event + add recovered; `repeat` dropped)
  ko → 클릭 반복 item 안에 .items 그러면 .processed 를 추가 item 에
       {on,repeat,add} fid 1.00   ← ko already recovers repeat here
```

After the event is stripped, the for-binding clause `كرر item في .items`
(`repeat item in .items`) doesn't yield a `repeat` action — the generated `repeat`
command pattern doesn't match `repeat <identifier> <in-marker> <selector>` (the
`for <var> in <coll>` binder). ko happens to recover it (its clause parser tolerates
the binder); ar/tl/zh don't. The EN reference is `{on,repeat,add}`, so the dropped
`repeat` is the 0.67→1.0 gap. A `repeat`/`for` binder sub-pattern (or a `for`-binding
branch in `parseClause`) would lift all three at once.

### #3 — then-chain tail drop: `end` mid-stream truncates the trailing `wait`

```
on click repeat while #x.innerText < 10 increment #x wait 200ms end
  ja → … それから #counter を 増加 それから 200ms 終わり を 待つ   {…,increment} 0.75 (drops wait)
  ko → … 그러면 #counter 를 증가 그러면 200ms 끝 를 대기            {…,increment} 0.75 (drops wait)
  qu → … chayqa #counter ta yapay chayqa 200ms tukuy ta suyay     {…,add}       0.50 (drops wait)
```

The verb-final SOV reorder places the block-terminating `end`
(`終わり`/`끝`/`tukuy`/`结束`) **between** the trailing duration and its `wait` verb
(`200ms 終わり を 待つ` = `200ms end ‹patient› wait`). `parseBodyWithClauses` treats
`end` as a hard block terminator (`isEndKeyword` → break), discarding the
`を 待つ`/`를 대기`/`ta suyay` that follows. Making the `end`-break tolerant of a
trailing post-`end` clause (parse it, then stop) would recover the `wait` across
ja/tr/ko/qu **and** zh — a single structural fix touching several patterns. **Higher
leverage than #1/#2.** Watch for over-reach: `end` must still terminate a genuine
nested block; gate the tolerance to "a single trailing command clause after `end`."

### #4 — sw `repeat-while` leading clause drop

```
on click repeat while #x.innerText < 10 increment #x wait 200ms end
  sw → kwenye bonyeza rudia wakati #counter.innerText < 10 kisha ongeza #counter kisha ngoja 200ms mwisho
       {on,add,wait}  fid 0.50   (drops `rudia`=repeat + `wakati`=while)
```

sw is SVO, so the event leads (`kwenye bonyeza` = `on click`), then
`rudia wakati <cond> kisha <body>`. The Stage-1 sw event pattern anchors the event and
the then-chain body (`ongeza`/`ngoja`), but the **leading `rudia wakati`**(repeat
while) clause between the event and the first `kisha`(then) is dropped. Likely the
event-handler body parser starts at the first then-keyword and skips the pre-`then`
loop head. (sw `ongeza` parses as `add` not `increment` — a separate sw
add/increment keyword overlap; doesn't affect the degenerate line.)

## Root-cause summary (where each lives)

| #   | Layer                            | Hook                                                                            |
| --- | -------------------------------- | ------------------------------------------------------------------------------- |
| 1   | parser (zh block-body re-parse)  | the zh Stage-1 event body / `parseBodyWithClauses` for zh                       |
| 2   | parser (for-binding sub-pattern) | `parseClause` / generated `repeat` pattern (add a `for <var> in <coll>` branch) |
| 3   | parser (end-break tolerance)     | `parseBodyWithClauses` `isEndKeyword` break (allow one trailing clause)         |
| 4   | parser (pre-then loop head)      | event-handler body parse start (capture the loop head before the first `then`)  |

All four are **parser-side**; none needs a transformer change (the transforms are
already in a recoverable order — they were for the shipped slices too).

## Suggested sequencing

1. **#3 first (highest leverage).** The `end`-mid-stream tail drop touches ja/tr/ko/qu
   **and** zh `repeat-while`, and is a contained `parseBodyWithClauses` change. Do it
   before #1 — it's likely _part_ of why zh `repeat-forever` drops its `wait`.
2. **#1 next (clears the last degenerate `repeat-*`).** With #3 in place, re-probe zh
   `repeat-forever`; what remains is the `重复 forever` leading-clause recovery (cf. #2).
3. **#2 (fidelity sweep).** The `for`-binding `repeat`-keyword recovery lifts ar/tl/zh
   (and is a clean win once #1's zh body parses). Mirror ko's working binder handling.
4. **#4 (sw).** Smallest, most isolated; do last.

## Risks / gotchas

- **#3 over-reach.** `end` legitimately closes nested blocks. Gate the trailing-clause
  tolerance tightly (one trailing command clause, not arbitrary re-parsing past `end`).
  Run the full `parseBodyWithClauses` callers — it's shared by SOV/VSO/mid-stream paths.
- **Fidelity is recall-based** — won't catch over-generation. After any parser change run
  the semantic role-extraction suite (`npm test --prefix packages/semantic`) in addition
  to the regen.
- **zh is the recurring hard case.** The same zh block-body gap blocks the deferred zh
  `fetch` keyword alignment (roadmap). A real fix here may unblock that too — worth a
  combined zh block-body session.
- **Validate with the `--regression` gate**, not raw counts; trust a controlled A/B
  (same DB, build toggled). Restore the binary `patterns.db` before committing.

## Affected patterns / expected yield

| Pattern         | Lang               | Now            | After                    |
| --------------- | ------------------ | -------------- | ------------------------ |
| repeat-forever  | zh                 | 0.33 **DEGEN** | faithful (−1 degenerate) |
| repeat-for-each | ar, tl, zh         | 0.67           | 1.0 (fidelity)           |
| repeat-while    | ja, tr, ko, qu, zh | 0.50–0.75      | 1.0 (fidelity)           |
| repeat-while    | sw                 | 0.50           | 1.0 (fidelity)           |

Net: **−1 degenerate** (zh), plus a fidelity sweep across ~5 languages. Cross-check the
live degenerate list at execution time — counts drift as other fixes land.

## Validation playbook (same as the shipped fixes)

1. Edit `packages/semantic/src/parser/semantic-parser.ts`.
2. Rebuild: `cd packages/semantic && npx tsup`.
3. Repopulate DB: `cd packages/patterns-reference && npm run db:init:force &&
npm run sync:translations`.
4. Regen + `--regression` gate:
   `cd packages/testing-framework && LSP_DB_PATH=…/patterns.db npx tsx
src/multilingual/cli.ts --full --bundle browser-priority --regression`. Must say
   "No regression". (Core's dist imports `@lokascript/semantic` at runtime, so a
   `tsup` rebuild of semantic is picked up without rebuilding core — but core's
   `dist/multilingual/*.js` must already exist: `rollup -c` in `packages/core` once.)
5. `--save-baseline` to the committed path, then `npx prettier --write` it (the
   JSONReporter emits raw JSON; the committed baseline is prettier-formatted).
6. Add locks in `packages/semantic/test/multilingual-roadmap-fixes.test.ts`.
7. Restore `git checkout packages/patterns-reference/data/patterns.db`. Don't commit it.

## Probe script (drop at repo root, `npx tsx probe.ts "<en code>" zh sw ar tl ja ko qu`)

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
`on click repeat for item in .items add .processed to item`.

## Definition of done

zh `repeat-forever` parses faithfully (deg→faithful, the last degenerate `repeat-*`);
the `for`-binding `repeat` keyword and the `wait`-after-`end` tail are recovered across
the affected languages; `--regression` gate green; role-extraction suite clean;
baseline regenerated; locking tests added.
