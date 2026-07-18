# hyperscript-tools — Next Steps / Roadmap

_A forward-looking working roadmap for the fork-free **`@hyperscript-tools/*`** family of tooling for
**original _hyperscript** (hyperscript.org, Big Sky Software), consolidating the observations from the
2026-07-15 session. Planning lives in this monorepo because the source packages (semantic, i18n, adapter)
still live here, even though the product ships from `github.com/codetalcott/hyperscript-tools`._

## Context

We rebuilt `@hyperscript-tools/mcp-server` on the **canonical _hyperscript parser** (no regex, no fork
dependency) and extracted it to its own public repo, with eventual **contribution to Big Sky Software**
in view. That work established a repeatable pattern — _fork-free tooling built on the real
`hyperscript.org` engine, validity enforced by the parser itself_ — and surfaced a larger opportunity:
a **multilingual (SOV/VSO/SVO) layer for original _hyperscript**. This roadmap captures where things
stand and the sequenced next steps, including the open decisions that need a call before the multilingual
work starts.

## 1. Shipped

- **`@hyperscript-tools/mcp-server`** — rebuilt parser-backed; moved to
  **`github.com/codetalcott/hyperscript-tools`** (public npm-workspaces monorepo, CI green). hyperfixi
  PR **#686** (removal) and docs PR **#86** merged.
- Properties worth preserving as the family's design DNA:
  - Runs the real `hyperscript.org` parser **headlessly** (import the sibling `_hyperscript.esm.js` by
    resolved path; no DOM shim; `safeParse` catches the `js`-command `new Function` throw).
  - 10 tools; an **inventory drift test** pins the documented command/feature set to the parser's own
    registry (`internals.createParser(...).commandStart/featureStart`).
  - Self-contained: depends only on `hyperscript.org` + MCP SDK. No fork coupling.

## 2. Immediate follow-ups (mcp-server handoff)

- **Trusted npm publisher (OIDC provenance)** → point `@hyperscript-tools/mcp-server` at
  `codetalcott/hyperscript-tools`.
- **Version reset** from the inherited `2.7.2` to a fresh line before the first publish from the new repo.
- **Rebuild/deploy hyperfixi-docs** so `_site/tools/index.html` regenerates (PR #86 updated the source
  `tools/index.md` to the 10-tool surface).

## 3. The multilingual opportunity (feasibility established)

Making **original _hyperscript** run 24-language source (SOV like ja/ko/tr, VSO like ar, SVO) is
**feasible and largely already built** — the hard linguistic work exists; what remains is packaging,
engine choice, and fidelity.

- **A working path already exists:** `@lokascript/hyperscript-adapter` patches the stock engine's
  `runtime.getScript` and rewrites each `_="..."` attribute into an **English hyperscript string**
  before the lexer sees it. Targets the original engine (not the fork).
- **Both translation engines are fork-free at runtime.** Runtime chain: `semantic → framework → intent`
  (+ `nearley`), no `@hyperfixi/core`. The build-time `@lokascript/i18n`'s `@hyperfixi/core` dependency
  is a **phantom** (JSDoc `@example` only, marked `external`, absent from dist); its whole `dependencies`
  block is mis-categorized (semantic is test-only; esbuild/happy-dom/vite are build tooling; real deps
  `zod` + `node-html-parser` are undeclared).
- **loka-js is not a grammar source** (fixi-family flat keyword swapping; deliberately refuses the parser
  path). Its one transferable gem: **per-element language resolution** (`data-loka-lang` → nearest `lang`
  ancestor → `en`) enabling mixed-language pages.

### The decisive empirical finding — engine choice (2026-07-15 spike)

Round-trip `en → translate(lang) → foreign → translate(en) → en′`, then validate `en′` on the **real
`hyperscript.org` parser**, 30 cases (5 snippets × ja/ko/tr/ar/es/zh):

