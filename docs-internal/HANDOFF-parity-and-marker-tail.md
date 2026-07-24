# Handoff: schema↔renderer parity tail + remaining marker work

**Paste "The prompt" below into a fresh Claude Code session opened in `~/projects/hyperfixi`.**

Everything here is the deliberately-deferred tail of the downstream-improvements arc
(branch `feat/framework-improvements-downstream`, 7 commits, all P1–P9 findings from
`~/projects/lokascript-learn/docs-internal/framework-improvements-handoff.md` closed).
That arc's full outcome — including what its plan got wrong and how each mistake was
caught — is recorded in
`~/.claude/plans/please-investigate-the-following-delegated-star.md` § Outcome.

The tail was **sized empirically** before deferring (probe script at the bottom of this
doc). It splits into three tranches with different risk profiles. Do them in order;
they do not need to be one session.

---

## The prompt

> I want to finish the schema↔renderer parity work in the `@lokascript` packages,
> continuing the arc on `feat/framework-improvements-downstream` (merge state may have
> changed — check). `docs-internal/HANDOFF-parity-and-marker-tail.md` is the brief;
> read it fully first, especially "Traps" — every entry there was hit for real last
> time and one of them broke 23 languages at once before the ratchet caught it.
>
> Work tranche 1 (todo/jsx/flow/voice parity — schema data only) to completion.
> Tranche 2 (bdd/behaviorspec) starts with a design decision that is mine to make —
> present the options from the brief and STOP for my answer before implementing.
> Leave domain-learn and the Tier B / zh-go marker review alone unless I say otherwise.
>
> Constraint unchanged from the parent arc: renderX output is frozen. Parity
> mismatches are fixed by teaching the SCHEMA what the renderer does — never by
> editing renderX. lokascript-learn's 919 morphology tests are the enforcement.

---

## Where parity stands (probe results, 2026-07-24)

`createSchemaRenderer(allSchemas, allProfiles)` vs `renderX`, every command × language,
full-roles node and required-only node:

| Domain       | Agreement | Commands needing work                                                                       | Nature of gap                                    |
| ------------ | --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| llm          | **100%**  | — (92-case parity test committed)                                                            | done — template                                  |
| sql          | **100%**  | — (115-case parity test committed)                                                           | done — template                                  |
| todo         | 86%       | 1/3 `[list:9]`                                                                               | spurious `to` marker                             |
| jsx          | 83%       | 1/6 `[fragment:22]`                                                                          | spurious `returning` marker                      |
| voice        | 82%       | 12/19 `[scroll:11 back:11 forward:11 type:6 read:6 select:6 open:6 search:6 help:5 focus:4 close:3 click:2]` | many small spurious markers (tr `ya`, ar `عن`)   |
| flow         | 61%       | 5/9 `[fetch:22 poll:22 stream:22 submit:6 transform:6]`                                      | spurious `with`; ja destination post-verb        |
| bdd          | 31%       | 3/4 `[given:16 then:16 when:12]`                                                             | **capitalization** (`Given` vs `given`) + markers |
| behaviorspec | 41%       | 5/6 `[test:16 expect:16 when:11 given:8 not:6]`                                              | **always-quote** (`test "x"`) + SOV verb-first   |

Two load-bearing facts about this table:

1. **The mismatches are NOT latent parse bugs.** Verified: `list to tasks` and
   `list tasks` both parse (todo), `fetch with /api` and `fetch /api` both parse
   (flow) — the generated patterns make those markers optional. The cost of the gap
   is (a) extension commands in these domains render valid-but-unidiomatic surfaces,
   and (b) the schemas keep drifting unwatched.
2. **The line between tranches 1 and 2 is capability, not effort.** todo/jsx/flow/
   voice need only schema DATA using fields that already exist. bdd/behaviorspec
   need renderer capabilities that do NOT exist yet.

## Tranche 1 — todo, jsx, flow, voice (schema data only; do first)

Copy the committed templates:
`packages/domain-llm/src/__test__/schema-renderer-parity.test.ts` (uses
`describeCommands()` introspection) and
`packages/domain-sql/src/__test__/schema-renderer-parity.test.ts` (uses a hand-kept
`EXAMPLES` map — the shape these four will need, since only llm has introspection).
Both include the keyword-coverage lint that turns opaque string diffs into readable
failures.

The whole toolkit already exists on `RoleSpec` (all added by the parent arc, all
documented in `packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md` § Natural Language
Renderer):

