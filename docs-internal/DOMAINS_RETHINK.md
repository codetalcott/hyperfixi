# Domains rethink: one reliable core

Plan, 2026-10-13. Decisions D1–D6 taken 2026-10-14 (all as recommended; D1's open rows below). Phase 1 done
2026-10-15 (lokascript-domains #21 = 4.0.0, this repo #1521); Phase 2 done 2026-10-15 (lokascript-domains #23,
#24, corrected by #25); Phase 3 merged 2026-10-15 (#1524, #1525; domains readiness #26, #28), unreleased. Next:
the framework minor release (owner), then the domains relock and re-baseline, then Phase 4.

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

## Portfolio (D1, decided 2026-10-14)

| domain                    | compiles to                                          | consumers                                                       | round trip                          | decision                                                                                                       |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| sql                       | SQL                                                  | MCP ×4, learn drills, sql-explorer                              | 100%                                | **Keep.** The exemplar; first onto the core                                                                    |
| llm                       | JSON prompt spec (MCP sampling)                      | MCP ×4 + sampling, docs-site generator, 2 demos, learn drills   | 92%                                 | **Keep**                                                                                                       |
| flow                      | JS, htmx attributes, workflow spec; a runtime        | MCP ×4, 2 demos, learn drills                                   | 94%                                 | **Keep**                                                                                                       |
| behaviorspec              | Playwright                                           | MCP ×4 + extras, test-writer, 3 demos                           | 85%                                 | **Keep**, and absorb bdd                                                                                       |
| bdd                       | Playwright                                           | MCP ×4 + extras, learn drills                                   | 33%                                 | **Merge into behaviorspec** (same output; open since the 2026-08 portfolio survey)                             |
| voice                     | JS (a11y actions)                                    | MCP ×4, voice-navigator, learn drills                           | 75%                                 | **Keep its 14 own commands**; drop the 5 borrowed from hyperscript                                             |
| learn                     | sentences and glosses for learners                   | lokascript-learn (live), MCP ×4                                 | 98% own; 55% read by the product    | **Rebuild on semantic** (D2)                                                                                   |
| jsx                       | JSX                                                  | MCP ×4, learn drills                                            | 100%                                | **Retire** (built as a proof; sql, flow and behaviorspec already show a second grammar)                         |
| todo                      | JSON                                                 | MCP ×4, todo demo, learn drills                                 | 100%                                | **Keep** as the smallest tutorial domain, for the new factory                                                  |
| sprites                   | Fly Sprites SDK calls; its own runtime and MCP server | none (learn imports it, never calls it)                         | 78%                                 | **Retire** (4 languages; the only `grammarProfile` user; no consumer, and the tag keeps it)                     |
| events, hypermedia        | English hyperscript (events partly invalid)          | learn drills only (render)                                      | 100%                                | **Retire.** They are hyperscript; learn's drills for them come from semantic                                   |
| animation, control, html  | hyperscript, a skeleton, HTML                        | none                                                            | 100%, 40%, 83%                      | **Retire**                                                                                                     |
| config, domains, toolkit  | registry, published aggregate, lint harness          | mcp-server's registry                                           | —                                   | Keep; toolkit's rules move into the gate kit                                                                   |
| mcp-multilingual-intent   | Hono Siren HTTP API                                  | siren-grail's bridge                                            | —                                   | **Retire** (its routing guard moves to domain-config's tests)                                                  |
| lokascript-lessons (repo) | —                                                    | none                                                            | —                                   | **Archive** (a byte-identical dead copy)                                                                       |

Result: 16 domain packages → 7 DSLs (sql, llm, flow, behaviorspec absorbing bdd, voice, todo, and learn on
semantic). After Phase 1 there are 8 packages; bdd merges into behaviorspec in Phase 5.

## Owner decisions (taken 2026-10-14)

Each as recommended below; D1 is the table above.

- **D1 — the portfolio** (table above): keep, merge, rebuild, spin out or retire, per row. **Decided:** the table's
  proposals, with jsx retired, todo kept, and sprites retired rather than spun out.
- **D2 — domain-learn.** Its aim has been open since 2026-07-24 (a generator of sentences to read, or sentences
  learners type). The drills teach hyperscript in the learner's language, and the site's answer checker already
  parses with semantic. Recommended: the commanding sentence is semantic's render (what the adapter runs); learn
  keeps its narrating forms, morphology and glosses as teaching around it. That needs lokascript-learn off 2.x.
  **Decided: as recommended.**
- **D3 — where the core lives.** Recommended: framework, so the package domains already peer on stays the
  contract. Alternative: a new package (`@lokascript/grammar`), a fourth contract package for
  `check-domains-peer-major`. **Decided: framework.**
- **D4 — release path.** Recommended: **additive.** The core ships beside `createMultilingualDSL` in framework
  4.x minors; domains move to it in their own releases against published 4.x; the old matcher and factory go in a
  later framework major no domain still uses (renumber-only, the 4.0 procedure). A contract-changing major
  deadlocks instead: `check-domains-peer-major` blocks this repo's publish until domains accepts the major, and a
  real domains major has to wait for this repo's packages on the registry. **Decided: additive.**
- **D5 — refusal in the old factory now?** Phase 3 makes `createMultilingualDSL` refuse leftover input and
  translations that do not read back, with `{ lossy: 'allow' }` to opt out, as semantic's `translate` does. A call
  that returned now throws, in a minor. Recommended: yes; nothing deployed parses with a domain DSL, and the
  callers are mcp-server's tools (which already report refusals) and demos. **Decided: yes.**
- **D6 — the MCP surface.** Domain tools follow D1: a retired domain's tools go, bdd's become behaviorspec's,
  learn's become semantic-backed. `detect_domain` and the composite tools stay on the kept domains. **Decided: as
  recommended.**

## Phases (one PR per numbered step unless noted)

**Phase 0 — decisions.** D1–D6 answered here. No code. **Done 2026-10-14.**

**Phase 1 — the cuts, as domains 4.0.0** (lokascript-domains, then this repo). Deletions first, so the later
phases carry only kept domains.

Found when it started (2026-10-14): the domains repo built and tested against framework, semantic and intent
**3.3.0**. Its `validate-versions` ties the repo's major to the framework major it builds against (which is why
Dependabot's #19, to 4.3.0, failed), so its own suites had never run on 4.x; only this repo's side had (framework's
suite, server-bridge, and mcp-server on domains 3.0.1). A Phase 2 gate there would have measured 3.3.0. And removing
published subpaths is breaking. So the cuts and the move to 4.x are one major:

1. **domains 4.0.0** (lokascript-domains #21): peers `^4.0.0`, the lockfile on 4.5.0. jsx, animation, control,
   events, html, hypermedia and sprites deleted under the tag `archived/domains-preview-2026-10` (34e146a), with a
   pointer in the README; mcp-multilingual-intent deleted, its sql-vs-todo routing guard moved to domain-config's
   tests. voice's five borrowed verbs dropped too (Phase 5's voice step, moved up): semantic 4.x gave `toggle` a
   `goal` role, and the five failed 62 of voice's tests on 4.5.0; its 14 own commands generate identical patterns.
   Gate on 4.5.0: 11 packages, 3,732 tests, and the pack smoke. Supersedes Dependabot #19, #20, #17, #15 and #11.
2. Publish 4.0.0 ("Publish @lokascript/domains", dry run first).
3. This repo: mcp-server's domains range `^3.0.1` → `^4.0.0`; its jsx tools go (D6: `feedback-tools.ts`,
   `training-data.ts`, the registry integration test); `framework/scripts/domain-probes.ts` drops the retired
   domains. lokascript-learn and lokascript-examples pin 2.x and are untouched. **Done: #1521** (framework's and
   server-bridge's devDependencies moved too, one lock entry; 8 domains, 32 tools, 102 defined / 97 listed). The
   probe on 4.0.0: round trips 891/957, 58/60 commands accept leftover input, learn vs semantic 74/135.