| Engine | Canonical-valid | Exact round-trip |
| --- | --- | --- |
| **i18n `GrammarTransformer`** _(what today's `@hyperscript-tools/i18n` uses)_ | **8/30** | 8/30 |
| **semantic** _(what the adapter uses)_ | **24/30** | 18/30 |

The i18n engine is badly broken in reverse (dropped commands, unstripped particles `할`/`把`, `into`→`to`,
scrambled order). The semantic engine's 6 failures are two **identifiable, known R3 residual bugs**: the
`add … to me` destination role dropped, and `fetch`'s URL literal quoted/`from`-inserted.

**→ A build-time transpiler must wrap the SEMANTIC engine (`parseSemantic → render`), NOT the i18n
`GrammarTransformer`.** The current `@hyperscript-tools/i18n` wraps the weak engine.

## 4. Fidelity & validity findings

- **No engine-vs-engine gate exists.** The "fidelity ratchet" measures _semantic-parse-of-i18n-output_
  vs _semantic-parse-of-English_ — the two engines are never asked to agree on a shared artifact.
- Direct cross-checks are narrow/enumerated: `testing-framework/src/vocab/batch3-roundtrip.test.ts`
  (~30 patterns), `i18n/src/positional-keyword-drift.test.ts` (emit→tokenize), plus the **un-gated**
  `patterns-reference/scripts/validate-role-alignment.ts`. i18n's `toEnglish` correctness is essentially
  untested (the spike shows why: 8/30).
- **Validity vs corpus split** (re: "we relied on patterns-reference for validity"): the moved
  mcp-server never used patterns-reference (its validity is the parser + golden corpus + drift test).
  patterns-reference is the multilingual **corpus + fidelity net**, and it is **fork-coupled**
  (`@lokascript/semantic` + sqlite). The **canonical-validity check is portable** (just parse with
  `hyperscript.org`; `verify-engines.ts` already cross-checks against upstream) — the **corpus is not**.

## 5. Recommended roadmap (sequenced)

### Now — finish the MCP-server handoff

Section 2 items (publish provenance, version reset, docs deploy).

### Next — `@hyperscript-tools/i18n` v2: build-time transpiler on the SEMANTIC engine

- **Extract the semantic engine fork-free** (`semantic` + `framework` + `intent` + `nearley`) using the
  same headless-spike discipline proven for the mcp-server and re-proven for i18n this session.
- **package.json hygiene** for the extracted package: drop phantom `@hyperfixi/core`, move
  esbuild/happy-dom/vite/semantic to devDependencies, declare `zod` + `node-html-parser`.
- **Wrap `parseSemantic → render`** for build-time English→foreign and foreign→English translation.
- **Bake a canonical-validity gate into CI** — every emitted output must parse on `hyperscript.org`
  (productionize the spike, or literally call `@hyperscript-tools/mcp-server`'s `validate_hyperscript`).
  This is the general gate the fork's ratchet lacks, and it's engine-agnostic.
  - _Status (2026-07-18): the **English side** shipped in the v1 package_ — `packages/hyperscript-tools-i18n/src/validate.ts`
    reuses the proven headless loader (self-contained: node builtins + `hyperscript.org`, no fork
    coupling), gating English input (`--from en`) and foreign→English output. Surfaces: CLI `--check`
    (exit 3), Eleventy `parseCheck: 'off'|'warn'|'error'`, `@hyperscript-tools/i18n/validate` API; the
    package's tests now run in CI (`unit-tests` job). The **"every emitted output" (faithful
    foreign-output) half** lands with the semantic-engine v2 below — the v1 GrammarTransformer's
    `toEnglish` is the known-weak 8/30 round-trip path, so gating its foreign output would be red noise.
- **Address the 2 known semantic R3 bugs** (destination `to me`, `fetch` URL literal) or gate them.

### Later — runtime + per-element language (ambitious)

- Repackage `hyperscript-adapter` as a `_hyperscript.use()` plugin over the extracted semantic engine.
- Add loka-js's per-element `lang`-ancestor resolution for mixed-language pages (the real differentiator).
- Higher fidelity risk (confidence-gating, SOV fallthrough) — do only after the build-time path proves
  the fidelity story.

## 6. Open decisions (need a call before multilingual work starts)

1. **Corpus strategy** — generate a fork-free test corpus, or export `patterns.db` **data-only** (no
   `@lokascript/semantic` code) for the new repo to validate against? (Validity is portable; corpus is
   the coupled part.)
2. **Build-time first vs runtime first** — recommend build-time (lower fidelity risk, deterministic,
   CI-gatable).
3. **Big Sky framing / timing** — when to approach upstream, and whether to pitch mcp-server alone first
   or mcp-server + multilingual together.
4. _(Resolved)_ npm scope `@hyperscript-tools/*` is user-owned; the family lives in
   `codetalcott/hyperscript-tools`.

## 7. Key references

- New repo: `github.com/codetalcott/hyperscript-tools` (mcp-server).
- Runtime multilingual path:
  `packages/hyperscript-adapter/src/{slim-preprocessor,hyperscript-renderer,plugin}.ts`.
- Semantic engine (the one to wrap): `packages/semantic` — `parseSemantic`, `render`, `translate`;
  fork-free chain `semantic → framework → intent` (+ `nearley`).
- i18n `GrammarTransformer` (the weak engine, avoid for execution):
  `packages/i18n/src/grammar/{transformer,types,profiles}.ts`.
- Fidelity ratchet: `packages/testing-framework/src/multilingual/fidelity.ts`, `orchestrator.ts`.
- Validity net (fork-coupled):
  `packages/patterns-reference/scripts/{verify-translations,verify-engines,validate-role-alignment}.ts`.
- Narrow cross-checks: `testing-framework/src/vocab/batch3-roundtrip.test.ts`,
  `i18n/src/positional-keyword-drift.test.ts`.

## 8. Verification (reproduce the observations)

- **Engine comparison spike:** for each `en` snippet × lang, `translate(en,'en',lang)` →
  `translate(foreign,lang,'en')` → parse the result with the canonical `hyperscript.org` esm build;
  count `errors.length === 0`. Reproduces the 8/30 (i18n) vs 24/30 (semantic) split.
- **Fork-free extraction spike:** stage a cleaned `package.json` (real runtime deps only), `npm pack`,
  install in an isolated dir, assert no `@hyperfixi/*` in `node_modules`, run a translate call. (Proven
  this session for i18n; repeat for the semantic subtree.)
- **Validity gate prototype:** pipe any translated corpus through `hyperscript.org` `parse` (or the
  mcp-server `validate_hyperscript`) and fail on non-empty `errors`.
