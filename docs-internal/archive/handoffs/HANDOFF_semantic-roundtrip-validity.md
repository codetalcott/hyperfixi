# HANDOFF: Investigate semantic-engine canonical-validity (24/30 is lower than expected)

> **STATUS 2026-07-15 — INVESTIGATED + FIXED (gate + fetch). See "## FINDINGS" and "## SHIPPED"
> below.** TL;DR: **H1 refuted** (the production full path uses the *same* renderer as the
> spike — 24/30 reproduces exactly), **H2 confirmed and is the headline** (fidelity ≠ canonical
> validity; the gap is **systemic, not 2 bugs**), **H3 refuted** (single-pass ≈ round-trip).
> The `add … to me` "defect" is a **non-bug**. Corpus-representative validity is **~68–70%**, not
> 80%, spanning **~10 command families**. **Shipped:** a canonical-validity gate (the missing net)
> + the `fetch` render fix (pure-render 80.8 % → 85.4 %). The remaining families are allowlisted as
> a ranked worklist.

**Mission:** Explain and fix why the semantic translation engine, round-tripped through English and
validated against the **real `hyperscript.org` parser**, produced only **24/30 canonical-valid** and
**18/30 exact round-trips** in a 2026-07-15 spike. Given the fork's multilingual fidelity ratchet reports
~1.000 avgFidelity (3696/3696 faithful), 80% canonical-validity is surprisingly low and needs
reconciling — is it a **test-methodology artifact**, a **fidelity-≠-validity gap**, or **real renderer
bugs**? Root-cause it and recommend a fix or a gate.

Context for this work lives in [HYPERSCRIPT_TOOLS_NEXT_STEPS.md](./HYPERSCRIPT_TOOLS_NEXT_STEPS.md)
(§3–§4). The point of the exercise is a fork-free, build-time `@hyperscript-tools/i18n` that emits
**canonically valid** English hyperscript, gated by the real parser.

## What the spike did (and its likely flaw)

Round-trip `en → translate(en→lang) → foreign → translate(lang→en) → en′`, then parse `en′` on the
canonical `hyperscript.org` esm build and count `errors.length === 0`. 30 cases = 5 snippets ×
{ja, ko, tr, ar, es, zh}. It called **`@lokascript/semantic`'s `translate(input, from, to)`**
([`packages/semantic/src/explicit/converter.ts:75`](../packages/semantic/src/explicit/converter.ts)),
which renders via the template-based `explicit/renderer.ts`.

**⚠ Likely methodological flaw — check this FIRST.** The **production** foreign→English path (the one that
actually feeds original _hyperscript) is NOT `semantic.translate`. It is the adapter's
**`preprocessToEnglish`** ([`packages/hyperscript-adapter/src/preprocessor.ts:66`](../packages/hyperscript-adapter/src/preprocessor.ts) /
`slim-preprocessor.ts:43`), which renders with **`renderToHyperscript`**
([`packages/hyperscript-adapter/src/hyperscript-renderer.ts:38`](../packages/hyperscript-adapter/src/hyperscript-renderer.ts)) —
a **different, English-specific renderer** with a per-command `SYNTAX` table. The spike measured the wrong
renderer. Re-running against `renderToHyperscript` / `preprocessToEnglish` may substantially change the
24/30 number.

## The observed failures (semantic path, via `translate`)

Failures were consistent per-snippet across all 6 languages:

- **`on click fetch /api/data then put it into #result` → INVALID (6/6 languages).**
  Round-trips to `on click fetch from "/api/data" then put it into #result`; canonical parser errors
  `Unexpected Token : /api/data`. Two corruptions: a spurious **`from`** is inserted, and the **naked URL
  path is quoted** as a string literal. This is the known **R3 "fetch URL mis-role"** residual family
  (see `CLAUDE.md` R3 section). Accounts for all 6 canonical-INVALID cases.
- **`on click add .highlight to me` → valid but NOT exact (6/6 languages).**
  Round-trips to `on click add .highlight` — the **`to me` destination role is dropped**. Still parses
  (so counts toward 24/30 valid), but is lossy. Known R3 "SOV `in me` qualifier glue" / destination
  family.
- **`toggle .active`, `increment #count`, `show #modal` → valid + exact (18/18).** Clean.

So: `canonical-valid 24/30` = 18 clean + 6 lossy-but-parseable (`add`); the **6 invalid are all `fetch`**.
`exact 18/30` = the 18 clean.