4. lokascript-lessons: archive the repo (owner's action).

**Phase 2 — the domain gate** (lokascript-domains).

1. `domain-probes.ts` part 1 as a test per kept domain: schema → bracket node → render in each language → parse
   → compare action and roles. Outcomes `pass` / `refused` / `silent`, the command-shape gate's vocabulary.
   Placeholder values per expected type (roles that take fixed words get them).
2. Part 2 as cases: each command's English plus a trailing unknown word; expected `refused`.
3. A shrink-only baseline (`baselines/round-trip.json`) and a regen tool that refuses to write a worse pair without
   `--allow-new`; in the repo's CI.
4. A parse snapshot (the `parse-parity.ts` idea): every gate input's parse hashed, `--save` / `--check`, so each
   later change shows what it moved.

**Done 2026-10-15** (lokascript-domains #23: steps 1–3; #24: step 4), in the aggregate `packages/domains`, on its
built dist: `gate/round-trip.ts`, `gate/values.ts`, `src/__tests__/round-trip.test.ts` and `parse-snapshot.test.ts`,
`baselines/round-trip.json` and `parse-snapshot.json`, `npm run gate:regen` (`--allow-new`, `--report`). Two
departures, both measured before they were made:

- **The oracle is the compiled code, not only the node** (every domain but learn, which compiles to a sentence
  per language): a round trip passes on the same node, or on the same code as the English reference. bdd's
  parser keeps the translated word (ja `#box0 が 表示 前提` reads `state: 表示`) and its generator normalizes it,
  so a node comparison called it silent; comparing code found the real loss among those (zh `当 点击 #box1`
  compiles to `page.locator('')`).
- **Realistic values, and every fixed word**, not `v0x`: selectors, URLs, durations and quoted strings, and each
  role that takes fixed words gets every word the domain's renderer and generator know (bdd's 8 states, 12
  actions and 5 assertions, behaviorspec's 10 interactions and 14 assertions, voice's scroll and zoom words,
  flow's formats), in every language. Placeholders never reached those paths (behaviorspec compiled every
  command to `// When: v0x`), and hid the URL family (learn cannot read its own English `fetch /api` or
  `go /home`; voice ja/ko/tr refuse `/home`).

Leftover input runs in every language, not English only, and the snapshot stores readable parses
(`action role:type=value`) rather than hashes, so its diff is the review (135 KB).

Measured on framework/semantic/intent 4.5.0 (the domains lockfile):

| domain       | round trip    | refused | silent | leftover accepted |
| ------------ | ------------- | ------- | ------ | ----------------- |
| bdd          | 265/344       | 35      | 44     | 309/309           |
| behaviorspec | 372/448       | 76      | 0      | 372/372           |
| flow         | 298/308       | 3       | 7      | 305/305           |
| learn        | 188/210       | 21      | 1      | 189/189           |
| llm          | 61/66         | 5       | 0      | 61/61             |
| sql          | 99/99         | 0       | 0      | 99/99             |
| todo         | 55/55         | 0       | 0      | 55/55             |
| voice        | 354/363       | 9       | 0      | 354/354           |
| **total**    | 1,692/1,893   | 149     | 52     | 1,744/1,744       |

The queue (`gate:regen -- --report`): behaviorspec's SOV `when`/`expect` (ja, ko, tr cannot read their own
render), bdd's hyphenated words (`doble-clic` reads `doble`), zh's lost target and tr's `then`, flow's `enter`
(the marker read as its source in 7 languages), learn's URLs. `domain-probes.ts` here keeps its placeholders and
node comparison, so its numbers differ from the gate's; the gate is the one that counts.

