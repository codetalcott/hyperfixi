# Domains rethink: one reliable core

Plan, 2026-10-13. Not started; owner decisions D1–D6 open.

Owner, 2026-10-13: "The domains pattern only works if it is built on a reliable core. We may need to rethink
domains, instead of trying to preserve it as is." This answers M3 (e) in
[`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md): the two `PatternMatcher`s become one, built from
semantic's (the one that has been measured and fixed), and the domain family is cut down and rebuilt on it
rather than kept as it is.

Repos: this one (intent, framework, semantic, mcp-server) and `codetalcott/lokascript-domains` (16 domain packages
plus config, toolkit, the published `@lokascript/domains` aggregate and mcp-multilingual-intent). Downstream:
lokascript-learn (live), lokascript-examples (demos), `_hyper_min`'s docs site, lokascript-lessons (a dead copy).

## Order

Owner, 2026-10-13: the semantic work comes first, and it is done when (confirmed by the owner the same day):

- the roadmap's Reliability rows (the silent pairs, then the refusals by reach) and M3's leftovers (C3, an end
  word's nine readers) are done;
- M2's forms wait on native review and M4 is opportunistic, so neither blocks.

Why the order helps: Phase 4 moves semantic's matcher into framework. After the semantic work it moves once, and
the parity oracle is saved against the finished parser. The matcher took 43 commits in September and 15 in October
to date (re-check: `git log --since=2026-09-01 --format=%ad --date=format:%Y-%m -- packages/semantic/src/parser/pattern-matcher.ts | sort | uniq -c`).

Phases 0 and 1 (the decisions, deleting retired domains) touch no semantic code and can come earlier if the owner
wants.

## Measured start

Stamped 2026-10-13: this repo at 229b601a8 (framework, semantic, intent 4.5.0), lokascript-domains at 80be401
(3.0.1). Re-check the domain numbers with `cd packages/framework && npx tsx scripts/domain-probes.ts` (read-only;
it runs the locked `@lokascript/domains` on this tree's framework and semantic, so build them first).

### The matchers

- `packages/framework/src/core/pattern-matching/pattern-matcher.ts`: 1,630 lines. Copied from semantic's on
  2026-02-11 (edcef7044); domain fixes until 2026-02-24; formatting only since (re-check: `git log --follow
  --format='%h %ad %s' --date=short -- <file>`).
- `packages/semantic/src/parser/pattern-matcher.ts`: 4,604 lines, 136 commits since the copy (re-check:
  `git log --since=2026-02-11 --oneline -- <file> | wc -l`).
- framework's class has 27 methods and semantic's 76; 19 share a name, and every one of those was rewritten since
  (`matchTokenSequence` is 190 lines in one, 136 in the other). Re-check:
  `grep -oE "^  (private |protected |static )*[a-zA-Z_]+\(" <file> | sort -u` on each, then `comm`.
- semantic's other 57 methods read hyperscript values: operator runs, possessive chains, `beep!`, pick ranges, the
  expression lexicon, value extents. Its imports reach `commandSchemas`, the registry and `patterns/put`.
- framework-only: `greedy` role capture with stop markers (168 uses in domain-sql, -jsx, -behaviorspec, -control
  and mcp-multilingual-intent), a VSO confidence boost, an Arabic preposition rule.
- About 10 of semantic's 136 commits are general matcher fixes any DSL needs: #950 (an optional slot with no marker
  must not eat the verb), #948, #959 (a role captured without its marker rolls back), #961, #968, source spans,
  the injectable `ConfidenceModel`, memoization, #1169 (a parenthesized group as a value), the trailing-slot verb
  guard. The round trip below shows framework still has at least #959's class.

### The schemas forked too

intent's `RoleSpec` has 17 fields, semantic's 19; they share 11. Domain-only: `markerPosition`, `sovSlot`,
`quoteMultiword`, `greedy`. Hyperscript-only: `variantOnly`, `valueShape`, `markerOptional`, `markerLegacy`,
`valuePrefixLiteral`. `CommandSchema`: intent 9 fields, semantic 19 (`packages/intent/src/schema.ts`,
`packages/semantic/src/generators/command-schemas.ts`).

Already shared: intent's `SemanticNode`, bracket syntax and protocol JSON; framework's tokenizer base, extractors
and char classifiers (semantic re-exports them); `stripOptionalDiacritics`; the explicit-syntax parse/render base.

### Domain round trip (`domain-probes.ts`, part 1)

Every command of 15 domains, roles filled with placeholder values, written in each of the domain's languages by
its own renderer, read back by its own parser (toolkit is a private lint harness, not a DSL).

| domain                                        | commands | languages | read back the same    |
| --------------------------------------------- | -------- | --------- | --------------------- |
| animation, events, hypermedia, jsx, sql, todo | 3–6      | 8–11      | 100%                  |
| learn                                         | 15       | 10        | 206/210 (98%)         |
| flow                                          | 9        | 11        | 165/176 (94%)         |
| llm                                           | 4        | 11        | 61/66 (92%)           |
| behaviorspec                                  | 6        | 8         | 61/72 (85%)           |
| html                                          | 5        | 8         | 40/48 (83%)           |
| sprites                                       | 10       | 4         | 53/68 (78%)           |
| voice                                         | 19       | 11        | 257/341 (75%)         |
| control                                       | 5        | 8         | 19/48 (40%)           |
| bdd                                           | 4        | 8         | 16/48 (33%)           |
| **total**                                     |          |           | **1,342/1,541 (87%)** |

- 86 refused: the domain cannot read its own output (bdd `Given v0x v1x`, behaviorspec ja `v0x 操作`).
- 113 silent, reading something else: 47 take a marker word as the value (flow `enter with v0x` → `source:
  "with"`, sprites `create as v0x` → `name: "as"`), 37 add a role (some only write out a default), 16 change a
  value (control `check until v0x` → `condition: "until v0x"`), 10 lose a role (bdd `When v0x v1x v2x`), 3 read
  another command (learn ja `v0x から 取得` → `get`, not `fetch`).
- Placeholders are plain names, so the marker-word cases are real; a few failures on roles that take a fixed word
  (control's `mode`) may be the probe's.

### Other defects

- **Leftover input is accepted** (part 2): 103 of 107 English commands parse with an unknown word appended.
  `createMultilingualDSL().parseWithConfidence` returns the first pattern that matches and ignores
  `consumedTokens`; domain-sql translates `select name from users banana banana` as `select name from users`.
  Semantic's `translate` refuses that (`LossyTranslationError`, `unconsumed-input`).
- **domain-learn teaches sentences the product does not run** (part 3): learn's translation of 15 English commands
  into its 9 other languages, read by semantic (the reader the adapter runs): 74/135 read as the source, 45
  refused (ja and ko drop the particles: learn writes `#box .active 追加`, the product writes and reads
  `#boxに .activeを 追加`), 7 read otherwise (`put "hi"` loses its quotes), 9 learn could not translate.