- `renderOverride: { '*': '' }` — the workhorse here: "this role's marker exists for
  the parser, render bare". Fixes todo `list`, jsx `fragment`, flow `with`, and most
  of voice. **Precedence trap:** `'*'` ranks BELOW a per-language `markerOverride`
  (deliberate — sql's `get` keeps its SOV particles that way). If a voice role should
  render bare in tr but keep a marker elsewhere, that needs `renderOverride: { tr: '' }`,
  not `'*'`.
- `sovSlot: 'postVerb'` — for flow's ja `fetch` destination rendering after the verb.
- `markerPositionOverride`, `default`, `quoteMultiword` — as needed.

Expected shape of the change per domain: a handful of `renderOverride` lines in
`src/schemas/index.ts`, one parity test file, zero renderer edits. Gate: the domain's
own suite (byte-identical renderX output) + the new parity file green.

## Tranche 2 — bdd, behaviorspec (DESIGN DECISION FIRST — do not just implement)

These two cannot reach parity with existing fields. The gaps:

- **Capitalization**: `renderBDD` emits `Given`/`When`/`Then`; profiles carry
  lowercase keywords (parsing is case-insensitive for latin scripts).
- **Always-quote**: `renderTest` emits `test "x"` even for single words;
  `quoteMultiword` only quotes on whitespace.
- **SOV verb-first**: behaviorspec renders `テスト "<name>"` — verb BEFORE the role in
  an SOV language, against the word-order default.

Two coherent designs; the owner picks (this is the stop-point in the prompt):

- **(a) Exception-list parity** — assert parity modulo a small documented exception
  table (`{ action, kind: 'capitalization' | 'quoting' | 'order' }`). Gets the drift
  lock for the agreeing 31–41% and pins the exceptions explicitly. No new RoleSpec
  fields. Right choice if parity's purpose is the lock.
- **(b) New capabilities** — `keywordRenderCase`/rendered-keyword override,
  `quoteAlways`, per-command word-order override. Right choice ONLY if the end state
  is full delegation (renderX becoming a one-line wrapper over the schema renderer —
  the parent arc's stretch goal, explicitly gated on "parity green in CI for one
  release first"). More surface on `RoleSpec`, which every schema author reads.

## Left deferred, deliberately (do not pick up casually)

- **domain-learn parity.** Blockers: `renderLearn` attaches SOV particles with NO
  space (`#buttonに`) which `buildPhrase` cannot express, and its schemas declare
  ja/ko markers as `''` while the renderer emits に/から from its own tables. Fixing
  the schema data moves learn parse patterns → directly risks lokascript-learn's 919
  morphology tests + dsl-bridge parity test. Needs downstream coordination, not a
  solo session.
- **Tier B marker review + zh `go`** (one bundled task, needs native-validity
  judgment, not batch-editable): audit `destination` markers for
  he/hi/id/it/ru/sw/th/uk/vi against the patterns-reference corpus, plus the one
  remaining downstream override: zh `go` (downstream wants `''` — 前往 encodes
  direction — but the in-repo corpus renders `前往 到 url`; corpus is ground truth
  here, so this is a corpus question first). Closing zh `go` retires the LAST of
  lokascript-learn's 16 `LEARNING_OVERRIDES` entries. Follow the parent arc's exact
  sequence: `markerLegacy` for every changed language, byte-green gate on the code
  change alone, then data, then the multilingual validation sequence below.

## Traps (each one was hit for real in the parent arc)

1. **Positions sort DESCENDING** — higher `svoPosition`/`sovPosition` renders EARLIER.
   Documented on `RoleSpec` (`packages/intent/src/schema.ts`). The semantic package's
   own internal `RoleSpec` uses the OPPOSITE (ascending) convention; don't cross them.
2. **`markerVariants` is NOT for legacy markers.** Reusing it broke
   `put-before`/`put-after` in 23 languages at once: `put`'s variants (`before`/`after`)
   carry a distinct `method` role via `methodCarrier`; treating them as synonyms for
   `into` swallowed the method and corrupted the **en reference** every language is
   scored against. The R2 execution ratchet caught it. Use `markerLegacy` — accepted
   when parsing, never rendered.
3. **Marker override branches are unified now — keep them that way.** Three separate
   code paths (SOV + VSO event-handler generators, shared marker resolver) each used
   to drop alternatives, so a corrected marker parsed standalone but not inside a
   `socket` block. They all call `legacyMarkerAlternatives()`
   (`packages/semantic/src/parser/utils/marker-resolution.ts`). A new override branch
   must call it too.
4. **The multilingual gate is only meaningful after the ordered build + populate:**
   `npm run test:multilingual:build-deps && npm run populate --prefix packages/patterns-reference`,
   then from `packages/testing-framework`:
   `npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression`.
   After an intentional change: `--save-baseline`, commit the baseline in the SAME
   commit as the schema change. Do NOT commit the locally-regenerated `patterns.db`.
5. **domain-voice has two extra gates:** golden pattern snapshots
   (`cd packages/domain-voice && npx tsx scripts/generate-golden-patterns.ts` — it
   REFORMATS the whole file, so verify the semantic diff is only your intended
   entries before committing) and the domain-toolkit `keyword-classification` lint
   (a marker word must classify as a keyword in that language's tokenizer — French
   `à` needed adding to `src/vocab/fr.ts` `tokenizerKeywords` because the Latin
   identifier extractor claims single accented characters first).
6. **Downstream validation: do NOT repoint `file:../hyperfixi/...` in
   lokascript-learn's package.json.** `bun install` then tries to resolve the
   PRIVATE `@lokascript/domain-toolkit` devDependency and fails. Working procedure:
   back up `node_modules/@lokascript/{pkg}` dirs, copy the local `dist/` + `src/`
   over them, run `bun test shared/ db/ server/` (expect **1781 pass**) and
   `bunx tsc --noEmit`, then restore the backups. Their E2E global-setup fails
   identically on published 2.8.0 (environmental) — don't chase it.

## Sizing probe (re-run to measure progress; agreement should reach 100% per tranche-1 domain)

Save as `parity-probe.mts` at repo root, `npx tsx parity-probe.mts`, delete after:

```typescript
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';

const DOMAINS = [
  { name: 'todo', mod: () => import('@lokascript/domain-todo'), render: 'renderTodo' },
  { name: 'jsx', mod: () => import('@lokascript/domain-jsx'), render: 'renderJSX' },
  { name: 'flow', mod: () => import('@lokascript/domain-flow'), render: 'renderFlow' },
  { name: 'bdd', mod: () => import('@lokascript/domain-bdd'), render: 'renderBDD' },
  { name: 'voice', mod: () => import('@lokascript/domain-voice'), render: 'renderVoice' },
  { name: 'behaviorspec', mod: () => import('@lokascript/domain-behaviorspec'), render: 'renderBehaviorSpec' },
];

function makeNode(action: string, roles: string[], only?: Set<string>): SemanticNode {
  const map = new Map<string, { type: 'expression'; raw: string }>();
  for (const r of roles) if (!only || only.has(r)) map.set(r, { type: 'expression', raw: `<${r}>` });
  return { kind: 'command', action, roles: map } as SemanticNode;
}

for (const d of DOMAINS) {
  const mod: any = await d.mod();
  const { allSchemas, allProfiles } = mod;
  const renderX = mod[d.render];
  const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
  let total = 0, mismatch = 0;
  const byCommand = new Map<string, number>();
  for (const schema of allSchemas) {
    const roleNames = schema.roles.map((r: any) => r.role);
    const required = new Set<string>(schema.roles.filter((r: any) => r.required).map((r: any) => r.role));
    for (const variant of [undefined, required]) {
      const node = makeNode(schema.action, roleNames, variant as Set<string> | undefined);
      for (const p of allProfiles) {
        total++;
        if (schemaRenderer.render(node, p.code) !== renderX(node, p.code)) {
          mismatch++;
          byCommand.set(schema.action, (byCommand.get(schema.action) ?? 0) + 1);
        }
      }
    }
  }
  const cmds = [...byCommand.entries()].sort((x, y) => y[1] - x[1]);
  console.log(
    `${d.name.padEnd(13)} ${total - mismatch}/${total} agree (${((100 * (total - mismatch)) / total).toFixed(0)}%)` +
      (cmds.length ? `  [${cmds.map(([c, n]) => `${c}:${n}`).join(' ')}]` : '  ✓')
  );
}
```

Caveat on the probe: it feeds `<role>` placeholder values, so it measures marker/order/
casing/quoting divergence, not value formatting. The committed parity tests (which use
real parses) are the authority; the probe is for cheap progress tracking.