## Hypotheses to test (ranked)

1. **H1 — Wrong renderer (methodology).** Re-run the exact comparison using `preprocessToEnglish`
   /`renderToHyperscript` (the production path) instead of `semantic.translate`. If validity jumps, the
   24/30 was an artifact of testing `explicit/renderer.ts` rather than the real English renderer. **Do
   this before anything else.**
2. **H2 — Fidelity ≠ canonical validity.** The ratchet scores **role recall on de-duplicated action/role
   sets** vs the English reference ([`packages/testing-framework/src/multilingual/fidelity.ts`](../packages/testing-framework/src/multilingual/fidelity.ts)),
   and **never checks that the rendered surface actually parses on the canonical engine**. A parse can be
   100% "faithful" (correct actions/roles) while emitting non-canonical syntax (`fetch from "/url"`). If
   so, ~1.000 fidelity and <100% canonical-validity are **consistent, not contradictory** — and the fix
   is to add a canonical-validity signal, not to distrust the ratchet.
3. **H3 — Round-trip compounding.** `en→foreign→en` double-passes, so a single-leg bug shows twice. The
   use case that matters (multilingual source → run on original engine) is **single-pass foreign→English**.
   Author foreign samples directly (or reuse `patterns.db` translations) and measure single-pass
   `preprocessToEnglish` validity for a fair number.
4. **H4 — Real renderer/schema bugs.** Regardless of H1–H3, root-cause the two concrete defects:
   - `fetch` URL: where does the naked path get quoted, and where does `from` get inserted? Check the
     `fetch` command schema/roles in `packages/semantic/src/**` and the renderer's handling of URL-typed
     roles (`renderToHyperscript` `SYNTAX` table + `explicit/renderer.ts`).
   - `add … to me`: where is the `destination` role dropped on render? Compare the two renderers.

## Investigation steps

1. **Reproduce H1**: adapt the spike (below) to call `preprocessToEnglish(foreign, lang)` from
   `@lokascript/hyperscript-adapter` instead of `semantic.translate(...)`. Re-score all 30. Report the
   new validity/exact numbers next to the old.
2. **Reproduce H3**: measure single-pass foreign→English on authored/`patterns.db`-sourced foreign
   samples (skip the `en→foreign` leg). Compare to round-trip.
3. **Confirm/deny H2**: for a failing case, check whether the fork's fidelity scorer marks it faithful
   (it likely does). If yes, this is the headline: fidelity ≠ validity, and the canonical-validity gate
   from the roadmap is the fix.
4. **Root-cause H4**: trace the `fetch` URL corruption and the `add` destination drop to specific
   renderer/schema code; note whether they match the named R3 residuals in `CLAUDE.md` /
   `MULTILINGUAL_NEXT_STEPS.md`.
5. Expand the sample set beyond 5 snippets (pull from `patterns.db` / gallery) so the number is
   corpus-representative, not 5-snippet-representative.

## Reproduction (spike recipe)