- **domain-events emits hyperscript the engine rejects**: `on scroll throttle 200ms` ("Unexpected Token:
  throttle"; upstream's form is `throttled at`). domain-control emits a skeleton with a literal `...`.
- **domain-voice parses toggle/add/remove/show/hide** (schemas borrowed from semantic) and compiles each to
  `// Unknown voice command: <action>` (`packages/domain-voice/src/generators/voice-generator.ts`, the switch's
  default).
- **No domain gate.** The domains repo has ~1,800 tests; none checks a round trip across languages or leftover
  input.

### Who uses what (survey, 2026-10-13; re-check: `rg "@lokascript/domain" <repo> -g '!node_modules' -g '!dist'`)

- **Nothing deployed parses user input with a domain DSL.** Domain `parse` on real input happens only in
  mcp-server's tools and in undeployed lokascript-examples apps.
- **lokascript-learn** (live on Fly; pins domains ^2.11.1, framework and semantic ^2.10.0, two majors behind):
  - learn: `generateForFunction` (commanding and narrating sentences) and `generateGloss`, from hand-built nodes;
    never parsed;
  - sql, jsx, todo, llm, flow, bdd, voice, events, hypermedia: `render` only, for drills (hypermedia in the
    `BOOK_TRACK=1` track); sprites is imported and never called;
  - student answers: exact match, then similarity, then a fallback that parses both answers with semantic
    (`shared/exercises/validation.ts`). Where semantic refuses learn's expected sentence, the fallback cannot
    credit a different correct answer; for the other domains' drills it parses SQL, JSX, … as hyperscript.
- **mcp-server** (domains ^3.0.1):
  - 36 `parse_/compile_/validate_/translate_` tools for sql, bdd, jsx, todo, behaviorspec, llm, flow, voice and
    learn (`createDomainRegistry`), plus bdd and behaviorspec multi-line extras;
  - `detect_domain`, `parse_composite`, `compile_auto` and `compile_composite` (`CrossDomainDispatcher`);
  - `lse_validate_and_feedback`, `lse_pattern_stats` and `generate_training_data` (8 domains);
  - the llm sampling tools (off by default).
- **lokascript-examples** (domains ^2.11.1, last touched 2026-08-09, no domain app deployed): about,
  cross-domain and notebook (7 domains, the dispatcher), flow-playground, flow-builder, llm-equivalence,
  llm-playground, sql-explorer, test-writer (behaviorspec), todo, voice-navigator, and domain-builder
  (framework's factory on a user-defined DSL).
- **`_hyper_min`**: `generate-llm-equivalence.mjs` runs llm `compile` on fixed commands into static JSON for the
  docs site, by hand.
- **lokascript-lessons**: its five `domain-*` src trees are byte-identical to the domains repo's; no content, no
  consumer. The domains repo took over its history (2026-02-22).
- **mcp-multilingual-intent**: a stale copy of mcp-server's registry (8 domains, old language lists), not
  domain-config; it claims LSE output but imports nothing from intent.

## Target

The layers stay: **intent** (node types, schema types, bracket syntax) → **framework** (the core) → **semantic**
(hyperscript) and the **domains** (each a grammar on the core).

- **The core (framework):**
  - one schema type;
  - the tokenizer base (already there);
  - semantic's pattern generator, made grammar-neutral;
  - semantic's matcher skeleton (pattern walk, groups, markers, slot discipline, rollback, spans,
    `ConfidenceModel`) with a **value-reader seam**;
  - a schema-driven renderer;
  - the **refusal contract**: leftover input, a render that does not read back, a verbatim value lost;
  - a **round-trip gate kit** any grammar runs, with domain-toolkit's lint rules R1–R10.
- **A grammar** = schemas + per-language vocabulary profiles + value readers + optional handcrafted patterns + a
  code generator.
- **Hyperscript** is semantic's grammar. Its value readers (`value-extent`, `value-reading`, `expression-lexicon`,
  operators, possessives), handcrafted patterns, and the parser stages around the matcher (event handlers, loops,
  clause walk) stay in semantic.