**Corrected the same day** (lokascript-domains #25): the reference code came from compiling the command's
ENGLISH render, so the English lane was measured against itself, and where English is broken every correct
language read as silent (bdd's `When double-click` reads `double`; ja/ko/zh/tr/fr compiled to `dblclick()` and
were listed). The reference is now what the command's bracket form compiles to. That made the first numbers
1,602/1,893 with 142 silent (English included: voice `navigate to /home` compiled to `href = '/'`). #26 then
fixed what Phase 3 could not see (bdd/behaviorspec hyphenated words, fr `hover`'s word): 1,632/1,893, 116 silent.

**Phase 3 — refusal in today's factory** (this repo, framework minor; if D5 says yes).

1. `parseWithConfidence` ranks every matching pattern (priority, then confidence) instead of taking the first,
   and refuses a match that leaves tokens unread.
2. `translate` re-parses its render and refuses when the node differs (a `LossyTranslationError`-alike with the
   partial text; `{ lossy: 'allow' }` opts out).
3. mcp-server's domain tools return `ok: false` with the refusal, as `translate_code` does.

Then the domain gate re-baselines: silent pairs become refused; none may go the other way.

**Merged 2026-10-15, unreleased** (#1524: step 1; #1525: steps 2 and 3, one PR, one read-back rule). Measured
before release with lokascript-domains #27 (`UPSTREAM_TARBALLS=… npm run gate:upstream`: the gate on a packed
framework, report only):

- Step 1 (`UnreadInputError`): 1,527 cases better, 62 worse, every one `pass → refused` (a value such as
  `click`'s that the generator ignored, refused as unread instead of dropped); none became silent and none of
  the 175 moved parses changed reading. Leftover accepted 1,748 → 159; silent 116 → 3 (ja/ko `select`, which needs
  a value slot, Phase 5; learn tr `.active al`, D2).
- Steps 2–3 (`TranslationReadBackError`, `{ lossy: 'allow' }`; the registry's tools answer `ok: false` with
  `UNREAD_INPUT` / `TRANSLATION_DOES_NOT_READ_BACK`, a refused translation's text under `partial`): translating
  every gate command from English, 46 renders that used to be returned are refused.
- It found truncations in this repo too: framework's SQL fixture read `where age > 18` as `age` (its test checked
  truthiness), and mcp-server's llm `ask what is 2+2` asked the model "what". A multi-word llm question is quoted
  (`quoteMultiword` is llm's design; making it greedy would misread a question containing `from` silently).
- And in the domains, before the relock could go red (lokascript-domains #28): bdd's `and` content read one word,
  voice read `/home` as `/`. With the packed framework every domain package's own suite passes; only the
  aggregate's gate needs re-baselining.

Left for the relock (after the release): re-baseline with `gate:regen`; a rule for the 159 leftover cases whose
unknown word lands in an open-text role (sql `condition`, behaviorspec `when.action`, voice `back`/`forward`
quantity) — some are legitimate text, some a reader that should be narrower (a quantity); and the 62
`pass → refused` cases are the gate's `when … value:v2x` variants for actions that take no value.

**Phase 4 — the core, from semantic** (this repo; behavior-preserving for hyperscript). Every step: the
parse-parity oracle (`packages/semantic/scripts/parse-parity.ts --check`, 27,194 parses) at 0 differences, the M3
(d) gate list, framework's suite, and the locked domains against it. Record framework's and semantic's line
counts in each PR.

1. One schema type in intent: the union of both `RoleSpec`s and `CommandSchema`s; semantic's and framework's
   schemas typecheck against it; semantic's local types alias it. **Done 2026-10-16:** intent's types take
   `<Action, Role, Value, Category>` parameters (defaults: the plain types a domain uses); semantic's
   `RoleSpec` is an alias, its `CommandSchema` extends the shared one with the four fields only its AST
   builder and error docs read (`ast`, `errorCodes`, `preconditions`, `recoveryHints`), and a compile-time
   check (`HyperscriptSchemaIsGrammarNeutral`) holds semantic's schemas assignable to the plain type
   framework's code takes. `svoPosition`/`sovPosition` keep two directions (framework descending,
   semantic ascending), documented on the field: step 4 makes the direction the generator's hook.
2. The value-reader seam inside semantic's matcher, not moved yet: every value capture goes through an interface;
   hyperscript's reader is today's code behind it. **Done 2026-10-16:** `parser/value-reader.ts` (`ValueReader`,
   `MatchView`), `parser/match-skeleton.ts` (`MatchSkeleton`, 616 lines: pattern walk, literals, groups and
   rollback, the speculative skip, spans, memoized ranking, confidence, extraction rules) and
   `HyperscriptValueReader` (the rest of `pattern-matcher.ts`). Beyond `readRole`, the skeleton asks the
   reader five grammar facts: `beginPattern` (the reader owns the profile), `maySkipSlot`, `atClauseEnd`,
   `skipLeading` (Arabic proclitics) and `beforePatternToken` (an event head's source clause), plus
   `resultFields` (`eventSource`). Framework's and semantic's pattern types (`LanguagePattern`,
   `PatternToken`, `PatternMatchResult`) forked too, so step 3 unifies them as step 1 did the schemas.
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

1. sql first, then llm, flow, behaviorspec (absorbing bdd's commands and tests), voice and todo. No gate pair may get worse; the target is every pair `pass` or a listed refusal with a
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
- Domain round trip: every pair `pass` or a listed refusal; 0 silent; 0 leftover input accepted (at Phase 2,
  corrected: 116 silent after #26, 1,748 accepted; with Phase 3's framework packed: 3 silent, 159 accepted).
- learn: 135/135 commanding sentences read by the product as the source.
- Semantic: parse-parity 0 differences through Phase 4; no hyperscript gate worse.
- Domain packages: 16 → 7 DSLs; lokascript-learn on the current line.

## Traps

- **Hot path.** A seam call per value capture may slow semantic; measure suite time and parse throughput before
  and after Phase 4.2.
- **Bundles.** semantic's browser bundles bake framework in (`baked_files` in `scripts/ensure-fresh.sh`); moving
  the matcher down must not duplicate it or grow the bundles; `language-module-reach.test.ts` stays green.
- **The parity oracle covers hyperscript only.** Domain parses have only the Phase 2 gate and snapshot; build them
  before touching the core.
- **The cross-repo cycle.** framework and server-bridge test against the locked domains (^3.0.1 until Phase 1
  step 3, then ^4.0.0), mcp-server runs it; the domains aggregate peers framework, semantic and intent at
  `^4.0.0` from 4.0.0 (`^3.1.0 || ^4.0.0` before). Every framework change
  runs against published domains in this repo's CI, every domains change against packed tarballs from here; the
  two must never disagree (`check-domains-peer-major`).
- **The domains repo builds on the framework major its own major names** (`validate-versions`). Its gate measures
  the framework its lockfile holds: relock it (or pass `UPSTREAM_TARBALLS`) before reading a number against a
  framework change made here.
- **lokascript-learn is live and two majors behind.** Its upgrade is its own project; nothing in Phases 1–4
  reaches it until it moves.
- **The MCP server serves stale code after a rebuild** (`packages/mcp-server/src/freshness.ts`): reconnect it
  before probing tools.