Environment: run from the hyperfixi monorepo root (so `@lokascript/*` resolve). Ensure the multilingual
stack is built and dist is fresh (`npm run test:multilingual:build-deps`; the spike's semantic dist was
"up to date" on 2026-07-15). Canonical parser: `hyperscript.org` is already in `node_modules`; load it
headlessly by resolving the package then importing the sibling `_hyperscript.esm.js` by file URL
(`hs.parse(src).errors` is the validity signal — it collects, doesn't throw, except the `js` command).

```js
// run with: node <file>.mjs  (from repo root)
import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url'; import path from 'node:path';
const sem = await import('@lokascript/semantic');                 // ← swap for hyperscript-adapter preprocessToEnglish to test H1
const require = createRequire(import.meta.url);
const esm = path.join(path.dirname(require.resolve('hyperscript.org')), '_hyperscript.esm.js');
const hs = (await import(pathToFileURL(esm).href)).default;
const validate = (c) => (hs.parse(c)?.errors ?? []).map(e => e.message);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const S = ['on click toggle .active','on click increment #count','on click add .highlight to me',
           'on click show #modal','on click fetch /api/data then put it into #result'];
const L = ['ja','ko','tr','ar','es','zh']; let p=0,r=0,t=0;
for (const lang of L) for (const en of S) {
  t++; let f,b,e;
  try { f = await sem.translate(en,'en',lang); b = await sem.translate(f,lang,'en'); e = validate(b); }
  catch (x) { e = ['threw: ' + x.message.split('\n')[0]]; }
  if (e.length === 0) p++; if (norm(b) === norm(en)) r++;
  if (e.length || norm(b) !== norm(en)) console.error(`${lang} "${en}"\n  foreign: ${f}\n  back:    ${b}  ${e.length?JSON.stringify(e):''}`);
}
console.error(`canonical-valid ${p}/${t}   exact ${r}/${t}`);
```

## Files to read

- Production foreign→English path: `packages/hyperscript-adapter/src/{preprocessor,slim-preprocessor,hyperscript-renderer}.ts`.
- Spike's path: `packages/semantic/src/explicit/{converter,renderer}.ts`.
- `fetch`/`add` command schemas + role types: `packages/semantic/src/**` (command schemas, role/value types).
- Fidelity scorer (what it measures): `packages/testing-framework/src/multilingual/fidelity.ts`, `orchestrator.ts`.
- Known residuals: `CLAUDE.md` (R3 section), `docs-internal/MULTILINGUAL_NEXT_STEPS.md`.

## Success criteria / deliverable

- The 24/30 is **explained**: attributed to H1 (wrong renderer) and/or H2 (fidelity≠validity) and/or H3
  (round-trip compounding), with corrected numbers for the **production** renderer, **single-pass**,
  over a **corpus-representative** sample.
- The two concrete defects (`fetch` URL quoting + spurious `from`; `add` destination drop) are
  root-caused to specific code, and confirmed as (or distinguished from) the named R3 residuals.
- A recommendation: either a renderer/schema fix, or — if the finding is fidelity≠validity — a concrete
  design for the **canonical-validity CI gate** (parse every rendered output on `hyperscript.org`; fail
  on non-empty `errors`) as the missing signal, per the roadmap §5.

---

## FINDINGS (2026-07-15)

Reproduced the spike, tested H1–H4, and expanded from 5 snippets to the ratchet's own corpus
(the 146 single-line translatable rows of `code_examples`, plus their real `pattern_translations`).
All numbers below are against the canonical `hyperscript.org` parser (`hs.parse(src).errors`).

### Verdicts

| Hyp | Verdict | Evidence |
| --- | --- | --- |
| **H1 — wrong renderer** | **REFUTED (for the path the spike doubted)** | The production **full** `preprocessToEnglish` renders with `render(node,'en')` — the **same** `explicit/renderer.ts` the spike hit via `translate`. Re-running the exact 30 through `preprocessToEnglish` gives an **identical 24/30 valid / 18/30 exact**. The `renderToHyperscript` renderer H1 pointed at is used **only by the *slim* per-language bundles** (`slim-preprocessor.ts`), not the full path. So "the spike measured the wrong renderer" is false for the full path. |
| **H2 — fidelity ≠ validity** | **CONFIRMED — this is the headline** | `render()` emits `fetch from "/api/data"` etc.: 100 %-faithful by the ratchet (right action, right roles) yet **rejected by the canonical parser**. The ratchet never parses the rendered surface on `hyperscript.org`, so ~1.000 fidelity and sub-100 % validity are **consistent, not contradictory**. The gap is **systemic** (below), not the 2 named bugs. |
| **H3 — round-trip compounding** | **REFUTED** | **Single-pass** (real foreign `pattern_translations` → `preprocessToEnglish`) is **595/876 = 67.9 %**, essentially the same as **round-trip 618/876 = 70.5 %**. The defects live on the **English-render leg**, which single-pass foreign→English exercises too. Not a double-pass artifact. |
| **H4 — real renderer bugs** | **CONFIRMED (1 of the 2), plus many more** | `fetch` defect is real and root-caused (below). The `add … to me` "defect" is a **non-bug**. And the corpus reveals ~10 failing command families the 5-snippet spike never surfaced. |

### The numbers (corrected, corpus-representative)

| Measurement | Renderer | Valid | Exact |
| --- | --- | --- | --- |
| Spike, 5 snippets × 6 langs (round-trip) | `translate`/explicit | 24/30 (80 %) | 18/30 |
| Same 30 via **production** `preprocessToEnglish` (full) | explicit (identical) | **24/30** | 18/30 |
| Same 30 via slim `renderToHyperscript` | slim | 30/30 | 11/30 |
| **146 examples × 6 langs, round-trip** | explicit | **618/876 (70.5 %)** | 241/876 |
| **146 examples × 6 langs, single-pass real foreign** | explicit (full preproc) | **595/876 (67.9 %)** | — |
| **Pure `render(parse(en,'en'),'en')`, 130 canonical-valid inputs** | explicit | **105/130 (80.8 %)** | 45/130 |
| Same 130, pure render | slim | 103/130 (79.2 %) | 40/130 |

The **pure-render row is the cleanest signal**: feed the renderer canonically-valid English, parse
its output — **~1 in 5 no longer parses**, with zero translation involved. That *is* the
fidelity≠validity gap, isolated.

### Root causes

**Defect 1 — `fetch` (dominant; 6/25 pure-render failures, 66/258 round-trip failures). REAL.**
`render()` picks the highest-priority English fetch pattern, `fetch-en-generated` (prio 100), whose
template is `'fetch' 'from' <source> …`. The `from` literal is baked in by the pattern generator
([`pattern-generator.ts` `buildRoleToken`](../packages/semantic/src/generators/pattern-generator.ts) —
uses the profile's default `source` marker `from`), which **never consults the schema's
`renderOverride: { en: '' }`** ([`command-schemas.ts:1060`](../packages/semantic/src/generators/command-schemas.ts)).
That `renderOverride` is read **only** by `deriveEnglishSyntax()` (the slim SYNTAX table), so the slim
renderer emits `fetch "/api/data"` (valid) while the explicit renderer emits `fetch from "/api/data"`.
The URL is a `literal`/`dataType:'string'`, so it is quoted. Canonical-parser facts nail the fatal
combination:

| Rendering | canonical? |
| --- | --- |
| `fetch /api/data` | ✅ |
| `fetch "/api/data"` | ✅ |
| `fetch from /api/data` | ✅ |
| `fetch from "/api/data"` | ❌ `Unexpected Token : /api/data` |

So the quoting alone is fine; the spurious **`from` + a quoted string** is the only fatal pair.
This is **not** the named R3 "fetch URL mis-role" residual — that family (`fetch.source ×18`,
`fetch-with-* pl/ru/uk ×12` in `MULTILINGUAL_NEXT_STEPS.md`) is **foreign-parse** mis-roling. This is
a **language-independent English-render** defect (identical across all 6 languages), a different bug.

**Defect 2 — `add … to me` → `add`. NON-BUG.** Canonical `add` parses a missing target as
`implicitMeTarget` (`_hyperscript.esm.js`, the `AddCommand.parse` `matchToken("to") … else …
implicitMeTarget` branch), so `add .highlight` **is** `add .highlight to me`. Both renderers drop the
implicit `me` **on purpose**. Zero semantic loss; only an exact-match miss. The handoff's framing of
this as a defect is incorrect. (Contrast `put`: it has **no** implicit-me default, and the *slim*
renderer's blanket "drop `me` destination" wrongly turns `put X into me` into the invalid `put X` —
see below.)

**The systemic tail (pure-render, English-only, all NEW vs. the spike):**

- **`repeat` / `tell` / `for` block bodies get a spurious `then`** — `repeat 3 times add …` →
  `repeat 3 times then add …` (`Expected 'end' but found 'then'`). `renderCompound` joins block
  bodies with the chain word; a loop/`tell` body is not a then-chain.
- **`halt the event` → `halt event`** — the article is dropped and `halt event` is invalid.
- **`render … with users: $data` → `with {users:$data}`** — object-literal braces `with` won't accept.
- **`wait for transitionend` → `wait for "transitionend"`** — event name quoted; `wait for` needs bare.
- **`send update(value: 42)` → `send update(value, :, 42)`** — argument list mangled.
- **`if event.shiftKey …` → `if event .shiftKey` + truncated body** — member-access spacing + block loss.
- **Named deferrals, confirmed here:** `pick characters 0 to 5 of #note` → `pick characters`
  (pick range-roles, R1 deferral); `put "<p>" before me` → `put "<p>" into me` (positional
  `before`/`after` collapsed to `into` — stays *valid* but is a **semantic** corruption).

**Renderer disagreement (latent inconsistency).** The full path (explicit, 80.8 %) and the slim
per-language path (slim, 79.2 %) fail on **different** rows — same foreign input yields different
English depending on which bundle is loaded. Explicit fixes `put`/`swap`/`call` but breaks `fetch`;
slim fixes `fetch` but drops **required** destinations (`put X into me` → `put X`; `call … put …` →
`… put`) and mis-renders `swap` (`swap of #a with #b`). **Neither renderer is validity-safe.**

### Recommendation

The finding is **fidelity ≠ validity, and the gap is broad** — so the primary fix is the **gate**,
not a bug hunt. Two work streams (see the plan handed to the requester):

1. **Canonical-validity gate (do first).** Productionize the spike (prototype saved during this
   investigation) as: (a) a test/CI check that renders every ratchet-corpus reference to English and
   parses it on `hyperscript.org`, failing on non-empty `errors` — seeded with a **baseline/allowlist**
   of the known-deferred families so it ratchets down rather than blocking at ~80 % on day one; and
   (b) a build-time check baked into `@hyperscript-tools/i18n` so every emitted output is parser-gated
   (roadmap §5). This is renderer-agnostic and would have caught **all** of the above at once.
2. **Targeted renderer fixes, gated by #1, ordered by corpus frequency:** `fetch` `from`+quote
   (honor `renderOverride` in the render path) → block-body `then`-insertion (`repeat`/`tell`/`for`)
   → `halt the event` → `render` object-literal → `wait`/`send`/`if` → slim-renderer required-
   destination drop + `swap`.

---

## SHIPPED (2026-07-15) — gate + fetch fix

Scope chosen: **canonical-validity gate + the `fetch` render fix** (the remaining families stay
allowlisted as the ranked worklist for a later renderer sweep).

**Fetch render fix (`render()` / explicit renderer).** Root cause was the parse marker `from` baked
into the render pattern while the schema's `renderOverride: { en: '' }` was ignored by the pattern
path. Fix keeps the marker for **parsing** but suppresses it for **rendering** via a new
`renderSuppress` flag:

- `packages/semantic/src/types.ts` — `LiteralPatternToken.renderSuppress?: boolean`.
- `packages/semantic/src/generators/pattern-generator.ts` (`buildRoleToken`) — stamp
  `renderSuppress: true` on a role's marker literal(s) when `renderOverride?.[code] === ''` (both the
  `markerOverride` and `defaultMarker` branches; the `valuePrefixLiteral`/`pushPrefixed` path is left
  alone, so `go`'s `url` prefix is untouched).
- `packages/semantic/src/explicit/renderer.ts` (`renderPatternToken`, `case 'literal'`) — return
  `null` for a `renderSuppress` token.

Result: `fetch /api/data` → `fetch "/api/data"` (valid); `fetch /api/user as json` →
`fetch "/api/user" as json` (`as json` preserved). Pure-render corpus validity **105/130 → 111/130**
(the whole `from`+quote family cleared; the one remaining `fetch` invalid is the unrelated
`do not throw`/conditional-tail row). `go` render output is **byte-identical**. Parsing is unchanged
(the matcher ignores the flag), so the `fetch from …` parse tests stay green.

**Canonical-validity gate** (`packages/testing-framework/`):

- `src/multilingual/canonical-validity.ts` — `loadCanonicalParser()` (headless `hyperscript.org`) +
  `checkCorpusRenderValidity()` (render every `getAllPatterns()` English ref the canonical parser
  accepts, parse the output, collect failures).
- `src/multilingual/canonical-validity.test.ts` — vitest gate (runs in the existing `unit-tests` job):
  fails on any NEW invalid render outside the allowlist, **and** on a stale allowlist id that has
  become valid (so the list only shrinks). Teeth verified in both directions.
- `baselines/canonical-validity.json` — allowlist of the 22 currently-deferred invalid renders
  (behavior/bind/fetch-do-not-throw/from/halt/if/pick/render/repeat/send/set/tell/wait), each with a
  reason. `hyperscript.org@0.9.93` added as a `devDependency`.

> Follow-up still open: fold the gate as an **R4 signal** into `multilingual/cli.ts --regression`, and
> bake the same parse-check into the build-time `@hyperscript-tools/i18n` transpiler (roadmap §5).

**Baseline regen was NOT needed.** The fetch fix is **en-render-only** (`renderOverride` only has
`en`; foreign renders unchanged), and the fidelity ratchet scores **parsed foreign translations**
against the en reference — en-render is not in that path. The `--full --regression` gate confirms:
**"✓ No regression vs baseline."** (This is itself the blind spot restated: the ratchet is so
parse-focused it does not even register a render fix — which is exactly why the canonical-validity gate
is needed.) Per `CLAUDE.md`, the locally-`populate`d `patterns.db` is **not** committed.