- **Domain value readers** come from a stock set in the core: identifier, literal, quoted string, selector, URL,
  duration, expression, and greedy-to-the-next-marker (framework's `greedy`, as a reader).
- The domains repo's rule "the renderer is frozen: fix the schema, never the renderer" ends with the old renderer;
  the gate holds the core's renderer instead.

## Portfolio (proposed; D1 decides)

| domain                    | compiles to                                          | consumers                                                       | round trip                          | proposal                                                                                                       |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| sql                       | SQL                                                  | MCP ×4, learn drills, sql-explorer                              | 100%                                | **Keep.** The exemplar; first onto the core                                                                    |
| llm                       | JSON prompt spec (MCP sampling)                      | MCP ×4 + sampling, docs-site generator, 2 demos, learn drills   | 92%                                 | **Keep**                                                                                                       |
| flow                      | JS, htmx attributes, workflow spec; a runtime        | MCP ×4, 2 demos, learn drills                                   | 94%                                 | **Keep**                                                                                                       |
| behaviorspec              | Playwright                                           | MCP ×4 + extras, test-writer, 3 demos                           | 85%                                 | **Keep**, and absorb bdd                                                                                       |
| bdd                       | Playwright                                           | MCP ×4 + extras, learn drills                                   | 33%                                 | **Merge into behaviorspec** (same output; open since the 2026-08 portfolio survey)                             |
| voice                     | JS (a11y actions)                                    | MCP ×4, voice-navigator, learn drills                           | 75%                                 | **Keep its 14 own commands**; drop the 5 borrowed from hyperscript                                             |
| learn                     | sentences and glosses for learners                   | lokascript-learn (live), MCP ×4                                 | 98% own; 55% read by the product    | **Rebuild on semantic** (D2)                                                                                   |
| jsx                       | JSX                                                  | MCP ×4, learn drills                                            | 100%                                | Keep as the second exemplar, or retire (built as a proof)                                                      |
| todo                      | JSON                                                 | MCP ×4, todo demo, learn drills                                 | 100%                                | Keep as the smallest tutorial domain, or retire (built as a proof)                                             |
| sprites                   | Fly Sprites SDK calls; its own runtime and MCP server | none (learn imports it, never calls it)                         | 78%                                 | **Spin out or retire** (4 languages; the only `grammarProfile` user)                                           |
| events, hypermedia        | English hyperscript (events partly invalid)          | learn drills only (render)                                      | 100%                                | **Retire.** They are hyperscript; learn's drills for them come from semantic                                   |
| animation, control, html  | hyperscript, a skeleton, HTML                        | none                                                            | 100%, 40%, 83%                      | **Retire**                                                                                                     |
| config, domains, toolkit  | registry, published aggregate, lint harness          | mcp-server's registry                                           | —                                   | Keep; toolkit's rules move into the gate kit                                                                   |
| mcp-multilingual-intent   | Hono Siren HTTP API                                  | siren-grail's bridge                                            | —                                   | **Retire**, or rebuild on domain-config                                                                        |
| lokascript-lessons (repo) | —                                                    | none                                                            | —                                   | **Archive** (a byte-identical dead copy)                                                                       |

Proposed result: 16 domain packages → 6–8 DSLs (sql, llm, flow, behaviorspec, voice, learn on semantic; jsx and
todo if kept).

## Owner decisions (before any code)

- **D1 — the portfolio** (table above): keep, merge, rebuild, spin out or retire, per row.
- **D2 — domain-learn.** Its aim has been open since 2026-07-24 (a generator of sentences to read, or sentences
  learners type). The drills teach hyperscript in the learner's language, and the site's answer checker already
  parses with semantic. Recommended: the commanding sentence is semantic's render (what the adapter runs); learn
  keeps its narrating forms, morphology and glosses as teaching around it. That needs lokascript-learn off 2.x.
- **D3 — where the core lives.** Recommended: framework, so the package domains already peer on stays the
  contract. Alternative: a new package (`@lokascript/grammar`), a fourth contract package for
  `check-domains-peer-major`.
- **D4 — release path.** Recommended: **additive.** The core ships beside `createMultilingualDSL` in framework
  4.x minors; domains move to it in their own releases against published 4.x; the old matcher and factory go in a
  later framework major no domain still uses (renumber-only, the 4.0 procedure). A contract-changing major
  deadlocks instead: `check-domains-peer-major` blocks this repo's publish until domains accepts the major, and a
  real domains major has to wait for this repo's packages on the registry.
- **D5 — refusal in the old factory now?** Phase 3 makes `createMultilingualDSL` refuse leftover input and
  translations that do not read back, with `{ lossy: 'allow' }` to opt out, as semantic's `translate` does. A call
  that returned now throws, in a minor. Recommended: yes; nothing deployed parses with a domain DSL, and the
  callers are mcp-server's tools (which already report refusals) and demos.
- **D6 — the MCP surface.** Domain tools follow D1: a retired domain's tools go, bdd's become behaviorspec's,
  learn's become semantic-backed. `detect_domain` and the composite tools stay on the kept domains.

## Phases (one PR per numbered step unless noted)

**Phase 0 — decisions.** D1–D6 answered here. No code.

**Phase 1 — the cuts** (lokascript-domains; the other repos for their own pieces). Deletions first, so the later
phases carry only kept domains.

1. Retire animation, control, html, events and hypermedia (and sprites, if D1 says so): delete under a tag
   (`archived/domains-preview-2026-10`) with a pointer in the README, the same day. None is in `DOMAIN_PRIORITY`
   or mcp-server's tools; lokascript-learn is on 2.11.1 and keeps working until its upgrade.
2. mcp-multilingual-intent: retire, or replace its registry copy with domain-config.
3. lokascript-lessons: archive the repo (owner's action).

**Phase 2 — the domain gate** (lokascript-domains).

1. `domain-probes.ts` part 1 as a test per kept domain: schema → bracket node → render in each language → parse
   → compare action and roles. Outcomes `pass` / `refused` / `silent`, the command-shape gate's vocabulary.
   Placeholder values per expected type (roles that take fixed words get them).
2. Part 2 as cases: each command's English plus a trailing unknown word; expected `refused`.
3. A shrink-only baseline (`baselines/round-trip.json`) and a regen tool that refuses to write a worse pair without
   `--allow-new`; in the repo's CI.
4. A parse snapshot (the `parse-parity.ts` idea): every gate input's parse hashed, `--save` / `--check`, so each
   later change shows what it moved.

**Phase 3 — refusal in today's factory** (this repo, framework minor; if D5 says yes).

1. `parseWithConfidence` ranks every matching pattern (priority, then confidence) instead of taking the first,
   and refuses a match that leaves tokens unread.
2. `translate` re-parses its render and refuses when the node differs (a `LossyTranslationError`-alike with the
   partial text; `{ lossy: 'allow' }` opts out).
3. mcp-server's domain tools return `ok: false` with the refusal, as `translate_code` does.

Then the domain gate re-baselines: silent pairs become refused; none may go the other way.

**Phase 4 — the core, from semantic** (this repo; behavior-preserving for hyperscript). Every step: the
parse-parity oracle (`packages/semantic/scripts/parse-parity.ts --check`, 27,194 parses) at 0 differences, the M3
(d) gate list, framework's suite, and the locked domains against it. Record framework's and semantic's line
counts in each PR.

1. One schema type in intent: the union of both `RoleSpec`s and `CommandSchema`s; semantic's and framework's
   schemas typecheck against it; semantic's local types alias it.
2. The value-reader seam inside semantic's matcher, not moved yet: every value capture goes through an interface;
   hyperscript's reader is today's code behind it.
3. Move the matcher skeleton to framework (`core/matching/`); semantic imports it and passes its reader.
4. Move semantic's pattern generator to framework behind grammar hooks.
5. Move the schema-driven renderer core and the generic half of `explicit/lossy.ts` (unread input, read-back) to
   framework; semantic keeps its verbatim-value list and `verified-render`'s collision rule as grammar hooks.
6. The round-trip gate kit into `packages/framework/src/testing/`, with toolkit's lint rules; the domain gate
   switches to it.
7. The stock value readers, `greedy` among them, each with tests; a new factory on the core beside
   `createMultilingualDSL` (its name chosen in step 2's design).

**Phase 5 — the kept domains on the core** (lokascript-domains, one PR per domain; packed tarballs from this repo
via `pack-smoke.sh UPSTREAM_TARBALLS` until it is published).

1. sql first, then llm, flow, behaviorspec (absorbing bdd's commands and tests), voice (its own commands only),
   jsx and todo if kept. No gate pair may get worse; the target is every pair `pass` or a listed refusal with a
   reason; the snapshot shows each domain's changed parses for review.
2. learn on semantic (D2): the commanding form from `render`, learn's narrating forms and glosses around it.
3. mcp-server's tools follow (D6), in this repo.
4. Downstream: lokascript-learn from 2.x to the current line, checking its pages on the live site after the bump;
   lokascript-examples' apps, if kept; the docs-site llm generator.

**Phase 6 — delete the old matcher** (this repo, framework major). When no kept domain uses the old factory:
delete `core/pattern-matching/` and the old `createMultilingualDSL` path, by the renumber-only major procedure
(pack, prove domains, domains patch peering `^old || ^new`, bump the range here, publish). Close M3 (e).

## Gates per phase

- This repo: the M3 (d) list (populate, build, check:fresh, semantic suite, check:grammar/mapper-parity/keywords,
  test:canonical, multilingual --regression, vocab, lint, guards, typechecks, test:check) and parse-parity at 0;
  framework's suite; bundle sizes (`scripts/bundle-size-snapshot.mjs --check`).
- lokascript-domains: version:validate, build, typecheck, test:check, pack-smoke, and from Phase 2 the gate.

## Exit metrics

- One matcher: framework's old 1,630-line copy deleted.
- Domain round trip: every pair `pass` or a listed refusal; 0 silent; 0 leftover input accepted.
- learn: 135/135 commanding sentences read by the product as the source.
- Semantic: parse-parity 0 differences through Phase 4; no hyperscript gate worse.
- Domain packages: 16 → the D1 count; lokascript-learn on the current line.

## Traps

- **Hot path.** A seam call per value capture may slow semantic; measure suite time and parse throughput before
  and after Phase 4.2.
- **Bundles.** semantic's browser bundles bake framework in (`baked_files` in `scripts/ensure-fresh.sh`); moving
  the matcher down must not duplicate it or grow the bundles; `language-module-reach.test.ts` stays green.
- **The parity oracle covers hyperscript only.** Domain parses have only the Phase 2 gate and snapshot; build them
  before touching the core.
- **The cross-repo cycle.** framework and server-bridge test against the locked domains (^3.0.1), mcp-server runs
  it; the domains aggregate peers framework, semantic and intent at `^3.1.0 || ^4.0.0`. Every framework change
  runs against published domains in this repo's CI, every domains change against packed tarballs from here; the
  two must never disagree (`check-domains-peer-major`).
- **lokascript-learn is live and two majors behind.** Its upgrade is its own project; nothing in Phases 1–4
  reaches it until it moves.
- **The MCP server serves stale code after a rebuild** (`packages/mcp-server/src/freshness.ts`): reconnect it
  before probing tools.
